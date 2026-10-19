import { duties } from '../team/duties.js'
const json = (value, status = 200) =>
  Response.json(value, { status, headers: { 'cache-control': 'no-store' } })
export function initTasks(db) {
  db.exec(
    `CREATE TABLE IF NOT EXISTS team_tasks(id TEXT PRIMARY KEY,user_id TEXT REFERENCES team_users(id),title TEXT NOT NULL,details TEXT NOT NULL DEFAULT '',priority TEXT NOT NULL DEFAULT 'normal',due_date TEXT,status TEXT NOT NULL DEFAULT 'pendente',note TEXT NOT NULL DEFAULT '',created_at INTEGER NOT NULL,updated_at INTEGER NOT NULL);CREATE INDEX IF NOT EXISTS team_tasks_assignee_status ON team_tasks(user_id,status,updated_at);`,
  )
  const columns = db
    .prepare('PRAGMA table_info(team_tasks)')
    .all()
    .map((c) => c.name)
  if (!columns.includes('category'))
    db.exec("ALTER TABLE team_tasks ADD COLUMN category TEXT NOT NULL DEFAULT 'geral'")
  if (!columns.includes('context'))
    db.exec("ALTER TABLE team_tasks ADD COLUMN context TEXT NOT NULL DEFAULT '{}'")
  db.exec(
    'CREATE INDEX IF NOT EXISTS team_tasks_category_assignee ON team_tasks(category,user_id,updated_at)',
  )
}
const validDate = (v) =>
  v === null ||
  (typeof v === 'string' &&
    /^\d{4}-\d{2}-\d{2}$/.test(v) &&
    Number.isFinite(Date.parse(v + 'T00:00:00Z')) &&
    new Date(v + 'T00:00:00Z').toISOString().slice(0, 10) === v)
