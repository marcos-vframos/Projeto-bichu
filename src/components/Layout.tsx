import BetaEvaluation from './BetaEvaluation'
import { useEffect, useRef, useState } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { Home, Dog, HeartPulse, Scale, TrendingUp, Settings, Stethoscope, X, PawPrint } from 'lucide-react'
import { useDog } from '@/contexts/DogContext'
import { useActiveHeroTheme } from '@/hooks/use-active-hero-theme'
import { preferenceStorage } from '@/lib/preferences'
import { LogoSelectorModal } from './LogoSelectorModal'
import { getCroppedLogoImage, subscribeLogoCrops, initLogoCrops, DEFAULT_LOGO_ID, LOGO_STORAGE_KEY } from '@/lib/logo-assets'

const items = [{label:'Início',path:'/',icon:Home},{label:'Meus pets',path:'/caes',icon:Dog},{label:'Saúde Assistida',path:'/saude',icon:HeartPulse},{label:'Comparador',path:'/comparador',icon:Scale},{label:'Peso',path:'/peso',icon:TrendingUp},{label:'Ajustes',path:'/configuracoes',icon:Settings},{label:'Profissionais Pet',path:'/profissionais',icon:Stethoscope}]
export function Layout() {
 const {dogs,activeDog,setActiveDogId}=useDog(),navigate=useNavigate(),location=useLocation()
 const {theme}=useActiveHeroTheme(activeDog)
 const [open,setOpen]=useState(false),[logoModalOpen,setLogoModalOpen]=useState(false)
 const [logoId,setLogoId]=useState(()=>preferenceStorage.getItem(LOGO_STORAGE_KEY)||DEFAULT_LOGO_ID)
 const [logoSrc,setLogoSrc]=useState<string|null>(()=>getCroppedLogoImage(logoId))
 const timer=useRef<ReturnType<typeof setTimeout>|null>(null),held=useRef(false),start=useRef<{x:number;y:number}|null>(null)
 const menuRef=useRef<HTMLDivElement>(null),buttonRef=useRef<HTMLButtonElement>(null)
 const clear=()=>{if(timer.current)clearTimeout(timer.current);timer.current=null}
 useEffect(()=>{initLogoCrops();setLogoSrc(getCroppedLogoImage(logoId));return subscribeLogoCrops(()=>setLogoSrc(getCroppedLogoImage(logoId)))},[logoId])
 useEffect(()=>{const changed=(e:Event)=>setLogoId((e as CustomEvent<string>).detail);window.addEventListener('bichu:header-logo-changed',changed);return()=>window.removeEventListener('bichu:header-logo-changed',changed)},[])
 useEffect(()=>{setOpen(false);clear()},[location.pathname])
 useEffect(()=>()=>clear(),[])
 useEffect(()=>{if(!open)return;const outside=(e:PointerEvent)=>{if(!menuRef.current?.contains(e.target as Node)){setOpen(false)}};const escape=(e:KeyboardEvent)=>{if(e.key==='Escape'){setOpen(false);buttonRef.current?.focus()}};document.addEventListener('pointerdown',outside);document.addEventListener('keydown',escape);return()=>{document.removeEventListener('pointerdown',outside);document.removeEventListener('keydown',escape)}},[open])
 const target=(path:string)=>path==='/saude'&&activeDog?`/caes/${activeDog.id}/saude`:path==='/peso'?activeDog?`/caes/${activeDog.id}/peso`:'/caes':path
 const active=(path:string)=>path==='/'?location.pathname==='/':path==='/peso'?/\/(peso|plano)/.test(location.pathname):path==='/saude'?location.pathname.includes('/saude'):path==='/caes'?location.pathname.startsWith('/caes')&&!/\/(peso|plano|saude)/.test(location.pathname):location.pathname.startsWith(path)
 const begin=()=>{clear();held.current=false;timer.current=setTimeout(()=>{held.current=true;setOpen(false);setLogoModalOpen(true)},3000)}
 return <div className="min-h-screen antialiased" style={{backgroundColor:theme.bgColor,color:theme.brownTitle}}>
  <div ref={menuRef} className={open?'bichu-sidebar fixed left-0 top-0 z-40 h-dvh w-[min(19rem,88vw)] select-none overflow-y-auto pl-3 pr-5 pt-[max(0.75rem,env(safe-area-inset-top))]':'fixed left-3 top-[max(0.75rem,env(safe-area-inset-top))] z-40 select-none'} style={{color:open?'#161d19':theme.brownTitle}}>
   <button ref={buttonRef} type="button" aria-label="Abrir ou fechar menu. Segure três segundos para trocar o ícone" aria-expanded={open} aria-controls="bichu-navigation" title="Clique para abrir o menu; segure 3 segundos para trocar o ícone" className="flex h-12 w-12 items-center justify-center rounded-xl bg-transparent focus-visible:outline-2 focus-visible:outline-current touch-none" onContextMenu={e=>e.preventDefault()}
    onPointerDown={e=>{if(e.button!==0)return;e.currentTarget.setPointerCapture(e.pointerId);start.current={x:e.clientX,y:e.clientY};begin()}}
    onPointerMove={e=>{if(start.current&&Math.hypot(e.clientX-start.current.x,e.clientY-start.current.y)>12){clear();held.current=true}}}
    onPointerUp={()=>{clear();start.current=null}} onPointerCancel={()=>{clear();held.current=true;start.current=null}}
    onKeyDown={e=>{if(e.key===' '||e.key==='Enter'){e.preventDefault();if(!e.repeat)begin()}if(e.key==='Escape'){clear();setOpen(false)}}} onKeyUp={e=>{if(e.key===' '||e.key==='Enter'){e.preventDefault();clear();if(!held.current)setOpen(v=>!v);held.current=false}}} onBlur={clear}
    onClick={()=>{if(held.current){held.current=false;return}setOpen(v=>!v)}}>
    {logoSrc?<img src={logoSrc} alt="" draggable={false} className="h-10 w-10 object-contain"/>:<PawPrint className="h-8 w-8"/>}
   </button>
   {open&&<nav id="bichu-navigation" aria-label="Menu principal" className="mt-3 flex w-full flex-col gap-1 bg-transparent pb-[max(1.5rem,env(safe-area-inset-bottom))]">
    <button type="button" onClick={()=>{setOpen(false);buttonRef.current?.focus()}} className="flex min-h-11 items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold hover:bg-white/25 focus-visible:outline-2 focus-visible:outline-current"><X size={17}/>Fechar</button>
    {items.map(item=>{const Icon=item.icon;return <button key={item.path} type="button" onClick={()=>navigate(target(item.path))} aria-current={active(item.path)?'page':undefined} className="flex min-h-12 items-center gap-3 rounded-xl px-3 py-3 text-left text-[15px] hover:bg-white/25 focus-visible:outline-2 focus-visible:outline-current" style={{color:active(item.path)?'#123e2d':'#161d19',backgroundColor:active(item.path)?'rgba(211,229,215,0.32)':'transparent',fontWeight:active(item.path)?750:600}}><Icon size={18}/><span>{item.label}</span></button>})}
    {dogs.length>1&&<label className="px-3 py-2 text-xs">Pet ativo<select aria-label="Selecionar pet ativo" value={activeDog?.id||''} onChange={e=>{setActiveDogId(e.target.value);setOpen(false)}} className="mt-2 block w-full rounded-lg border border-[#69766c] bg-[#f7faf4] p-3 text-[#161d19]">{dogs.map(d=><option key={d.id} value={d.id} style={{backgroundColor:'#f7faf4',color:'#161d19'}}>{d.name}</option>)}</select></label>}
   </nav>}
  </div>
  <main className="w-full"><div className={location.pathname.startsWith('/bcs')?'mx-auto w-full max-w-[1800px] px-3 pt-16 pb-6 sm:px-6':'mx-auto w-full max-w-7xl px-4 pt-16 pb-6 sm:px-6 lg:px-8'}><Outlet/></div></main>
  <BetaEvaluation/>
  <LogoSelectorModal open={logoModalOpen} onClose={()=>setLogoModalOpen(false)} currentLogoId={logoId} onSelectLogo={id=>{setLogoId(id);setLogoSrc(getCroppedLogoImage(id))}} primaryColor={theme.brownPrimary} bgColor={theme.bgColor} textColor={theme.brownTitle}/>
 </div>
}
export default Layout
