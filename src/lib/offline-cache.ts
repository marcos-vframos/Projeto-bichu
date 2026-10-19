import {preferenceStorage} from './preferences'
export function accountKey(){return sessionStorage.getItem('mb_active_account')||''}
export function cacheRead<T>(route:string):{value:T;savedAt:string}|null{
 if(preferenceStorage.getItem('bichu_privacy_offline')==='false'||!accountKey())return null
 try{return JSON.parse(localStorage.getItem(`mb_offline_${accountKey()}`)||'{}')[route]||null}catch{return null}
}
export function cacheWrite(route:string,value:unknown){if(preferenceStorage.getItem('bichu_privacy_offline')==='false'||!accountKey())return;try{const key=`mb_offline_${accountKey()}`,all=JSON.parse(localStorage.getItem(key)||'{}');all[route]={value,savedAt:new Date().toISOString()};localStorage.setItem(key,JSON.stringify(all))}catch{/* cache is optional; online save is unaffected */}}
export function clearOffline(){const id=accountKey();if(id)localStorage.removeItem(`mb_offline_${id}`)}
