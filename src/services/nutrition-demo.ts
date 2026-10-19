import type {
  DogRecord, WeightLogRecord, FeedingPlanRecord, FoodRecord, BcsEvaluationRecord,
  HealthEventRecord, RoutineEventRecord, UserFoodRecord,
} from '@/types/nutrition'

const stamp = new Date().toISOString()
const day = (offset: number) => new Date(Date.now() + offset * 86400000).toISOString()
const pet: DogRecord = {
  id: 'demo-border-collie', created: stamp, updated: stamp, device_key: 'demo',
  name: 'Luna', species: 'canina', breed: 'Border Collie', birth_date: '2021-05-12',
  sex: 'femea', sterilized: true, weight_kg: 18.4, activity_level: 'moderada',
  body_condition: 'ideal', size: 'medio',
}
const foods: FoodRecord[] = [
  { id: 'food-a', name: 'Ração exemplo A', brand: 'Marca fictícia', kcal_per_kg: 3500, protein_pct: 28, fat_pct: 15, fiber_pct: 3, moisture_pct: 10, life_stage: 'adulto', tier: 'premium', package_weight_kg: 10, package_price_brl: 240 },
  { id: 'food-b', name: 'Ração exemplo B', brand: 'Marca fictícia', kcal_per_kg: 3900, protein_pct: 32, fat_pct: 18, fiber_pct: 2.5, moisture_pct: 9, life_stage: 'adulto', tier: 'super_premium', package_weight_kg: 10, package_price_brl: 320 },
]
const weights: WeightLogRecord[] = [-90, -60, -30, 0].map((offset, i) => ({
  id: 'demo-weight-' + i, created: day(offset), updated: day(offset), dog: pet.id,
  weight_kg: [19.2, 18.9, 18.6, 18.4][i], logged_at: day(offset), device_key: 'demo',
}))
const initialPlan: FeedingPlanRecord = {
  id: 'demo-plan', created: stamp, updated: stamp, dog: pet.id, food_name: foods[0].name,
  food: foods[0].id, kcal_per_kg: 3500, meals_per_day: 2, daily_kcal: 680,
  daily_grams: 194, is_active: true, goal: 'manter',
  meals_json: [{ id: 'm1', label: 'Manhã', grams: 97, time: '08:00' }, { id: 'm2', label: 'Noite', grams: 97, time: '19:00' }],
}
type DemoData = {
  dogs: DogRecord[]; weights: WeightLogRecord[]; plans: FeedingPlanRecord[];
  bcs: BcsEvaluationRecord[]; health: HealthEventRecord[]; routine: RoutineEventRecord[];
  userFoods: UserFoodRecord[];
}
const KEY = 'meu-bichu-review-data-v1'
function read(): DemoData {
  try {
    const saved = localStorage.getItem(KEY)
    if (saved) return JSON.parse(saved) as DemoData
  } catch { /* storage can be unavailable */ }
  return { dogs: [pet], weights, plans: [initialPlan], bcs: [], health: [], routine: [], userFoods: [] }
}
function write(data: DemoData) {
  localStorage.setItem(KEY, JSON.stringify(data))
}
const id = () => 'demo-' + crypto.randomUUID()
function record<T extends object>(value: T): T & { id: string; created: string; updated: string } {
  return { ...value, id: id(), created: stamp, updated: new Date().toISOString() }
}
function fromForm(data: FormData | object): Record<string, unknown> {
  return data instanceof FormData ? Object.fromEntries([...data.entries()].filter(([, v]) => typeof v === 'string')) : { ...data }
}
function update<T extends { id: string }>(key: keyof DemoData, itemId: string, change: Partial<T>): T {
  const data = read()
  const list = data[key] as unknown as T[]
  const current = list.find((item) => item.id === itemId)
  if (!current) throw new Error('Registro demonstrativo não encontrado')
  const next = { ...current, ...change }
  write({ ...data, [key]: list.map((item) => item.id === itemId ? next : item) })
  return next
}
function remove(key: keyof DemoData, itemId: string) {
  const data = read()
  write({ ...data, [key]: (data[key] as { id: string }[]).filter((item) => item.id !== itemId) })
  return true
}
export const demoNutritionService = {
  async getDogs() { return read().dogs },
  async getDogById(dogId: string) { return read().dogs.find((dog) => dog.id === dogId) ?? null },
  async createDog(input: (Partial<DogRecord> & { name: string; weight_kg: number }) | FormData) {
    const data = read()
    const fields = fromForm(input)
    const created = record({ ...pet, ...fields, name: String(fields.name), weight_kg: Number(fields.weight_kg), device_key: 'demo', avatar: undefined, gallery: [] }) as DogRecord
    data.dogs.unshift(created)
    data.weights.push(record({ dog: created.id, weight_kg: created.weight_kg, logged_at: stamp, device_key: 'demo' }))
    write(data)
    return created
  },
  async updateDog(dogId: string, input: Partial<DogRecord> | FormData) { return update<DogRecord>('dogs', dogId, fromForm(input) as Partial<DogRecord>) },
  async deleteDog(dogId: string) { return remove('dogs', dogId) },
  async getActivePlan(dogId: string) { return read().plans.find((p) => p.dog === dogId) ?? null },
  async savePlan(dogId: string, input: Partial<FeedingPlanRecord>) {
    const data = read()
    const created = record({ ...initialPlan, ...input, dog: dogId, device_key: 'demo' }) as FeedingPlanRecord
    data.plans = data.plans.filter((p) => p.dog !== dogId)
    data.plans.push(created); write(data); return created
  },
  async getWeightLogs(dogId: string) { return read().weights.filter((w) => w.dog === dogId).sort((a, b) => a.logged_at.localeCompare(b.logged_at)) },
  async addWeightLog(dogId: string, weightKg: number, loggedAt?: string) {
    const data = read()
    const created = record({ dog: dogId, weight_kg: Number(weightKg), logged_at: loggedAt ? new Date(loggedAt).toISOString() : stamp, device_key: 'demo' })
    data.weights.push(created)
    data.dogs = data.dogs.map((dog) => dog.id === dogId ? { ...dog, weight_kg: Number(weightKg) } : dog)
    write(data); return created
  },
  async deleteWeightLog(logId: string) { return remove('weights', logId) },
  async getFoodsCatalog() { return foods },
  async getFoodById(foodId: string) { return foods.find((f) => f.id === foodId) ?? null },
  async getBcsEvaluations(dogId: string) { return read().bcs.filter((b) => b.dog === dogId).sort((a,b) => b.evaluated_at.localeCompare(a.evaluated_at)) },
  async getLatestBcsEvaluation(dogId: string) { return (await this.getBcsEvaluations(dogId))[0] ?? null },
  async createBcsEvaluation(input: Omit<BcsEvaluationRecord, 'id' | 'created' | 'updated' | 'device_key'> & { device_key?: string }) {
    const data = read(); const created = record({ ...input, device_key: 'demo' }) as BcsEvaluationRecord
    data.bcs.unshift(created); write(data); return created
  },
  async deleteBcsEvaluation(evalId: string) { return remove('bcs', evalId) },
  async getHealthEvents(dogId: string) { return read().health.filter((h) => h.dog === dogId) },
  async createHealthEvent(input: Omit<HealthEventRecord, 'id' | 'created' | 'updated' | 'device_key'>) {
    const data = read(); const created = record({ ...input, device_key: 'demo' }) as HealthEventRecord
    data.health.push(created); write(data); return created
  },
  async updateHealthEvent(eventId: string, input: Partial<HealthEventRecord>) { return update<HealthEventRecord>('health', eventId, input) },
  async toggleHealthEventCompleted(eventId: string, completed: boolean) { return update<HealthEventRecord>('health', eventId, { completed }) },
  async deleteHealthEvent(eventId: string) { return remove('health', eventId) },
  async getRoutineEvents(dogId: string) { return read().routine.filter((e) => e.dog === dogId) },
  async createRoutineEvent(input: Omit<RoutineEventRecord, 'id' | 'created' | 'updated'>) {
    const data = read(); const created = record({ ...input, device_key: 'demo' }) as RoutineEventRecord
    data.routine.push(created); write(data); return created
  },
  async updateRoutineEvent(eventId: string, input: Partial<RoutineEventRecord>) { return update<RoutineEventRecord>('routine', eventId, input) },
  async toggleRoutineEventCompleted(eventId: string, completed: boolean) { return update<RoutineEventRecord>('routine', eventId, { completed }) },
  async deleteRoutineEvent(eventId: string) { return remove('routine', eventId) },
  async getUserFoods() { return read().userFoods },
  async createUserFood(input: FormData) {
    const data = read(); const fields = fromForm(input)
    const created = record({ ...fields, name: String(fields.name), brand: String(fields.brand), kcal_per_kg: Number(fields.kcal_per_kg), device_key: 'demo', status: 'pendente' }) as UserFoodRecord
    data.userFoods.unshift(created); write(data); return created
  },
  async deleteUserFood(foodId: string) { return remove('userFoods', foodId) },
}
