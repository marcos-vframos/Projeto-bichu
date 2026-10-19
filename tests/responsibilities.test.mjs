import {test} from 'node:test'
import assert from 'node:assert/strict'
import {mkdtemp,rm} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {createApplication} from '../server/index.mjs'
import {openStore} from '../server/storage.mjs'
const cookie=response=>response.headers.get('set-cookie').split(';')[0]
test('responsibilities: employee buttons separate from administration, assigned tasks, updates and revocation',async()=>{
 const folder=await mkdtemp(join(tmpdir(),'mb-responsibilities-'));let app
 try{
 const key='b'.repeat(64);app=createApplication({store:openStore(folder),env:{PILOT_PANEL_KEY:key,COOKIE_SECURE:false,PILOT_PANEL_ORIGIN:''}})
 const call=(path,method='GET',body,auth)=>app.dispatch(new Request('https://test.local'+path,{method,headers:{origin:'https://test.local',...(auth?{cookie:auth}:{}),...(body?{'content-type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})}))
 const owner=cookie(await call('/api/pilot/owner/unlock','POST',{token:key}))
 const employee=async(number)=>{const credentials={name:'Pessoa '+number,email:`pessoa${number}@test.local`,password:'somente-para-o-teste-123'};const response=await call('/api/team/users','POST',credentials,owner);assert.equal(response.status,201);const{id}=await response.json();return{id,auth:cookie(await call('/api/team/login','POST',credentials))}}
 const first=await employee(1),second=await employee(2)
 const create=await call('/api/team/tasks','POST',{title:'Conferir solicitação',details:'Entrar em contato e registrar o resultado.',userId:first.id,priority:'alta',dueDate:'2026-10-22'},owner);assert.equal(create.status,201);const task=(await create.json()).id
 assert.equal((await call('/api/team/tasks','POST',{title:'Não pode',details:''},first.auth)).status,403)
 assert.equal((await call('/api/team/tasks')).status,401)
 assert.equal((await(await call('/api/team/tasks','GET',null,first.auth)).json()).items.length,1)
 assert.equal((await(await call('/api/team/tasks','GET',null,second.auth)).json()).items.length,0)
 assert.equal((await call(`/api/team/tasks?assignee=${first.id}`,'GET',null,second.auth)).status,403)
 assert.equal((await call('/api/team/tasks/'+task,'PATCH',{status:'concluida'},second.auth)).status,404)
 assert.equal((await call('/api/team/tasks/'+task,'PATCH',{userId:second.id},first.auth)).status,400)
 assert.equal((await call('/api/team/tasks/'+task,'PATCH',{status:'em_andamento',note:'Conversa iniciada'},first.auth)).status,200)
 assert.equal((await call('/api/team/tasks/'+task,'PATCH',{status:'concluida',note:'Resultado registrado'},first.auth)).status,200)
 let rows=await(await call('/api/team/tasks','GET',null,owner)).json();assert.equal(rows.items[0].status,'concluida');assert.equal(rows.items[0].note,'Resultado registrado')
 assert.equal((await call('/api/team/tasks','POST',{title:'Prazo inválido',details:'',dueDate:'2026-02-31'},owner)).status,400)
 const now=Date.now(),iso=new Date().toISOString(),recordId=crypto.randomUUID();app.store.raw.prepare('INSERT INTO pilot_accounts VALUES(?,?,?,?,?,?,?)').run('account','conta@test.local','salt','hash',now,now,now)
 app.store.raw.prepare("INSERT INTO pilot_records VALUES(?,?,'pilot_feedback',NULL,?,?,?)").run(recordId,'account',JSON.stringify({message:'Minha pergunta',category:'sugestao'}),iso,iso)
 assert.equal((await call(`/api/team/cases/${recordId}/assign`,'POST',{userId:first.id},owner)).status,200)
 assert.equal((await(await call('/api/team/cases?assignee='+second.id,'GET',null,owner)).json()).items.length,0)
 assert.equal((await(await call('/api/team/cases?assignee='+first.id,'GET',null,owner)).json()).items.length,1)
 assert.equal((await call('/api/team/cases?assignee='+first.id,'GET',null,second.auth)).status,403)


 const evaluation={status:'em_avaliacao',priority:'alta',note:'Observação interna de teste'}
 assert.equal((await call(`/api/team/cases/${recordId}/review`,'POST',evaluation,second.auth)).status,404)
 assert.equal((await call(`/api/team/cases/${recordId}/review`,'POST',evaluation,first.auth)).status,200)
 let reviewed=await(await call('/api/team/cases','GET',null,first.auth)).json();assert.equal(reviewed.items[0].review.note,evaluation.note);assert.equal(reviewed.items[0].status,'em_avaliacao')
 const publicRecord=JSON.parse(app.store.raw.prepare('SELECT data FROM pilot_records WHERE id=?').get(recordId).data);assert.equal(publicRecord.note,undefined);assert.equal(publicRecord.priority,undefined)
 assert.equal((await call(`/api/team/cases/${recordId}/review`,'POST',{...evaluation,status:'respondido'},first.auth)).status,400)
 assert.equal((await call('/api/team/users/'+first.id+'/permissions','PUT',{permissions:['tasks.read']},owner)).status,200)
 assert.equal((await call('/api/team/cases','GET',null,first.auth)).status,403)
 assert.equal((await call(`/api/team/cases/${recordId}/review`,'POST',evaluation,first.auth)).status,403)
 assert.equal((await call('/api/team/tasks/'+task,'PATCH',{status:'pendente'},first.auth)).status,403)
 assert.equal((await call('/api/team/tasks','GET',null,first.auth)).status,200)
 assert.deepEqual((await(await call('/api/team/me?assignee='+first.id,'GET',null,owner)).json()).permissions,['tasks.read'])
 assert.equal((await call('/api/team/users/'+first.id+'/permissions','PUT',{permissions:['tasks.update']},owner)).status,400)
 assert.equal((await call('/api/team/users/'+second.id+'/permissions','PUT',{permissions:[]},first.auth)).status,403)
 const staffHtml=await(await call('/equipe')).text(),adminHtml=await(await call('/painel/equipe')).text()
 assert.match(staffHtml,/Minhas responsabilidades/);assert.match(staffHtml,/staff-login/);assert.doesNotMatch(staffHtml,/create-person|Voltar ao painel|Abrir app do tutor/)
 assert.match(adminHtml,/create-person/);assert.match(adminHtml,/create-task/)
 for(const route of ['/team-ui/shared.js','/team-ui/staff.js','/team-ui/admin.js','/team-ui/style.css'])assert.equal((await call(route)).status,200)
 assert.equal((await call('/api/team/users/'+first.id+'/revoke','POST',{},owner)).status,200)
 rows=await(await call('/api/team/tasks','GET',null,owner)).json();assert.equal(rows.items[0].user_id,null)
 assert.equal((await call('/api/team/tasks','GET',null,first.auth)).status,401)
 assert.equal((await call('/api/team/tasks/'+task,'PATCH',{status:'pendente'},first.auth)).status,401)
 const audit=await(await call('/api/team/audit','GET',null,owner)).json();assert.ok(audit.some(row=>row.action==='update_task'&&row.actor_id===first.id))
 app.store.close();app=createApplication({store:openStore(folder),env:{PILOT_PANEL_KEY:key}});assert.equal(app.store.raw.prepare('SELECT note FROM team_tasks WHERE id=?').get(task).note,'Resultado registrado')
 }finally{app?.store.close();await rm(folder,{recursive:true,force:true})}
})
