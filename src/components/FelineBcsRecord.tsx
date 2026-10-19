import { useState } from 'react'
import { nutritionService } from '@/services/nutrition'
import { getBcsCategory } from '@/lib/bcs-data'
import type { DogRecord } from '@/types/nutrition'
export default function FelineBcsRecord({ pet }: { pet: DogRecord }) {
  const [score, setScore] = useState(5), [notes, setNotes] = useState(''), [confirmed, setConfirmed] = useState(false), [busy, setBusy] = useState(false), [status, setStatus] = useState('')
  const save = async () => {
    setBusy(true)
    try { await nutritionService.createBcsEvaluation({ dog: pet.id, score, category: getBcsCategory(score), weight_at_eval_kg: pet.weight_kg, evaluated_at: new Date().toISOString(), notes: `[Registro felino informado pelo tutor] ${notes}`, plan_adjusted: false }); setStatus('Avaliação felina salva no histórico.'); setConfirmed(false) }
    catch { setStatus('Não foi possível salvar. Tente novamente.') } finally { setBusy(false) }
  }
  return <section className="space-y-4 rounded-2xl border border-border bg-card p-5 text-foreground">
    <h1 className="text-xl font-bold">Registro BCS felino · {pet.name}</h1>
    <p className="text-sm text-muted-foreground">Registre o escore informado na avaliação do gato. O modelo canino em 3D não é usado para gatos.</p>
    <label className="block">Escore de 1 a 9<select value={score} onChange={e => setScore(Number(e.target.value))} className="mt-2 block rounded-xl border bg-background p-3">{Array.from({ length: 9 }, (_, i) => <option key={i} value={i + 1}>{i + 1}/9</option>)}</select></label>
    <label className="block">Observações<textarea value={notes} onChange={e => setNotes(e.target.value)} className="mt-2 w-full rounded-xl border bg-background p-3" /></label>
    <label className="flex gap-3 text-sm"><input type="checkbox" checked={confirmed} onChange={e => setConfirmed(e.target.checked)} />Confirmo que este valor foi obtido em uma avaliação específica do gato.</label>
    <button disabled={!confirmed || busy} onClick={() => void save()} className="rounded-xl bg-primary px-4 py-3 text-primary-foreground disabled:opacity-50">{busy ? 'Salvando…' : 'Salvar avaliação felina'}</button>
    <p role="status">{status}</p>
  </section>
}
