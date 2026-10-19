import { mkdir,rename,readdir,copyFile } from 'node:fs/promises'
await mkdir('dist/client',{recursive:true})
for(const entry of await readdir('dist')) if(entry !== 'client') await rename(`dist/${entry}`,`dist/client/${entry}`)
await mkdir('dist/server',{recursive:true})
await copyFile('worker/index.js','dist/server/index.js')
