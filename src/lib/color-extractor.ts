import { preferenceStorage } from '@/lib/preferences'
import { HeroTheme, hexToHsl } from './hero-themes'

export interface ExtractedPalette {
  dominantHex: string
  accentHex: string
  bgHex: string
  glowRgba: string
  titleHex: string
  primaryHex: string
  bodyHex: string
  mutedHex: string
  version: number
}

const PALETTE_CACHE_PREFIX = 'bichu_pet_palette_'
const USE_PET_HERO_PREFIX = 'bichu_use_pet_hero_'

export function getPetHeroPreference(petId: string | null | undefined): boolean {
  if (!petId) return true
  try {
    const val = preferenceStorage.getItem(`${USE_PET_HERO_PREFIX}${petId}`)
    return val !== 'false'
  } catch {
    return true
  }
}

export function setPetHeroPreference(petId: string, enabled: boolean): void {
  try {
    preferenceStorage.setItem(`${USE_PET_HERO_PREFIX}${petId}`, String(enabled))
    window.dispatchEvent(
      new CustomEvent('bichu:pet-hero-pref-changed', {
        detail: { petId, enabled },
      }),
    )
    window.dispatchEvent(new Event('bichu:hero-theme-changed'))
  } catch {
    // storage disabled
  }
}

export function getCachedPetPalette(
  petId: string | null | undefined,
  avatarUrl: string | null | undefined,
): ExtractedPalette | null {
  if (!petId || !avatarUrl) return null
  try {
    const raw = preferenceStorage.getItem(`${PALETTE_CACHE_PREFIX}${petId}`)
    if (!raw) return null
    const parsed = JSON.parse(raw) as { urlHash: string; palette: ExtractedPalette }
    if (parsed.urlHash === getSimpleHash(avatarUrl)) {
      return parsed.palette
    }
  } catch {
    // ignore parse error
  }
  return null
}

export function saveCachedPetPalette(
  petId: string,
  avatarUrl: string,
  palette: ExtractedPalette,
): void {
  try {
    const data = {
      urlHash: getSimpleHash(avatarUrl),
      palette,
    }
    preferenceStorage.setItem(`${PALETTE_CACHE_PREFIX}${petId}`, JSON.stringify(data))
  } catch (err) {
    // Se a quota de localStorage estourou (ex: se alguém salvou dataURL grande no passado),
    // tenta limpar chaves antigas de paleta de pets para liberar espaço
    try {
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const key = localStorage.key(i)
        if (
          key &&
          key.startsWith(PALETTE_CACHE_PREFIX) &&
          key !== `${PALETTE_CACHE_PREFIX}${petId}`
        ) {
          preferenceStorage.removeItem(key)
        }
      }
      const data = {
        urlHash: getSimpleHash(avatarUrl),
        palette,
      }
      preferenceStorage.setItem(`${PALETTE_CACHE_PREFIX}${petId}`, JSON.stringify(data))
    } catch {
      // ignore
    }
  }
}

export function clearCachedPetPalette(petId: string): void {
  try {
    preferenceStorage.removeItem(`${PALETTE_CACHE_PREFIX}${petId}`)
  } catch {
    // ignore
  }
}

function getSimpleHash(str: string): string {
  let hash = 0
  const len = Math.min(str.length, 500)
  for (let i = 0; i < len; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i)
    hash |= 0
  }
  return `${str.length}_${hash}`
}

// Converte HSL (h: 0-360, s: 0-100, l: 0-100) para Hex (#rrggbb)
export function hslToHex(h: number, s: number, l: number): string {
  const normS = Math.max(0, Math.min(100, s)) / 100
  const normL = Math.max(0, Math.min(100, l)) / 100
  const normH = ((h % 360) + 360) % 360

  const c = (1 - Math.abs(2 * normL - 1)) * normS
  const x = c * (1 - Math.abs(((normH / 60) % 2) - 1))
  const m = normL - c / 2

  let r = 0
  let g = 0
  let b = 0

  if (normH < 60) {
    r = c
    g = x
  } else if (normH < 120) {
    r = x
    g = c
  } else if (normH < 180) {
    g = c
    b = x
  } else if (normH < 240) {
    g = x
    b = c
  } else if (normH < 300) {
    r = x
    b = c
  } else {
    r = c
    b = x
  }

  const red = Math.round((r + m) * 255)
  const green = Math.round((g + m) * 255)
  const blue = Math.round((b + m) * 255)

  const toHex = (n: number) => n.toString(16).padStart(2, '0')
  return `#${toHex(red)}${toHex(green)}${toHex(blue)}`
}

