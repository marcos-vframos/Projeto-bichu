import { preferenceStorage } from '@/lib/preferences'
const TUTOR_STORAGE_KEY = 'bichu_tutor_name'
const TUTOR_DEFAULT_NAME = 'tutor'

export function getTutorName(): string {
  if (typeof window === 'undefined') return TUTOR_DEFAULT_NAME
  try {
    const saved = preferenceStorage.getItem(TUTOR_STORAGE_KEY)
    if (saved && saved.trim()) return saved.trim()
  } catch {
    // storage disabled
  }
  return TUTOR_DEFAULT_NAME
}

export function setTutorName(name: string): void {
  if (typeof window === 'undefined') return
  try {
    const clean = name.trim() || TUTOR_DEFAULT_NAME
    preferenceStorage.setItem(TUTOR_STORAGE_KEY, clean)
    window.dispatchEvent(new CustomEvent('bichu:tutor-name-changed', { detail: clean }))
  } catch {
    // storage disabled
  }
}

/**
 * Retorna a saudação de acordo com o horário local do tutor:
 * - 05:00 às 11:59: "Bom dia, [nome]"
 * - 12:00 às 17:59: "Boa tarde, [nome]"
 * - 18:00 às 04:59: "Boa noite, [nome]"
 */
export function getTimeBasedGreeting(name?: string): {
  greeting: string
  prefix: string
  name: string
} {
  const currentName = name || getTutorName()
  const hour = new Date().getHours()

  let prefix = 'Olá'
  if (hour >= 5 && hour < 12) {
    prefix = 'Bom dia'
  } else if (hour >= 12 && hour < 18) {
    prefix = 'Boa tarde'
  } else {
    prefix = 'Boa noite'
  }

  return {
    prefix,
    name: currentName,
    greeting: `${prefix}, ${currentName}`,
  }
}
