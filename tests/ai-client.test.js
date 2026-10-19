import assert from 'node:assert/strict'
import { afterEach, beforeEach, mock, test } from 'node:test'
import { fetchGame } from '../src/lib/ai.js'

const html = '<!DOCTYPE html><html><body>खेल 🌟</body></html>'
const options = { systemPrompt: 'Return complete HTML.' }
let upstream

beforeEach(() => {
  upstream = mock.method(globalThis, 'fetch', async () => { throw new Error('Unexpected real request') })
})
afterEach(() => mock.restoreAll())

function stream(events, splitBytes = false) {
  const bytes = new TextEncoder().encode(events.map(event => `data: ${typeof event === 'string' ? event : JSON.stringify(event)}\r\n\r\n`).join(''))
  return new Response(new ReadableStream({
    start(controller) {
      if (splitBytes) for (const byte of bytes) controller.enqueue(Uint8Array.of(byte))
      else controller.enqueue(bytes)
      controller.close()
    },
  }), { headers: { 'Content-Type': 'text/event-stream' } })
}

test('stream parsing handles split Unicode, reasoning, usage, and completion events', async () => {
  const progress = []
  upstream.mock.mockImplementation(async (_url, request) => {
    assert.equal(JSON.parse(request.body).stream, true)
    return stream([
      { choices: [{ delta: { reasoning_content: 'Private design reasoning' } }] },
      { choices: [{ delta: { content: html.slice(0, 25) } }] },
      { choices: [{ delta: { content: html.slice(25) } }] },
      { choices: [{ delta: {}, finish_reason: 'stop' }] },
      { choices: [], usage: { completion_tokens: 25 } },
      '[DONE]',
    ], true)
  })
  assert.equal(await fetchGame('Make a game', { ...options, onProgress: value => progress.push(value) }), html)
  assert.equal(progress[0].phase, 'thinking')
  assert.ok(progress.some(value => value.phase === 'writing' && value.characters > 0))
  assert.ok(!JSON.stringify(progress).includes('Private design'))
})

test('interrupted, truncated, and empty streams fail instead of replacing the current game', async () => {
  const cases = [
    [[{ choices: [{ delta: { content: '<html>' } }] }], /connection ended/],
    [[{ choices: [{ delta: { content: '<html>' }, finish_reason: 'length' }] }, '[DONE]'], /generation limit/],
    [[{ choices: [{ delta: { reasoning_content: 'Thinking' }, finish_reason: 'stop' }] }, '[DONE]'], /no game code/],
    [[{ error: 'Sarvam took too long to respond.' }], /too long/],
  ]
  for (const [events, message] of cases) {
    upstream.mock.mockImplementation(async () => stream(events))
    await assert.rejects(fetchGame('Make a game', options), message)
  }
})

test('server errors and a completed non-streaming response are handled', async () => {
  upstream.mock.mockImplementation(async () => Response.json({ error: 'Invalid key' }, { status: 403 }))
  await assert.rejects(fetchGame('Make a game', options), /Invalid key/)
  upstream.mock.mockImplementation(async () => Response.json({ text: html }))
  assert.equal(await fetchGame('Make a game', options), html)
})

test('a stalled request is aborted by the browser timeout', async () => {
  const timeout = new AbortController()
  mock.method(AbortSignal, 'timeout', () => timeout.signal)
  upstream.mock.mockImplementation((_url, { signal }) => new Promise((_resolve, reject) => {
    signal.addEventListener('abort', () => reject(signal.reason), { once: true })
    queueMicrotask(() => timeout.abort(new DOMException('Timed out', 'TimeoutError')))
  }))
  await assert.rejects(fetchGame('Make a game', options), /Generation timed out/)
})

test('Stop aborts the request independently of the timeout', async () => {
  const controller = new AbortController()
  upstream.mock.mockImplementation((_url, { signal }) => new Promise((_resolve, reject) => {
    signal.addEventListener('abort', () => reject(signal.reason), { once: true })
    queueMicrotask(() => controller.abort())
  }))
  await assert.rejects(fetchGame('Make a game', { ...options, signal: controller.signal }), { name: 'AbortError' })
})
