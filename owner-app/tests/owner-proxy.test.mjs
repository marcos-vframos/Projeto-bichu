import { test } from 'node:test'
import assert from 'node:assert/strict'
import worker from '../worker/index.js'
const origin = 'https://owner.test'
const env = { PILOT_PANEL_KEY: 'a'.repeat(64), PILOT_BRIDGE_KEY: 'server-only-secret', PILOT_DATA_ORIGIN: 'https://guest.test' }
const request = (path, method = 'GET', body, cookie) => new Request(origin + path, { method, headers: { origin, ...(body ? { 'content-type': 'application/json' } : {}), ...(cookie ? { cookie } : {}) }, body: body && JSON.stringify(body) })
test('painel isolado: acesso privado, proxy somente leitura e segredo só no servidor', async () => {
  assert.equal((await worker.fetch(request('/api/pilot/owner/dashboard'), env)).status, 403)
  assert.equal((await worker.fetch(request('/api/pilot/owner/dashboard', 'GET', null, 'mb_pilot=guest-session'), env)).status, 403)
  assert.equal((await worker.fetch(request('/api/pilot/owner/unlock', 'POST', { token: 'wrong' }), env)).status, 403)
  const unlocked = await worker.fetch(request('/api/pilot/owner/unlock', 'POST', { token: env.PILOT_PANEL_KEY }), env)
  const cookie = unlocked.headers.get('set-cookie').split(';')[0]
  assert.match(unlocked.headers.get('set-cookie'), /HttpOnly; Secure; SameSite=Strict/)
  const signedOwner = new Request(origin + '/api/pilot/owner/session', { headers: { 'oai-authenticated-user-id': 'identity-specific-to-owner-site' } })
  assert.equal((await worker.fetch(signedOwner, env)).status, 200)
  assert.equal((await worker.fetch(request('/api/pilot/owner/data-ticket'),env)).status,403)
  const issued = await worker.fetch(request('/api/pilot/owner/data-ticket','GET',null,cookie),env)
  assert.equal(issued.status,200)
  const access = await issued.json()
  assert.equal(access.origin,'https://guest.test')
  const [payload, signature] = access.ticket.split('.')
  const claims = JSON.parse(Buffer.from(payload,'hex').toString())
  assert.equal(claims.aud,'owner-read')
  assert.ok(claims.exp <= Date.now()+120000)
  const key = await crypto.subtle.importKey('raw',new TextEncoder().encode(env.PILOT_BRIDGE_KEY),{name:'HMAC',hash:'SHA-256'},false,['verify'])
  assert.equal(await crypto.subtle.verify('HMAC',key,Buffer.from(signature,'hex'),Buffer.from(payload,'hex')),true)
  assert.equal(JSON.stringify(access).includes(env.PILOT_BRIDGE_KEY),false)
  const realFetch = globalThis.fetch
  try {
    globalThis.fetch = async (url, options) => {
      assert.equal(url, 'https://guest.test/api/pilot/owner/records?collection=health_events')
      assert.equal(options.headers.authorization, 'Bearer server-only-secret')
      assert.equal(options.headers.cookie, undefined)
      return Response.json({ items: [{ data: { title: 'Consulta' } }] })
    }
    const result = await worker.fetch(request('/api/pilot/owner/records?collection=health_events', 'GET', null, cookie), env)
    assert.equal(result.status, 200)
    assert.equal((await result.json()).items[0].data.title, 'Consulta')
    assert.equal(result.headers.has('authorization'), false)
    assert.equal((await worker.fetch(request('/api/pilot/owner/records', 'POST', { title: 'Trocar' }, cookie), env)).status, 404)
  } finally { globalThis.fetch = realFetch }
})
