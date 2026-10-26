import {mkdtempSync,copyFileSync,mkdirSync,writeFileSync,readFileSync,existsSync,readdirSync,statSync} from 'node:fs'
import {readFile,writeFile,rm,mkdtemp,readdir,rename,open} from 'node:fs/promises'
import {createReadStream,createWriteStream} from 'node:fs'
import {tmpdir} from 'node:os'
import {join,resolve,dirname} from 'node:path'
import {execFile} from 'node:child_process'
import {promisify} from 'node:util'
import {pipeline} from 'node:stream/promises'
import {createCipheriv,createDecipheriv,randomBytes,createHash} from 'node:crypto'
import {DatabaseSync} from 'node:sqlite'
import {s3} from './s3.mjs'
const exec=promisify(execFile),digest=b=>createHash('sha256').update(b).digest('hex')
function safe(key){if(!/^[\w./-]+$/.test(key)||key.split('/').includes('..'))throw Error('Invalid object path');return key}
export function snapshot(store,directory){
 const folder=mkdtempSync(join(tmpdir(),'bichu-backup-')),dbfile=join(folder,'database.sqlite')
 try{
 store.raw.exec(`VACUUM INTO '${dbfile.replaceAll("'","''")}'`)
 const db=new DatabaseSync(dbfile,{readOnly:true}),files=db.prepare('SELECT object_key,size FROM pilot_files').all();db.close()
 const objects=[]
 for(const f of files){safe(f.object_key);const target=join(folder,'objects',f.object_key);mkdirSync(dirname(target),{recursive:true});copyFileSync(join(directory,'objects',f.object_key),target);const bytes=readFileSync(target);if(bytes.length!==f.size)throw Error('Incomplete object');objects.push({key:f.object_key,size:bytes.length,sha256:digest(bytes)})}
 writeFileSync(join(folder,'manifest.json'),JSON.stringify({format:'bichu-recovery-v2',createdAt:new Date().toISOString(),databaseSha256:digest(readFileSync(dbfile)),objects}),{mode:0o600})
 return folder
 }catch(e){void rm(folder,{recursive:true,force:true});throw e}
}
export async function verifyRestored(folder){
 const manifest=JSON.parse(await readFile(join(folder,'manifest.json'),'utf8'))
 if(manifest.format!=='bichu-recovery-v2'||digest(await readFile(join(folder,'database.sqlite')))!==manifest.databaseSha256)throw Error('Invalid database checksum')
 const db=new DatabaseSync(join(folder,'database.sqlite'),{readOnly:true})
 try{
 if(db.prepare('PRAGMA integrity_check').get().integrity_check!=='ok'||db.prepare('PRAGMA foreign_key_check').all().length)throw Error('Database integrity failed')
 const files=db.prepare('SELECT object_key,size FROM pilot_files').all();if(files.length!==manifest.objects.length)throw Error('Object count mismatch')
 for(const f of files){const listed=manifest.objects.find(x=>x.key===f.object_key),bytes=await readFile(join(folder,'objects',safe(f.object_key)));if(!listed||bytes.length!==f.size||digest(bytes)!==listed.sha256)throw Error('Object checksum failed')}
 const tables=db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").all(),counts={};for(const t of tables)counts[t.name]=db.prepare(`SELECT COUNT(*) n FROM "${t.name.replaceAll('"','""')}"`).get().n
 return {verifiedAt:new Date().toISOString(),tables:counts,objects:files.length}
 }finally{db.close()}
}
export async function pack(folder,key){
 if(!/^[a-f0-9]{64}$/.test(key||''))throw Error('Missing backup encryption key')
 const archive=folder+'.tar.gz',sealed=folder+'.enc',iv=randomBytes(12),cipher=createCipheriv('aes-256-gcm',Buffer.from(key,'hex'),iv)
 await exec('tar',['-czf',archive,'-C',folder,'.']);await writeFile(sealed,iv,{mode:0o600})
 await pipeline(createReadStream(archive),cipher,createWriteStream(sealed,{flags:'a',mode:0o600}))
 await writeFile(sealed,cipher.getAuthTag(),{flag:'a'});await rm(archive,{force:true});return sealed
}
export async function unpack(sealed,key,destination){
 await mkdirSync(destination,{recursive:true});if((await readdir(destination)).length)throw Error('Restore destination must be empty')
 const source=await open(sealed,'r'),size=(await source.stat()).size,iv=Buffer.alloc(12),tag=Buffer.alloc(16)
 if(size<28){await source.close();throw Error('Truncated backup')}
 await source.read(iv,0,12,0);await source.read(tag,0,16,size-16);await source.close()
 const cipher=createDecipheriv('aes-256-gcm',Buffer.from(key,'hex'),iv);cipher.setAuthTag(tag)
 const archive=join(destination,'payload.tar.gz')
 try{await pipeline(createReadStream(sealed,{start:12,end:size-17}),cipher,createWriteStream(archive,{mode:0o600}))}catch(e){await rm(archive,{force:true});throw e}
 const {stdout}=await exec('tar',['-tzvf',archive],{maxBuffer:10*1024*1024});if(stdout.split('\n').filter(Boolean).some(l=>!['-','d'].includes(l[0])))throw Error('Unsupported archive entry')
 const names=(await exec('tar',['-tzf',archive],{maxBuffer:10*1024*1024})).stdout.split('\n').filter(Boolean);if(names.some(n=>n.startsWith('/')||n.split('/').includes('..')))throw Error('Invalid archive path')
 await exec('tar',['-xzf',archive,'--no-same-owner','--no-same-permissions','-C',destination]);await rm(archive);return verifyRestored(destination)
}
async function fileHash(file){const h=createHash('sha256');for await(const c of createReadStream(file))h.update(c);return h.digest('hex')}
export function recoveryManager(store,env){
 let running=false,last=null,error=null,timer=null
 const configured=()=>['BACKUP_ENDPOINT','BACKUP_BUCKET','BACKUP_ACCESS_KEY_ID','BACKUP_SECRET_ACCESS_KEY','BACKUP_ENCRYPTION_KEY'].every(k=>env[k])
 const state=()=>({configured:configured(),running,last,error,intervalHours:6,retentionDays:7})
 async function run(){if(running)throw Error('Backup already running');if(!configured())throw Error('Backup not configured');running=true;let folder,sealed,restore
 try{
 folder=snapshot(store,env.DATA_DIR);await verifyRestored(folder);sealed=await pack(folder,env.BACKUP_ENCRYPTION_KEY)
 const name='snapshots/'+new Date().toISOString().replaceAll(':','-')+'-'+randomBytes(4).toString('hex')+'.enc'
 await s3(env,'PUT',name,createReadStream(sealed),{hash:await fileHash(sealed),length:statSync(sealed).size})
 // Download the uploaded object and restore it, rather than only checking the source.
 const response=await s3(env,'GET',name),download=sealed+'.download';await pipeline(response.body,createWriteStream(download,{mode:0o600}));restore=await mkdtemp(join(tmpdir(),'bichu-drill-'))
 const result=await unpack(download,env.BACKUP_ENCRYPTION_KEY,restore);await rm(download,{force:true})
 last={key:name,createdAt:new Date().toISOString(),...result};error=null
 await writeFile(join(env.DATA_DIR,'backup-status.json'),JSON.stringify(last),{mode:0o600})
 // Retain seven days. Paginate without deleting during listing.
 let token;const old=[];do{const xml=await(await s3(env,'GET','',undefined,{query:{'list-type':'2',prefix:'snapshots/',...(token?{'continuation-token':token}:{})}})).text();for(const m of xml.matchAll(/<Contents>([\s\S]*?)<\/Contents>/g)){const key=m[1].match(/<Key>(.*?)<\/Key>/)?.[1],date=m[1].match(/<LastModified>(.*?)<\/LastModified>/)?.[1];if(key?.startsWith('snapshots/')&&Date.parse(date)<Date.now()-7*86400000)old.push(key)}token=xml.match(/<NextContinuationToken>(.*?)<\/NextContinuationToken>/)?.[1]}while(token)
 for(const key of old)await s3(env,'DELETE',key)
 return last
 }catch(e){error=e.message;console.error('Backup failed:',e.message);throw e}finally{running=false;for(const p of [folder,sealed,restore,sealed&&sealed+'.download'])if(p)await rm(p,{recursive:true,force:true})}}
 function start(){if(existsSync(join(env.DATA_DIR,'backup-status.json')))try{last=JSON.parse(readFileSync(join(env.DATA_DIR,'backup-status.json')))}catch{};if(!configured())return;const tick=()=>void run().catch(()=>{});timer=setInterval(tick,6*3600000);timer.unref();if(!last||Date.now()-Date.parse(last.createdAt)>6*3600000)setTimeout(tick,15000).unref()}
 return {state,run,start,stop(){if(timer)clearInterval(timer)}}
}