function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
  const normR = r / 255
  const normG = g / 255
  const normB = b / 255

  const max = Math.max(normR, normG, normB)
  const min = Math.min(normR, normG, normB)
  let h = 0
  let s = 0
  const l = (max + min) / 2

  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case normR:
        h = (normG - normB) / d + (normG < normB ? 6 : 0)
        break
      case normG:
        h = (normB - normR) / d + 2
        break
      case normB:
        h = (normR - normG) / d + 4
        break
    }
    h /= 6
  }

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  }
}

/**
 * Extrai a paleta de cores dominante da imagem via HTML Canvas.
 * Amostra em baixa resolução (~120px) para máxima performance,
 * quantiza por baldes e gera tokens harmonizados de contraste.
 */
export async function extractPaletteFromImage(imageSource: string): Promise<ExtractedPalette> {
  return new Promise((resolve) => {
    // Fallback padrão seguro (tons quentes caramelo)
    const fallbackPalette: ExtractedPalette = {
      dominantHex: '#9B7452',
      accentHex: '#E5A869',
      bgHex: '#080605',
      glowRgba: 'rgba(229, 168, 105, 0.20)',
      titleHex: '#FBE8D5',
      primaryHex: '#E5A869',
      bodyHex: '#D1AB86',
      mutedHex: '#966F48',
      version: 1,
    }

    if (typeof window === 'undefined' || typeof document === 'undefined') {
      return resolve(fallbackPalette)
    }

    const img = new Image()
    img.crossOrigin = 'anonymous'

    const timeoutId = window.setTimeout(() => {
      resolve(fallbackPalette)
    }, 4000)

    img.onload = () => {
      window.clearTimeout(timeoutId)
      try {
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d', { willReadFrequently: true })
        if (!ctx) {
          return resolve(fallbackPalette)
        }

        // Amostra em no máximo 128px de largura
        const maxDim = 128
        let w = img.naturalWidth || img.width || maxDim
        let h = img.naturalHeight || img.height || maxDim
        if (w > maxDim || h > maxDim) {
          if (w > h) {
            h = Math.round((h * maxDim) / w)
            w = maxDim
          } else {
            w = Math.round((w * maxDim) / h)
            h = maxDim
          }
        }
        w = Math.max(16, w)
        h = Math.max(16, h)

        canvas.width = w
        canvas.height = h
        ctx.drawImage(img, 0, 0, w, h)

        const imageData = ctx.getImageData(0, 0, w, h)
        const pixels = imageData.data

        // Baldes quantizados por HSL
        // H: 12 fatias (30deg), S: 3 fatias, L: 3 fatias
        const buckets = new Map<
          string,
          {
            count: number
            totalH: number
            totalS: number
            totalL: number
            sampleR: number
            sampleG: number
            sampleB: number
          }
        >()

        const step = 4 * 2 // Amostra a cada 2 pixels para velocidade
        for (let i = 0; i < pixels.length; i += step) {
          const r = pixels[i]
          const g = pixels[i + 1]
          const b = pixels[i + 2]
          const a = pixels[i + 3]
          if (a < 128) continue

          const hsl = rgbToHsl(r, g, b)

          // Ignora brancos puros e pretos extremos sem cor para achar a pelagem/tom
          const isExtreme = hsl.l < 6 || hsl.l > 94
          const weight = isExtreme ? 0.2 : hsl.s > 15 ? 1.5 : 1.0

          const hIdx = Math.floor(hsl.h / 30) % 12
          const sIdx = Math.floor(hsl.s / 34)
          const lIdx = Math.floor(hsl.l / 34)
          const key = `${hIdx}_${sIdx}_${lIdx}`

          const bucket = buckets.get(key)
          if (!bucket) {
            buckets.set(key, {
              count: weight,
              totalH: hsl.h * weight,
              totalS: hsl.s * weight,
              totalL: hsl.l * weight,
              sampleR: r,
              sampleG: g,
              sampleB: b,
            })
          } else {
            bucket.count += weight
            bucket.totalH += hsl.h * weight
            bucket.totalS += hsl.s * weight
            bucket.totalL += hsl.l * weight
          }
        }

        const sorted = Array.from(buckets.values()).sort((a, b) => b.count - a.count)
        if (sorted.length === 0) {
          return resolve(fallbackPalette)
        }

        // Pega o bucket dominante
        const top = sorted[0]
        let avgH = Math.round(top.totalH / top.count)
        let avgS = Math.round(top.totalS / top.count)
        let avgL = Math.round(top.totalL / top.count)

        // Se o tom mais frequente for monocromático (ex: fundo preto ou pelo branco),
        // procura o próximo bucket que tenha saturação perceptível para o acento
        let accentH = avgH
        let accentS = avgS
        let accentL = avgL
        for (let i = 0; i < Math.min(sorted.length, 6); i++) {
          const b = sorted[i]
          const s = Math.round(b.totalS / b.count)
          const l = Math.round(b.totalL / b.count)
          if (s >= 20 && l >= 20 && l <= 85) {
            accentH = Math.round(b.totalH / b.count)
            accentS = s
            accentL = l
            break
          }
        }

        // Se a foto for essencialmente preto e branco (baixo chroma),
        // utiliza matiz amendoado/quente elegante (32deg) com baixa saturação
        if (accentS < 12) {
          accentH = 32
          accentS = 22
        }

        // Derivação da paleta com contraste impecável sobre fundo escuro
        // 1. Fundo escuro fundido à matiz do pet (L ~ 4-6%, S ~ 20-35%)
        const bgHue = accentH
        const bgSat = Math.min(35, Math.max(12, accentS))
        const bgHex = hslToHex(bgHue, bgSat, 5)

        // 2. Acento e Primária vívidos e legíveis (L ~ 60-66%, S ~ 70-85%)
        const primarySat = Math.min(92, Math.max(55, accentS + 25))
        const primaryLight = 62
        const primaryHex = hslToHex(accentH, primarySat, primaryLight)

        // 3. Título de alto contraste claro com suave tonalização da matiz
        const titleHex = hslToHex(accentH, Math.min(25, accentS), 94)

        // 4. Corpo e Muted equilibrados
        const bodyHex = hslToHex(accentH, Math.min(35, accentS + 5), 78)
        const mutedHex = hslToHex(accentH, Math.min(30, accentS), 52)

        // 5. Glow radial suave para o Hero
        const glowRgb = hexToHsl(primaryHex)
        const glowRgba = `hsla(${glowRgb.h}, ${glowRgb.s}%, ${glowRgb.l}%, 0.22)`

        const result: ExtractedPalette = {
          dominantHex: hslToHex(avgH, avgS, avgL),
          accentHex: primaryHex,
          bgHex,
          glowRgba,
          titleHex,
          primaryHex,
          bodyHex,
          mutedHex,
          version: 1,
        }

        resolve(result)
      } catch {
        resolve(fallbackPalette)
      }
    }

    img.onerror = () => {
      window.clearTimeout(timeoutId)
      resolve(fallbackPalette)
    }

    img.src = imageSource
  })
}

