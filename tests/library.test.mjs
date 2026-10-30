import {test} from 'node:test'
import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
import {createHash} from 'node:crypto'
import {parseLibraryCatalog,matchesLibrarySearch,topicChapter,libraryPage} from '../src/lib/library-catalog.ts'
import {getDocument} from 'pdfjs-dist/legacy/build/pdf.mjs'
const raw=JSON.parse(await readFile(new URL('../public/biblioteca/catalogo.json',import.meta.url),'utf8'))
const catalog=parseLibraryCatalog(raw)

test('library preserves eight complete PDFs, exact bytes and real chapter destinations',async()=>{
  const documents=catalog.breeds.flatMap(b=>b.documents)
  assert.equal(catalog.breeds.length,5);assert.equal(documents.length,8)
  assert.equal(documents.filter(d=>d.fillable).length,2)
  for(const doc of documents){
    const bytes=await readFile(new URL('../public'+doc.url,import.meta.url))
    assert.equal(bytes.length,doc.bytes);assert.equal(createHash('sha256').update(bytes).digest('hex'),doc.sha256)
    const task=getDocument({data:new Uint8Array(bytes),useSystemFonts:true})
    try{
      const pdf=await task.promise
      assert.equal(pdf.numPages,doc.pages)
      for(const page of new Set([1,doc.pages,...doc.chapters.map(ch=>ch.page)])){
        const p=await pdf.getPage(page),content=await p.getTextContent()
        assert.ok(content.items.length>0,`${doc.id}: page ${page} is readable`)
      }
      const fields=await pdf.getFieldObjects()
      assert.equal(!!fields && (fields instanceof Map ? fields.size : Object.keys(fields).length)>0,doc.fillable)
    }finally{await task.destroy()}
  }
})
test('library search is accent-insensitive and uses actual indexed chapter titles',()=>{
  const b=catalog.breeds.find(b=>b.id==='bernese')
  assert.equal(matchesLibrarySearch(b,'nutricao'),true)
  assert.equal(matchesLibrarySearch(b,'BERNESE nutricao'),true)
  assert.equal(matchesLibrarySearch(b,'ragdoll'),false)
  assert.equal(topicChapter(b.documents[0],'food').page,13)
  assert.equal(topicChapter(b.documents[0],'invalid'),undefined)
  assert.equal(libraryPage('Infinity',59),1);assert.equal(libraryPage('-5',59),1);assert.equal(libraryPage('900',59),59)
})
test('invalid catalog URLs and broken page destinations cannot reach the reader',()=>{
  for(const url of ['https://external.invalid/book.pdf','/biblioteca/documentos/../../private.pdf','javascript:alert(1)']){
    const bad=structuredClone(raw);bad.breeds[0].documents[0].url=url
    assert.throws(()=>parseLibraryCatalog(bad))
  }
  const bad=structuredClone(raw);bad.breeds[0].documents[0].chapters[0].page=9999
  assert.throws(()=>parseLibraryCatalog(bad))
})

test('published library serves genuine PDFs and a same-origin module worker without exposing owner records',async()=>{
  const {mkdtemp,rm}=await import('node:fs/promises'),{tmpdir}=await import('node:os'),{join}=await import('node:path')
  const {createApplication}=await import('../server/index.mjs')
  const dir=await mkdtemp(join(tmpdir(),'bichu-library-'))
  const app=createApplication({env:{DATA_DIR:dir,APP_ORIGIN:'http://127.0.0.1',PILOT_PANEL_KEY:'a'.repeat(64)}})
  await new Promise(resolve=>app.server.listen(0,'127.0.0.1',resolve))
  try{
    const base='http://127.0.0.1:'+app.server.address().port
    const route=await fetch(base+'/biblioteca',{headers:{accept:'text/html'}})
    assert.equal(route.status,200);assert.match(route.headers.get('content-type'),/text\/html/)
    const published=parseLibraryCatalog(await(await fetch(base+'/biblioteca/catalogo.json')).json())
    for(const d of published.breeds.flatMap(b=>b.documents)){
      const response=await fetch(base+d.url)
      assert.equal(response.status,200);assert.equal(response.headers.get('content-type'),'application/pdf')
      assert.equal(createHash('sha256').update(Buffer.from(await response.arrayBuffer())).digest('hex'),d.sha256)
    }
    const {readdir}=await import('node:fs/promises')
    const worker=(await readdir('dist/client/assets')).find(n=>n.startsWith('pdf.worker')&&n.endsWith('.mjs'))
    assert.ok(worker)
    assert.match((await fetch(base+'/assets/'+worker)).headers.get('content-type'),/javascript/)
    assert.equal((await fetch(base+'/pdf-resources/wasm/openjpeg.wasm')).headers.get('content-type'),'application/wasm')
    assert.equal((await fetch(base+'/api/pilot/owner/records')).status,403)
  }finally{await new Promise(resolve=>app.server.close(resolve));app.store.close();await rm(dir,{recursive:true,force:true})}
})
