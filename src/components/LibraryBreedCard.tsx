import { useEffect, useMemo, useState } from 'react'
import { Bookmark, ChevronLeft, ChevronRight, FileText, Pause, Play } from 'lucide-react'
import type { LibraryBreed } from '@/lib/library-catalog'

export default function LibraryBreedCard({breed,saved,onSave,onOpen,onChapter}:{breed:LibraryBreed;saved:boolean;onSave:()=>void;onOpen:()=>void;onChapter:(pdf:string,page:number)=>void}) {
 const chapters=useMemo(()=>breed.documents.flatMap(doc=>doc.chapters.map(ch=>({...ch,pdf:doc.id,edition:doc.edition}))),[breed])
 const [index,setIndex]=useState(0),[engaged,setEngaged]=useState(false),[paused,setPaused]=useState(false)
 const current=chapters[index%Math.max(1,chapters.length)]
 useEffect(()=>{
  if(!engaged||paused||chapters.length<2||window.matchMedia('(prefers-reduced-motion: reduce)').matches)return
  const timer=setInterval(()=>{if(!document.hidden)setIndex(i=>(i+1)%chapters.length)},5000)
  return()=>clearInterval(timer)
 },[engaged,paused,chapters.length])
 function step(delta:number){setPaused(true);setIndex(i=>(i+delta+chapters.length)%chapters.length)}
 return <article className="bl-card" onMouseEnter={()=>setEngaged(true)} onMouseLeave={()=>setEngaged(false)} onFocusCapture={()=>setEngaged(true)} onBlurCapture={e=>{if(!e.currentTarget.contains(e.relatedTarget))setEngaged(false)}}>
  <div className="bl-card-image"><img src={breed.cover} alt={breed.name} loading="lazy" width={480} height={280}/><span>{breed.species==='dogs'?'Cães':'Gatos'}</span><button aria-label={`${saved?'Remover':'Salvar'} ${breed.name}`} aria-pressed={saved} onClick={onSave}><Bookmark size={19} fill={saved?'currentColor':'none'}/></button></div>
  <div className="bl-card-content"><h3>{breed.name}</h3><p>{breed.summary}</p><div className="bl-tags">{breed.tags.map(tag=><span key={tag}>{tag}</span>)}</div>
   {current&&<section className="bl-preview" aria-label={`Prévia de ${breed.name}`}><span className="bl-preview-label">Explore o guia</span><p className="bl-preview-title">{current.title}</p><p className="bl-preview-source">{current.edition} · página {current.page}</p><button className="bl-preview-open" onClick={()=>onChapter(current.pdf,current.page)}>Ler este capítulo</button>{chapters.length>1&&<div className="bl-preview-controls"><button aria-label={`Capítulo anterior de ${breed.name}`} onClick={()=>step(-1)}><ChevronLeft size={16}/></button><span>{index%chapters.length+1} / {chapters.length}</span><button aria-label={`${paused?'Retomar':'Pausar'} prévia de ${breed.name}`} aria-pressed={paused} onClick={()=>setPaused(v=>!v)}>{paused?<Play size={15}/>:<Pause size={15}/>}</button><button aria-label={`Próximo capítulo de ${breed.name}`} onClick={()=>step(1)}><ChevronRight size={16}/></button></div>}</section>}
   <footer><span><FileText size={15}/>{breed.documents.length} {breed.documents.length===1?'PDF':'PDFs'}</span><button onClick={onOpen}>Conhecer <ChevronRight size={17}/></button></footer>
  </div>
 </article>
}
