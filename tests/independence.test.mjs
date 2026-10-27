import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, rm, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { createHash } from 'node:crypto'
import { createApplication } from '../server/index.mjs'

test('published runtime serves its own brand, restricts browser data connections and never imports a former backend at startup', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'bichu-independence-'))
  const app = createApplication({ env: { DATA_DIR: dir, APP_ORIGIN: 'http://127.0.0.1', PILOT_PANEL_KEY: 'a'.repeat(64), MIGRATION_SOURCE: 'https://unreachable-old-backend.invalid', MIGRATION_KEY: 'disabled-example' } })
  await new Promise(resolve => app.server.listen(0, '127.0.0.1', resolve))
  try {
    const base = 'http://127.0.0.1:' + app.server.address().port
    const panel = await fetch(base + '/painel'), html = await panel.text(), policy = panel.headers.get('content-security-policy')
    assert.equal(panel.status, 200)
    assert.ok(policy.includes("connect-src 'self';"))
    assert.ok(policy.includes("script-src 'self' 'unsafe-inline';"))
    assert.ok(policy.includes("object-src 'none';"))
    assert.ok(policy.includes("img-src 'self' data: blob:;"))
    assert.ok(html.includes('/meu-bichu-icon.png?v=20261027'))
    const icon = await fetch(base + '/meu-bichu-icon.png?v=20261027')
    assert.equal(icon.status, 200); assert.equal(icon.headers.get('cache-control'), 'no-cache')
    const expected = await readFile(new URL('../public/meu-bichu-icon.png', import.meta.url))
    assert.equal(createHash('sha256').update(Buffer.from(await icon.arrayBuffer())).digest('hex'), createHash('sha256').update(expected).digest('hex'))
    assert.equal((await fetch(base + '/favicon.ico')).headers.get('cache-control'), 'no-cache')
    assert.equal(app.store.raw.prepare('SELECT COUNT(*) n FROM pilot_accounts').get().n, 0)
  } finally {
    await new Promise(resolve => app.server.close(resolve)); app.store.close(); await rm(dir, { recursive: true, force: true })
  }
})
