import {accountKey,cacheRead,cacheWrite} from '@/lib/offline-cache'
import { logActivity } from '@/lib/telemetry'
import type { DogRecord, FeedingPlanRecord, WeightLogRecord, FoodRecord, UserFoodRecord, BcsEvaluationRecord, HealthEventRecord, RoutineEventRecord } from '@/types/nutrition'

const ROOT = '/api/pilot/records'
type Collection = 'dogs' | 'weight_logs' | 'feeding_plans' | 'bcs_evaluations' | 'health_events' | 'pet_routine_events' | 'user_foods' | 'natural_diets'
async function request<T>(collection: Collection, method = 'GET', id?: string, data?: object | FormData, query?:string, revision?:string): Promise<T> {
  if(method==='PATCH'&&!revision)throw new Error('Reabra o registro para carregar a versão atual antes de editar. Suas alterações ainda não foram enviadas.')
  const owner=accountKey(),requestId=globalThis.crypto?.randomUUID?.()||`${Date.now()}-${Math.random().toString(36).slice(2)}`
  const started = performance.now(), route = `${ROOT}/${collection}${id ? `/${encodeURIComponent(id)}` : ''}${query?`?${query}`:''}`
  let response: Response
  try { response = await fetch(route, {
    method, credentials: 'same-origin', headers: {'x-mb-account-id':owner,...(revision?{'if-match':`"${revision}"`}:{}),...(data && !(data instanceof FormData)?{'content-type':'application/json'}:{})},
    body: data instanceof FormData ? data : data ? JSON.stringify(data) : undefined,
  }) } catch (error) { if(method==='GET'&&accountKey()===owner){const cached=cacheRead<T>(route);if(cached){window.dispatchEvent(new CustomEvent('bichu:offline-read',{detail:cached.savedAt}));return cached.value}} void logActivity('network_error', performance.now()-started, { route, method, requestId }); throw error }
  const durationMs = Math.round(performance.now() - started)
  void logActivity('api_response', durationMs, { route, method, requestId, status: response.status })
  if (!response.ok || durationMs > 1500) void logActivity(response.ok ? 'api_slow' : 'save_error', durationMs, { route, method, requestId, status: response.status })
  if (!response.ok) throw new Error((await response.json().catch(() => ({}))).error || 'Falha ao sincronizar com o banco')
  if(accountKey()!==owner)throw Error('A conta mudou. Recarregue o aplicativo.');const value=await response.json();if(method==='GET')cacheWrite(route,value);return value
}
const list = async <T>(collection: Collection,dog?:string) => {const all:T[]=[];let page:number|null=1;do{const result=await request<{items:T[];nextPage:number|null}>(collection,'GET',undefined,undefined,new URLSearchParams({page:String(page),...(dog?{dog}:{})}).toString());all.push(...result.items);page=result.nextPage}while(page!==null);return all}
const create = <T>(collection: Collection, data: object | FormData) => request<T>(collection, 'POST', undefined, data)
const update = <T>(collection: Collection, id: string, data: object | FormData, revision?:string) => request<T>(collection, 'PATCH', id, data, undefined, revision)
const remove = async (collection: Collection, id: string) => { await request(collection, 'DELETE', id); return true }
const fileUrl = (record: { id: string }, filename?: string) => filename ? `/api/pilot/files/${encodeURIComponent(record.id)}/${encodeURIComponent(filename)}` : undefined

// Catálogo de referência incluído nas migrações do código original; não são dados de tutores.
const catalog: FoodRecord[] = [
  ['Golden Fórmula Cães Adultos', 'Golden', 3600, 'adulto'],
  ['GranPlus Gourmet Adultos Raças Pequenas', 'Guabi', 3650, 'adulto'],
  ['Premier Pet Adulto Raças Médias', 'Premier Pet', 3900, 'adulto'],
  ['Royal Canin Mini Adult', 'Royal Canin', 4063, 'adulto'],
  ['Pedigree Adulto Frango', 'Pedigree', 3700, 'adulto'],
  ['Faro Super Premium Adulto', 'Faro', 3580, 'adulto'],
  ['Golden Special Adultos', 'Golden', 3700, 'adulto'],
  ['Royal Canin Maxi Adult', 'Royal Canin', 3948, 'adulto'],
  ['Pedigree Filhotes', 'Pedigree', 3950, 'filhote'],
  ['GranPlus Gourmet Filhotes', 'Guabi', 3900, 'filhote'],
].map(([name, brand, kcal, stage], i) => ({ id: `catalog-${i + 1}`, name: String(name), brand: String(brand), kcal_per_kg: Number(kcal), life_stage: stage as FoodRecord['life_stage'] }))

