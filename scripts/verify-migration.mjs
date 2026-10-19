import { readFile } from 'node:fs/promises'
import { DatabaseSync } from 'node:sqlite'
import { createHash } from 'node:crypto'
import { resolve } from 'node:path'
import { BACKUP_TABLES } from '../worker/backup.js'
const [folder, directory] = process.argv.slice(2)
if (!folder || !directory) throw Error('Informe backup e volume restaurado')
const backup = JSON.parse(await readFile(resolve(folder, 'database.json'), 'utf8'))
if (backup.format !== 'meu-bichu-backup-v1') throw Error('Formato inválido')
const db = new DatabaseSync(resolve(directory, 'database.sqlite'), { readOnly: true })
const canonical = (x) =>
  JSON.stringify(Object.fromEntries(Object.entries(x).sort(([a], [b]) => a.localeCompare(b))))
try {
  if (
    db.prepare('PRAGMA integrity_check').get().integrity_check !== 'ok' ||
    db.prepare('PRAGMA foreign_key_check').all().length
  )
    throw Error('Integridade inválida')
  for (const table of BACKUP_TABLES) {
    const expected = backup.tables[table].map(canonical).sort(),
      actual = db.prepare(`SELECT * FROM ${table}`).all().map(canonical).sort()
    if (JSON.stringify(expected) !== JSON.stringify(actual))
      throw Error('Divergência na tabela ' + table)
  }
  for (const f of backup.tables.pilot_files) {
    if (
      !/^[\w-]+$/.test(f.id) ||
      !/^[\w./-]+$/.test(f.object_key) ||
      f.object_key.split('/').includes('..')
    )
      throw Error('Caminho inválido')
    const [a, b] = await Promise.all([
      readFile(resolve(folder, 'files', f.id)),
      readFile(resolve(directory, 'objects', f.object_key)),
    ])
    const hash = (x) => createHash('sha256').update(x).digest('hex')
    if (a.length !== f.size || hash(a) !== hash(b)) throw Error('Divergência de foto')
  }
  console.log(
    'Verificado: todas as tabelas do piloto, integridade e hashes das fotos coincidem com o backup.',
  )
} finally {
  db.close()
}
