import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { DatabaseSync } from 'node:sqlite'
import { openStore } from '../server/storage.mjs'
import { createApplication } from '../server/index.mjs'
import { unpack } from '../server/recovery.mjs'

test('owner matrix opens original pilot 01; scoped encrypted history preserves records, dates and images without changing source or other accounts', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'mb-original-matrix-')), key = 'a'.repeat(64), panel = 'b'.repeat(64)
  const source = openStore(join(dir, 'source')), remote = openStore(join(dir, 'archive'))
  const archive = createApplication({ store: remote, env: { DATA_DIR: join(dir, 'archive'), APP_ORIGIN: 'https://archive.test', LAB_KIND: 'matrix', LAB_CONTROL_KEY: key, PILOT_PANEL_KEY: panel, COOKIE_SECURE: false } })
  const app = createApplication({ store: source, env: { DATA_DIR: join(dir, 'source'), APP_ORIGIN: 'https://main.test', LAB_MATRIX_ORIGIN: 'https://archive.test', LAB_MATRIX_KEY: key, PILOT_PANEL_KEY: panel, APP_RELEASE: 'c'.repeat(40), COOKIE_SECURE: false } })
  const originalFetch = globalThis.fetch
  globalThis.fetch = async (url, options) => archive.dispatch(new Request(url, options))
  const call = (path, body, cookie) => app.dispatch(new Request('https://main.test' + path, { method: body ? 'POST' : 'GET', headers: { origin: 'https://main.test', ...(body ? { 'content-type': 'application/json' } : {}), ...(cookie ? { cookie } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) }))
  try {
    source.raw.prepare('INSERT INTO pilot_accounts(id,email,password_salt,password_hash,created_at) VALUES(?,?,?,?,?)').run('original-01', 'piloto01@meubichu.test', 'source-salt', 'source-password', 100)
    source.raw.prepare('INSERT INTO pilot_accounts(id,email,password_salt,password_hash,created_at) VALUES(?,?,?,?,?)').run('other', 'piloto02@meubichu.test', 'other-salt', 'other-password', 200)
    const insert = source.raw.prepare('INSERT INTO pilot_records(id,account_id,collection,dog_id,data,created_at,updated_at) VALUES(?,?,?,?,?,?,?)')
    insert.run('pet', 'original-01', 'dogs', null, JSON.stringify({ name: 'Maze', weight_kg: 12, photo: 'photo.png' }), '2026-10-01', '2026-10-02')
    insert.run('weight', 'original-01', 'weight_logs', 'pet', JSON.stringify({ weight_kg: 12, logged_at: '2026-10-02' }), '2026-10-02', '2026-10-02')
    insert.run('private', 'other', 'dogs', null, JSON.stringify({ name: 'Outra conta' }), '2026-10-03', '2026-10-03')
    const bytes = Buffer.from('original photograph')
    await source.BUCKET.put('original/pet/photo.png', bytes)
    source.raw.prepare('INSERT INTO pilot_files VALUES(?,?,?,?,?,?,?,?)').run('photo', 'original-01', 'pet', 'dogs', 'photo.png', 'original/pet/photo.png', 'image/png', bytes.length)
    const before = ['pilot_accounts', 'pilot_records', 'pilot_files', 'pilot_changes'].map(t => JSON.stringify(source.raw.prepare(`SELECT * FROM ${t} ORDER BY id`).all()))
    assert.equal((await call('/api/pilot/owner/labs/matrix/open', { slot: 'matrix' })).status, 403)
    const unlock = await call('/api/pilot/owner/unlock', { token: panel }), owner = unlock.headers.get('set-cookie').split(';')[0]
    const overview = await (await call('/api/pilot/owner/labs', null, owner)).json(), matrix = overview.items.find(i => i.kind === 'matrix')
    assert.equal(matrix.liveOriginal, true); assert.equal(matrix.accounts[0].account_id, 'original-01'); assert.equal(matrix.accounts[0].records, 2)
    const opened = await call('/api/pilot/owner/labs/matrix/open', { slot: 'matrix' }, owner)
    assert.equal(opened.status, 200); assert.equal((await opened.json()).url, 'https://main.test/')
    const selected = opened.headers.get('set-cookie').split(';')[0], me = await (await call('/api/pilot/me', null, owner + '; ' + selected)).json()
    assert.equal(me.id, 'original-01'); assert.equal(me.matrixOriginal, true)
    const saved = await call('/api/pilot/owner/labs/matrix/archive', { name: 'Referência original', note: 'Antes de atualizar' }, owner)
    assert.equal(saved.status, 201, await saved.clone().text())
    const { id } = await saved.json(), row = remote.raw.prepare('SELECT * FROM lab_versions WHERE id=?').get(id)
    assert.equal(row.source_email, 'piloto01@meubichu.test'); assert.equal(row.release, 'c'.repeat(40))
    const frozen = await (await call('/api/pilot/owner/labs/matrix/archive/' + id, null, owner)).json()
    assert.equal(frozen.records.length, 2); assert.equal(frozen.records.find(r => r.id === 'pet').data.name, 'Maze')
    assert.equal(frozen.records.find(r => r.id === 'weight').created_at, '2026-10-02')
    assert.deepEqual(['pilot_accounts', 'pilot_records', 'pilot_files', 'pilot_changes'].map(t => JSON.stringify(source.raw.prepare(`SELECT * FROM ${t} ORDER BY id`).all())), before)
    const restored = join(dir, 'restored'); const verified = await unpack(row.path, key, restored)
    assert.equal(verified.objects, 1)
    const db = new DatabaseSync(join(restored, 'database.sqlite'), { readOnly: true })
    try { assert.equal(db.prepare('SELECT COUNT(*) n FROM pilot_accounts').get().n, 1); assert.notEqual(db.prepare('SELECT password_hash FROM pilot_accounts').get().password_hash, 'source-password'); assert.equal(db.prepare('SELECT COUNT(*) n FROM pilot_sessions').get().n, 0); assert.equal(db.prepare('SELECT COUNT(*) n FROM pilot_changes').get().n, 2) } finally { db.close() }
    source.raw.prepare("UPDATE pilot_records SET data=json_set(data,'$.name','Mudança posterior') WHERE id='pet'").run()
    const after = await (await call('/api/pilot/owner/labs/matrix/archive/' + id, null, owner)).json()
    assert.equal(after.records.find(r => r.id === 'pet').data.name, 'Maze')
    assert.equal(remote.raw.prepare("SELECT COUNT(*) n FROM pilot_records WHERE collection='dogs'").get().n, 0)
    await source.BUCKET.delete('original/pet/photo.png')
    assert.equal((await call('/api/pilot/owner/labs/matrix/archive', { name: 'Arquivo ausente' }, owner)).status, 409)
    assert.equal(remote.raw.prepare('SELECT COUNT(*) n FROM lab_versions WHERE source_email IS NOT NULL').get().n, 1)
  } finally { globalThis.fetch = originalFetch; source.close(); remote.close(); await rm(dir, { recursive: true, force: true }) }
})

test('missing original pilot is never recreated or replaced by a blank matrix account', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'mb-missing-matrix-')), store = openStore(dir), key = 'a'.repeat(64)
  const app = createApplication({ store, env: { DATA_DIR: dir, APP_ORIGIN: 'https://main.test', LAB_MATRIX_ORIGIN: 'https://archive.test', LAB_MATRIX_KEY: key, PILOT_PANEL_KEY: key, COOKIE_SECURE: false } })
  try {
    const unlock = await app.dispatch(new Request('https://main.test/api/pilot/owner/unlock', { method: 'POST', headers: { origin: 'https://main.test', 'content-type': 'application/json' }, body: JSON.stringify({ token: key }) }))
    const r = await app.dispatch(new Request('https://main.test/api/pilot/owner/labs/matrix/open', { method: 'POST', headers: { origin: 'https://main.test', cookie: unlock.headers.get('set-cookie').split(';')[0], 'content-type': 'application/json' }, body: '{}' }))
    assert.equal(r.status, 404); assert.equal(store.raw.prepare('SELECT COUNT(*) n FROM pilot_accounts').get().n, 0)
  } finally { store.close(); await rm(dir, { recursive: true, force: true }) }
})
