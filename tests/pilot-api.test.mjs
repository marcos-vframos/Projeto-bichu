import { test } from 'node:test'
import assert from 'node:assert/strict'
import { DatabaseSync } from 'node:sqlite'
import { readFileSync, readdirSync } from 'node:fs'
import { handlePilot, pilotDay } from '../worker/pilot-api.js'

function database() {
  const db = new DatabaseSync(':memory:')
  for (const name of readdirSync(new URL('../drizzle/', import.meta.url)).filter(n => n.endsWith('.sql')).sort()) {
    db.exec(readFileSync(new URL(`../drizzle/${name}`, import.meta.url), 'utf8').replaceAll('--> statement-breakpoint', '\n'))
  }
  const wrap = sql => {
    let args = []
    return {
      bind(...values) { args = values; return this },
      first() { return db.prepare(sql).get(...args) || null },
      all() { return { results: db.prepare(sql).all(...args) } },
      run() { return db.prepare(sql).run(...args) },
    }
  }
  return { raw: db, api: { prepare: wrap, batch: statements => Promise.all(statements.map(s => s.run())) } }
}
function call(env, path, method = 'GET', body, cookie, admin = false, owner = false) {
  const headers = { origin: 'https://pilot.test' }
  if (body) headers['content-type'] = 'application/json'
  if (cookie) headers.cookie = cookie
  if (admin) headers.authorization = 'Bearer admin-test'
  if (owner) headers['oai-authenticated-user-id'] = 'd410baf1-83e0-4641-9a41-f44fc8c5025a'
  return handlePilot(new Request(`https://pilot.test/api/pilot/${path}`, { method, headers, body: body && JSON.stringify(body) }), env)
}

