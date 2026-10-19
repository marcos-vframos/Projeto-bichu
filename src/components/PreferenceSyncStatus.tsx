import {useEffect,useState} from 'react'
import {getPreferenceSyncStatus,syncPreferences,type PreferenceSync} from '@/lib/preferences'
export default function PreferenceSyncStatus(){
 const [status,setStatus]=useState(getPreferenceSyncStatus)
 useEffect(()=>{const update=(e:Event)=>setStatus((e as CustomEvent<PreferenceSync>).detail);window.addEventListener('bichu:preferences-sync',update);return()=>window.removeEventListener('bichu:preferences-sync',update)},[])
 return <section className="rounded-2xl border border-current/20 p-4 space-y-2"><h2 className="font-bold">Sincronização das personalizações</h2><p role="status" className="text-sm">{status.message}</p>{status.state!=='saved'&&<p className="text-xs">O painel administrativo mostra apenas o que já chegou ao banco. Não apague os dados deste navegador enquanto houver alterações pendentes.</p>}<button type="button" disabled={status.state==='saving'} onClick={()=>void syncPreferences()} className="rounded-lg border border-current px-3 py-2 text-sm disabled:opacity-50">{status.state==='saving'?'Sincronizando…':'Sincronizar agora'}</button></section>
}
