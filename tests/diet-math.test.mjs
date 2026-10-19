import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dietOptions, sumIngredients } from '../src/lib/diet-math.ts'
import { weightDate } from '../src/lib/weight-date.ts'
test('receita por gramagem, três cenários e nutrientes ausentes',()=>{
 const items=[{id:'1',name:'A',grams:200,kcal100:150,protein100:20,fat100:5,preparation:'cozido',source:'rótulo'},{id:'2',name:'B',grams:100,kcal100:100,protein100:2,fat100:1,preparation:'cozido',source:'rótulo'}]
 assert.deepEqual(sumIngredients(items),{grams:300,kcal:400,protein:42,fat:11})
 const options=dietOptions(items,800,{kcal_per_kg:4000,protein_pct:25,fat_pct:10})
 assert.equal(options.commercial.grams,200);assert.equal(options.natural.grams,600);assert.equal(options.natural.protein,84)
 assert.equal(options.mixed.commercialGrams,100);assert.equal(options.mixed.kcal,800);assert.equal(options.mixed.protein,67);assert.equal(options.mixed.fat,21)
 assert.equal(dietOptions(items,800,{kcal_per_kg:4000}).mixed.protein,null)
 assert.equal(dietOptions(items,200,{kcal_per_kg:4000}).mixed.commercialGrams,0)
})
test('datas civis de pesagem antigas e novas no Brasil',()=>{
 for(const iso of ['2026-09-30T00:00:00.000Z','2026-09-30T15:00:00.000Z']) assert.equal(weightDate(iso).toLocaleDateString('en-CA',{timeZone:'America/Sao_Paulo'}),'2026-09-30')
})
test('malha GLB incluída tem cobertura técnica BCS e MCS e buffers válidos',()=>{
 const b=readFileSync(new URL('../public/models/border-collie-illustrative.glb',import.meta.url))
 assert.equal(b.readUInt32LE(0),0x46546c67);assert.equal(b.readUInt32LE(8),b.length)
 const length=b.readUInt32LE(12),gltf=JSON.parse(b.subarray(20,20+length).toString())
 assert.equal(gltf.meshes[0].extras.targetNames.length,12)
 assert.ok(gltf.meshes[0].extras.targetNames.includes('BCS9'));assert.ok(gltf.meshes[0].extras.targetNames.includes('MCS_SEVERE'))
 for(const primitive of gltf.meshes[0].primitives){assert.equal(primitive.targets.length,12);assert.ok(gltf.accessors[primitive.attributes.POSITION].count>0)}
 for(const view of gltf.bufferViews) assert.ok(view.byteOffset+view.byteLength<=gltf.buffers[0].byteLength)
})
