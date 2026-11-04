import { ChevronDown, ShieldCheck } from 'lucide-react'
type Props = { email: string; matrixOriginal?: boolean }
export default function SessionBanner({ email, matrixOriginal }: Props) {
  return <aside className="bichu-session-banner" aria-label="Conta em edição">
    <div className="bichu-session-inner"><ShieldCheck size={19} aria-hidden="true"/>
      <div className="bichu-session-identity"><strong>{matrixOriginal ? 'Matriz · piloto 01' : 'Modo proprietário'}</strong><span title={email}>{email}</span></div>
      <p>As alterações são salvas nesta conta.</p>
      <details className="bichu-session-actions"><summary>Ações da conta <ChevronDown size={15}/></summary><nav aria-label="Ações do proprietário"><a href="/acesso-tutor">Trocar conta</a><a href="/painel/pendencias">Minhas responsabilidades</a><a href="/painel">Painel do proprietário</a></nav></details>
    </div>
  </aside>
}

