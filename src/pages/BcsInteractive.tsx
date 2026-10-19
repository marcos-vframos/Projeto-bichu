import { BCS_ENABLED } from '@/lib/features'
import FelineBcsRecord from '@/components/FelineBcsRecord'
import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Save } from 'lucide-react'
import { toast } from 'sonner'
import { useDog } from '@/contexts/DogContext'
import { nutritionService } from '@/services/nutrition'
import { getBcsCategory } from '@/lib/bcs-data'

type Assessment = { score: number; mcs: number; mode: string; finalized: boolean; palpated: boolean }
const MCS_LABELS = ['normal', 'perda leve', 'perda moderada', 'perda severa']

function BcsInteractiveActive({ embedded = false }: { embedded?: boolean }) {
  const { id } = useParams<{ id?: string }>()
  const navigate = useNavigate()
  const { dogs, activeDog, refreshDogs } = useDog()
  const dog = id && id !== 'guia' ? dogs.find(item => item.id === id) : activeDog || dogs[0]
  const frame = useRef<HTMLIFrameElement>(null)
  const [assessment, setAssessment] = useState<Assessment>({ score: 5, mcs: 0, mode: 'veterinary', finalized: false, palpated: false })
  const [saving, setSaving] = useState(false)
  const [notes, setNotes] = useState('')

  useEffect(() => {
    const receive = (event: MessageEvent) => {
      if (event.origin !== window.location.origin || event.source !== frame.current?.contentWindow) return
      const data = event.data
      if (data?.source !== 'meu-bichu-bcs-f14') return
      if (data.type === 'height') {
        if (frame.current && Number.isFinite(data.height) && data.height >= 400 && data.height < 12000) frame.current.style.height = `${data.height + 8}px`
        return
      }
      if (data.type !== 'assessment') return
      if (!Number.isInteger(data.score) || data.score < 1 || data.score > 9 || !Number.isInteger(data.mcs) || data.mcs < 0 || data.mcs > 3) return
      setAssessment({ score: data.score, mcs: data.mcs, mode: data.mode, finalized: Boolean(data.finalized), palpated: Boolean(data.palpated) })
    }
    window.addEventListener('message', receive)
    return () => window.removeEventListener('message', receive)
  }, [])

  const initializeFrame = async () => {
    let score = 5
    if (dog) {
      try {
        const evaluations = await nutritionService.getBcsEvaluations(dog.id)
        score = evaluations[0]?.score || (dog.body_condition === 'abaixo_do_ideal' ? 3 : dog.body_condition === 'acima_do_ideal' ? 7 : 5)
      } catch { /* A versão de demonstração e um servidor ausente podem não ter histórico. */ }
    }
    frame.current?.contentWindow?.postMessage({ source: 'meu-bichu-app', type: 'patient', id: dog?.id, name: dog?.name, weight: dog?.weight_kg, score }, window.location.origin)
  }

  const save = async () => {
    if (!dog) return
    if (assessment.mode === 'education') {
      toast.error('Selecione Triagem ou Instrumento veterinário antes de registrar.')
      return
    }
    if (assessment.mode === 'veterinary' && (!assessment.finalized || !assessment.palpated)) {
      toast.error('Finalize os achados e confirme a palpação no protocolo antes de registrar.')
      return
    }
    setSaving(true)
    try {
      const category = getBcsCategory(assessment.score)
      await nutritionService.createBcsEvaluation({
        dog: dog.id,
        score: assessment.score,
        category,
        weight_at_eval_kg: dog.weight_kg,
        evaluated_at: new Date().toISOString(),
        notes: `[Fase 14; ${assessment.mode}; MCS ${MCS_LABELS[assessment.mcs]}] ${notes.trim()}`.trim(),
        plan_adjusted: false,
      })
      await refreshDogs()
      toast.success(`BCS ${assessment.score}/9 registrado para ${dog.name}. Plano alimentar não alterado.`)
    } catch (error) {
      console.error(error)
      toast.error('Não foi possível salvar. Verifique a conexão e tente novamente.')
    } finally {
      setSaving(false)
    }
  }

  if (dog?.species === 'felina') return <FelineBcsRecord key={dog.id} pet={dog} />

  return (
    <div className="w-full mx-auto pb-20 space-y-4 text-[#f4f1e9]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {!embedded && <button type="button" onClick={() => navigate(-1)} className="flex items-center gap-2 text-sm text-amber-200 hover:text-white"><ArrowLeft size={17} /> Voltar</button>}
        {dogs.length > 1 && <select aria-label="Pet avaliado" value={dog?.id || ''} onChange={event => navigate(`/bcs/${event.target.value}`)} className="rounded-lg bg-neutral-900 border border-amber-600/30 p-2 text-white">{dogs.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select>}
      </div>
      <h1 className="text-2xl sm:text-3xl font-bold leading-tight">BCS e condição muscular {dog ? `· ${dog.name}` : '· guia'}</h1>
      {dog?.species === 'felina' && <p className="rounded-lg border border-amber-600/40 p-3 text-sm">O modelo do anexo representa um Border Collie. A avaliação visual não é específica para gatos.</p>}
      <iframe ref={frame} src="/bcs-fase14.html" title="Avaliação BCS/MCS 3D · Fase 14" onLoad={initializeFrame} className="block w-full min-h-[1150px] rounded-2xl border border-[#526874] bg-[#0c151d]" />
      <div className="rounded-2xl border border-amber-600/30 bg-black/50 p-5 space-y-3">
        <h2 className="text-lg font-bold">Registro no Meu Bichu</h2>
        <p className="text-sm text-neutral-300">BCS {assessment.score}/9 · MCS {MCS_LABELS[assessment.mcs]} · {assessment.mode === 'veterinary' ? 'Instrumento veterinário' : assessment.mode === 'triage' ? 'Triagem' : 'Educação'}. O modelo 3D é um protótipo não validado clinicamente.</p>
        <label className="block text-sm" htmlFor="bcs-app-notes">Observações</label>
        <textarea id="bcs-app-notes" value={notes} onChange={event => setNotes(event.target.value)} className="w-full min-h-20 rounded-lg bg-neutral-900 border border-white/20 p-3 text-white" placeholder="Contexto da avaliação" />
        <button type="button" disabled={!dog || saving || assessment.mode === 'education'} onClick={save} className="flex items-center gap-2 rounded-xl bg-amber-400 px-4 py-3 font-semibold text-black disabled:opacity-50"><Save size={17} /> {saving ? 'Salvando...' : `Salvar avaliação${dog ? ` de ${dog.name}` : ''}`}</button>
        <p className="text-sm text-neutral-400">O histórico e os alertas dentro do painel 3D pertencem à sessão atual. O botão acima grava BCS e MCS na avaliação do app; o esquema atual guarda MCS nas observações. Ajustes alimentares exigem revisão separada.</p>
      </div>
    </div>
  )
}

export default function BcsInteractivePage(props:{embedded?:boolean}){return BCS_ENABLED?<BcsInteractiveActive {...props}/>:<section className="rounded-2xl border border-border p-5"><h2 className="font-bold">BCS disponível em uma próxima versão</h2><p className="text-sm mt-2">Novas avaliações estão temporariamente inativas para revisão e validação veterinária. Os registros anteriores permanecem disponíveis no histórico.</p></section>}
