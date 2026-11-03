import {randomUUID,createHash,timingSafeEqual} from 'node:crypto'
import {gzipSync,gunzipSync} from 'node:zlib'
import {mkdir,rename,rm} from 'node:fs/promises'
import {join} from 'node:path'
import {snapshot,verifyRestored,pack} from './recovery.mjs'

const SOURCE='piloto01@meubichu.test'
const DEST='https://bichu-testes-sujos-production.up.railway.app'
const COLLECTIONS=new Set(['dogs','weight_logs','feeding_plans','bcs_evaluations','health_events','pet_routine_events','user_foods','account_preferences','natural_diets','pilot_feedback'])
const sha=b=>createHash('sha256').update(b).digest('hex')
const json=(d,status=200)=>Response.json(d,{status,headers:{'cache-control':'no-store'}})
const fail=m=>{throw new Error(m)}
const records=(db,id)=>db.prepare('SELECT id,account_id,collection,dog_id,data,created_at,updated_at FROM pilot_records WHERE account_id=? ORDER BY id').all(id)
const files=(db,id)=>db.prepare('SELECT id,account_id,record_id,collection,filename,object_key,content_type,size FROM pilot_files WHERE account_id=? ORDER BY id').all(id)
const fingerprint=(db,id)=>sha(JSON.stringify([records(db,id),files(db,id)]))
function account(store){return store.raw.prepare('SELECT id,email FROM pilot_accounts WHERE email=?').get(SOURCE)}
export function clonePreview(store){const a=account(store);if(!a)fail('Piloto 01 não encontrado. Nenhuma conta será recriada.');const rows=records(store.raw,a.id);return {source:SOURCE,records:rows.length,pets:rows.filter(r=>r.collection==='dogs').length,files:files(store.raw,a.id).length,collections:Object.fromEntries([...COLLECTIONS].map(c=>[c,rows.filter(r=>r.collection===c).length]))}}
export async function captureMatrix(store,id){
 const a=account(store);if(!a)fail('Matriz original não encontrada')
 const db=store.raw;let rows,objects,before
 db.exec('BEGIN');try{rows=records(db,a.id);objects=files(db,a.id);before=fingerprint(db,a.id);db.exec('COMMIT')}catch(e){db.exec('ROLLBACK');throw e}
 if(rows.some(r=>!COLLECTIONS.has(r.collection)))fail('Coleção não reconhecida na matriz; cópia cancelada para evitar omissões')
 const captured=[]
 for(const f of objects){const object=await store.BUCKET.get(f.object_key);if(!object||object.body.byteLength!==f.size)fail('Foto original ausente ou inconsistente');const bytes=Buffer.from(object.body);captured.push({record_id:f.record_id,collection:f.collection,filename:f.filename,content_type:f.content_type,size:f.size,sha256:sha(bytes),base64:bytes.toString('base64')})}
 if(before!==fingerprint(db,a.id))fail('A matriz mudou durante a leitura. Tente novamente; nenhum dado foi importado.')
 return {format:'bichu-dirty-clone-v1',id,sourceEmail:SOURCE,sourceAccountId:a.id,capturedAt:new Date().toISOString(),records:rows,files:captured}
}
function validate(p){
 if(!p||p.format!=='bichu-dirty-clone-v1'||p.sourceEmail!==SOURCE||typeof p.sourceAccountId!=='string'||!p.sourceAccountId||p.sourceAccountId.length>200||!/^[a-f0-9-]{36}$/.test(p.id)||!Number.isFinite(Date.parse(p.capturedAt))||Math.abs(Date.now()-Date.parse(p.capturedAt))>10*60000||!Array.isArray(p.records)||!Array.isArray(p.files)||p.records.length>10000||p.files.length>500)fail('Pacote inválido ou expirado')
 if(Object.keys(p).some(k=>!['format','id','sourceEmail','sourceAccountId','capturedAt','records','files'].includes(k)))fail('Campo não permitido no pacote')
 const ids=new Set(),dogs=new Set(p.records.filter(r=>r.collection==='dogs').map(r=>r.id))
 for(const r of p.records){if(typeof r.id!=='string'||r.id.length>200||ids.has(r.id)||r.account_id!==p.sourceAccountId||!COLLECTIONS.has(r.collection)||typeof r.data!=='string'||r.data.length>100000||!Number.isFinite(Date.parse(r.created_at))||!Number.isFinite(Date.parse(r.updated_at))||r.dog_id&&!dogs.has(r.dog_id))fail('Registro ou vínculo inválido');const d=JSON.parse(r.data);if(!d||typeof d!=='object'||Array.isArray(d))fail('Dados inválidos');ids.add(r.id)}
 const names=new Set();let total=0
 for(const f of p.files){if(!ids.has(f.record_id)||!p.records.some(r=>r.id===f.record_id&&r.collection===f.collection)||!/^[a-zA-Z0-9_.-]{1,180}$/.test(f.filename)||!['image/png','image/jpeg','image/webp'].includes(f.content_type)||!Number.isSafeInteger(f.size)||f.size<0||f.size>5*1024*1024||typeof f.base64!=='string'||f.base64.length>7*1024*1024||names.has(f.record_id+'/'+f.filename))fail('Arquivo inválido');names.add(f.record_id+'/'+f.filename);const b=Buffer.from(f.base64,'base64');if(b.length!==f.size||sha(b)!==f.sha256)fail('Hash da foto divergente');total+=f.size}
 if(total>80*1024*1024)fail('Pacote excede o limite')
}
function remap(value,mapping){if(typeof value==='string'){if(mapping.has(value))return mapping.get(value);let s=value;for(const [a,b] of [...mapping].sort((x,y)=>y[0].length-x[0].length))s=s.split(a).join(b);return s}if(Array.isArray(value))return value.map(x=>remap(x,mapping));if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).map(([k,v])=>[k,remap(v,mapping)]));return value}
export async function importMatrix(store,env,p){
 if(env.LAB_KIND!=='dirty'||env.APP_ORIGIN!==DEST)fail('Importação permitida apenas no serviço de testes sujos')
 validate(p);const db=store.raw
 db.exec('CREATE TABLE IF NOT EXISTS dirty_matrix_clones(id TEXT PRIMARY KEY, captured_at TEXT NOT NULL, imported_at TEXT NOT NULL, source_email TEXT NOT NULL, records INTEGER NOT NULL, files INTEGER NOT NULL, backup_path TEXT NOT NULL)')
 const prior=db.prepare('SELECT id,captured_at,imported_at,source_email,records,files FROM dirty_matrix_clones WHERE id=?').get(p.id);if(prior)return {...prior,alreadyImported:true}
 const target=db.prepare("SELECT l.account_id FROM lab_accounts l JOIN pilot_accounts a ON a.id=l.account_id WHERE l.slot='dirty' AND l.active=1 AND a.account_kind='internal'").get();if(!target)fail('Conta interna dos testes sujos não encontrada')
 const targetId=target.account_id,baseline=fingerprint(db,targetId),mapping=new Map([[p.sourceAccountId,targetId]]),newFiles=[]
 for(const r of p.records)mapping.set(r.id,randomUUID())
 // A filename can occur in more than one record: its mapping is scoped below.
 const recordFiles=new Map()
 for(const f of p.files){const filename=randomUUID()+'.'+(f.content_type==='image/jpeg'?'jpg':f.content_type.split('/')[1]),id=randomUUID(),recordId=mapping.get(f.record_id),key=targetId+'/'+recordId+'/'+filename;newFiles.push({...f,id,filename,recordId,key});if(!recordFiles.has(f.record_id))recordFiles.set(f.record_id,new Map());recordFiles.get(f.record_id).set(f.filename,filename)}
 let backupFolder,sealed,backupPath
 try{
  backupFolder=snapshot(store,env.DATA_DIR);await verifyRestored(backupFolder);sealed=await pack(backupFolder,env.LAB_CONTROL_KEY)
  const backupDir=join(env.DATA_DIR,'clone-backups');await mkdir(backupDir,{recursive:true});backupPath=join(backupDir,p.id+'.enc');await rename(sealed,backupPath);sealed=null
  // New unique paths mean a failed import cannot overwrite any current photo.
  for(const f of newFiles)await store.BUCKET.put(f.key,Buffer.from(f.base64,'base64'))
  db.exec('BEGIN IMMEDIATE')
  try{
   if(baseline!==fingerprint(db,targetId))fail('Os testes sujos mudaram durante a cópia. Nenhuma substituição foi aplicada; tente novamente.')
   db.prepare('DELETE FROM pilot_files WHERE account_id=?').run(targetId)
   db.prepare('DELETE FROM pilot_records WHERE account_id=?').run(targetId)
   for(const r of p.records){const map=new Map([...mapping,...(recordFiles.get(r.id)||[])]),data=remap(JSON.parse(r.data),map);db.prepare('INSERT INTO pilot_records(id,account_id,collection,dog_id,data,created_at,updated_at) VALUES(?,?,?,?,?,?,?)').run(mapping.get(r.id),targetId,r.collection,r.dog_id?mapping.get(r.dog_id):null,JSON.stringify(data),r.created_at,r.updated_at)}
   for(const f of newFiles)db.prepare('INSERT INTO pilot_files(id,account_id,record_id,collection,filename,object_key,content_type,size) VALUES(?,?,?,?,?,?,?,?)').run(f.id,targetId,f.recordId,f.collection,f.filename,f.key,f.content_type,f.size)
   const importedAt=new Date().toISOString();db.prepare('INSERT INTO dirty_matrix_clones VALUES(?,?,?,?,?,?,?)').run(p.id,p.capturedAt,importedAt,SOURCE,p.records.length,p.files.length,backupPath)
   db.prepare('INSERT INTO team_audit VALUES(?,?,?,?,?)').run(randomUUID(),'owner','clone_matrix_into_dirty',p.id,Date.now())
   db.exec('COMMIT');return {id:p.id,captured_at:p.capturedAt,imported_at:importedAt,source_email:SOURCE,records:p.records.length,files:p.files.length,backupCreated:true}
  }catch(e){db.exec('ROLLBACK');throw e}
 }catch(e){for(const f of newFiles)await store.BUCKET.delete(f.key).catch(()=>{});throw e}
 finally{for(const path of [backupFolder,sealed])if(path)await rm(path,{recursive:true,force:true})}
}
export function matrixCloneApi(store,env,isOwner,fetcher=fetch){
 let busy=false
 return async function(req){const path=new URL(req.url).pathname,remote=path==='/api/lab/manage/clone-matrix',owner=path==='/api/pilot/owner/clone-matrix-to-dirty'
  if(!remote&&!owner)return null
  if(!['GET','POST'].includes(req.method))return json({error:'Método não permitido'},405)
  if(req.method==='POST'&&req.headers.get('origin')!==new URL(req.url).origin)return json({error:'Origem inválida'},403)
  if(remote){if(env.LAB_KIND!=='dirty'||env.APP_ORIGIN!==DEST)return json({error:'Recurso indisponível'},404);const supplied=Buffer.from(req.headers.get('authorization')||''),wanted=Buffer.from('Bearer '+(env.LAB_CONTROL_KEY||''));if(!/^[a-f0-9]{64}$/.test(env.LAB_CONTROL_KEY||'')||supplied.length!==wanted.length||!timingSafeEqual(supplied,wanted))return json({error:'Acesso negado'},403)}
  else if(env.LAB_KIND||!await isOwner(req))return json({error:'Exclusivo do proprietário no aplicativo principal'},403)
  let ownBusy=false
  try{
   if(req.method==='GET'){if(remote){store.raw.exec('CREATE TABLE IF NOT EXISTS dirty_matrix_clones(id TEXT PRIMARY KEY, captured_at TEXT NOT NULL, imported_at TEXT NOT NULL, source_email TEXT NOT NULL, records INTEGER NOT NULL, files INTEGER NOT NULL, backup_path TEXT NOT NULL)');return json({last:store.raw.prepare('SELECT id,captured_at,imported_at,source_email,records,files FROM dirty_matrix_clones ORDER BY imported_at DESC LIMIT 1').get()||null})}return json(clonePreview(store))}
   if(busy)return json({error:'Cópia em andamento. Aguarde.'},409);busy=true;ownBusy=true
   if(remote){const bytes=Buffer.from(await req.arrayBuffer());if(bytes.length>6*1024*1024)fail('Pacote muito grande');const p=JSON.parse(gunzipSync(bytes,{maxOutputLength:128*1024*1024}).toString('utf8'));return json(await importMatrix(store,env,p))}
   const b=await req.json();if(b.confirmation!=='COPIAR PILOTO 01 PARA TESTES SUJOS'||!/^[a-f0-9-]{36}$/.test(b.id))return json({error:'Confirmação da cópia inválida'},400)
   if(env.LAB_DIRTY_ORIGIN!==DEST||!/^[a-f0-9]{64}$/.test(env.LAB_DIRTY_KEY||''))fail('Destino de testes sujos não configurado')
   const p=await captureMatrix(store,b.id),bytes=gzipSync(Buffer.from(JSON.stringify(p)));if(bytes.length>6*1024*1024)fail('Fotos e registros excedem 6 MB comprimidos. Nenhum dado foi substituído.')
   const r=await fetcher(DEST+'/api/lab/manage/clone-matrix',{method:'POST',headers:{origin:DEST,authorization:'Bearer '+env.LAB_DIRTY_KEY,'content-type':'application/octet-stream'},body:bytes,redirect:'error',signal:AbortSignal.timeout(120000)})
   const result=await r.json();if(!r.ok)fail(result.error||'Falha no destino');store.raw.prepare('INSERT INTO team_audit VALUES(?,?,?,?,?)').run(randomUUID(),'owner','export_matrix_into_dirty',b.id,Date.now());return json(result)
  }catch(e){return json({error:e.message||'Falha na cópia'},409)}finally{if(ownBusy)busy=false}
 }
}