test('dez contas, primeira entrada, prazo de sete dias e isolamento', async () => {
  const { raw, api } = database()
  const env = { DB: api, BUCKET: { delete: async () => {} }, PILOT_ADMIN_KEY: 'admin-test', PILOT_PANEL_KEY: 'b'.repeat(64) }
  const accounts = Array.from({ length: 10 }, (_, i) => ({ email: `piloto${String(i + 1).padStart(2, '0')}@meubichu.test`, password: 'a'.repeat(47) + i.toString(16) }))
  assert.equal((await call(env, 'admin/provision', 'POST', accounts)).status, 403)
  assert.equal((await call(env, 'admin/provision', 'POST', accounts, null, true)).status, 201)
  assert.equal((await call(env, 'admin/provision', 'POST', accounts, null, true)).status, 409)
  const ownerExport = await (await call(env, 'admin/export?offset=0', 'GET', null, null, true)).json()
  assert.equal(ownerExport.accounts.length, 10)
  assert.equal(JSON.stringify(ownerExport).includes('password_hash'), false)
  const first = await call(env, 'login', 'POST', accounts[0])
  assert.equal(first.status, 200)
  const data = await first.json()
  assert.ok(data.expiresAt >= Date.now() + 7 * 86400000 - 5000)
  const cookie = first.headers.get('set-cookie').split(';')[0]
  const dog = await call(env, 'records/dogs', 'POST', { name: 'Luna', weight_kg: 12 }, cookie)
  assert.equal(dog.status, 201)
  const dogId = (await dog.clone().json()).id
  assert.equal((await call(env, 'records/weight_logs', 'POST', { dog: dogId, weight_kg: 12, logged_at: new Date().toISOString() }, cookie)).status, 201)
  assert.equal((await call(env, 'records/bcs_evaluations', 'POST', { dog: dogId, score: 5, evaluated_at: new Date().toISOString() }, cookie)).status, 409)
  raw.prepare("INSERT INTO pilot_records (id,account_id,collection,dog_id,data,created_at,updated_at) VALUES (?,?, 'bcs_evaluations',?,?,?,?)").run('historical-bcs',data.id,dogId,JSON.stringify({dog:dogId,score:5,evaluated_at:new Date().toISOString()}),new Date().toISOString(),new Date().toISOString())
  assert.equal((await call(env, 'events', 'POST', { event: 'api_response', durationMs: 250 }, cookie)).status, 201)
  assert.equal((await call(env, 'events', 'POST', { event: 'save_error', durationMs: 900 }, cookie)).status, 201)
  assert.equal((await call(env, 'owner/dashboard')).status, 403)
  assert.equal((await call(env, 'owner/unlock', 'POST', { token: 'c'.repeat(64) })).status, 403)
  const unlocked = await call(env, 'owner/unlock', 'POST', { token: env.PILOT_PANEL_KEY })
  assert.equal(unlocked.status, 200)
  assert.match(unlocked.headers.get('set-cookie'), /HttpOnly; Secure; SameSite=Strict/)
  const ownerCookie = unlocked.headers.get('set-cookie').split(';')[0]
  assert.equal((await call(env, 'owner/dashboard', 'GET', null, ownerCookie)).status, 200)
  const forged = ownerCookie.slice(0, -1) + (ownerCookie.endsWith('a') ? 'b' : 'a')
  assert.equal((await call(env, 'owner/dashboard', 'GET', null, forged)).status, 403)
  assert.equal((await call({ ...env, PILOT_PANEL_KEY: 'd'.repeat(64) }, 'owner/dashboard', 'GET', null, ownerCookie)).status, 403)
  const dashboard = await (await call(env, 'owner/dashboard', 'GET', null, null, false, true)).json()
  assert.equal(dashboard.accounts.length, 10)
  assert.equal(dashboard.pets[0].name, 'Luna')
  assert.equal(dashboard.weights[0].weightKg, 12)
  assert.equal(dashboard.bcs[0].score, 5)
  assert.equal(dashboard.accounts.find(a => a.email === accounts[0].email).petCount, 1)
  assert.equal(dashboard.accounts.find(a => a.email === accounts[0].email).avgMs, 250)
  assert.equal(dashboard.accounts.find(a => a.email === accounts[0].email).errors, 1)
  const manualFood = await (await call(env, 'records/user_foods', 'POST', { name: 'Ração informada', brand: 'Teste', kcal_per_kg: 3800, package_weight_kg: 10, package_price_brl: 150 }, cookie)).json()
  const loggedAgain = await call(env, 'login', 'POST', accounts[0])
  const renewedCookie = loggedAgain.headers.get('set-cookie').split(';')[0]
  const savedFood = await (await call(env, `records/user_foods/${manualFood.id}`, 'GET', null, renewedCookie)).json()
  assert.equal(savedFood.name, 'Ração informada')
  assert.equal(savedFood.kcal_per_kg, 3800)
  assert.equal(savedFood.front_photo, undefined)
  assert.equal((await (await call(env, `records/dogs/${dogId}`, 'GET', null, renewedCookie)).json()).name, 'Luna')
  const other = await call(env, 'login', 'POST', accounts[1])
  const otherCookie = other.headers.get('set-cookie').split(';')[0]
  assert.deepEqual(await (await call(env, 'records/dogs', 'GET', null, otherCookie)).json(), [])
  assert.equal((await call(env, `records/dogs/${dogId}`, 'GET', null, otherCookie)).status, 404)
  assert.equal((await call(env, 'owner/records')).status, 403)
  assert.equal((await call(env, 'owner/changes', 'GET', null, otherCookie)).status, 403)
  const health = await (await call(env, 'records/health_events', 'POST', { dog: dogId, title: 'Vacina', type: 'vacina', completed: false }, cookie)).json()
  await call(env, `records/health_events/${health.id}`, 'PATCH', { completed: true }, cookie)
  let changes = await (await call(env, 'owner/changes?collection=health_events', 'GET', null, ownerCookie)).json()
  assert.equal(changes.items.length, 2)
  const edit = changes.items.find(item => item.action === 'update')
  assert.equal(edit.before.completed, false)
  assert.equal(edit.after.completed, true)
  const meal = { label: 'Jantar', grams: 100, time: '19:00' }
  const daily = { dog: dogId, meal, slot: 1, completed: true, day: pilotDay() }
  assert.equal((await call(env, 'daily-meals', 'POST', daily, otherCookie)).status, 403)
  assert.equal((await call(env, 'daily-meals', 'POST', { ...daily, day: '2000-01-01' }, cookie)).status, 409)
  assert.equal((await call(env, 'daily-meals', 'POST', daily, cookie)).status, 200)
  assert.equal((await call(env, 'daily-meals', 'POST', { ...daily, completed: false }, cookie)).status, 200)
  assert.equal((await call(env, 'daily-meals', 'POST', daily, cookie)).status, 200)
  const today = await (await call(env, `daily-meals?dog=${dogId}`, 'GET', null, cookie)).json()
  assert.equal(today.confirmations.length, 1)
  assert.equal(today.confirmations[0].completed, true)
  const realNow = Date.now
  try {
    const nextDay = realNow() + 86400000
    Date.now = () => nextDay
    assert.equal((await (await call(env, `daily-meals?dog=${dogId}`, 'GET', null, cookie)).json()).confirmations.length, 0)
    assert.equal((await call(env, 'daily-meals', 'POST', { ...daily, day: pilotDay() }, cookie)).status, 200)
  } finally { Date.now = realNow }
  assert.equal((await (await call(env, 'owner/records?collection=meal_confirmations', 'GET', null, ownerCookie)).json()).items.length, 2)
  assert.equal(pilotDay(Date.parse('2026-09-30T02:59:59Z')), '2026-09-29')
  assert.equal(pilotDay(Date.parse('2026-09-30T03:00:00Z')), '2026-09-30')
  assert.equal((await call(env, 'records/dogs', 'POST', { name: 'Mia', species: 'felina', weight_kg: 4 }, cookie)).status, 201)
  // Personalização durável e isolada, datas civis e alterações de peso em qualquer tela.
  const preferences = { bichu_tutor_name: 'Marcos', bichu_selected_header_logo: 'paw-tear', bichu_theme: 'clean-marine' }
  assert.equal((await call(env, 'preferences', 'PUT', preferences, cookie)).status, 200)
  assert.deepEqual(await (await call(env, 'preferences', 'GET', null, renewedCookie)).json(), preferences)
  assert.deepEqual(await (await call(env, 'preferences', 'GET', null, otherCookie)).json(), {})
  const firstLog = await (await call(env, 'records/weight_logs', 'POST', { dog: dogId, weight_kg: 13, logged_at: '2026-09-28T12:00:00-03:00' }, cookie)).json()
  const nextLog = await (await call(env, 'records/weight_logs', 'POST', { dog: dogId, weight_kg: 14, logged_at: '2026-09-29T12:00:00-03:00' }, cookie)).json()
  assert.notEqual(firstLog.logged_at, nextLog.logged_at)
  assert.equal(new Date(firstLog.logged_at).toLocaleDateString('en-CA',{timeZone:'America/Sao_Paulo'}),'2026-09-28')
  const beforeCount = (await (await call(env, 'records/weight_logs', 'GET', null, cookie)).json()).length
  await call(env, `records/dogs/${dogId}`, 'PATCH', {weight_kg:15}, cookie)
  const weightsAfterEdit = await (await call(env, 'records/weight_logs', 'GET', null, cookie)).json()
  assert.equal(weightsAfterEdit.length,beforeCount+1)
  assert.equal(weightsAfterEdit.find(w=>w.source==='cadastro_alterado').weight_kg,15)
  const pendingCount=weightsAfterEdit.length
  await call(env, `records/dogs/${dogId}`, 'PATCH', {name:'Maze'}, cookie)
  assert.equal((await (await call(env, 'records/weight_logs', 'GET', null, cookie)).json()).length,pendingCount)
  const recipe={dog:dogId,ingredients:[{name:'Receita prescrita',grams:100,kcal100:150,protein100:20,fat100:5,source:'Rótulo'}],target:600}
  assert.equal((await call(env,'records/natural_diets','POST',recipe,cookie)).status,201)
  assert.equal((await call(env,'records/natural_diets','POST',recipe,otherCookie)).status,403)
  const payload={deviceId:'device_test_01',browser:'Teste',screen:'360 × 800',activeMs:999999,locationStatus:'granted',location:{latitude:-23,longitude:-45,accuracy:20}}
  await call(env,'device','POST',payload,cookie)
  raw.prepare('UPDATE pilot_devices SET last_seen = ?').run(Date.now()-15000)
  await call(env,'device','POST',payload,cookie)
  const device=raw.prepare('SELECT * FROM pilot_devices').get()
  assert.ok(device.active_ms<=30000&&device.active_ms>=15000)
  assert.equal(JSON.parse(device.data).location.accuracy,20)
  await call(env,'device','POST',{...payload,locationStatus:'off'},cookie)
  assert.equal(JSON.parse(raw.prepare('SELECT * FROM pilot_devices').get().data).location,undefined)
  assert.equal((await call(env,'events','POST',{event:'navigation',durationMs:0,deviceId:payload.deviceId,details:{route:'/peso'}},cookie)).status,201)
  const activity=await (await call(env,'owner/activity?accounts='+data.id+'&device='+payload.deviceId,'GET',null,ownerCookie)).json()
  assert.equal(activity.items.filter(event=>event.event==='navigation').length,1)
  assert.equal(activity.items.find(event=>event.event==='navigation').details.route,'/peso')
  assert.ok(activity.items.every(event=>event.accountId===data.id&&event.deviceId===payload.deviceId))
  assert.equal(activity.items.filter(event=>event.event==='active_time').reduce((total,event)=>total+event.durationMs,0),raw.prepare('SELECT active_ms FROM pilot_devices').get().active_ms)
  assert.equal((await call(env,'owner/activity','GET',null,cookie)).status,403)
  const filtered=await (await call(env,'owner/records?accounts='+data.id+'&collection=natural_diets','GET',null,ownerCookie)).json()
  assert.equal(filtered.items.length,1)
  const petArea=await (await call(env,'owner/records?accounts='+data.id+'&scope=pets','GET',null,ownerCookie)).json()
  const accountArea=await (await call(env,'owner/records?accounts='+data.id+'&scope=accounts','GET',null,ownerCookie)).json()
  const fullArea=await (await call(env,'owner/records?accounts='+data.id,'GET',null,ownerCookie)).json()
  assert.ok(petArea.items.every(r=>r.collection==='dogs'||r.dog_id!==null))
  assert.ok(accountArea.items.every(r=>r.collection!=='dogs'&&r.dog_id===null))
  assert.equal(petArea.items.length+accountArea.items.length,fullArea.items.length)

  await call(env, `records/dogs/${dogId}`, 'DELETE', null, cookie)
  assert.equal((await (await call(env, 'owner/records?collection=health_events', 'GET', null, ownerCookie)).json()).items.length, 0)
  changes = await (await call(env, 'owner/changes?collection=health_events', 'GET', null, ownerCookie)).json()
  assert.equal(changes.items.find(item => item.action === 'delete').before.title, 'Vacina')
  const separatedEnv = { ...env, PILOT_PANEL_ORIGIN: 'https://admin.test', PILOT_BRIDGE_KEY: 'bridge-secret' }
  assert.equal((await call(separatedEnv, 'owner/dashboard', 'GET', null, ownerCookie)).status, 403)
  const bridgeRequest = new Request('https://pilot.test/api/pilot/owner/dashboard', { headers: { authorization: 'Bearer bridge-secret' } })
  assert.equal((await handlePilot(bridgeRequest, separatedEnv)).status, 200)
  const ticketKey = await crypto.subtle.importKey('raw', new TextEncoder().encode('bridge-secret'), {name:'HMAC',hash:'SHA-256'}, false, ['sign'])
  const ticketPayload = JSON.stringify({aud:'owner-read',exp:Date.now()+120000,nonce:'test'})
  const signature = Buffer.from(await crypto.subtle.sign('HMAC', ticketKey, new TextEncoder().encode(ticketPayload))).toString('hex')
  const ticket = `${Buffer.from(ticketPayload).toString('hex')}.${signature}`
  const read = (origin, value = ticket) => new Request('https://pilot.test/api/pilot/owner/dashboard', {headers:{origin,'x-mb-owner-ticket':value}})
  const privateData = await handlePilot(read('https://admin.test'), separatedEnv)
  assert.equal(privateData.status,200)
  assert.equal(privateData.headers.get('access-control-allow-origin'),'https://admin.test')
  assert.equal((await privateData.json()).accounts.length,10)
  assert.equal((await handlePilot(read('https://evil.test'), separatedEnv)).status,403)
  assert.equal((await handlePilot(read('https://admin.test', ticket.slice(0,-1)+(ticket.endsWith('a')?'b':'a')), separatedEnv)).status,403)
  const preflight = new Request('https://pilot.test/api/pilot/owner/dashboard', {method:'OPTIONS',headers:{origin:'https://admin.test','access-control-request-method':'GET','access-control-request-headers':'x-mb-owner-ticket'}})
  assert.equal((await handlePilot(preflight,separatedEnv)).status,204)
  const expiredNow = Date.now
  try { Date.now = () => expiredNow() + 120001; assert.equal((await handlePilot(read('https://admin.test'),separatedEnv)).status,403) } finally { Date.now = expiredNow }
  raw.prepare('UPDATE pilot_accounts SET expires_at = ? WHERE email = ?').run(Date.now() - 1, accounts[0].email)
  assert.equal((await call(env, 'me', 'GET', null, cookie)).status, 401)
  assert.equal((await call(env, 'login', 'POST', accounts[0])).status, 403)
})

