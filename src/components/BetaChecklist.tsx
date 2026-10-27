import { useEffect, useState, type FormEvent } from 'react'
import { ClipboardCheck } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

type Step = { id: string; label: string; status: string; note: string }
const choices = [['not_tested','Ainda não testei'],['passed','Funcionou'],['failed','Falhou'],['not_applicable','Não se aplica']]
export default function BetaChecklist() {
  const enabled = sessionStorage.getItem('mb_lab_kind') === 'beta'
  const [open,setOpen] = useState(false), [busy,setBusy] = useState(false), [loading,setLoading] = useState(false)
  const [steps,setSteps] = useState<Step[]>([]), [revision,setRevision] = useState<number|null>(null), [release,setRelease] = useState('')
  const [message,setMessage] = useState(''), [dirty,setDirty] = useState(false), [conflict,setConflict] = useState(false), [refresh,setRefresh] = useState(0)
  useEffect(() => {
    if (!open || !enabled) return
    const controller = new AbortController()
    setLoading(true); setRevision(null); setSteps([]); setMessage(''); setConflict(false); setDirty(false)
    fetch('/api/pilot/lab-checklist', { credentials:'same-origin',cache:'no-store',headers:{'x-mb-account-id':sessionStorage.getItem('mb_active_account')||''},signal:controller.signal })
      .then(async r => { const data=await r.json(); if(!r.ok)throw Error(data.error||'Não foi possível consultar o checklist'); setSteps(data.steps);setRevision(data.revision);setRelease(data.release);if(data.release!==__APP_RELEASE__)setMessage('A versão mudou. Atualize o aplicativo antes de responder este checklist.') })
      .catch(error => {if(!controller.signal.aborted)setMessage(error instanceof Error?error.message:'Falha de conexão')})
      .finally(() => {if(!controller.signal.aborted)setLoading(false)})
    return () => controller.abort()
  }, [open,enabled,refresh])
  if (!enabled) return null
  const change = (id:string,field:'status'|'note',value:string) => {setSteps(current=>current.map(step=>step.id===id?{...step,[field]:value}:step));setDirty(true)}
  const close = (next:boolean) => {if(busy)return;if(!next&&dirty&&!window.confirm('Há respostas ainda não enviadas. Fechar sem salvar?'))return;setOpen(next)}
  async function send(event:FormEvent) {
    event.preventDefault();if(revision===null)return;setBusy(true);setMessage('');setConflict(false)
    try {
      const response=await fetch('/api/pilot/lab-checklist',{method:'POST',credentials:'same-origin',headers:{'content-type':'application/json','x-mb-account-id':sessionStorage.getItem('mb_active_account')||''},body:JSON.stringify({expectedRevision:revision,clientRelease:__APP_RELEASE__,steps:steps.map(({id,status,note})=>({id,status,note}))})})
      const data=await response.json()
      if(!response.ok){setConflict(response.status===409);throw Error(data.error||'Não foi possível enviar')}
      setRevision(data.revision);setDirty(false);setMessage('Checklist salvo para esta conta e versão. O proprietário pode consultar suas respostas.')
    }catch(error){setMessage(error instanceof Error?error.message:'Falha de conexão; suas respostas continuam nesta tela.')}
    finally{setBusy(false)}
  }
  return <>
    <button type="button" onClick={()=>setOpen(true)} className="fixed bottom-20 right-4 z-30 flex items-center gap-2 rounded-full border border-[#7d91a8] bg-[#eef5ec] px-4 py-3 text-sm font-semibold text-[#173b35] shadow-lg"><ClipboardCheck className="h-4 w-4"/>Checklist do teste</button>
    <Dialog open={open} onOpenChange={close}><DialogContent className="max-h-[90dvh] overflow-y-auto"><DialogHeader><DialogTitle>Checklist desta versão beta</DialogTitle></DialogHeader>
      <p className="text-sm">Confirme o que você realmente testou. Este envio é manual e não ativa métricas do aparelho. Use dados fictícios.</p>
      {release&&<p className="break-all text-xs">Versão: {release} · resposta {revision??'—'}</p>}
      {loading&&<p role="status">Consultando respostas…</p>}
      <form onSubmit={event=>void send(event)} className="space-y-4">{steps.map(step=><fieldset key={step.id} className="rounded-xl border p-3"><legend className="px-1 text-sm font-semibold">{step.label}</legend><label htmlFor={'check-'+step.id} className="text-sm">Resultado</label><select id={'check-'+step.id} value={step.status} onChange={e=>change(step.id,'status',e.target.value)} disabled={busy} className="mt-1 block w-full rounded-lg border bg-white p-3 text-[#18372e]">{choices.map(([value,label])=><option key={value} value={value}>{label}</option>)}</select><label htmlFor={'note-'+step.id} className="mt-3 block text-sm">O que aconteceu? <span className="font-normal">(opcional)</span></label><textarea id={'note-'+step.id} value={step.note} onChange={e=>change(step.id,'note',e.target.value)} maxLength={1000} rows={2} disabled={busy} className="mt-1 w-full rounded-lg border p-3"/></fieldset>)}
        <button disabled={busy||loading||revision===null||release!==__APP_RELEASE__} className="rounded-xl bg-[#173b35] px-4 py-3 font-semibold text-white disabled:opacity-50">{busy?'Salvando…':'Enviar checklist'}</button>
        {message&&<p role="status" className="text-sm">{message}</p>}
        {conflict&&<button type="button" onClick={()=>{if(!dirty||window.confirm('Descartar as respostas desta tela e consultar as salvas?'))setRefresh(n=>n+1)}} className="rounded-lg border px-3 py-2 text-sm">Recarregar respostas salvas</button>}
      </form>
    </DialogContent></Dialog>
  </>
}
