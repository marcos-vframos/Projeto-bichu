import {test} from 'node:test'
import assert from 'node:assert/strict'
import {mkdtemp,rm} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {createApplication} from '../server/index.mjs'
import {openStore} from '../server/storage.mjs'
import {workToday} from '../server/tasks.mjs'
const cookie=r=>r.headers.get('set-cookie').split(';')[0]
test('community board: nine cards, scoped assignment, transfer, badges, date and confidential details',async()=>{
 const folder=await mkdtemp(join(tmpdir(),'bichu-board-'));let app
 try{
 const key='a'.repeat(64),env={PILOT_PANEL_KEY:key,COOKIE_SECURE:false};app=createApplication({store:openStore(folder),env})
 const call=(path,method='GET',body,auth)=>app.dispatch(new Request('https://test.local'+path,{method,headers:{origin:'https://test.local',...(auth?{cookie:auth}:{}),...(body?{'content-type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})}))
 const owner=cookie(await call('/api/pilot/owner/unlock','POST',{token:key}))
 async function employee(n){const data={name:'Pessoa '+n,email:`pessoa${n}@equipe.local`,password:'individual-teste-123'};const{id}=await(await call('/api/team/users','POST',data,owner)).json();await call('/api/team/users/'+id+'/permissions','PUT',{permissions:[]},owner);return{id,auth:cookie(await call('/api/team/login','POST',data))}}
 const first=await employee(1),second=await employee(2)
 async function create(n,extra={}){const r=await call('/api/team/tasks','POST',{title:'Título privado '+n,boardTitle:'Demanda compartilhada '+n,details:'Informação confidencial',category:'suporte',context:{'Dúvida recebida':'Conteúdo privado'},userId:first.id,badgeColor:'#ffcc00',workDate:workToday(),...extra},owner);assert.equal(r.status,201);return(await r.json()).id}
 const ids=[];for(let n=0;n<20;n++)ids.push(await create(n))
 const future=await create('futura',{workDate:'2099-12-31'}),past=await create('atrasada',{workDate:'2020-01-01',dueDate:'2020-01-02',priority:'alta'})
 assert.equal((await call('/api/team/tasks/board')).status,401)
 const board=await(await call('/api/team/tasks/board','GET',null,second.auth)).json();assert.equal(board.items.length,9);assert.equal(board.nextPage,1);assert.equal(board.items[0].id,past);assert.equal(board.items[0].responsible_name,'Pessoa 1');assert.equal(board.items[0].badge_color,'#ffcc00');assert.equal(board.items[0].canExecute,false)
 for(const row of board.items){assert.equal(row.details,undefined);assert.equal(row.context,undefined);assert.ok(row.title.startsWith('Demanda compartilhada'))}
 assert.equal((await call('/api/team/tasks/'+ids[0],'GET',null,second.auth)).status,404)
 assert.equal((await call('/api/team/tasks/'+ids[0],'PATCH',{status:'concluida'},second.auth)).status,404)
 const detail=await call('/api/team/tasks/'+ids[0],'GET',null,first.auth);assert.equal(detail.status,200);assert.equal((await detail.json()).details,'Informação confidencial')
 const categories=(await(await call('/api/team/me','GET',null,first.auth)).json()).assignedCategories;assert.ok(categories.includes('suporte'))
 assert.equal((await call('/api/team/tasks?category=suporte','GET',null,first.auth)).status,200)
 assert.equal((await call('/api/team/tasks','POST',{category:'suporte',title:'Escalar privilégio',details:''},first.auth)).status,403)
 assert.equal((await call('/api/team/tasks/'+ids[0],'PATCH',{status:'em_andamento',note:'Iniciada'},first.auth)).status,200)
 const signals=await call('/api/team/issues','POST',{sourceType:'task',sourceId:ids[0],summary:'Necessito de aprovação',priority:'normal'},first.auth);assert.equal(signals.status,201)
 assert.equal((await call('/api/team/tasks/'+ids[0],'PATCH',{userId:second.id,badgeColor:'#123456',boardTitle:'Responsabilidade transferida'},owner)).status,200)
 assert.equal((await call('/api/team/tasks/'+ids[0],'GET',null,first.auth)).status,404)
 assert.equal((await call('/api/team/tasks/'+ids[0],'PATCH',{status:'concluida'},first.auth)).status,404)
 assert.equal((await call('/api/team/tasks/'+ids[0],'GET',null,second.auth)).status,200)
 assert.equal((await call('/api/team/tasks/'+ids[0],'PATCH',{status:'concluida'},second.auth)).status,200)
 const all=await(await call('/api/team/tasks/board?scope=all','GET',null,first.auth)).json();assert.equal(all.items.length,9)
 let collected=[],page=0;do{const data=await(await call('/api/team/tasks/board?page='+page,'GET',null,first.auth)).json();collected.push(...data.items);page=data.nextPage}while(page!==null)
 assert.equal(collected.length,20);assert.equal(new Set(collected.map(x=>x.id)).size,20);assert.ok(!collected.some(x=>x.id===future||x.id===ids[0]))
 assert.equal((await call('/api/team/tasks/board?page=-1','GET',null,first.auth)).status,400)
 assert.equal((await call('/api/team/tasks/'+ids[1],'PATCH',{badgeColor:'red;display:none'},owner)).status,400)
 const html=await(await call('/equipe')).text();assert.match(html,/Quadro da equipe/);assert.match(html,/board-sentinel/)
 assert.equal((await call('/team-ui/task-board.js')).status,200)
 app.store.close();app=createApplication({store:openStore(folder),env});assert.equal(app.store.raw.prepare('SELECT user_id,scoped_access FROM team_tasks WHERE id=?').get(ids[0]).user_id,second.id)
 }finally{app?.store.close();await rm(folder,{recursive:true,force:true})}
})
