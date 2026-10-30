import { lazy, Suspense, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ArrowLeft, ArrowUpRight, BookOpen, Bookmark, Cat, Check, ChevronRight, ClipboardList, Dog, FileText, Search, X } from 'lucide-react'
import { libraryTopics, matchesLibrarySearch, parseLibraryCatalog, topicChapter, type LibraryCatalog } from '@/lib/library-catalog'
import { preferenceStorage } from '@/lib/preferences'
import './library/library.css'
const LibraryReader = lazy(() => import('@/components/LibraryReader'))
type Area = 'all' | 'dogs' | 'cats' | 'topics' | 'forms' | 'saved'
const areas: {id: Area; label: string; icon: typeof Dog}[] = [
  {id:'all',label:'Todo o acervo',icon:BookOpen}, {id:'dogs',label:'Cães',icon:Dog}, {id:'cats',label:'Gatos',icon:Cat},
  {id:'topics',label:'Cuidados por tema',icon:BookOpen}, {id:'forms',label:'Fichas e checklists',icon:ClipboardList}, {id:'saved',label:'Salvos',icon:Bookmark},
]
export default function Library() {
  const [catalog, setCatalog] = useState<LibraryCatalog | null>(null), [error, setError] = useState(''), [attempt, setAttempt] = useState(0)
  const [params, setParams] = useSearchParams()
  const area = (areas.some(a => a.id === params.get('area')) ? params.get('area') : 'all') as Area
  const [search, setSearch] = useState(''), [limit, setLimit] = useState(12)
  const [saved, setSaved] = useState<Set<string>>(new Set())
  useEffect(() => {
    let active = true
    const controller = new AbortController(), timeout = setTimeout(() => controller.abort(), 15000)
    setError('')
    fetch('/biblioteca/catalogo.json', {signal:controller.signal, cache:'no-cache'})
      .then(r => {if (!r.ok) throw Error(); return r.json()})
      .then(value => {if (active) setCatalog(parseLibraryCatalog(value))})
      .catch(() => {if (active) setError('Não foi possível carregar a Biblioteca. Confira sua conexão e tente novamente.')})
      .finally(() => clearTimeout(timeout))
    return () => {active = false; clearTimeout(timeout); controller.abort()}
  }, [attempt])
  useEffect(() => {
    if (catalog) setSaved(new Set(catalog.breeds.filter(b => preferenceStorage.getItem(`bichu_library_saved_${b.id}`) === 'true').map(b => b.id)))
  }, [catalog])
  useEffect(() => {setLimit(12)}, [search, area, params.get('tema')])
  useEffect(() => {window.scrollTo({top:0, behavior:'instant'})}, [params.get('raca'), params.get('pdf')])
  const breed = catalog?.breeds.find(b => b.id === params.get('raca'))
  const doc = breed?.documents.find(d => d.id === params.get('pdf'))
  const topic = params.get('tema') || ''
  const visible = useMemo(() => (catalog?.breeds || []).filter(b =>
    (area !== 'dogs' && area !== 'cats' || b.species === area) &&
    (area !== 'forms' || b.documents.some(d => d.fillable)) &&
    (area !== 'saved' || saved.has(b.id)) &&
    (!topic || b.documents.some(d => topicChapter(d, topic))) && matchesLibrarySearch(b, search)
  ), [catalog, area, topic, search, saved])
  function selectArea(value: Area) {setSearch(''); setParams(value === 'all' ? {} : {area:value})}
  function openBreed(id: string) {setParams({area,raca:id})}
  function openDoc(id: string, page?: number) {if (breed) setParams({area,raca:breed.id,pdf:id,...(page ? {pagina:String(page)} : {})})}
  function toggleSaved(id: string) {
    const next = new Set(saved), key = `bichu_library_saved_${id}`
    if (next.has(id)) {next.delete(id); preferenceStorage.removeItem(key)} else {next.add(id); preferenceStorage.setItem(key,'true')}
    setSaved(next)
  }
  if (!catalog) return <div className="bichu-library"><h1>Biblioteca</h1>{error ? <div role="alert"><p>{error}</p><button onClick={() => setAttempt(v => v+1)}>Tentar novamente</button></div> : <p role="status">Preparando a Biblioteca…</p>}</div>
  const documentCount = catalog.breeds.reduce((n,b) => n+b.documents.length,0)
  return <div className="bichu-library">
    <header className="bl-heading"><div><span className="bl-eyebrow">MEU BICHU · BIBLIOTECA</span><h1>Conhecer também é cuidar.</h1></div><button className="bl-saved" onClick={() => selectArea('saved')}><Bookmark size={18}/>Salvos <span>{saved.size}</span></button></header>
    <nav className="bl-areas" aria-label="Áreas da Biblioteca">{areas.map(({id,label,icon:Icon}) => <button key={id} aria-pressed={area === id} onClick={() => selectArea(id)}><Icon size={17}/>{label}</button>)}</nav>
    {params.has('raca') && !breed ? <section className="bl-empty"><p>Este perfil não está no acervo.</p><button onClick={() => selectArea('all')}>Voltar à Biblioteca</button></section> : breed ? <>
      <div className="bl-breadcrumb"><button onClick={() => doc ? setParams({area,raca:breed.id}) : selectArea(area)}><ArrowLeft size={16}/>{doc ? 'Voltar ao perfil' : 'Voltar ao acervo'}</button><span>{breed.name}{doc ? ` / ${doc.edition}` : ''}</span></div>
      <section className="bl-profile"><img src={breed.cover} alt={breed.name}/><div><span className="bl-eyebrow">{breed.species === 'dogs' ? 'CÃES' : 'GATOS'} · CUIDADO INTELIGENTE</span><h2>{breed.name}</h2><p>{breed.summary}</p><div className="bl-tags">{breed.tags.map(tag => <span key={tag}>{tag}</span>)}</div><button className="bl-favorite" aria-pressed={saved.has(breed.id)} onClick={() => toggleSaved(breed.id)}>{saved.has(breed.id) ? <Check size={17}/> : <Bookmark size={17}/>} {saved.has(breed.id) ? 'Perfil salvo' : 'Salvar perfil'}</button></div></section>
      {doc ? <section><h2 className="bl-section-title">{doc.title}</h2><p className="bl-muted">{doc.edition} · {doc.pages} páginas</p><Suspense fallback={<p role="status">Abrindo leitor…</p>}><LibraryReader key={`${doc.id}-${params.get('pagina') || 'resume'}`} document={doc} initialPage={params.has('pagina') ? Number(params.get('pagina')) : undefined}/></Suspense></section> : params.has('pdf') ? <section className="bl-empty">Documento não encontrado. Selecione uma das edições do perfil.</section> : <>
        <h2 className="bl-section-title">Explore por assunto</h2><div className="bl-topics">{libraryTopics.map(t => {const candidate = breed.documents.map(d => ({d,ch:topicChapter(d,t.id)})).find(x => x.ch);return candidate ? <button key={t.id} onClick={() => openDoc(candidate.d.id,candidate.ch?.page)}><BookOpen size={18}/><span>{t.title}</span><ChevronRight size={17}/></button> : null})}</div>
        <h2 className="bl-section-title">PDFs e versões <span>{breed.documents.length}</span></h2><p className="bl-muted">Escolha a edição para ler. Sua última página é guardada por documento.</p><div className="bl-documents">{breed.documents.map(d => <article key={d.id}><FileText size={25}/><div><h3>{d.title}</h3><p>{d.edition} · {d.pages} páginas · {(d.bytes/1048576).toLocaleString('pt-BR',{maximumFractionDigits:1})} MB</p>{d.fillable && <span className="bl-tag">Campos preenchíveis no PDF original</span>}</div><button onClick={() => openDoc(d.id)}>Ler PDF <ArrowUpRight size={16}/></button></article>)}</div>
      </>}
    </> : <>
      <section className="bl-intro"><div><span className="bl-eyebrow">COLEÇÃO CUIDADO INTELIGENTE</span><h2>{area === 'all' ? 'Um espaço para aprender, consultar e voltar.' : areas.find(a => a.id===area)?.label}</h2><p>{catalog.breeds.length} perfis de raça · {documentCount} PDFs · conteúdo para cães e gatos</p></div><BookOpen className="bl-intro-icon" size={65}/></section>
      <div className="bl-search"><Search size={19}/><input aria-label="Buscar raça ou assunto" placeholder="Buscar raça ou assunto…" value={search} onChange={e=>setSearch(e.target.value)}/>{search && <button aria-label="Limpar busca" onClick={()=>setSearch('')}><X size={17}/></button>}</div>
      {area === 'all' && <div className="bl-segments">{areas.filter(a=>['dogs','cats','topics','forms'].includes(a.id)).map(({id,label,icon:Icon}) => <button key={id} onClick={()=>selectArea(id)}><Icon size={26}/><strong>{label}</strong><span>{id==='topics' ? `${libraryTopics.length} assuntos` : id==='forms' ? `${catalog.breeds.flatMap(b=>b.documents).filter(d=>d.fillable).length} PDFs preenchíveis` : `${catalog.breeds.filter(b=>b.species===id).length} perfis`}</span><ChevronRight size={18}/></button>)}</div>}
      {area === 'topics' && <div className="bl-topic-filter"><button aria-pressed={!topic} onClick={()=>setParams({area})}>Todos os assuntos</button>{libraryTopics.map(t=><button key={t.id} aria-pressed={topic===t.id} onClick={()=>setParams({area,tema:t.id})}>{t.title}</button>)}</div>}
      {area === 'forms' && <p className="bl-note">As fichas ficam agrupadas por raça. Baixe o PDF preenchível para registrar informações em um leitor compatível.</p>}
      <div className="bl-results"><h2>{search ? 'Resultados da busca' : area==='saved' ? 'Seus perfis salvos' : 'Explore as raças'}</h2><span role="status">{visible.length} {visible.length===1?'perfil':'perfis'}</span></div>
      <div className="bl-grid">{visible.slice(0,limit).map(b=><article className="bl-card" key={b.id}><div className="bl-card-image"><img src={b.cover} alt={b.name} loading="lazy" width={480} height={280}/><span>{b.species==='dogs'?'Cães':'Gatos'}</span><button aria-label={`${saved.has(b.id)?'Remover':'Salvar'} ${b.name}`} aria-pressed={saved.has(b.id)} onClick={()=>toggleSaved(b.id)}><Bookmark size={19} fill={saved.has(b.id)?'currentColor':'none'}/></button></div><div className="bl-card-content"><h3>{b.name}</h3><p>{b.summary}</p><div className="bl-tags">{b.tags.map(t=><span key={t}>{t}</span>)}</div><footer><span><FileText size={15}/>{b.documents.length} {b.documents.length===1?'PDF':'PDFs'}</span><button onClick={()=>openBreed(b.id)}>Conhecer <ChevronRight size={17}/></button></footer></div></article>)}</div>
      {!visible.length && <section className="bl-empty"><BookOpen size={32}/><h3>{area==='saved'?'Seus favoritos aparecerão aqui.':'Nenhum perfil encontrado.'}</h3><p>{area==='saved'?'Toque no marcador de uma raça para guardá-la.':'Tente outra raça, palavra ou área.'}</p><button onClick={()=>selectArea('all')}>Ver todo o acervo</button></section>}
      {visible.length>limit && <button className="bl-more" onClick={()=>setLimit(n=>n+12)}>Mostrar mais perfis</button>}
    </>}
    <footer className="bl-disclaimer"><BookOpen size={18}/><p>Acervo {catalog.publisher} · Conteúdo educativo. Os guias informam que não houve revisão técnico-veterinária nesta edição. Para decisões sobre saúde ou alimentação do seu pet, procure orientação veterinária.</p></footer>
  </div>
}
