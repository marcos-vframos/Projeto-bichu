import {test} from 'node:test'
import assert from 'node:assert/strict'
import {mkdtemp,rm} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {createApplication} from '../server/index.mjs'
const origin='https://lab.invalid',key='c'.repeat(64)
async function setup(kind){const dir=await mkdtemp(join(tmpdir(),'dirty-directory-')),app=createApplication({env:{DATA_DIR:dir,APP_ORIGIN:origin,PILOT_PANEL_KEY:'a'.repeat(64),LAB_CONTROL_KEY:key,LAB_KIND:kind,COOKIE_SECURE:false}});return{app,async close(){app.store.close();await rm(dir,{recursive:true,force:true})}}}
const request=(f,path,body,cookie='',extra={})=>f.app.dispatch(new Request(origin+path,{method:body?'POST':'GET',headers:{origin,'content-type':'application/json',cookie,...extra},body:body?JSON.stringify(body):undefined}))
async function enter(f,slot){const r=await request(f,'/api/lab/manage/open',{slot},'',{authorization:'Bearer '+key});assert.equal(r.status,200);const ticket=new URL((await r.json()).url).hash.slice(5);const response=await request(f,'/api/lab/enter',{ticket});return response.headers.get('set-cookie').split(';')[0]}
test('dirty-only panel needs a valid local test session, keeps remote navigation separate from local account filters',async()=>{
 const f=await setup('dirty');try{
 assert.equal((await request(f,'/api/pilot/lab-owner-session',{})).status,403)
 assert.equal((await request(f,'/api/pilot/owner/account-directory')).status,403)
 const pilot=await enter(f,'dirty'),r=await request(f,'/api/pilot/lab-owner-session',{},pilot);assert.equal(r.status,200)
 const owner=r.headers.get('set-cookie').split(';')[0]
 const response=await request(f,'/api/pilot/owner/account-directory',null,owner);assert.equal(response.status,200)
 const d=await response.json();assert.deepEqual(d.groups.map(g=>g.id),['matrix','beta','dirty'])
 assert.equal(d.groups.find(g=>g.id==='dirty').accounts.length,1)
 assert.equal(d.groups.find(g=>g.id==='dirty').accounts[0].email,'dirty@dirty.meubichu.invalid')
 for(const group of d.groups.filter(g=>g.id!=='dirty')){assert.equal(group.accounts,undefined);for(const link of group.links){assert.equal(new URL(link.url).origin,'https://meu-bichu-app-production.up.railway.app');assert.equal(new URL(link.url).hash,'')}}
 assert.equal(f.app.store.raw.prepare('SELECT COUNT(*) n FROM pilot_accounts').get().n,1)
 assert.ok(f.app.store.raw.prepare("SELECT 1 FROM team_audit WHERE action='open_dirty_test_panel'").get())
 assert.equal((await request(f,'/api/pilot/lab-owner-session',{},pilot,{origin:'https://wrong.invalid'})).status,403)
 assert.equal((await request(f,'/api/pilot/owner/tutor-access',{accountId:'foreign-account'},owner)).status,400)
 }finally{await f.close()}
})
test('beta, matrix and real deployments cannot use the dirty-only permission or directory; beta reservations stay inactive',async()=>{
 const dirty=await setup('dirty'),session=await enter(dirty,'dirty');try{for(const kind of ['beta','matrix',undefined]){const f=await setup(kind);try{
 const local=kind?await enter(f,kind==='beta'?'beta-01':'matrix'):''
 for(const cookie of [local,session])assert.equal((await request(f,'/api/pilot/lab-owner-session',{},cookie)).status,404)
 assert.equal((await request(f,'/api/pilot/owner/account-directory')).status,404)
 if(kind==='beta')assert.equal(f.app.store.raw.prepare('SELECT COUNT(*) n FROM lab_accounts WHERE active=0').get().n,20)
 }finally{await f.close()}}}finally{await dirty.close()}
})
