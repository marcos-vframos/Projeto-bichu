import {test} from 'node:test'
import assert from 'node:assert/strict'
import {readFile,mkdtemp,rm} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import ts from 'typescript'
import vm from 'node:vm'
import {createApplication} from '../server/index.mjs'
test('switching the pet preserves the destination and never points a different name at the previous pet editor',async()=>{
 const source=await readFile(new URL('../src/lib/dirty-presence.ts',import.meta.url),'utf8'),module={exports:{}};vm.runInNewContext(ts.transpile(source,{module:ts.ModuleKind.CommonJS}),{module,exports:module.exports});const {petDestination}=module.exports
 for(const path of ['/caes/old/peso','/caes/old/saude','/caes/old/editar','/caes/old/plano','/caes/old'])assert.equal(petDestination(path,'new'),path.replace('/old','/new'))
 assert.equal(petDestination('/caes/novo','new'),'/caes/novo');assert.equal(petDestination('/comparador','new'),'/comparador');assert.equal(petDestination('/rotina-da-casa','new'),'/')
})
test('laboratory master entry sends users to the central portal, without replicating credentials or activating beta accounts',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'bichu-dirty-latest-')),app=createApplication({env:{DATA_DIR:dir,APP_ORIGIN:'https://dirty.test',LAB_KIND:'dirty',LAB_CONTROL_KEY:'b'.repeat(64),PILOT_PANEL_KEY:'a'.repeat(64)}})
 try{const r=await app.dispatch(new Request('https://dirty.test/acesso-master'));assert.equal(r.status,200);const html=await r.text();assert.ok(html.includes('https://meu-bichu-app-production.up.railway.app/acesso-master?area=dirty'));assert.ok(html.includes('target="_top"'));assert.equal(app.store.raw.prepare('SELECT COUNT(*) n FROM pilot_accounts').get().n,1)}finally{app.store.close();await rm(dir,{recursive:true,force:true})}
})
test('dirty visual keeps real nutrition, health and library components and discloses illustrative pet cutouts',async()=>{
 const home=await readFile(new URL('../src/components/LabPetPresence.tsx',import.meta.url),'utf8');assert.ok(home.includes('Representação ilustrativa'));assert.ok(home.includes('nutritionService.getAvatarUrl(pet)'));assert.ok(home.includes('<TodayOverview'));assert.ok(home.includes('<DietPlanSummary'));assert.equal(home.includes('setCurrentDynamicHeroTheme'),false)
 const family=await readFile(new URL('../src/pages/LabHousehold.tsx',import.meta.url),'utf8');assert.ok(family.includes('getHealthEvents(dog.id)'));assert.ok(family.includes('getActivePlan(dog.id)'));assert.equal(/savePlan|saveHealthEvent|confirmMeal/.test(family),false)
})
