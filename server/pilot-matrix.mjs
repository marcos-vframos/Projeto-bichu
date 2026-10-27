import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { randomBytes } from 'node:crypto'
import { openStore } from './storage.mjs'
import { snapshot, pack } from './recovery.mjs'

export const MATRIX_EMAIL = 'piloto01@meubichu.test'
export const matrixAccount = store => store.raw.prepare('SELECT id,email,first_access_at,expires_at,created_at FROM pilot_accounts WHERE email=?').get(MATRIX_EMAIL)
const tables = ['pilot_records', 'pilot_files', 'pilot_events', 'pilot_changes', 'pilot_devices']

// Only historical data is copied. The live matrix is the original pilot account.
// No password, session, token, other account, or team credential enters the archive.
export async function sealPilotMatrix(store, env, name, note) {
  const account = matrixAccount(store)
  if (!account) throw Error('Conta piloto 01 não encontrada; nenhuma conta foi criada ou substituída')
  const capturedAt = Date.now(), rows = {}
  store.raw.exec('BEGIN')
  try {
    for (const table of tables) rows[table] = store.raw.prepare(`SELECT * FROM ${table} WHERE account_id=? ORDER BY id`).all(account.id)
    store.raw.exec('COMMIT')
  } catch (error) { store.raw.exec('ROLLBACK'); throw error }
  const directory = await mkdtemp(join(tmpdir(), 'bichu-pilot-matrix-'))
  let target, folder, sealed
  try {
    target = openStore(directory)
    target.raw.exec('BEGIN IMMEDIATE')
    target.raw.prepare("INSERT INTO pilot_accounts(id,email,password_salt,password_hash,first_access_at,expires_at,created_at,account_kind) VALUES(?,?,?,?,?,?,?,'internal')")
      .run(account.id, account.email, randomBytes(32).toString('hex'), randomBytes(32).toString('hex'), account.first_access_at, account.expires_at, account.created_at)
    for (const table of tables) {
      for (const row of rows[table]) {
        const columns = Object.keys(row)
        target.raw.prepare(`INSERT INTO ${table} (${columns.join(',')}) VALUES (${columns.map(() => '?').join(',')})`).run(...columns.map(c => row[c]))
      }
      // Source history is inserted separately, without duplicated import audit entries.
      if (table === 'pilot_records') target.raw.prepare('DELETE FROM pilot_changes').run()
    }
    target.raw.exec('COMMIT')
    for (const file of rows.pilot_files) {
      const object = await store.BUCKET.get(file.object_key)
      if (!object || object.body.byteLength !== file.size) throw Error('Arquivo do piloto 01 ausente ou alterado; referência não foi salva')
      await target.BUCKET.put(file.object_key, object.body)
    }
    folder = snapshot(target, directory)
    const metadata = {
      id: crypto.randomUUID(), release: env.RAILWAY_GIT_COMMIT_SHA || env.APP_RELEASE || 'local',
      name: String(name || 'Matriz · piloto 01').slice(0, 120), note: String(note || '').slice(0, 1000),
      createdAt: capturedAt, sourceAccountId: account.id, sourceEmail: account.email,
    }
    await writeFile(join(folder, 'version.json'), JSON.stringify(metadata))
    sealed = await pack(folder, env.LAB_MATRIX_KEY)
    const bytes = await readFile(sealed)
    if (bytes.length > 6 * 1024 * 1024) throw Error('Referência excede o limite de 6 MB; os dados originais continuam intactos')
    return { bytes, metadata }
  } finally {
    target?.close()
    for (const path of [directory, folder, sealed]) if (path) await rm(path, { recursive: true, force: true })
  }
}

export function pilotMatrixManager(store, env) {
  let archiving = false, archiveError = null
  const origin = env.LAB_MATRIX_ORIGIN
  const enabled = !env.LAB_KIND && /^https:\/\/[^/]+$/.test(origin || '') && /^[a-f0-9]{64}$/.test(env.LAB_MATRIX_KEY || '')
  async function save(name, note) {
    if (!enabled) throw Error('Arquivo da matriz não configurado')
    if (archiving) throw Error('Referência do piloto 01 em andamento')
    archiving = true
    try {
      const { bytes } = await sealPilotMatrix(store, env, name, note)
      const r = await fetch(origin + '/api/lab/manage/pilot01-archive', {
        method: 'POST', headers: { origin, authorization: 'Bearer ' + env.LAB_MATRIX_KEY, 'content-type': 'application/octet-stream' },
        body: bytes, redirect: 'error', signal: AbortSignal.timeout(120000),
      })
      const data = await r.json()
      if (!r.ok) throw Error(data.error || 'Falha ao guardar a referência do piloto 01')
      archiveError = null
      return data
    } catch (error) { archiveError = error.message; throw error }
    finally { archiving = false }
  }
  function start() {
    if (!enabled || !matrixAccount(store)) return
    setTimeout(async () => {
      try {
        const r = await fetch(origin + '/api/lab/manage', { headers: { authorization: 'Bearer ' + env.LAB_MATRIX_KEY }, redirect: 'error', signal: AbortSignal.timeout(10000) })
        if (!r.ok) throw Error('Não foi possível consultar o histórico da matriz')
        const state = await r.json(), release = env.RAILWAY_GIT_COMMIT_SHA || env.APP_RELEASE || 'local'
        if (!state.versions.some(v => v.source_email === MATRIX_EMAIL && v.release === release)) await save('Piloto 01 · publicação ' + release.slice(0, 12), 'Referência automática da própria conta piloto 01.')
      } catch (error) { archiveError = error.message; console.error('Pilot matrix archive:', error.message) }
    }, 10000).unref()
  }
  return { enabled, save, start, state: () => ({ archiving, archiveError }) }
}
