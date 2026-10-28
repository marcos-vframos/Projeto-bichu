import { initIssues, issuesApi } from './issues.mjs'
import { duties } from '../team/duties.js'
import { initTasks, tasksApi } from './tasks.mjs'
export const permissionCatalog = {
  ...Object.fromEntries(Object.entries(duties).map(([id, d]) => ['duty.' + id, d.name])),
  'questions.read': 'Consultar perguntas e feedbacks atribuídos',
  'questions.review': 'Avaliar feedbacks e atualizar status',
  'questions.reply': 'Responder perguntas e feedbacks atribuídos',
  'tasks.read': 'Consultar tarefas atribuídas',
  'tasks.update': 'Registrar andamento e concluir tarefas',
}
const grants = (db, id) =>
  JSON.parse(
    db.prepare('SELECT permissions FROM team_permissions WHERE user_id=?').get(id || '')
      ?.permissions || '[]',
  )
const enc = new TextEncoder(),
  WEEK = 7 * 86400000
const json = (x, status = 200, headers = {}) =>
  Response.json(x, { status, headers: { 'cache-control': 'no-store', ...headers } })
const sha = async (x) =>
  Buffer.from(await crypto.subtle.digest('SHA-256', enc.encode(x))).toString('hex')
export async function passwordHash(password, salt) {
  const k = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, [
    'deriveBits',
  ])
  return Buffer.from(
    await crypto.subtle.deriveBits(
      { name: 'PBKDF2', salt: enc.encode(salt), iterations: 100000, hash: 'SHA-256' },
      k,
      256,
    ),
  ).toString('hex')
}
function cookie(req, name) {
  return (
    req.headers
      .get('cookie')
      ?.split(';')
      .map((s) => s.trim())
      .find((s) => s.startsWith(name + '='))
      ?.slice(name.length + 1) || ''
  )
}
async function sign(v, key) {
  const k = await crypto.subtle.importKey(
    'raw',
    enc.encode(key),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  return Buffer.from(await crypto.subtle.sign('HMAC', k, enc.encode(v))).toString('hex')
}
export async function ownerSession(req, key) {
  if (!key) return false
  const value = cookie(req, 'mb_owner'),
    parts = value.split('.')
  if (
    parts.length !== 3 ||
    !/^\d{13}$/.test(parts[0]) ||
    !/^[a-f0-9]{48}$/.test(parts[1]) ||
    !/^[a-f0-9]{64}$/.test(parts[2]) ||
    +parts[0] <= Date.now() ||
    +parts[0] > Date.now() + 30 * 86400000
  )
    return false
  return (await sign(parts[0] + '.' + parts[1], key)) === parts[2]
}
export function initTeam(db) {
  initTeamTables(db)
  db.exec(
    'CREATE TABLE IF NOT EXISTS team_audit_details(audit_id TEXT PRIMARY KEY REFERENCES team_audit(id) ON DELETE CASCADE,data TEXT NOT NULL);CREATE INDEX IF NOT EXISTS team_audit_created ON team_audit(created_at)',
  )
  initTasks(db)
  initIssues(db)
  db.exec(
    'CREATE TABLE IF NOT EXISTS team_reviews(record_id TEXT PRIMARY KEY REFERENCES pilot_records(id) ON DELETE CASCADE,priority TEXT NOT NULL,note TEXT NOT NULL,actor_id TEXT NOT NULL,updated_at INTEGER NOT NULL)',
  )
  db.exec(
    'CREATE TABLE IF NOT EXISTS team_permissions(user_id TEXT PRIMARY KEY REFERENCES team_users(id),permissions TEXT NOT NULL)',
  )
  for (const u of db.prepare('SELECT id FROM team_users').all())
    db.prepare('INSERT OR IGNORE INTO team_permissions VALUES(?,?)').run(
      u.id,
      JSON.stringify(Object.keys(permissionCatalog)),
    )
}
function initTeamTables(db) {
  db.exec(
    `CREATE TABLE IF NOT EXISTS team_users(id TEXT PRIMARY KEY,name TEXT NOT NULL,email TEXT UNIQUE NOT NULL,salt TEXT NOT NULL,password_hash TEXT NOT NULL,active INTEGER NOT NULL DEFAULT 1,created_at INTEGER NOT NULL);CREATE TABLE IF NOT EXISTS team_sessions(token_hash TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES team_users(id) ON DELETE CASCADE,expires_at INTEGER NOT NULL);CREATE TABLE IF NOT EXISTS team_assignments(record_id TEXT PRIMARY KEY REFERENCES pilot_records(id) ON DELETE CASCADE,user_id TEXT NOT NULL REFERENCES team_users(id),assigned_at INTEGER NOT NULL);CREATE TABLE IF NOT EXISTS team_audit(id TEXT PRIMARY KEY,actor_id TEXT NOT NULL,action TEXT NOT NULL,record_id TEXT,created_at INTEGER NOT NULL);CREATE TABLE IF NOT EXISTS team_attempts(email TEXT PRIMARY KEY,failures INTEGER NOT NULL,locked_until INTEGER NOT NULL);`,
  )
}
export async function teamApi(req, store, env) {
  const u = new URL(req.url),
    p = u.pathname,
    db = store.raw
  const owner =
      req.headers.get('x-mb-team-mode') !== 'staff' &&
      (await ownerSession(req, env.PILOT_PANEL_KEY)),
    audit = (actor, action, id = null, details = {}) => {
      const eventId = crypto.randomUUID(),
        actorName =
          actor === 'owner'
            ? 'Proprietário'
            : db.prepare('SELECT name FROM team_users WHERE id=?').get(actor)?.name || 'Funcionário'
      db.prepare('INSERT INTO team_audit VALUES(?,?,?,?,?)').run(
        eventId,
        actor,
        action,
        id,
        Date.now(),
      )
      db.prepare('INSERT INTO team_audit_details VALUES(?,?)').run(
        eventId,
        JSON.stringify({ ...details, actorName }),
      )
    }
  if (p === '/api/pilot/owner/unlock' && req.method === 'POST') {
    const { token } = await req.json()
    if (typeof token !== 'string' || token !== env.PILOT_PANEL_KEY)
      return json({ error: 'Link privado inválido' }, 403)
    const data =
      Date.now() +
      30 * 86400000 +
      '.' +
      Buffer.from(crypto.getRandomValues(new Uint8Array(24))).toString('hex')
    return json({ ok: true }, 200, {
      'set-cookie': `mb_owner=${data}.${await sign(data, env.PILOT_PANEL_KEY)}; HttpOnly; SameSite=Strict; Path=/api; Max-Age=2592000${env.COOKIE_SECURE === false ? '' : '; Secure'}`,
    })
  }
  if (p === '/api/pilot/owner/session') return json({ authorized: owner }, owner ? 200 : 403)
  if (p === '/api/team/login' && req.method === 'POST') {
    const body = await req.json(),
      email = String(body.email || '')
        .trim()
        .toLowerCase()
    if (email.length > 120 || typeof body.password !== 'string' || body.password.length > 200)
      return json({ error: 'Credenciais inválidas' }, 401)
    const a = db.prepare('SELECT * FROM team_attempts WHERE email=?').get(email)
    if (a?.locked_until > Date.now())
      return json({ error: 'Aguarde antes de tentar novamente' }, 429)
    const user = db.prepare('SELECT * FROM team_users WHERE email=?').get(email)
    if (!user?.active || (await passwordHash(body.password, user.salt)) !== user.password_hash) {
      const n = (a?.failures || 0) + 1
      db.prepare(
        'INSERT INTO team_attempts VALUES(?,?,?) ON CONFLICT(email) DO UPDATE SET failures=excluded.failures,locked_until=excluded.locked_until',
      ).run(email, n, n >= 5 ? Date.now() + 900000 : 0)
      return json({ error: 'Credenciais inválidas' }, 401)
    }
    db.prepare('DELETE FROM team_attempts WHERE email=?').run(email)
    const token = Buffer.from(crypto.getRandomValues(new Uint8Array(24))).toString('hex')
    db.prepare('INSERT INTO team_sessions VALUES(?,?,?)').run(
      await sha(token),
      user.id,
      Date.now() + WEEK,
    )
    audit(user.id, 'login')
    return json({ ok: true }, 200, {
      'set-cookie': `mb_team=${token}; HttpOnly; SameSite=Strict; Path=/api; Max-Age=604800${env.COOKIE_SECURE === false ? '' : '; Secure'}`,
    })
  }
  const token = cookie(req, 'mb_team'),
    staff = token
      ? db
          .prepare(
            `SELECT u.id,u.name FROM team_sessions s JOIN team_users u ON u.id=s.user_id
             LEFT JOIN temporary_access_sessions t ON t.token_hash=s.token_hash AND t.role='staff'
             LEFT JOIN temporary_access_links l ON l.id=t.link_id AND l.role='staff' AND l.subject_id=u.id
             WHERE s.token_hash=? AND s.expires_at>? AND u.active=1
             AND (t.token_hash IS NULL OR (l.revoked_at IS NULL AND l.expires_at>?))`,
          )
          .get(await sha(token), Date.now(), Date.now())
      : null
  if (p === '/api/team/logout' && req.method === 'POST') {
    if (token) db.prepare('DELETE FROM team_sessions WHERE token_hash=?').run(await sha(token))
    return json({ ok: true }, 200, {
      'set-cookie': 'mb_team=; HttpOnly; SameSite=Strict; Path=/api; Max-Age=0',
    })
  }
  const selectedPreview = owner ? u.searchParams.get('assignee') : null
  if (
    selectedPreview &&
    !db.prepare('SELECT 1 FROM team_users WHERE id=? AND active=1').get(selectedPreview)
  )
    return json({ error: 'Funcionário inválido' }, 403)
  const permissions =
    owner && !selectedPreview
      ? Object.keys(permissionCatalog)
      : grants(db, selectedPreview || staff?.id)
  if (p === '/api/team/me')
    return owner
      ? json({
          role: 'owner',
          name: 'Proprietário',
          permissions,
          assignedCategories:
            owner && !selectedPreview
              ? []
              : db
                  .prepare(
                    'SELECT DISTINCT category FROM team_tasks WHERE user_id=? AND scoped_access=1',
                  )
                  .all(selectedPreview || staff?.id || '')
                  .map((r) => r.category),
          catalog: permissionCatalog,
          duties,
        })
      : staff
        ? json({
            role: 'staff',
            name: staff.name,
            permissions,
            assignedCategories:
              owner && !selectedPreview
                ? []
                : db
                    .prepare(
                      'SELECT DISTINCT category FROM team_tasks WHERE user_id=? AND scoped_access=1',
                    )
                    .all(selectedPreview || staff?.id || '')
                    .map((r) => r.category),
            catalog: permissionCatalog,
            duties,
          })
        : json({ error: 'Entre com o acesso da equipe' }, 401)
  if (!owner && !staff) return json({ error: 'Acesso não autorizado' }, 401)
  if (p.startsWith('/api/team/issues')) return issuesApi(req, db, { owner, staff, audit })
  if (!owner) {
    const required = p.startsWith('/api/team/cases')
      ? req.method === 'GET'
        ? 'questions.read'
        : p.endsWith('/review')
          ? 'questions.review'
          : 'questions.reply'
      : null
    if (required && !permissions.includes(required))
      return json({ error: 'Atribuição não autorizada' }, 403)
  }
  const permissionRoute = p.match(/^\/api\/team\/users\/([a-f0-9-]{36})\/permissions$/)
  if (permissionRoute && req.method === 'PUT') {
    if (!owner) return json({ error: 'Exclusivo do proprietário' }, 403)
    const { permissions: next } = await req.json()
    if (
      !Array.isArray(next) ||
      next.some((x) => !Object.hasOwn(permissionCatalog, x)) ||
      new Set(next).size !== next.length ||
      ((next.includes('questions.reply') || next.includes('questions.review')) &&
        !next.includes('questions.read')) ||
      (next.includes('tasks.update') && !next.includes('tasks.read'))
    )
      return json(
        { error: 'Selecione também a consulta correspondente para permitir alterações' },
        400,
      )
    if (!db.prepare('SELECT 1 FROM team_users WHERE id=? AND active=1').get(permissionRoute[1]))
      return json({ error: 'Funcionário inválido' }, 404)
    db.prepare(
      'INSERT INTO team_permissions VALUES(?,?) ON CONFLICT(user_id) DO UPDATE SET permissions=excluded.permissions',
    ).run(permissionRoute[1], JSON.stringify(next))
    for (const category of ['geral', ...Object.keys(duties)])
      if (!next.includes(category === 'geral' ? 'tasks.update' : 'duty.' + category))
        db.prepare('UPDATE team_tasks SET scoped_access=0 WHERE user_id=? AND category=?').run(
          permissionRoute[1],
          category,
        )
    audit('owner', 'update_permissions', permissionRoute[1])
    return json({ ok: true })
  }
  if (p.startsWith('/api/team/tasks')) return tasksApi(req, db, { owner, staff, audit })
  if (p === '/api/team/users' && req.method === 'GET') {
    if (!owner) return json({ error: 'Exclusivo do proprietário' }, 403)
    return json(
      db
        .prepare('SELECT id,name,email,active,created_at FROM team_users ORDER BY name')
        .all()
        .map((u) => ({ ...u, permissions: grants(db, u.id) })),
    )
  }
  if (p === '/api/team/users' && req.method === 'POST') {
    if (!owner) return json({ error: 'Exclusivo do proprietário' }, 403)
    const { name, email, password } = await req.json()
    if (
      typeof name !== 'string' ||
      !name.trim() ||
      name.length > 100 ||
      typeof email !== 'string' ||
      email.length > 120 ||
      !/^\S+@\S+\.\S+$/.test(email) ||
      typeof password !== 'string' ||
      password.length < 12 ||
      password.length > 200
    )
      return json({ error: 'Informe nome, e-mail e senha de 12 a 200 caracteres' }, 400)
    const id = crypto.randomUUID(),
      salt = crypto.randomUUID(),
      hash = await passwordHash(password, salt)
    try {
      db.prepare('INSERT INTO team_users VALUES(?,?,?,?,?,1,?)').run(
        id,
        name.trim(),
        email.trim().toLowerCase(),
        salt,
        hash,
        Date.now(),
      )
    } catch (e) {
      if (e.errcode === 2067 || e.code?.includes('CONSTRAINT'))
        return json({ error: 'E-mail já cadastrado' }, 409)
      throw e
    }
    db.prepare('INSERT INTO team_permissions VALUES(?,?)').run(
      id,
      JSON.stringify(Object.keys(permissionCatalog)),
    )
    audit('owner', 'create_staff', id)
    return json({ id }, 201)
  }
  const revoke = p.match(/^\/api\/team\/users\/([a-f0-9-]{36})\/revoke$/)
  if (revoke && req.method === 'POST') {
    if (!owner) return json({ error: 'Exclusivo do proprietário' }, 403)
    db.exec('BEGIN IMMEDIATE')
    try {
      db.prepare('UPDATE team_users SET active=0 WHERE id=?').run(revoke[1])
      db.prepare('DELETE FROM team_sessions WHERE user_id=?').run(revoke[1])
      db.prepare('DELETE FROM team_assignments WHERE user_id=?').run(revoke[1])
      db.prepare('UPDATE team_tasks SET user_id=NULL,updated_at=? WHERE user_id=?').run(
        Date.now(),
        revoke[1],
      )
      audit('owner', 'revoke_staff', revoke[1])
      db.exec('COMMIT')
    } catch (e) {
      db.exec('ROLLBACK')
      throw e
    }
    return json({ ok: true })
  }
  if (p === '/api/team/audit' && req.method === 'GET') {
    if (!owner) return json({ error: 'Exclusivo do proprietário' }, 403)
    const offset = Number(u.searchParams.get('offset') || 0),
      actor = u.searchParams.get('actor'),
      completed = u.searchParams.get('completed') === '1'
    if (!Number.isSafeInteger(offset) || offset < 0) return json({ error: 'Página inválida' }, 400)
    const conditions = [],
      args = []
    if (actor) {
      conditions.push('a.actor_id=?')
      args.push(actor)
    }
    if (completed)
      conditions.push(
        "json_extract(d.data,'$.toStatus') IN ('concluida','aprovada') AND COALESCE(json_extract(d.data,'$.fromStatus'),'')!=json_extract(d.data,'$.toStatus')",
      )
    return json(
      db
        .prepare(
          `SELECT a.*,u.name AS actor_name,d.data AS detail_data FROM team_audit a LEFT JOIN team_users u ON a.actor_id=u.id LEFT JOIN team_audit_details d ON d.audit_id=a.id ${conditions.length ? 'WHERE ' + conditions.join(' AND ') : ''} ORDER BY a.created_at DESC,a.rowid DESC LIMIT 200 OFFSET ?`,
        )
        .all(...args, offset)
        .map(({ detail_data, ...row }) => ({
          ...row,
          details: detail_data ? JSON.parse(detail_data) : null,
        })),
    )
  }
  if (p === '/api/team/cases' && req.method === 'GET') {
    const offset = Number(u.searchParams.get('offset') || 0)
    if (!Number.isSafeInteger(offset) || offset < 0) return json({ error: 'Página inválida' }, 400)
    const selected = u.searchParams.get('assignee')
    if (
      selected &&
      (!owner || !db.prepare('SELECT 1 FROM team_users WHERE id=? AND active=1').get(selected))
    )
      return json({ error: 'Filtro não autorizado' }, 403)
    const rows =
      owner && !selected
        ? db
            .prepare(
              "SELECT r.*,a.user_id FROM pilot_records r LEFT JOIN team_assignments a ON a.record_id=r.id WHERE r.collection='pilot_feedback' ORDER BY r.updated_at DESC,r.id LIMIT 101 OFFSET ?",
            )
            .all(offset)
        : db
            .prepare(
              "SELECT r.*,a.user_id FROM pilot_records r JOIN team_assignments a ON a.record_id=r.id WHERE r.collection='pilot_feedback' AND a.user_id=? ORDER BY r.updated_at DESC,r.id LIMIT 101 OFFSET ?",
            )
            .all(owner ? selected : staff.id, offset)
    return json({
      items: rows.slice(0, 100).map((r) => {
        const d = JSON.parse(r.data)
        return {
          id: r.id,
          message: d.message,
          category: d.category,
          status: d.status,
          replies: d.replies || [],
          review:
            db
              .prepare(
                'SELECT priority,note,actor_id,updated_at FROM team_reviews WHERE record_id=?',
              )
              .get(r.id) || null,
          created: r.created_at,
          assignedTo: owner ? r.user_id : undefined,
        }
      }),
      nextOffset: rows.length > 100 ? offset + 100 : null,
    })
  }
  const m = p.match(/^\/api\/team\/cases\/([a-f0-9-]{36})\/(assign|reply|review)$/)
  if (m && req.method === 'POST') {
    const row = db
      .prepare("SELECT * FROM pilot_records WHERE id=? AND collection='pilot_feedback'")
      .get(m[1])
    if (!row) return json({ error: 'Caso não encontrado' }, 404)
    if (m[2] === 'assign') {
      if (!owner) return json({ error: 'Exclusivo do proprietário' }, 403)
      const { userId } = await req.json()
      if (userId === null) {
        db.prepare('DELETE FROM team_assignments WHERE record_id=?').run(row.id)
        audit('owner', 'unassign', row.id)
        return json({ ok: true })
      }
      if (!db.prepare('SELECT 1 FROM team_users WHERE id=? AND active=1').get(userId))
        return json({ error: 'Funcionário inválido' }, 400)
      db.prepare(
        'INSERT INTO team_assignments VALUES(?,?,?) ON CONFLICT(record_id) DO UPDATE SET user_id=excluded.user_id,assigned_at=excluded.assigned_at',
      ).run(row.id, userId, Date.now())
      audit('owner', 'assign', row.id)
      return json({ ok: true })
    }
    if (
      !owner &&
      !db
        .prepare('SELECT 1 FROM team_assignments WHERE record_id=? AND user_id=?')
        .get(row.id, staff.id)
    )
      return json({ error: 'Caso não encontrado' }, 404)
    const body = await req.json()
    if (m[2] === 'review') {
      if (
        !['recebido', 'em_avaliacao', 'respondido', 'resolvido'].includes(body.status) ||
        !['baixa', 'normal', 'alta'].includes(body.priority) ||
        typeof body.note !== 'string' ||
        body.note.length > 2000
      )
        return json({ error: 'Avaliação inválida' }, 400)
      db.exec('BEGIN IMMEDIATE')
      try {
        if (
          !owner &&
          (!grants(db, staff.id).includes('questions.review') ||
            !db
              .prepare(
                'SELECT 1 FROM team_assignments a JOIN team_users u ON u.id=a.user_id WHERE a.record_id=? AND a.user_id=? AND u.active=1',
              )
              .get(row.id, staff.id))
        ) {
          db.exec('ROLLBACK')
          return json({ error: 'Permissão revogada' }, 403)
        }
        const current = db.prepare('SELECT data FROM pilot_records WHERE id=?').get(row.id)
        if (!current) {
          db.exec('ROLLBACK')
          return json({ error: 'Caso não encontrado' }, 404)
        }
        const data = JSON.parse(current.data)
        if (body.status === 'respondido' && !data.replies?.length) {
          db.exec('ROLLBACK')
          return json({ error: 'Envie uma resposta antes de marcar como respondido' }, 400)
        }
        data.status = body.status
        db.prepare('UPDATE pilot_records SET data=?,updated_at=? WHERE id=?').run(
          JSON.stringify(data),
          new Date().toISOString(),
          row.id,
        )
        db.prepare(
          'INSERT INTO team_reviews VALUES(?,?,?,?,?) ON CONFLICT(record_id) DO UPDATE SET priority=excluded.priority,note=excluded.note,actor_id=excluded.actor_id,updated_at=excluded.updated_at',
        ).run(row.id, body.priority, body.note.trim(), owner ? 'owner' : staff.id, Date.now())
        audit(owner ? 'owner' : staff.id, 'review_feedback', row.id, {
          title: JSON.parse(current.data).message || 'Feedback',
          category: 'feedback',
          fromStatus: JSON.parse(current.data).status || 'recebido',
          toStatus: body.status,
          note: body.note.trim(),
          priority: body.priority,
        })
        db.exec('COMMIT')
        return json({ ok: true })
      } catch (error) {
        db.exec('ROLLBACK')
        throw error
      }
    }
    if (
      typeof body.message !== 'string' ||
      (!body.message.trim() && (!owner || body.status === 'respondido')) ||
      body.message.length > 2000 ||
      !['em_avaliacao', 'respondido', 'resolvido'].includes(body.status) ||
      !/^[a-f0-9-]{36}$/.test(body.replyId || '')
    )
      return json({ error: 'Resposta inválida' }, 400)
    const data = JSON.parse(row.data),
      replies = Array.isArray(data.replies) ? data.replies : []
    if (replies.some((r) => r.id === body.replyId)) return json({ ok: true })
    if (replies.length >= 30) return json({ error: 'Limite de respostas atingido' }, 409)
    if (body.message.trim()) replies.push({
      id: body.replyId,
      message: body.message.trim(),
      createdAt: new Date().toISOString(),
      authorName: owner ? 'Proprietário' : staff.name,
      authorId: owner ? 'owner' : staff.id,
    })
    data.replies = replies
    data.status = body.status
    db.exec('BEGIN IMMEDIATE')
    try {
      const current =
        owner ||
        (grants(db, staff.id).includes('questions.reply') &&
          db
            .prepare(
              'SELECT 1 FROM team_assignments a JOIN team_users u ON u.id=a.user_id WHERE a.record_id=? AND a.user_id=? AND u.active=1',
            )
            .get(row.id, staff.id))
      if (!current) {
        db.exec('ROLLBACK')
        return json({ error: 'Permissão revogada' }, 403)
      }
      const r = db
        .prepare('UPDATE pilot_records SET data=?,updated_at=? WHERE id=? AND data=?')
        .run(JSON.stringify(data), new Date().toISOString(), row.id, row.data)
      if (!r.changes) {
        db.exec('ROLLBACK')
        return json({ error: 'O caso mudou; atualize' }, 409)
      }
      audit(owner ? 'owner' : staff.id, 'reply', row.id, {
        title: data.message || 'Feedback',
        category: 'feedback',
        fromStatus: JSON.parse(row.data).status || 'recebido',
        toStatus: body.status,
        note: body.message.trim(),
      })
      db.exec('COMMIT')
    } catch (e) {
      db.exec('ROLLBACK')
      throw e
    }
    return json({ ok: true })
  }
  return json({ error: 'Rota não encontrada' }, 404)
}
