import { useEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, Download, ExternalLink, ZoomIn, ZoomOut } from 'lucide-react'
import { GlobalWorkerOptions, getDocument, type PDFDocumentProxy } from 'pdfjs-dist/legacy/build/pdf.mjs'
import workerUrl from 'pdfjs-dist/legacy/build/pdf.worker.min.mjs?url'
import { preferenceStorage } from '@/lib/preferences'
import { libraryPage, type LibraryDocument } from '@/lib/library-catalog'
GlobalWorkerOptions.workerSrc = workerUrl

export default function LibraryReader({ document: doc, initialPage }: { document: LibraryDocument; initialPage?: number }) {
  const progressKey = `bichu_library_page_${doc.id}_${doc.sha256.slice(0, 12)}`
  const [pdf, setPdf] = useState<PDFDocumentProxy | null>(null)
  const [page, setPage] = useState(() => libraryPage(initialPage ?? preferenceStorage.getItem(progressKey), doc.pages))
  const [zoom, setZoom] = useState(1), [width, setWidth] = useState(600)
  const [busy, setBusy] = useState(true), [error, setError] = useState(''), [text, setText] = useState('')
  const canvasRef = useRef<HTMLCanvasElement>(null), holderRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    let active = true
    setBusy(true); setError('')
    const task = getDocument({ url: doc.url, useSystemFonts: true, enableXfa: false, cMapUrl: '/pdf-resources/cmaps/', cMapPacked: true, standardFontDataUrl: '/pdf-resources/standard_fonts/', wasmUrl: '/pdf-resources/wasm/' })
    const timeout = setTimeout(() => { if (active) {setBusy(false); setError('O PDF demorou para responder. Abra o original ou volte ao perfil para tentar novamente.'); void task.destroy()} }, 30000)
    task.promise.then(value => { clearTimeout(timeout); if (active) setPdf(value) }).catch(() => { if (active) { setBusy(false); setError('Não foi possível abrir este PDF. Tente novamente ou abra o arquivo original.') } })
    return () => { active = false; clearTimeout(timeout); void task.destroy() }
  }, [doc.url])
  useEffect(() => {
    const holder = holderRef.current
    if (!holder) return
    const observer = new ResizeObserver(entries => setWidth(Math.max(240, entries[0].contentRect.width)))
    observer.observe(holder)
    return () => observer.disconnect()
  }, [])
  useEffect(() => {
    if (!pdf || !canvasRef.current) return
    let active = true
    let render: ReturnType<Awaited<ReturnType<PDFDocumentProxy['getPage']>>['render']> | undefined
    setBusy(true); setError(''); setText('')
    void (async () => {
      try {
        const current = await pdf.getPage(libraryPage(page, pdf.numPages))
        if (!active || !canvasRef.current) return
        const base = current.getViewport({ scale: 1 })
        const scale = Math.min(width - 4, 1000) / base.width * zoom
        const viewport = current.getViewport({ scale })
        const pixelRatio = Math.min(window.devicePixelRatio || 1, 2, Math.sqrt(8000000 / (viewport.width * viewport.height)))
        const canvas = canvasRef.current
        canvas.width = Math.ceil(viewport.width * pixelRatio); canvas.height = Math.ceil(viewport.height * pixelRatio)
        canvas.style.width = `${viewport.width}px`; canvas.style.height = `${viewport.height}px`
        render = current.render({ canvas, viewport, transform: [pixelRatio, 0, 0, pixelRatio, 0, 0] })
        await render.promise
        const content = await current.getTextContent()
        if (active) {
          setText(content.items.map(item => 'str' in item ? item.str : '').join(' '))
          setBusy(false)
          preferenceStorage.setItem(progressKey, String(page))
        }
      } catch (err) {
        if (active && !(err instanceof Error && err.name === 'RenderingCancelledException')) { setBusy(false); setError('A página não carregou. Abra o PDF original ou tente outra página.') }
      }
    })()
    return () => { active = false; render?.cancel() }
  }, [pdf, page, width, zoom, progressKey])
  const changePage = (value: number) => setPage(libraryPage(value, pdf?.numPages || doc.pages))
  return <section aria-label={`Leitor: ${doc.title}`} className="bl-reader">
    <div className="bl-reader-tools">
      <button onClick={() => changePage(page - 1)} disabled={page <= 1} aria-label="Página anterior"><ChevronLeft size={19}/></button>
      <label>Página <input aria-label="Número da página" type="number" min={1} max={pdf?.numPages || doc.pages} value={page} onChange={e => changePage(Number(e.target.value))}/> de {pdf?.numPages || doc.pages}</label>
      <button onClick={() => changePage(page + 1)} disabled={page >= (pdf?.numPages || doc.pages)} aria-label="Próxima página"><ChevronRight size={19}/></button>
      <button onClick={() => setZoom(v => Math.max(0.75, v - 0.25))} disabled={zoom <= 0.75} aria-label="Diminuir zoom"><ZoomOut size={19}/></button>
      <span>{Math.round(zoom * 100)}%</span>
      <button onClick={() => setZoom(v => Math.min(2, v + 0.25))} disabled={zoom >= 2} aria-label="Aumentar zoom"><ZoomIn size={19}/></button>
      <a href={doc.url} target="_blank" rel="noopener noreferrer"><ExternalLink size={16}/>Abrir original</a>
      <a href={doc.url} download={doc.originalName}><Download size={16}/>Baixar PDF</a>
    </div>
    {doc.fillable && <p className="bl-note">Este PDF contém campos preenchíveis. Para preenchê-los, baixe o original e abra em um leitor compatível. O preenchimento não é salvo no Meu Bichu.</p>}
    {doc.chapters.length > 0 && <details className="bl-toc"><summary>Sumário · ir a um capítulo</summary><div>{doc.chapters.map((chapter, index) => <button key={index} onClick={() => changePage(chapter.page)}>{chapter.title}<span>p. {chapter.page}</span></button>)}</div></details>}
    <div ref={holderRef} className="bl-page-holder" aria-busy={busy}>
      {busy && <p role="status">Carregando página {page}…</p>}
      {error && <p role="alert">{error}</p>}
      <div className="bl-page-scroll"><canvas ref={canvasRef} aria-label={`Página ${page} do documento ${doc.title}`} role="img"/></div>
    </div>
    {text && <details className="bl-page-text"><summary>Texto da página · leitura acessível</summary><p>{text}</p></details>}
  </section>
}
