import { formatPortion } from '@/lib/format-portion'
import { useCallback, useEffect, useState } from 'react'
import type { MealItem } from '@/types/nutrition'

type Confirmation = { id: string; slot: number; day: string; meal: { label: string; time: string; grams: number }; completed: boolean; confirmed_at: string | null }
export default function DailyMealChecklist({ dogId, meals, compact = false }: { dogId: string; meals: MealItem[]; compact?: boolean }) {
  const [data, setData] = useState<{ day: string; confirmations: Confirmation[] } | null>(null)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState<number | null>(null)
  const load = useCallback(async () => {
    const response = await fetch(`/api/pilot/daily-meals?dog=${encodeURIComponent(dogId)}`, { cache: 'no-store' })
    if (!response.ok) throw new Error('Não foi possível consultar as confirmações. Tente novamente.')
    setData(await response.json())
    setError('')
  }, [dogId])
  useEffect(() => {
    let active = true
    const refresh = () => { if (active) void load().catch(e => active && setError(e.message)) }
    refresh()
    const interval = window.setInterval(refresh, 30000)
    window.addEventListener('focus', refresh)
    return () => { active = false; clearInterval(interval); window.removeEventListener('focus', refresh) }
  }, [load])
  const matching = (meal: MealItem, slot: number) => data?.confirmations.find(c => c.slot === slot && c.meal.label === meal.label.trim() && c.meal.time === (meal.time || '') && c.meal.grams === meal.grams)
  const toggle = async (meal: MealItem, slot: number) => {
    if (!data) return
    setSaving(slot)
    try {
      const response = await fetch('/api/pilot/daily-meals', { method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ dog: dogId, day: data.day, slot, meal: { label: meal.label, time: meal.time || '', grams: meal.grams }, completed: !matching(meal, slot)?.completed }) })
      if (!response.ok) { const result = await response.json(); throw new Error(result.error || 'Falha ao salvar confirmação') }
      await load()
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Falha ao salvar confirmação'
      await load().catch(() => {})
      setError(message)
    } finally { setSaving(null) }
  }
  const total = meals.filter((m, i) => matching(m, i)?.completed).length
  return <section data-compact={compact} className="bichu-meal-checklist rounded-2xl border border-primary/40 bg-card p-4 space-y-3">
    <div><h3 className="text-base font-bold text-foreground">Confirmação diária das refeições</h3>
      <p className="text-sm text-muted-foreground">{data ? `${data.day.split('-').reverse().join('/')} · ${total} de ${meals.length} confirmadas` : 'Carregando confirmações…'}</p>
      <p hidden={compact} className="mt-1 text-sm text-muted-foreground">Confirme após oferecer cada refeição. A lista recomeça à meia-noite de Brasília e o histórico fica salvo. Mudanças na porção ou horário precisam de nova confirmação.</p></div>
    {compact&&<p className="bichu-meal-hint">Marque após oferecer. Reinicia diariamente; o histórico permanece salvo.</p>}
    {error && <div role="alert" className="text-sm text-red-300">{error}<button type="button" className="ml-2 underline" onClick={() => void load().catch(e => setError(e.message))}>Tentar novamente</button></div>}
    {meals.map((meal, slot) => { const confirmation = matching(meal, slot); return <label key={slot} className="flex items-center gap-3 rounded-xl border border-border p-3 min-h-14 text-foreground cursor-pointer">
      <input type="checkbox" className="h-6 w-6 shrink-0 accent-green-600" checked={confirmation?.completed || false} disabled={!data || saving !== null || !!error}
        onChange={() => void toggle(meal, slot)} />
      <span className="flex-1 text-sm"><strong>{meal.label}</strong> · {formatPortion(meal.grams)} g · {meal.time || 'Defina o horário'}
        <span className="block text-muted-foreground">{saving === slot ? 'Salvando…' : confirmation?.completed && confirmation.confirmed_at ? `Confirmada às ${new Date(confirmation.confirmed_at).toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' })}` : 'Pendente de confirmação'}</span></span>
    </label> })}
  </section>
}
