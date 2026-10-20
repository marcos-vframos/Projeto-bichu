const json = (value, status = 200) =>
  Response.json(value, { status, headers: { 'cache-control': 'no-store' } })
const priorities = ['critica', 'alta', 'normal', 'baixa']
export function initIssues(db) {
  db.exec(
    `CREATE TABLE IF NOT EXISTS team_issues(id TEXT PRIMARY KEY,reporter_id TEXT NOT NULL REFERENCES team_users(id),source_type TEXT NOT NULL,source_id TEXT NOT NULL,summary TEXT NOT NULL,priority TEXT NOT NULL,status TEXT NOT NULL DEFAULT 'aberta',snapshot TEXT NOT NULL,resolution TEXT NOT NULL DEFAULT '',created_at INTEGER NOT NULL,updated_at INTEGER NOT NULL,UNIQUE(reporter_id,source_type,source_id));CREATE INDEX IF NOT EXISTS team_issues_reporter_status ON team_issues(reporter_id,status,priority,created_at);CREATE TABLE IF NOT EXISTS team_issue_updates(id TEXT PRIMARY KEY,issue_id TEXT NOT NULL REFERENCES team_issues(id) ON DELETE CASCADE,actor_id TEXT NOT NULL,action TEXT NOT NULL,message TEXT NOT NULL,created_at INTEGER NOT NULL);`,
  )
}
export async function issuesApi(req, db, { owner, staff, audit }) {
  const url = new URL(req.url),
    path = url.pathname
  const update = (issueId, action, message) => {
    db.prepare('INSERT INTO team_issue_updates VALUES(?,?,?,?,?,?)').run(
      crypto.randomUUID(),
      issueId,
      owner ? 'owner' : staff.id,
      action,
      message,
      Date.now(),
    )
    audit(owner ? 'owner' : staff.id, 'issue_' + action, issueId)
  }
  if (path === '/api/team/issues/reporters' && req.method === 'GET') {
    if (!owner) return json({ error: 'Exclusivo do proprietário' }, 403)
    return json(
      db
        .prepare(
          "SELECT u.id,u.name,u.email,u.active,COUNT(i.id) AS total,SUM(CASE WHEN i.status!='resolvida' THEN 1 ELSE 0 END) AS pending,SUM(CASE WHEN i.status!='resolvida' AND i.priority='critica' THEN 1 ELSE 0 END) AS critical FROM team_users u LEFT JOIN team_issues i ON i.reporter_id=u.id GROUP BY u.id ORDER BY u.name,u.id",
        )
        .all(),
    )
  }
  if (path === '/api/team/issues' && req.method === 'GET') {
    const reporter = url.searchParams.get('reporter'),
      offset = Number(url.searchParams.get('offset') || 0),
      history = url.searchParams.get('history') === '1'
    if (!Number.isSafeInteger(offset) || offset < 0) return json({ error: 'Página inválida' }, 400)
    if (!owner && reporter && reporter !== staff.id)
      return json({ error: 'Filtro não autorizado' }, 403)
    const conditions = [],
      args = []
    if (!owner || reporter) {
      conditions.push('reporter_id=?')
      args.push(owner ? reporter : staff.id)
    }
    if (!history) conditions.push("status!='resolvida'")
    const rows = db
      .prepare(
        `SELECT id,reporter_id,source_type,source_id,summary,priority,status,resolution,created_at,updated_at FROM team_issues ${conditions.length ? 'WHERE ' + conditions.join(' AND ') : ''} ORDER BY CASE status WHEN 'resolvida' THEN 1 ELSE 0 END,CASE priority WHEN 'critica' THEN 0 WHEN 'alta' THEN 1 WHEN 'normal' THEN 2 ELSE 3 END,created_at,id LIMIT 101 OFFSET ?`,
      )
      .all(...args, offset)
    return json({ items: rows.slice(0, 100), nextOffset: rows.length > 100 ? offset + 100 : null })
  }
  if (path === '/api/team/issues' && req.method === 'POST') {
    if (owner || !staff)
      return json({ error: 'A sinalização deve identificar a conta do funcionário' }, 403)
    const body = await req.json()
    if (
      Object.keys(body).some(
        (k) => !['sourceType', 'sourceId', 'summary', 'priority'].includes(k),
      ) ||
      !['task', 'feedback'].includes(body.sourceType) ||
      typeof body.sourceId !== 'string' ||
      typeof body.summary !== 'string' ||
      !body.summary.trim() ||
      body.summary.length > 2000 ||
      !priorities.includes(body.priority)
    )
      return json({ error: 'Confira a descrição e a urgência' }, 400)
    const permissions = JSON.parse(
      db.prepare('SELECT permissions FROM team_permissions WHERE user_id=?').get(staff.id)
        ?.permissions || '[]',
    )
    if (!db.prepare('SELECT 1 FROM team_users WHERE id=? AND active=1').get(staff.id))
      return json({ error: 'Acesso revogado' }, 403)
    let source
    if (body.sourceType === 'task') {
      source = db
        .prepare(
          'SELECT id,title,details,category,context,note,status,scoped_access FROM team_tasks WHERE id=? AND user_id=?',
        )
        .get(body.sourceId, staff.id)
      if (
        !source ||
        (!permissions.includes(
          source.category === 'geral' ? 'tasks.read' : 'duty.' + source.category,
        ) &&
          source.scoped_access !== 1)
      )
        return json({ error: 'Atividade não encontrada' }, 404)
    } else {
      const row = db
        .prepare(
          "SELECT r.data FROM pilot_records r JOIN team_assignments a ON a.record_id=r.id WHERE r.id=? AND r.collection='pilot_feedback' AND a.user_id=?",
        )
        .get(body.sourceId, staff.id)
      if (!row || !permissions.includes('questions.read'))
        return json({ error: 'Feedback não encontrado' }, 404)
      const data = JSON.parse(row.data)
      source = { message: data.message, category: data.category, status: data.status }
    }
    const previous = db
      .prepare('SELECT id FROM team_issues WHERE reporter_id=? AND source_type=? AND source_id=?')
      .get(staff.id, body.sourceType, body.sourceId)
    if (previous)
      return json(
        {
          error: 'Esta atividade já foi sinalizada. Acompanhe em Minhas sinalizações.',
          id: previous.id,
        },
        409,
      )
    const id = crypto.randomUUID(),
      now = Date.now()
    db.exec('BEGIN IMMEDIATE')
    try {
      db.prepare(
        'INSERT INTO team_issues(id,reporter_id,source_type,source_id,summary,priority,snapshot,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?)',
      ).run(
        id,
        staff.id,
        body.sourceType,
        body.sourceId,
        body.summary.trim(),
        body.priority,
        JSON.stringify(source),
        now,
        now,
      )
      update(id, 'sinalizada', body.summary.trim())
      db.exec('COMMIT')
    } catch (error) {
      db.exec('ROLLBACK')
      throw error
    }
    return json({ id }, 201)
  }
  const match = path.match(/^\/api\/team\/issues\/([a-f0-9-]{36})$/)
  if (!match) return json({ error: 'Rota não encontrada' }, 404)
  const row = db.prepare('SELECT * FROM team_issues WHERE id=?').get(match[1])
  if (!row || (!owner && row.reporter_id !== staff.id))
    return json({ error: 'Pendência não encontrada' }, 404)
  if (req.method === 'GET')
    return json({
      ...row,
      currentSource:
        owner && row.source_type === 'task'
          ? db
              .prepare(
                'SELECT title,details,category,context,note,status FROM team_tasks WHERE id=?',
              )
              .get(row.source_id) || null
          : null,
      snapshot: JSON.parse(row.snapshot),
      updates: db
        .prepare(
          'SELECT a.*,u.name AS actor_name FROM team_issue_updates a LEFT JOIN team_users u ON u.id=a.actor_id WHERE a.issue_id=? ORDER BY a.created_at,a.rowid',
        )
        .all(row.id),
    })
  if (req.method !== 'PATCH') return json({ error: 'Método não permitido' }, 405)
  const body = await req.json()
  if (
    Object.keys(body).some((k) => !['action', 'message', 'priority'].includes(k)) ||
    typeof body.message !== 'string' ||
    !body.message.trim() ||
    body.message.length > 4000 ||
    (body.priority !== undefined && !priorities.includes(body.priority))
  )
    return json({ error: 'Descreva a ação ou solução' }, 400)
  const actions = owner
    ? ['iniciar', 'solicitar', 'solucionar', 'reabrir', 'aprovar_conteudo', 'mensagem']
    : ['mensagem', 'reabrir']
  if (!actions.includes(body.action) || (!owner && body.priority !== undefined))
    return json({ error: 'Ação não autorizada' }, 403)
  db.exec('BEGIN IMMEDIATE')
  try {
    const current = db.prepare('SELECT * FROM team_issues WHERE id=?').get(row.id)
    if (!owner && !db.prepare('SELECT 1 FROM team_users WHERE id=? AND active=1').get(staff.id)) {
      db.exec('ROLLBACK')
      return json({ error: 'Acesso revogado' }, 403)
    }
    const states = {
      iniciar: 'em_analise',
      solicitar: 'aguardando_funcionario',
      solucionar: 'resolvida',
      aprovar_conteudo: 'resolvida',
      reabrir: 'aberta',
    }
    let status =
      states[body.action] ||
      (!owner && current.status === 'aguardando_funcionario' ? 'aberta' : current.status)
    if (body.action === 'aprovar_conteudo') {
      const task =
        current.source_type === 'task' &&
        db.prepare('SELECT category,status FROM team_tasks WHERE id=?').get(current.source_id)
      if (!task || task.category !== 'conteudo' || task.status !== 'aguardando_aprovacao') {
        db.exec('ROLLBACK')
        return json({ error: 'A revisão precisa estar aguardando aprovação' }, 409)
      }
      db.prepare("UPDATE team_tasks SET status='aprovada',updated_at=? WHERE id=?").run(
        Date.now(),
        current.source_id,
      )
      audit('owner', 'update_task', current.source_id)
    }
    db.prepare(
      'UPDATE team_issues SET status=?,priority=?,resolution=?,updated_at=? WHERE id=?',
    ).run(
      status,
      body.priority || current.priority,
      ['solucionar', 'aprovar_conteudo'].includes(body.action)
        ? body.message.trim()
        : current.resolution,
      Date.now(),
      current.id,
    )
    update(current.id, body.action, body.message.trim())
    db.exec('COMMIT')
  } catch (error) {
    db.exec('ROLLBACK')
    throw error
  }
  return json({ ok: true })
}
