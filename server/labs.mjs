import {s3} from './s3.mjs'
import {statSync,createReadStream,createWriteStream} from 'node:fs'
import {pipeline} from 'node:stream/promises'
import {randomBytes,createHash,createHmac,timingSafeEqual} from 'node:crypto'
import {mkdir,readFile,writeFile,rm,mkdtemp,rename} from 'node:fs/promises'
import {join} from 'node:path'
import {tmpdir} from 'node:os'
import {DatabaseSync} from 'node:sqlite'
import {snapshot,pack,unpack} from './recovery.mjs'
const json=(data,status=200,headers={})=>Response.json(data,{status,headers:{'cache-control':'no-store',...headers}}),sha=v=>createHash('sha256').update(v).digest('hex'),secret=()=>randomBytes(24).toString('hex')
export const releaseId=env=>env.RAILWAY_GIT_COMMIT_SHA||env.APP_RELEASE||env.RAILWAY_DEPLOYMENT_ID||'local'
export function initLab(store,env){
 if(!['matrix','dirty','beta'].includes(env.LAB_KIND))return
 const db=store.raw
 db.exec(`CREATE TABLE IF NOT EXISTS lab_accounts(slot TEXT PRIMARY KEY,account_id TEXT UNIQUE NOT NULL REFERENCES pilot_accounts(id),active INTEGER NOT NULL,generation INTEGER NOT NULL DEFAULT 0);CREATE TABLE IF NOT EXISTS lab_tickets(hash TEXT PRIMARY KEY,slot TEXT NOT NULL,expires_at INTEGER NOT NULL);CREATE TABLE IF NOT EXISTS lab_versions(id TEXT PRIMARY KEY,release TEXT NOT NULL,name TEXT NOT NULL,created_at INTEGER NOT NULL,path TEXT NOT NULL,note TEXT NOT NULL);`)
 const count=env.LAB_KIND==='beta'?21:1
 for(let n=1;n<=count;n++){
 const slot=env.LAB_KIND==='beta'?'beta-'+String(n).padStart(2,'0'):env.LAB_KIND
 if(db.prepare('SELECT 1 FROM lab_accounts WHERE slot=?').get(slot))continue
 const id=crypto.randomUUID(),now=Date.now(),active=n===1?1:0
 db.exec('BEGIN IMMEDIATE');try{
 db.prepare("INSERT INTO pilot_accounts(id,email,password_salt,password_hash,expires_at,created_at,account_kind) VALUES(?,?,?,?,?,?,'internal')").run(id,slot+'@'+env.LAB_KIND+'.meubichu.invalid',secret(),secret(),active?253402300799000:0,now)
 db.prepare('INSERT INTO lab_accounts(slot,account_id,active) VALUES(?,?,?)').run(slot,id,active)
 const data={bichu_tutor_name:slot==='matrix'?'Matriz':slot==='dirty'?'Laboratório':slot.toUpperCase(),bichu_privacy_analytics:'false'}
 db.prepare("INSERT INTO pilot_records(id,account_id,collection,data,created_at,updated_at) VALUES(?,?,'account_preferences',?,?,?)").run('preferences_'+id,id,JSON.stringify(data),new Date(now).toISOString(),new Date(now).toISOString())
 db.exec('COMMIT')
 }catch(e){db.exec('ROLLBACK');throw e}
 }
}
function current(req,db){const value=req.headers.get('cookie')?.match(/(?:^|;\s*)mb_pilot=([a-f0-9]{48})/)?.[1];return value?db.prepare('SELECT l.* FROM lab_accounts l JOIN pilot_sessions s ON s.account_id=l.account_id WHERE s.token_hash=? AND s.expires_at>? AND l.active=1').get(sha(value),Date.now()):null}
export function labManager(store,env){
 let archiving=false,archiveError=null
 async function archive(name='Versão de referência',note=''){
 if(env.LAB_KIND!=='matrix')throw Error('Somente a matriz possui arquivo de versões')
 if(archiving)throw Error('Arquivo de versão em andamento');archiving=true;let folder,sealed
 try{folder=snapshot(store,env.DATA_DIR);const id=crypto.randomUUID();await writeFile(join(folder,'version.json'),JSON.stringify({id,release:releaseId(env),name:name.slice(0,120),note:note.slice(0,1000),createdAt:Date.now()}));sealed=await pack(folder,env.LAB_CONTROL_KEY);const directory=join(env.DATA_DIR,'lab-archives'),path=join(directory,id+'.enc');await mkdir(directory,{recursive:true});await rename(sealed,path);if(env.BACKUP_BUCKET){const hash=createHash('sha256');for await(const chunk of createReadStream(path))hash.update(chunk);await s3(env,'PUT','matrix-archives/'+id+'.enc',createReadStream(path),{hash:hash.digest('hex'),length:statSync(path).size})}store.raw.prepare('INSERT INTO lab_versions VALUES(?,?,?,?,?,?)').run(id,releaseId(env),name.slice(0,120),Date.now(),path,note.slice(0,1000));archiveError=null;return {id}}
 catch(error){archiveError=error.message;throw error}
 finally{archiving=false;for(const p of [folder,sealed])if(p)await rm(p,{recursive:true,force:true})}
 }
 async function readArchive(id){const row=store.raw.prepare('SELECT * FROM lab_versions WHERE id=?').get(id);if(!row)throw Error('Versão não encontrada');const temp=await mkdtemp(join(tmpdir(),'bichu-version-'));try{await unpack(row.path,env.LAB_CONTROL_KEY,temp);const db=new DatabaseSync(join(temp,'database.sqlite'),{readOnly:true});try{return {version:{...row,path:undefined},records:db.prepare('SELECT id,collection,dog_id,data,created_at,updated_at FROM pilot_records ORDER BY collection,id').all().map(r=>({...r,data:JSON.parse(r.data)}))}}finally{db.close()}}finally{await rm(temp,{recursive:true,force:true})}}
 async function api(req){
 const db=store.raw,p=new URL(req.url).pathname
 if(!env.LAB_KIND)return json({error:'Recurso indisponível'},404)
 if(p==='/api/lab/enter'&&req.method==='POST'){
 const {ticket}=await req.json();if(typeof ticket!=='string'||! /^[a-f0-9]{48}$/.test(ticket))return json({error:'Acesso inválido'},403)
 db.exec('BEGIN IMMEDIATE');try{const row=db.prepare('SELECT t.*,l.account_id,l.active FROM lab_tickets t JOIN lab_accounts l ON l.slot=t.slot WHERE t.hash=?').get(sha(ticket));if(!row?.active||row.expires_at<=Date.now()){db.exec('ROLLBACK');return json({error:'Link utilizado, expirado ou conta desativada'},403)}
 db.prepare('DELETE FROM lab_tickets WHERE hash=?').run(row.hash);const value=secret();db.prepare('INSERT INTO pilot_sessions VALUES(?,?,?)').run(sha(value),row.account_id,Date.now()+30*86400000);db.prepare('UPDATE pilot_accounts SET first_access_at=COALESCE(first_access_at,?) WHERE id=?').run(Date.now(),row.account_id);db.exec('COMMIT');return json({ok:true},200,{'set-cookie':`mb_pilot=${value}; HttpOnly; SameSite=Strict; Path=/api/pilot; Max-Age=2592000${env.COOKIE_SECURE===false?'':'; Secure'}`})
 }catch(e){db.exec('ROLLBACK');throw e}
 }
 if(p==='/api/lab/evaluation'&&req.method==='POST'){
 if(env.LAB_KIND!=='beta')return json({error:'Disponível somente na beta'},403)
 const a=current(req,db);if(a&&req.headers.get('x-mb-account-id')&&req.headers.get('x-mb-account-id')!==a.account_id)return json({error:'A conta mudou. Reabra o acesso.'},409);if(!a)return json({error:'Entre novamente'},401)
 const b=await req.json(),ratings=b.ratings
 if(typeof b.screen!=='string'||!b.screen.startsWith('/')||b.screen.startsWith('//')||b.screen.length>200||!ratings||['usability','visual','speed'].some(k=>!Number.isInteger(ratings[k])||ratings[k]<1||ratings[k]>5)||!['sim','parcial','nao'].includes(b.worked)||typeof b.comment!=='string'||b.comment.length>2000)return json({error:'Avaliação inválida'},400)
 const id=crypto.randomUUID(),now=new Date().toISOString(),data={category:b.worked==='sim'?'utilidade':'dificuldade',message:`Avaliação de ${b.screen}: funcionou ${b.worked}. Usabilidade ${ratings.usability}/5; visual ${ratings.visual}/5; velocidade ${ratings.speed}/5.\n${b.comment}`,screen:b.screen,ratings,worked:b.worked,comment:b.comment,release:releaseId(env),labSlot:a.slot,status:'recebido',replies:[]}
 db.prepare("INSERT INTO pilot_records(id,account_id,collection,data,created_at,updated_at) VALUES(?,?,'pilot_feedback',?,?,?)").run(id,a.account_id,JSON.stringify(data),now,now);return json({ok:true,id},201)
 }
 if(req.headers.get('authorization')!=='Bearer '+env.LAB_CONTROL_KEY)return json({error:'Exclusivo do proprietário'},403)
 if(p==='/api/lab/manage'&&req.method==='GET')return json({kind:env.LAB_KIND,release:releaseId(env),archiving,archiveError,accounts:db.prepare('SELECT l.slot,l.active,l.account_id,COUNT(r.id) AS records FROM lab_accounts l LEFT JOIN pilot_records r ON r.account_id=l.account_id AND r.collection!=\'account_preferences\' GROUP BY l.slot ORDER BY l.slot').all(),versions:db.prepare('SELECT id,release,name,created_at,note FROM lab_versions ORDER BY created_at DESC').all()})
 if(p==='/api/lab/manage/activate'&&req.method==='POST'){
 const b=await req.json();if(env.LAB_KIND!=='beta'||typeof b.active!=='boolean'||!db.prepare('SELECT 1 FROM lab_accounts WHERE slot=?').get(b.slot))return json({error:'Conta inválida'},400)
 db.exec('BEGIN IMMEDIATE');try{db.prepare('UPDATE lab_accounts SET active=?,generation=generation+1 WHERE slot=?').run(b.active?1:0,b.slot);db.prepare('UPDATE pilot_accounts SET expires_at=? WHERE id=(SELECT account_id FROM lab_accounts WHERE slot=?)').run(b.active?253402300799000:0,b.slot);db.prepare('DELETE FROM lab_tickets WHERE slot=?').run(b.slot);db.prepare('DELETE FROM pilot_sessions WHERE account_id=(SELECT account_id FROM lab_accounts WHERE slot=?)').run(b.slot);db.exec('COMMIT')}catch(e){db.exec('ROLLBACK');throw e}return json({ok:true})
 }
 if(p==='/api/lab/manage/open'&&req.method==='POST'){
 const b=await req.json(),a=db.prepare('SELECT * FROM lab_accounts WHERE slot=? AND active=1').get(b.slot);if(!a)return json({error:'Ative esta conta antes de abrir'},409)
 const ticket=secret();db.prepare('DELETE FROM lab_tickets WHERE expires_at<?').run(Date.now());db.prepare('INSERT INTO lab_tickets VALUES(?,?,?)').run(sha(ticket),a.slot,Date.now()+10*60000);return json({url:env.APP_ORIGIN+'/#lab='+ticket})
 }
 if(p==='/api/lab/manage/archive'&&req.method==='POST'){const b=await req.json();if(env.LAB_KIND!=='matrix')return json({error:'Somente matriz'},403);return json(await archive(String(b.name||'Versão de referência'),String(b.note||'')),201)}
 const m=p.match(/^\/api\/lab\/manage\/archive\/([a-f0-9-]{36})$/);if(m&&req.method==='GET')return json(await readArchive(m[1]))
 if(p==='/api/lab/manage/feedback'&&req.method==='GET'){const offset=Number(new URL(req.url).searchParams.get('offset')||0);if(!Number.isSafeInteger(offset)||offset<0)return json({error:'Página inválida'},400);const rows=db.prepare("SELECT id,account_id,data,created_at FROM pilot_records WHERE collection='pilot_feedback' ORDER BY created_at DESC,id DESC LIMIT 101 OFFSET ?").all(offset);return json({items:rows.slice(0,100).map(r=>({...r,data:JSON.parse(r.data)})),nextOffset:rows.length>100?offset+100:null})}
 return json({error:'Recurso indisponível'},404)
 }
 function start(){if(env.LAB_KIND==='matrix'&&!store.raw.prepare('SELECT 1 FROM lab_versions WHERE release=?').get(releaseId(env)))setTimeout(()=>void archive('Publicação '+releaseId(env).slice(0,12),'Registro automático na entrada desta versão.').catch(e=>console.error('Matrix archive:',e.message)),10000).unref()}
 return {api,start,archive}
}
export async function labsProxy(req,env){
 const u=new URL(req.url),parts=u.pathname.split('/').filter(Boolean),kind=parts[4],route=parts.slice(5).join('/'),names={matrix:'MATRIX',dirty:'DIRTY',beta:'BETA'}
 const call=async(k,path,method='GET',body)=>{const name=names[k],origin=env['LAB_'+name+'_ORIGIN'],key=env['LAB_'+name+'_KEY'];if(!origin||!key)return {error:'Ambiente ainda não configurado',unavailable:true};if(!origin.startsWith('https://'))throw Error('Origem inválida');const r=await fetch(origin+'/api/lab/manage'+path,{method,headers:{origin,authorization:'Bearer '+key,...(body?{'content-type':'application/json'}:{})},body:body?JSON.stringify(body):undefined,redirect:'error',signal:AbortSignal.timeout(path==='/archive'?120000:10000)});const d=await r.json();if(!r.ok)throw Error(d.error||'Falha no ambiente');return d}
 if(parts.length===4&&req.method==='GET'){const items=await Promise.all(Object.keys(names).map(async k=>{try{return {kind:k,...await call(k,'')}}catch(e){return {kind:k,error:e.message,unavailable:true}}}));return json({items})}
 if(!names[kind])return json({error:'Ambiente inválido'},400)
 if(req.method==='GET'&&route==='feedback')return json(await call(kind,'/feedback'+u.search))
 if(req.method==='GET'&&/^archive\/[a-f0-9-]{36}$/.test(route))return json(await call(kind,'/'+route))
 if(req.method==='POST'&&['open','activate','archive'].includes(route))return json(await call(kind,'/'+route,'POST',await req.json()))
 return json({error:'Recurso indisponível'},404)
}
