import { test } from 'node:test'
import assert from 'node:assert/strict'
import worker from '../worker/index.js'

test('rota do painel serve HTML sem redirecionar para a entrada dos convidados', async () => {
  const seen = []
  const env = { ASSETS: { fetch: async request => {
    const path = new URL(request.url).pathname
    seen.push(path)
    if (path === '/index.html') return new Response(null, { status: 307, headers: { location: '/' } })
    if (path === '/') return new Response('<html>app</html>', { headers: { 'content-type': 'text/html' } })
    return new Response('Não encontrado', { status: 404 })
  } } }
  const response = await worker.fetch(new Request('https://pilot.test/painel', { headers: { accept: 'text/html' } }), env)
  assert.equal(response.status, 200)
  assert.equal(response.headers.get('location'), null)
  assert.deepEqual(seen, ['/painel', '/'])
})