/**
 * Constrói um objeto HeroTheme virtual dinâmico a partir do pet cadastrado e sua paleta.
 */
export function buildPetHeroTheme(
  petId: string,
  petName: string,
  petBreed: string | undefined,
  petSpecies: string | undefined,
  avatarUrl: string,
  palette: ExtractedPalette,
  baseTheme: HeroTheme,
): HeroTheme {
  const isCat =
    petSpecies === 'felina' ||
    petBreed?.toLowerCase().includes('gato') ||
    baseTheme.species === 'cat'

  const label = petName.trim().toUpperCase()

  return {
    id: `pet-${petId}`,
    species: isCat ? 'cat' : 'dog',
    name: petName,
    label,
    bgColor: palette.bgHex,
    glowColor: palette.glowRgba,
    accentColor: palette.accentHex,
    brownTitle: palette.titleHex,
    brownPrimary: palette.primaryHex,
    brownBody: palette.bodyHex,
    brownMuted: palette.mutedHex,
    imageUrl: avatarUrl,
    fallbackUrl: baseTheme.imageUrl,
    description: `Interface personalizada do pet ${petName} (${petBreed || 'Sem raça'}), adaptada à paleta da sua foto.`,
    bgPosition: 'center center',
    objectPosition: 'center center',
  }
}
