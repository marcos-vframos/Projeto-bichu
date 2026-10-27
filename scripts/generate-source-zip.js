import fs from 'node:fs'
import path from 'node:path'
import zlib from 'node:zlib'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const projectRoot = path.resolve(__dirname, '..')
const publicDir = path.resolve(projectRoot, 'public')
const zipName = 'meu-bichu-codigo-fonte.zip'
const zipPath = path.resolve(publicDir, zipName)

// CRC-32 table precomputation
const crcTable = new Uint32Array(256)
for (let i = 0; i < 256; i++) {
  let c = i
  for (let k = 0; k < 8; k++) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  }
  crcTable[i] = c >>> 0
}

function calculateCrc32(buf) {
  let crc = 0xffffffff
  for (let i = 0; i < buf.length; i++) {
    crc = (crc >>> 8) ^ crcTable[(crc ^ buf[i]) & 0xff]
  }
  return (crc ^ 0xffffffff) >>> 0
}

function dateToDosTimeAndDate(date) {
  const d = date instanceof Date ? date : new Date()
  const year = d.getFullYear()
  const dosYear = year < 1980 ? 0 : year - 1980
  const dosMonth = d.getMonth() + 1
  const dosDay = d.getDate()
  const dosHours = d.getHours()
  const dosMinutes = d.getMinutes()
  const dosSeconds = Math.floor(d.getSeconds() / 2)

  const time = ((dosHours & 0x1f) << 11) | ((dosMinutes & 0x3f) << 5) | (dosSeconds & 0x1f)
  const dosDate = ((dosYear & 0x7f) << 9) | ((dosMonth & 0x0f) << 5) | (dosDay & 0x1f)

  return { time, date: dosDate }
}

// Patterns / paths to exclude
const EXCLUDE_DIRS = new Set([
  'node_modules',
  'dist',
  'dist-ssr',
  'dev-dist',
  'dev-dist-ssr',
  '.git',
  '.pnpm-store',
  '.pnpm',
  '.vscode',
  '.idea',
])

function isExcludedPath(relPath) {
  const normalized = relPath.replace(/\\/g, '/')
  const parts = normalized.split('/')

  // Exclude node_modules, dist, etc.
  for (const part of parts) {
    if (EXCLUDE_DIRS.has(part)) return true
    if (part.startsWith('.env') && part !== '.env.example') return true
  }

  // Exact file exclusions
  const basename = path.basename(normalized)
  if (basename === zipName) return true
  if (basename.endsWith('.zip')) return true
  if (basename.endsWith('.tmp') || basename.endsWith('.bak') || basename.includes('.bak-'))
    return true
  if (
    basename.endsWith('.local') ||
    basename.startsWith('.oxlintcache') ||
    basename.startsWith('.eslintcache')
  )
    return true
  if (basename === 'screenshot.png') return true
  if (basename === 'bun.lockb') return true
  if (basename === '.DS_Store' || basename === 'Thumbs.db') return true

  return false
}

function collectFiles(dir, baseDir = projectRoot) {
  const entries = fs.readdirSync(dir, { withFileTypes: true })
  const result = []

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name)
    const relPath = path.relative(baseDir, fullPath).replace(/\\/g, '/')

    if (isExcludedPath(relPath)) {
      continue
    }

    if (entry.isDirectory()) {
      result.push(...collectFiles(fullPath, baseDir))
    } else if (entry.isFile()) {
      result.push({
        fullPath,
        relPath,
      })
    }
  }

  return result
}

