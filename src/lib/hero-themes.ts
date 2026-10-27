import { preferenceStorage } from '@/lib/preferences'
import { getCroppedBreedImage } from './breed-assets'

export interface HeroTheme {
  id: string
  species: 'dog' | 'cat'
  name: string
  label: string
  accentColor: string
  bgColor: string // Fundo escuro característico fundido à pelagem
  glowColor: string
  brownTitle: string
  brownPrimary: string
  brownBody: string
  brownMuted: string
  imageUrl: string
  fallbackUrl: string
  description: string
  bgPosition?: string
  objectPosition?: string
}

/**
 * Retorna a imagem do tema: se a raça fizer parte do anexo de 21 raças,
 * utiliza o recorte 100% fiel do anexo em alta resolução. Caso contrário (ex: Boxer, Golden),
 * usa um recurso local do catálogo. Temas sem retrato incluído usam o símbolo do app.
 */
export function getThemeImageUrl(theme: HeroTheme): string {
  const cropped = getCroppedBreedImage(theme.id)
  if (cropped) {
    return cropped
  }
  return theme.imageUrl
}

export const HERO_THEMES: HeroTheme[] = [
  // ===================== CÃES (16 RAÇAS) =====================
  {
    id: 'rottweiler',
    species: 'dog',
    name: 'Rottweiler',
    label: 'ROTTWEILER',
    bgColor: '#050505',
    glowColor: 'rgba(198, 139, 89, 0.12)',
    accentColor: '#E5A869',
    brownTitle: '#F4D4B5',
    brownPrimary: '#E5A869',
    brownBody: '#D1A37B',
    brownMuted: '#9B7452',
    imageUrl: '/heroes/rottweiler.png',
    fallbackUrl: '/heroes/rottweiler.png',
    description: 'Pelagem preta com canela profundo e expressão nobre e imponente.',
    bgPosition: 'right 20% center',
    objectPosition: 'center 25%',
  },
  {
    id: 'golden-retriever',
    species: 'dog',
    name: 'Golden Retriever',
    label: 'GOLDEN RETRIEVER',
    bgColor: '#160d05',
    glowColor: 'rgba(230, 163, 62, 0.22)',
    accentColor: '#F5B041',
    brownTitle: '#FCE7C8',
    brownPrimary: '#F0B264',
    brownBody: '#DDB68A',
    brownMuted: '#A98358',
    imageUrl: '/meu-bichu-icon.png',
    fallbackUrl: '/meu-bichu-icon.png',
    description: 'Tom âmbar dourado quente com olhos expressivos e carinhosos.',
    bgPosition: 'right 20% center',
    objectPosition: 'center 25%',
  },
  {
    id: 'pastor-alemao',
    species: 'dog',
    name: 'Pastor Alemão',
    label: 'PASTOR ALEMÃO',
    bgColor: '#0d0a06',
    glowColor: 'rgba(205, 133, 63, 0.20)',
    accentColor: '#D28B49',
    brownTitle: '#F2DAC1',
    brownPrimary: '#D89555',
    brownBody: '#C8A07A',
    brownMuted: '#8E6E4F',
    imageUrl: '/heroes/pastor-alemao.png',
    fallbackUrl: '/heroes/pastor-alemao.png',
    description: 'Pelagem capa-preta e castanho floresta, porte vigilante e inteligente.',
    bgPosition: 'right 22% center',
    objectPosition: 'center 20%',
  },
  {
    id: 'labrador',
    species: 'dog',
    name: 'Labrador Retriever',
    label: 'LABRADOR RETRIEVER',
    bgColor: '#140c06',
    glowColor: 'rgba(217, 143, 75, 0.22)',
    accentColor: '#E69C50',
    brownTitle: '#FBE8D0',
    brownPrimary: '#E8A359',
    brownBody: '#D3AA82',
    brownMuted: '#9B734E',
    imageUrl: '/heroes/labrador.png',
    fallbackUrl: '/heroes/labrador.png',
    description: 'Focinho expressivo em caramelo chocolate aveludado e fundo nobre.',
    bgPosition: 'right 20% center',
    objectPosition: 'center 25%',
  },
  {
    id: 'border-collie',
    species: 'dog',
    name: 'Border Collie',
    label: 'BORDER COLLIE',
    bgColor: '#070b07',
    glowColor: 'rgba(120, 160, 120, 0.18)',
    accentColor: '#7EAF85',
    brownTitle: '#E7EFE8',
    brownPrimary: '#9DC7A4',
    brownBody: '#BACFBE',
    brownMuted: '#68866E',
    imageUrl: '/heroes/border-collie.png',
    fallbackUrl: '/heroes/border-collie.png',
    description: 'Olhar penetrante com contraste preto e branco fundido a verde musgo escuro.',
    bgPosition: 'right 22% center',
    objectPosition: 'center 22%',
  },
  {
    id: 'bulldog-ingles',
    species: 'dog',
    name: 'Bulldog Inglês',
    label: 'BULLDOG INGLÊS',
    bgColor: '#170c06',
    glowColor: 'rgba(200, 115, 60, 0.22)',
    accentColor: '#D97736',
    brownTitle: '#FADBC6',
    brownPrimary: '#E28647',
    brownBody: '#D6A683',
    brownMuted: '#9B6C4B',
    imageUrl: '/heroes/bulldog-ingles.png',
    fallbackUrl: '/heroes/bulldog-ingles.png',
    description: 'Carismático, com dobras expressivas em tom terracota e marrom chocolate.',
    bgPosition: 'right 22% center',
    objectPosition: 'center 25%',
  },
  {
    id: 'beagle',
    species: 'dog',
    name: 'Beagle',
    label: 'BEAGLE',
    bgColor: '#150d05',
    glowColor: 'rgba(215, 130, 60, 0.22)',
    accentColor: '#DE8B43',
    brownTitle: '#FCE7D0',
    brownPrimary: '#E49552',
    brownBody: '#D8AB83',
    brownMuted: '#9E714B',
    imageUrl: '/heroes/beagle.png',
    fallbackUrl: '/heroes/beagle.png',
    description: 'Orelhas aveludadas e olhos meigos em tom caramelo e mel profundo.',
    bgPosition: 'right 20% center',
    objectPosition: 'center 25%',
  },
  {
    id: 'husky-siberiano',
    species: 'dog',
    name: 'Husky Siberiano',
    label: 'HUSKY SIBERIANO',
    bgColor: '#060e15',
    glowColor: 'rgba(74, 144, 226, 0.22)',
    accentColor: '#5DADE2',
    brownTitle: '#D6EAF8',
    brownPrimary: '#7FB3D5',
    brownBody: '#A9CCE3',
    brownMuted: '#547A99',
    imageUrl: '/heroes/husky-siberiano.png',
    fallbackUrl: '/heroes/husky-siberiano.png',
    description: 'Olhos azuis glaciais hipnotizantes fundidos em noite ártica profunda.',
    bgPosition: 'right 22% center',
    objectPosition: 'center 22%',
  },
  {
    id: 'poodle',
    species: 'dog',
    name: 'Poodle',
    label: 'POODLE',
    bgColor: '#17110c',
    glowColor: 'rgba(215, 170, 120, 0.20)',
    accentColor: '#DDB687',
    brownTitle: '#FDF0DF',
    brownPrimary: '#E2C29B',
    brownBody: '#D2B695',
    brownMuted: '#9B7F62',
    imageUrl: '/heroes/poodle.png',
    fallbackUrl: '/heroes/poodle.png',
    description: 'Pelagem cacheada refinada em tons creme suave e chocolate aveludado.',
    bgPosition: 'right 20% center',
    objectPosition: 'center 25%',
  },
  {
    id: 'dachshund',
    species: 'dog',
    name: 'Dachshund',
    label: 'DACHSHUND',
    bgColor: '#160a04',
    glowColor: 'rgba(180, 80, 30, 0.22)',
    accentColor: '#C4622B',
    brownTitle: '#FAD5C0',
    brownPrimary: '#D1733E',
    brownBody: '#CB9877',
    brownMuted: '#8D5837',
    imageUrl: '/heroes/dachshund.png',
    fallbackUrl: '/heroes/dachshund.png',
    description: 'Pelagem castanho-avermelhada clássica com olhar esperto e leal.',
    bgPosition: 'right 22% center',
    objectPosition: 'center 25%',
  },
  {
    id: 'bulldog-frances',
    species: 'dog',
    name: 'Bulldog Francês',
    label: 'BULLDOG FRANCÊS',
    bgColor: '#0f0f10',
    glowColor: 'rgba(140, 120, 160, 0.20)',
    accentColor: '#A093B2',
    brownTitle: '#ECE5F4',
    brownPrimary: '#B6ABCA',
    brownBody: '#BFB8C8',
    brownMuted: '#7A6E88',
    imageUrl: '/heroes/bulldog-frances.png',
    fallbackUrl: '/heroes/bulldog-frances.png',
    description: 'Orelhas de morcego inconfundíveis com pelagem fulvo/tigrada e charme único.',
    bgPosition: 'right 22% center',
    objectPosition: 'center 22%',
  },
  {
    id: 'shih-tzu',
    species: 'dog',
    name: 'Shih Tzu',
    label: 'SHIH TZU',
    bgColor: '#1a090e',
    glowColor: 'rgba(215, 95, 125, 0.22)',
    accentColor: '#D96585',
    brownTitle: '#FAD4E0',
    brownPrimary: '#E27E9B',
    brownBody: '#D3A4B3',
    brownMuted: '#9B5B70',
    imageUrl: '/heroes/shih-tzu.png',
    fallbackUrl: '/heroes/shih-tzu.png',
    description: 'Penteado nobre com laço e pelagem longa em vinho rosado e creme.',
    bgPosition: 'right 22% center',
    objectPosition: 'center 20%',
  },
  {
    id: 'boxer',
    species: 'dog',
    name: 'Boxer',
    label: 'BOXER',
    bgColor: '#150a04',
    glowColor: 'rgba(210, 110, 50, 0.22)',
    accentColor: '#CE6F34',
    brownTitle: '#FCE0CE',
    brownPrimary: '#DC7E44',
    brownBody: '#D3A07F',
    brownMuted: '#965E3A',
    imageUrl: '/meu-bichu-icon.png',
    fallbackUrl: '/meu-bichu-icon.png',
    description: 'Atlético, musculoso e carinhoso com fundo marrom caramelo marcante.',
    bgPosition: 'right 22% center',
    objectPosition: 'center 22%',
  },
  {
    id: 'cocker-spaniel',
    species: 'dog',
    name: 'Cocker Spaniel',
    label: 'COCKER SPANIEL',
    bgColor: '#180c05',
    glowColor: 'rgba(230, 140, 60, 0.22)',
    accentColor: '#E68E3E',
    brownTitle: '#FDE4CC',
    brownPrimary: '#ECA058',
    brownBody: '#D8AB82',
    brownMuted: '#A06E44',
    imageUrl: '/heroes/cocker-spaniel.png',
    fallbackUrl: '/heroes/cocker-spaniel.png',
    description: 'Pelagem ondulada sedosa em tom âmbar conhaque com olhar doce.',
    bgPosition: 'right 20% center',
    objectPosition: 'center 22%',
  },
  {
    id: 'chow-chow',
    species: 'dog',
    name: 'Chow Chow',
    label: 'CHOW CHOW',
    bgColor: '#130d07',
    glowColor: 'rgba(215, 140, 70, 0.20)',
    accentColor: '#D78B45',
    brownTitle: '#FBE8D5',
    brownPrimary: '#E29958',
    brownBody: '#D1AB86',
    brownMuted: '#966F48',
    imageUrl: '/heroes/chow-chow.png',
    fallbackUrl: '/heroes/chow-chow.png',
    description: 'Juba leonina felpuda e pelagem canela majestosa com fundo denso.',
    bgPosition: 'right 20% center',
    objectPosition: 'center 20%',
  },
  {
    id: 'vira-lata',
    species: 'dog',
    name: 'Vira-Lata Caramelo',
    label: 'VIRA-LATA',
    bgColor: '#140c05',
    glowColor: 'rgba(220, 150, 70, 0.22)',
    accentColor: '#DE9949',
    brownTitle: '#FCE7CF',
    brownPrimary: '#E6A75E',
    brownBody: '#D5AD83',
    brownMuted: '#9B7248',
    imageUrl: '/heroes/vira-lata.png',
    fallbackUrl: '/heroes/vira-lata.png',
    description: 'O patrimônio afetivo brasileiro: olhar leal, esperto e caramelo puro.',
    bgPosition: 'right 20% center',
    objectPosition: 'center 24%',
  },

  // ===================== GATOS (7 RAÇAS) =====================
  {
    id: 'persa',
    species: 'cat',
    name: 'Gato Persa',
    label: 'PERSA',
    bgColor: '#18100c',
    glowColor: 'rgba(230, 180, 140, 0.20)',
    accentColor: '#E2B895',
    brownTitle: '#FFF0E2',
    brownPrimary: '#ECC8A9',
    brownBody: '#D8BC9F',
    brownMuted: '#9E8066',
    imageUrl: '/heroes/persa.png',
    fallbackUrl: '/heroes/persa.png',
    description: 'Pelagem branca volumosa, serenidade e olhar suave em tom creme amanteigado.',
    bgPosition: 'right 22% center',
    objectPosition: 'center 22%',
  },
  {
    id: 'siames',
    species: 'cat',
    name: 'Gato Siamês',
    label: 'SIAMÊS',
    bgColor: '#060d16',
    glowColor: 'rgba(60, 130, 200, 0.24)',
    accentColor: '#4D96D6',
    brownTitle: '#DCEBFA',
    brownPrimary: '#6AA8E0',
    brownBody: '#A2C2DF',
    brownMuted: '#527798',
    imageUrl: '/heroes/siames.png',
    fallbackUrl: '/heroes/siames.png',
    description: 'Pontos castanho-escuros clássicos e penetrantes olhos safira sobre noite azul.',
    bgPosition: 'right 20% center',
    objectPosition: 'center 22%',
  },
  {
    id: 'maine-coon',
    species: 'cat',
    name: 'Maine Coon',
    label: 'MAINE COON',
    bgColor: '#081009',
    glowColor: 'rgba(80, 150, 95, 0.20)',
    accentColor: '#5EA772',
    brownTitle: '#E0F0E4',
    brownPrimary: '#73B986',
    brownBody: '#A4C9B0',
    brownMuted: '#587F64',
    imageUrl: '/heroes/maine-coon.png',
    fallbackUrl: '/heroes/maine-coon.png',
    description: 'Gigante gentil de pelagem farta rajada e presença imponente em verde musgo.',
    bgPosition: 'right 22% center',
    objectPosition: 'center 22%',
  },
  {
    id: 'british-shorthair',
    species: 'cat',
    name: 'British Shorthair',
    label: 'BRITISH SHORTHAIR',
    bgColor: '#0e1217',
    glowColor: 'rgba(100, 130, 160, 0.22)',
    accentColor: '#7C9BB7',
    brownTitle: '#E4EDF5',
    brownPrimary: '#95AFCA',
    brownBody: '#B5C4D3',
    brownMuted: '#647A8F',
    imageUrl: '/heroes/british-shorthair.png',
    fallbackUrl: '/heroes/british-shorthair.png',
    description: 'Pelagem cinza-azulada densa e olhos âmbar arredondados com porte aristocrático.',
    bgPosition: 'right 20% center',
    objectPosition: 'center 22%',
  },
  {
    id: 'ragdoll',
    species: 'cat',
    name: 'Ragdoll',
    label: 'RAGDOLL',
    bgColor: '#120d18',
    glowColor: 'rgba(160, 120, 200, 0.22)',
    accentColor: '#A889CD',
    brownTitle: '#F3EBF9',
    brownPrimary: '#BC9FE0',
    brownBody: '#CBBAD9',
    brownMuted: '#7D6798',
    imageUrl: '/heroes/ragdoll.png',
    fallbackUrl: '/heroes/ragdoll.png',
    description: 'Pelagem sedosa cor de nuvem, olhos azuis luminosos e fundo púrpura crepuscular.',
    bgPosition: 'right 22% center',
    objectPosition: 'center 20%',
  },
  {
    id: 'sphynx',
    species: 'cat',
    name: 'Sphynx',
    label: 'SPHYNX',
    bgColor: '#170c10',
    glowColor: 'rgba(215, 110, 130, 0.20)',
    accentColor: '#D97992',
    brownTitle: '#FCE7ED',
    brownPrimary: '#E592A7',
    brownBody: '#CFA4AF',
    brownMuted: '#8D5865',
    imageUrl: '/heroes/sphynx.png',
    fallbackUrl: '/heroes/sphynx.png',
    description: 'Design escultural, elegância enigmática e tons rosados sobre fundo vinho.',
    bgPosition: 'right 20% center',
    objectPosition: 'center 24%',
  },
  {
    id: 'bengala',
    species: 'cat',
    name: 'Gato Bengala',
    label: 'BENGALA',
    bgColor: '#160c04',
    glowColor: 'rgba(220, 130, 45, 0.24)',
    accentColor: '#DE7E32',
    brownTitle: '#FCE4D0',
    brownPrimary: '#E89048',
    brownBody: '#D3A47D',
    brownMuted: '#9B6132',
    imageUrl: '/heroes/bengala.png',
    fallbackUrl: '/heroes/bengala.png',
    description: 'Padrão leopardo exótico com rosetas douradas e fundo âmbar vibrante.',
    bgPosition: 'right 22% center',
    objectPosition: 'center 20%',
  },

  // ===================== TEMAS 100% NEUTROS (SEM COR DECORATIVA) =====================
  {
    id: 'neutral-black-white',
    species: 'dog',
    name: 'Neutro Black & White',
    label: '100% NEUTRO',
    bgColor: '#000000',
    glowColor: 'rgba(255, 255, 255, 0.05)',
    accentColor: '#ffffff',
    brownTitle: '#ffffff',
    brownPrimary: '#ffffff',
    brownBody: '#d4d4d4',
    brownMuted: '#8c8c8c',
    imageUrl: '/heroes/rottweiler.png',
    fallbackUrl: '/heroes/rottweiler.png',
    description:
      'Visual 100% monocromático preto e branco. Fundo preto puro, sem cores decorativas.',
    bgPosition: 'right 20% center',
    objectPosition: 'center 25%',
  },
  {
    id: 'neutral-white-black',
    species: 'dog',
    name: 'Neutro White & Black',
    label: '100% NEUTRO',
    bgColor: '#ffffff',
    glowColor: 'rgba(0, 0, 0, 0.05)',
    accentColor: '#000000',
    brownTitle: '#000000',
    brownPrimary: '#000000',
    brownBody: '#333333',
    brownMuted: '#737373',
    imageUrl: '/heroes/poodle.png',
    fallbackUrl: '/heroes/poodle.png',
    description:
      'Visual 100% monocromático branco e preto. Superfície clara pura, sem cores decorativas.',
    bgPosition: 'right 20% center',
    objectPosition: 'center 25%',
  },
]