test('resumo: totais completos, dias de Brasília, evidências e feedback isolado', async () => {
 const {raw,api}=database(),env={DB:api,BUCKET:{delete:async()=>{}},PILOT_ADMIN_KEY:'admin-test'}
 const creds=Array.from({length:10},(_,i)=>({email:`piloto${String(i+1).padStart(2,'0')}@meubichu.test`,password:'a'.repeat(47)+i.toString(16)}))
 await call(env,'admin/provision','POST',creds,null,true)
 const login=await call(env,'login','POST',creds[0]),account=await login.json(),cookie=login.headers.get('set-cookie').split(';')[0]
 raw.prepare('UPDATE pilot_accounts SET first_access_at=? WHERE id=?').run(Date.parse('2026-10-07T02:50:00Z'),account.id)
 const insert=raw.prepare('INSERT INTO pilot_events (id,account_id,event,duration_ms,created_at) VALUES (?,?,?,?,?)')
 insert.run('day1',account.id,'page_load',0,Date.parse('2026-10-07T02:55:00Z'))
 insert.run('day2',account.id,'navigation',0,Date.parse('2026-10-07T03:05:00Z'))
 insert.run('background',account.id,'api_response',1,Date.parse('2026-10-08T12:00:00Z'))
 for(let i=0;i<10002;i++)insert.run(`error${i}`,account.id,'save_error',0,Date.now())
 const dog=await (await call(env,'records/dogs','POST',{name:'Luna',weight_kg:12},cookie)).json()
 await call(env,'records/weight_logs','POST',{dog:dog.id,weight_kg:13,logged_at:new Date(Date.now()+1000).toISOString()},cookie)
 const meal={dog:dog.id,meal:{label:'Almoço',time:'12:00',grams:100},slot:0,completed:true,day:pilotDay()}
 await call(env,'daily-meals','POST',meal,cookie);await call(env,'daily-meals','POST',meal,cookie)
 await call(env,'daily-meals','POST',{...meal,slot:1,completed:false},cookie)
 await call(env,'records/health_events','POST',{dog:dog.id,title:'Consulta futura',event_date:pilotDay(Date.now()+86400000),completed:false},cookie)
 await call(env,'records/health_events','POST',{dog:dog.id,title:'Já concluída',event_date:pilotDay(),completed:true},cookie)
 assert.equal((await call(env,'records/pilot_feedback','POST',{category:'dificuldade',message:'Não encontrei a agenda'},cookie)).status,201)
 assert.equal((await call(env,'records/pilot_feedback','POST',{category:'outra',message:'x'},cookie)).status,400)
 assert.equal((await call(env,'owner/participants','GET',null,cookie)).status,403)
 const result=await (await call(env,'owner/participants','GET',null,null,false,true)).json(),a=result.items.find(a=>a.id===account.id)
 assert.equal(a.days,2);assert.equal(a.meals,1);assert.equal(a.errors,10002);assert.equal(a.feedback,1)
 assert.equal(a.weight.weight_kg,13);assert.equal(a.health.title,'Consulta futura')
 const evidence=async metric=>(await call(env,`owner/participants?account=${account.id}&metric=${metric}`,'GET',null,null,false,true)).json()
 assert.deepEqual((await evidence('days')).items.map(r=>r.day),['2026-10-07','2026-10-06'])
 assert.equal((await evidence('meals')).items.length,1);assert.equal((await evidence('health')).items.length,1)
 const errors=await evidence('errors');assert.equal(errors.items.length,100);assert.equal(errors.nextOffset,100)
 assert.equal((await evidence('feedback')).items[0].data.message,'Não encontrei a agenda')
 const other=await call(env,'login','POST',creds[1]),otherCookie=other.headers.get('set-cookie').split(';')[0]
 assert.deepEqual(await (await call(env,'records/pilot_feedback','GET',null,otherCookie)).json(),[])
 raw.close()
})

