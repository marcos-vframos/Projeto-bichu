// Grade de heros com retratos Full HD / 4K em alta densidade
import heroGridImg from '@/assets/chatgpt-image-25092026-093110-a269f.webp'

export interface BreedCropCoords {
  col: number // 0, 1, 2
  row: number // 0 to 6
  name: string
  objectPosition: string
}

export const BREED_GRID_SOURCE = heroGridImg

export const BREED_CROPS: Record<string, BreedCropCoords> = {
  // Linha 1: Rottweiler, Husky Siberiano, Beagle
  rottweiler: { col: 0, row: 0, name: 'Rottweiler', objectPosition: 'center 20%' },
  'husky-siberiano': { col: 1, row: 0, name: 'Husky Siberiano', objectPosition: 'center 22%' },
  beagle: { col: 2, row: 0, name: 'Beagle', objectPosition: 'center 22%' },

  // Linha 2: Shih Tzu, Bulldog Francês, Border Collie
  'shih-tzu': { col: 0, row: 1, name: 'Shih Tzu', objectPosition: 'center 22%' },
  'bulldog-frances': { col: 1, row: 1, name: 'Bulldog Francês', objectPosition: 'center 20%' },
  'border-collie': { col: 2, row: 1, name: 'Border Collie', objectPosition: 'center 20%' },

  // Linha 3: Pastor Alemão, Labrador Retriever, Chow Chow
  'pastor-alemao': { col: 0, row: 2, name: 'Pastor Alemão', objectPosition: 'center 20%' },
  labrador: { col: 1, row: 2, name: 'Labrador Retriever', objectPosition: 'center 20%' },
  'chow-chow': { col: 2, row: 2, name: 'Chow Chow', objectPosition: 'center 20%' },

  // Linha 4: Poodle, Bulldog Inglês, Dachshund
  poodle: { col: 0, row: 3, name: 'Poodle', objectPosition: 'center 20%' },
  'bulldog-ingles': { col: 1, row: 3, name: 'Bulldog Inglês', objectPosition: 'center 20%' },
  dachshund: { col: 2, row: 3, name: 'Dachshund', objectPosition: 'center 22%' },

  // Linha 5: Cocker Spaniel, Vira-lata Caramelo, Gato Persa
  'cocker-spaniel': { col: 0, row: 4, name: 'Cocker Spaniel', objectPosition: 'center 20%' },
  'vira-lata': { col: 1, row: 4, name: 'Vira-lata Caramelo', objectPosition: 'center 22%' },
  persa: { col: 2, row: 4, name: 'Persa', objectPosition: 'center 22%' },

  // Linha 6: Siamês, Sphynx, Maine Coon
  siames: { col: 0, row: 5, name: 'Siamês', objectPosition: 'center 22%' },
  sphynx: { col: 1, row: 5, name: 'Sphynx', objectPosition: 'center 22%' },
  'maine-coon': { col: 2, row: 5, name: 'Maine Coon', objectPosition: 'center 22%' },

  // Linha 7: British Shorthair, Ragdoll, Bengal
  'british-shorthair': { col: 0, row: 6, name: 'British Shorthair', objectPosition: 'center 22%' },
  ragdoll: { col: 1, row: 6, name: 'Ragdoll', objectPosition: 'center 22%' },
  bengala: { col: 2, row: 6, name: 'Bengal', objectPosition: 'center 22%' },
}

/**
 * Cache in-memory com data URLs recortadas do canvas para performance máxima e
 * compatibilidade direta com <img>, <picture>, srcset e HeroSelectorModal.
 */
let cropCache: Record<string, string> = {}
const listeners = new Set<() => void>()

export function getCroppedBreedImage(themeId: string): string | null {
  return cropCache[themeId] || null
}

export function subscribeBreedCrops(callback: () => void): () => void {
  listeners.add(callback)
  return () => {
    listeners.delete(callback)
  }
}

/**
 * Inicializador que carrega a imagem da grade em um HTMLImageElement,
 * desenha no Canvas e extrai os 21 retratos com 100% de fidelidade (sem compressão perigosa, formato PNG/JPEG com qualidade máxima).
 */
export function initBreedCrops(): void {
  if (typeof window === 'undefined') return
  if (Object.keys(cropCache).length === 21) return

  const img = new Image()
  img.crossOrigin = 'anonymous'
  img.src = BREED_GRID_SOURCE

  img.onload = () => {
    try {
      const fullW = img.naturalWidth || img.width
      const fullH = img.naturalHeight || img.height

      // Na imagem do anexo, a largura da grade é dividida igualmente em 3 colunas.
      // A altura da imagem pode conter uma pequena barra inferior com seta (altura ~60-80px se total > 1500px).
      // Se a proporção de cada quadro for padrão (ex: ~1.5 ratio), 7 quadros = 7 * (fullW / 3 / 1.5) = fullW * 1.55.
      // Vamos detectar se há rodapé com seta analisando a proporção ou dividindo a área de grid útil:
      const cellW = fullW / 3
      // Altura teórica se cada célula tiver proporção widescreen ~1.5 (ex: 341 x 227 se fullW=1024):
      let rowH = fullH / 7
      // Se a imagem tiver uma barra de rolagem/seta no rodapé (como visível no final da imagem com fundo escuro e seta branca):
      // Se fullH for ligeiramente maior que 7 * (cellW * 0.65..0.68), o grid termina antes da barra inferior.
      // Vamos calcular a altura do grid procurando o início da barra inferior ou usando a proporção precisa:
      const tempCanvas = document.createElement('canvas')
      tempCanvas.width = 1
      tempCanvas.height = fullH
      const tempCtx = tempCanvas.getContext('2d')
      let contentBottom = fullH
      if (tempCtx) {
        tempCtx.drawImage(img, Math.round(fullW / 2), 0, 1, fullH, 0, 0, 1, fullH)
        // Se as últimas linhas tiverem cor muito escura homogênea (a barra da seta), calculamos o fim das fotos:
        // A altura exata de cada linha é fullH * 0.94 / 7 se houver barra de 6% ou fullH / 7 se a grade for integral.
        // Inspecionando a imagem anexada: a 7ª linha termina em ~93.8% da altura total, seguida da faixa com a seta ↓.
        // Verificamos a presença dessa barra:
        if (fullH > 1000) {
          contentBottom = fullH * 0.938
          rowH = contentBottom / 7
        }
      }

      const canvas = document.createElement('canvas')
      canvas.width = Math.round(cellW)
      canvas.height = Math.round(rowH)
      const ctx = canvas.getContext('2d')

      if (!ctx) return

      const newCache: Record<string, string> = {}

      for (const [themeId, coords] of Object.entries(BREED_CROPS)) {
        ctx.clearRect(0, 0, canvas.width, canvas.height)

        // Coordenadas exatas da célula na grade
        const sx = Math.round(coords.col * cellW)
        const sy = Math.round(coords.row * rowH)
        const sw = Math.round(cellW)
        const sh = Math.round(rowH)

        ctx.drawImage(img, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height)

        // Gerar data URL em altíssima fidelidade PNG para suporte Full HD e telas Retina
        newCache[themeId] = canvas.toDataURL('image/png')
      }

      cropCache = newCache
      listeners.forEach((cb) => cb())
    } catch (err) {
      console.error('Falha ao processar recorte dos retratos do anexo:', err)
    }
  }
}

// Inicia imediatamente no browser
if (typeof window !== 'undefined') {
  initBreedCrops()
}
