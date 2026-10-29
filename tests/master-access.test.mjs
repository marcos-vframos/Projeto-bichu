import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { scryptSync, randomBytes } from 'node:crypto'
import { createApplication } from '../server/index.mjs'
const origin='https://master-test.invalid',email='creator@example.test',password='local-fixture-password'
const salt=randomBytes(32).toString('hex'),hash=scryptSync(password,salt,64).toString('hex')
async function fixture(extra={}) {
 const dir=await mkdtemp(join(tmpdir(),'bichu-master-'))
 const app=createApplication({env:{DATA_DIR:dir,APP_ORIGIN:origin,PILOT_PANEL_KEY:'b'.repeat(64),COOKIE_SECURE:false,MASTER_ACCESS_EMAIL:email,MASTER_ACCESS_SALT:salt,MASTER_ACCESS_HASH:hash,...extra}})
 const db=app.store.raw
 if(!extra.LAB_KIND) for(const [id,address] of [['original','piloto01@meubichu.test'],['other','other@example.test']])db.prepare('INSERT INTO pilot_accounts(id,email,password_salt,password_hash,first_access_at,expires_at,created_at) VALUES(?,?,?,?,?,?,?)').run(id,address,'original-salt','original-hash',5,10,1)
 return {app,db,async close(){app.store.close();await rm(dir,{recursive:true,force:true})}}
}
function send(f,path,body,cookie='',headers={}){return f.app.dispatch(new Request(origin+path,{method:body?'POST':'GET',headers:{origin,'content-type':'application/json',cookie,...headers},body:body?JSON.stringify(body):undefined}))}
const cookies=r=>r.headers.getSetCookie().filter(c=>!c.includes('Max-Age=0')).map(c=>c.split(';')[0]).join('; ')
const login=(f,area)=>send(f,'/api/access/master/login',{email,password,area})

test('master owner and matrix login preserve original identity and data, issue separate cookies, survive reentry',async()=>{
 const f=await fixture();try{
 const before=f.db.prepare('SELECT * FROM pilot_accounts ORDER BY id').all()
 const owner=await login(f,'proprietario');assert.equal(owner.status,200)
 assert.equal((await send(f,'/api/pilot/owner/session',null,cookies(owner))).status,200)
 const matrix=await login(f,'matriz');assert.equal(matrix.status,200)
 assert.equal(matrix.headers.getSetCookie().length,3)
 const c=cookies(matrix),me=await(await send(f,'/api/pilot/me',null,c)).json()
 assert.equal(me.id,'original');assert.equal(me.email,'piloto01@meubichu.test');assert.equal(me.matrixOriginal,true)
 assert.equal((await(await send(f,'/api/pilot/me',null,c)).json()).id,'original')
 assert.deepEqual(f.db.prepare('SELECT * FROM pilot_accounts ORDER BY id').all(),before)
 assert.equal(f.db.prepare('SELECT COUNT(*) n FROM pilot_accounts').get().n,2)
 assert.equal((await send(f,'/api/pilot/me',null,c,{'x-mb-account-id':'other'})).status,409)
 assert.ok(f.db.prepare("SELECT 1 FROM team_audit WHERE action='master_login' AND record_id='original'").get())
 }finally{await f.close()}
})
test('master staff is an individual employee, cannot read owner/tutor APIs, permissions and revocation stay effective',async()=>{
 const f=await fixture();try{
 const r=await login(f,'funcionario'),c=cookies(r);assert.equal(r.status,200)
 const me=await(await send(f,'/api/team/me',null,c,{'x-mb-team-mode':'staff'})).json();assert.equal(me.role,'staff');assert.ok(me.permissions.includes('tasks.update'))
 assert.equal((await send(f,'/api/pilot/owner/dashboard',null,c)).status,403)
 assert.equal((await send(f,'/api/team/users',null,c)).status,403)
 assert.equal((await send(f,'/api/pilot/me',null,c)).status,401)
 const user=f.db.prepare('SELECT id FROM team_users WHERE email=?').get(email)
 f.db.prepare('UPDATE team_permissions SET permissions=? WHERE user_id=?').run('[]',user.id)
 const again=await login(f,'funcionario');assert.deepEqual((await(await send(f,'/api/team/me',null,cookies(again))).json()).permissions,[])
 assert.equal(f.db.prepare('SELECT COUNT(*) n FROM team_users').get().n,1)
 f.db.prepare('UPDATE team_users SET active=0 WHERE id=?').run(user.id)
 assert.equal((await login(f,'funcionario')).status,403);assert.equal((await send(f,'/api/team/me',null,c)).status,401)
 }finally{await f.close()}
})
test('master is opt-in, validates origin and credentials, locks repeated failures without granting sessions',async()=>{
 const f=await fixture();try{
 assert.equal((await send(f,'/api/access/master/login',{email,password,area:'proprietario'},'',{origin:'https://evil.invalid'})).status,403)
 for(let n=0;n<5;n++){const r=await send(f,'/api/access/master/login',{email,password:'wrong',area:'proprietario'});assert.equal(r.status,401);assert.equal(r.headers.getSetCookie().length,0)}
 assert.equal((await login(f,'proprietario')).status,429)
 f.db.prepare('UPDATE team_attempts SET locked_until=1').run();assert.equal((await login(f,'proprietario')).status,200)
 }finally{await f.close()}
 const disabled=await fixture({MASTER_ACCESS_HASH:''});try{assert.equal((await login(disabled,'proprietario')).status,503)}finally{await disabled.close()}
 const beta=await fixture({LAB_KIND:'beta'});try{assert.equal((await login(beta,'proprietario')).status,503);assert.equal(beta.db.prepare('SELECT COUNT(*) n FROM lab_accounts WHERE active=0').get().n,20)}finally{await beta.close()}
})
test('existing tutor and staff login forms accept master credentials; missing matrix is never silently recreated',async()=>{
 const f=await fixture();try{
 assert.equal((await send(f,'/api/pilot/login',{email,password})).status,200)
 assert.equal((await send(f,'/api/team/login',{email,password})).status,200)
 f.db.prepare("DELETE FROM pilot_accounts WHERE id='original'").run()
 assert.equal((await login(f,'matriz')).status,409)
 assert.equal(f.db.prepare("SELECT COUNT(*) n FROM pilot_accounts WHERE email='piloto01@meubichu.test'").get().n,0)
 }finally{await f.close()}
})
test('HTTP server transports each session cookie separately for matrix login',async()=>{
 const f=await fixture();try{
 await new Promise(resolve=>f.app.server.listen(0,'127.0.0.1',resolve))
 const response=await fetch('http://127.0.0.1:'+f.app.server.address().port+'/api/access/master/login',{method:'POST',headers:{origin,'content-type':'application/json'},body:JSON.stringify({email,password,area:'matriz'})})
 assert.equal(response.status,200);const list=response.headers.getSetCookie();assert.equal(list.length,3);assert.ok(list.some(c=>c.startsWith('mb_owner=')));assert.ok(list.some(c=>c.startsWith('mb_owner_account=')))
 }finally{if(f.app.server.listening)await new Promise(resolve=>f.app.server.close(resolve));await f.close()}
})