test('adoção usa histórico dentro da janela, ignora ruído e preserva ações depois da exclusão',async()=>{
 const {raw,api}=database(),env={DB:api,BUCKET:{}}
 const DAY=86400000,now=Date.now(),start=now-7*DAY-1000
 const accountInsert=raw.prepare('INSERT INTO pilot_accounts (id,email,password_salt,password_hash,created_at,first_access_at,expires_at) VALUES (?,?,?,?,?,?,?)')
 accountInsert.run('ended','ended@test','salt','hash',start,start,start+7*DAY)
 accountInsert.run('ongoing','ongoing@test','salt','hash',now,now-1000,now+7*DAY-1000)
 accountInsert.run('not-started','not-started@test','salt','hash',now,null,null)
 const insert=raw.prepare('INSERT INTO pilot_changes (id,account_id,record_id,collection,action,before_data,after_data,changed_at) VALUES (?,?,?,?,?,?,?,?)')
 const add=(id,collection,after,time,before=null,action='create',account='ended')=>insert.run(id,account,id,collection,action,before?JSON.stringify(before):null,after?JSON.stringify(after):null,time)
 add('day1','health_events',{title:'Consulta'},start+1000)
 add('day2','meal_confirmations',{completed:true},start+DAY)
 add('day4','weight_logs',{weight_kg:12,logged_at:'2020-01-01'},start+3*DAY)
 add('day6','pet_routine_events',{title:'Medicação'},start+5*DAY)
 add('setup','weight_logs',{source:'cadastro_inicial',weight_kg:12},start+2*DAY)
 add('prefs','account_preferences',{bichu_tutor_name:'Maze'},start+2*DAY)
 add('noop','health_events',{title:'Consulta'},start+2*DAY,{title:'Consulta'},'update')
 add('already-confirmed','meal_confirmations',{completed:true,confirmed_at:'new'},start+2*DAY,{completed:true},'update')
 add('auto-plan','feeding_plans',{is_active:false},start+2*DAY,{is_active:true},'update')
 add('too-early','health_events',{title:'Anterior'},start-1)
 add('boundary-end','health_events',{title:'Fora'},start+7*DAY)
 add('deleted','health_events',null,start+2*DAY,{title:'Consulta'},'delete')
 add('future','health_events',{title:'Futuro'},now+100000,null,'create','ongoing')
 add('ongoing-action','health_events',{title:'Consulta'},now-500,null,'create','ongoing')
 const r=await (await call(env,'owner/participants','GET',null,null,false,true)).json()
 const ended=r.items.find(a=>a.id==='ended').adoption
 assert.equal(ended.status,'criterion_met');assert.equal(ended.usefulDays,4);assert.equal(ended.returnedAtEnd,true)
 assert.deepEqual(ended.timeline.map(d=>d.period),[1,2,4,6])
 assert.equal(r.items.find(a=>a.id==='ongoing').adoption.status,'in_progress')
 assert.equal(r.items.find(a=>a.id==='ongoing').adoption.usefulDays,1)
 assert.equal(r.items.find(a=>a.id==='not-started').adoption.status,'not_started')
 const evidence=await (await call(env,'owner/participants?account=ended&metric=adoption','GET',null,null,false,true)).json()
 assert.deepEqual(evidence.items.map(r=>r.record_id),['day6','day4','day2','day1'])
 assert.equal((await call(env,'owner/participants?account=ended&metric=adoption')).status,403)
 raw.close()
})

