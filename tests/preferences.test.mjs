import {test} from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'
function client(fetch){
 const data=new Map(),win=new EventTarget(),timers=new Set()
 const code=ts.transpileModule(readFileSync(new URL('../src/lib/preferences.ts',import.meta.url),'utf8').replaceAll('import.meta.env.VITE_PILOT_MODE',"'true'"),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText
 const context={exports:{},fetch,window:win,CustomEvent,sessionStorage:{getItem:k=>data.get('session:'+k)??null,setItem:(k,v)=>data.set('session:'+k,v)},localStorage:{getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v),removeItem:k=>data.delete(k),get length(){return data.size},key:i=>[...data.keys()][i]},setTimeout:(f,ms)=>{const t=setTimeout(f,ms);timers.add(t);return t},clearTimeout}
 vm.runInNewContext(code,context)
 return {api:context.exports,data,window:win,close:()=>timers.forEach(clearTimeout)}
}
test('personalizações: agrupa alterações, mantém pendências e reenviam ao recuperar conexão',async()=>{
 const writes=[];let failed=false
 const c=client(async(_,o)=>{if(!o.method)return Response.json({});writes.push(JSON.parse(o.body));assert.equal(o.keepalive,undefined);if(failed)throw Error('offline');return Response.json({ok:true})})
 try{await c.api.loadPreferences('one');c.api.preferenceStorage.setItem('bichu_tutor_name','Maze');c.api.preferenceStorage.setItem('bichu_selected_header_logo','cat-window');await c.api.syncPreferences();assert.equal(writes.length,1);assert.equal(writes[0].changes.bichu_tutor_name,'Maze');assert.equal(c.data.has('mb_preferences_pending_one'),false)
 failed=true;c.api.preferenceStorage.setItem('bichu_theme','blue');await c.api.syncPreferences();assert.equal(c.api.getPreferenceSyncStatus().state,'error');assert.equal(c.data.get('mb_preferences_pending_one'),'true')
 failed=false;await c.api.syncPreferences();assert.equal(c.data.has('mb_preferences_pending_one'),false);assert.equal(writes.at(-1).changes.bichu_theme,'blue')
 await c.api.loadPreferences('two');assert.equal(c.api.preferenceStorage.getItem('bichu_tutor_name'),null)
 }finally{c.close()}
})
test('sessão expirada é informada e personalizações pendentes permanecem no aparelho',async()=>{
 const c=client(async(_,o)=>o.method?Response.json({error:'expired'},{status:401}):Response.json({}))
 try{await c.api.loadPreferences('one');c.api.preferenceStorage.setItem('bichu_tutor_name','Maze');await c.api.syncPreferences();assert.equal(c.api.getPreferenceSyncStatus().state,'expired');assert.equal(c.data.get('mb_preferences_pending_one'),'true')}finally{c.close()}
})
