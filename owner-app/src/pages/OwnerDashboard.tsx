import { fetchOwnerData } from '@/owner-data'
import AccountPicker from '@/components/AccountPicker'
import DeviceDetails from '@/components/DeviceDetails'
import ParticipantSummary from '@/components/ParticipantSummary'
import FeedbackInbox from '@/components/FeedbackInbox'
import OwnerRecords from '@/components/OwnerRecords'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts'
import { Activity, Clock3, Dog, RefreshCw, ShieldCheck, TriangleAlert, X } from 'lucide-react'

type Account = { id: string; email: string; firstAccessAt: number | null; expiresAt: number | null;
  lastActivityAt: number | null; petCount: number; recordCount: number; pageLoads: number; errors: number;
  slowRequests: number; measuredRequests: number; avgMs: number | null; p95Ms: number | null }
type Pet = { id: string; accountId: string; name: string; weightKg: number | null; createdAt: string; updatedAt: string }
type Weight = { accountId: string; dogId: string; weightKg: number; loggedAt: string }
type Bcs = { accountId: string; dogId: string; score: number; evaluatedAt: string }
type Device = { id: string; accountId: string; activeMs: number; lastSeen: number; browser: string; screen: string; route: string; locationStatus: string; location?: { latitude: number; longitude: number; accuracy: number; recordedAt: number } }
type DeviceEvent = { accountId: string; deviceId: string | null; event: string; durationMs: number; createdAt: number; details: Record<string, unknown> }
export type { Device, DeviceEvent }
type Dashboard = { devices: Device[]; events: DeviceEvent[]; generatedAt: number; accounts: Account[]; pets: Pet[]; weights: Weight[]; bcs: Bcs[]; truncated: boolean; coverage: string }

const date = (value: number | string | null) => value ? new Date(value).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : '—'
const number = (value: number | null, suffix = '') => value === null ? 'Sem medição' : `${value.toLocaleString('pt-BR')}${suffix}`

