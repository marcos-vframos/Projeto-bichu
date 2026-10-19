export type DogSex = 'macho' | 'femea'
export type ActivityLevel = 'baixa' | 'moderada' | 'alta'
export type DogSize = 'mini' | 'pequeno' | 'medio' | 'grande' | 'gigante'
export type PetSpecies = 'canina' | 'felina'
export type BodyCondition = 'abaixo_do_ideal' | 'ideal' | 'acima_do_ideal'
export type FeedingGoal = 'manter' | 'emagrecer' | 'ganhar'

export interface DogRecord {
  id: string
  created: string
  updated: string
  device_key: string
  name: string
  species?: PetSpecies | string
  breed: string
  birth_date: string
  sex: DogSex
  sterilized?: boolean
  weight_kg: number
  activity_level: ActivityLevel
  body_condition: BodyCondition
  size?: DogSize
  is_active?: boolean
  avatar?: string
  gallery?: string[]
  // Informações técnicas / chips / rastreadores
  microchip?: string
  tracker_brand?: string
  tracker_id?: string
  notes?: string
}

export interface MealItem {
  id: string
  label: string
  grams: number
  time?: string
}

export interface FeedingPlanRecord {
  id: string
  created: string
  updated: string
  dog: string
  food?: string
  food_name: string
  kcal_per_kg: number
  meals_per_day: number
  daily_kcal: number
  daily_grams: number
  is_active?: boolean
  device_key?: string
  goal?: FeedingGoal
  meals_json?: MealItem[]
  diet_mode?: 'commercial' | 'natural' | 'mixed'
  diet_details?: { commercialGrams: number; naturalGrams: number; proteinGrams: number | null; fatGrams: number | null; ingredients: unknown[]; professional: string }
}

export interface WeightLogRecord {
  id: string
  created: string
  updated: string
  dog: string
  weight_kg: number
  logged_at: string
  device_key?: string
}

export type FoodTier = 'standard' | 'premium' | 'super_premium' | 'natural'

export interface FoodRecord {
  id: string
  name: string
  brand: string
  kcal_per_kg: number
  protein_pct?: number
  fat_pct?: number
  fiber_pct?: number
  moisture_pct?: number
  life_stage?: 'filhote' | 'adulto' | 'senior' | 'todos'
  tier?: FoodTier
  package_weight_kg?: number
  package_price_brl?: number
  species?: PetSpecies
  category?: 'seca' | 'umida' | 'petisco' | 'biscoito'
  benefits?: string
  ingredient_origin?: string
  quality_control?: string
  source_url?: string
  nutritional_adequacy?: string
  health_indication?: string
  ingredients?: string
}

export type BcsCategory = 'abaixo' | 'ideal' | 'sobrepeso' | 'obesidade'

export type HealthEventType = 'consulta' | 'vacina' | 'medicacao' | 'tratamento'

export interface HealthEventRecord {
  id: string
  created: string
  updated: string
  dog: string
  device_key: string
  type: HealthEventType | 'evento' // tolerante a registros antigos
  title: string
  event_date: string // ISO date or datetime
  notes?: string
  completed?: boolean
  dosage?: string // ex: 2.5ml, 1 comprimido
  frequency?: string // ex: A cada 12 horas, 1x ao dia
  duration?: string // ex: Por 7 dias, uso contínuo
  professional?: string // ex: Dra. Mariana (Clínica Vet)
  location?: string // ex: Hospital Veterinário Central
}

export type RoutineEventCategory =
  | 'passeio'
  | 'aniversario'
  | 'adestramento'
  | 'competicao'
  | 'banho_tosa'
  | 'encontro'
  | 'viagem'
  | 'outro'

export type RoutineEventRepeat = 'nenhuma' | 'diaria' | 'semanal' | 'quinzenal' | 'mensal' | 'anual'

export interface RoutineEventRecord {
  id: string
  created: string
  updated: string
  dog: string
  device_key?: string
  user?: string
  title: string
  category: RoutineEventCategory
  event_date: string // YYYY-MM-DD
  start_time: string // HH:MM
  end_time: string // HH:MM
  location?: string
  notes?: string
  repeat?: RoutineEventRepeat
  completed?: boolean
}

export type UserFoodStatus = 'pendente' | 'validado' | 'rejeitado'

export interface UserFoodRecord {
  id: string
  created: string
  updated: string
  device_key: string
  name: string
  brand: string
  kcal_per_kg: number
  protein_pct?: number
  fat_pct?: number
  fiber_pct?: number
  moisture_pct?: number
  life_stage?: 'filhote' | 'adulto' | 'senior' | 'todos'
  tier?: FoodTier
  package_weight_kg?: number
  package_price_brl?: number
  species?: PetSpecies
  category?: 'seca' | 'umida' | 'petisco' | 'biscoito'
  benefits?: string
  ingredient_origin?: string
  quality_control?: string
  source_url?: string
  nutritional_adequacy?: string
  health_indication?: string
  ingredients?: string
  front_photo?: string
  spec_photo?: string
  status?: UserFoodStatus
  raw_extracted_text?: string
}

export interface BcsEvaluationRecord {
  id: string
  created: string
  updated: string
  dog: string
  device_key: string
  score: number // 1 to 9
  category: BcsCategory
  weight_at_eval_kg?: number
  notes?: string
  evaluated_at: string
  plan_adjusted?: boolean
  previous_goal?: FeedingGoal | string
  new_goal?: FeedingGoal | string
  previous_grams?: number
  new_grams?: number
}

export const POPULAR_BREEDS = [
  { name: 'SRD / Sem Raça Definida (Vira-lata)', defaultSize: 'medio' as DogSize },
  { name: 'Labrador Retriever', defaultSize: 'grande' as DogSize },
  { name: 'Golden Retriever', defaultSize: 'grande' as DogSize },
  { name: 'Bulldog Francês', defaultSize: 'pequeno' as DogSize },
  { name: 'Shih Tzu', defaultSize: 'pequeno' as DogSize },
  { name: 'Poodle', defaultSize: 'pequeno' as DogSize },
  { name: 'Pastor Alemão', defaultSize: 'grande' as DogSize },
  { name: 'Dachshund (Teckel)', defaultSize: 'pequeno' as DogSize },
  { name: 'Chihuahua', defaultSize: 'mini' as DogSize },
  { name: 'Border Collie', defaultSize: 'medio' as DogSize },
  { name: 'Beagle', defaultSize: 'medio' as DogSize },
  { name: 'Spitz Alemão / Lulu da Pomerânia', defaultSize: 'mini' as DogSize },
  { name: 'Yorkshire Terrier', defaultSize: 'mini' as DogSize },
  { name: 'Rottweiler', defaultSize: 'grande' as DogSize },
  { name: 'Pinscher Miniatura', defaultSize: 'mini' as DogSize },
  { name: 'Boxer', defaultSize: 'grande' as DogSize },
  { name: 'Pitbull / American Bully', defaultSize: 'medio' as DogSize },
  { name: 'Maltês', defaultSize: 'mini' as DogSize },
  { name: 'Cocker Spaniel Inglês', defaultSize: 'medio' as DogSize },
  { name: 'Schnauzer Miniatura', defaultSize: 'pequeno' as DogSize },
  { name: 'Outra Raça', defaultSize: 'medio' as DogSize },
]