export const HERO_STORAGE_KEY = 'bichu_selected_hero_theme'
export const DEFAULT_HERO_THEME_ID = 'rottweiler'

// Tema dinâmico ativo em memória (quando o pet ativo possui foto e está em uso)
let currentActiveDynamicTheme: HeroTheme | null = null

export function setCurrentDynamicHeroTheme(theme: HeroTheme | null) {
  currentActiveDynamicTheme = theme
}

export function getCurrentDynamicHeroTheme(): HeroTheme | null {
  return currentActiveDynamicTheme
}

/**
 * Converte hex (#ffffff ou #fff) para componentes HSL
 */
export function hexToHsl(hex: string): { h: number; s: number; l: number } {
  let c = hex.replace('#', '').trim()
  if (c.length === 3) {
    c = c
      .split('')
      .map((char) => char + char)
      .join('')
  }
  const num = parseInt(c, 16)
  const r = ((num >> 16) & 255) / 255
  const g = ((num >> 8) & 255) / 255
  const b = (num & 255) / 255

  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  let h = 0
  let s = 0
  const l = (max + min) / 2

  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0)
        break
      case g:
        h = (b - r) / d + 2
        break
      case b:
        h = (r - g) / d + 4
        break
    }
    h = h / 6
  }

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  }
}

