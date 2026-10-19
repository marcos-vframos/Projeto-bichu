// Durable account cache; only the latest snapshot is sent, with retries while open.
let account = ''
let values: Record<string,string> = {}
let pending: Promise<boolean> | null = null
let scheduled: ReturnType<typeof setTimeout> | null = null
let retryCount = 0
let listening = false
export type PreferenceSync = { state:'saved'|'pending'|'saving'|'error'|'expired'; message:string }
let status:PreferenceSync = {state:'saved',message:'Personalizações sincronizadas com o banco.'}
export function getPreferenceSyncStatus(){return status}
function report(state:PreferenceSync['state'],message:string){status={state,message};window.dispatchEvent(new CustomEvent('bichu:preferences-sync',{detail:status}))}
function clearSchedule(){if(scheduled)clearTimeout(scheduled);scheduled=null}
function cache(){localStorage.setItem(`mb_preferences_${account}`,JSON.stringify(values));localStorage.setItem(`mb_preferences_pending_${account}`,'true')}
function schedule(delay=400){clearSchedule();scheduled=setTimeout(()=>{scheduled=null;void syncPreferences()},delay)}
function changed(){cache();report('pending','Personalização salva neste aparelho; aguardando sincronização.');schedule()}
export const preferenceStorage={
 getItem(key:string){return import.meta.env.VITE_PILOT_MODE==='true'?values[key]??null:localStorage.getItem(key)},
 setItem(key:string,value:string){if(import.meta.env.VITE_PILOT_MODE!=='true'){localStorage.setItem(key,value);return}if(!account||values[key]===value)return;values={...values,[key]:value};changed()},
 removeItem(key:string){if(import.meta.env.VITE_PILOT_MODE!=='true'){localStorage.removeItem(key);return}if(!account||!(key in values))return;values={...values};delete values[key];changed()},
}
export async function syncPreferences():Promise<boolean>{
 clearSchedule()
 if(pending){await pending;return localStorage.getItem(`mb_preferences_pending_${account}`)?syncPreferences():true}
 if(!account||!localStorage.getItem(`mb_preferences_pending_${account}`))return true
 const owner=account,snapshot=JSON.stringify(values)
 pending=(async()=>{
  report('saving','Sincronizando personalizações…')
  try{
   // Normal fetch avoids the browser's shared 64 KiB keepalive quota.
   const response=await fetch('/api/pilot/preferences',{method:'PUT',credentials:'same-origin',headers:{'content-type':'application/json'},body:snapshot})
   if(!response.ok){const result=await response.json().catch(()=>({}));const message=response.status===401?'Seu acesso terminou ou a sessão expirou. Entre novamente para sincronizar.':result.error||`Falha de sincronização (${response.status}).`;report(response.status===401?'expired':'error',message);if(response.status!==401&&response.status>=500)schedule(Math.min(45000,5000*++retryCount));return false}
   if(owner!==account)return false
   retryCount=0
   if(snapshot===JSON.stringify(values)){localStorage.removeItem(`mb_preferences_pending_${owner}`);report('saved','Personalizações sincronizadas com o banco.')}else{report('pending','Há novas alterações aguardando sincronização.');schedule()}
   return true
  }catch{report('error','Sem conexão com o banco. As alterações continuam neste aparelho; tentaremos novamente.');schedule(Math.min(45000,5000*++retryCount));return false}
 })()
 const ok=await pending;pending=null;return ok
}
function listen(){if(listening)return;listening=true;const retry=()=>{if(account&&localStorage.getItem(`mb_preferences_pending_${account}`))void syncPreferences()};window.addEventListener('online',retry);window.addEventListener('focus',retry)}
export async function loadPreferences(id:string){
 clearSchedule();if(pending)await pending
 const response=await fetch('/api/pilot/preferences',{credentials:'same-origin',cache:'no-store'})
 if(!response.ok)throw Error('Não foi possível recuperar suas personalizações. Tente novamente.')
 sessionStorage.setItem('mb_active_account',id);account=id;values=await response.json();retryCount=0;listen()
 const cached=localStorage.getItem(`mb_preferences_${id}`)
 if(cached&&localStorage.getItem(`mb_preferences_pending_${id}`)){try{values=JSON.parse(cached)}catch{ /* retain server data */ }cache();report('pending','Retomando as personalizações pendentes.');schedule()}
 if(!Object.keys(values).length&&!localStorage.getItem('mb_preferences_migrated')){for(let i=0;i<localStorage.length;i++){const key=localStorage.key(i)!;if(key.startsWith('bichu_')&&key!=='bichu_device_key')values[key]=localStorage.getItem(key)!}localStorage.setItem('mb_preferences_migrated',id);if(Object.keys(values).length)changed()}
 localStorage.setItem(`mb_preferences_${id}`,JSON.stringify(values))
 if(!localStorage.getItem(`mb_preferences_pending_${id}`))report('saved','Personalizações sincronizadas com o banco.')
}
export async function flushPreferences(){clearSchedule();if(pending)await pending;if(localStorage.getItem(`mb_preferences_pending_${account}`))await syncPreferences();clearSchedule()}

export function loadOfflinePreferences(id:string){account=id;sessionStorage.setItem('mb_active_account',id);values=JSON.parse(localStorage.getItem(`mb_preferences_${id}`)||'{}');listen()}
