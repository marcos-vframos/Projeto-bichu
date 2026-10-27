import {test} from 'node:test'
import assert from 'node:assert/strict'
import {mkdtemp,rm} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {openStore} from '../server/storage.mjs'
import {handlePilot} from '../worker/pilot-api.js'

async function fixture(run){
  const directory=await mkdtemp(join(tmpdir(),'bichu-record-conflict-')),store=openStore(directory)
  try{
    store.raw.prepare('INSERT INTO pilot_accounts(id,email,password_salt,password_hash,created_at) VALUES(?,?,?,?,?)').run('one','concurrency@local','salt','hash',Date.now())
    const env={DB:store.withActor('tutor'),BUCKET:store.BUCKET,OWNER_ACCESS_ACCOUNT:{id:'one'}}
    const call=(path,method='GET',body,revision)=>handlePilot(new Request('https://local/api/pilot/records/'+path,{method,headers:{origin:'https://local',...(body instanceof FormData?{}:{'content-type':'application/json'}),...(revision?{'if-match':'"'+revision+'"'}:{})},...(body?{body:body instanceof FormData?body:JSON.stringify(body)}:{})}),env)
    await run({store,call,env})
  }finally{store.close();await rm(directory,{recursive:true,force:true})}
}

test('two simultaneous pet editors cannot acknowledge a lost update or a phantom weighing',()=>fixture(async({call,store})=>{
  const pet=await(await call('dogs','POST',{name:'Maze',weight_kg:12})).json()
  const before=store.raw.prepare('SELECT COUNT(*) n FROM pilot_changes').get().n
  const responses=await Promise.all([
    call('dogs/'+pet.id,'PATCH',{name:'Luna'},pet.revision),
    call('dogs/'+pet.id,'PATCH',{weight_kg:15},pet.revision),
  ])
  assert.deepEqual(responses.map(r=>r.status).sort(),[200,409])
  const saved=await(await call('dogs/'+pet.id)).json()
  const nameWon=responses[0].ok
  assert.equal(saved.name,nameWon?'Luna':'Maze')
  assert.equal(saved.weight_kg,nameWon?12:15)
  assert.equal(store.raw.prepare("SELECT COUNT(*) n FROM pilot_records WHERE collection='weight_logs'").get().n,nameWon?1:2)
  assert.equal(store.raw.prepare('SELECT COUNT(*) n FROM pilot_changes').get().n-before,nameWon?1:2)
  const corrected=await call('dogs/'+pet.id,'PATCH',nameWon?{weight_kg:15}:{name:'Luna'},saved.revision)
  assert.equal(corrected.status,200)
  const final=await corrected.json()
  assert.equal(final.name,'Luna');assert.equal(final.weight_kg,15)
  assert.notEqual(final.revision,pet.revision)
}))

test('stale, missing and forged revisions are rejected; server metadata cannot be overwritten',()=>fixture(async({call,store})=>{
  const pet=await(await call('dogs','POST',{name:'Maze',weight_kg:12,revision:'forged'})).json()
  assert.match(pet.revision,/^[a-f0-9]{64}$/)
  assert.equal(JSON.parse(store.raw.prepare('SELECT data FROM pilot_records WHERE id=?').get(pet.id).data).revision,undefined)
  assert.equal((await call('dogs/'+pet.id,'PATCH',{name:'changed'})).status,428)
  assert.equal((await call('dogs/'+pet.id,'PATCH',{name:'changed'},'a'.repeat(64))).status,409)
  const saved=await(await call('dogs/'+pet.id,'PATCH',{name:'Luna'},pet.revision)).json()
  assert.equal((await call('dogs/'+pet.id,'PATCH',{name:'Old form'},pet.revision)).status,409)
  assert.equal((await(await call('dogs/'+pet.id)).json()).name,saved.name)
}))

test('health and routine completion can be changed repeatedly using the returned revision',()=>fixture(async({call})=>{
  const pet=await(await call('dogs','POST',{name:'Maze',weight_kg:12})).json()
  for(const collection of ['health_events','pet_routine_events']){
    const prior=await(await call(collection,'POST',{dog:pet.id,title:'Check',completed:false,event_date:'2026-10-27'})).json()
    const saved=await(await call(collection+'/'+prior.id,'PATCH',{completed:true},prior.revision)).json()
    assert.equal(saved.completed,true)
    assert.equal((await call(collection+'/'+prior.id,'PATCH',{title:'Stale title'},prior.revision)).status,409)
    const restored=await call(collection+'/'+prior.id,'PATCH',{completed:false},saved.revision)
    assert.equal(restored.status,200);assert.equal((await restored.json()).completed,false)
  }
}))

test('a multipart upload losing the race is removed without changing pet, weighing or file metadata',()=>fixture(async({call,store,env})=>{
  const pet=await(await call('dogs','POST',{name:'Maze',weight_kg:12})).json()
  const put=env.BUCKET.put.bind(env.BUCKET),deleted=[]
  let injected=false
  env.BUCKET.put=async(key,stream)=>{await put(key,stream);if(!injected){injected=true;assert.equal((await call('dogs/'+pet.id,'PATCH',{name:'Other device'},pet.revision)).status,200)}}
  const remove=env.BUCKET.delete.bind(env.BUCKET)
  env.BUCKET.delete=async key=>{deleted.push(key);await remove(key)}
  const form=new FormData();form.set('name','Stale photo edit');form.set('weight_kg','20');form.set('avatar',new File(['image'],'pet.png',{type:'image/png'}))
  const response=await call('dogs/'+pet.id,'PATCH',form,pet.revision)
  assert.equal(response.status,409)
  const final=await(await call('dogs/'+pet.id)).json()
  assert.equal(final.name,'Other device');assert.equal(final.weight_kg,12)
  assert.equal(store.raw.prepare('SELECT COUNT(*) n FROM pilot_files').get().n,0)
  assert.equal(store.raw.prepare("SELECT COUNT(*) n FROM pilot_records WHERE collection='weight_logs'").get().n,1)
  assert.equal(deleted.length,1);assert.equal(await env.BUCKET.get(deleted[0]),null)
}))
