import { migrateFromSource } from '../server/migrate.mjs'

// Explicit maintenance operation; never runs when starting the application.
if (!process.env.MIGRATION_SOURCE || !process.env.MIGRATION_KEY || !process.env.DATA_DIR)
  throw Error('Informe a origem autorizada, a chave de importação e um diretório vazio de destino')
await migrateFromSource(process.env)
