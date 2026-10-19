import {BACKUP_TABLES,restoreDatabase} from '../worker/backup.js'
import {writeFile,mkdir,readFile} from 'node:fs/promises'
import {resolve} from 'node:path'
import {createHash} from 'node:crypto'
import {openStore} from './storage.mjs'
const canonical=x=>JSON.stringify(Object.fromEntries(Object.entries(x).sort(([a],[b])=>a.localeCompare(b))))
const snapshot=tables=>JSON.stringify(BACKUP_TABLES.map(t=>[t,tables[t].map(canonical).sort()]))
export async function migrateFromSource(env,fetcher=fetch){
 if(!env.MIGRATION_SOURCE)return
 const origin=new URL(env.MIGRATION_SOURCE);if(origin.protocol!=='https:'||origin.pathname!=='/'||!env.MIGRATION_KEY||!env.DATA_DIR)throw Error('Invalid migration configuration')
 const store=openStore(env.DATA_DIR),marker='pilot-data-import-v1';
 try{
  if(store.raw.prepare('SELECT 1 FROM app_migrations WHERE name=?').get(marker))return
  if(store.raw.prepare('SELECT COUNT(*) AS n FROM pilot_accounts').get().n)throw Error('Migration requires an empty destination')
  async function get(path){const r=await fetcher(new URL(path,origin),{headers:{authorization:`Bearer ${env.MIGRATION_KEY}`},redirect:'error',signal:AbortSignal.timeout(60000)});if(!r.ok)throw Error('Migration source unavailable ('+r.status+')');return r}
  // The source must attest that writes are blocked, not merely appear stable.
  const state=await (await get('/api/pilot/admin/migration-status')).json();if(state.readOnly!==true)throw Error('Source must be read-only')
  async function tables(){const out={};for(const table of BACKUP_TABLES){out[table]=[];let offset=0;do{const p=await (await get(`/api/pilot/admin/backup?table=${table}&offset=${offset}`)).json();if(p.format!=='meu-bichu-backup-v1'||p.table!==table||!Array.isArray(p.items))throw Error('Invalid export');out[table].push(...p.items);offset=p.nextOffset}while(offset!==null)}return out}
  const first=await tables(),dir=resolve(env.DATA_DIR,'migration-backup');await mkdir(resolve(dir,'files'),{recursive:true,mode:0o700});
  if(!first.pilot_accounts.length)throw Error('Empty source')
  for(const f of first.pilot_files){if(!/^[\w-]+$/.test(f.id))throw Error('Invalid file identifier');const bytes=new Uint8Array(await(await get('/api/pilot/admin/backup-file/'+f.id)).arrayBuffer());if(bytes.byteLength!==f.size)throw Error('Incomplete photo');await writeFile(resolve(dir,'files',f.id),bytes,{mode:0o600});await store.BUCKET.put(f.object_key,bytes)}
  const second=await tables();if(snapshot(first)!==snapshot(second))throw Error('Source changed during export')
  await writeFile(resolve(dir,'database.json'),JSON.stringify({format:'meu-bichu-backup-v1',createdAt:new Date().toISOString(),tables:first}),{mode:0o600})
  store.raw.exec('BEGIN IMMEDIATE');try{await restoreDatabase(store.DB,first);for(const table of BACKUP_TABLES){const actual=store.raw.prepare(`SELECT * FROM ${table}`).all().map(canonical).sort();if(JSON.stringify(actual)!==JSON.stringify(first[table].map(canonical).sort()))throw Error('Table verification failed')}
   if(store.raw.prepare('PRAGMA foreign_key_check').all().length)throw Error('Foreign key verification failed')
   for(const f of first.pilot_files){const a=await readFile(resolve(dir,'files',f.id)),b=(await store.BUCKET.get(f.object_key)).body;const hash=x=>createHash('sha256').update(x).digest('hex');if(hash(a)!==hash(b))throw Error('Photo verification failed')}
   store.raw.prepare('INSERT INTO app_migrations VALUES(?)').run(marker);store.raw.exec('COMMIT')
  }catch(e){store.raw.exec('ROLLBACK');throw e}
  console.log('Pilot migration verified:',JSON.stringify(Object.fromEntries(BACKUP_TABLES.map(t=>[t,first[t].length]))))
 }finally{store.close()}
}