/**
 * Converte hex para string HSL no formato aceito pelo Tailwind (ex: "31 70% 66%")
 */
export function hexToHslString(hex: string): string {
  const { h, s, l } = hexToHsl(hex)
  return `${h} ${s}% ${l}%`
}

/**
 * Aplica todas as variáveis CSS do HeroTheme ao document.documentElement
 * para que TODAS as telas (Plano, Peso, BCS, Comparador, Cães, etc.)
 * assumam a mesma paleta de cor da raça ativa.
 */
export function applyHeroThemeToDom(theme: HeroTheme) {
  if (preferenceStorage.getItem('bichu_manual_color') === 'true') return
  if (typeof document === 'undefined') return
  const root = document.documentElement

  // Sempre modo dark acolhedor baseado na pelagem
  root.classList.add('dark')

  const bgHsl = hexToHsl(theme.bgColor)
  const cardLightness = Math.min(18, Math.max(bgHsl.l + 4, 7))
  const cardSat = Math.min(bgHsl.s, 24)
  const borderLightness = Math.min(30, Math.max(bgHsl.l + 12, 17))

  // Tokens fundamentais do sistema de design (Tailwind / shadcn)
  root.style.setProperty('--background', `${bgHsl.h} ${bgHsl.s}% ${bgHsl.l}%`)
  root.style.setProperty('--foreground', hexToHslString(theme.brownTitle))

  root.style.setProperty('--card', `${bgHsl.h} ${cardSat}% ${cardLightness}%`)
  root.style.setProperty('--card-foreground', hexToHslString(theme.brownTitle))

  root.style.setProperty('--popover', `${bgHsl.h} ${cardSat}% ${cardLightness}%`)
  root.style.setProperty('--popover-foreground', hexToHslString(theme.brownTitle))

  const primaryHsl = hexToHslString(theme.accentColor || theme.brownPrimary)
  root.style.setProperty('--primary', primaryHsl)
  root.style.setProperty('--primary-foreground', `${bgHsl.h} ${bgHsl.s}% 5%`)

  root.style.setProperty(
    '--secondary',
    `${bgHsl.h} ${Math.min(bgHsl.s, 20)}% ${cardLightness + 4}%`,
  )
  root.style.setProperty('--secondary-foreground', hexToHslString(theme.brownTitle))

  root.style.setProperty('--muted', `${bgHsl.h} ${Math.min(bgHsl.s, 20)}% ${cardLightness + 3}%`)
  root.style.setProperty('--muted-foreground', hexToHslString(theme.brownMuted))

  root.style.setProperty('--accent', primaryHsl)
  root.style.setProperty('--accent-foreground', `${bgHsl.h} ${bgHsl.s}% 5%`)

  root.style.setProperty('--border', `${bgHsl.h} ${Math.min(bgHsl.s, 30)}% ${borderLightness}%`)
  root.style.setProperty('--input', `${bgHsl.h} ${Math.min(bgHsl.s, 30)}% ${borderLightness}%`)
  root.style.setProperty('--ring', primaryHsl)

  // Sidebar tokens
  root.style.setProperty('--sidebar-background', `${bgHsl.h} ${bgHsl.s}% ${bgHsl.l}%`)
  root.style.setProperty('--sidebar-foreground', hexToHslString(theme.brownTitle))
  root.style.setProperty('--sidebar-primary', primaryHsl)
  root.style.setProperty('--sidebar-primary-foreground', `${bgHsl.h} ${bgHsl.s}% 5%`)
  root.style.setProperty(
    '--sidebar-border',
    `${bgHsl.h} ${Math.min(bgHsl.s, 30)}% ${borderLightness}%`,
  )
  root.style.setProperty('--sidebar-ring', primaryHsl)

  // Variáveis diretas de conveniência
  root.style.setProperty('--theme-hero-bg', theme.bgColor)
  root.style.setProperty('--theme-hero-primary', theme.brownPrimary)
  root.style.setProperty('--theme-hero-title', theme.brownTitle)
  root.style.setProperty('--theme-hero-body', theme.brownBody)
  root.style.setProperty('--theme-hero-muted', theme.brownMuted)
  root.style.setProperty('--theme-hero-accent', theme.accentColor)

  root.setAttribute('data-hero-theme', theme.id)
  root.setAttribute('data-is-pet-hero', String(theme.id.startsWith('pet-')))
}

