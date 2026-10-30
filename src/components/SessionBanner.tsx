import { useEffect, useRef } from 'react'
import { ChevronDown, ShieldCheck } from 'lucide-react'
type Props = { email: string; matrixOriginal?: boolean }
export default function SessionBanner({ email, matrixOriginal }: Props) {
  const ref = useRef<HTMLElement>(null)
  useEffect(() => {
    const node = ref.current
    if (!node) return
    const update = () => document.documentElement.style.setProperty('--bichu-session-height', `${node.getBoundingClientRect().height}px`)
    const observer = new ResizeObserver(update)
    update(); observer.observe(node)
    return () => { observer.disconnect(); document.documentElement.style.removeProperty('--bichu-session-height') }
  }, [])
  return <aside ref={ref} className="bichu-session-banner" aria-label="Conta em edição">
    <div className="bichu-session-inner"><ShieldCheck size={19} aria-hidden="true"/>
      <div className="bichu-session-identity"><strong>{matrixOriginal ? 'Matriz · piloto 01' : 'Modo proprietário'}</strong><span title={email}>{email}</span></div>
      <p>As alterações são salvas nesta conta.</p>
      <details className="bichu-session-actions"><summary>Ações da conta <ChevronDown size={15}/></summary><nav aria-label="Ações do proprietário"><a href="/acesso-tutor">Trocar conta</a><a href="/painel/pendencias">Minhas responsabilidades</a><a href="/painel">Painel do proprietário</a></nav></details>
    </div>
  </aside>
}
