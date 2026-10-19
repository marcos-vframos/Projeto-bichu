import { mkdir, rename, copyFile, unlink, writeFile, readdir } from 'node:fs/promises'
import { join } from 'node:path'

const root = process.cwd()
await mkdir(join(root, 'dist', 'client'), { recursive: true })
for (const entry of await (await import('node:fs/promises')).readdir(join(root, 'dist'))) {
  if (entry === 'client') continue
  await rename(join(root, 'dist', entry), join(root, 'dist', 'client', entry))
}
await mkdir(join(root, 'dist', 'server'), { recursive: true })
await copyFile(join(root, 'worker', 'index.js'), join(root, 'dist', 'server', 'index.js'))
await copyFile(join(root, 'worker', 'pilot-api.js'), join(root, 'dist', 'server', 'pilot-api.js'))
await copyFile(join(root, 'worker', 'adoption.js'), join(root, 'dist', 'server', 'adoption.js'))
await copyFile(join(root, 'worker', 'backup.js'), join(root, 'dist', 'server', 'backup.js'))
// A versão de teste não expõe o pacote completo do código-fonte pela URL pública.
await unlink(join(root, 'dist', 'client', 'meu-bichu-codigo-fonte.zip')).catch(error => {
  if (error.code !== 'ENOENT') throw error
})

const names=await readdir(join(root,'dist','client','assets'))
const files=['/',...names.filter(n=>/\.(js|css)$/.test(n)).map(n=>`/assets/${n}`)]
const version=names.find(n=>n.endsWith('.js'))||'shell'
await writeFile(join(root,'dist','client','sw.js'),`const CACHE=${JSON.stringify('mb-shell-'+version)};const FILES=${JSON.stringify(files)};self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(FILES)).then(()=>self.skipWaiting())));self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('mb-shell-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));self.addEventListener('fetch',e=>{const u=new URL(e.request.url);if(e.request.method!=='GET'||u.origin!==self.location.origin||u.pathname.startsWith('/api/'))return;if(e.request.mode==='navigate'){e.respondWith(fetch(e.request).catch(()=>caches.open(CACHE).then(c=>c.match('/'))));return}if(u.pathname.startsWith('/assets/'))e.respondWith(caches.open(CACHE).then(async c=>{const old=await c.match(e.request);if(old)return old;const r=await fetch(e.request);if(r.ok)await c.put(e.request,r.clone());return r}))});`)
