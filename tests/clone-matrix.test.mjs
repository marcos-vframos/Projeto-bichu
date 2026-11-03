import test from 'node:test'
import assert from 'node:assert/strict'
import {mkdtemp,rm,readdir} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {existsSync,statSync} from 'node:fs'
import {gzipSync} from 'node:zlib'
import {randomUUID} from 'node:crypto'
import {openStore} from '../server/storage.mjs'
import {captureMatrix,importMatrix,matrixCloneApi} from '../server/clone-matrix.mjs'
import {unpack} from '../server/recovery.mjs'
const origin='https://bichu-testes-sujos-production.up.railway.app',key='b'.repeat(64)
async function setup(t,volumeRoot){const dir=await mkdtemp(join(tmpdir(),'bichu-clone-test-')),targetDirectory=volumeRoot?await mkdtemp(join(volumeRoot,'bichu-clone-volume-')):join(dir,'target'),source=openStore(join(dir,'source')),target=openStore(targetDirectory)
 t.after(async()=>{source.close();target.close();await rm(dir,{recursive:true,force:true});if(volumeRoot)await rm(targetDirectory,{recursive:true,force:true})})
 for(const store of [source,target])store.raw.exec('CREATE TABLE team_audit(id TEXT PRIMARY KEY,actor TEXT,action TEXT,target TEXT,created_at INTEGER);CREATE TABLE lab_accounts(slot TEXT PRIMARY KEY,account_id TEXT,active INTEGER)')
 const sid=randomUUID(),tid=randomUUID(),other=randomUUID(),dog=randomUUID(),weight=randomUUID(),photo=randomUUID()+'.png'
 for(const [store,id,email] of [[source,sid,'piloto01@meubichu.test'],[source,other,'outra@teste.invalid'],[target,tid,'dirty@dirty.meubichu.invalid']])store.raw.prepare("INSERT INTO pilot_accounts(id,email,password_salt,password_hash,created_at,expires_at,account_kind) VALUES(?,?,?,?,?,?,'internal')").run(id,email,'salt-'+id,'hash-'+id,1,253402300799000)
 target.raw.prepare("INSERT INTO lab_accounts VALUES('dirty',?,1)").run(tid)
 const insert=(store,id,aid,col,did,data)=>store.raw.prepare('INSERT INTO pilot_records(id,account_id,collection,dog_id,data,created_at,updated_at) VALUES(?,?,?,?,?,?,?)').run(id,aid,col,did,JSON.stringify(data),'2026-10-01T12:00:00.000Z','2026-10-02T12:00:00.000Z')
 insert(source,dog,sid,'dogs',null,{name:'Maze',species:'dog',avatar:photo,weight_kg:28});insert(source,weight,sid,'weight_logs',dog,{dog,weight_kg:28,date:'2026-10-02'});insert(source,randomUUID(),sid,'account_preferences',null,{active_pet:dog,bichu_tutor_name:'Marcos',bichu_accent:'green'});insert(source,randomUUID(),sid,'meal_confirmations',dog,{dog,day:'2026-10-02',slot:0,meal:{label:'Manhã',time:'08:00',grams:100},completed:true});insert(source,randomUUID(),other,'dogs',null,{name:'NÃO COPIAR'});insert(target,randomUUID(),tid,'dogs',null,{name:'Antes da cópia'})
 const objectKey=sid+'/'+dog+'/'+photo,bytes=Buffer.from('fixture-photo-bytes');await source.BUCKET.put(objectKey,bytes);source.raw.prepare('INSERT INTO pilot_files VALUES(?,?,?,?,?,?,?,?)').run(randomUUID(),sid,dog,'dogs',photo,objectKey,'image/png',bytes.length)
 source.raw.prepare('INSERT INTO pilot_sessions VALUES(?,?,?)').run('real-session',sid,Date.now()+60000)
 return {source,target,dir,sid,tid,dog,weight,env:{LAB_KIND:'dirty',APP_ORIGIN:origin,LAB_CONTROL_KEY:key,DATA_DIR:targetDirectory}}
}
test('copia somente Piloto 01, preserva datas/fotos, remapeia vínculos e não copia credenciais; backup restaura',async t=>{const x=await setup(t),prior=x.source.raw.prepare('SELECT * FROM pilot_records ORDER BY id').all(),p=await captureMatrix(x.source,randomUUID()),r=await importMatrix(x.target,x.env,p)
 assert.equal(r.records,4);assert.equal(r.files,1);assert.equal(r.backupCreated,true)
 const rows=x.target.raw.prepare('SELECT * FROM pilot_records').all(),dog=rows.find(r=>r.collection==='dogs'),weight=rows.find(r=>r.collection==='weight_logs');assert.equal(rows.length,4);assert.equal(JSON.parse(dog.data).name,'Maze');assert.notEqual(dog.id,x.dog);assert.equal(dog.account_id,x.tid);assert.equal(weight.dog_id,dog.id);assert.equal(JSON.parse(weight.data).dog,dog.id);const confirmed=rows.find(r=>r.collection==='meal_confirmations');const d=JSON.parse(confirmed.data);assert.equal(confirmed.id,(await import('node:crypto')).createHash('sha256').update(JSON.stringify([x.tid,dog.id,d.day,d.slot,d.meal])).digest('hex'));assert.equal(weight.created_at,'2026-10-01T12:00:00.000Z');assert.equal(x.target.raw.prepare('SELECT COUNT(*) n FROM pilot_sessions').get().n,0);assert.equal(x.target.raw.prepare('SELECT password_hash FROM pilot_accounts WHERE id=?').get(x.tid).password_hash,'hash-'+x.tid)
 const f=x.target.raw.prepare('SELECT * FROM pilot_files').get();assert.equal(f.filename,JSON.parse(dog.data).avatar);assert.deepEqual(Buffer.from((await x.target.BUCKET.get(f.object_key)).body),Buffer.from('fixture-photo-bytes'));assert.deepEqual(x.source.raw.prepare('SELECT * FROM pilot_records ORDER BY id').all(),prior)
 const backup=x.target.raw.prepare('SELECT backup_path FROM dirty_matrix_clones').get().backup_path,restore=join(x.dir,'restore');const verified=await unpack(backup,key,restore);assert.ok(verified.tables.pilot_records);const restored=openStore(restore);assert.equal(JSON.parse(restored.raw.prepare("SELECT data FROM pilot_records WHERE collection='dogs'").get().data).name,'Antes da cópia');restored.close()
 const again=await importMatrix(x.target,x.env,p);assert.equal(again.alreadyImported,true);assert.equal(x.target.raw.prepare('SELECT COUNT(*) n FROM pilot_records').get().n,4)
 x.target.raw.prepare('UPDATE pilot_records SET data=? WHERE id=?').run(JSON.stringify({name:'Só laboratório'}),dog.id);assert.equal(JSON.parse(x.source.raw.prepare('SELECT data FROM pilot_records WHERE id=?').get(x.dog).data).name,'Maze')
})
test('recusa conta estrangeira, arquivo corrompido e ambiente errado sem substituir o destino',async t=>{const x=await setup(t),p=await captureMatrix(x.source,randomUUID()),before=x.target.raw.prepare('SELECT * FROM pilot_records').all();for(const modify of [q=>q.records[0].account_id='outra',q=>q.files[0].sha256='0'.repeat(64),q=>q.records.push({...q.records[0]})]){const q=structuredClone(p);modify(q);await assert.rejects(importMatrix(x.target,x.env,q));assert.deepEqual(x.target.raw.prepare('SELECT * FROM pilot_records').all(),before)}await assert.rejects(importMatrix(x.target,{...x.env,LAB_KIND:'matrix'},p));assert.deepEqual(x.target.raw.prepare('SELECT * FROM pilot_records').all(),before)})
test('rotas exigem sessão proprietária, origem correta e chave exclusiva; não expõem segredos',async t=>{const x=await setup(t),local=matrixCloneApi(x.target,x.env,async()=>false),main=matrixCloneApi(x.source,{LAB_DIRTY_ORIGIN:origin,LAB_DIRTY_KEY:key},async()=>false)
 assert.equal((await main(new Request('https://principal/api/pilot/owner/clone-matrix-to-dirty'))).status,403)
 assert.equal((await local(new Request(origin+'/api/lab/manage/clone-matrix'))).status,403)
 const p=await captureMatrix(x.source,randomUUID());const req=new Request(origin+'/api/lab/manage/clone-matrix',{method:'POST',headers:{origin,authorization:'Bearer '+key},body:gzipSync(Buffer.from(JSON.stringify(p)))});const res=await local(req);assert.equal(res.status,200);const text=await res.text();assert.ok(!text.includes('password'));assert.ok(!text.includes('backup_path'));assert.ok(!text.includes(key))
 const wrong=new Request(origin+'/api/lab/manage/clone-matrix',{method:'POST',headers:{origin:'https://outro',authorization:'Bearer '+key},body:'x'});assert.equal((await local(wrong)).status,403)
})


test('backup entre volumes distintos usa cópia e permite importação com restauração verificável',async t=>{
 if(!existsSync('/dev/shm')||statSync('/dev/shm').dev===statSync(tmpdir()).dev){t.skip('Dois volumes não disponíveis');return}
 const x=await setup(t,'/dev/shm'),p=await captureMatrix(x.source,randomUUID()),result=await importMatrix(x.target,x.env,p)
 assert.equal(result.backupCreated,true);assert.equal(result.records,4)
 const path=x.target.raw.prepare('SELECT backup_path FROM dirty_matrix_clones').get().backup_path
 assert.ok(path.startsWith('/dev/shm/'));assert.ok(existsSync(path));assert.ok(!existsSync(path+'.tmp'))
 const checked=await unpack(path,key,join(x.dir,'restore-volume'));assert.equal(checked.tables.pilot_records,1)
})
