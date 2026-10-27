import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { createApplication } from '../server/index.mjs'
import { openStore } from '../server/storage.mjs'
import { readTestAnalytics, CHECKLIST_STEPS } from '../server/test-analytics.mjs'
const key='a'.repeat(64),panel='b'.repeat(64),release='c'.repeat(40)
async function setup(kind='beta') {
  const dir=await mkdtemp(join(tmpdir(),'bichu-test-analytics-')),store=openStore(dir)
  const env={DATA_DIR:dir,APP_ORIGIN:'https://test.local',PILOT_PANEL_KEY:panel,APP_RELEASE:release,COOKIE_SECURE:false,...(kind?{LAB_KIND:kind,LAB_CONTROL_KEY:key}:{LAB_MATRIX_ORIGIN:'https://archive.test',LAB_MATRIX_KEY:key})}
  const app=createApplication({store,env})
  const call=(path,body,cookie,auth)=>app.dispatch(new Request('https://test.local'+path,{method:body===undefined?'GET':'POST',headers:{origin:'https://test.local',...(body===undefined?{}:{'content-type':'application/json'}),...(cookie?{cookie}:{}),...(auth?{authorization:'Bearer '+auth}:{})},...(body===undefined?{}:{body:JSON.stringify(body)})}))
  return {dir,store,env,app,call,close:async()=>{store.close();await rm(dir,{recursive:true,force:true})}}
}
async function login(f,slot='beta-01') {
  const opened=await(await f.call('/api/lab/manage/open',{slot},null,key)).json()
  const ticket=new URL(opened.url).hash.slice(5),r=await f.call('/api/lab/enter',{ticket})
  assert.equal(r.status,200);return r.headers.get('set-cookie').split(';')[0]
}
test('test analytics: exact p95, response denominator, request deduplication, unknown versions and environment isolation',async()=>{
  const f=await setup();try{
    const account=f.store.raw.prepare("SELECT account_id FROM lab_accounts WHERE slot='beta-01'").get().account_id,now=Date.now()
    f.store.raw.prepare('INSERT INTO pilot_accounts(id,email,password_salt,password_hash,created_at) VALUES(?,?,?,?,?)').run('outside','outside@example.test','salt','hash',now)
    const insert=f.store.raw.prepare('INSERT INTO pilot_events(id,account_id,event,duration_ms,created_at,device_id,details) VALUES(?,?,?,?,?,?,?)')
    for(let i=1;i<=20;i++)insert.run('response-'+i,account,'api_response',i*100,now,'device-01',JSON.stringify({serverRelease:release,clientRelease:release,requestId:'req-'+i,method:'PATCH',status:i===20?500:200,route:'/api/pilot/records/dogs'}))
    insert.run('duplicate',account,'save_error',2000,now,'device-01',JSON.stringify({serverRelease:release,requestId:'req-20',method:'PATCH',status:500,route:'/api/pilot/records/dogs'}))
    insert.run('slow',account,'api_slow',2000,now,'device-01',JSON.stringify({serverRelease:release,requestId:'req-20'}))
    insert.run('network',account,'network_error',100,now,'device-01',JSON.stringify({serverRelease:release,requestId:'net-one'}))
    insert.run('usage',account,'active_time',15000,now,'device-01',JSON.stringify({serverRelease:release}))
    insert.run('historical',account,'api_response',99999,now,'device-01',JSON.stringify({status:200}))
    insert.run('malformed',account,'navigation',0,now,'device-01','invalid-json')
    insert.run('outside-scope','outside','api_response',99999,now,'device-02',JSON.stringify({serverRelease:release,status:500}))
    insert.run('old',account,'api_response',99999,now-31*86400000,'device-01',JSON.stringify({serverRelease:release,status:500}))
    const filtered=readTestAnalytics(f.store,f.env,new URLSearchParams({release}))
    assert.equal(filtered.totals.measured,20);assert.equal(filtered.totals.avgMs,1050);assert.equal(filtered.totals.p95Ms,1900);assert.equal(filtered.totals.errorRate,5);assert.equal(filtered.totals.failedWrites,1)
    assert.equal(filtered.totals.incidents,2);assert.equal(filtered.totals.networkFailures,1);assert.equal(filtered.totals.activeMs,15000);assert.equal(filtered.totals.slow,5);assert.equal(filtered.writes.items.length,1)
    assert.ok(filtered.accounts.every(a=>a.id!=='outside'));assert.equal(filtered.responses.items.length,20)
    const all=readTestAnalytics(f.store,f.env,new URLSearchParams());assert.equal(all.totals.unknownVersionEvents,2);assert.equal(all.totals.measured,21);assert.ok(all.versions.some(v=>v.release==='unknown'))
    insert.run('missing-time',account,'api_response',null,now,'device-01',JSON.stringify({serverRelease:release,status:500}))
    const untimed=readTestAnalytics(f.store,f.env,new URLSearchParams({release}));assert.equal(untimed.totals.responses,21);assert.equal(untimed.totals.measured,20);assert.equal(untimed.totals.p95Ms,1900);assert.equal(untimed.totals.errorRate,9.5)
    assert.equal((await f.call('/api/lab/manage/analytics',undefined,null,'wrong')).status,403)
    assert.equal((await f.call('/api/lab/manage/analytics?days=999',undefined,null,key)).status,400)
    for(let i=21;i<=80;i++)insert.run('page-'+i,account,'api_response',100,now,'device-01',JSON.stringify({serverRelease:release,status:200}))
    const first=readTestAnalytics(f.store,f.env,new URLSearchParams({release,detail:'responses'})),second=readTestAnalytics(f.store,f.env,new URLSearchParams({release,detail:'responses',offset:String(first.nextOffset)}));assert.equal(first.items.length,50);assert.equal(second.items.length,31);assert.equal(second.nextOffset,null);assert.equal(new Set([...first.items,...second.items].map(e=>e.id)).size,81)
  }finally{await f.close()}
})
test('beta checklist is voluntary, version-scoped and isolated; stale edits cannot overwrite another device',async()=>{
  const f=await setup();try{
    const cookie=await login(f),initial=await(await f.call('/api/pilot/lab-checklist',undefined,cookie)).json()
    assert.equal(initial.revision,0);assert.equal(initial.steps.length,6)
    const steps=CHECKLIST_STEPS.map(step=>({id:step.id,status:step.id==='persistence'?'failed':'passed',note:step.id==='persistence'?'Nome voltou após reentrar':''}))
    const saved=await f.call('/api/pilot/lab-checklist',{expectedRevision:0,clientRelease:release,steps},cookie);assert.equal(saved.status,201)
    assert.equal((await f.call('/api/pilot/lab-checklist',{expectedRevision:0,clientRelease:release,steps:steps.map(s=>({...s,status:'passed'}))},cookie)).status,409)
    assert.equal((await f.call('/api/pilot/lab-checklist',{expectedRevision:1,clientRelease:'d'.repeat(40),steps},cookie)).status,409)
    assert.equal((await f.call('/api/pilot/lab-checklist',null,cookie)).status,400)
    assert.equal((await f.call('/api/pilot/lab-checklist')).status,401)
    const reread=await(await f.call('/api/pilot/lab-checklist',undefined,cookie)).json();assert.equal(reread.revision,1);assert.equal(reread.steps.find(s=>s.id==='persistence').status,'failed')
    const id=f.store.raw.prepare("SELECT account_id FROM lab_accounts WHERE slot='beta-01'").get().account_id
    assert.equal(JSON.parse(f.store.raw.prepare("SELECT data FROM pilot_records WHERE account_id=? AND collection='account_preferences'").get(id).data).bichu_privacy_analytics,'false')
    const analytics=readTestAnalytics(f.store,f.env,new URLSearchParams({release}));assert.equal(analytics.totals.checklists,1);assert.equal(analytics.totals.failedTasks,1);assert.equal(analytics.totals.events,0)
    assert.equal(analytics.versions.find(v=>v.release===release).checklists,1)
    await f.call('/api/lab/manage/activate',{slot:'beta-02',active:true},null,key);const other=await login(f,'beta-02');assert.equal((await(await f.call('/api/pilot/lab-checklist',undefined,other)).json()).revision,0)
    assert.equal((await f.call('/api/pilot/owner/labs/beta/analytics',undefined,cookie)).status,403)
    const dirty=await setup('dirty');try{const opened=await(await dirty.call('/api/lab/manage/open',{slot:'dirty'},null,key)).json(),r=await dirty.call('/api/lab/enter',{ticket:new URL(opened.url).hash.slice(5)});assert.equal((await dirty.call('/api/pilot/lab-checklist',undefined,r.headers.get('set-cookie').split(';')[0])).status,403)}finally{await dirty.close()}
  }finally{await f.close()}
})
test('diagnostics use trusted server version, strip private query data and record measured active time only with metrics enabled',async()=>{
  const f=await setup();try{
    const cookie=await login(f),id=f.store.raw.prepare("SELECT account_id FROM lab_accounts WHERE slot='beta-01'").get().account_id
    const payload={event:'api_response',durationMs:1700,deviceId:'device-test-01',details:{route:'/api/pilot/records/dogs/12345678-1234-1234-1234-123456789012?token=private',method:'PATCH',status:409,clientRelease:'d'.repeat(40),serverRelease:'forged',requestId:'correlation-id',password:'private'}}
    assert.equal((await(await f.call('/api/pilot/events',payload,cookie)).json()).disabled,true);assert.equal(f.store.raw.prepare('SELECT COUNT(*) n FROM pilot_events').get().n,0)
    f.store.raw.prepare("UPDATE pilot_records SET data=? WHERE account_id=? AND collection='account_preferences'").run(JSON.stringify({bichu_privacy_analytics:'true'}),id)
    assert.equal((await f.call('/api/pilot/events',payload,cookie)).status,201)
    const data=JSON.parse(f.store.raw.prepare("SELECT details FROM pilot_events WHERE event='api_response'").get().details);assert.equal(data.serverRelease,release);assert.equal(data.clientRelease,'d'.repeat(40));assert.equal(data.route,'/api/pilot/records/dogs/:id');assert.equal(data.password,undefined);assert.ok(!JSON.stringify(data).includes('private'))
    const pulse={deviceId:'device-test-01',activeMs:1000,clientRelease:release,route:'/peso',locationStatus:'off',browser:'Teste',screen:'400 × 800'}
    await f.call('/api/pilot/device',pulse,cookie);f.store.raw.prepare('UPDATE pilot_devices SET last_seen=? WHERE account_id=?').run(Date.now()-1500,id);await f.call('/api/pilot/device',pulse,cookie)
    const usage=f.store.raw.prepare("SELECT SUM(duration_ms) n FROM pilot_events WHERE event='active_time'").get().n;assert.equal(usage,1000)
    const result=readTestAnalytics(f.store,f.env,new URLSearchParams({release}));assert.equal(result.totals.activeMs,1000);assert.equal(result.totals.conflicts,1);assert.equal(result.totals.versionMismatchEvents,1)
    assert.ok(!JSON.stringify(result.devices).includes('latitude'))
  }finally{await f.close()}
})
test('main owner analytics restricts the matrix to original pilot 01 and exposes no other real accounts',async()=>{
  const f=await setup(null);try{
    for(const[id,email]of [['original','piloto01@meubichu.test'],['other','piloto02@meubichu.test']])f.store.raw.prepare('INSERT INTO pilot_accounts(id,email,password_salt,password_hash,created_at) VALUES(?,?,?,?,?)').run(id,email,'salt','hash',Date.now())
    for(const[id,account]of [['source-event','original'],['private-other','other']])f.store.raw.prepare('INSERT INTO pilot_events(id,account_id,event,duration_ms,created_at,details) VALUES(?,?,?,?,?,?)').run(id,account,'api_response',100,Date.now(),JSON.stringify({serverRelease:release,status:200}))
    assert.equal((await f.call('/api/pilot/owner/labs/matrix/analytics')).status,403)
    const unlock=await f.call('/api/pilot/owner/unlock',{token:panel}),cookie=unlock.headers.get('set-cookie').split(';')[0]
    const result=await(await f.call('/api/pilot/owner/labs/matrix/analytics',undefined,cookie)).json();assert.equal(result.matrixOriginal,true);assert.equal(result.totals.accounts,1);assert.equal(result.totals.measured,1);assert.equal(result.accounts[0].id,'original');assert.ok(!JSON.stringify(result).includes('private-other'))
    assert.equal(f.store.raw.prepare('SELECT COUNT(*) n FROM pilot_events').get().n,2)
  }finally{await f.close()}
})
