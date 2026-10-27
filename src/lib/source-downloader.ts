/**
 * Utilitário de empacotamento e download do código-fonte completo do Meu Bichu.
 * Gera um arquivo ZIP client-side usando fflate / ZIP standard format
 * com todos os arquivos de configuração, código e assets do projeto.
 */

// CRC-32 table
const CRC_TABLE = new Uint32Array(256)
for (let i = 0; i < 256; i++) {
  let c = i
  for (let k = 0; k < 8; k++) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  }
  CRC_TABLE[i] = c >>> 0
}

function crc32(bytes: Uint8Array): number {
  let c = 0xffffffff
  for (let i = 0; i < bytes.length; i++) {
    c = (c >>> 8) ^ CRC_TABLE[(c ^ bytes[i]) & 0xff]
  }
  return (c ^ 0xffffffff) >>> 0
}

function toDosDateTime(d: Date): { time: number; date: number } {
  const year = d.getFullYear() < 1980 ? 0 : d.getFullYear() - 1980
  const month = d.getMonth() + 1
  const day = d.getDate()
  const hours = d.getHours()
  const minutes = d.getMinutes()
  const seconds = Math.floor(d.getSeconds() / 2)

  const time = ((hours & 0x1f) << 11) | ((minutes & 0x3f) << 5) | (seconds & 0x1f)
  const date = ((year & 0x7f) << 9) | ((month & 0x0f) << 5) | (day & 0x1f)
  return { time, date }
}

interface ZipEntryInput {
  name: string
  data: Uint8Array
  mtime?: Date
}

function createZipArchive(files: ZipEntryInput[]): Uint8Array {
  const encoder = new TextEncoder()
  const localChunks: Uint8Array[] = []
  const centralChunks: Uint8Array[] = []

  interface ProcessedEntry {
    nameBytes: Uint8Array
    crc: number
    size: number
    offset: number
    time: number
    date: number
  }

  const processed: ProcessedEntry[] = []
  let offset = 0
  const now = new Date()

  // 1. Local file records (stored / method 0)
  for (const file of files) {
    const nameBytes = encoder.encode(file.name.replace(/\\/g, '/'))
    const data = file.data
    const size = data.length
    const fileCrc = crc32(data)
    const { time, date } = toDosDateTime(file.mtime || now)

    const header = new Uint8Array(30)
    const view = new DataView(header.buffer)
    view.setUint32(0, 0x04034b50, true) // signature
    view.setUint16(4, 20, true) // version needed
    view.setUint16(6, 0x0800, true) // UTF-8 filename flag
    view.setUint16(8, 0, true) // method 0 (stored)
    view.setUint16(10, time, true)
    view.setUint16(12, date, true)
    view.setUint32(14, fileCrc, true)
    view.setUint32(18, size, true) // comp size
    view.setUint32(22, size, true) // uncomp size
    view.setUint16(26, nameBytes.length, true)
    view.setUint16(28, 0, true) // extra len

    localChunks.push(header, nameBytes, data)

    processed.push({
      nameBytes,
      crc: fileCrc,
      size,
      offset,
      time,
      date,
    })

    offset += header.length + nameBytes.length + size
  }

  // 2. Central directory records
  const centralOffset = offset
  let centralSize = 0

  for (const entry of processed) {
    const header = new Uint8Array(46)
    const view = new DataView(header.buffer)
    view.setUint32(0, 0x02014b50, true) // signature
    view.setUint16(4, 20, true) // version made by
    view.setUint16(6, 20, true) // version needed
    view.setUint16(8, 0x0800, true) // UTF-8
    view.setUint16(10, 0, true) // stored
    view.setUint16(12, entry.time, true)
    view.setUint16(14, entry.date, true)
    view.setUint32(16, entry.crc, true)
    view.setUint32(20, entry.size, true)
    view.setUint32(24, entry.size, true)
    view.setUint16(28, entry.nameBytes.length, true)
    view.setUint16(30, 0, true) // extra len
    view.setUint16(32, 0, true) // comment len
    view.setUint16(34, 0, true) // disk start
    view.setUint16(36, 0, true) // internal attrs
    view.setUint32(38, 0, true) // external attrs
    view.setUint32(42, entry.offset, true) // local header offset

    centralChunks.push(header, entry.nameBytes)
    centralSize += header.length + entry.nameBytes.length
  }

  // 3. End of central directory record
  const eocd = new Uint8Array(22)
  const eocdView = new DataView(eocd.buffer)
  eocdView.setUint32(0, 0x06054b50, true)
  eocdView.setUint16(4, 0, true)
  eocdView.setUint16(6, 0, true)
  eocdView.setUint16(8, processed.length, true)
  eocdView.setUint16(10, processed.length, true)
  eocdView.setUint32(12, centralSize, true)
  eocdView.setUint32(16, centralOffset, true)
  eocdView.setUint16(20, 0, true)

  // Total allocation & merge
  const totalLength = offset + centralSize + eocd.length
  const out = new Uint8Array(totalLength)
  let pos = 0

  for (const chunk of localChunks) {
    out.set(chunk, pos)
    pos += chunk.length
  }
  for (const chunk of centralChunks) {
    out.set(chunk, pos)
    pos += chunk.length
  }
  out.set(eocd, pos)

  return out
}

