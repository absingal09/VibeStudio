import assert from 'node:assert/strict'
import { afterEach, beforeEach, mock, test } from 'node:test'
import { EventEmitter } from 'node:events'
import handler from '../api/chat.js'

const originalKey = process.env.SARVAM_API_KEY
const body = { prompt: 'Create a snake game', systemPrompt: 'Return a complete HTML game.' }
const html = '<!DOCTYPE html><html><body>Game</body></html>'
let upstream

beforeEach(() => {
  process.env.SARVAM_API_KEY = 'test-sarvam-key'
  upstream = mock.method(globalThis, 'fetch', async () => {
    throw new Error('Unexpected external request')
  })
})

afterEach(() => {
  mock.restoreAll()
  if (originalKey === undefined) delete process.env.SARVAM_API_KEY
  else process.env.SARVAM_API_KEY = originalKey
})

function makeResponse() {
  return Object.assign(new EventEmitter(), {
    statusCode: 200,
    headers: {},
    chunks: [],
    write(chunk) { this.chunks.push(typeof chunk === 'string' ? chunk : new TextDecoder().decode(chunk)) },
    end() { this.ended = true },
    setHeader(name, value) { this.headers[name] = value },
    status(code) { this.statusCode = code; return this },
    json(data) { this.body = data; return this },
  })
}

async function request(requestBody = body, method = 'POST') {
  const res = makeResponse()
  await handler({ method, body: requestBody }, res)
  return res
}

test('unsupported methods and invalid input never call the provider', async () => {
  const get = await request(body, 'GET')
  assert.equal(get.statusCode, 405)
  assert.equal(get.headers.Allow, 'POST')
  for (const invalid of [null, {}, { prompt: ' ' }, { prompt: 123 }, { ...body, systemPrompt: null }]) {
    assert.equal((await request(invalid)).statusCode, 400)
  }
  assert.equal(upstream.mock.callCount(), 0)
})

test('missing or blank key produces a configuration error without an external request', async () => {
  for (const key of [undefined, '   ']) {
    if (key === undefined) delete process.env.SARVAM_API_KEY
    else process.env.SARVAM_API_KEY = key
    const res = await request()
    assert.equal(res.statusCode, 503)
    assert.match(res.body.error, /key is not configured/)
  }
  assert.equal(upstream.mock.callCount(), 0)
})

test('generation and refinement use only Sarvam GLM-5.3 and return visible code', async () => {
  upstream.mock.mockImplementation(async () => Response.json({
    choices: [{ finish_reason: 'stop', message: { content: html, reasoning_content: 'Private reasoning' } }],
  }))

  for (const prompt of [body.prompt, `Current game: ${html}\nMake the snake blue`]) {
    const res = await request({ ...body, prompt })
    assert.equal(res.statusCode, 200)
    assert.deepEqual(res.body, { text: html })
    const [url, options] = upstream.mock.calls.at(-1).arguments
    assert.equal(url, 'https://api.sarvam.ai/v2/chat/completions')
    assert.equal(options.headers['api-subscription-key'], 'test-sarvam-key')
    const payload = JSON.parse(options.body)
    assert.equal(payload.model, 'glm5.3')
    assert.equal(payload.reasoning_effort, 'high')
    assert.ok(payload.max_tokens > 8192)
    assert.deepEqual(payload.messages, [
      { role: 'system', content: body.systemPrompt },
      { role: 'user', content: prompt },
    ])
  }
  assert.equal(upstream.mock.callCount(), 2)
})

test('auth, beta access, and rate-limit errors surface without retrying or falling back', async () => {
  for (const status of [400, 403, 429, 503]) {
    upstream.mock.mockImplementation(async () => Response.json({ error: { message: 'Provider rejected request' } }, { status }))
    const res = await request()
    assert.equal(res.statusCode, status)
    assert.deepEqual(res.body, { error: 'Provider rejected request' })
  }
  assert.equal(upstream.mock.callCount(), 4)
})

test('non-JSON provider errors still return a useful JSON error', async () => {
  upstream.mock.mockImplementation(async () => new Response('Bad gateway', { status: 502 }))
  const res = await request()
  assert.equal(res.statusCode, 502)
  assert.deepEqual(res.body, { error: 'Sarvam request failed (502).' })
})

test('empty, malformed, and reasoning-only completions do not become game code', async () => {
  for (const data of [null, {}, { choices: [{ message: { content: null, reasoning_content: 'Thinking' } }] }]) {
    upstream.mock.mockImplementation(async () => Response.json(data))
    const res = await request()
    assert.equal(res.statusCode, 502)
    assert.match(res.body.error, /no game code/)
    assert.equal(res.body.text, undefined)
  }
})

test('truncated output is rejected instead of replacing a working game', async () => {
  upstream.mock.mockImplementation(async () => Response.json({
    choices: [{ finish_reason: 'length', message: { content: '<html><script>' } }],
  }))
  const res = await request()
  assert.equal(res.statusCode, 502)
  assert.match(res.body.error, /generation limit/)
  assert.equal(res.body.text, undefined)
})

test('network failures and timeouts return distinct errors without leaking internals', async () => {
  for (const [name, status] of [['TypeError', 502], ['TimeoutError', 504]]) {
    upstream.mock.mockImplementation(async () => {
      const error = new Error('Sensitive connection details')
      error.name = name
      throw error
    })
    const res = await request()
    assert.equal(res.statusCode, status)
    assert.doesNotMatch(res.body.error, /Sensitive/)
  }
})

test('streamed progress is forwarded immediately through the endpoint', async () => {
  const events = 'data: {"choices":[{"delta":{"content":"<html>Game</html>"}}]}\n\ndata: [DONE]\n\n'
  upstream.mock.mockImplementation(async (_url, options) => {
    assert.equal(JSON.parse(options.body).stream, true)
    return new Response(events, { headers: { 'Content-Type': 'text/event-stream' } })
  })
  const res = await request({ ...body, stream: true })
  assert.match(res.headers['Content-Type'], /text\/event-stream/)
  assert.equal(res.headers['Cache-Control'], 'no-cache, no-transform')
  assert.ok(res.chunks.join('').includes(events))
  assert.equal(res.ended, true)
})

test('disconnecting the browser cancels the Sarvam request', async () => {
  let signal
  upstream.mock.mockImplementation((_url, options) => {
    signal = options.signal
    return new Promise((_resolve, reject) => {
      signal.addEventListener('abort', () => reject(signal.reason), { once: true })
    })
  })
  const res = makeResponse()
  const pending = handler({ method: 'POST', body: { ...body, stream: true } }, res)
  res.emit('close')
  await pending
  assert.equal(signal.aborted, true)
  assert.equal(res.body, undefined)
})

test('a timeout during streaming becomes a visible error and ends the response', async () => {
  upstream.mock.mockImplementation(async () => new Response(new ReadableStream({
    start(controller) { controller.error(new DOMException('Timed out', 'TimeoutError')) },
  }), { headers: { 'Content-Type': 'text/event-stream' } }))
  const res = await request({ ...body, stream: true })
  assert.match(res.chunks.join(''), /too long to respond/)
  assert.equal(res.ended, true)
})
