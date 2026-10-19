import { preferenceStorage } from '@/lib/preferences'
import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import type { DogRecord, FeedingPlanRecord } from '@/types/nutrition'
import { nutritionService } from '@/services/nutrition'
import { calculateNutrition, getDefaultMeals } from '@/lib/nutrition-calculator'

interface DogContextValue {
  dogs: DogRecord[]
  activeDog: DogRecord | null
  activePlan: FeedingPlanRecord | null
  loading: boolean
  error: string | null
  setActiveDogId: (id: string) => void
  refreshDogs: () => Promise<void>
  refreshActivePlan: () => Promise<void>
}

const DogContext = createContext<DogContextValue | undefined>(undefined)

const ACTIVE_DOG_STORAGE_KEY = 'bichu_active_dog_id'

export const DogProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [dogs, setDogs] = useState<DogRecord[]>([])
  const [activeDogId, setActiveDogIdState] = useState<string | null>(() => {
    try {
      return preferenceStorage.getItem(ACTIVE_DOG_STORAGE_KEY)
    } catch {
      return null
    }
  })
  const [activePlan, setActivePlan] = useState<FeedingPlanRecord | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refreshDogs = useCallback(async () => {
    try {
      setError(null)
      const list = await nutritionService.getDogs()
      setDogs(list)

      if (list.length === 0) {
        setActiveDogIdState(null)
        try {
          preferenceStorage.removeItem(ACTIVE_DOG_STORAGE_KEY)
        } catch {
          /* intentionally ignored */
        }
        setActivePlan(null)
        return
      }

      // Preserve currently selected activeDogId if valid, otherwise select the first dog
      setActiveDogIdState((currentId) => {
        if (currentId && list.some((d) => d.id === currentId)) {
          return currentId
        }
        const fallbackId = list[0].id
        try {
          preferenceStorage.setItem(ACTIVE_DOG_STORAGE_KEY, fallbackId)
        } catch {
          /* intentionally ignored */
        }
        return fallbackId
      })
    } catch (err) {
      console.error('Erro ao atualizar lista de cães:', err)
      setError('Não foi possível carregar os cães')
    } finally {
      setLoading(false)
    }
  }, [])

  const refreshActivePlan = useCallback(async () => {
    if (!activeDogId) {
      setActivePlan(null)
      return
    }
    try {
      let plan = await nutritionService.getActivePlan(activeDogId)
      // Auto-create default plan if none exists for this dog yet
      if (!plan) {
        // Query the specific dog directly from backend to ensure fresh data
        const dog = await nutritionService.getDogById(activeDogId)
        if (dog && dog.id === activeDogId) {
          const calc = calculateNutrition({
            species: dog.species,
      birthDate: dog.birth_date,
      weightKg: dog.weight_kg,
            sterilized: dog.sterilized,
            activityLevel: dog.activity_level,
            goal: 'manter',
            foodKcalPerKg: 3500,
            mealsPerDay: 2,
          })
          const meals = getDefaultMeals(calc.mealsPerDay, calc.dailyGrams)
          plan = await nutritionService.savePlan(dog.id, {
            food_name: 'Ração Padrão',
            kcal_per_kg: calc.foodKcalPerKg,
            meals_per_day: calc.mealsPerDay,
            daily_kcal: calc.dailyKcal,
            daily_grams: calc.dailyGrams,
            goal: 'manter',
            meals_json: meals,
          })
        }
      }
      setActivePlan(plan)
    } catch (e) {
      console.warn('Erro ao carregar plano ativo:', e)
    }
  }, [activeDogId])

  useEffect(() => {
    refreshDogs()
  }, [refreshDogs])

  useEffect(() => {
    if (activeDogId) {
      refreshActivePlan()
    } else {
      setActivePlan(null)
    }
  }, [activeDogId, refreshActivePlan])

  useEffect(() => { const changed = () => { void refreshDogs(); void refreshActivePlan() }; window.addEventListener('bichu:weight-changed', changed); return () => window.removeEventListener('bichu:weight-changed', changed) }, [refreshDogs, refreshActivePlan])

  const setActiveDogId = (id: string) => {
    setActiveDogIdState(id)
    try {
      preferenceStorage.setItem(ACTIVE_DOG_STORAGE_KEY, id)
      // Limpa qualquer tema estático salvo para garantir que o tema do novo pet assuma imediatamente
      // Preferência visual permanece até nova escolha manual.
    } catch {
      /* intentionally ignored */
    }
    // Dispara sincronização global de tema
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('bichu:hero-theme-changed'))
      window.dispatchEvent(new Event('bichu:pet-hero-pref-changed'))
    }
  }

  const activeDog = dogs.find((d) => d.id === activeDogId) || (dogs.length > 0 ? dogs[0] : null)

  return (
    <DogContext.Provider
      value={{
        dogs,
        activeDog,
        activePlan,
        loading,
        error,
        setActiveDogId,
        refreshDogs,
        refreshActivePlan,
      }}
    >
      {children}
    </DogContext.Provider>
  )
}

export function useDog() {
  const ctx = useContext(DogContext)
  if (!ctx) {
    throw new Error('useDog deve ser usado dentro de um DogProvider')
  }
  return ctx
}
