import { preferenceStorage } from '@/lib/preferences'
import { createPortal } from 'react-dom'
import { toast } from 'sonner'
import { useEffect, useRef, useState } from 'react'
import { getOrCreateDeviceKey } from '@/lib/device'
import { logActivity } from '@/lib/telemetry'
export default function DeviceActivity() {
  const [controlsHost,setControlsHost]=useState<HTMLElement|null>(null)
  useEffect(()=>{const update=()=>setControlsHost(document.getElementById('pilot-metrics-settings'));update();window.addEventListener('bichu:pilot-controls',update);return()=>window.removeEventListener('bichu:pilot-controls',update)},[])
  const [analytics,setAnalytics]=useState(()=>preferenceStorage.getItem('bichu_privacy_analytics')!=='false')
  useEffect(()=>{const update=()=>setAnalytics(preferenceStorage.getItem('bichu_privacy_analytics')!=='false');window.addEventListener('bichu:privacy-changed',update);return()=>window.removeEventListener('bichu:privacy-changed',update)},[])
  const [status, setStatus] = useState(() => localStorage.getItem('mb_location_enabled') === 'true' ? 'granted' : 'off')
  const location = useRef<{latitude:number;longitude:number;accuracy:number;recordedAt:number} | null>(null)
  const currentStatus = useRef(status)
  useEffect(() => { currentStatus.current = status }, [status])
  useEffect(() => {
    if (!analytics || status !== 'granted') { location.current = null; return }
    if (!navigator.geolocation) { setStatus('unavailable'); return }
    const watch = navigator.geolocation.watchPosition(p => { location.current = { latitude:p.coords.latitude, longitude:p.coords.longitude, accuracy:p.coords.accuracy, recordedAt:p.timestamp } }, () => setStatus('denied'), { enableHighAccuracy:false, maximumAge:60000, timeout:15000 })
    return () => navigator.geolocation.clearWatch(watch)
  }, [status,analytics])
  useEffect(() => {
    if(!analytics)return
    let last = performance.now(), interaction = last, accumulated = 0, route = window.location.pathname
    const touch = () => { interaction = performance.now() }
    const tick = () => { const now = performance.now(); if (document.visibilityState === 'visible' && now-interaction<60000) accumulated += Math.min(now-last, 2000); last=now; if (route !== window.location.pathname) { route=window.location.pathname; void logActivity('navigation',0,{route}) } }
    const send = () => { if(preferenceStorage.getItem('bichu_privacy_analytics')==='false')return; const ms=accumulated; accumulated=0; void fetch('/api/pilot/device',{method:'POST',keepalive:true,headers:{'content-type':'application/json'},body:JSON.stringify({deviceId:getOrCreateDeviceKey(),clientRelease:__APP_RELEASE__, browser:navigator.userAgent,screen:`${window.innerWidth} × ${window.innerHeight}`,route:window.location.pathname,activeMs:Math.round(ms),locationStatus:currentStatus.current,location:location.current})}).catch(()=>{}) }
    const error = (e: ErrorEvent) => { void logActivity('client_error',0,{route:window.location.pathname,message:e.message.slice(0,250)}) }
    const rejection = () => { void logActivity('client_error',0,{route:window.location.pathname,message:'Operação assíncrona não concluída'}) }
    const hide = () => { tick(); send() }
    for (const name of ['pointerdown','keydown','scroll']) window.addEventListener(name,touch,{passive:true})
    window.addEventListener('error',error);window.addEventListener('unhandledrejection',rejection);document.addEventListener('visibilitychange',hide)
    void logActivity('page_load',performance.now(),{route}); send()
    const clock = window.setInterval(tick,1000), heartbeat=window.setInterval(send,15000)
    return () => { clearInterval(clock);clearInterval(heartbeat);send();for(const name of ['pointerdown','keydown','scroll']) window.removeEventListener(name,touch);window.removeEventListener('error',error);window.removeEventListener('unhandledrejection',rejection);document.removeEventListener('visibilitychange',hide) }
  }, [analytics])
  return controlsHost ? createPortal(<details className="bg-[#eaf1e9] px-4 py-2 text-sm text-[#18372e]"><summary className="cursor-pointer">Métricas do piloto · localização {status === 'granted' ? 'ativada' : 'desativada'}</summary><p className="my-2">Quando as métricas estão ativadas, registramos telas visitadas, falhas e tempo ativo, vinculados à sua conta do piloto. A localização é opcional e só é enviada após sua autorização; o responsável pelo piloto pode consultá-la.</p><button className="rounded-lg border border-[#8ba99b] px-3 py-2" onClick={() => { const enabled=status!=='granted'; localStorage.setItem('mb_location_enabled',String(enabled));setStatus(enabled?'granted':'off') }}>{status==='granted'?'Desativar localização':'Autorizar localização deste aparelho'}</button>{status==='denied' && <p role="status">Permissão negada ou localização indisponível. Verifique as permissões do navegador para tentar novamente.</p>}</details>,controlsHost) : null
}