type NaturalRecipe = { id?: string; revision?:string; dog: string; ingredients: import('@/lib/diet-math').Ingredient[]; target: number; foodId: string; mixed: boolean; mode: 'commercial'|'natural'|'mixed'; professional: string }
export const pilotNutritionService = {
  async getNaturalDiets(dogId: string) { return (await list<NaturalRecipe>('natural_diets')).filter(r=>r.dog===dogId) },
  async saveNaturalDiet(data: NaturalRecipe) { return data.id ? update<NaturalRecipe>('natural_diets',data.id,data,data.revision) : create<NaturalRecipe>('natural_diets',data) },
  async getDogs() { return list<DogRecord>('dogs') },
  async getDogById(id: string) { try { return await request<DogRecord>('dogs', 'GET', id) } catch { return null } },
  getAvatarUrl(dog: DogRecord | null | undefined) { return dog ? fileUrl(dog, dog.avatar || dog.gallery?.[0]) : undefined },
  getFileUrl(dog: DogRecord | null | undefined, filename: string | undefined) { return dog ? fileUrl(dog, filename) : undefined },
  getAllPetImages(dog: DogRecord | null | undefined) { return dog ? [...new Set([dog.avatar, ...(dog.gallery || [])].filter(Boolean))].map(filename => fileUrl(dog, filename)!).filter(Boolean) : [] },
  async createDog(data: (Partial<DogRecord> & { name: string; weight_kg: number }) | FormData) {
    const dog = await create<DogRecord>('dogs', data)

    return dog
  },
  async updateDog(id: string, data: Partial<DogRecord> | FormData, revision?:string) { const dog = await update<DogRecord>('dogs', id, data, revision); window.dispatchEvent(new CustomEvent('bichu:weight-changed', { detail: id })); return dog },
  async deleteDog(id: string) { return remove('dogs', id) },
  async getActivePlan(dogId: string) { return (await list<FeedingPlanRecord>('feeding_plans')).filter(p => p.dog === dogId && p.is_active).sort((a,b) => b.created.localeCompare(a.created))[0] || null },
  async savePlan(dogId: string, data: Partial<FeedingPlanRecord>) {
    return create<FeedingPlanRecord>('feeding_plans', { ...data, dog: dogId, is_active: true })
  },
  async getWeightLogs(dogId: string) { return (await list<WeightLogRecord>('weight_logs')).filter(x => x.dog === dogId).sort((a,b) => a.logged_at.localeCompare(b.logged_at)) },
  async addWeightLog(dogId: string, weightKg: number, loggedAt?: string) {
    const log = await create<WeightLogRecord>('weight_logs', { dog: dogId, weight_kg: Number(weightKg), logged_at: loggedAt ? new Date(loggedAt.length === 10 ? `${loggedAt}T12:00:00-03:00` : loggedAt).toISOString() : new Date().toISOString() })
    window.dispatchEvent(new CustomEvent('bichu:weight-changed', { detail: dogId }))
    return log
  },
  async deleteWeightLog(id: string) { const ok = await remove('weight_logs', id); window.dispatchEvent(new Event('bichu:weight-changed')); return ok },
  async getFoodsCatalog() { return catalog },
  async getFoodById(id: string) { return catalog.find(food => food.id === id) || null },
  async getBcsEvaluations(dogId: string) { return (await list<BcsEvaluationRecord>('bcs_evaluations')).filter(x => x.dog === dogId).sort((a,b) => b.evaluated_at.localeCompare(a.evaluated_at)) },
  async getLatestBcsEvaluation(dogId: string) { return (await this.getBcsEvaluations(dogId))[0] || null },
  async createBcsEvaluation(data: Omit<BcsEvaluationRecord, 'id' | 'created' | 'updated' | 'device_key'> & { device_key?: string }) { return create<BcsEvaluationRecord>('bcs_evaluations', data) },
  async deleteBcsEvaluation(id: string) { return remove('bcs_evaluations', id) },
  async getHealthEvents(dogId: string) { return (await list<HealthEventRecord>('health_events')).filter(x => x.dog === dogId).sort((a,b) => a.event_date.localeCompare(b.event_date)) },
  async createHealthEvent(data: Omit<HealthEventRecord, 'id' | 'created' | 'updated' | 'device_key'>) { return create<HealthEventRecord>('health_events', data) },
  async updateHealthEvent(id: string, data: Partial<HealthEventRecord>, revision?:string) { return update<HealthEventRecord>('health_events', id, data, revision) },
  async toggleHealthEventCompleted(id: string, completed: boolean, revision?:string) { return update<HealthEventRecord>('health_events', id, { completed }, revision) },
  async deleteHealthEvent(id: string) { return remove('health_events', id) },
  async getRoutineEvents(dogId: string) { return (await list<RoutineEventRecord>('pet_routine_events')).filter(x => x.dog === dogId).sort((a,b) => a.event_date.localeCompare(b.event_date)) },
  async createRoutineEvent(data: Omit<RoutineEventRecord, 'id' | 'created' | 'updated'>) { return create<RoutineEventRecord>('pet_routine_events', data) },
  async updateRoutineEvent(id: string, data: Partial<RoutineEventRecord>, revision?:string) { return update<RoutineEventRecord>('pet_routine_events', id, data, revision) },
  async toggleRoutineEventCompleted(id: string, completed: boolean, revision?:string) { return update<RoutineEventRecord>('pet_routine_events', id, { completed }, revision) },
  async deleteRoutineEvent(id: string) { return remove('pet_routine_events', id) },
  async getUserFoods() { return list<UserFoodRecord>('user_foods') },
  async createUserFood(formData: FormData) { return create<UserFoodRecord>('user_foods', formData) },
  async deleteUserFood(id: string) { return remove('user_foods', id) },
  getUserFoodPhotoUrl(food: UserFoodRecord, field: 'front_photo' | 'spec_photo') { return fileUrl(food, food[field]) },
}
