type Values = Record<string,string>
type Edits = Record<string,string|null>
let account='', values:Values={}, base:Values={}, edits:Edits={}, conflicts:string[]=[], remote:Values={}
let pending:Promise<boolean>|null=null, timer:ReturnType<typeof setTimeout>|null=null, listening=false
export type PreferenceSync={state:'saved'|'pending'|'saving'|'error'|'expired'|'conflict';message:string}
let status:PreferenceSync={state:'saved',message:'Personalizações sincronizadas com o banco.'}
export const getPreferenceSyncStatus=()=>status
function report(state:PreferenceSync['state'],message:string){status={state,message};window.dispatchEvent(new CustomEvent('bichu:preferences-sync',{detail:status}))}
function apply(v:Values,e:Edits){const result={...v};for(const[k,x]of Object.entries(e)){if(x===null)delete result[k];else result[k]=x}return result}
function stop(){if(timer)clearTimeout(timer);timer=null}
function schedule(){stop();timer=setTimeout(()=>{timer=null;void syncPreferences()},500)}
function cache(){localStorage.setItem(`mb_preferences_${account}`,JSON.stringify(values));localStorage.setItem(`mb_preferences_edits_${account}`,JSON.stringify({base,edits}));if(Object.keys(edits).length)localStorage.setItem(`mb_preferences_pending_${account}`,'true');else localStorage.removeItem(`mb_preferences_pending_${account}`)}
function change(k:string,v:string|null){if(!account||(values[k]??null)===v)return;edits[k]=v;values=apply(values,{[k]:v});cache();if(!conflicts.length){report('pending','Alteração salva neste aparelho; aguardando sincronização.');schedule()}}
export const preferenceStorage={
 getItem(k:string){return import.meta.env.VITE_PILOT_MODE==='true'?values[k]??null:localStorage.getItem(k)},
 setItem(k:string,v:string){if(import.meta.env.VITE_PILOT_MODE==='true')change(k,v);else localStorage.setItem(k,v)},
 removeItem(k:string){if(import.meta.env.VITE_PILOT_MODE==='true')change(k,null);else localStorage.removeItem(k)},
}
export async function syncPreferences():Promise<boolean>{
 stop();if(pending)return pending;if(conflicts.length)return false;if(!account||!Object.keys(edits).length)return true
 const owner=account,sent={...edits},baseline=Object.fromEntries(Object.keys(sent).map(k=>[k,base[k]??null]))
 pending=(async()=>{report('saving','Sincronizando personalizações…');try{
 const r=await fetch('/api/pilot/preferences',{method:'PATCH',credentials:'same-origin',headers:{'content-type':'application/json','x-mb-account-id':owner},body:JSON.stringify({changes:sent,base:baseline})}),data=await r.json().catch(()=>({}))
 if(owner!==account)return false
 if(r.status===409&&data.values&&data.conflicts?.length){remote=data.values;conflicts=data.conflicts;report('conflict','Há alterações em outro aparelho. Escolha nas Configurações qual versão manter.');return false}
 if(!r.ok){report(r.status===401?'expired':'error',data.error||'Não foi possível sincronizar. Tente novamente.');return false}
 base=data.values||apply(base,sent);for(const k of Object.keys(sent))if(edits[k]===sent[k])delete edits[k];values=apply(base,edits);cache();if(Object.keys(edits).length){report('pending','Há alterações aguardando sincronização.');schedule()}else report('saved','Personalizações sincronizadas com o banco.');return true
 }catch{report('error','Sem conexão. As alterações permanecem neste aparelho.');return false}})()
 try{return await pending}finally{pending=null}
}
export async function resolvePreferenceConflict(choice:'local'|'remote'){if(!conflicts.length)return;if(choice==='remote')for(const k of conflicts)delete edits[k];base=remote;conflicts=[];values=apply(base,edits);cache();if(await syncPreferences())window.location.reload()}
function listen(){if(listening)return;listening=true;const retry=()=>{if(account&&Object.keys(edits).length&&!conflicts.length)void syncPreferences()};window.addEventListener('online',retry);window.addEventListener('focus',retry)}
export async function loadPreferences(id:string){
 stop();if(pending)await pending;stop()
 const r=await fetch('/api/pilot/preferences',{credentials:'same-origin',cache:'no-store',headers:{'x-mb-account-id':id}});if(!r.ok)throw Error('Não foi possível recuperar suas personalizações.')
 account=id;base=await r.json();values={...base};edits={};conflicts=[];sessionStorage.setItem('mb_active_account',id);listen()
 if(localStorage.getItem(`mb_preferences_pending_${id}`)){
 const saved=JSON.parse(localStorage.getItem(`mb_preferences_edits_${id}`)||'null')
 if(saved){edits=saved.edits;base=saved.base;values=apply(values,edits)}else{const legacy=JSON.parse(localStorage.getItem(`mb_preferences_${id}`)||'{}');edits=Object.fromEntries(Object.entries(legacy).filter(([k,v])=>base[k]!==v)) as Edits;remote={...base};conflicts=Object.keys(edits);values=apply(values,edits)}
 }
 cache();if(conflicts.length)report('conflict','Há personalizações antigas pendentes. Escolha qual versão manter.');else if(Object.keys(edits).length){report('pending','Retomando alterações pendentes.');schedule()}else report('saved','Personalizações sincronizadas com o banco.')
}
export async function flushPreferences(){stop();if(pending)await pending;if(Object.keys(edits).length)await syncPreferences();stop()}
export function loadOfflinePreferences(id:string){account=id;sessionStorage.setItem('mb_active_account',id);values=JSON.parse(localStorage.getItem(`mb_preferences_${id}`)||'{}');const saved=JSON.parse(localStorage.getItem(`mb_preferences_edits_${id}`)||'null');base=saved?.base||{...values};edits=saved?.edits||{};conflicts=[];listen()}