/**
 * Importa todos os arquivos do projeto em tempo de build usando import.meta.glob
 * com `query: '?raw'` para arquivos de texto e `import: 'default'` para assets binários.
 */
export async function bundleProjectSourceZip(): Promise<Blob> {
  // Coleta todos os módulos de texto do projeto
  const textModules = import.meta.glob(
    [
      '/src/**/*.{ts,tsx,js,jsx,css,json}',
      '/scripts/**/*.{js,ts}',
      '/*.{json,md,html,ts,js}',
      '/.oxlintrc.json',
      '/.oxfmtrc.json',
      '/.gitignore',
      '/env.example',
    ],
    { query: '?raw', import: 'default' },
  )

  // Coleta assets binários
  const binaryAssets = import.meta.glob(['/src/assets/**/*.{png,jpg,jpeg,svg,webp,docx}'], {
    query: '?url',
    import: 'default',
  })

  const encoder = new TextEncoder()
  const zipEntries: ZipEntryInput[] = []

  // Carrega arquivos de texto
  for (const [rawPath, loader] of Object.entries(textModules)) {
    // Normaliza o caminho removendo a barra inicial
    const cleanPath = rawPath.replace(/^\//, '')
    // Ignora segredos e arquivos gerados
    if (cleanPath.startsWith('.env') && cleanPath !== 'env.example') continue
    if (cleanPath.endsWith('.zip') || cleanPath.endsWith('.tmp') || cleanPath.endsWith('.bak'))
      continue
    if (
      cleanPath.includes('node_modules') ||
      cleanPath.startsWith('dist') ||
      cleanPath.startsWith('dev-dist')
    )
      continue

    try {
      const content = (await loader()) as string
      if (typeof content === 'string') {
        zipEntries.push({
          name: cleanPath,
          data: encoder.encode(content),
        })
      }
    } catch (err) {
      console.warn(`[source-bundler] Não foi possível ler ${cleanPath}:`, err)
    }
  }

  // Carrega assets adicionais via fetch na URL servida
  for (const [rawPath, loader] of Object.entries(binaryAssets)) {
    const cleanPath = rawPath.replace(/^\//, '')
    try {
      const assetUrl = (await loader()) as string
      if (typeof assetUrl === 'string') {
        const res = await fetch(assetUrl)
        if (res.ok) {
          const ab = await res.arrayBuffer()
          zipEntries.push({
            name: cleanPath,
            data: new Uint8Array(ab),
          })
        }
      }
    } catch (err) {
      console.warn(`[source-bundler] Asset ignorado ${cleanPath}:`, err)
    }
  }

  // Adiciona README explicativo de integridade caso necessário
  const hasReadme = zipEntries.some((e) => e.name.toLowerCase() === 'readme.md')
  if (!hasReadme) {
    const defaultReadme = `# Meu Bichu — Código-Fonte Completo\n\nPacote do código-fonte da aplicação Meu Bichu.\n\nInstruções:\n1. pnpm install (ou npm install)\n2. pnpm dev\n`
    zipEntries.push({
      name: 'README.md',
      data: encoder.encode(defaultReadme),
    })
  }

  const zipBytes = createZipArchive(zipEntries)
  return new Blob([zipBytes.buffer as ArrayBuffer], { type: 'application/zip' })
}

/**
 * Dispara o download no navegador
 */
export async function downloadSourceZip(): Promise<{ filename: string; size: number }> {
  const today = new Date().toISOString().slice(0, 10)
  const filename = `meu-bichu-codigo-fonte-${today}.zip`

  // 1. Tenta carregar o ZIP pré-gerado servido na raiz pública
  let blob: Blob | null = null
  try {
    const staticRes = await fetch('/meu-bichu-codigo-fonte.zip', {
      method: 'GET',
      cache: 'no-cache',
    })
    if (staticRes.ok) {
      const contentType = staticRes.headers.get('content-type') || ''
      // Se não for uma página HTML 404 de fallback do SPA
      if (!contentType.includes('text/html')) {
        const data = await staticRes.blob()
        if (data.size > 1000) {
          blob = data
        }
      }
    }
  } catch {
    // Prossegue com o fallback dinâmico client-side
  }

  // 2. Se não houver arquivo estático ou se falhar, empacota dinamicamente client-side
  if (!blob) {
    blob = await bundleProjectSourceZip()
  }

  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  document.body.removeChild(anchor)

  setTimeout(() => {
    URL.revokeObjectURL(url)
  }, 30_000)

  return { filename, size: blob.size }
}
