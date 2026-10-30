import {test} from 'node:test'
import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
import {enterMaster} from '../team/master-access.js'
test('dirty entry authenticates centrally, never sends master password to a lab, and leaves the iframe before opening the isolated account',async()=>{
 const calls=[],credentials={email:'creator@example.test',password:'fictional-only',area:'dirty'}
 const url=await enterMaster(credentials,async(path,options)=>{calls.push({path,...options});return Response.json(calls.length===1?{redirect:'/painel'}:{url:'https://bichu-testes-sujos-production.up.railway.app/#lab='+'a'.repeat(48)})})
 assert.equal(JSON.parse(calls[0].body).area,'proprietario');assert.equal(calls[0].path,'/api/access/master/login');assert.equal(calls[1].path,'/api/pilot/owner/labs/dirty/open');assert.deepEqual(JSON.parse(calls[1].body),{slot:'dirty'});assert.equal(calls[1].body.includes(credentials.password),false)
 assert.equal(new URL(url).search,'');assert.equal(new URL(url).hash,'#lab='+'a'.repeat(48))
 const page=await readFile(new URL('../team/master-access.html',import.meta.url),'utf8');assert.ok(page.includes('value="dirty"'));assert.ok(page.includes('/team-ui/master-access.js'))
 const dashboard=await readFile(new URL('../owner-app/src/pages/OwnerDashboard.tsx',import.meta.url),'utf8');assert.ok(dashboard.includes("label:'Acesso master'"));assert.ok(dashboard.includes("openWorkspace('/acesso-master')"))
})
test('invalid credentials cannot request a lab ticket and malformed lab destinations are refused',async()=>{
 let n=0;await assert.rejects(()=>enterMaster({area:'dirty'},async()=>{n++;return Response.json({error:'Credenciais inválidas'},{status:401})}),/Credenciais inválidas/);assert.equal(n,1)
 n=0;await assert.rejects(()=>enterMaster({area:'dirty'},async()=>Response.json(++n===1?{redirect:'/painel'}:{url:'https://other.invalid/#lab='+'a'.repeat(48)})),/endereço de acesso inválido/)
 let count=0;assert.equal(await enterMaster({area:'matriz'},async()=>{count++;return Response.json({redirect:'/'})}),'/');assert.equal(count,1)
})
