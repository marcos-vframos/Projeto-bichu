import {test} from 'node:test'
import assert from 'node:assert/strict'
import {mkdtemp,rm} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {createHash} from 'node:crypto'
import {openStore} from '../server/storage.mjs'
import {createApplication} from '../server/index.mjs'
import {passwordHash} from '../server/team.mjs'
import {LEGAL_VERSION} from '../server/access.mjs'
const key='a'.repeat(64), cookie=r=>r.headers.getSetCookie()[0]?.split(';')[0]
async function fixture(env,run){
 const dir=await mkdtemp(join(tmpdir(),'mb-operation-')),store=openStore(dir),app=createApplication({store,env:{PILOT_PANEL_KEY:key,COOKIE_SECURE:false,APP_ORIGIN:'https://test.local',...env}})
 const call=(path,body,auth,method=body?'POST':'GET')=>app.dispatch(new Request('https://test.local'+path,{method,headers:{origin:'https://test.local',...(auth?{cookie:auth}:{}),'content-type':'application/json'},...(body?{body:JSON.stringify(body)}:{})}))
 try{const owner=cookie(await call('/api/pilot/owner/unlock',{token:key}));await run({store,call,owner})}finally{store.close();await rm(dir,{recursive:true,force:true})}
}
test('new staff has no implicit rights; explicit grants, dependencies and owner-only management are enforced',()=>fixture({},async({store,call,owner})=>{
 const credentials={name:'Atendente',email:'staff@example.test',password:'staff-password-123'}
 const created=await call('/api/team/users',credentials,owner);assert.equal(created.status,201);const {id}=await created.json()
 assert.equal(store.raw.prepare('SELECT permissions FROM team_permissions WHERE user_id=?').get(id).permissions,'[]')
 const auth=cookie(await call('/api/team/login',credentials));assert.ok(auth)
 assert.deepEqual((await(await call('/api/team/me',null,auth)).json()).permissions,[])
 assert.equal((await call('/api/team/cases',null,auth)).status,403)
 assert.equal((await call('/api/team/users',null,auth)).status,403)
 assert.equal((await call('/api/pilot/owner/operation',null,auth)).status,403)
 assert.equal((await call('/api/team/users',{...credentials,email:'another@example.test',permissions:['questions.reply']},owner)).status,400)
 assert.equal((await call('/api/team/users',{...credentials,email:'another@example.test',permissions:['invented']},owner)).status,400)
 assert.equal((await call('/api/team/users/'+id+'/permissions',{permissions:['questions.read']},owner,'PUT')).status,200)
 assert.equal((await call('/api/team/cases',null,auth)).status,200)
 assert.equal((await call('/api/team/cases/'+crypto.randomUUID()+'/reply',{message:'test'},auth)).status,403)
}))
test('operation evidence is private and reports missing configuration without exposing values or promising delivery',()=>fixture({PUBLIC_REGISTRATION:'true',SMTP_HOST:'smtp.example.test',SMTP_USER:'user-private',SMTP_FROM:'from-private'},async({call,owner})=>{
 assert.equal((await call('/api/pilot/owner/operation')).status,403)
 const response=await call('/api/pilot/owner/operation',null,owner),status=await response.json();assert.equal(response.headers.get('cache-control'),'no-store')
 assert.equal(status.registration.enabled,false);assert.deepEqual(status.email.missing,['SMTP_PASSWORD']);assert.equal(status.email.deliveryVerified,false)
 assert.equal(status.backup.recent,false);assert.equal(status.master.administrationOnly,true)
 assert.ok(!JSON.stringify(status).includes('user-private'));assert.ok(!JSON.stringify(status).includes('smtp.example.test'))
 const config=await(await call('/api/access/config')).json();assert.equal(config.registrationEnabled,false);assert.equal(config.recoveryEnabled,false)
}))
test('master email cannot register or recover through public routes; legacy master staff sessions are denied',()=>{
 const messages=[];return fixture({MASTER_ACCESS_EMAIL:'master@example.test',PUBLIC_REGISTRATION:'true',SEND_MAIL:async x=>messages.push(x)},async({store,call,owner})=>{
 const credentials={name:'Master antigo',email:'master@example.test',password:'staff-password-123'}
 const {id}=await(await call('/api/team/users',credentials,owner)).json()
 for(const body of [{...credentials,accepted:true,adult:true,legalVersion:LEGAL_VERSION},{email:credentials.email},{email:credentials.email,kind:'staff'}]){
  const r=await call(body.name?'/api/access/register':'/api/access/recover',body);assert.equal(r.status,200)
 }
 assert.equal(messages.length,0);assert.equal(store.raw.prepare('SELECT COUNT(*) n FROM access_tokens').get().n,0)
 const token='b'.repeat(48);store.raw.prepare('INSERT INTO team_sessions VALUES(?,?,?)').run(createHash('sha256').update(token).digest('hex'),id,Date.now()+60000)
 assert.equal((await call('/api/team/me',null,'mb_team='+token)).status,401)
 assert.equal(store.raw.prepare('SELECT COUNT(*) n FROM team_sessions WHERE user_id=?').get(id).n,0)
 assert.equal((await call('/api/team/me',null,owner)).status,200)
 })
})
test('ordinary tutor sign-in replaces owner account selection without altering the selected account',()=>fixture({},async({store,call,owner})=>{
 const salt='salt',password='tutor-password-123',hash=await passwordHash(password,salt)
 for(const id of ['a','b'])store.raw.prepare("INSERT INTO pilot_accounts(id,email,password_salt,password_hash,created_at,account_kind) VALUES(?,?,?,?,?,'public')").run(id,id+'@example.test',salt,hash,Date.now())
 const selection=cookie(await call('/api/pilot/owner/tutor-access',{accountId:'a'},owner)),auth=owner+'; '+selection
 const failed=await call('/api/pilot/login',{email:'b@example.test',password:'wrong'},auth);assert.equal(failed.status,401);assert.equal(failed.headers.getSetCookie().length,0)
 const success=await call('/api/pilot/login',{email:'b@example.test',password},auth);assert.equal(success.status,200);assert.equal((await success.json()).id,'b')
 assert.ok(success.headers.getSetCookie().some(x=>x.startsWith('mb_owner_account=;')&&x.includes('Max-Age=0')))
 const ordinary=owner+'; '+success.headers.getSetCookie().find(x=>x.startsWith('mb_pilot=')).split(';')[0]
 assert.equal((await(await call('/api/pilot/me',null,ordinary)).json()).id,'b')
 assert.equal((await(await call('/api/pilot/me',null,auth)).json()).id,'a')
 assert.equal(store.raw.prepare('SELECT COUNT(*) n FROM pilot_accounts').get().n,2)
}))
