import {test} from 'node:test'
import assert from 'node:assert/strict'
import {mkdtemp,rm} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {createHash} from 'node:crypto'
import {createApplication} from '../server/index.mjs'
const key='a'.repeat(64),origin='https://meubichu.test'
function send(app,path,body,cookie,method,extra={}){return app.dispatch(new Request(origin+path,{method:method||(body?'POST':'GET'),headers:{origin,...(body?{'content-type':'application/json'}:{}),...(cookie?{cookie}:{}),...extra},body:body?JSON.stringify(body):undefined}))}
const cookie=r=>r.headers.get('set-cookie').split(';')[0]
async function fixture(env={}){
 const dir=await mkdtemp(join(tmpdir(),'bichu-temporary-')),app=createApplication({env:{DATA_DIR:dir,APP_ORIGIN:origin,PILOT_PANEL_KEY:key,PILOT_ADMIN_KEY:'local-test-only',COOKIE_SECURE:false,...env}})
 const owner=cookie(await send(app,'/api/pilot/owner/unlock',{token:key}))
 if(!env.LAB_KIND){const accounts=Array.from({length:10},(_,i)=>({email:`piloto${String(i+1).padStart(2,'0')}@meubichu.test`,password:'a'.repeat(48)}));assert.equal((await send(app,'/api/pilot/admin/provision',accounts,null,null,{authorization:'Bearer local-test-only'})).status,201)}
 return{app,owner,close:async()=>{app.store.close();await rm(dir,{recursive:true,force:true})}}
}
async function issue(f,role,subjectId,days=7){const r=await send(f.app,'/api/pilot/owner/access-links',{role,subjectId,days},f.owner);assert.equal(r.status,201);const d=await r.json();return{...d,token:new URLSearchParams(new URL(d.url).hash.slice(1)).get('entrada')}}
async function enter(f,link){const r=await send(f.app,'/api/access/temporary/enter',{token:link.token});assert.equal(r.status,200);return cookie(r)}
async function staff(f,email='worker@meubichu.test'){const r=await send(f.app,'/api/team/users',{name:'Funcionário de teste',email,password:'a'.repeat(48)},f.owner);assert.equal(r.status,201);return(await r.json()).id}