export function generateSourceZip() {
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true })
  }

  const files = collectFiles(projectRoot, projectRoot)
  // Sort files for deterministic zip output
  files.sort((a, b) => a.relPath.localeCompare(b.relPath))

  const entries = []
  const localChunks = []
  let offset = 0

  for (const file of files) {
    const content = fs.readFileSync(file.fullPath)
    const stat = fs.statSync(file.fullPath)
    const { time, date } = dateToDosTimeAndDate(stat.mtime)
    const uncompressedSize = content.length
    const crc = calculateCrc32(content)

    // Deflate compression
    const compressed = zlib.deflateRawSync(content, { level: 6 })
    // If compressed is larger or equal, store uncompressed (method 0), otherwise method 8
    const useDeflate = compressed.length < uncompressedSize
    const method = useDeflate ? 8 : 0
    const finalData = useDeflate ? compressed : content
    const compressedSize = finalData.length

    const nameBuf = Buffer.from(file.relPath, 'utf8')
    const nameLen = nameBuf.length

    // Local file header (30 bytes + nameLen)
    const localHeader = Buffer.alloc(30)
    localHeader.writeUInt32LE(0x04034b50, 0) // signature
    localHeader.writeUInt16LE(20, 4) // version needed: 2.0
    localHeader.writeUInt16LE(0x0800, 6) // flags: bit 11 = UTF-8 filename
    localHeader.writeUInt16LE(method, 8) // compression method
    localHeader.writeUInt16LE(time, 10) // mod time
    localHeader.writeUInt16LE(date, 12) // mod date
    localHeader.writeUInt32LE(crc, 14) // crc32
    localHeader.writeUInt32LE(compressedSize, 18) // comp size
    localHeader.writeUInt32LE(uncompressedSize, 22) // uncomp size
    localHeader.writeUInt16LE(nameLen, 26) // filename len
    localHeader.writeUInt16LE(0, 28) // extra len

    localChunks.push(localHeader, nameBuf, finalData)

    entries.push({
      relPath: file.relPath,
      nameBuf,
      nameLen,
      time,
      date,
      method,
      crc,
      compressedSize,
      uncompressedSize,
      offset,
    })

    offset += localHeader.length + nameLen + compressedSize
  }

  // Central Directory
  const centralChunks = []
  let centralDirectorySize = 0
  const centralDirectoryOffset = offset

  for (const entry of entries) {
    const cdirHeader = Buffer.alloc(46)
    cdirHeader.writeUInt32LE(0x02014b50, 0) // signature
    cdirHeader.writeUInt16LE(20, 4) // version made by
    cdirHeader.writeUInt16LE(20, 6) // version needed
    cdirHeader.writeUInt16LE(0x0800, 8) // flags (UTF-8)
    cdirHeader.writeUInt16LE(entry.method, 10)
    cdirHeader.writeUInt16LE(entry.time, 12)
    cdirHeader.writeUInt16LE(entry.date, 14)
    cdirHeader.writeUInt32LE(entry.crc, 16)
    cdirHeader.writeUInt32LE(entry.compressedSize, 20)
    cdirHeader.writeUInt32LE(entry.uncompressedSize, 24)
    cdirHeader.writeUInt16LE(entry.nameLen, 28)
    cdirHeader.writeUInt16LE(0, 30) // extra len
    cdirHeader.writeUInt16LE(0, 32) // comment len
    cdirHeader.writeUInt16LE(0, 34) // disk start
    cdirHeader.writeUInt16LE(0, 36) // internal attrs
    cdirHeader.writeUInt32LE(0, 38) // external attrs
    cdirHeader.writeUInt32LE(entry.offset, 42) // offset of local header

    centralChunks.push(cdirHeader, entry.nameBuf)
    centralDirectorySize += cdirHeader.length + entry.nameLen
  }

  // End of Central Directory (22 bytes)
  const eocd = Buffer.alloc(22)
  eocd.writeUInt32LE(0x06054b50, 0) // signature
  eocd.writeUInt16LE(0, 4) // disk number
  eocd.writeUInt16LE(0, 6) // disk start
  eocd.writeUInt16LE(entries.length, 8) // entries on disk
  eocd.writeUInt16LE(entries.length, 10) // total entries
  eocd.writeUInt32LE(centralDirectorySize, 12) // central dir size
  eocd.writeUInt32LE(centralDirectoryOffset, 16) // central dir offset
  eocd.writeUInt16LE(0, 20) // comment len

  const fullZipBuffer = Buffer.concat([...localChunks, ...centralChunks, eocd])
  fs.writeFileSync(zipPath, fullZipBuffer)

  const sizeKb = (fullZipBuffer.length / 1024).toFixed(1)
  console.log(
    `[generate-source-zip] Sucesso: ${entries.length} arquivos empacotados em ${zipPath} (${sizeKb} KB)`,
  )
  return { path: zipPath, size: fullZipBuffer.length, count: entries.length }
}

generateSourceZip()
