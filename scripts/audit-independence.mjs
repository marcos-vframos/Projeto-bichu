import { readFile, readdir } from 'node:fs/promises'
import { join } from 'node:path'

const built = process.argv.includes('--built')
const roots = built ? ['dist/client', 'owner-app/dist/client'] : ['src', 'owner-app/src', 'server', 'worker', 'team', 'public', 'docs/api']
const checks = [
  /\b(?:[a-z0-9-]+\.)*(?:goskip\.(?:dev|com)|usecurling\.com|skip\.(?:build|new)|skipcloud\.[a-z]+)\b/i,
  /@skip-protected|Skip@Pass|\.skip\.config\.json|data-prohibitions|data-uid=/,
]
let count = 0
const failures = []
async function visit(path) {
  for (const entry of await readdir(path, { withFileTypes: true })) {
    const file = join(path, entry.name)
    if (entry.isDirectory()) await visit(file)
    else if (/\.(?:[cm]?js|tsx?|html|css|json|md)$/.test(file)) {
      const source = await readFile(file, 'utf8'); count++
      if (checks.some(pattern => pattern.test(source))) failures.push(file)
    }
  }
}
for (const root of roots) await visit(root)
if (!built) {
  const vite = await readFile('vite.config.ts', 'utf8'), server = await readFile('server/index.mjs', 'utf8')
  if (/uidPlugin|react-uid/.test(vite)) failures.push('vite.config.ts')
  if (/migrateFromSource/.test(server)) failures.push('server/index.mjs: importação automática legada')
}
for (const path of built ? ['dist/client/index.html', 'owner-app/dist/client/index.html'] : ['index.html', 'owner-app/index.html']) {
  if (!(await readFile(path, 'utf8')).includes('/meu-bichu-icon.png?v=20261027')) failures.push(path + ': ícone próprio ausente')
}
if (failures.length) throw Error('Auditoria de independência falhou: ' + failures.join(', '))
console.log(`Auditoria de independência: ${count} arquivos ${built ? 'publicados' : 'de código'} verificados; nenhuma dependência do gerador anterior detectada.`)