test('tutor magic link enters the chosen expired account, preserves original deadlines and never grants owner access',async()=>{
 const f=await fixture();try{
 const rows=f.app.store.raw.prepare('SELECT id,email FROM pilot_accounts ORDER BY email').all(),[a,b]=rows
 f.app.store.raw.prepare('UPDATE pilot_accounts SET expires_at=1 WHERE id=?').run(a.id)
 const before=f.app.store.raw.prepare('SELECT * FROM pilot_accounts WHERE id=?').get(a.id)
 assert.equal((await send(f.app,'/api/pilot/owner/access-links',{role:'tutor',subjectId:a.id,days:7})).status,403)
 const link=await issue(f,'tutor',a.id),stored=f.app.store.raw.prepare('SELECT * FROM temporary_access_links WHERE id=?').get(link.id)
 assert.equal(stored.token_hash,createHash('sha256').update(link.token).digest('hex'));assert.equal(JSON.stringify(stored).includes(link.token),false)
 const c=await enter(f,link),me=await(await send(f.app,'/api/pilot/me',null,c)).json()
 assert.equal(me.id,a.id);assert.equal(me.temporaryAccess,true);assert.equal(me.ownerAccess,false)
 assert.ok(f.app.store.raw.prepare("SELECT 1 FROM team_audit WHERE actor_id='tutor' AND action='temporary_access_enter'").get())
 assert.deepEqual(f.app.store.raw.prepare('SELECT * FROM pilot_accounts WHERE id=?').get(a.id),before)
 for(const path of ['/api/pilot/owner/dashboard','/api/pilot/owner/access-links','/api/team/users'])assert.ok((await send(f.app,path,null,c)).status>=400)
 assert.equal((await send(f.app,'/api/pilot/me',null,c,null,{'x-mb-account-id':b.id})).status,409)
 const created=await send(f.app,'/api/pilot/records/dogs',{name:'Pet temporário',weight_kg:10},c);assert.equal(created.status,201)
 const other=await enter(f,await issue(f,'tutor',b.id));assert.deepEqual(await(await send(f.app,'/api/pilot/records/dogs',null,other)).json(),[])
 assert.equal((await(await send(f.app,'/api/pilot/me',null,f.owner+'; '+c)).json()).id,a.id)
 assert.equal((await send(f.app,'/api/pilot/owner/tutor-access',{accountId:b.id},f.owner+'; '+c)).status,200)
 assert.equal((await(await send(f.app,'/api/pilot/me',null,f.owner+'; '+c+'; mb_owner_account='+b.id)).json()).id,b.id)
 const listed=await(await send(f.app,'/api/pilot/owner/access-links',null,f.owner)).json();assert.equal(JSON.stringify(listed).includes(link.token),false)
 }finally{await f.close()}
})
test('employee magic link preserves individual permissions and audit actor; revocation terminates all its sessions',async()=>{
 const f=await fixture();try{
 const uid=await staff(f),link=await issue(f,'staff',uid),a=await enter(f,link),b=await enter(f,link)
 const mode={'x-mb-team-mode':'staff'},me=await(await send(f.app,'/api/team/me',null,f.owner+'; '+a,null,mode)).json()
 assert.equal(me.role,'staff');assert.equal(me.name,'Funcionário de teste')
 assert.equal((await send(f.app,'/api/team/users',null,a)).status,403)
 assert.equal((await send(f.app,'/api/pilot/me',null,a)).status,401)
 assert.ok(f.app.store.raw.prepare("SELECT 1 FROM team_audit WHERE actor_id=? AND action='temporary_access_enter'").get(uid))
 assert.equal((await send(f.app,'/api/pilot/owner/access-links/'+link.id+'/revoke',{},a)).status,403)
 assert.equal((await send(f.app,'/api/pilot/owner/access-links/'+link.id+'/revoke',{},f.owner)).status,200)
 for(const c of[a,b])assert.equal((await send(f.app,'/api/team/me',null,c)).status,401)
 assert.equal((await send(f.app,'/api/access/temporary/enter',{token:link.token})).status,403)
 const fresh=await issue(f,'staff',uid),session=await enter(f,fresh)
 f.app.store.raw.prepare('UPDATE team_users SET active=0 WHERE id=?').run(uid)
 assert.equal((await send(f.app,'/api/team/me',null,session)).status,401)
 assert.equal((await send(f.app,'/api/access/temporary/enter',{token:fresh.token})).status,403)
 }finally{await f.close()}
})
test('expired or revoked tutor links cannot re-enter and cannot use an already-open session; ordinary sign-in remains independent',async()=>{
 const f=await fixture();try{
 const subject=f.app.store.raw.prepare('SELECT id FROM pilot_accounts ORDER BY email LIMIT 1').get().id
 const original=cookie(await send(f.app,'/api/pilot/login',{email:'piloto01@meubichu.test',password:'a'.repeat(48)}))
 const link=await issue(f,'tutor',subject),session=await enter(f,link)
 assert.equal((await send(f.app,'/api/pilot/owner/access-links/'+link.id+'/revoke',{},f.owner)).status,200)
 assert.equal((await send(f.app,'/api/pilot/me',null,session)).status,401)
 assert.equal((await send(f.app,'/api/pilot/me',null,original)).status,200)
 const expired=await issue(f,'tutor',subject),expiredSession=await enter(f,expired)
 f.app.store.raw.prepare('UPDATE temporary_access_links SET expires_at=1 WHERE id=?').run(expired.id)
 assert.equal((await send(f.app,'/api/pilot/me',null,expiredSession)).status,401)
 assert.equal((await send(f.app,'/api/access/temporary/enter',{token:expired.token})).status,403)
 assert.equal((await send(f.app,'/api/access/temporary/enter',{token:'0'.repeat(64)},null,null,{origin:'https://other.invalid'})).status,403)
 }finally{await f.close()}
})
test('reserved beta accounts cannot be activated by issuing or using a passwordless link',async()=>{
 const f=await fixture({LAB_KIND:'beta'});try{
 const inactive=f.app.store.raw.prepare('SELECT account_id FROM lab_accounts WHERE active=0 LIMIT 1').get().account_id
 assert.equal((await send(f.app,'/api/pilot/owner/access-links',{role:'tutor',subjectId:inactive,days:7},f.owner)).status,400)
 const targets=await(await send(f.app,'/api/pilot/owner/access-links/targets',null,f.owner)).json()
 assert.equal(targets.tutors.some(t=>t.id===inactive),false)
 assert.equal(f.app.store.raw.prepare('SELECT COUNT(*) n FROM lab_accounts WHERE active=0').get().n,20)
 }finally{await f.close()}
})
