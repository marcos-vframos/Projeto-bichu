import {test} from 'node:test'
import assert from 'node:assert/strict'
import {mkdtemp,rm,readFile} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {createApplication} from '../server/index.mjs'
import {openStore} from '../server/storage.mjs'
const key='b'.repeat(64)
function request(app,path,method='GET',body,cookie,extra={}){return app.dispatch(new Request('https://meubichu.test'+path,{method,headers:{origin:'https://meubichu.test',...(body?{'content-type':'application/json'}:{}),...(cookie?{cookie}:{}),...extra},...(body?{body:JSON.stringify(body)}:{})}))}
const cookie=r=>r.headers.get('set-cookie').split(';')[0]
test('independent runtime: employee isolation, owner assignment, tutor receives reply, revocation and persistent restart',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'mb-independent-'));let app
 try{
 app=createApplication({store:openStore(dir),env:{PILOT_PANEL_KEY:key,PILOT_ADMIN_KEY:'test-admin',PILOT_PANEL_ORIGIN:'',COOKIE_SECURE:false}})
 const auth=[{email:'piloto01@meubichu.test',password:'a'.repeat(48)},{email:'piloto02@meubichu.test',password:'c'.repeat(48)}]
 // Provisioner requires exactly ten invite accounts.
 const ten=[...auth,...Array.from({length:8},(_,i)=>({email:`piloto${String(i+3).padStart(2,"0")}@meubichu.test`,password:'d'.repeat(47)+i}))]
 assert.equal((await request(app,'/api/pilot/admin/provision','POST',ten,null,{authorization:'Bearer test-admin'})).status,201)
 const tutor=cookie(await request(app,'/api/pilot/login','POST',auth[0]));const other=cookie(await request(app,'/api/pilot/login','POST',auth[1]))
 const f=await request(app,'/api/pilot/records/pilot_feedback','POST',{message:'Preciso de ajuda com a rotina.',category:'dificuldade'},tutor);assert.equal(f.status,201);const id=(await f.json()).id
 const secret=await request(app,'/api/pilot/records/dogs','POST',{name:'Informação privada',weight_kg:12},tutor);assert.equal(secret.status,201)
 assert.equal((await request(app,'/api/team/cases')).status,401)
 assert.equal((await request(app,'/api/pilot/owner/dashboard','GET',null,null,{'oai-authenticated-user-id':'d410baf1-83e0-4641-9a41-f44fc8c5025a'})).status,403)
 const owner=cookie(await request(app,'/api/pilot/owner/unlock','POST',{token:key}));const employee={name:'Atendente teste',email:'equipe@meubichu.test',password:'senha-somente-teste-123'}
 assert.equal((await request(app,'/api/pilot/owner/dashboard','GET',null,owner)).status,200)
 const created=await request(app,'/api/team/users','POST',employee,owner);assert.equal(created.status,201);const uid=(await created.json()).id
 assert.equal((await request(app,'/api/team/users','POST',employee,owner)).status,409)
 const staff=cookie(await request(app,'/api/team/login','POST',employee))
 assert.equal((await (await request(app,'/api/team/cases','GET',null,staff)).json()).items.length,0)
 const body={message:'Resposta da equipe.',status:'respondido',replyId:crypto.randomUUID()}
 assert.equal((await request(app,`/api/team/cases/${id}/reply`,'POST',body,staff)).status,404)
 for(const path of ['/api/team/users','/api/team/audit','/api/pilot/owner/dashboard','/api/pilot/owner/records','/api/pilot/admin/export']) assert.ok((await request(app,path,'GET',null,staff)).status>=400,path)
 assert.equal((await request(app,`/api/team/cases/${id}/assign`,'POST',{userId:uid},owner)).status,200)
 const list=await (await request(app,'/api/team/cases','GET',null,staff)).json();assert.equal(list.items.length,1);assert.equal(JSON.stringify(list).includes('Informação privada'),false);assert.equal('account_id' in list.items[0],false)
 assert.equal((await request(app,`/api/team/cases/${id}/reply`,'POST',body,staff,{origin:'https://evil.test'})).status,403)
 assert.equal((await request(app,`/api/team/cases/${id}/reply`,'POST',body,staff)).status,200)
 assert.equal((await request(app,`/api/team/cases/${id}/reply`,'POST',body,staff)).status,200)
 const inbox=await (await request(app,'/api/pilot/records/pilot_feedback','GET',null,tutor)).json();assert.equal(inbox[0].replies.length,1);assert.equal(inbox[0].replies[0].authorName,employee.name)
 assert.equal((await (await request(app,'/api/pilot/records/pilot_feedback','GET',null,other)).json()).length,0)
 assert.equal((await request(app,`/api/team/cases/${id}/reply`,'POST',{message:'Resposta direta do proprietário',status:'respondido',replyId:crypto.randomUUID()},owner)).status,200)
 assert.equal((await request(app,`/api/team/cases/${id}/reply`,'POST',{message:'',status:'resolvido',replyId:crypto.randomUUID()},owner)).status,200)
 const updated=await(await request(app,'/api/pilot/records/pilot_feedback','GET',null,tutor)).json();assert.equal(updated[0].replies.length,2);assert.equal(updated[0].status,'resolvido')
 assert.ok((await (await request(app,'/api/team/audit','GET',null,owner)).json()).some(x=>x.action==='reply'&&x.actor_id===uid))
 assert.equal((await request(app,`/api/team/users/${uid}/revoke`,'POST',{},owner)).status,200)
 assert.equal((await request(app,`/api/team/cases/${id}/reply`,'POST',{...body,replyId:crypto.randomUUID()},staff)).status,401)
 assert.equal((await request(app,'/api/team/login','POST',employee)).status,401)
 app.store.close();app=createApplication({store:openStore(dir),env:{PILOT_PANEL_KEY:key,PILOT_PANEL_ORIGIN:''}})
 const restored=await (await request(app,'/api/pilot/records/pilot_feedback','GET',null,tutor)).json();assert.equal(restored[0].replies[0].message,body.message)
 assert.equal((await request(app,'/equipe')).status,200)
 assert.equal((await request(app,'/painel','GET',null,null,{accept:'text/html'})).status,200)
 const accounts=await(await request(app,'/api/pilot/owner/tutor-accounts','GET',null,owner)).json()
 const selectedId=accounts.find(a=>a.email===auth[0].email).id
 assert.equal((await request(app,'/api/pilot/owner/tutor-accounts')).status,403)
 assert.equal((await request(app,'/api/pilot/owner/tutor-access','POST',{accountId:selectedId})).status,403)
 assert.equal((await request(app,'/api/pilot/owner/tutor-access','POST',{accountId:'missing'},owner)).status,400)
 app.store.raw.prepare('UPDATE pilot_accounts SET expires_at=? WHERE id=?').run(1,selectedId)
 const selectedResponse=await request(app,'/api/pilot/owner/tutor-access','POST',{accountId:selectedId},owner)
 assert.equal(selectedResponse.status,200)
 const selection=cookie(selectedResponse),privateCookies=owner+'; '+selection
 assert.equal((await request(app,'/api/pilot/me','GET',null,selection)).status,401)
 assert.equal((await request(app,'/api/pilot/me','GET',null,tutor)).status,401)
 const ownerMe=await(await request(app,'/api/pilot/me','GET',null,privateCookies)).json()
 assert.equal(ownerMe.ownerAccess,true);assert.equal(ownerMe.id,selectedId)
 assert.equal(app.store.raw.prepare('SELECT expires_at FROM pilot_accounts WHERE id=?').get(selectedId).expires_at,1)
 assert.equal((await request(app,'/api/team/me','GET',null,owner)).status,200)
 assert.equal((await request(app,'/api/team/me','GET',null,selection)).status,401)
 const eventCount=app.store.raw.prepare('SELECT COUNT(*) AS n FROM pilot_events').get().n
 assert.equal((await request(app,'/api/pilot/events','POST',{event:'page_load'},privateCookies)).status,200)
 assert.equal(app.store.raw.prepare('SELECT COUNT(*) AS n FROM pilot_events').get().n,eventCount)
 assert.equal((await request(app,'/api/pilot/preferences','PUT',{bichu_test:'owner-only'},privateCookies)).status,200)
 assert.equal((await request(app,'/acesso-tutor')).status,200)
 assert.equal((await request(app,'/api/pilot/owner/logout','POST',{},owner)).headers.get('set-cookie').includes('Path=/api;'),true)
 }finally{app?.store.close();await rm(dir,{recursive:true,force:true})}
})
