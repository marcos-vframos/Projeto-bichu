import type { ActivityLevel, FeedingGoal } from '@/types/nutrition'

export interface NutritionCalculationInput {
  species?: string
  birthDate?: string
  weightKg: number
  sterilized?: boolean
  activityLevel: ActivityLevel
  goal?: FeedingGoal
  foodKcalPerKg?: number
  mealsPerDay?: number
}

export interface NutritionCalculationResult {
  rer: number // Resting Energy Requirement
  baseFactor: number
  activityAdjustmentPercent: number
  totalFactor: number
  dailyKcal: number
  dailyGrams: number
  foodKcalPerKg: number
  foodEnergyValid: boolean
  mealsPerDay: number
}

/**
 * Canine energy requirement calculation based on NRC / WSAVA guidelines:
 * RER = 70 × (weight_kg ^ 0.75)
 * Base factors:
 * - Emagrecimento (perda): 1.0
 * - Castrado (manutenção): 1.6
 * - Inteiro (manutenção): 1.8
 * - Ganho de peso: 2.0
 *
 * Activity adjustment (applied on final result):
 * - Sedentário/Baixa: -10%
 * - Moderada: +10%
 * - Intensa/Alta: +20%
 */
export function calculateNutrition(input: NutritionCalculationInput): NutritionCalculationResult {
  const weight = Math.max(0.5, input.weightKg || 1)
  const rer = 70 * Math.pow(weight, 0.75)

  let baseFactor = 1.6
  if (input.goal === 'emagrecer') {
    baseFactor = 1.0
  } else if (input.goal === 'ganhar') {
    baseFactor = 2.0
  } else {
    // Manter peso
    baseFactor = input.sterilized ? 1.6 : 1.8
  }

  let activityAdjustmentPercent = 0
  if (input.activityLevel === 'baixa') {
    activityAdjustmentPercent = -10
  } else if (input.activityLevel === 'moderada') {
    activityAdjustmentPercent = 10
  } else if (input.activityLevel === 'alta') {
    activityAdjustmentPercent = 20
  }

  // Fatores felinos de manutenção: MSD Veterinary Manual (adultos 1.2/1.4; filhotes 2.5).
  // Metas de ganho/perda em gatos exigem plano individual e não usam os fatores caninos.
  if (input.species === 'felina') {
    const ageDays = input.birthDate ? (Date.now() - Date.parse(input.birthDate)) / 86400000 : Infinity
    baseFactor = ageDays >= 0 && ageDays < 365 ? 2.5 : input.sterilized ? 1.2 : 1.4
    activityAdjustmentPercent = 0
  }

  // kcal base = RER * baseFactor, depois ajuste de atividade
  const kcalBeforeActivity = rer * baseFactor
  const dailyKcalRaw = kcalBeforeActivity * (1 + activityAdjustmentPercent / 100)
  const dailyKcal = Math.round(dailyKcalRaw)

  // Only an omitted value uses the estimate; supplied values are never replaced.
  const foodKcalPerKg = input.foodKcalPerKg === undefined ? 3500 : input.foodKcalPerKg
  const foodEnergyValid = Number.isFinite(foodKcalPerKg) && foodKcalPerKg > 0
  // Gramas/dia = kcal/dia ÷ (kcal/kg ÷ 1000)
  const dailyGramsRaw = foodEnergyValid ? dailyKcal / (foodKcalPerKg / 1000) : 0
  const dailyGrams = Math.round(dailyGramsRaw)

  const effectiveTotalFactor = rer > 0 ? dailyKcal / rer : baseFactor
  const mealsPerDay = Math.min(4, Math.max(1, input.mealsPerDay || 2))

  return {
    rer: Math.round(rer),
    baseFactor,
    activityAdjustmentPercent,
    totalFactor: Number(effectiveTotalFactor.toFixed(2)),
    dailyKcal,
    dailyGrams,
    foodKcalPerKg,
    foodEnergyValid,
    mealsPerDay,
  }
}

export function getDefaultMeals(mealsCount: number, totalGrams: number) {
  const count = Math.min(4, Math.max(1, mealsCount || 2))
  const defaultLabels: Record<number, string[]> = {
    1: ['Refeição Única'],
    2: ['Café da Manhã', 'Jantar'],
    3: ['Café da Manhã', 'Almoço', 'Jantar'],
    4: ['Café da Manhã', 'Almoço', 'Jantar', 'Ceia'],
  }
  const defaultTimes: Record<number, string[]> = {
    1: ['12:00'],
    2: ['08:00', '19:00'],
    3: ['08:00', '13:00', '19:00'],
    4: ['07:30', '12:00', '17:30', '21:00'],
  }

  const labels = defaultLabels[count] || ['Refeição 1', 'Refeição 2']
  const times = defaultTimes[count] || []
  const basePortion = Math.floor(totalGrams / count)
  const remainder = totalGrams - basePortion * count

  return labels.map((label, idx) => ({
    id: `meal_${idx + 1}`,
    label,
    grams: basePortion + (idx === 0 ? remainder : 0),
    time: times[idx] || '',
  }))
}

export function formatAge(birthDateString?: string): string {
  if (!birthDateString) return 'Idade não informada'
  try {
    const birth = new Date(birthDateString)
    if (isNaN(birth.getTime())) return 'Idade não informada'
    const today = new Date()

    let years = today.getFullYear() - birth.getFullYear()
    let months = today.getMonth() - birth.getMonth()
    if (today.getDate() < birth.getDate()) {
      months--
    }
    if (months < 0) {
      years--
      months += 12
    }

    if (years <= 0 && months <= 0) {
      return 'Menos de 1 mês'
    }
    if (years === 0) {
      return `${months} ${months === 1 ? 'mês' : 'meses'}`
    }
    if (months === 0) {
      return `${years} ${years === 1 ? 'ano' : 'anos'}`
    }
    return `${years}a ${months}m`
  } catch {
    return 'Idade não informada'
  }
}
