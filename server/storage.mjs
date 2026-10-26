import { DatabaseSync } from 'node:sqlite'
import { mkdirSync, readFileSync, readdirSync } from 'node:fs'
import { mkdir, readFile, writeFile, rename, unlink } from 'node:fs/promises'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
export const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
export function openStore(directory) {
  mkdirSync(directory, { recursive: true })
  const db = new DatabaseSync(resolve(directory, 'database.sqlite'))
  db.exec(
    'PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000; CREATE TABLE IF NOT EXISTS app_migrations(name TEXT PRIMARY KEY)',
  )
  for (const name of readdirSync(resolve(root, 'drizzle'))
    .filter((n) => n.endsWith('.sql'))
    .sort()) {
    if (db.prepare('SELECT 1 FROM app_migrations WHERE name=?').get(name)) continue
    db.exec('BEGIN')
    try {
      db.exec(
        readFileSync(resolve(root, 'drizzle', name), 'utf8').replaceAll(
          '--> statement-breakpoint',
          '\n',
        ),
      )
      db.prepare('INSERT INTO app_migrations VALUES(?)').run(name)
      db.exec('COMMIT')
    } catch (e) {
      db.exec('ROLLBACK')
      throw e
    }
  }
  const prepare = (sql) => {
    let values = []
    return {
      bind(...v) {
        values = v
        return this
      },
      first() {
        return db.prepare(sql).get(...values) || null
      },
      all() {
        return { results: db.prepare(sql).all(...values) }
      },
      run() {
        const r = db.prepare(sql).run(...values)
        return { meta: { changes: Number(r.changes) }, changes: Number(r.changes) }
      },
    }
  }
  const DB = {
    prepare,
    batch(statements) {
      db.exec('BEGIN IMMEDIATE')
      try {
        const r = statements.map((s) => s.run())
        db.exec('COMMIT')
        return r
      } catch (e) {
        db.exec('ROLLBACK')
        throw e
      }
    },
  }
  const withActor = actor => {
    const transaction = action => {
      db.exec('BEGIN IMMEDIATE')
      try {
        db.prepare('UPDATE pilot_change_context SET actor_type=? WHERE id=1').run(actor)
        const result=action()
        db.prepare("UPDATE pilot_change_context SET actor_type='unknown' WHERE id=1").run()
        db.exec('COMMIT');return result
      } catch(error){db.exec('ROLLBACK');throw error}
    }
    return {
      prepare(sql){const s=prepare(sql);return {...s,bind(...v){s.bind(...v);return this},run:()=>transaction(()=>s.run()),runInTransaction:()=>s.run()}},
      batch:statements=>transaction(()=>statements.map(s=>s.runInTransaction()))
    }
  }
  const objectRoot = resolve(directory, 'objects'),
    objectPath = (key) => {
      if (!/^[\w./-]+$/.test(key) || key.split('/').includes('..')) throw Error('Invalid object')
      const p = resolve(objectRoot, key)
      if (!p.startsWith(objectRoot + '/')) throw Error('Invalid object')
      return p
    }
  const BUCKET = {
    async put(key, stream) {
      const p = objectPath(key),
        temp = p + '.' + crypto.randomUUID() + '.tmp'
      await mkdir(dirname(p), { recursive: true })
      const bytes = Buffer.from(await new Response(stream).arrayBuffer())
      await writeFile(temp, bytes, { mode: 0o600 })
      await rename(temp, p)
    },
    async get(key) {
      try {
        return { body: new Uint8Array(await readFile(objectPath(key))) }
      } catch (e) {
        if (e.code === 'ENOENT') return null
        throw e
      }
    },
    async delete(key) {
      await unlink(objectPath(key)).catch((e) => {
        if (e.code !== 'ENOENT') throw e
      })
    },
  }
  return {
    DB,
    withActor,
    BUCKET,
    raw: db,
    close() {
      db.close()
    },
  }
}
