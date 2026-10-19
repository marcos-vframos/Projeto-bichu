// MB_BACKUP_ORIGIN and MB_BACKUP_KEY must be environment variables; never command-line secrets.
import {mkdir,writeFile} from 'node:fs/promises'
import {BACKUP_TABLES} from '../worker/backup.js'
const origin=process.env.MB_BACKUP_ORIGIN,key=process.env.MB_BACKUP_KEY,out=process.argv[2]
if(!origin?.startsWith('https://')||!key||!out)throw Error('Informe MB_BACKUP_ORIGIN, MB_BACKUP_KEY e pasta de destino')
await mkdir(`${out}/files`,{recursive:true});const tables={}
async function get(path){const r=await fetch(new URL(path,origin),{headers:{authorization:`Bearer ${key}`},redirect:'error'});if(!r.ok)throw Error(`Falha no backup (${r.status})`);return r}
for(const table of BACKUP_TABLES){tables[table]=[];let offset=0;do{const page=await (await get(`/api/pilot/admin/backup?table=${table}&offset=${offset}`)).json();tables[table].push(...page.items);offset=page.nextOffset}while(offset!==null)}
for(const f of tables.pilot_files){const r=await get(`/api/pilot/admin/backup-file/${encodeURIComponent(f.id)}`);await writeFile(`${out}/files/${f.id}`,new Uint8Array(await r.arrayBuffer()))}
await writeFile(`${out}/database.json`,JSON.stringify({format:'meu-bichu-backup-v1',createdAt:new Date().toISOString(),tables}))
console.log('Backup concluído. Preserve esta pasta privada e as fotos junto com database.json.')
