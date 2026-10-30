export type LibraryChapter = { title: string; page: number }
export type LibraryDocument = { id: string; title: string; edition: string; pages: number; fillable: boolean; url: string; bytes: number; sha256: string; originalName: string; chapters: LibraryChapter[] }
export type LibraryBreed = { id: string; name: string; species: 'dogs' | 'cats'; summary: string; tags: string[]; cover: string; documents: LibraryDocument[] }
export type LibraryCatalog = { schemaVersion: number; updatedAt: string; publisher: string; collection: string; breeds: LibraryBreed[] }
export const libraryTopics = [
  { id: 'identity', title: 'Identidade da raça', words: ['origem', 'identidade', 'história'] },
  { id: 'food', title: 'Alimentação e peso', words: ['nutrição', 'alimentação', 'condição corporal'] },
  { id: 'health', title: 'Saúde preventiva', words: ['prevenção', 'saúde', 'urgências'] },
  { id: 'behavior', title: 'Comportamento', words: ['comunicação', 'educação', 'comportamento', 'socialização'] },
  { id: 'care', title: 'Higiene e bem-estar', words: ['higiene', 'pelagem', 'pele', 'bem-estar'] },
  { id: 'life', title: 'Fases da vida', words: ['filhote', 'idoso', 'fases', 'vida'] },
]
export const normalizeLibraryText = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR')
export function matchesLibrarySearch(breed: LibraryBreed, search: string) {
  const source = normalizeLibraryText([breed.name, breed.summary, ...breed.tags, ...breed.documents.flatMap(doc => [doc.title, doc.edition, ...doc.chapters.map(ch => ch.title)])].join(' '))
  return normalizeLibraryText(search).trim().split(/\s+/).every(word => source.includes(word))
}
export function topicChapter(doc: LibraryDocument, topicId: string) {
  const topic = libraryTopics.find(item => item.id === topicId)
  return doc.chapters.find(ch => topic?.words.some(word => normalizeLibraryText(ch.title).includes(normalizeLibraryText(word))))
}
export function libraryPage(value: unknown, total: number) {
  const n = Number(value)
  return Number.isFinite(n) ? Math.min(total, Math.max(1, Math.trunc(n))) : 1
}
export function parseLibraryCatalog(value: unknown): LibraryCatalog {
  const data = value as LibraryCatalog
  if (data?.schemaVersion !== 1 || !Array.isArray(data.breeds) || !data.breeds.length) throw Error('Catálogo indisponível.')
  const ids = new Set<string>(), docs = new Set<string>()
  for (const breed of data.breeds) {
    if (!breed.id || ids.has(breed.id) || !['dogs', 'cats'].includes(breed.species) || typeof breed.name !== 'string' || typeof breed.summary !== 'string' || !Array.isArray(breed.tags) || !breed.tags.every(t => typeof t === 'string') || !/^\/biblioteca\/capas\/[a-z0-9-]+\.jpg$/.test(breed.cover) || !Array.isArray(breed.documents) || !breed.documents.length) throw Error('Perfil inválido no catálogo.')
    ids.add(breed.id)
    for (const doc of breed.documents) {
      if (!doc.id || docs.has(doc.id) || typeof doc.title !== 'string' || typeof doc.edition !== 'string' || !Number.isSafeInteger(doc.pages) || doc.pages < 1 || !/^\/biblioteca\/documentos\/[a-z0-9-]+\.pdf$/.test(doc.url) || !/^[a-f0-9]{64}$/.test(doc.sha256) || !Number.isSafeInteger(doc.bytes) || doc.bytes < 1 || typeof doc.fillable !== 'boolean' || !Array.isArray(doc.chapters) || doc.chapters.some(ch => typeof ch.title !== 'string' || !Number.isSafeInteger(ch.page) || ch.page < 1 || ch.page > doc.pages)) throw Error('Documento inválido no catálogo.')
      docs.add(doc.id)
    }
  }
  return data
}