test('respostas do proprietário: autorização limitada, isolamento e repetição sem duplicação',async()=>{
 const {raw,api}=database(),env={DB:api,BUCKET:{},PILOT_ADMIN_KEY:'admin-test'}
 const creds=Array.from({length:10},(_,i)=>({email:`piloto${String(i+1).padStart(2,'0')}@meubichu.test`,password:'a'.repeat(47)+i.toString(16)}))
 await call(env,'admin/provision','POST',creds,null,true)
 const login=await call(env,'login','POST',creds[0]),cookie=login.headers.get('set-cookie').split(';')[0]
 const feedback=await (await call(env,'records/pilot_feedback','POST',{category:'dificuldade',message:'Não encontrei a agenda',status:'resolvido',replies:[{message:'Resposta falsa'}]},cookie)).json()
 assert.equal(feedback.status,'recebido');assert.deepEqual(feedback.replies,[])
 assert.equal((await call(env,`records/pilot_feedback/${feedback.id}`,'PATCH',{replies:[{message:'falsa'}]},cookie)).status,403)
 const bridgeEnv={...env,PILOT_BRIDGE_KEY:'secure-test',PILOT_PANEL_ORIGIN:'https://owner.test'}
 const path=`/api/pilot/owner/feedback/${feedback.id}/reply`,body={message:'A agenda está na Saúde Assistida.',status:'respondido',replyId:crypto.randomUUID()},content=JSON.stringify(body)
 const hex=b=>[...new Uint8Array(b)].map(v=>v.toString(16).padStart(2,'0')).join(''),enc=new TextEncoder()
 const hash=hex(await crypto.subtle.digest('SHA-256',enc.encode(content))),payload=enc.encode(JSON.stringify({aud:'owner-feedback-reply',path,hash,exp:Date.now()+60000}))
 const key=await crypto.subtle.importKey('raw',enc.encode('secure-test'),{name:'HMAC',hash:'SHA-256'},false,['sign'])
 const ticket=`${hex(payload)}.${hex(await crypto.subtle.sign('HMAC',key,payload))}`
 const reply=(text=content,target=path,t=ticket)=>handlePilot(new Request(`https://pilot.test${target}`,{method:'POST',headers:{origin:'https://owner.test','content-type':'application/json','x-mb-owner-ticket':t},body:text}),bridgeEnv)
 assert.equal((await reply(content,path,'')).status,403)
 assert.equal((await reply(JSON.stringify({...body,message:'Tampered'}))).status,403)
 assert.equal((await reply(content,`/api/pilot/owner/feedback/${crypto.randomUUID()}/reply`)).status,403)
 assert.equal((await reply()).status,200);assert.equal((await reply()).status,200)
 const saved=await (await call(env,`records/pilot_feedback/${feedback.id}`,'GET',null,cookie)).json()
 assert.equal(saved.status,'respondido');assert.equal(saved.replies.length,1);assert.equal(saved.replies[0].message,body.message)
 const second=await call(env,'login','POST',creds[1]),other=second.headers.get('set-cookie').split(';')[0]
 assert.equal((await call(env,`records/pilot_feedback/${feedback.id}`,'GET',null,other)).status,404)
 raw.close()
})

