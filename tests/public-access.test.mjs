import {test} from 'node:test'
import assert from 'node:assert/strict'
import {mkdtemp,rm} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {openStore} from '../server/storage.mjs'
import {createApplication} from '../server/index.mjs'
import {LEGAL_VERSION} from '../server/access.mjs'
const cookies=r=>r.headers.get('set-cookie')?.split(';')[0]
test('public registration verifies email, keeps permanent account, resets once and revokes sessions',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'mb-access-')),messages=[],store=openStore(dir),app=createApplication({store,env:{APP_ORIGIN:'https://test.local',PILOT_PANEL_KEY:'a'.repeat(64),PUBLIC_REGISTRATION:'true',SEND_MAIL:async x=>messages.push(x)}})
 const call=(p,body,cookie,origin='https://test.local')=>app.dispatch(new Request('https://test.local'+p,{method:body?'POST':'GET',headers:{origin,'content-type':'application/json',...(cookie?{cookie}:{})},...(body?{body:JSON.stringify(body)}:{})}))
 const registration={name:'Maze',email:'tutor@example.test',password:'original-password-123',accepted:true,adult:true,legalVersion:LEGAL_VERSION}
 try{
 assert.equal((await call('/api/access/register',registration,null,'https://evil.test')).status,403)
 assert.equal((await call('/api/access/register',{...registration,adult:false})).status,400)
 assert.equal((await call('/api/access/register',registration)).status,200)
 assert.equal(store.raw.prepare('SELECT COUNT(*) n FROM pilot_accounts').get().n,0)
 const token=messages[0].text.match(/verify=([a-f0-9]{64})/)[1]
 assert.ok(!JSON.stringify(store.raw.prepare('SELECT * FROM access_tokens').all()).includes(token))
 assert.equal((await call('/api/access/verify',{token})).status,200)
 assert.equal((await call('/api/access/verify',{token})).status,400)
 const user=store.raw.prepare('SELECT * FROM pilot_accounts').get();assert.equal(user.account_kind,'public');assert.equal(user.legal_version,LEGAL_VERSION)
 const prefs=JSON.parse(store.raw.prepare("SELECT data FROM pilot_records WHERE collection='account_preferences'").get().data);assert.equal(prefs.bichu_tutor_name,'Maze');assert.equal(prefs.bichu_privacy_analytics,'false')
 const login=await call('/api/pilot/login',registration);assert.equal(login.status,200);const session=cookies(login)
 store.raw.prepare('UPDATE pilot_accounts SET first_access_at=? WHERE id=?').run(Date.now()-8*86400000,user.id)
 assert.equal((await call('/api/pilot/login',registration)).status,200)
 assert.equal((await call('/api/access/recover',{email:registration.email})).status,200)
 const reset=messages.at(-1).text.match(/reset=([a-f0-9]{64})/)[1]
 assert.equal((await call('/api/access/reset',{token:reset,password:'replacement-password-123'})).status,200)
 assert.equal((await call('/api/pilot/me',null,session)).status,401)
 assert.equal((await call('/api/access/reset',{token:reset,password:'replacement-password-123'})).status,400)
 assert.equal((await call('/api/pilot/login',registration)).status,401)
 assert.equal((await call('/api/pilot/login',{...registration,password:'replacement-password-123'})).status,200)
 assert.equal((await call('/api/access/recover',{email:'missing@example.test'})).status,200)
 assert.equal(messages.length,2)
 }finally{store.close();await rm(dir,{recursive:true,force:true})}
})
test('employee password recovery preserves assignment and permissions and requires active employee',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'mb-staff-access-')),messages=[],store=openStore(dir),app=createApplication({store,env:{APP_ORIGIN:'https://test.local',PILOT_PANEL_KEY:'a'.repeat(64),SEND_MAIL:async x=>messages.push(x)}})
 const call=(p,body,cookie)=>app.dispatch(new Request('https://test.local'+p,{method:body?'POST':'GET',headers:{origin:'https://test.local','content-type':'application/json',...(cookie?{cookie}:{})},...(body?{body:JSON.stringify(body)}:{})}))
 try{
 const owner=cookies(await call('/api/pilot/owner/unlock',{token:'a'.repeat(64)})),staff={name:'Atendente',email:'staff@example.test',password:'staff-password-123'}
 const created=await(await call('/api/team/users',staff,owner)).json(),session=cookies(await call('/api/team/login',staff)),prior=store.raw.prepare('SELECT permissions FROM team_permissions WHERE user_id=?').get(created.id)
 await call('/api/access/recover',{email:staff.email,kind:'staff'});const token=messages[0].text.match(/reset=([a-f0-9]{64})/)[1]
 assert.equal((await call('/api/access/reset',{token,password:'new-staff-password-123'})).status,200)
 assert.equal((await call('/api/team/me',null,session)).status,401)
 assert.deepEqual(store.raw.prepare('SELECT permissions FROM team_permissions WHERE user_id=?').get(created.id),prior)
 assert.equal((await call('/api/team/login',{...staff,password:'new-staff-password-123'})).status,200)
 store.raw.prepare('UPDATE team_users SET active=0 WHERE id=?').run(created.id);await call('/api/access/recover',{email:staff.email,kind:'staff'});assert.equal(messages.length,1)
 }finally{store.close();await rm(dir,{recursive:true,force:true})}
})
