import {test} from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'

test('record client sends the editor revision for JSON and photos, preserves conflicts and refuses unstamped edits',async()=>{
  const calls=[],events=[]
  let conflict=false
  const source=ts.transpileModule(readFileSync('src/services/nutrition-pilot.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText
  const context={exports:{},require:name=>name.includes('offline-cache')?{accountKey:()=> 'one',cacheRead:()=>null,cacheWrite:()=>{}}:{logActivity:()=>Promise.resolve()},FormData,Response,crypto,performance,
    CustomEvent:class{constructor(type,options){this.type=type;this.detail=options?.detail}},
    window:{dispatchEvent:event=>events.push(event)},
    fetch:async(route,options)=>{calls.push({route,options});return conflict?Response.json({code:'RECORD_CONFLICT',error:'Mudou em outro aparelho.'},{status:409}):Response.json({id:'pet',revision:'next',weight_kg:12})},
  }
  vm.runInNewContext(source,context)
  const client=context.exports.pilotNutritionService
  const revision='a'.repeat(64)
  const saved=await client.updateDog('pet',{name:'Maze'},revision)
  assert.equal(calls.at(-1).options.headers['if-match'],'"'+revision+'"')
  assert.equal(saved.revision,'next');assert.equal(events.length,1)
  const photo=new FormData();photo.set('avatar',new Blob(['photo'],{type:'image/png'}),'pet.png')
  await client.updateDog('pet',photo,revision)
  assert.equal(calls.at(-1).options.headers['if-match'],'"'+revision+'"')
  assert.equal(calls.at(-1).options.headers['content-type'],undefined)
  const count=calls.length,notifications=events.length
  await assert.rejects(()=>client.updateDog('pet',{name:'No revision'}),/Reabra o registro/)
  assert.equal(calls.length,count)
  conflict=true
  await assert.rejects(()=>client.updateDog('pet',{name:'My draft'},revision),/Mudou em outro aparelho/)
  assert.equal(calls.length,count+1,'a conflict must not trigger an automatic overwrite/retry')
  assert.equal(events.length,notifications,'failed saves must not notify a successful pet change')
})
