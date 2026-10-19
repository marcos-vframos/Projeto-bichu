const json = (value, status = 200) =>
  Response.json(value, { status, headers: { 'cache-control': 'no-store' } })
export function initTasks(db) {
  db.exec(
    `CREATE TABLE IF NOT EXISTS team_tasks(id TEXT PRIMARY KEY,user_id TEXT REFERENCES team_users(id),title TEXT NOT NULL,details TEXT NOT NULL DEFAULT '',priority TEXT NOT NULL DEFAULT 'normal',due_date TEXT,status TEXT NOT NULL DEFAULT 'pendente',note TEXT NOT NULL DEFAULT '',created_at INTEGER NOT NULL,updated_at INTEGER NOT NULL);CREATE INDEX IF NOT EXISTS team_tasks_assignee_status ON team_tasks(user_id,status,updated_at);`,
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
  if (p === '/api/team/tasks' && req.method === 'GET') {
    const offset = Number(u.searchParams.get('offset') || 0)
    if (!Number.isSafeInteger(offset) || offset < 0) return json({ error: 'Página inválida' }, 400)
    const where = owner ? (selected ? 'WHERE user_id=?' : '') : 'WHERE user_id=?',
      args = owner ? (selected ? [selected] : []) : [staff.id]
    const rows = db
      .prepare(
        `SELECT * FROM team_tasks ${where} ORDER BY CASE status WHEN 'concluida' THEN 1 ELSE 0 END,updated_at DESC,id LIMIT 101 OFFSET ?`,
      )
      .all(...args, offset)
    return json({ items: rows.slice(0, 100), nextOffset: rows.length > 100 ? offset + 100 : null })
  }
  if (p === '/api/team/tasks' && req.method === 'POST') {
    if (!owner) return json({ error: 'Exclusivo do proprietário' }, 403)
    const body = await req.json(),
      userId = body.userId ?? null,
      dueDate = body.dueDate || null,
      priority = body.priority || 'normal'
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
      'INSERT INTO team_tasks(id,user_id,title,details,priority,due_date,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?)',
    ).run(id, userId, body.title.trim(), body.details.trim(), priority, dueDate, now, now)
    audit('owner', 'create_task', id)
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
        !['pendente', 'em_andamento', 'concluida'].includes(body.status)) ||
      (body.note !== undefined && (typeof body.note !== 'string' || body.note.length > 2000))
    )
      return json({ error: 'Alteração inválida' }, 400)
    db.exec('BEGIN IMMEDIATE')
    try {
      const row = db.prepare('SELECT * FROM team_tasks WHERE id=?').get(match[1])
      if (
        !row ||
        (!owner &&
          (!JSON.parse(
            db.prepare('SELECT permissions FROM team_permissions WHERE user_id=?').get(staff.id)
              ?.permissions || '[]',
          ).includes('tasks.update') ||
            row.user_id !== staff.id ||
            !db.prepare('SELECT 1 FROM team_users WHERE id=? AND active=1').get(staff.id)))
      ) {
        db.exec('ROLLBACK')
        return json({ error: 'Responsabilidade não encontrada' }, 404)
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
