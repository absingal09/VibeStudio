import assert from 'node:assert/strict'
import { mock, test } from 'node:test'
import { createServer } from 'vite'
import { fetchGame } from '../src/lib/ai.js'

test('Vite serves the Sarvam endpoint locally, including JSON errors', { timeout: 30_000 }, async () => {
  const originalKey = process.env.SARVAM_API_KEY
  const nativeFetch = globalThis.fetch
  const html = '<!DOCTYPE html><html><body>Game</body></html>'
  let server
  let base
  process.env.SARVAM_API_KEY = 'test-development-key'
  const upstream = mock.method(globalThis, 'fetch', async (url, options) => {
    if (url === 'https://api.sarvam.ai/v2/chat/completions') {
      assert.equal(options.headers['api-subscription-key'], 'test-development-key')
      assert.equal(JSON.parse(options.body).messages[1].content, 'Build a game — खेल')
      if (JSON.parse(options.body).stream) {
        return new Response(`data: ${JSON.stringify({ choices: [{ delta: { content: html }, finish_reason: 'stop' }] })}\n\ndata: [DONE]\n\n`, {
          headers: { 'Content-Type': 'text/event-stream' },
        })
      }
      return Response.json({ choices: [{ finish_reason: 'stop', message: { content: html } }] })
    }
    return nativeFetch(url === '/api/chat' ? `${base}/api/chat` : url, options)
  })

  try {
    server = await createServer({
      logLevel: 'silent',
      server: { host: '127.0.0.1', port: 0, hmr: false, watch: null },
      optimizeDeps: { noDiscovery: true, include: [] },
    })
    await server.listen()
    base = `http://127.0.0.1:${server.httpServer.address().port}`
    const response = await fetch(`${base}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: 'Build a game — खेल', systemPrompt: 'Return complete HTML.' }),
    })
    assert.equal(response.status, 200)
    assert.deepEqual(await response.json(), { text: html })

    assert.equal(await fetchGame('Build a game — खेल', { systemPrompt: 'Return complete HTML.' }), html)

    const invalid = await fetch(`${base}/api/chat`, { method: 'POST', body: '{' })
    assert.equal(invalid.status, 400)
    assert.deepEqual(await invalid.json(), { error: 'Invalid JSON body' })

    const get = await fetch(`${base}/api/chat`)
    assert.equal(get.status, 405)
    assert.equal(get.headers.get('allow'), 'POST')

    delete process.env.SARVAM_API_KEY
    const missingKey = await fetch(`${base}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: 'Build a game', systemPrompt: 'Return complete HTML.' }),
    })
    assert.equal(missingKey.status, 503)
    assert.match((await missingKey.json()).error, /key is not configured/)
    assert.equal(upstream.mock.calls.filter(call => call.arguments[0] === 'https://api.sarvam.ai/v2/chat/completions').length, 2)

    assert.equal((await fetch(base)).status, 200)
  } finally {
    await server?.close()
    mock.restoreAll()
    if (originalKey === undefined) delete process.env.SARVAM_API_KEY
    else process.env.SARVAM_API_KEY = originalKey
  }
})
