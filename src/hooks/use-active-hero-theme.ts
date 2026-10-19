import { preferenceStorage } from '@/lib/preferences'
import { useState, useEffect, useMemo } from 'react'
import { DogRecord } from '@/types/nutrition'
import {
  HeroTheme,
  HERO_STORAGE_KEY,
  DEFAULT_HERO_THEME_ID,
  getHeroThemeById,
  matchHeroThemeByBreed,
  applyHeroThemeToDom,
  setCurrentDynamicHeroTheme,
} from '@/lib/hero-themes'
import { nutritionService } from '@/services/nutrition'
import {
  extractPaletteFromImage,
  getCachedPetPalette,
  saveCachedPetPalette,
  getPetHeroPreference,
  buildPetHeroTheme,
} from '@/lib/color-extractor'

export interface ActiveHeroResolved {
  theme: HeroTheme
  isPetHero: boolean
  hasPetPhoto: boolean
  petAvatarUrl: string | null
  petImages: string[]
  activeImageIndex: number
  setActiveImageIndex: (idx: number) => void
  baseBreedTheme: HeroTheme
  usePetHeroPref: boolean
}

export function useActiveHeroTheme(
  activeDog: DogRecord | null | undefined,
  overrideActiveImageIndex?: number,
): ActiveHeroResolved {
  // 1. Raça base selecionada pelo usuário ou inferida pela raça do pet
  const [selectedBreedThemeId, setSelectedBreedThemeId] = useState<string | null>(() => {
    try {
      return preferenceStorage.getItem(HERO_STORAGE_KEY)
    } catch {
      return null
    }
  })

  // Listener para sincronizar trocas de tema
  useEffect(() => {
    const handleThemeChange = () => {
      try {
        const saved = preferenceStorage.getItem(HERO_STORAGE_KEY)
        setSelectedBreedThemeId(saved)
      } catch {
        // ignore
      }
    }
    window.addEventListener('storage', handleThemeChange)
    window.addEventListener('bichu:hero-theme-changed', handleThemeChange)
    return () => {
      window.removeEventListener('storage', handleThemeChange)
      window.removeEventListener('bichu:hero-theme-changed', handleThemeChange)
    }
  }, [])

  // Tema base da raça: se o usuário selecionou manualmente uma raça no seletor, respeita;
  // senão faz o match automático pela raça do pet ativo!
  const baseBreedTheme = useMemo(() => {
    if (selectedBreedThemeId) {
      const found = getHeroThemeById(selectedBreedThemeId)
      if (found && !found.id.startsWith('pet-')) return found
    }
    if (activeDog?.breed) {
      const matched = matchHeroThemeByBreed(activeDog.breed)
      if (matched) return matched
    }
    return getHeroThemeById(DEFAULT_HERO_THEME_ID)
  }, [selectedBreedThemeId, activeDog?.breed])

  // Lista de imagens do pet (avatar principal + galeria)
  const petImages = useMemo(() => {
    return nutritionService.getAllPetImages(activeDog)
  }, [activeDog?.avatar, activeDog?.gallery, activeDog?.id])

  const [internalImageIndex, setInternalImageIndex] = useState(0)

  // Reseta índice se o pet mudar
  useEffect(() => {
    setInternalImageIndex(0)
  }, [activeDog?.id])

  const activeImageIndex =
    overrideActiveImageIndex !== undefined ? overrideActiveImageIndex : internalImageIndex

  // Foto do pet ativo (baseada na imagem atualmente exibida)
  const petAvatarUrl = useMemo(() => {
    if (petImages.length === 0) return null
    const safeIdx = Math.max(0, Math.min(activeImageIndex, petImages.length - 1))
    return petImages[safeIdx] || petImages[0] || null
  }, [petImages, activeImageIndex])

  // Preferência se quer usar a foto do pet no lugar da raça (default: true)
  const [usePetHeroPref, setUsePetHeroPref] = useState<boolean>(() => {
    return getPetHeroPreference(activeDog?.id)
  })

  useEffect(() => {
    setUsePetHeroPref(getPetHeroPreference(activeDog?.id))
    const handlePrefChange = (e: Event) => {
      const custom = e as CustomEvent<{ petId?: string; enabled?: boolean } | undefined>
      const detail = custom?.detail

      if (detail && typeof detail === 'object') {
        if (detail.petId && detail.petId === activeDog?.id) {
          if (typeof detail.enabled === 'boolean') {
            setUsePetHeroPref(detail.enabled)
            return
          }
        }
      }

      // Fallback seguro: recarrega a preferência salva ou o padrão (true)
      setUsePetHeroPref(getPetHeroPreference(activeDog?.id))
    }
    window.addEventListener('bichu:pet-hero-pref-changed', handlePrefChange)
    return () => {
      window.removeEventListener('bichu:pet-hero-pref-changed', handlePrefChange)
    }
  }, [activeDog?.id])

  // Paleta extraída do pet (com cache instantâneo para 0ms de delay em re-render)
  const [petDynamicTheme, setPetDynamicTheme] = useState<HeroTheme | null>(() => {
    if (!activeDog?.id || !petAvatarUrl || !usePetHeroPref) return null
    const cached = getCachedPetPalette(activeDog.id, petAvatarUrl)
    if (cached) {
      return buildPetHeroTheme(
        activeDog.id,
        activeDog.name,
        activeDog.breed,
        activeDog.species,
        petAvatarUrl,
        cached,
        baseBreedTheme,
      )
    }
    return null
  })

  // Recalcula ou extrai paleta quando o pet ou sua foto muda
  useEffect(() => {
    if (!activeDog?.id || !petAvatarUrl || !usePetHeroPref) {
      setPetDynamicTheme(null)
      setCurrentDynamicHeroTheme(null)
      return
    }

    let active = true

    // Verifica se já temos em cache
    const cached = getCachedPetPalette(activeDog.id, petAvatarUrl)
    if (cached) {
      const theme = buildPetHeroTheme(
        activeDog.id,
        activeDog.name,
        activeDog.breed,
        activeDog.species,
        petAvatarUrl,
        cached,
        baseBreedTheme,
      )
      setPetDynamicTheme(theme)
      setCurrentDynamicHeroTheme(theme)
      applyHeroThemeToDom(theme)
      return
    }

    // Se não tiver cache, extrai via canvas em segundo plano de forma não-bloqueante
    extractPaletteFromImage(petAvatarUrl).then((palette) => {
      if (!active) return
      saveCachedPetPalette(activeDog.id, petAvatarUrl, palette)
      const theme = buildPetHeroTheme(
        activeDog.id,
        activeDog.name,
        activeDog.breed,
        activeDog.species,
        petAvatarUrl,
        palette,
        baseBreedTheme,
      )
      setPetDynamicTheme(theme)
      setCurrentDynamicHeroTheme(theme)
      applyHeroThemeToDom(theme)
    })

    return () => {
      active = false
    }
  }, [
    activeDog?.id,
    activeDog?.name,
    activeDog?.breed,
    activeDog?.species,
    petAvatarUrl,
    usePetHeroPref,
    baseBreedTheme,
  ])

  // Determina o tema final
  const isPetHero = Boolean(petDynamicTheme && usePetHeroPref && petAvatarUrl)
  const resolvedTheme = isPetHero && petDynamicTheme ? petDynamicTheme : baseBreedTheme

  // Sincroniza no DOM e no helper global
  useEffect(() => {
    if (isPetHero && petDynamicTheme) {
      setCurrentDynamicHeroTheme(petDynamicTheme)
      applyHeroThemeToDom(petDynamicTheme)
    } else {
      setCurrentDynamicHeroTheme(null)
      applyHeroThemeToDom(baseBreedTheme)
    }
  }, [isPetHero, petDynamicTheme, baseBreedTheme])

  return {
    theme: resolvedTheme,
    isPetHero,
    hasPetPhoto: petImages.length > 0,
    petAvatarUrl,
    petImages,
    activeImageIndex,
    setActiveImageIndex: setInternalImageIndex,
    baseBreedTheme,
    usePetHeroPref,
  }
}
