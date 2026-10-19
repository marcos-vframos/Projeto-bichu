import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { nutritionService } from '@/services/nutrition'
import type { FoodRecord } from '@/types/nutrition'

export default function ManualFoodDialog({ open, onOpenChange, onSaved, species = 'canina', category = 'seca' }: { open: boolean; onOpenChange: (open: boolean) => void; onSaved: (food: FoodRecord) => void; species?: string; category?: string }) {
  const [fields, setFields] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const update = (key: string, value: string) => setFields(prev => ({ ...prev, [key]: value }))
  const save = async (event: React.FormEvent) => {
    event.preventDefault(); setError(''); setBusy(true)
    try {
      const data = new FormData()
      data.append('name', fields.name.trim()); data.append('brand', fields.brand.trim())
      for (const key of ['kcal_per_kg', 'package_weight_kg', 'package_price_brl', 'protein_pct', 'fat_pct', 'fiber_pct', 'moisture_pct']) {
        if (fields[key]?.trim()) {
          const value = Number(fields[key])
          if (!Number.isFinite(value)) throw new Error('Informe valores numéricos válidos.')
          data.append(key, String(value))
        }
      }
      for (const key of ['ingredients','benefits','ingredient_origin','quality_control','source_url','nutritional_adequacy','health_indication']) if (fields[key]?.trim()) data.append(key, fields[key].trim())
      data.append('species', fields.species || species); data.append('category', fields.category || category)
      data.append('status', 'informado_pelo_tutor')
      const result = await nutritionService.createUserFood(data)
      onSaved({ ...result, id: `user_${result.id}` })
      setFields({}); onOpenChange(false)
    } catch (e) { setError(e instanceof Error ? e.message : 'Não foi possível salvar a ração.') }
    finally { setBusy(false) }
  }
  return <Dialog open={open} onOpenChange={value => { if (!busy) onOpenChange(value) }}><DialogContent className="max-w-lg bg-card border-border max-h-[90vh] overflow-y-auto">
    <DialogHeader><DialogTitle>Adicionar alimento manualmente</DialogTitle><DialogDescription>Informe os dados da embalagem. Fotos são opcionais; campos não informados ficam sem valor.</DialogDescription></DialogHeader>
    <form onSubmit={save} className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2"><label className="text-sm font-semibold">Espécie<select className="mt-1 w-full rounded-xl border border-border bg-background p-3" value={fields.species || species} onChange={e => update('species', e.target.value)}><option value="canina">Cães</option><option value="felina">Gatos</option></select></label><label className="text-sm font-semibold">Categoria<select className="mt-1 w-full rounded-xl border border-border bg-background p-3" value={fields.category || category} onChange={e=>update('category',e.target.value)}><option value="seca">Ração seca</option><option value="umida">Alimento úmido</option><option value="petisco">Petisco</option><option value="biscoito">Biscoito</option></select></label></div>
      <div className="grid gap-3 sm:grid-cols-2">{[
        { key: 'name', label: 'Nome do alimento', type: 'text', required: true },
        { key: 'brand', label: 'Marca', type: 'text', required: true },
        { key: 'kcal_per_kg', label: 'Energia (kcal/kg)', min: 1, max: 12000, required: true },
        { key: 'package_weight_kg', label: 'Peso da embalagem (kg)', min: 0.001, max: 1000 },
        { key: 'package_price_brl', label: 'Preço da embalagem (R$)', min: 0 },
        { key: 'protein_pct', label: 'Proteína (%)', min: 0, max: 100 },
        { key: 'fat_pct', label: 'Gordura (%)', min: 0, max: 100 },
        { key: 'fiber_pct', label: 'Fibra (%)', min: 0, max: 100 },
        { key: 'moisture_pct', label: 'Umidade (%)', min: 0, max: 100 },
      ].map(field => <label key={field.key} className="block text-sm font-semibold text-foreground">{field.label}{field.required ? ' *' : ''}
        <input className="mt-1 w-full rounded-xl border border-border bg-background p-3 text-foreground" type={field.type || 'number'} step="any" min={field.min} max={field.max} maxLength={120} required={field.required} value={fields[field.key] || ''} onChange={e => update(field.key, e.target.value)} disabled={busy} />
      </label>)}</div>
      <label className="block text-sm font-semibold text-foreground">Ingredientes (opcional)<textarea value={fields.ingredients || ''} onChange={e => update('ingredients', e.target.value)} className="mt-1 w-full rounded-xl border border-border bg-background p-3" disabled={busy} maxLength={10000} /></label>
      {Object.entries({ benefits: 'Benefícios destacados na embalagem', ingredient_origin: 'Origem dos ingredientes / rastreabilidade', quality_control: 'Controle de qualidade informado pelo fabricante', nutritional_adequacy: 'Declaração de adequação: completo, complementar, espécie e fase', health_indication: 'Indicação de saúde informada / restrições', source_url: 'Fonte: link do fabricante ou referência do rótulo' }).map(([key,label])=><label key={key} className="block text-sm font-semibold">{label}<textarea maxLength={3000} value={fields[key]||''} onChange={e=>update(key,e.target.value)} className="mt-1 w-full rounded-xl border border-border bg-background p-3" /></label>)}
      {error && <p role="alert" className="text-sm text-red-400">{error}</p>}
      <div className="flex justify-end gap-3"><button type="button" onClick={() => onOpenChange(false)} disabled={busy} className="rounded-xl border border-border p-3">Cancelar</button><button type="submit" disabled={busy} className="rounded-xl bg-primary p-3 font-bold text-primary-foreground">{busy ? 'Salvando…' : 'Salvar e comparar'}</button></div>
    </form>
  </DialogContent></Dialog>
}