export default function OwnerDashboard() {
  const [data, setData] = useState<Dashboard | null>(null)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [area, setArea] = useState<'accounts' | 'pets' | 'errors' | 'timings' | 'feedback' | null>(null)
  const [deviceView, setDeviceView] = useState('all')
  const selectedId = selectedIds.length === 1 ? selectedIds[0] : 'all'
  const show = (id: string) => !selectedIds.length || selectedIds.includes(id)
  const go = (next: 'accounts' | 'pets' | 'errors' | 'timings' | 'feedback') => { setDeviceView(next === 'errors' || next === 'timings' ? next : 'all'); setArea(next) }
  useEffect(() => { if (area) { const title = document.getElementById('area-title'); title?.focus({ preventScroll: true }); title?.scrollIntoView({ behavior: 'smooth', block: 'start' }) } }, [area])
  const [state, setState] = useState<'loading' | 'ready' | 'denied' | 'error'>('loading')

  const reload = useCallback(async () => {
    setState('loading')
    try {
      const token = new URLSearchParams(window.location.hash.slice(1)).get('access')
      if (token) {
        window.history.replaceState(null, '', '/painel')
        const unlocked = await fetch('/api/pilot/owner/unlock', { method: 'POST', credentials: 'same-origin',
          headers: { 'content-type': 'application/json' }, body: JSON.stringify({ token }) })
        if (unlocked.status === 403) { setState('denied'); return }
        if (!unlocked.ok) throw new Error('Erro ao abrir acesso')
      }
      const response = await fetchOwnerData('/api/pilot/owner/dashboard', { credentials: 'same-origin', cache: 'no-store' })
      if (response.status === 403) { setState('denied'); return }
      if (!response.ok) throw new Error('Erro ao consultar dados')
      setData(await response.json())
      setState('ready')
    } catch { setState('error') }
  }, [])
  useEffect(() => {
    const onLink = () => { if (new URLSearchParams(window.location.hash.slice(1)).has('access')) void reload() }
    window.addEventListener('hashchange', onLink)
    void reload()
    return () => window.removeEventListener('hashchange', onLink)
  }, [reload])

  const accounts = data?.accounts || []
  const visible = useMemo(() => accounts.filter(a => show(a.id)), [accounts, selectedIds])
  const pets = useMemo(() => (data?.pets || []).filter(p => show(p.accountId)), [data, selectedIds])
  const active = visible.filter(a => a.firstAccessAt && a.expiresAt && a.expiresAt > Date.now()).length
  const started = visible.filter(a => a.firstAccessAt).length
  const totalErrors = visible.reduce((sum, a) => sum + a.errors, 0)
  const allTimings = visible.filter(a => a.avgMs !== null && a.measuredRequests)
  const weightedAverage = allTimings.length ? Math.round(allTimings.reduce((sum, a) => sum + a.avgMs! * a.measuredRequests, 0) /
    allTimings.reduce((sum, a) => sum + a.measuredRequests, 0)) : null

  return <main className="min-h-screen bg-[#f4f7f2] text-[#18372e]">
    <header className="bg-[#14372f] text-white px-4 py-5">
      <div className="mx-auto max-w-7xl flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3"><ShieldCheck className="h-7 w-7 text-[#cfebaa]" aria-hidden="true" />
          <div><p className="text-xs uppercase tracking-widest text-[#c3dfcc]">Meu Bichu · proprietário</p>
            <h1 className="text-2xl font-bold">Painel do piloto</h1></div></div>
        <div className="flex items-center gap-4 text-sm">
          <a href="/painel/equipe" className="rounded-xl border border-white/50 px-3 py-2">Equipe e atribuições</a><button onClick={() => void reload()} className="flex items-center gap-2 rounded-xl border border-white/50 px-3 py-2 hover:bg-white/10"><RefreshCw className="h-4 w-4" />Atualizar</button></div>
      </div>
    </header>
    <div className="mx-auto max-w-7xl px-4 py-7 space-y-7">
      {state === 'loading' && <p role="status">Carregando dados do piloto…</p>}
      {state === 'denied' && <section className="max-w-xl rounded-2xl bg-white border border-[#cedbd0] p-6 space-y-4 shadow-sm">
        <h2 className="text-xl font-bold">Acesso exclusivo do proprietário</h2>
        <p>Abra o link administrativo privado recebido para visualizar os dados sem login ou senha. Guarde esse link somente com você.</p>
      </section>}
      {state === 'error' && <div role="alert" className="rounded-xl border border-[#a85648] bg-[#fff2ef] p-5">Não foi possível consultar o banco agora. Atualize a página para tentar novamente.</div>}
      {state === 'ready' && data && <>
        <div className="flex flex-wrap items-end justify-between gap-4"><div><h2 className="text-xl font-bold">Acompanhamento das dez contas</h2>
          <p className="text-sm text-[#4c665d]">Atualizado em {date(data.generatedAt)}. Os dados anteriores do PocketBase ainda não foram importados.</p></div>
          <AccountPicker accounts={accounts} selectedIds={selectedIds} onChange={setSelectedIds} /></div>
        {data.truncated && <p role="alert" className="rounded-xl bg-[#fff2d9] p-4 text-sm">A consulta atingiu o limite de registros. Os totais de atividade e gráficos podem estar incompletos.</p>}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Metric icon={<Activity />} active={area === 'accounts'} onClick={() => go('accounts')} label="Contas iniciadas" value={`${started} de ${visible.length}`} detail={`${active} com acesso vigente`} />
          <Metric icon={<Dog />} active={area === 'pets'} onClick={() => go('pets')} label="Pets registrados" value={String(pets.length)} detail="No banco do piloto" />
          <Metric icon={<TriangleAlert />} active={area === 'errors'} onClick={() => go('errors')} label="Falhas registradas" value={String(totalErrors)} detail="Erros registrados no app" />
          <Metric icon={<Clock3 />} active={area === 'timings'} onClick={() => go('timings')} label="Resposta média da API" value={number(weightedAverage, ' ms')} detail="Requisições medidas" />
        </div>
        <button onClick={()=>go('feedback')} aria-expanded={area==='feedback'} className="rounded-xl border border-[#8ba99b] bg-white px-5 py-3 font-semibold">Feedbacks recebidos e respostas</button>
        {area && <div id="selected-area" className="space-y-5">
          <div className="flex items-center justify-between gap-3 border-b border-[#d4e1d8] pb-3"><h2 id="area-title" tabIndex={-1} className="text-xl font-bold focus:outline-none">{{accounts:'Contas e cadastros',pets:'Pets, saúde e alimentação',errors:'Falhas e atividade dos aparelhos',timings:'Tempos de resposta e uso',feedback:'Feedbacks recebidos e respostas'}[area]}</h2><button onClick={() => setArea(null)} className="flex items-center gap-2 rounded-xl border border-[#8ba99b] px-3 py-2 hover:bg-white"><X className="h-4 w-4" aria-hidden="true" />Fechar área</button></div>
        {area === 'feedback' && <FeedbackInbox key={data.generatedAt} accounts={accounts} selectedIds={selectedIds} />}
        {area === 'accounts' && <ParticipantSummary key={data.generatedAt} selectedIds={selectedIds} pets={data.pets} />}
        {area === 'accounts' && <section id="accounts" className="scroll-mt-4 rounded-2xl bg-white border border-[#d4e1d8] shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-[#d4e1d8]"><h2 className="text-lg font-bold">Atividade por conta</h2><p className="text-sm text-[#4c665d]">Entradas, registros e desempenho de cada participante.</p></div>
          <div className="overflow-x-auto"><table className="w-full min-w-[850px] text-left text-sm">
            <thead className="bg-[#eaf1e9] text-[#294b3e]"><tr>{['Conta', 'Situação', 'Última atividade', 'Pets / registros', 'Falhas', 'Média / p95'].map(h => <th key={h} scope="col" className="px-4 py-3 font-semibold">{h}</th>)}</tr></thead>
            <tbody>{visible.map(a => <tr key={a.id} className="border-t border-[#e3ebe5]">
              <td className="px-4 py-3 font-semibold">{a.email}<div className="font-normal text-xs text-[#587065]">Primeiro acesso: {date(a.firstAccessAt)}</div></td>
              <td className="px-4 py-3">{!a.firstAccessAt ? 'Aguardando primeiro login' : a.expiresAt && a.expiresAt > Date.now() ? `Ativo até ${date(a.expiresAt)}` : 'Expirado'}</td>
              <td className="px-4 py-3">{date(a.lastActivityAt)}<div className="text-xs text-[#587065]">{a.pageLoads} abertura(s) registrada(s)</div></td>
              <td className="px-4 py-3">{a.petCount} / {a.recordCount}</td>
              <td className="px-4 py-3">{a.errors}<div className="text-xs text-[#587065]">{a.slowRequests} requisição(ões) lentas</div></td>
              <td className="px-4 py-3">{number(a.avgMs, ' ms')} / {number(a.p95Ms, ' ms')}<div className="text-xs text-[#587065]">{a.measuredRequests} amostra(s)</div></td>
            </tr>)}</tbody>
          </table></div>
        </section>}
        {area === 'pets' && <section id="pets" className="scroll-mt-4 space-y-3"><div><h2 className="text-lg font-bold">Evolução dos pets</h2><p className="text-sm text-[#4c665d]">Histórico de peso e avaliações de BCS. Os números isolados não são diagnóstico clínico.</p></div>
          {pets.length === 0 ? <div className="rounded-2xl border border-[#d4e1d8] bg-white p-6">Nenhum pet cadastrado nesta seleção.</div> : <div className="grid gap-4 lg:grid-cols-2">{pets.map(pet => {
            const history = (data.weights || []).filter(w => w.dogId === pet.id && w.accountId === pet.accountId)
              .sort((a, b) => Date.parse(a.loggedAt) - Date.parse(b.loggedAt))
              .map(w => ({ date: new Date(/T00:00:00(?:\.000)?Z$/.test(w.loggedAt) ? `${w.loggedAt.slice(0,10)}T12:00:00-03:00` : w.loggedAt).toLocaleDateString('pt-BR'), peso: w.weightKg }))
            const evaluations = (data.bcs || []).filter(b => b.dogId === pet.id && b.accountId === pet.accountId)
              .sort((a, b) => Date.parse(a.evaluatedAt) - Date.parse(b.evaluatedAt))
            const owner = accounts.find(a => a.id === pet.accountId)
            return <article key={pet.id} className="rounded-2xl border border-[#d4e1d8] bg-white p-5 shadow-sm">
              <div className="flex flex-wrap justify-between gap-2"><div><h3 className="text-lg font-bold">{pet.name}</h3><p className="text-sm text-[#587065]">{owner?.email}</p></div><div className="text-right"><strong>{number(pet.weightKg, ' kg')}</strong><p className="text-xs text-[#587065]">Peso atual</p></div></div>
              {history.length ? <div className="mt-5 h-48" aria-label={`Gráfico de peso de ${pet.name}`} role="img">
                <ResponsiveContainer width="100%" height="100%"><LineChart data={history} margin={{ top: 8, right: 14, bottom: 4, left: 0 }}>
                  <CartesianGrid stroke="#e3ebe5" strokeDasharray="3 3" /><XAxis dataKey="date" tick={{ fontSize: 11 }} /><YAxis domain={['auto', 'auto']} tick={{ fontSize: 11 }} unit=" kg" width={55} />
                  <Tooltip formatter={(value) => [`${value} kg`, 'Peso']} /><Line dataKey="peso" stroke="#2b7760" strokeWidth={3} dot={{ r: 4 }} isAnimationActive={false} />
                </LineChart></ResponsiveContainer>
              </div> : <p className="mt-5 rounded-xl bg-[#f2f6f2] p-4 text-sm">Sem pesagens no histórico.</p>}
              <p className="mt-2 text-sm text-[#3e5d50]">BCS: {evaluations.length ? evaluations.map(b => `${b.score}/9 (${new Date(b.evaluatedAt).toLocaleDateString('pt-BR')})`).join(' → ') : 'sem avaliação'}</p>
              <p className="mt-2 text-xs text-[#587065]">{history.length} pesagem(ns) · atualização: {date(pet.updatedAt)}</p>
            </article>
          })}</div>}
        </section>}
        {(area === 'errors' || area === 'timings') && <DeviceDetails key={area} devices={(data.devices || []).filter(d => show(d.accountId))} events={(data.events || []).filter(e => show(e.accountId))} accounts={visible} mode={deviceView} onMode={setDeviceView} />}
        {(area === 'accounts' || area === 'pets') && <OwnerRecords scope={area} key={`${area}_${data.generatedAt}_${selectedIds.join(',')}`} accounts={accounts} pets={data.pets} accountId={selectedId} accountIds={selectedIds} />}
        <p className="text-sm text-[#536b61]">{data.coverage} A expiração impede o login, mas não apaga os dados já armazenados.</p>
        </div>}
      </>}
    </div>
  </main>
}

function Metric({ icon, label, value, detail, onClick, active }: { icon: React.ReactNode; label: string; value: string; detail: string; onClick: () => void; active: boolean }) {
  return <button type="button" onClick={onClick} aria-expanded={active} aria-controls="selected-area" className="text-left hover:border-[#34745d] focus-visible:outline-2 focus-visible:outline-[#34745d] rounded-2xl border border-[#d4e1d8] bg-white p-5 shadow-sm"><div className="flex items-center gap-2 text-[#34745d]">{icon}<span className="text-sm font-semibold text-[#3e5d50]">{label}</span></div>
    <p className="mt-3 text-2xl font-bold">{value}</p><p className="mt-1 text-sm text-[#587065]">{detail}</p></button>
}
