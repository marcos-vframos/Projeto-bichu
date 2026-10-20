import {test} from 'node:test'
import assert from 'node:assert/strict'
import {mkdtemp,rm} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {createApplication} from '../server/index.mjs'
import {openStore} from '../server/storage.mjs'
const cookie=r=>r.headers.get('set-cookie').split(';')[0]
test('employee completion is recorded atomically with author, result, status and immutable history',async()=>{
 const folder=await mkdtemp(join(tmpdir(),'bichu-audit-'));let app
 try{
 const key='d'.repeat(64),env={PILOT_PANEL_KEY:key,COOKIE_SECURE:false};app=createApplication({store:openStore(folder),env})
 const call=(path,method='GET',body,auth)=>app.dispatch(new Request('https://test.local'+path,{method,headers:{origin:'https://test.local',...(auth?{cookie:auth}:{}),...(body?{'content-type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})}))
 const owner=cookie(await call('/api/pilot/owner/unlock','POST',{token:key})),credentials={name:'Nome original',email:'colaborador@teste.local',password:'individual-teste-123'}
 const user=(await(await call('/api/team/users','POST',credentials,owner)).json()).id,auth=cookie(await call('/api/team/login','POST',credentials))
 const task=(await(await call('/api/team/tasks','POST',{title:'Conferir cadastro',details:'Verificar contato',userId:user},owner)).json()).id
 assert.equal((await call('/api/team/tasks/'+task,'PATCH',{status:'em_andamento',note:'Contato em verificação'},auth)).status,200)
 assert.equal((await call('/api/team/tasks/'+task,'PATCH',{status:'concluida',note:'Contato verificado e resultado confirmado'},auth)).status,200)
 assert.equal((await call('/api/team/audit')).status,401);assert.equal((await call('/api/team/audit','GET',null,auth)).status,403)
 let rows=await(await call('/api/team/audit?completed=1&actor='+user,'GET',null,owner)).json();assert.equal(rows.length,1)
 const event=rows[0];assert.equal(event.actor_id,user);assert.equal(event.record_id,task);assert.equal(event.details.actorName,'Nome original');assert.equal(event.details.title,'Conferir cadastro');assert.equal(event.details.fromStatus,'em_andamento');assert.equal(event.details.toStatus,'concluida');assert.equal(event.details.note,'Contato verificado e resultado confirmado');assert.ok(event.created_at>0)
 // Subsequent changes and renaming must not rewrite what happened on completion.
 app.store.raw.prepare('UPDATE team_users SET name=? WHERE id=?').run('Nome alterado',user)
 await call('/api/team/tasks/'+task,'PATCH',{note:'Observação posterior'},auth)
 rows=await(await call('/api/team/audit?completed=1','GET',null,owner)).json();assert.equal(rows.length,1);assert.equal(rows[0].details.actorName,'Nome original');assert.equal(rows[0].details.note,event.details.note)
 // Legacy events remain visible without inventing snapshots.
 app.store.raw.prepare('INSERT INTO team_audit VALUES(?,?,?,?,?)').run(crypto.randomUUID(),user,'update_task',task,Date.now())
 assert.ok((await(await call('/api/team/audit','GET',null,owner)).json()).some(row=>row.details===null))
 // Failure to persist the audit must roll back the change to the task.
 app.store.raw.exec("CREATE TRIGGER reject_audit BEFORE INSERT ON team_audit_details BEGIN SELECT RAISE(ABORT,'simulated audit failure'); END;")
 await assert.rejects(()=>call('/api/team/tasks/'+task,'PATCH',{status:'pendente',note:'Não deve salvar'},auth))
 assert.equal(app.store.raw.prepare('SELECT status FROM team_tasks WHERE id=?').get(task).status,'concluida');app.store.raw.exec('DROP TRIGGER reject_audit')
 assert.equal((await call('/api/team/audit?offset=-1','GET',null,owner)).status,400)
 for(const route of ['/painel/registros','/team-ui/audit-view.js','/team-ui/audit-page.js'])assert.equal((await call(route)).status,200)
 app.store.close();app=createApplication({store:openStore(folder),env});rows=await(await call('/api/team/audit?completed=1','GET',null,owner)).json();assert.equal(rows[0].id,event.id);assert.equal(rows[0].details.note,event.details.note)
 }finally{app?.store.close();await rm(folder,{recursive:true,force:true})}
})
