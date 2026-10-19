import {openStore} from '../server/storage.mjs'
import {readFile,mkdir,copyFile,readdir,chmod} from 'node:fs/promises'
import {restoreDatabase} from '../worker/backup.js'
const [folder,out]=process.argv.slice(2);if(!folder||!out)throw Error('Informe pasta do backup e pasta de restauração vazia')
await mkdir(out,{recursive:true});if((await readdir(out)).length)throw Error('Destino deve estar vazio')
const backup=JSON.parse(await readFile(`${folder}/database.json`,'utf8'));if(backup.format!=='meu-bichu-backup-v1')throw Error('Formato inválido')
for(const f of backup.tables.pilot_files||[]){
 if(typeof f.object_key!=='string'||f.object_key.includes('..')||! /^[\w./-]+$/.test(f.object_key)||! /^[\w-]+$/.test(f.id))throw Error('Caminho de foto inválido')
 const bytes=await readFile(`${folder}/files/${f.id}`);if(bytes.length!==f.size)throw Error('Foto incompleta: restauração cancelada')
}
const store=openStore(out),db=store.raw,api=store.DB
db.exec('BEGIN');try{await restoreDatabase(api,backup.tables);db.exec('COMMIT')}catch(error){db.exec('ROLLBACK');db.close();throw error}
for(const f of backup.tables.pilot_files){if(f.object_key.includes('..')||! /^[\w./-]+$/.test(f.object_key))throw Error('Caminho de foto inválido');const target=`${out}/objects/${f.object_key}`;await mkdir(target.slice(0,target.lastIndexOf('/')),{recursive:true});await copyFile(`${folder}/files/${f.id}`,target);await chmod(target,0o600)}
db.close();console.log('Restauração local concluída: banco e objetos de fotos. Nenhum dado de produção foi alterado.')
