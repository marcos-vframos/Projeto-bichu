import {test} from 'node:test'
import assert from 'node:assert/strict'
import {mkdtemp,rm} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {createApplication} from '../server/index.mjs'
import {openStore} from '../server/storage.mjs'
import {duties} from '../team/duties.js'
const cookie=r=>r.headers.get('set-cookie').split(';')[0]
test('five employee duties: per-area isolation, own creation, content approval, revocation and persistence',async()=>{
 const folder=await mkdtemp(join(tmpdir(),'bichu-duties-'));let app
 try{
 const key='e'.repeat(64),env={PILOT_PANEL_KEY:key,COOKIE_SECURE:false};app=createApplication({store:openStore(folder),env})
 const call=(path,method='GET',body,auth)=>app.dispatch(new Request('https://test.local'+path,{method,headers:{origin:'https://test.local',...(auth?{cookie:auth}:{}),...(body?{'content-type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})}))
 const owner=cookie(await call('/api/pilot/owner/unlock','POST',{token:key}));const credentials={name:'Colaborador de teste',email:'teste@funcionario.local',password:'somente-teste-123456'}
 const created=await call('/api/team/users','POST',credentials,owner);const{id}=await created.json();const auth=cookie(await call('/api/team/login','POST',credentials))
 const grant=permissions=>call('/api/team/users/'+id+'/permissions','PUT',{permissions},owner)
 assert.equal((await grant(['duty.suporte'])).status,200)
 assert.equal((await call('/api/team/tasks?category=falhas','GET',null,auth)).status,403)
 assert.equal((await call('/api/team/tasks?category=all','GET',null,auth)).status,403)
 assert.equal((await call('/api/team/tasks','GET',null,auth)).status,403)
 assert.equal((await call('/api/team/tasks','POST',{category:'falhas',title:'Sem acesso',details:''},auth)).status,403)
 let taskIds=[]
 for(const [category,duty]of Object.entries(duties)){
  await grant(['duty.'+category])
  const context=Object.fromEntries(duty.fields.map(field=>[field,'Informação de teste']))
  const made=await call('/api/team/tasks','POST',{category,title:duty.name,details:'Atividade de teste',context,priority:'alta'},auth);assert.equal(made.status,201);const taskId=(await made.json()).id;taskIds.push(taskId)
  const rows=await(await call('/api/team/tasks?category='+category,'GET',null,auth)).json();assert.equal(rows.items.length,1);assert.equal(rows.items[0].user_id,id);assert.deepEqual(JSON.parse(rows.items[0].context),context)
  assert.equal((await call('/api/team/tasks/'+taskId,'PATCH',{status:'em_andamento',note:'Conferido'},auth)).status,200)
  if(category==='conteudo'){
   assert.equal((await call('/api/team/tasks/'+taskId,'PATCH',{status:'concluida'},auth)).status,403)
   assert.equal((await call('/api/team/tasks/'+taskId,'PATCH',{status:'aprovada'},auth)).status,403)
   assert.equal((await call('/api/team/tasks/'+taskId,'PATCH',{status:'aguardando_aprovacao'},auth)).status,200)
   assert.equal((await call('/api/team/tasks/'+taskId,'PATCH',{status:'aprovada'},owner)).status,200)
  }else assert.equal((await call('/api/team/tasks/'+taskId,'PATCH',{status:'concluida'},auth)).status,200)
 }
 const all=await(await call('/api/team/tasks','GET',null,owner)).json();assert.equal(all.items.length,5)
 await grant(['tasks.read','tasks.update'])
 assert.equal((await(await call('/api/team/tasks','GET',null,auth)).json()).items.length,0)
 assert.equal((await call('/api/team/tasks/'+taskIds[0],'PATCH',{note:'Tentativa de contornar permissão'},auth)).status,403)
 await grant(['duty.suporte'])
 assert.equal((await call('/api/team/tasks','POST',{category:'suporte',title:'Transferir',details:'',userId:'outra-pessoa'},auth)).status,403)
 assert.equal((await call('/api/team/tasks','POST',{category:'suporte',title:'Inválido',details:'',context:{campo_inexistente:'teste'}},auth)).status,400)
 for(const route of ['/team-ui/duties.js','/team-ui/activity-form.js'])assert.equal((await call(route)).status,200)
 const audit=await(await call('/api/team/audit','GET',null,owner)).json();assert.ok(audit.some(row=>row.actor_id===id&&row.action==='create_task'))
 app.store.close();app=createApplication({store:openStore(folder),env});assert.equal(app.store.raw.prepare('SELECT COUNT(*) AS n FROM team_tasks').get().n,5);assert.equal(app.store.raw.prepare("SELECT status FROM team_tasks WHERE category='conteudo'").get().status,'aprovada')
 }finally{app?.store.close();await rm(folder,{recursive:true,force:true})}
})
