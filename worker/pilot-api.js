import { preferencesApi } from './preferences.js'
import { backupPage } from './backup.js'
import { summarizeAdoption, ADOPTION_RULE } from './adoption.js'
const COLLECTIONS = new Set(['dogs', 'weight_logs', 'feeding_plans', 'bcs_evaluations', 'health_events', 'pet_routine_events', 'user_foods', 'account_preferences', 'natural_diets', 'pilot_feedback'])
const OWNER_ID = 'd410baf1-83e0-4641-9a41-f44fc8c5025a'
const CHILD_COLLECTIONS = new Set(['weight_logs', 'feeding_plans', 'bcs_evaluations', 'health_events', 'pet_routine_events', 'natural_diets'])
const COOKIE = 'mb_pilot'
const WEEK = 7 * 24 * 60 * 60 * 1000
const OWNER_SESSION_MS = 30 * 24 * 60 * 60 * 1000
const encoder = new TextEncoder()

function answer(data, status = 200, headers = {}) {
  return Response.json(data, { status, headers: { 'cache-control': 'no-store', ...headers } })
}
function fail(message, status = 400) { return answer({ error: message }, status) }
function hex(bytes) { return [...bytes].map(b => b.toString(16).padStart(2, '0')).join('') }
function randomSecret() { return hex(crypto.getRandomValues(new Uint8Array(24))) }
async function digest(value) { return hex(new Uint8Array(await crypto.subtle.digest('SHA-256', encoder.encode(value)))) }
async function hashPassword(password, salt) {
  const key = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits'])
  return hex(new Uint8Array(await crypto.subtle.deriveBits({ name: 'PBKDF2', salt: encoder.encode(salt), iterations: 100000, hash: 'SHA-256' }, key, 256)))
}
async function panelSigningKey(secret) {
  return crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify'])
}
async function panelCookie(secret) {
  const payload = `${Date.now() + OWNER_SESSION_MS}.${randomSecret()}`
  const signature = hex(new Uint8Array(await crypto.subtle.sign('HMAC', await panelSigningKey(secret), encoder.encode(payload))))
  return `${payload}.${signature}`
}
async function validPanelCookie(request, secret) {
  if (!secret) return false
  const match = request.headers.get('cookie')?.match(/(?:^|;\s*)mb_owner=(\d{13})\.([a-f0-9]{48})\.([a-f0-9]{64})(?:;|$)/)
  if (!match || Number(match[1]) <= Date.now() || Number(match[1]) > Date.now() + OWNER_SESSION_MS) return false
  const signature = Uint8Array.from(match[3].match(/.{2}/g), byte => parseInt(byte, 16))
  return crypto.subtle.verify('HMAC', await panelSigningKey(secret), signature, encoder.encode(`${match[1]}.${match[2]}`))
}
function safeOrigin(request) {
  if (['GET', 'HEAD'].includes(request.method)) return true
  return request.headers.get('origin') === new URL(request.url).origin
}
function getCookie(request) {
  const match = request.headers.get('cookie')?.match(/(?:^|;\s*)mb_pilot=([a-f0-9]{48})\b/)
  return match?.[1] || null
}
async function currentAccount(request, db) {
  const token = getCookie(request)
  if (!token) return null
  const row = await db.prepare(`SELECT a.id, a.email, MIN(a.expires_at,s.expires_at) AS expires_at
    FROM pilot_sessions s JOIN pilot_accounts a ON a.id = s.account_id
    WHERE s.token_hash = ? AND s.expires_at > ? AND a.expires_at > ?`).bind(await digest(token), Date.now(), Date.now()).first()
  return row || null
}
async function ownedDog(db, accountId, dogId) {
  return db.prepare('SELECT id FROM pilot_records WHERE id = ? AND account_id = ? AND collection = ?')
    .bind(dogId, accountId, 'dogs').first()
}
function rowToRecord(row) { return { ...JSON.parse(row.data), id: row.id, created: row.created_at, updated: row.updated_at } }
function legalPayload(data) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('Dados inválidos')
  const result = { ...data }
  delete result.id; delete result.created; delete result.updated; delete result.user; delete result.device_key
  if (JSON.stringify(result).length > 100000) throw new Error('Registro grande demais')
  return result
}
async function storeFiles(form, env, account, collection, recordId) {
  const data = {}
  const files = []
  for (const [key, value] of form.entries()) {
    if (typeof value === 'string') {
      if (key === 'gallery') { data.gallery = [...(data.gallery || []), value]; continue }
      data[key] = ['weight_kg', 'kcal_per_kg', 'protein_pct', 'fat_pct', 'fiber_pct', 'moisture_pct', 'package_weight_kg', 'package_price_brl'].includes(key)
        ? Number(value) : ['sterilized', 'is_active', 'completed'].includes(key) ? value === 'true' : value
      continue
    }
    if (!['avatar', 'gallery', 'front_photo', 'spec_photo'].includes(key) ||
        !['image/jpeg', 'image/png', 'image/webp'].includes(value.type) || value.size > 5 * 1024 * 1024) {
      throw new Error('Imagem inválida ou maior que 5 MB')
    }
    const ext = value.type.split('/')[1] === 'jpeg' ? 'jpg' : value.type.split('/')[1]
    const filename = `${crypto.randomUUID()}.${ext}`
    const objectKey = `${account.id}/${recordId}/${filename}`
    await env.BUCKET.put(objectKey, value.stream(), { httpMetadata: { contentType: value.type } })
    files.push({ id: crypto.randomUUID(), filename, objectKey, contentType: value.type, size: value.size })
    if (key === 'gallery') data.gallery = [...(data.gallery || []), filename]
    else data[key] = filename
  }
  return { data, files }
}
async function eraseAccount(env,account){
    const files=(await env.DB.prepare('SELECT object_key FROM pilot_files WHERE account_id = ?').bind(account.id).all()).results
    for(const f of files)await env.BUCKET.delete(f.object_key)
    await env.DB.batch([
      env.DB.prepare('DELETE FROM pilot_records WHERE account_id = ?').bind(account.id),
      // Delete audit AFTER record triggers; no personal snapshots survive account erasure.
      env.DB.prepare('DELETE FROM pilot_changes WHERE account_id = ?').bind(account.id),
      env.DB.prepare('DELETE FROM pilot_files WHERE account_id = ?').bind(account.id),
      env.DB.prepare('DELETE FROM pilot_events WHERE account_id = ?').bind(account.id),
      env.DB.prepare('DELETE FROM pilot_devices WHERE account_id = ?').bind(account.id),
      env.DB.prepare('DELETE FROM pilot_sessions WHERE account_id = ?').bind(account.id),
      env.DB.prepare('DELETE FROM access_tokens WHERE subject = ?').bind(account.email),
      env.DB.prepare('DELETE FROM pilot_accounts WHERE id = ?').bind(account.id),
      env.DB.prepare('DELETE FROM pilot_login_attempts WHERE email = ?').bind(account.email)
    ])
    return answer({deleted:true,id:account.id},200,{'set-cookie':'mb_pilot=; HttpOnly; Secure; SameSite=Strict; Path=/api/pilot; Max-Age=0'})
}
async function recordApi(request, env, account, path) {
  const collection = path[0]
  const id = path[1]
  if (!COLLECTIONS.has(collection) || path.length > 2) return fail('Coleção desconhecida', 404)
  const db = env.DB
  if (request.method === 'GET') {
    if (id) {
      const row = await db.prepare('SELECT * FROM pilot_records WHERE id = ? AND account_id = ? AND collection = ?')
        .bind(id, account.id, collection).first()
      return row ? answer(rowToRecord(row)) : fail('Registro não encontrado', 404)
    }
    const url=new URL(request.url),page=Number(url.searchParams.get('page')||0),dog=url.searchParams.get('dog')
    if(!Number.isSafeInteger(page)||page<0||page>100000)return fail('Página inválida')
    const values=[account.id,collection],where=dog?' AND dog_id = ?':''
    if(dog)values.push(dog)
    const size=page?200:1000
    const result=await db.prepare(`SELECT * FROM pilot_records WHERE account_id = ? AND collection = ?${where} ORDER BY created_at DESC,id DESC LIMIT ? OFFSET ?`).bind(...values,size+1,page?(page-1)*size:0).all()
    const items=result.results.slice(0,size).map(rowToRecord)
    return page?answer({items,nextPage:result.results.length>size?page+1:null}):answer(items)

  }
  if(collection==='account_preferences')return fail('Use a sincronização de personalizações.',403)
  if (collection === 'bcs_evaluations') return fail('Novas avaliações BCS estão inativas nesta versão', 409)
  if (!['POST', 'PATCH', 'DELETE'].includes(request.method)) return fail('Método não permitido', 405)
  if (collection === 'pilot_feedback' && request.method === 'PATCH') return fail('Feedbacks enviados não podem ser alterados pelo tutor', 403)
  if (request.method !== 'POST' && !id) return fail('ID obrigatório')
  const prior = id ? await db.prepare('SELECT * FROM pilot_records WHERE id = ? AND account_id = ? AND collection = ?')
    .bind(id, account.id, collection).first() : null
  if (id && !prior) return fail('Registro não encontrado', 404)
  if (request.method === 'DELETE') {
    const related = collection === 'dogs'
      ? await db.prepare('SELECT id FROM pilot_records WHERE account_id = ? AND dog_id = ?').bind(account.id, id).all()
      : { results: [] }
    const ids = [id, ...related.results.map(item => item.id)]
    for (const recordId of ids) {
      const files = await db.prepare('SELECT object_key FROM pilot_files WHERE account_id = ? AND record_id = ?')
        .bind(account.id, recordId).all()
      await db.batch([
        db.prepare('DELETE FROM pilot_files WHERE account_id = ? AND record_id = ?').bind(account.id, recordId),
        db.prepare('DELETE FROM pilot_records WHERE account_id = ? AND id = ?').bind(account.id, recordId),
      ])
      for (const file of files.results) await env.BUCKET.delete(file.object_key)
    }
    if (collection === 'weight_logs') {
      const latest = await db.prepare("SELECT data FROM pilot_records WHERE account_id = ? AND dog_id = ? AND collection = 'weight_logs' ORDER BY json_extract(data, '$.logged_at') DESC, created_at DESC LIMIT 1").bind(account.id, prior.dog_id).first()
      const dog = await db.prepare("SELECT data FROM pilot_records WHERE account_id = ? AND id = ? AND collection = 'dogs'").bind(account.id, prior.dog_id).first()
      if (latest && dog) await db.prepare('UPDATE pilot_records SET data = ?, updated_at = ? WHERE account_id = ? AND id = ?').bind(JSON.stringify({...JSON.parse(dog.data),weight_kg:Number(JSON.parse(latest.data).weight_kg)}),new Date().toISOString(),account.id,prior.dog_id).run()
    }
    return answer({ deleted: true })
  }
  const recordId = id || crypto.randomUUID()
  let values, files = []
  if (request.headers.get('content-type')?.includes('multipart/form-data')) {
    const stored = await storeFiles(await request.formData(), env, account, collection, recordId)
    values = stored.data; files = stored.files
  } else values = await request.json()
  const previous = prior ? JSON.parse(prior.data) : {}
  const data = collection === 'pilot_feedback' ? legalPayload({category:values.category,message:values.message,status:'recebido',replies:[]}) : legalPayload({ ...previous, ...values })
  if (collection === 'dogs' && request.headers.get('content-type')?.includes('multipart/form-data')) {
    data.gallery = values.gallery || []
  }
  if (collection === 'pilot_feedback' && (typeof data.message !== 'string' || !data.message.trim() || data.message.length > 2000 || !['utilidade','dificuldade','sugestao'].includes(data.category))) return fail('Feedback inválido')
  if (collection === 'dogs' && data.species && !['canina', 'felina'].includes(data.species)) return fail('Espécie inválida')
  const dogId = CHILD_COLLECTIONS.has(collection) ? data.dog : null
  if (CHILD_COLLECTIONS.has(collection) && (!dogId || !(await ownedDog(db, account.id, dogId)))) {
    for (const file of files) await env.BUCKET.delete(file.objectKey)
    return fail('Pet não encontrado nesta conta', 403)
  }
  if(prior && CHILD_COLLECTIONS.has(collection) && prior.dog_id!==dogId)return fail('Registro não pode ser transferido para outro pet.',409)
  const now = new Date().toISOString()
  if (collection === 'weight_logs' && Number.isFinite(Date.parse(data.logged_at))) data.logged_at = new Date(data.logged_at).toISOString()
  if (['dogs', 'weight_logs'].includes(collection) && (!Number.isFinite(Number(data.weight_kg)) || Number(data.weight_kg) <= 0 || Number(data.weight_kg) > 200)) return fail('Peso inválido')
  if (collection === 'weight_logs' && (!data.logged_at || !Number.isFinite(Date.parse(data.logged_at)))) return fail('Data inválida')
  try {
    const statements=[]
    if(collection==='feeding_plans' && data.is_active)statements.push(db.prepare("UPDATE pilot_records SET data=json_set(data,'$.is_active',json('false')),updated_at=? WHERE account_id=? AND dog_id=? AND collection='feeding_plans' AND id!=? AND json_extract(data,'$.is_active')=1").bind(now,account.id,dogId,recordId))
    if (prior) statements.push(db.prepare('UPDATE pilot_records SET data = ?, dog_id = ?, updated_at = ? WHERE id = ? AND account_id = ?')
      .bind(JSON.stringify(data), dogId, now, recordId, account.id))
    else statements.push(db.prepare('INSERT INTO pilot_records (id, account_id, collection, dog_id, data, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .bind(recordId, account.id, collection, dogId, JSON.stringify(data), now, now))
    if (collection === 'dogs' && (!prior || Number(previous.weight_kg) !== Number(data.weight_kg))) {
      const log = { dog: recordId, weight_kg: Number(data.weight_kg), logged_at: now, source: prior ? 'cadastro_alterado' : 'cadastro_inicial' }
      statements.push(db.prepare('INSERT INTO pilot_records (id, account_id, collection, dog_id, data, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)').bind(crypto.randomUUID(), account.id, 'weight_logs', recordId, JSON.stringify(log), now, now))
    }
    if(collection==='weight_logs')statements.push(db.prepare("UPDATE pilot_records SET data=json_set(data,'$.weight_kg',(SELECT CAST(json_extract(data,'$.weight_kg') AS REAL) FROM pilot_records WHERE account_id=? AND dog_id=? AND collection='weight_logs' ORDER BY json_extract(data,'$.logged_at') DESC,created_at DESC,id DESC LIMIT 1)),updated_at=? WHERE account_id=? AND id=? AND collection='dogs'").bind(account.id,dogId,now,account.id,dogId))
    for (const file of files) statements.push(db.prepare('INSERT INTO pilot_files (id, account_id, record_id, collection, filename, object_key, content_type, size) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
      .bind(file.id, account.id, recordId, collection, file.filename, file.objectKey, file.contentType, file.size))
    await db.batch(statements)
    if (prior && collection === 'dogs') {
      const retained = new Set([data.avatar, ...(data.gallery || [])])
      const oldFiles = await db.prepare('SELECT id, filename, object_key FROM pilot_files WHERE account_id = ? AND record_id = ?')
        .bind(account.id, recordId).all()
      for (const old of oldFiles.results) {
        if (retained.has(old.filename)) continue
        await db.prepare('DELETE FROM pilot_files WHERE id = ? AND account_id = ?').bind(old.id, account.id).run()
        await env.BUCKET.delete(old.object_key)
      }
    }
  } catch (error) {
    for (const file of files) await env.BUCKET.delete(file.objectKey)
    throw error
  }
  return answer({ ...data, id: recordId, created: prior?.created_at || now, updated: now }, prior ? 200 : 201)
}

async function provision(db, supplied) {
  const existing = await db.prepare('SELECT COUNT(*) AS n FROM pilot_accounts').first()
  if (existing.n !== 0) return fail('Contas já provisionadas; nenhuma senha foi alterada.', 409)
  if (!Array.isArray(supplied) || supplied.length !== 10 || supplied.some((a, i) =>
    a?.email !== `piloto${String(i + 1).padStart(2, '0')}@meubichu.test` ||
    typeof a.password !== 'string' || !/^[a-f0-9]{48}$/.test(a.password))) return fail('Dez credenciais válidas são obrigatórias')
  const accounts = await Promise.all(supplied.map(async ({ email, password }) => {
    const salt = randomSecret()
    return { id: crypto.randomUUID(), email, password, salt, hash: await hashPassword(password, salt) }
  }))
  await db.batch(accounts.map(a => db.prepare('INSERT INTO pilot_accounts (id, email, password_salt, password_hash, created_at) VALUES (?, ?, ?, ?, ?)')
    .bind(a.id, a.email, a.salt, a.hash, Date.now())))
  return answer({ provisioned: accounts.length }, 201)
}

async function ownerDashboard(db) {
  const [accountRows, recordRows, eventRows, counts, deviceRows] = await Promise.all([
    db.prepare('SELECT id, email, first_access_at, expires_at, created_at FROM pilot_accounts ORDER BY email').all(),
    db.prepare("SELECT id, account_id, collection, dog_id, data, created_at, updated_at FROM pilot_records WHERE collection IN ('dogs', 'weight_logs', 'bcs_evaluations') ORDER BY created_at DESC LIMIT 5001").all(),
    db.prepare('SELECT account_id, device_id, details, event, duration_ms, created_at FROM pilot_events ORDER BY created_at DESC LIMIT 10001').all(),
    db.prepare('SELECT account_id, COUNT(*) AS total FROM pilot_records GROUP BY account_id').all(),
    db.prepare('SELECT * FROM pilot_devices ORDER BY last_seen DESC LIMIT 101').all(),
  ])
  const truncated = recordRows.results.length > 5000 || eventRows.results.length > 10000 || deviceRows.results.length > 100
  const records = recordRows.results.slice(0, 5000)
  const events = eventRows.results.slice(0, 10000)
  const totalByAccount = new Map(counts.results.map(row => [row.account_id, row.total]))
  const pets = records.filter(row => row.collection === 'dogs').map(row => {
    const data = JSON.parse(row.data)
    return { id: row.id, accountId: row.account_id, name: data.name || 'Pet sem nome', weightKg: Number(data.weight_kg) || null,
      createdAt: row.created_at, updatedAt: row.updated_at }
  })
  const weights = records.filter(row => row.collection === 'weight_logs').map(row => {
    const data = JSON.parse(row.data)
    return { accountId: row.account_id, dogId: row.dog_id, weightKg: Number(data.weight_kg) || null,
      loggedAt: data.logged_at || row.created_at }
  }).filter(row => row.weightKg !== null)
  const bcs = records.filter(row => row.collection === 'bcs_evaluations').map(row => {
    const data = JSON.parse(row.data)
    return { accountId: row.account_id, dogId: row.dog_id, score: Number(data.score), evaluatedAt: data.evaluated_at || row.created_at }
  }).filter(row => Number.isInteger(row.score) && row.score >= 1 && row.score <= 9)
  const accounts = await Promise.all(accountRows.results.map(async row => {
    const ownEvents = events.filter(event => event.account_id === row.id)
    const totals=await db.prepare("SELECT COUNT(CASE WHEN event='page_load' THEN 1 END) AS pages,COUNT(CASE WHEN event IN ('save_error','network_error','client_error') THEN 1 END) AS errors,COUNT(CASE WHEN event='api_slow' THEN 1 END) AS slow,MAX(created_at) AS last FROM pilot_events WHERE account_id=?").bind(row.id).first()
    const petCount=await db.prepare("SELECT COUNT(*) AS n FROM pilot_records WHERE account_id=? AND collection='dogs'").bind(row.id).first()
    const timings = ownEvents.filter(event => event.event === 'api_response').map(event => event.duration_ms).sort((a, b) => a - b)
    const activity = [row.first_access_at, ...ownEvents.map(event => event.created_at),
      ...records.filter(record => record.account_id === row.id).map(record => Date.parse(record.updated_at))]
      .filter(Number.isFinite)
    return { id: row.id, email: row.email, firstAccessAt: row.first_access_at, expiresAt: row.expires_at,
      lastActivityAt: activity.length ? Math.max(...activity) : null, petCount: petCount.n,
      recordCount: totalByAccount.get(row.id) || 0, pageLoads: totals.pages,
      errors: totals.errors,
      slowRequests: totals.slow,
      measuredRequests: timings.length,
      avgMs: timings.length ? Math.round(timings.reduce((sum, ms) => sum + ms, 0) / timings.length) : null,
      p95Ms: timings.length ? timings[Math.ceil(timings.length * .95) - 1] : null }
  }))
  return answer({ generatedAt: Date.now(), accounts, pets, weights, bcs, truncated,
    devices: deviceRows.results.slice(0,100).map(d => ({ id: d.device_id, accountId: d.account_id, activeMs: d.active_ms, lastSeen: d.last_seen, ...JSON.parse(d.data) })),
    events: events.map(e => ({ accountId: e.account_id, deviceId: e.device_id, event: e.event, durationMs: e.duration_ms, createdAt: e.created_at, details: e.details ? JSON.parse(e.details) : {} })),
    coverage: 'Tempos calculados sobre até 10 mil eventos recentes; métricas dependem da autorização do participante. Ausência de uso não informa o motivo da interrupção.' })
}

// O servidor define o dia; relógio e fuso do aparelho não mudam a confirmação.
export function pilotDay(now = Date.now()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(now))
}
async function dailyMeals(request, env, account, url) {
  const db = env.DB
  const day = pilotDay()
  if (request.method === 'GET') {
    const dog = url.searchParams.get('dog')
    if (!dog || !await ownedDog(db, account.id, dog)) return fail('Pet não encontrado nesta conta', 403)
    const rows = await db.prepare("SELECT * FROM pilot_records WHERE account_id = ? AND dog_id = ? AND collection = 'meal_confirmations' AND json_extract(data, '$.day') = ? ORDER BY updated_at DESC").bind(account.id, dog, day).all()
    return answer({ day, confirmations: rows.results.map(rowToRecord) })
  }
  if (request.method !== 'POST') return fail('Método não permitido', 405)
  const { dog, meal, slot, completed, day: suppliedDay } = await request.json()
  if (suppliedDay !== day) return fail('O dia mudou. Atualize a lista antes de confirmar.', 409)
  if (!dog || !await ownedDog(db, account.id, dog)) return fail('Pet não encontrado nesta conta', 403)
  if (!Number.isInteger(slot) || slot < 0 || slot > 3 || typeof completed !== 'boolean' ||
      typeof meal?.label !== 'string' || !meal.label.trim() || meal.label.length > 100 ||
      typeof meal.time !== 'string' || !/^([01]\d|2[0-3]):[0-5]\d$/.test(meal.time) ||
      !Number.isFinite(meal.grams) || meal.grams <= 0 || meal.grams > 10000) return fail('Refeição inválida')
  const snapshot = { label: meal.label.trim(), time: meal.time, grams: meal.grams }
  const id = await digest(JSON.stringify([account.id, dog, day, slot, snapshot]))
  const now = new Date().toISOString()
  const data = { dog, day, slot, meal: snapshot, completed, confirmed_at: completed ? now : null }
  await db.prepare("INSERT INTO pilot_records (id, account_id, collection, dog_id, data, created_at, updated_at) VALUES (?, ?, 'meal_confirmations', ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at WHERE pilot_records.data != excluded.data")
    .bind(id, account.id, dog, JSON.stringify(data), now, now).run()
  return answer({ ...data, id, updated: now })
}

// Dias em Brasília. Apenas abertura/navegação: requisições de fundo não contam.
function participantDays(db, account) {
  return db.prepare(`SELECT day, COUNT(*) AS openings, MAX(at) AS lastAt FROM (
    SELECT date(created_at / 1000, 'unixepoch', '-3 hours') AS day, created_at AS at
    FROM pilot_events WHERE account_id = ? AND event IN ('page_load','navigation')
    UNION ALL SELECT date(first_access_at / 1000, 'unixepoch', '-3 hours'), first_access_at
    FROM pilot_accounts WHERE id = ? AND first_access_at IS NOT NULL
  ) GROUP BY day ORDER BY day DESC`).bind(account, account)
}
// Stored changes, excluding preferences, setup, telemetry and unchanged writes.
const USEFUL_CHANGE = `actor_type != 'owner' AND action IN ('create','update') AND after_data IS NOT NULL
  AND (before_data IS NULL OR before_data != after_data) AND (
    collection IN ('health_events','pet_routine_events','bcs_evaluations','natural_diets')
    OR (collection = 'feeding_plans' AND json_extract(after_data, '$.is_active') = 1)
    OR (collection = 'weight_logs' AND COALESCE(json_extract(after_data, '$.source'), '') != 'cadastro_inicial')
    OR (collection = 'meal_confirmations' AND json_extract(after_data, '$.completed') = 1
        AND COALESCE(json_extract(before_data, '$.completed'), 0) != 1)
  )`
async function adoptionTimeline(db, account, now) {
  if (!account.first_access_at) return []
  const result = await db.prepare(`SELECT CAST((changed_at - ?) / 86400000 AS INTEGER) + 1 AS period,
    COUNT(*) AS actions, MAX(changed_at) AS lastAt FROM pilot_changes
    WHERE account_id = ? AND changed_at >= ? AND changed_at < ? AND changed_at <= ?
    AND ${USEFUL_CHANGE} GROUP BY period ORDER BY period`)
    .bind(account.first_access_at, account.id, account.first_access_at, account.first_access_at + WEEK, now).all()
  return result.results
}
const participantCollections = { meals:'meal_confirmations', weight:'weight_logs', health:'health_events', feedback:'pilot_feedback' }
function participantFilter(metric) {
  if (metric === 'meals') return " AND json_extract(data, '$.completed') = 1"
  if (metric === 'health') return " AND COALESCE(json_extract(data, '$.completed'), 0) != 1 AND substr(json_extract(data, '$.event_date'), 1, 10) >= ?"
  return ''
}
async function ownerParticipants(db, url) {
  const account = url.searchParams.get('account'), metric = url.searchParams.get('metric')
  if (!metric) {
    const now = Date.now()
    const accounts = (await db.prepare('SELECT id, email, first_access_at FROM pilot_accounts ORDER BY email').all()).results
    const items = await Promise.all(accounts.map(async a => {
      const [days, meals, weight, health, errors, feedback, timeline] = await Promise.all([
        participantDays(db,a.id).all(),
        db.prepare("SELECT COUNT(*) AS n FROM pilot_records WHERE account_id = ? AND collection = 'meal_confirmations' AND json_extract(data, '$.completed') = 1").bind(a.id).first(),
        db.prepare("SELECT data FROM pilot_records WHERE account_id = ? AND collection = 'weight_logs' ORDER BY json_extract(data, '$.logged_at') DESC, id DESC LIMIT 1").bind(a.id).first(),
        db.prepare("SELECT data FROM pilot_records WHERE account_id = ? AND collection = 'health_events'" + participantFilter('health') + " ORDER BY json_extract(data, '$.event_date') ASC, id ASC LIMIT 1").bind(a.id,pilotDay()).first(),
        db.prepare("SELECT COUNT(*) AS n FROM pilot_events WHERE account_id = ? AND event IN ('save_error','network_error','client_error')").bind(a.id).first(),
        db.prepare("SELECT COUNT(*) AS n FROM pilot_records WHERE account_id = ? AND collection = 'pilot_feedback'").bind(a.id).first(),
        adoptionTimeline(db,a,now)
      ])
      return {...a, adoption:summarizeAdoption(a.first_access_at,timeline,now), days:days.results.length, meals:meals.n, weight:weight ? JSON.parse(weight.data) : null, health:health ? JSON.parse(health.data) : null, errors:errors.n, feedback:feedback.n}
    }))
    return answer({items,generatedAt:now,adoptionRule:ADOPTION_RULE})
  }
  if (!account || !['days','errors','adoption',...Object.keys(participantCollections)].includes(metric)) return fail('Indicador inválido')
  const offset = Number(url.searchParams.get('offset') || 0)
  if (!Number.isSafeInteger(offset) || offset < 0) return fail('Página inválida')
  if (metric === 'adoption') {
    const a = await db.prepare('SELECT id, first_access_at FROM pilot_accounts WHERE id = ?').bind(account).first()
    if (!a?.first_access_at) return answer({items:[],nextOffset:null})
    const now = Date.now()
    const result = await db.prepare(`SELECT id, record_id, collection, dog_id, action, changed_at,
      CAST((changed_at - ?) / 86400000 AS INTEGER) + 1 AS period, after_data FROM pilot_changes
      WHERE account_id = ? AND changed_at >= ? AND changed_at < ? AND changed_at <= ? AND ${USEFUL_CHANGE}
      ORDER BY changed_at DESC, id DESC LIMIT 101 OFFSET ?`)
      .bind(a.first_access_at,a.id,a.first_access_at,a.first_access_at+WEEK,now,offset).all()
    return answer({items:result.results.slice(0,100).map(r=>({...r,data:JSON.parse(r.after_data),after_data:undefined})),nextOffset:result.results.length>100?offset+100:null})
  }
  if (metric === 'days') {
    const rows = (await participantDays(db,account).all()).results
    return answer({items:rows.slice(offset,offset+100),nextOffset:rows.length>offset+100?offset+100:null})
  }
  if (metric === 'errors') {
    const result = await db.prepare("SELECT id, device_id, event, duration_ms, created_at, details FROM pilot_events WHERE account_id = ? AND event IN ('save_error','network_error','client_error') ORDER BY created_at DESC, id DESC LIMIT 101 OFFSET ?").bind(account,offset).all()
    return answer({items:result.results.slice(0,100).map(r=>({...r,details:r.details?JSON.parse(r.details):{}})),nextOffset:result.results.length>100?offset+100:null})
  }
  const values = [account,participantCollections[metric]]
  if (metric === 'health') values.push(pilotDay())
  const order = metric === 'weight' ? "json_extract(data, '$.logged_at') DESC" : metric === 'health' ? "json_extract(data, '$.event_date') ASC" : 'updated_at DESC'
  const result = await db.prepare(`SELECT * FROM pilot_records WHERE account_id = ? AND collection = ?${participantFilter(metric)} ORDER BY ${order}, id DESC LIMIT 101 OFFSET ?`).bind(...values,offset).all()
  return answer({items:result.results.slice(0,100).map(r=>({...r,data:JSON.parse(r.data)})),nextOffset:result.results.length>100?offset+100:null})
}

async function ownerRecords(db, url, history) {
  const where = [], values = []
  const account = url.searchParams.get('account'), dog = url.searchParams.get('dog'), collection = url.searchParams.get('collection')
  if (account) { where.push('account_id = ?'); values.push(account) }
  if (dog) { where.push(history ? 'dog_id = ?' : "(dog_id = ? OR (collection = 'dogs' AND id = ?))"); values.push(dog); if (!history) values.push(dog) }
  if (collection) {
    if (!COLLECTIONS.has(collection) && collection !== 'meal_confirmations') return fail('Coleção desconhecida')
    where.push('collection = ?'); values.push(collection)
  }
  const accounts = url.searchParams.getAll('accounts').slice(0,10)
  if (accounts.length) { where.push(`account_id IN (${accounts.map(() => '?').join(',')})`); values.push(...accounts) }
  const scope = url.searchParams.get('scope')
  if (scope === 'pets') where.push("(dog_id IS NOT NULL OR collection = 'dogs')")
  if (scope === 'accounts') where.push("(dog_id IS NULL AND collection != 'dogs')")
  const offset = Number(url.searchParams.get('offset') || 0)
  if (!Number.isSafeInteger(offset) || offset < 0) return fail('Página inválida')
  const table = history ? 'pilot_changes' : 'pilot_records'
  const rows = await db.prepare(`SELECT * FROM ${table}${where.length ? ' WHERE ' + where.join(' AND ') : ''} ORDER BY ${history ? 'changed_at' : 'updated_at'} DESC, id DESC LIMIT 101 OFFSET ?`).bind(...values, offset).all()
  const items = rows.results.slice(0, 100).map(row => history ? { ...row, before: row.before_data ? JSON.parse(row.before_data) : null, after: row.after_data ? JSON.parse(row.after_data) : null, before_data: undefined, after_data: undefined } : { ...row, data: JSON.parse(row.data) })
  return answer({ items, nextOffset: rows.results.length > 100 ? offset + 100 : null })
}

async function ownerActivity(db, url) {
  const where=[],values=[],accounts=url.searchParams.getAll('accounts').slice(0,10),device=url.searchParams.get('device'),mode=url.searchParams.get('mode')
  if(accounts.length){where.push(`account_id IN (${accounts.map(()=>'?').join(',')})`);values.push(...accounts)}
  if(device){where.push('device_id = ?');values.push(device.slice(0,80))}
  if(mode==='errors')where.push("event IN ('save_error','network_error','client_error')")
  if(mode==='timings')where.push("event IN ('api_response','api_slow')")
  const offset=Number(url.searchParams.get('offset')||0)
  if(!Number.isSafeInteger(offset)||offset<0)return fail('Página inválida')
  const result=await db.prepare(`SELECT * FROM pilot_events ${where.length?'WHERE '+where.join(' AND '):''} ORDER BY created_at DESC,id DESC LIMIT 101 OFFSET ?`).bind(...values,offset).all()
  return answer({items:result.results.slice(0,100).map(e=>({accountId:e.account_id,deviceId:e.device_id,event:e.event,durationMs:e.duration_ms,createdAt:e.created_at,details:e.details?JSON.parse(e.details):{}})),nextOffset:result.results.length>100?offset+100:null})
}

async function validFeedbackTicket(request, env) {
  if (!env.PILOT_BRIDGE_KEY || request.headers.get('origin') !== env.PILOT_PANEL_ORIGIN || request.method !== 'POST' || !/^\/api\/pilot\/owner\/feedback\/[a-f0-9-]{36}\/reply$/.test(new URL(request.url).pathname)) return false
  const ticket=request.headers.get('x-mb-owner-ticket')||''
  if(!/^[a-f0-9]{1,2000}\.[a-f0-9]{64}$/.test(ticket))return false
  try{const [p,s]=ticket.split('.'),bytes=h=>Uint8Array.from(h.match(/.{2}/g),v=>parseInt(v,16)),payload=bytes(p),data=JSON.parse(new TextDecoder().decode(payload));
    if(data.aud!=='owner-feedback-reply'||data.path!==new URL(request.url).pathname||data.hash!==await digest(await request.clone().text())||!Number.isSafeInteger(data.exp)||data.exp<=Date.now()||data.exp>Date.now()+120000)return false
    return crypto.subtle.verify('HMAC',await panelSigningKey(env.PILOT_BRIDGE_KEY),bytes(s),payload)
  }catch{return false}
}
async function replyFeedback(request, db, id) {
  const body=await request.json()
  if(typeof body.message!=='string'||body.message.length>2000||!['em_avaliacao','respondido','resolvido'].includes(body.status)||typeof body.replyId!=='string'||!/^[a-f0-9-]{36}$/.test(body.replyId)||body.status==='respondido'&&!body.message.trim())return fail('Resposta inválida')
  const row=await db.prepare("SELECT data FROM pilot_records WHERE id = ? AND collection = 'pilot_feedback'").bind(id).first()
  if(!row)return fail('Feedback não encontrado',404)
  const data=JSON.parse(row.data),replies=Array.isArray(data.replies)?data.replies:[]
  if(replies.some(r=>r.id===body.replyId))return answer({ok:true})
  if(replies.length>=30)return fail('Limite de respostas desta conversa atingido')
  const now=new Date().toISOString()
  if(body.message.trim())replies.push({id:body.replyId,message:body.message.trim(),createdAt:now})
  data.replies=replies;data.status=body.status
  // Compare-and-swap preserves replies from concurrent owner tabs.
  const updated=await db.prepare("UPDATE pilot_records SET data = ?, updated_at = ? WHERE id = ? AND collection = 'pilot_feedback' AND data = ?").bind(JSON.stringify(data),now,id,row.data).run()
  if((updated.meta?.changes??updated.changes)===0)return fail('Este feedback mudou. Atualize e tente novamente.',409)
  return answer({ok:true})
}
async function validReadTicket(request, env) {
  if (!env.PILOT_BRIDGE_KEY || request.headers.get('origin') !== env.PILOT_PANEL_ORIGIN || request.method !== 'GET') return false
  const ticket = request.headers.get('x-mb-owner-ticket') || ''
  if (!/^[a-f0-9]{1,1000}\.[a-f0-9]{64}$/.test(ticket)) return false
  const [payloadHex, signatureHex] = ticket.split('.')
  if (payloadHex.length % 2) return false
  try {
    const bytes = hex => Uint8Array.from(hex.match(/.{2}/g), byte => parseInt(byte,16))
    const payload = bytes(payloadHex)
    const data = JSON.parse(new TextDecoder().decode(payload))
    if (data.aud !== 'owner-read' || !Number.isSafeInteger(data.exp) || data.exp <= Date.now() || data.exp > Date.now() + 120000) return false
    return crypto.subtle.verify('HMAC', await panelSigningKey(env.PILOT_BRIDGE_KEY), bytes(signatureHex), payload)
  } catch { return false }
}
function ownerCors(response, request, env) {
  if (request.headers.get('origin') !== env.PILOT_PANEL_ORIGIN) return response
  const headers = new Headers(response.headers)
  headers.set('access-control-allow-origin', env.PILOT_PANEL_ORIGIN)
  headers.set('vary', 'Origin')
  return new Response(response.body, {status:response.status,headers})
}

export async function handlePilot(request, env) {
  if (!env.DB || !env.BUCKET) return fail('Banco do piloto indisponível', 503)
  if (request.method === 'OPTIONS' && new URL(request.url).pathname.startsWith('/api/pilot/owner/')) {
    if (request.headers.get('origin') !== env.PILOT_PANEL_ORIGIN || !['GET','POST'].includes(request.headers.get('access-control-request-method')) || !['x-mb-owner-ticket','content-type,x-mb-owner-ticket','content-type, x-mb-owner-ticket'].includes(request.headers.get('access-control-request-headers')?.toLowerCase())) return fail('Origem inválida',403)
    return new Response(null,{status:204,headers:{'access-control-allow-origin':env.PILOT_PANEL_ORIGIN,'access-control-allow-methods':'GET, POST','access-control-allow-headers':'content-type, x-mb-owner-ticket','access-control-max-age':'120','vary':'Origin'}})
  }
  const feedbackTicket = await validFeedbackTicket(request,env)
  if (!safeOrigin(request) && !feedbackTicket) return fail('Origem inválida', 403)
  const url = new URL(request.url)
  const path = url.pathname.replace(/^\/api\/pilot\/?/, '').split('/').filter(Boolean)
  if (env.PILOT_READ_ONLY === 'true' && !['GET','HEAD','OPTIONS'].includes(request.method)) return fail('Migração em andamento. As gravações neste endereço estão pausadas.', 503)
  if (path[0] === 'owner') {
    const ticketRead = await validReadTicket(request, env)
    const bridge = env.PILOT_BRIDGE_KEY && request.headers.get('authorization') === `Bearer ${env.PILOT_BRIDGE_KEY}`
    if (env.PILOT_PANEL_ORIGIN && (!(bridge || ticketRead || feedbackTicket) || (request.method !== 'GET' && !feedbackTicket))) return ownerCors(fail('Acesso administrativo apenas pelo site do proprietário', 403), request, env)
    if (path[1] === 'unlock' && path.length === 2 && request.method === 'POST') {
      const { token } = await request.json()
      if (!env.PILOT_PANEL_KEY || typeof token !== 'string' || token.length !== 64 || token !== env.PILOT_PANEL_KEY) return fail('Link administrativo inválido', 403)
      return answer({ ok: true }, 200, { 'set-cookie': `mb_owner=${await panelCookie(env.PILOT_PANEL_KEY)}; HttpOnly; Secure; SameSite=Strict; Path=/api/pilot/owner; Max-Age=${OWNER_SESSION_MS / 1000}` })
    }
    if (!bridge && !ticketRead && !feedbackTicket && request.headers.get('oai-authenticated-user-id') !== OWNER_ID && !await validPanelCookie(request, env.PILOT_PANEL_KEY)) return fail('Acesso exclusivo do proprietário', 403)
    if (path[1] === 'session' && path.length === 2 && request.method === 'GET') return answer({ authorized: true })
    if (path[1] === 'lock' && path.length === 2 && request.method === 'POST') return answer({ ok: true }, 200,
      { 'set-cookie': 'mb_owner=; HttpOnly; Secure; SameSite=Strict; Path=/api/pilot/owner; Max-Age=0' })
    if (path[1] === 'participants' && path.length === 2 && request.method === 'GET') return ownerCors(await ownerParticipants(env.DB,url),request,env)
    if (path[1] === 'feedback' && path.length === 4 && path[3] === 'reply' && request.method === 'POST' && feedbackTicket) return ownerCors(await replyFeedback(request,env.DB,path[2]),request,env)
    if (path[1] === 'activity' && path.length === 2 && request.method === 'GET') return ownerCors(await ownerActivity(env.DB,url),request,env)
    if (['records', 'changes'].includes(path[1]) && path.length === 2 && request.method === 'GET') return ownerCors(await ownerRecords(env.DB, url, path[1] === 'changes'), request, env)
    if (path[1] === 'files' && path.length === 4 && request.method === 'GET') {
      const file = await env.DB.prepare('SELECT * FROM pilot_files WHERE record_id = ? AND filename = ?').bind(path[2], path[3]).first()
      const object = file && await env.BUCKET.get(file.object_key)
      if (!object) return fail('Imagem não encontrada', 404)
      return ownerCors(new Response(object.body, { headers: { 'content-type': file.content_type, 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' } }), request, env)
    }
    if (path[1] === 'dashboard' && path.length === 2 && request.method === 'GET') return ownerCors(await ownerDashboard(env.DB), request, env)
    return fail('Rota desconhecida', 404)
  }
  if (path[0] === 'admin') {
    if (!env.PILOT_ADMIN_KEY || request.headers.get('authorization') !== `Bearer ${env.PILOT_ADMIN_KEY}`) return fail('Acesso negado', 403)
    if (path[1] === 'migration-status' && request.method === 'GET') return answer({readOnly:env.PILOT_READ_ONLY==='true'})
    if (path[1] === 'provision' && request.method === 'POST') return provision(env.DB, await request.json())
    if(path[1]==='backup'&&request.method==='GET')return answer(await backupPage(env.DB,url))
    if(path[1]==='backup-file'&&path.length===3&&request.method==='GET'){const file=await env.DB.prepare('SELECT object_key, content_type FROM pilot_files WHERE id = ?').bind(path[2]).first();const object=file&&await env.BUCKET.get(file.object_key);if(!object)return fail('Arquivo ausente',404);return new Response(object.body,{headers:{'content-type':file.content_type,'cache-control':'no-store'}})}
    if (path[1] === 'stats' && request.method === 'GET') {
      const accounts = await env.DB.prepare('SELECT email, first_access_at, expires_at FROM pilot_accounts ORDER BY email').all()
      const counts = await env.DB.prepare('SELECT collection, COUNT(*) AS total FROM pilot_records GROUP BY collection').all()
      return answer({ accounts: accounts.results, records: counts.results })
    }
    if (path[1] === 'export' && request.method === 'GET') {
      const offset = Number(url.searchParams.get('offset') || 0)
      if (!Number.isInteger(offset) || offset < 0 || offset > 1000000) return fail('Página inválida')
      const [accounts, records, files, events] = await Promise.all([
        env.DB.prepare('SELECT id, email, first_access_at, expires_at, created_at FROM pilot_accounts ORDER BY email').all(),
        env.DB.prepare('SELECT id, account_id, collection, dog_id, data, created_at, updated_at FROM pilot_records ORDER BY id LIMIT 500 OFFSET ?').bind(offset).all(),
        env.DB.prepare('SELECT id, account_id, record_id, collection, filename, content_type, size FROM pilot_files ORDER BY id LIMIT 500 OFFSET ?').bind(offset).all(),
        env.DB.prepare('SELECT id, account_id, event, duration_ms, created_at FROM pilot_events ORDER BY id LIMIT 500 OFFSET ?').bind(offset).all(),
      ])
      return answer({ accounts: accounts.results, records: records.results, files: files.results, events: events.results,
        nextOffset: [records, files, events].some(result => result.results.length === 500) ? offset + 500 : null })
    }
    if (path[1] === 'files' && path.length === 3 && request.method === 'GET') {
      const file = await env.DB.prepare('SELECT object_key, content_type, filename FROM pilot_files WHERE id = ?').bind(path[2]).first()
      if (!file) return fail('Imagem não encontrada', 404)
      const object = await env.BUCKET.get(file.object_key)
      if (!object) return fail('Imagem não encontrada', 404)
      return new Response(object.body, { headers: { 'content-type': file.content_type, 'content-disposition': `attachment; filename="${file.filename}"`, 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' } })
    }
    return fail('Rota desconhecida', 404)
  }
  if (['login','erase-account'].includes(path[0]) && path.length===1 && request.method === 'POST') {
    const { email, password, confirmation } = await request.json()
    if (typeof email !== 'string' || typeof password !== 'string' || email.length > 120 || password.length > 200) return fail('Credenciais inválidas', 401)
    const address = email.trim().toLowerCase()
    const attempt = await env.DB.prepare('SELECT * FROM pilot_login_attempts WHERE email = ?').bind(address).first()
    if (attempt?.locked_until > Date.now()) return fail('Aguarde antes de tentar novamente', 429)
    const account = await env.DB.prepare('SELECT * FROM pilot_accounts WHERE email = ?').bind(address).first()
    const valid = account && await hashPassword(password, account.password_salt) === account.password_hash
    if (!valid) {
      const failures = (attempt?.failures || 0) + 1
      await env.DB.prepare('INSERT INTO pilot_login_attempts (email, failures, locked_until) VALUES (?, ?, ?) ON CONFLICT(email) DO UPDATE SET failures = excluded.failures, locked_until = excluded.locked_until')
        .bind(address, failures, failures >= 5 ? Date.now() + 15 * 60 * 1000 : 0).run()
      return fail('Credenciais inválidas', 401)
    }
    await env.DB.prepare('DELETE FROM pilot_login_attempts WHERE email = ?').bind(address).run()
    if(path[0]==='erase-account'){if(confirmation!=='EXCLUIR')return fail('Confirmação obrigatória');return eraseAccount(env,account)}
    const now = Date.now()
    if (!account.first_access_at) await env.DB.prepare('UPDATE pilot_accounts SET first_access_at = ?, expires_at = ? WHERE id = ? AND first_access_at IS NULL')
      .bind(now, account.account_kind==='public'?253402300799000:now + WEEK, account.id).run()
    const updated = await env.DB.prepare('SELECT expires_at FROM pilot_accounts WHERE id = ?').bind(account.id).first()
    if (updated.expires_at <= now) return fail('Acesso de teste expirado', 403)
    const token = randomSecret()
    await env.DB.prepare('INSERT INTO pilot_sessions (token_hash, account_id, expires_at) VALUES (?, ?, ?)')
      .bind(await digest(token), account.id, Math.min(updated.expires_at,now+30*86400000)).run()
    return answer({ id: account.id, email: account.email, name: account.email.split('@')[0], expiresAt: Math.min(updated.expires_at,now+30*86400000) }, 200,
      { 'set-cookie': `${COOKIE}=${token}; HttpOnly; Secure; SameSite=Strict; Path=/api/pilot; Max-Age=${Math.ceil((Math.min(updated.expires_at,now+30*86400000) - now) / 1000)}` })
  }
  const account = env.OWNER_ACCESS_ACCOUNT || await currentAccount(request, env.DB)
  if (!account) return fail('Entre novamente ou solicite novo acesso', 401)
  if(request.headers.get('x-mb-account-id') && request.headers.get('x-mb-account-id')!==account.id)return fail('A conta mudou. Recarregue o aplicativo.',409)
  if (path[0] === 'me' && request.method === 'GET') return answer({ id: account.id, email: account.email, name: account.email.split('@')[0], expiresAt: account.ownerAccess ? Date.now()+86400000 : account.expires_at, ownerAccess:account.ownerAccess===true })
  if (path[0] === 'logout' && request.method === 'POST') {
    const token = getCookie(request)
    await env.DB.prepare('DELETE FROM pilot_sessions WHERE token_hash = ?').bind(await digest(token)).run()
    return answer({ ok: true }, 200, { 'set-cookie': `${COOKIE}=; HttpOnly; Secure; SameSite=Strict; Path=/api/pilot; Max-Age=0` })
  }
  if(path[0]==='account'&&path.length===1&&request.method==='DELETE'){
    const body=await request.json()
    if(body.confirmation!=='EXCLUIR')return fail('Confirmação obrigatória')
    return eraseAccount(env,account)
  }
  if(path[0]==='preferences'&&path.length===1)return preferencesApi(request,env.DB,account)
  if(['device','events'].includes(path[0])&&request.method==='POST'){
    const pref=await env.DB.prepare("SELECT data FROM pilot_records WHERE account_id = ? AND collection = 'account_preferences'").bind(account.id).first()
    if(pref&&JSON.parse(pref.data).bichu_privacy_analytics==='false')return answer({ok:true,disabled:true})
  }
  if (path[0] === 'device' && path.length === 1 && request.method === 'POST') {
    const body = await request.json(), deviceId = body.deviceId
    if (typeof deviceId !== 'string' || !/^[a-zA-Z0-9_-]{8,80}$/.test(deviceId)) return fail('Aparelho inválido')
    const id = `${account.id}_${deviceId}`, now = Date.now()
    const prior = await env.DB.prepare('SELECT * FROM pilot_devices WHERE id = ? AND account_id = ?').bind(id, account.id).first()
    const data = { ...(prior ? JSON.parse(prior.data) : {}), browser: String(body.browser || '').slice(0,250), screen: String(body.screen || '').slice(0,40), route: String(body.route || '').split('?')[0].slice(0,150), locationStatus: ['granted','denied','unavailable','off'].includes(body.locationStatus) ? body.locationStatus : 'off' }
    if (data.locationStatus === 'off') delete data.location
    if (data.locationStatus === 'granted' && body.location && Number.isFinite(body.location.latitude) && Math.abs(body.location.latitude)<=90 && Number.isFinite(body.location.longitude) && Math.abs(body.location.longitude)<=180 && Number.isFinite(body.location.accuracy) && body.location.accuracy>=0) data.location = { latitude: body.location.latitude, longitude: body.location.longitude, accuracy: body.location.accuracy, recordedAt: Number.isFinite(body.location.recordedAt) && body.location.recordedAt <= now ? body.location.recordedAt : now }
    const ms = prior && Number.isFinite(body.activeMs) ? Math.max(0, Math.min(30000, now-prior.last_seen, body.activeMs)) : 0
    await env.DB.prepare('INSERT INTO pilot_devices (id, account_id, device_id, data, active_ms, last_seen) VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET data = excluded.data, active_ms = pilot_devices.active_ms + excluded.active_ms, last_seen = excluded.last_seen').bind(id, account.id, deviceId, JSON.stringify(data), ms, now).run()
    return answer({ ok: true })
  }
  if (path[0] === 'daily-meals' && path.length === 1) return dailyMeals(request, env, account, url)
  if (path[0] === 'records') return recordApi(request, env, account, path.slice(1))
  if (path[0] === 'files' && path.length === 3 && request.method === 'GET') {
    const file = await env.DB.prepare('SELECT f.* FROM pilot_files f JOIN pilot_records r ON r.id = f.record_id WHERE f.account_id = ? AND r.account_id = ? AND f.record_id = ? AND f.filename = ?')
      .bind(account.id, account.id, path[1], path[2]).first()
    if (!file) return fail('Imagem não encontrada', 404)
    const object = await env.BUCKET.get(file.object_key)
    if (!object) return fail('Imagem não encontrada', 404)
    return new Response(object.body, { headers: { 'content-type': file.content_type, 'cache-control': 'private, max-age=60', 'x-content-type-options': 'nosniff' } })
  }
  if (path[0] === 'events' && request.method === 'POST') {
    const { event, durationMs, deviceId, details } = await request.json()
    if (!['page_load', 'save_error', 'api_slow', 'api_response', 'navigation', 'client_error', 'network_error'].includes(event) || !Number.isInteger(durationMs) || durationMs < 0 || durationMs > 120000) return fail('Evento inválido')
    await env.DB.prepare('INSERT INTO pilot_events (id, account_id, event, duration_ms, created_at, device_id, details) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .bind(crypto.randomUUID(), account.id, event, durationMs, Date.now(), typeof deviceId === 'string' ? deviceId.slice(0,80) : null, details && typeof details === 'object' ? JSON.stringify(Object.fromEntries(Object.entries(details).filter(([k,v]) => ['route','method','status','message'].includes(k) && ['string','number'].includes(typeof v)).map(([k,v]) => [k,typeof v==='string'?v.slice(0,300):v]))) : null).run()
    return answer({ ok: true }, 201)
  }
  return fail('Rota desconhecida', 404)
}
