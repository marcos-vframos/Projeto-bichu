import {test} from 'node:test'
import assert from 'node:assert/strict'
import {mkdtemp,rm} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {createApplication} from '../server/index.mjs'
import {openStore} from '../server/storage.mjs'
const cookie=r=>r.headers.get('set-cookie').split(';')[0]
test('owner resolution: immutable reporter, urgency order, separate employee access, history and approval',async()=>{
 const folder=await mkdtemp(join(tmpdir(),'bichu-issues-'));let app
 try{
 const key='f'.repeat(64),env={PILOT_PANEL_KEY:key,COOKIE_SECURE:false};app=createApplication({store:openStore(folder),env})
 const call=(path,method='GET',body,auth)=>app.dispatch(new Request('https://test.local'+path,{method,headers:{origin:'https://test.local',...(auth?{cookie:auth}:{}),...(body?{'content-type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})}))
 const owner=cookie(await call('/api/pilot/owner/unlock','POST',{token:key}))
 async function employee(n){const data={name:'Funcionário '+n,email:`pessoa${n}@teste.local`,password:'individual-teste-123'};const{id}=await(await call('/api/team/users','POST',data,owner)).json();return{id,auth:cookie(await call('/api/team/login','POST',data))}}
 const first=await employee(1),second=await employee(2)
 async function task(userId,category='geral'){const response=await call('/api/team/tasks','POST',{title:'Conferência',details:'Verificar dados',userId,category},owner);assert.equal(response.status,201);return(await response.json()).id}
 const a=await task(first.id),b=await task(first.id),c=await task(second.id)
 const signal=(sourceId,priority='normal')=>({sourceType:'task',sourceId,summary:'Preciso de decisão do proprietário',priority})
 assert.equal((await call('/api/team/issues')).status,401)
 assert.equal((await call('/api/team/issues/reporters','GET',null,first.auth)).status,403)
 assert.equal((await call('/api/team/issues','POST',signal(a),owner)).status,403)
 assert.equal((await call('/api/team/issues','POST',{...signal(a),reporter_id:second.id},first.auth)).status,400)
 assert.equal((await call('/api/team/issues','POST',signal(c),first.auth)).status,404)
 const id=(await(await call('/api/team/issues','POST',signal(a),first.auth)).json()).id
 const urgent=(await(await call('/api/team/issues','POST',signal(b,'critica'),first.auth)).json()).id
 const other=(await(await call('/api/team/issues','POST',signal(c,'alta'),second.auth)).json()).id
 assert.equal((await call('/api/team/issues','POST',signal(a),first.auth)).status,409)
 assert.equal((await call('/api/team/issues/'+id,'GET',null,second.auth)).status,404)
 assert.equal((await call('/api/team/issues?reporter='+first.id,'GET',null,second.auth)).status,403)
 const queue=await(await call('/api/team/issues?reporter='+first.id,'GET',null,owner)).json();assert.deepEqual(queue.items.map(x=>x.id),[urgent,id])
 await call('/api/team/tasks/'+a,'PATCH',{userId:second.id},owner)
 const unchanged=await(await call('/api/team/issues/'+id,'GET',null,owner)).json();assert.equal(unchanged.reporter_id,first.id)
 assert.equal((await call('/api/team/issues/'+id,'GET',null,first.auth)).status,200)
 assert.equal((await call('/api/team/issues/'+id,'PATCH',{action:'solucionar',message:'Não posso resolver'},first.auth)).status,403)
 assert.equal((await call('/api/team/issues/'+id,'PATCH',{action:'solucionar',message:'Decisão e solução registradas'},owner)).status,200)
 let own=await(await call('/api/team/issues/'+id,'GET',null,first.auth)).json();assert.equal(own.status,'resolvida');assert.equal(own.updates.at(-1).message,'Decisão e solução registradas')
 assert.equal((await call('/api/team/issues/'+id,'PATCH',{action:'reabrir',message:'Ainda ocorre'},first.auth)).status,200)
 assert.equal((await call('/api/team/issues/'+id,'PATCH',{action:'solicitar',message:'Qual versão do aparelho?'},owner)).status,200)
 assert.equal((await call('/api/team/issues/'+id,'PATCH',{action:'mensagem',message:'Versão informada'},first.auth)).status,200)
 own=await(await call('/api/team/issues/'+id,'GET',null,owner)).json();assert.equal(own.status,'aberta')
 const content=await task(first.id,'conteudo');await call('/api/team/tasks/'+content,'PATCH',{status:'aguardando_aprovacao'},first.auth)
 const review=(await(await call('/api/team/issues','POST',signal(content),first.auth)).json()).id
 assert.equal((await call('/api/team/issues/'+review,'PATCH',{action:'aprovar_conteudo',message:'Fontes e correção aprovadas'},owner)).status,200)
 assert.equal(app.store.raw.prepare('SELECT status FROM team_tasks WHERE id=?').get(content).status,'aprovada')
 const reporters=await(await call('/api/team/issues/reporters','GET',null,owner)).json();assert.equal(reporters.find(x=>x.id===first.id).pending,2);assert.equal(reporters.find(x=>x.id===second.id).total,1)
 await call('/api/team/users/'+first.id+'/revoke','POST',{},owner)
 assert.equal((await call('/api/team/issues/'+id,'GET',null,owner)).status,200)
 app.store.close();app=createApplication({store:openStore(folder),env});assert.equal(app.store.raw.prepare('SELECT reporter_id FROM team_issues WHERE id=?').get(id).reporter_id,first.id)
 for(const path of ['/painel/pendencias','/team-ui/issues.js','/team-ui/issue-client.js'])assert.equal((await call(path)).status,200)
 }finally{app?.store.close();await rm(folder,{recursive:true,force:true})}
})
