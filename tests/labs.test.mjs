import {test} from 'node:test'
import assert from 'node:assert/strict'
import {mkdtemp,rm} from 'node:fs/promises'
import {join} from 'node:path'
import {tmpdir} from 'node:os'
import {createApplication} from '../server/index.mjs'
import {openStore} from '../server/storage.mjs'
const key='a'.repeat(64)
async function setup(kind){const dir=await mkdtemp(join(tmpdir(),'mb-lab-')),store=openStore(dir),app=createApplication({store,env:{DATA_DIR:dir,APP_ORIGIN:'https://lab.local',PILOT_PANEL_KEY:'b'.repeat(64),LAB_CONTROL_KEY:key,LAB_KIND:kind,APP_RELEASE:'c'.repeat(40),COOKIE_SECURE:false}});return {dir,store,app,close:async()=>{store.close();await rm(dir,{recursive:true,force:true})},call:(path,body,cookie,auth=key)=>app.dispatch(new Request('https://lab.local'+path,{method:body?'POST':'GET',headers:{origin:'https://lab.local',...(body?{'content-type':'application/json'}:{}),...(cookie?{cookie}:{}),...(auth?{authorization:'Bearer '+auth}:{})},...(body?{body:JSON.stringify(body)}:{})}))}}
async function enter(f,slot){const r=await f.call('/api/lab/manage/open',{slot});assert.equal(r.status,200);const{url}=await r.json(),ticket=new URL(url).hash.slice(5),login=await f.call('/api/lab/enter',{ticket});assert.equal(login.status,200);return {ticket,cookie:login.headers.get('set-cookie').split(';')[0]}}
test('beta reserves 20 clean disabled accounts; activation, one-time access, per-screen evaluations and revocation',async()=>{
 const f=await setup('beta');try{
 const state=await(await f.call('/api/lab/manage')).json();assert.equal(state.accounts.length,21);assert.equal(state.accounts.filter(a=>!a.active).length,20);assert.ok(state.accounts.every(a=>a.records===0))
 assert.equal((await f.call('/api/lab/manage',undefined,undefined,'wrong')).status,403)
 assert.equal((await f.call('/api/lab/manage/open',{slot:'beta-02'})).status,409)
 await f.call('/api/lab/manage/activate',{slot:'beta-02',active:true});const a=await enter(f,'beta-02');assert.equal((await f.call('/api/lab/enter',{ticket:a.ticket})).status,403)
 const me=await(await f.call('/api/pilot/me',undefined,a.cookie)).json();assert.equal(me.labKind,'beta')
 const b=await enter(f,'beta-01');assert.equal((await f.call('/api/pilot/lab-evaluation',{screen:'/caes',ratings:{usability:5,visual:4,speed:3},worked:'parcial',comment:'Problema observado'},a.cookie)).status,201)
 const feedback=await(await f.call('/api/lab/manage/feedback')).json();assert.equal(feedback.items[0].data.labSlot,'beta-02');assert.equal(feedback.items[0].data.release,'c'.repeat(40));assert.equal(feedback.items[0].data.screen,'/caes')
 assert.equal((await(await f.call('/api/pilot/records/pilot_feedback',undefined,b.cookie)).json()).length,0)
 assert.equal((await f.call('/api/pilot/owner/dashboard',undefined,a.cookie,null)).status,403)
 await f.call('/api/lab/manage/activate',{slot:'beta-02',active:false});assert.equal((await f.call('/api/pilot/me',undefined,a.cookie)).status,401)
 }finally{await f.close()}
})
test('dirty lab is a different database; changes and cookies cannot cross environments',async()=>{
 const a=await setup('dirty'),b=await setup('beta');try{
 const x=await enter(a,'dirty'),y=await enter(b,'beta-01');await a.call('/api/pilot/records/dogs',{name:'Stress test',weight_kg:12},x.cookie)
 assert.equal((await(await b.call('/api/pilot/records/dogs',undefined,y.cookie)).json()).length,0)
 assert.equal((await b.call('/api/pilot/me',undefined,x.cookie)).status,401)
 assert.equal((await a.call('/api/lab/manage/archive',{name:'Invalid'})).status,403)
 }finally{await a.close();await b.close()}
})
test('matrix archives remain unchanged after edits',async()=>{
 const f=await setup('matrix');try{
 const user=await enter(f,'matrix'),pet=await(await f.call('/api/pilot/records/dogs',{name:'Referência',weight_kg:12},user.cookie)).json()
 const first=await(await f.call('/api/lab/manage/archive',{name:'Antes'})).json();
 f.store.raw.prepare("UPDATE pilot_records SET data=json_set(data,'$.name','Depois','$.weight_kg',15) WHERE id=?").run(pet.id)
 const saved=await(await f.call('/api/lab/manage/archive/'+first.id)).json();assert.equal(saved.records.find(r=>r.id===pet.id).data.name,'Referência');assert.equal(saved.records.find(r=>r.id===pet.id).data.weight_kg,12)
 assert.equal(f.store.raw.prepare('SELECT COUNT(*) n FROM lab_versions').get().n,1)
 }finally{await f.close()}
})
