import {useEffect,useRef,useState} from 'react'
import {Link,useLocation,useNavigate} from 'react-router-dom'
import {HeartPulse,Scale,UtensilsCrossed,ArrowUpRight,Plus,Users} from 'lucide-react'
import {useDog} from '@/contexts/DogContext'
import {nutritionService} from '@/services/nutrition'
import {getTimeBasedGreeting} from '@/lib/tutor'
import {petDestination} from '@/lib/dirty-presence'
import {labPetSheet} from '@/lib/lab-pet-image'
import type {DogRecord} from '@/types/nutrition'
import DietPlanSummary from './DietPlanSummary'
import TodayOverview from './TodayOverview'
import './lab-presence.css'
export function LabPetFigure({pet,small=false}:{pet:DogRecord|null;small?:boolean}){
 const petAvatarUrl=nutritionService.getAvatarUrl(pet)
 if(petAvatarUrl)return <img className={small?'lab-pet-avatar':'lab-pet-portrait'} src={petAvatarUrl} alt={`Foto de ${pet?.name||'pet'}`} />
 return <div role="img" aria-label={pet?`Representação ilustrativa de ${pet.species==='felina'?'gato':'cão'}; ${pet.name} ainda não tem foto`:'Representações ilustrativas de pets'} className={small?'lab-pet-avatar lab-pet-cutout':'lab-pet-portrait lab-pet-cutout'} style={{backgroundImage:`url(${labPetSheet})`,backgroundPosition:pet?.species==='felina'?'right center':'left center'}}/>
}
export function LabPetContext(){
 const {dogs,activeDog,setActiveDogId}=useDog(),location=useLocation(),navigate=useNavigate()
 const id=location.pathname.match(/^\/caes\/([^/]+)/)?.[1],visible=dogs.find(d=>d.id===id)||activeDog,all=location.pathname==='/rotina-da-casa'
 return <header className="lab-context" aria-label="Contexto do pet"><Link to={visible?`/caes/${visible.id}`:'/caes'} className="lab-context-identity"><LabPetFigure pet={visible} small/><span><strong>{all?'Rotina da casa':visible?.name||'Meu Bichu'}</strong><small>{all?`${dogs.length} pet(s) · cuidados identificados por animal`:visible?`${visible.species==='felina'?'Gato':'Cão'} · ${visible.breed||'Raça não informada'}`:'Cadastre seu primeiro pet'}</small></span></Link><label>Pet ativo<select aria-label="Selecionar pet ou rotina da casa" value={all?'all':visible?.id||''} onChange={event=>{const value=event.target.value;if(value==='all'){navigate('/rotina-da-casa');return}setActiveDogId(value);navigate(petDestination(location.pathname,value))}}>{!dogs.length&&<option value="">Nenhum pet cadastrado</option>}{dogs.map(d=><option key={d.id} value={d.id}>{d.name}</option>)}{dogs.length>0&&<option value="all">Todos · rotina da casa</option>}</select></label></header>
}
export default function LabPetHome(){
 const {dogs,activeDog,activePlan,loading}=useDog(),portrait=useRef<HTMLDivElement>(null),hero=useRef<HTMLElement>(null)
 const [greeting,setGreeting]=useState(()=>getTimeBasedGreeting())
 useEffect(()=>{const update=()=>setGreeting(getTimeBasedGreeting());window.addEventListener('bichu:tutor-name-changed',update);const timer=setInterval(update,60000);return()=>{window.removeEventListener('bichu:tutor-name-changed',update);clearInterval(timer)}},[])
 useEffect(()=>{let raf=0;const update=()=>{cancelAnimationFrame(raf);raf=requestAnimationFrame(()=>{if(portrait.current&&hero.current){const scrolled=Math.max(0,-hero.current.getBoundingClientRect().top);portrait.current.style.opacity=String(Math.max(0,1-scrolled/380))}})};window.addEventListener('scroll',update,{passive:true});update();return()=>{window.removeEventListener('scroll',update);cancelAnimationFrame(raf)}},[activeDog?.id])
 if(loading)return <p role="status">Consultando seus pets…</p>
 return <div className="lab-home"><section ref={hero} className="lab-hero"><div className="lab-intro"><span className="lab-eyebrow">{activeDog?`O espaço de ${activeDog.name}`:'Uma vida de cuidados, juntos'}</span><h1>{greeting.prefix},<br/><em>{greeting.name}.</em></h1><p>{activeDog?`Os cuidados de ${activeDog.name}, em um só lugar.`:'Cadastre seu pet para organizar a alimentação, o peso e a saúde.'}</p><nav className="lab-hero-actions" aria-label="Cuidados do pet">{activeDog?<><Link to="/plano"><UtensilsCrossed size={17}/>Alimentação</Link><Link to={`/caes/${activeDog.id}/saude`}><HeartPulse size={17}/>Saúde</Link><Link to={`/caes/${activeDog.id}/peso`}><Scale size={17}/>Peso</Link></>:<Link to="/caes/novo"><Plus size={17}/>Cadastrar pet</Link>}</nav><Link className="lab-family-link" to="/rotina-da-casa"><Users size={16}/>{dogs.length>1?'Ver a rotina da casa':'Meus pets e seus cuidados'}<ArrowUpRight size={14}/></Link></div><div ref={portrait} className="lab-hero-figure"><Link to={activeDog?`/caes/${activeDog.id}`:'/caes/novo'} aria-label={activeDog?`Abrir o perfil de ${activeDog.name}`:'Cadastrar meu pet'}><LabPetFigure pet={activeDog}/></Link>{!nutritionService.getAvatarUrl(activeDog)&&<small>Representação ilustrativa · envie a foto do seu pet no cadastro</small>}</div></section>{activeDog&&<div className="lab-daily-grid"><TodayOverview key={activeDog.id} dog={activeDog} plan={activePlan}/><section className="lab-current-plan"><span className="lab-eyebrow">Alimentação em uso</span><h2>O plano de {activeDog.name}</h2>{activePlan?<><p>{activePlan.food_name}</p><p>{activePlan.daily_grams.toLocaleString('pt-BR',{maximumFractionDigits:1})} g/dia no plano salvo · {activePlan.meals_per_day} refeições</p><DietPlanSummary plan={activePlan} compact/><Link to="/comparador">Consultar ou editar alimentação <ArrowUpRight size={15}/></Link></>:<><p>Nenhum plano alimentar consultado.</p><Link to="/plano">Abrir plano alimentar</Link></>}</section></div>}</div>
}
