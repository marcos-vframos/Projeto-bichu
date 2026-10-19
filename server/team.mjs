import { initTasks, tasksApi } from './tasks.mjs'
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
  initTasks(db)
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
  const owner = await ownerSession(req, env.PILOT_PANEL_KEY),
    audit = (actor, action, id = null) =>
      db
        .prepare('INSERT INTO team_audit VALUES(?,?,?,?,?)')
        .run(crypto.randomUUID(), actor, action, id, Date.now())
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
            'SELECT u.id,u.name FROM team_sessions s JOIN team_users u ON u.id=s.user_id WHERE s.token_hash=? AND s.expires_at>? AND u.active=1',
          )
          .get(await sha(token), Date.now())
      : null
  if (p === '/api/team/logout' && req.method === 'POST') {
    if (token) db.prepare('DELETE FROM team_sessions WHERE token_hash=?').run(await sha(token))
    return json({ ok: true }, 200, {
      'set-cookie': 'mb_team=; HttpOnly; SameSite=Strict; Path=/api; Max-Age=0',
    })
  }
  if (p === '/api/team/me')
    return owner
      ? json({ role: 'owner', name: 'Proprietário' })
      : staff
        ? json({ role: 'staff', name: staff.name })
        : json({ error: 'Entre com o acesso da equipe' }, 401)
  if (!owner && !staff) return json({ error: 'Acesso não autorizado' }, 401)
  if (p.startsWith('/api/team/tasks')) return tasksApi(req, db, { owner, staff, audit })
  if (p === '/api/team/users' && req.method === 'GET') {
    if (!owner) return json({ error: 'Exclusivo do proprietário' }, 403)
    return json(
      db.prepare('SELECT id,name,email,active,created_at FROM team_users ORDER BY name').all(),
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
    return json(
      db
        .prepare(
          'SELECT a.*,u.name AS actor_name FROM team_audit a LEFT JOIN team_users u ON a.actor_id=u.id ORDER BY a.created_at DESC LIMIT 200',
        )
        .all(),
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
          created: r.created_at,
          assignedTo: owner ? r.user_id : undefined,
        }
      }),
      nextOffset: rows.length > 100 ? offset + 100 : null,
    })
  }
  const m = p.match(/^\/api\/team\/cases\/([a-f0-9-]{36})\/(assign|reply)$/)
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
    if (
      typeof body.message !== 'string' ||
      !body.message.trim() ||
      body.message.length > 2000 ||
      !['em_avaliacao', 'respondido', 'resolvido'].includes(body.status) ||
      !/^[a-f0-9-]{36}$/.test(body.replyId || '')
    )
      return json({ error: 'Resposta inválida' }, 400)
    const data = JSON.parse(row.data),
      replies = Array.isArray(data.replies) ? data.replies : []
    if (replies.some((r) => r.id === body.replyId)) return json({ ok: true })
    if (replies.length >= 30) return json({ error: 'Limite de respostas atingido' }, 409)
    replies.push({
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
        db
          .prepare(
            'SELECT 1 FROM team_assignments a JOIN team_users u ON u.id=a.user_id WHERE a.record_id=? AND a.user_id=? AND u.active=1',
          )
          .get(row.id, staff.id)
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
      audit(owner ? 'owner' : staff.id, 'reply', row.id)
      db.exec('COMMIT')
    } catch (e) {
      db.exec('ROLLBACK')
      throw e
    }
    return json({ ok: true })
  }
  return json({ error: 'Rota não encontrada' }, 404)
}
