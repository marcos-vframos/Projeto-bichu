import {test} from 'node:test'
import assert from 'node:assert/strict'
import {mkdtemp,rm} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {openStore} from '../server/storage.mjs'
import {handlePilot} from '../worker/pilot-api.js'
async function fixture(run){const dir=await mkdtemp(join(tmpdir(),'bichu-sync-')),store=openStore(dir);try{store.raw.prepare('INSERT INTO pilot_accounts(id,email,password_salt,password_hash,created_at) VALUES(?,?,?,?,?)').run('one','test@local','salt','hash',Date.now());const env={DB:store.withActor('tutor'),BUCKET:store.BUCKET,OWNER_ACCESS_ACCOUNT:{id:'one'}};const call=async(path,method='GET',body,headers={})=>{if(method==='PATCH'&&path.startsWith('records/')){const current=await call(path);if(current.ok)headers={...headers,'if-match':'"'+(await current.json()).revision+'"'}}return handlePilot(new Request('https://local/api/pilot/'+path,{method,headers:{origin:'https://local','content-type':'application/json',...headers},...(body?{body:JSON.stringify(body)}:{})}),env)};await run({store,env,call})}finally{store.close();await rm(dir,{recursive:true,force:true})}}
test('two devices merge disjoint edits, reject stale edits, preserve deletions and isolate account',()=>fixture(async({call})=>{
 const patch=(changes,base)=>call('preferences','PATCH',{changes,base})
 assert.equal((await patch({bichu_name:'Maze'},{bichu_name:null})).status,200)
 assert.equal((await patch({bichu_color:'blue'},{bichu_color:null})).status,200)
 const conflict=await patch({bichu_name:'Sam'},{bichu_name:null});assert.equal(conflict.status,409)
 assert.deepEqual(await(await call('preferences')).json(),{bichu_name:'Maze',bichu_color:'blue'})
 assert.equal((await patch({bichu_name:null},{bichu_name:'Maze'})).status,200)
 assert.deepEqual(await(await call('preferences')).json(),{bichu_color:'blue'})
 assert.equal((await call('preferences','PATCH',{changes:{bichu_name:'wrong'},base:{bichu_name:null}},{'x-mb-account-id':'two'})).status,409)
 assert.equal((await call('records/account_preferences','POST',{bichu_name:'bypass'})).status,403)
}))
test('pet, weight and audit roll back together; failed plan preserves active plan',()=>fixture(async({store,call})=>{
 const dog=await(await call('records/dogs','POST',{name:'Maze',weight_kg:12})).json()
 store.raw.exec("CREATE TRIGGER reject_weight BEFORE INSERT ON pilot_records WHEN NEW.collection='weight_logs' BEGIN SELECT RAISE(ABORT,'test failure'); END")
 const n=store.raw.prepare('SELECT COUNT(*) n FROM pilot_changes').get().n
 await assert.rejects(()=>call('records/dogs/'+dog.id,'PATCH',{weight_kg:15}))
 assert.equal((await(await call('records/dogs/'+dog.id)).json()).weight_kg,12)
 assert.equal(store.raw.prepare('SELECT COUNT(*) n FROM pilot_changes').get().n,n)
 store.raw.exec('DROP TRIGGER reject_weight')
 await call('records/feeding_plans','POST',{dog:dog.id,is_active:true,label:'old'})
 store.raw.exec("CREATE TRIGGER reject_plan BEFORE INSERT ON pilot_records WHEN NEW.collection='feeding_plans' BEGIN SELECT RAISE(ABORT,'test failure'); END")
 await assert.rejects(()=>call('records/feeding_plans','POST',{dog:dog.id,is_active:true,label:'new'}))
 const plans=await(await call('records/feeding_plans')).json();assert.equal(plans.length,1);assert.equal(plans[0].is_active,true)
 assert.ok(store.raw.prepare("SELECT 1 FROM pilot_changes WHERE actor_type='tutor'").get())
}))
