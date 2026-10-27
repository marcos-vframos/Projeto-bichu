import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Menu, X } from 'lucide-react'

type Item = { label: string; icon: ReactNode; action: () => void; disabled?: boolean; active?: boolean }
export default function OwnerMenu({ items }: { items: Item[] }) {
  const [open, setOpen] = useState(false)
  const trigger = useRef<HTMLButtonElement>(null), panel = useRef<HTMLElement>(null)
  useEffect(() => {
    if (!open) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    panel.current?.querySelector<HTMLButtonElement>('button')?.focus()
    const keydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); setOpen(false); return }
      if (event.key !== 'Tab') return
      const elements = Array.from(panel.current?.querySelectorAll<HTMLElement>('button:not(:disabled),a[href]') || [])
      const first = elements[0], last = elements[elements.length - 1]
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus() }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus() }
    }
    document.addEventListener('keydown', keydown)
    return () => { document.body.style.overflow = previousOverflow; document.removeEventListener('keydown', keydown); trigger.current?.focus() }
  }, [open])
  return <>
    <button ref={trigger} type="button" aria-expanded={open} aria-controls="owner-navigation" aria-label="Abrir menu do proprietário" onClick={() => setOpen(true)} className="flex items-center gap-2 rounded-xl border border-white/50 px-4 py-3 text-sm font-semibold hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-white"><Menu className="h-5 w-5" aria-hidden="true" />Menu</button>
    {open && <>
      <button type="button" aria-label="Fechar menu ao clicar fora" onClick={() => setOpen(false)} className="fixed inset-0 z-40 bg-black/35" />
      <aside ref={panel} id="owner-navigation" role="dialog" aria-modal="true" aria-labelledby="owner-navigation-title" className="fixed inset-y-0 left-0 z-50 flex w-[min(21rem,92vw)] flex-col overflow-y-auto bg-[#14372f] p-5 text-white shadow-2xl">
        <div className="mb-6 flex items-center justify-between gap-3"><div><p className="text-xs uppercase tracking-widest text-[#c3dfcc]">Meu Bichu</p><h2 id="owner-navigation-title" className="text-xl font-bold">Área do proprietário</h2></div><button type="button" onClick={() => setOpen(false)} aria-label="Fechar menu lateral" className="rounded-xl border border-white/40 p-2 hover:bg-white/10"><X className="h-5 w-5" /></button></div>
        <nav aria-label="Áreas do proprietário" className="space-y-2">{items.map(item => <button key={item.label} type="button" disabled={item.disabled} aria-current={item.active ? 'page' : undefined} onClick={() => { setOpen(false); item.action() }} className={`flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left text-sm font-medium transition disabled:opacity-50 ${item.active ? 'border-[#cfebaa] bg-white/15' : 'border-white/20 hover:bg-white/10'}`}><span className="[&>svg]:h-5 [&>svg]:w-5" aria-hidden="true">{item.icon}</span>{item.label}</button>)}</nav>
        <p className="mt-6 text-xs leading-relaxed text-[#d4e5db]">Os acessos continuam separados por permissão. Testes e dados dos participantes são consultados em suas respectivas áreas.</p>
      </aside>
    </>}
  </>
}