test('privacidade interrompe telemetria no servidor e exclusão remove somente a conta confirmada',async()=>{
 const {raw,api}=database(),env={DB:api,BUCKET:{delete:async()=>{}},PILOT_ADMIN_KEY:'admin-test'}
 const creds=Array.from({length:10},(_,i)=>({email:`piloto${String(i+1).padStart(2,'0')}@meubichu.test`,password:'a'.repeat(47)+i.toString(16)}))
 await call(env,'admin/provision','POST',creds,null,true);const login=await call(env,'login','POST',creds[0]),a=await login.json(),cookie=login.headers.get('set-cookie').split(';')[0]
 await call(env,'records/dogs','POST',{name:'Luna',weight_kg:12},cookie)
 await call(env,'preferences','PUT',{bichu_privacy_analytics:'false'},cookie)
 assert.equal((await (await call(env,'events','POST',{event:'page_load',durationMs:5},cookie)).json()).disabled,true)
 assert.equal((await (await call(env,'device','POST',{deviceId:'device-one'},cookie)).json()).disabled,true)
 assert.equal(raw.prepare('SELECT COUNT(*) AS n FROM pilot_events WHERE account_id=?').get(a.id).n,0)
 assert.equal((await call(env,'account','DELETE',{confirmation:'NÃO'},cookie)).status,400)
 assert.equal((await call(env,'account','DELETE',{confirmation:'EXCLUIR'},cookie)).status,200)
 for(const t of ['pilot_records','pilot_changes','pilot_files','pilot_events','pilot_devices','pilot_sessions'])assert.equal(raw.prepare(`SELECT COUNT(*) AS n FROM ${t} WHERE account_id=?`).get(a.id).n,0)
 assert.equal(raw.prepare('SELECT COUNT(*) AS n FROM pilot_accounts').get().n,9)
 assert.equal((await call(env,'me','GET',null,cookie)).status,401)
 raw.close()
})

