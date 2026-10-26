import OfflineNotice from '@/components/OfflineNotice'
import {preferenceStorage} from '@/lib/preferences'
import { loadPreferences, loadOfflinePreferences } from '@/lib/preferences'
import DeviceActivity from '@/components/DeviceActivity'
import { useEffect, useState, type FormEvent, type ReactNode } from 'react'

type Account = { id: string; email: string; expiresAt: number; ownerAccess?: boolean; labKind?: string }

export function PilotGate({ children }: { children: ReactNode }) {
  const [account, setAccount] = useState<Account | null>(null)
  const [loading, setLoading] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [understood, setUnderstood] = useState(false)
  const [eraseMode,setEraseMode]=useState(false)
  const [confirmation,setConfirmation]=useState('')

  useEffect(() => {
    async function checkAccess() {
      try {
        const access=new URLSearchParams(window.location.hash.slice(1)).get('access')
        if(access){const r=await fetch('/api/pilot/owner/unlock',{method:'POST',credentials:'same-origin',headers:{'content-type':'application/json'},body:JSON.stringify({token:access})});if(!r.ok)throw Error('Acesso privado não validado');history.replaceState(null,'',location.pathname+location.search)}
        const labTicket=new URLSearchParams(location.hash.slice(1)).get('lab')
        if(labTicket){const r=await fetch('/api/lab/enter',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({ticket:labTicket})});if(!r.ok)throw Error('Link de laboratório inválido ou expirado');history.replaceState(null,'',location.pathname+location.search);sessionStorage.removeItem('mb_offline_session');sessionStorage.removeItem('mb_active_account')}
        const response = await fetch('/api/pilot/me', { credentials: 'same-origin' })
        if (response.ok) { const data = await response.json(); await loadPreferences(data.id);sessionStorage.setItem('mb_lab_kind',data.labKind||'')
      sessionStorage.setItem('mb_offline_session',JSON.stringify(data));setAccount(data) }
        else {const owner=await fetch('/api/pilot/owner/session',{credentials:'same-origin',cache:'no-store'});if(owner.ok){location.replace('/acesso-tutor');return}}
      } catch {try{const cached=JSON.parse(sessionStorage.getItem('mb_offline_session')||'null');if(cached?.expiresAt>Date.now()){loadOfflinePreferences(cached.id);if(preferenceStorage.getItem('bichu_privacy_offline')==='false')throw Error('Cache desativado');setAccount(cached);setError('Modo offline: consultando os últimos dados sincronizados. Alterações exigem conexão.')}else setError('Sem conexão. Entre novamente quando estiver online.')}catch{setError('Sem conexão.')}}
      finally { setLoading(false) }
    }
    if('serviceWorker' in navigator)void navigator.serviceWorker.register('/sw.js').catch(()=>{})
    void checkAccess()
  }, [])

  async function login(event: FormEvent) {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      const response = await fetch(eraseMode?'/api/pilot/erase-account':'/api/pilot/login', {
        method: 'POST', credentials: 'same-origin', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email, password, confirmation }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Não foi possível entrar')
      setPassword('')
      if(eraseMode){localStorage.removeItem(`mb_preferences_${data.id}`);localStorage.removeItem(`mb_preferences_pending_${data.id}`);localStorage.removeItem(`mb_offline_${data.id}`);sessionStorage.removeItem('mb_offline_session');sessionStorage.removeItem('mb_active_account');setEraseMode(false);setError('Conta e dados excluídos do servidor.');return}
      await loadPreferences(data.id);sessionStorage.setItem('mb_lab_kind',data.labKind||'')
      sessionStorage.setItem('mb_offline_session',JSON.stringify(data));setAccount(data)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Falha de conexão')
    } finally { setBusy(false) }
  }

  if (loading) return <main className="min-h-screen grid place-items-center bg-[#102923] text-white">Verificando acesso…</main>
  if (account) return <>{account.labKind&&<aside className="bg-indigo-100 text-indigo-950 px-4 py-2 text-sm">Ambiente de desenvolvimento · {account.labKind==='matrix'?'Matriz':account.labKind==='dirty'?'Testes pesados':'Beta'} · dados separados dos usuários reais.</aside>}{account.ownerAccess?<aside className="bg-amber-100 text-amber-950 px-4 py-2 text-sm">Acesso do proprietário · {account.email} · alterações são salvas nesta conta. <a className="underline" href="/acesso-tutor">Trocar conta</a> · <a className="underline" href="/painel/pendencias">Minhas responsabilidades</a> · <a className="underline" href="/painel">Painel</a></aside>:<DeviceActivity key={account.id} />}<OfflineNotice/>{error&&<p role="status" className="bg-amber-100 p-3 text-sm text-amber-950">{error}</p>}{children}</>
  return <main className="min-h-screen grid place-items-center bg-[#102923] text-[#f5f9f6] px-4">
    <form onSubmit={login} className="w-full max-w-md rounded-3xl border border-[#53776c] bg-[#1b3c33] p-7 shadow-2xl space-y-5">
      <h1 className="text-2xl font-bold">{eraseMode?'Excluir conta e dados':'Entre no Meu Bichu'}</h1>
      <p className="text-sm text-[#d7e7de]">Entre com seu e-mail e senha. Novas contas públicas não expiram em sete dias; convites antigos seguem o prazo original.</p>
      <label className="block text-sm font-semibold">E-mail
        <input autoComplete="username" type="email" required value={email} onChange={e => setEmail(e.target.value)}
          className="mt-2 block w-full rounded-xl bg-white px-4 py-3 text-[#102923]" placeholder="voce@exemplo.com" />
      </label>
      <label className="block text-sm font-semibold">Senha
        <input autoComplete="current-password" type="password" required value={password} onChange={e => setPassword(e.target.value)}
          className="mt-2 block w-full rounded-xl bg-white px-4 py-3 text-[#102923]" />
      </label>
      {!eraseMode&&<label className="flex items-start gap-3 text-sm leading-relaxed text-[#e0eee5]">
        <input type="checkbox" required checked={understood} onChange={e => setUnderstood(e.target.checked)} className="mt-1" />
        <span>Entendi que meus registros serão armazenados para oferecer as funções do aplicativo. Métricas e localização são opcionais nas Configurações. Posso consultar a Política de Privacidade e excluir minha conta.</span>
      </label>}
      {eraseMode&&<label className="block text-sm">Exclusão definitiva: digite EXCLUIR<input required pattern="EXCLUIR" value={confirmation} onChange={e=>setConfirmation(e.target.value)} className="mt-2 block w-full rounded-xl bg-white p-3 text-[#102923]"/></label>}
      {error && <p role="alert" className="rounded-lg bg-[#713529] p-3 text-sm text-white">{error}</p>}
      <button disabled={busy} className="w-full rounded-xl bg-[#d3ebaa] py-3 font-bold text-[#17372c] disabled:opacity-50">{busy ? 'Aguarde…' : eraseMode?'Excluir conta definitivamente':'Entrar'}</button>
<button type="button" className="text-sm underline" onClick={()=>{setEraseMode(v=>!v);setConfirmation('');setError('')}}>{eraseMode?'Voltar ao acesso':'Excluir minha conta e meus dados (inclusive após expiração)'}</button><a href="/privacidade.html" className="block text-sm underline">Política de Privacidade</a>
    <nav className="flex flex-wrap gap-3 text-sm"><a className="underline" href="/acesso.html?modo=cadastro">Criar conta</a><a className="underline" href="/acesso.html?modo=recuperar">Esqueci minha senha</a><a className="underline" href="/termos.html">Termos</a><a className="underline" href="/suporte.html">Suporte</a></nav></form>
  </main>
}