export function getHeroThemeById(id: string | null | undefined): HeroTheme {
  if (!id) {
    return HERO_THEMES[0]
  }
  if (currentActiveDynamicTheme && currentActiveDynamicTheme.id === id) {
    return currentActiveDynamicTheme
  }
  const found = HERO_THEMES.find((t) => t.id === id)
  return found || HERO_THEMES[0]
}

/**
 * Tenta inferir o HeroTheme mais adequado a partir do nome da raça de um pet cadastrado
 */
export function matchHeroThemeByBreed(breed: string | null | undefined): HeroTheme | null {
  if (!breed) return null
  const normalized = breed
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()

  for (const theme of HERO_THEMES) {
    const themeNameNorm = theme.name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
    const themeIdNorm = theme.id.replace(/-/g, ' ')

    if (
      normalized.includes(themeNameNorm) ||
      themeNameNorm.includes(normalized) ||
      normalized.includes(themeIdNorm)
    ) {
      return theme
    }
  }

  // Casos especiais comuns em português
  if (
    normalized.includes('rott') ||
    normalized.includes('rotweiller') ||
    normalized.includes('rottweiller')
  ) {
    return getHeroThemeById('rottweiler')
  }
  if (normalized.includes('golden') || normalized.includes('retriever')) {
    return getHeroThemeById('golden-retriever')
  }
  if (normalized.includes('pastor') || normalized.includes('shepherd')) {
    return getHeroThemeById('pastor-alemao')
  }
  if (normalized.includes('labrador')) {
    return getHeroThemeById('labrador')
  }
  if (normalized.includes('collie')) {
    return getHeroThemeById('border-collie')
  }
  if (normalized.includes('bulldog') && normalized.includes('frances')) {
    return getHeroThemeById('bulldog-frances')
  }
  if (normalized.includes('bulldog')) {
    return getHeroThemeById('bulldog-ingles')
  }
  if (normalized.includes('husky') || normalized.includes('siberiano')) {
    return getHeroThemeById('husky-siberiano')
  }
  if (normalized.includes('shih') || normalized.includes('tzu') || normalized.includes('shit')) {
    return getHeroThemeById('shih-tzu')
  }
  if (normalized.includes('poodle') || normalized.includes('podle')) {
    return getHeroThemeById('poodle')
  }
  if (
    normalized.includes('salsicha') ||
    normalized.includes('teckel') ||
    normalized.includes('dach')
  ) {
    return getHeroThemeById('dachshund')
  }
  if (normalized.includes('beagle')) {
    return getHeroThemeById('beagle')
  }
  if (normalized.includes('boxer')) {
    return getHeroThemeById('boxer')
  }
  if (normalized.includes('cocker')) {
    return getHeroThemeById('cocker-spaniel')
  }
  if (normalized.includes('chow')) {
    return getHeroThemeById('chow-chow')
  }
  if (
    normalized.includes('vira') ||
    normalized.includes('srd') ||
    normalized.includes('caramelo')
  ) {
    return getHeroThemeById('vira-lata')
  }
  if (normalized.includes('persa')) {
    return getHeroThemeById('persa')
  }
  if (normalized.includes('siames') || normalized.includes('siamese')) {
    return getHeroThemeById('siames')
  }
  if (normalized.includes('maine') || normalized.includes('coon')) {
    return getHeroThemeById('maine-coon')
  }
  if (normalized.includes('british') || normalized.includes('britanico')) {
    return getHeroThemeById('british-shorthair')
  }
  if (normalized.includes('ragdoll')) {
    return getHeroThemeById('ragdoll')
  }
  if (normalized.includes('sphynx') || normalized.includes('pelado')) {
    return getHeroThemeById('sphynx')
  }
  if (normalized.includes('bengal') || normalized.includes('bengala')) {
    return getHeroThemeById('bengala')
  }

  return null
}