test('carga local: mil contas, dez mil registros, paginação e isolamento',async()=>{
 const {raw,api}=database(),env={DB:api,BUCKET:{}}
 const now=Date.now(),enc=new TextEncoder(),hex=b=>Buffer.from(b).toString('hex'),insertA=raw.prepare('INSERT INTO pilot_accounts (id,email,password_salt,password_hash,created_at,first_access_at,expires_at) VALUES (?,?,?,?,?,?,?)'),insertR=raw.prepare("INSERT INTO pilot_records (id,account_id,collection,data,created_at,updated_at) VALUES (?,?,'user_foods',?,?,?)")
 for(let i=0;i<1000;i++){insertA.run(`a${i}`,`a${i}@test`,'salt','hash',now,now,now+86400000);for(let j=0;j<10;j++)insertR.run(`r${i}-${j}`,`a${i}`,JSON.stringify({name:`Food ${i}-${j}`}),new Date().toISOString(),new Date().toISOString())}
 const token='a'.repeat(48),hash=hex(await crypto.subtle.digest('SHA-256',enc.encode(token)))
 raw.prepare('INSERT INTO pilot_sessions VALUES (?,?,?)').run(hash,'a500',now+86400000)
 const r=await call(env,'records/user_foods?page=1','GET',null,`mb_pilot=${token}`),data=await r.json()
 assert.equal(data.items.length,10);assert.ok(data.items.every(r=>r.name.startsWith('Food 500-')));assert.equal(data.nextPage,null)
 assert.equal((await call(env,'records/user_foods/r499-1','GET',null,`mb_pilot=${token}`)).status,404)
 for(let j=10;j<460;j++)insertR.run(`r500-${j}`,'a500',JSON.stringify({name:`Food 500-${j}`}),new Date().toISOString(),new Date().toISOString())
 const first=await (await call(env,'records/user_foods?page=1','GET',null,`mb_pilot=${token}`)).json(),second=await (await call(env,'records/user_foods?page=2','GET',null,`mb_pilot=${token}`)).json()
 assert.equal(first.items.length,200);assert.equal(second.items.length,200);assert.equal(first.nextPage,2);assert.equal(second.nextPage,3)
 assert.equal(new Set([...first.items,...second.items].map(r=>r.id)).size,400)
 raw.close()
})

test('conta expirada pode excluir dados com credenciais, sem reativar acesso',async()=>{const{raw,api}=database();const env={DB:api,BUCKET:{delete:async()=>{}},PILOT_ADMIN_KEY:'admin-test'};const accounts=Array.from({length:10},(_,i)=>({email:`piloto${String(i+1).padStart(2,'0')}@meubichu.test`,password:'a'.repeat(48)}));await call(env,'admin/provision','POST',accounts,null,true);raw.prepare('UPDATE pilot_accounts SET first_access_at=1,expires_at=2').run();assert.equal((await call(env,'login','POST',accounts[0])).status,403);assert.equal((await call(env,'erase-account','POST',{...accounts[0],password:'wrong',confirmation:'EXCLUIR'})).status,401);assert.equal((await call(env,'erase-account','POST',{...accounts[0],confirmation:'EXCLUIR'})).status,200);assert.equal(raw.prepare('SELECT COUNT(*) n FROM pilot_accounts').get().n,9);raw.close()});
