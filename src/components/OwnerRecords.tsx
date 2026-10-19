import { useEffect, useState } from 'react'

const categories: Record<string, string> = { dogs: 'Cadastro dos pets', health_events: 'Saúde assistida', weight_logs: 'Pesagens', bcs_evaluations: 'Avaliações BCS', feeding_plans: 'Planos alimentares', meal_confirmations: 'Confirmações diárias', pet_routine_events: 'Rotina e agenda', user_foods: 'Alimentos cadastrados' }
const labels: Record<string, string> = { dog: 'Pet', name: 'Nome', species: 'Espécie', breed: 'Raça', birth_date: 'Nascimento', sex: 'Sexo', sterilized: 'Castrado', weight_kg: 'Peso (kg)', activity_level: 'Atividade', body_condition: 'Condição corporal', size: 'Porte', is_active: 'Ativo', notes: 'Observações', avatar: 'Foto principal', gallery: 'Galeria', microchip: 'Microchip', tracker_brand: 'Marca do rastreador', tracker_id: 'Rastreador', food: 'Alimento (ID)', food_name: 'Alimento', kcal_per_kg: 'Energia (kcal/kg)', meals_per_day: 'Refeições por dia', daily_kcal: 'Energia diária (kcal)', daily_grams: 'Porção diária (g)', goal: 'Objetivo', meals_json: 'Refeições', label: 'Refeição', grams: 'Porção (g)', time: 'Horário', logged_at: 'Data da pesagem', type: 'Tipo', title: 'Título', event_date: 'Data do evento', completed: 'Confirmado / concluído', dosage: 'Dose', frequency: 'Frequência', duration: 'Duração', professional: 'Profissional', location: 'Local', score: 'BCS (1 a 9)', category: 'Categoria', weight_at_eval_kg: 'Peso na avaliação (kg)', evaluated_at: 'Data da avaliação', plan_adjusted: 'Plano ajustado', previous_goal: 'Objetivo anterior', new_goal: 'Novo objetivo', previous_grams: 'Porção anterior (g)', new_grams: 'Nova porção (g)', start_time: 'Início', end_time: 'Fim', repeat: 'Repetição', brand: 'Marca', protein_pct: 'Proteína (%)', fat_pct: 'Gordura (%)', fiber_pct: 'Fibra (%)', moisture_pct: 'Umidade (%)', life_stage: 'Fase de vida', tier: 'Linha', package_weight_kg: 'Peso da embalagem (kg)', package_price_brl: 'Preço (R$)', ingredients: 'Ingredientes', front_photo: 'Foto da embalagem', spec_photo: 'Foto do rótulo', status: 'Situação', raw_extracted_text: 'Texto extraído', day: 'Dia (Brasília)', slot: 'Posição da refeição', meal: 'Refeição oferecida', confirmed_at: 'Horário da confirmação' }
type RecordItem = { id: string; account_id: string; collection: string; dog_id: string | null; record_id?: string; data?: Record<string, unknown>; before?: Record<string, unknown> | null; after?: Record<string, unknown> | null; action?: string; changed_at?: number; updated_at?: string }
type Account = { id: string; email: string }
type Pet = { id: string; name: string; accountId: string }
const date = (value: number | string) => new Date(value).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })
function Value({ value }: { value: unknown }) {
  if (value === null || value === undefined || value === '') return <span>—</span>
  if (typeof value === 'boolean') return <span>{value ? 'Sim' : 'Não'}</span>
  if (Array.isArray(value)) return <ul className="space-y-2">{value.map((v, i) => <li key={i} className="border-l-2 border-[#b5ccbe] pl-2"><Value value={v} /></li>)}</ul>
  if (typeof value === 'object') return <dl className="space-y-1">{Object.entries(value).map(([k, v]) => <div key={k}><dt className="inline font-semibold">{labels[k] || k}: </dt><dd className="inline"><Value value={v} /></dd></div>)}</dl>
  return <span className="whitespace-pre-wrap break-words">{String(value)}</span>
}
export default function OwnerRecords({ accounts, pets, accountId }: { accounts: Account[]; pets: Pet[]; accountId: string }) {
  const [history, setHistory] = useState(false)
  const [collection, setCollection] = useState('')
  const [dog, setDog] = useState('')
  const [items, setItems] = useState<RecordItem[]>([])
  const [nextOffset, setNextOffset] = useState<number | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [refresh, setRefresh] = useState(0)
  useEffect(() => { setDog('') }, [accountId])
  useEffect(() => {
    const controller = new AbortController()
    setItems([]); setNextOffset(null); setBusy(true); setError('')
    const params = new URLSearchParams()
    if (accountId !== 'all') params.set('account', accountId)
    if (collection) params.set('collection', collection)
    if (dog) params.set('dog', dog)
    void fetch(`/api/pilot/owner/${history ? 'changes' : 'records'}?${params}`, { cache: 'no-store', signal: controller.signal }).then(async r => {
      if (!r.ok) throw new Error('Falha ao consultar registros')
      const result = await r.json(); setItems(result.items); setNextOffset(result.nextOffset)
    }).catch(e => { if (!controller.signal.aborted) setError(e.message) }).finally(() => { if (!controller.signal.aborted) setBusy(false) })
    return () => controller.abort()
  }, [accountId, history, collection, dog, refresh])
  const more = async () => {
    setBusy(true); setError('')
    try {
      const params = new URLSearchParams({ offset: String(nextOffset) })
      if (accountId !== 'all') params.set('account', accountId)
      if (collection) params.set('collection', collection)
      if (dog) params.set('dog', dog)
      const response = await fetch(`/api/pilot/owner/${history ? 'changes' : 'records'}?${params}`, { cache: 'no-store' })
      if (!response.ok) throw new Error('Falha ao carregar mais registros')
      const result = await response.json(); setItems(prev => [...prev, ...result.items]); setNextOffset(result.nextOffset)
    } catch (e) { setError(e instanceof Error ? e.message : 'Falha ao carregar') } finally { setBusy(false) }
  }
  return <section className="space-y-4 rounded-2xl border border-[#d4e1d8] bg-white p-5">
    <div><h2 className="text-xl font-bold">Registros completos e alterações</h2><p className="text-sm text-[#4c665d]">Saúde assistida, peso, alimentação e confirmações diárias. O histórico de alterações começa nesta atualização; versões anteriores sobrescritas não estão disponíveis.</p></div>
    <div className="flex flex-wrap gap-3">
      <button onClick={() => setHistory(false)} aria-pressed={!history} className={`rounded-xl border p-3 ${!history ? 'bg-[#14372f] text-white' : ''}`}>Registros atuais</button>
      <button onClick={() => setHistory(true)} aria-pressed={history} className={`rounded-xl border p-3 ${history ? 'bg-[#14372f] text-white' : ''}`}>Histórico de alterações</button>
      <button onClick={() => setRefresh(r => r + 1)} disabled={busy} className="rounded-xl border p-3">Atualizar registros</button>
    </div>
    <div className="grid gap-3 sm:grid-cols-2">
      <label className="text-sm font-semibold">Categoria<select disabled={busy} className="mt-1 block w-full rounded-xl border border-[#8ba99b] p-3" value={collection} onChange={e => setCollection(e.target.value)}><option value="">Todas as categorias</option>{Object.entries(categories).map(([key, label]) => <option value={key} key={key}>{label}</option>)}</select></label>
      <label className="text-sm font-semibold">Pet<select disabled={busy} className="mt-1 block w-full rounded-xl border border-[#8ba99b] p-3" value={dog} onChange={e => setDog(e.target.value)}><option value="">Todos os pets (inclui excluídos)</option>{pets.filter(p => accountId === 'all' || p.accountId === accountId).map(p => <option value={p.id} key={p.id}>{p.name} · {accounts.find(a => a.id === p.accountId)?.email}</option>)}</select></label>
    </div>
    {error && <p role="alert" className="text-[#a4382b]">{error}</p>}
    {busy && <p role="status">Consultando banco…</p>}
    {!busy && !error && items.length === 0 && <p className="rounded-xl bg-[#f2f6f2] p-4">Nenhum registro nesta seleção.</p>}
    <div className="space-y-3">{items.map(item => {
      const content = item.data || item.after || item.before || {}
      const pet = pets.find(p => p.id === (item.collection === 'dogs' ? item.record_id || item.id : item.dog_id))
      const keys = history && item.action === 'update' ? [...new Set([...Object.keys(item.before || {}), ...Object.keys(item.after || {})])].filter(k => JSON.stringify(item.before?.[k]) !== JSON.stringify(item.after?.[k])) : Object.keys(content)
      return <details key={item.id} className="rounded-xl border border-[#cedbd0] p-4">
        <summary className="cursor-pointer text-sm leading-6"><strong>{categories[item.collection] || item.collection} · {pet?.name || String(content.name || content.title || (item.dog_id ? 'Pet excluído' : 'Registro'))}</strong>
          <span className="block text-[#4c665d]">{accounts.find(a => a.id === item.account_id)?.email} · {history ? ({ create: 'Criado', update: 'Alterado', delete: 'Excluído' }[item.action || ''] || '') : 'Atualizado'} em {date(item.changed_at || item.updated_at!)}{content.day ? ` · Dia ${content.day}` : ''}</span></summary>
        {history && item.action === 'update' ? <div className="overflow-x-auto mt-3"><table className="w-full min-w-[480px] text-left text-sm"><thead><tr><th className="p-2">Campo</th><th className="p-2">Antes</th><th className="p-2">Depois</th></tr></thead><tbody>{keys.map(k => <tr key={k} className="border-t"><th className="p-2 font-semibold">{labels[k] || k}</th><td className="p-2 align-top"><Value value={item.before?.[k]} /></td><td className="p-2 align-top"><Value value={item.after?.[k]} /></td></tr>)}</tbody></table>{keys.length === 0 && <p>Apenas metadados de atualização mudaram.</p>}</div> : <dl className="mt-4 grid gap-3 sm:grid-cols-2">{keys.map(k => <div key={k} className="min-w-0 rounded-lg bg-[#f2f6f2] p-3 text-sm"><dt className="font-semibold">{labels[k] || k}</dt><dd className="mt-1"><Value value={content[k]} />{!history && ['avatar', 'front_photo', 'spec_photo'].includes(k) && typeof content[k] === 'string' && <a className="block underline" target="_blank" rel="noreferrer" href={`/api/pilot/owner/files/${item.id}/${encodeURIComponent(content[k] as string)}`}>Abrir imagem</a>}</dd></div>)}</dl>}
        <p className="mt-3 text-xs text-[#587065]">Registro: {item.record_id || item.id}{history && item.action === 'delete' ? ' · Dados preservados após exclusão; imagens removidas não são recuperadas.' : ''}</p>
      </details>
    })}</div>
    {nextOffset !== null && <button disabled={busy} onClick={() => void more()} className="rounded-xl bg-[#14372f] px-5 py-3 text-white">Carregar mais registros</button>}
  </section>
}
