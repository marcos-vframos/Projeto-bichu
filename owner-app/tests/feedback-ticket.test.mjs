import {test} from 'node:test'
import assert from 'node:assert/strict'
import worker from '../worker/index.js'
test('somente proprietário autoriza resposta e ticket vincula destinatário e conteúdo',async()=>{
 const env={PILOT_BRIDGE_KEY:'bridge-test',PILOT_DATA_ORIGIN:'https://pilot.test'},id=crypto.randomUUID(),body={message:'Obrigado pelo feedback',status:'respondido',replyId:crypto.randomUUID()}
 const req=(owner=true,origin='https://owner.test')=>new Request('https://owner.test/api/pilot/owner/feedback-ticket',{method:'POST',headers:{origin,'content-type':'application/json',...(owner?{'oai-authenticated-user-id':'owner'}:{})},body:JSON.stringify({id,body})})
 assert.equal((await worker.fetch(req(false),env)).status,403)
 assert.equal((await worker.fetch(req(true,'https://evil.test'),env)).status,403)
 const r=await worker.fetch(req(),env);assert.equal(r.status,200)
 const data=await r.json();assert.equal(data.path,`/api/pilot/owner/feedback/${id}/reply`);assert.deepEqual(JSON.parse(data.content),body)
 const [p]=data.ticket.split('.'),payload=JSON.parse(Buffer.from(p,'hex').toString())
 assert.equal(payload.aud,'owner-feedback-reply');assert.equal(payload.path,data.path)
 const hash=Buffer.from(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(data.content))).toString('hex');assert.equal(payload.hash,hash)
 assert.ok(payload.exp>Date.now());assert.ok(payload.exp<=Date.now()+120000)
})