export async function tasksApi(req, db, { owner, staff, audit }) {
  const u = new URL(req.url),
    p = u.pathname,
    selected = u.searchParams.get('assignee')
  if (
    selected &&
    (!owner || !db.prepare('SELECT 1 FROM team_users WHERE id=? AND active=1').get(selected))
  )
    return json({ error: 'Filtro não autorizado' }, 403)
  const permissions = () =>
    JSON.parse(
      db.prepare('SELECT permissions FROM team_permissions WHERE user_id=?').get(staff?.id || '')
        ?.permissions || '[]',
    )
  const access = (category, write = false) =>
    owner ||
    permissions().includes(
      category === 'geral' ? (write ? 'tasks.update' : 'tasks.read') : 'duty.' + category,
    )
  const validCategory = (c) => c === 'geral' || Object.hasOwn(duties, c)
  if (p === '/api/team/tasks' && req.method === 'GET') {
    const category = u.searchParams.get('category') || (owner ? 'all' : 'geral')
    if (category !== 'all' && !validCategory(category)) return json({ error: 'Área inválida' }, 400)
    if (!owner && (category === 'all' || !access(category)))
      return json({ error: 'Atribuição não autorizada' }, 403)
    const offset = Number(u.searchParams.get('offset') || 0)
    if (!Number.isSafeInteger(offset) || offset < 0) return json({ error: 'Página inválida' }, 400)
    const conditions = [],
      args = []
    if (!owner || selected) {
      conditions.push('user_id=?')
      args.push(owner ? selected : staff.id)
    }
    if (category !== 'all') {
      conditions.push('category=?')
      args.push(category)
    }
    const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : ''
    const rows = db
      .prepare(
        `SELECT * FROM team_tasks ${where} ORDER BY CASE status WHEN 'concluida' THEN 1 ELSE 0 END,updated_at DESC,id LIMIT 101 OFFSET ?`,
      )
      .all(...args, offset)
    return json({ items: rows.slice(0, 100), nextOffset: rows.length > 100 ? offset + 100 : null })
  }
  if (p === '/api/team/tasks' && req.method === 'POST') {
    const body = await req.json(),
      category = body.category || 'geral',
      context = body.context ?? {},
      userId = owner ? (body.userId ?? null) : staff.id,
      permitted = validCategory(category) && access(category, true),
      dueDate = body.dueDate || null,
      priority = body.priority || 'normal'
    if (!permitted || (!owner && category === 'geral'))
      return json({ error: 'Atribuição não autorizada' }, 403)
    if (!owner && body.userId !== undefined && body.userId !== staff.id)
      return json({ error: 'Responsável não autorizado' }, 403)
    const fields = duties[category]?.fields || []
    if (
      !context ||
      typeof context !== 'object' ||
      Array.isArray(context) ||
      Object.keys(context).some((k) => !fields.includes(k)) ||
      Object.values(context).some((v) => typeof v !== 'string' || v.length > 2000)
    )
      return json({ error: 'Campos da atividade inválidos' }, 400)
    if (
      typeof body.title !== 'string' ||
      !body.title.trim() ||
      body.title.length > 160 ||
      typeof body.details !== 'string' ||
      body.details.length > 4000 ||
      !['normal', 'alta', 'baixa'].includes(priority) ||
      !validDate(dueDate) ||
      (userId !== null &&
        (typeof userId !== 'string' ||
          !db.prepare('SELECT 1 FROM team_users WHERE id=? AND active=1').get(userId)))
    )
      return json({ error: 'Confira título, responsável, prazo e descrição' }, 400)
    const id = crypto.randomUUID(),
      now = Date.now()
    db.prepare(
      'INSERT INTO team_tasks(id,user_id,title,details,priority,due_date,created_at,updated_at,category,context) VALUES(?,?,?,?,?,?,?,?,?,?)',
    ).run(
      id,
      userId,
      body.title.trim(),
      body.details.trim(),
      priority,
      dueDate,
      now,
      now,
      category,
      JSON.stringify(context),
    )
    audit(owner ? 'owner' : staff.id, 'create_task', id)
    return json({ id }, 201)
  }
  const match = p.match(/^\/api\/team\/tasks\/([a-f0-9-]{36})$/)
  if (match && req.method === 'PATCH') {
    const body = await req.json(),
      keys = Object.keys(body),
      allowed = owner ? ['status', 'note', 'userId'] : ['status', 'note']
    if (
      !keys.length ||
      keys.some((k) => !allowed.includes(k)) ||
      (body.status !== undefined &&
        ![
          'pendente',
          'em_andamento',
          'concluida',
          'aguardando_aprovacao',
          'aprovada',
          'ajustes_solicitados',
        ].includes(body.status)) ||
      (body.note !== undefined && (typeof body.note !== 'string' || body.note.length > 2000))
    )
      return json({ error: 'Alteração inválida' }, 400)
    db.exec('BEGIN IMMEDIATE')
    try {
      const row = db.prepare('SELECT * FROM team_tasks WHERE id=?').get(match[1])
      if (row && !owner && row.user_id === staff.id && !access(row.category, true)) {
        db.exec('ROLLBACK')
        return json({ error: 'Atribuição não autorizada' }, 403)
      }
      if (
        !row ||
        (!owner &&
          (!access(row.category, true) ||
            row.user_id !== staff.id ||
            !db.prepare('SELECT 1 FROM team_users WHERE id=? AND active=1').get(staff.id)))
      ) {
        db.exec('ROLLBACK')
        return json({ error: 'Responsabilidade não encontrada' }, 404)
      }
      if (
        !owner &&
        (['aprovada', 'ajustes_solicitados'].includes(body.status) ||
          (row.category === 'conteudo' && body.status === 'concluida'))
      ) {
        db.exec('ROLLBACK')
        return json({ error: 'Encaminhe a revisão para aprovação do proprietário' }, 403)
      }
      if (owner && body.status === 'aprovada' && row.category !== 'conteudo') {
        db.exec('ROLLBACK')
        return json({ error: 'Aprovação disponível para revisão de conteúdo' }, 400)
      }
      const userId = body.userId === undefined ? row.user_id : body.userId
      if (
        userId !== null &&
        (typeof userId !== 'string' ||
          !db.prepare('SELECT 1 FROM team_users WHERE id=? AND active=1').get(userId))
      ) {
        db.exec('ROLLBACK')
        return json({ error: 'Funcionário inválido' }, 400)
      }
      db.prepare('UPDATE team_tasks SET user_id=?,status=?,note=?,updated_at=? WHERE id=?').run(
        userId,
        body.status || row.status,
        body.note === undefined ? row.note : body.note.trim(),
        Date.now(),
        row.id,
      )
      audit(owner ? 'owner' : staff.id, 'update_task', row.id)
      db.exec('COMMIT')
      return json({ ok: true })
    } catch (e) {
      db.exec('ROLLBACK')
      throw e
    }
  }
  return json({ error: 'Rota não encontrada' }, 404)
}
