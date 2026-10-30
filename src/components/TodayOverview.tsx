import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { CalendarDays, HeartPulse, Scale, UtensilsCrossed } from 'lucide-react'
import DailyMealChecklist from './DailyMealChecklist'
import { nutritionService } from '@/services/nutrition'
import { displayHealthDate, summarizeHealth } from '@/lib/today-summary'
import type { DogRecord, FeedingPlanRecord, HealthEventRecord } from '@/types/nutrition'
export default function TodayOverview({dog,plan}:{dog:DogRecord;plan:FeedingPlanRecord|null}) {
  const [events,setEvents]=useState<HealthEventRecord[]|null>(null),[error,setError]=useState('')
  useEffect(()=>{
    let active=true
    const load=async()=>{try{const rows=await nutritionService.getHealthEvents(dog.id);if(active){setEvents(rows);setError('')}}catch{if(active)setError('Não foi possível consultar os compromissos.')}}
    setEvents(null);setError('');void load();window.addEventListener('focus',load)
    const timer=setInterval(()=>{if(!document.hidden)void load()},60000)
    return()=>{active=false;clearInterval(timer);window.removeEventListener('focus',load)}
  },[dog.id])
  const summary=summarizeHealth(events||[]),meals=plan?.dog===dog.id?plan.meals_json||[]:[]
  return <aside className="bichu-today" aria-label={`Hoje com ${dog.name}`}>
    <div className="bichu-today-heading"><div><span>ROTINA DO PET</span><h2>Hoje com {dog.name}</h2></div><CalendarDays size={23}/></div>
    {meals.length ? import.meta.env.VITE_PILOT_MODE==='true' ? <DailyMealChecklist key={dog.id} dogId={dog.id} meals={meals} compact/> : <p>Consulte o plano alimentar para os horários e porções.</p> : <p>Defina os horários e as porções no plano alimentar para acompanhar as refeições.</p>}
    <section className="bichu-next-health"><h3>Próximo compromisso</h3>{error?<p role="status">{error}</p>:!events?<p role="status">Consultando agenda…</p>:summary.next?<p><strong>{summary.next.title}</strong><span>{displayHealthDate(summary.next.event_date)}</span></p>:<p>Nenhum compromisso futuro cadastrado.</p>}{summary.overdue>0&&<p className="bichu-overdue">{summary.overdue} compromisso(s) anterior(es) ainda sem confirmação.</p>}</section>
    <nav className="bichu-today-actions" aria-label="Ações do pet"><Link to="/plano"><UtensilsCrossed size={17}/>Alimentação</Link><Link to={`/caes/${dog.id}/peso`}><Scale size={17}/>Peso</Link><Link to={`/caes/${dog.id}/saude`}><HeartPulse size={17}/>Saúde</Link></nav>
  </aside>
}
