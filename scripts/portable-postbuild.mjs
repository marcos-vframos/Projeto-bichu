import {writeFile,rm,cp,mkdir} from 'node:fs/promises'
await writeFile('dist/client/sw.js',`self.addEventListener('install',()=>self.skipWaiting());self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('mb-shell-')).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));`)
await rm('dist/client/meu-bichu-codigo-fonte.zip',{force:true})

// Keep the PDF reader independent of external CDNs.
await mkdir('dist/client/pdf-resources',{recursive:true})
for(const folder of ['cmaps','standard_fonts','wasm'])await cp('node_modules/pdfjs-dist/'+folder,'dist/client/pdf-resources/'+folder,{recursive:true})
