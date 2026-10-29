import { scrypt, timingSafeEqual, randomBytes, createHash } from 'node:crypto'
import { promisify } from 'node:util'
import { ownerCookie, permissionCatalog } from './team.mjs'
import { clearTemporaryTutorSession } from './temporary-access.mjs'
const derive = promisify(scrypt)
const json = (data, status = 200, cookies = []) => {
  const headers = new Headers({ 'cache-control': 'no-store' })
  for (const cookie of cookies) headers.append('set-cookie', cookie)
  return Response.json(data, { status, headers })
}

// Credentials are server configuration, never a public account registration or a client secret.
export function masterAccess(store, env) {
  const email = String(env.MASTER_ACCESS_EMAIL || '').trim().toLowerCase()
  const configured = !env.LAB_KIND && /^\S+@\S+\.\S+$/.test(email) &&
    /^[a-f0-9]{64}$/.test(env.MASTER_ACCESS_SALT || '') && /^[a-f0-9]{128}$/.test(env.MASTER_ACCESS_HASH || '')
  const db = store.raw
  const cookie = (name, value, seconds) => `${name}=${value}; HttpOnly; SameSite=Strict; Path=/api; Max-Age=${seconds}${env.COOKIE_SECURE === false ? '' : '; Secure'}`
  return async request => {
    const path = new URL(request.url).pathname
    const dedicated = path === '/api/access/master/login'
    if (!dedicated && !['/api/pilot/login', '/api/team/login'].includes(path)) return null
    if (request.method !== 'POST') return dedicated ? json({ error: 'Método não permitido' }, 405) : null
    let body
    try { body = await request.clone().json() } catch { return dedicated ? json({ error: 'Dados inválidos' }, 400) : null }
    const submitted = String(body?.email || '').trim().toLowerCase()
    if (!dedicated && (!configured || submitted !== email)) return null
    if (!configured) return json({ error: 'Acesso master não configurado neste ambiente.' }, 503)
    const area = dedicated ? body.area : path === '/api/team/login' ? 'funcionario' : 'matriz'
    if (!['proprietario', 'matriz', 'funcionario'].includes(area)) return json({ error: 'Área inválida' }, 400)
    const attemptKey = 'master-access'
    const attempt = db.prepare('SELECT * FROM team_attempts WHERE email=?').get(attemptKey)
    if (attempt?.locked_until > Date.now()) return json({ error: 'Aguarde 15 minutos antes de tentar novamente.' }, 429)
    const validShape = typeof body.password === 'string' && body.password.length > 0 && body.password.length <= 200
    const hash = await derive(validShape ? body.password : '', env.MASTER_ACCESS_SALT, 64)
    if (submitted !== email || !validShape || !timingSafeEqual(hash, Buffer.from(env.MASTER_ACCESS_HASH, 'hex'))) {
      const failures = attempt?.locked_until && attempt.locked_until <= Date.now() ? 1 : (attempt?.failures || 0) + 1
      db.prepare('INSERT INTO team_attempts VALUES(?,?,?) ON CONFLICT(email) DO UPDATE SET failures=excluded.failures,locked_until=excluded.locked_until')
        .run(attemptKey, failures, failures >= 5 ? Date.now() + 900000 : 0)
      return json({ error: 'E-mail ou senha inválidos.' }, 401)
    }
    db.prepare('DELETE FROM team_attempts WHERE email=?').run(attemptKey)
    const account = area === 'matriz' ? db.prepare("SELECT id,email,expires_at FROM pilot_accounts WHERE email='piloto01@meubichu.test'").get() : null
    if (area === 'matriz' && !account) return json({ error: 'A matriz original não foi encontrada. Nenhuma conta foi criada ou substituída.' }, 409)
    let actor = 'owner', cookies = [], redirect = '/painel'
    if (area === 'funcionario') {
      let user = db.prepare('SELECT id,active FROM team_users WHERE email=?').get(email)
      if (user && !user.active) return json({ error: 'Acesso do funcionário desativado pelo proprietário.' }, 403)
      db.exec('BEGIN IMMEDIATE')
      try {
        if (!user) {
          user = { id: crypto.randomUUID(), active: 1 }
          db.prepare('INSERT INTO team_users VALUES(?,?,?,?,?,1,?)').run(user.id, 'Marcos · testes master', email, randomBytes(32).toString('hex'), randomBytes(32).toString('hex'), Date.now())
          db.prepare('INSERT INTO team_permissions VALUES(?,?)').run(user.id, JSON.stringify(Object.keys(permissionCatalog)))
        }
        const token = randomBytes(32).toString('hex')
        db.prepare('INSERT INTO team_sessions VALUES(?,?,?)').run(createHash('sha256').update(token).digest('hex'), user.id, Date.now() + 7 * 86400000)
        cookies.push(cookie('mb_team', token, 604800))
        actor = user.id
        db.exec('COMMIT')
      } catch (error) { db.exec('ROLLBACK'); throw error }
      redirect = '/equipe?acesso=funcionario'
    } else {
      cookies.push(await ownerCookie(env))
      if (account) {
        clearTemporaryTutorSession(request, db)
        cookies.push(cookie('mb_owner_account', account.id, 2592000), cookie('mb_pilot', '', 0))
        redirect = '/'
      }
    }
    const auditId = crypto.randomUUID()
    db.prepare('INSERT INTO team_audit VALUES(?,?,?,?,?)').run(auditId, actor, 'master_login', account?.id || null, Date.now())
    db.prepare('INSERT INTO team_audit_details VALUES(?,?)').run(auditId, JSON.stringify({ actorName: area === 'funcionario' ? 'Marcos · testes master' : 'Proprietário', area, email }))
    return json({ ok: true, redirect, ...(account ? { id: account.id, email: account.email, expiresAt: Date.now() + 86400000, ownerAccess: true, matrixOriginal: true } : {}) }, 200, cookies)
  }
}
