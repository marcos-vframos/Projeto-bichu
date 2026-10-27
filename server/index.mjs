import {initLab,labManager,labsProxy} from './labs.mjs'
import {pilotMatrixManager} from './pilot-matrix.mjs'
import {accessApi} from './access.mjs'
import {recoveryManager} from './recovery.mjs'
import http from 'node:http'
import {migrateFromSource} from './migrate.mjs'
import { readFile } from 'node:fs/promises'
import { resolve, extname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { openStore, root } from './storage.mjs'
import { initTeam, teamApi, ownerSession } from './team.mjs'
import { handlePilot } from '../worker/pilot-api.js'
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.json': 'application/json',
}
export function createApplication(options = {}) {
  const settings = { ...process.env, ...options.env }
  if (
    settings.NODE_ENV === 'production' &&
    (!settings.DATA_DIR || !/^https:\/\/[^/]+$/.test(settings.APP_ORIGIN || ''))
  )
    throw Error('Production requires DATA_DIR and an HTTPS APP_ORIGIN')
  const store = options.store || openStore(settings.DATA_DIR || resolve(root, 'data'))
  initTeam(store.raw)
  initLab(store,settings)
  const env = { ...process.env, ...options.env, DB: store.DB, BUCKET: store.BUCKET }
  if (!/^[a-f0-9]{64}$/.test(env.PILOT_PANEL_KEY || ''))
    throw Error('PILOT_PANEL_KEY must contain 64 hex characters')
  const recovery=recoveryManager(store,settings)
  const labs=labManager(store,settings)
  const pilotMatrix=pilotMatrixManager(store,settings)
  async function dispatch(request) {
    const u = new URL(request.url),
      p = u.pathname
    if (p === '/healthz') return Response.json({ ok: true })
    if (p.startsWith('/api/')) {
      if (!['GET', 'HEAD'].includes(request.method) && request.headers.get('origin') !== u.origin)
        return Response.json({ error: 'Origem inválida' }, { status: 403 })
      if(p.startsWith('/api/lab/'))return labs.api(request)
      if(p==='/api/pilot/lab-evaluation'){const u=new URL(request.url);u.pathname='/api/lab/evaluation';return labs.api(new Request(u,request))}
      if(p.startsWith('/api/pilot/owner/labs')){
        if(!await ownerSession(request,env.PILOT_PANEL_KEY))return Response.json({error:'Exclusivo do proprietário'},{status:403})
        return labsProxy(request,env,store,pilotMatrix)
      }
      if(p.startsWith('/api/access/'))return accessApi(request,store,env)
      if(p.startsWith('/api/pilot/owner/recovery')){
        if(!await ownerSession(request,env.PILOT_PANEL_KEY))return Response.json({error:'Exclusivo do proprietário'},{status:403})
        if(p==='/api/pilot/owner/recovery'&&request.method==='GET')return Response.json(recovery.state(),{headers:{'cache-control':'no-store'}})
        if(p==='/api/pilot/owner/recovery/run'&&request.method==='POST'){if(recovery.state().running)return Response.json({error:'Backup em andamento'},{status:409});void recovery.run().catch(()=>{});return Response.json({started:true},{status:202})}
        if(p==='/api/pilot/owner/recovery/key'&&request.method==='GET'&&settings.BACKUP_ENCRYPTION_KEY)return new Response(settings.BACKUP_ENCRYPTION_KEY,{headers:{'content-type':'text/plain','cache-control':'no-store','content-disposition':'attachment; filename="meu-bichu-chave-recuperacao.txt"'}})
        return new Response(null,{status:405})
      }
      if (p === '/api/pilot/owner/tutor-accounts' || p === '/api/pilot/owner/tutor-access') {
        if (!await ownerSession(request,env.PILOT_PANEL_KEY)) return Response.json({error:'Abra seu link privado de proprietário'},{status:403,headers:{'cache-control':'no-store'}})
        if(p.endsWith('tutor-accounts') && request.method==='GET')return Response.json(store.raw.prepare('SELECT id,email FROM pilot_accounts ORDER BY email').all(),{headers:{'cache-control':'no-store'}})
        if(p.endsWith('tutor-access') && request.method==='POST'){
          const {accountId}=await request.json()
          if(typeof accountId!=='string'||!store.raw.prepare('SELECT 1 FROM pilot_accounts WHERE id=?').get(accountId))return Response.json({error:'Conta inválida'},{status:400})
          store.raw.prepare('INSERT INTO team_audit VALUES(?,?,?,?,?)').run(crypto.randomUUID(),'owner','open_tutor',accountId,Date.now())
          return Response.json({ok:true},{headers:{'cache-control':'no-store','set-cookie':`mb_owner_account=${encodeURIComponent(accountId)}; HttpOnly; SameSite=Strict; Path=/api; Max-Age=2592000${env.COOKIE_SECURE===false?'':'; Secure'}`}})
        }
        return new Response(null,{status:405})
      }
      if (
        p.startsWith('/api/team/') ||
        ['/api/pilot/owner/unlock', '/api/pilot/owner/session'].includes(p)
      )
        return teamApi(request, store, env)
      if (p === '/api/pilot/owner/logout' && request.method === 'POST')
        return Response.json(
          { ok: true },
          {
            headers: {
              'set-cookie': 'mb_owner=; HttpOnly; SameSite=Strict; Path=/api; Max-Age=0; Secure',
              'cache-control': 'no-store',
            },
          },
        )
      const headers = new Headers(request.headers)
      headers.delete('oai-authenticated-user-id')
      headers.delete('x-mb-owner-ticket')
      if (p.startsWith('/api/pilot/owner/')) {
        if (!(await ownerSession(request, env.PILOT_PANEL_KEY)))
          return Response.json({ error: 'Exclusivo do proprietário' }, { status: 403 })
        headers.set('oai-authenticated-user-id', 'd410baf1-83e0-4641-9a41-f44fc8c5025a')
      }
      if (!p.startsWith('/api/pilot/')) return new Response(null, { status: 404 })
      let requestEnv={...env,DB:store.withActor('tutor')}
      if(await ownerSession(request,env.PILOT_PANEL_KEY)){
        const selected=request.headers.get('cookie')?.split(';').map(x=>x.trim()).find(x=>x.startsWith('mb_owner_account='))?.slice('mb_owner_account='.length)
        if(selected){
          const account=store.raw.prepare('SELECT id,email,expires_at FROM pilot_accounts WHERE id=?').get(selected)
          if(account){
            requestEnv={...env,DB:store.withActor('owner'),OWNER_ACCESS_ACCOUNT:{...account,ownerAccess:true}}
            if(['/api/pilot/events','/api/pilot/device'].includes(p))return Response.json({ok:true,ownerAccess:true},{headers:{'cache-control':'no-store'}})
            if(p==='/api/pilot/logout' && request.method==='POST')return Response.json({ok:true},{headers:{'set-cookie':'mb_owner_account=; HttpOnly; SameSite=Strict; Path=/api; Max-Age=0; Secure','cache-control':'no-store'}})
          }
        }
      }
      return handlePilot(new Request(request, { headers }), requestEnv)
    }
    if(p==='/painel/configuracoes')return asset(resolve(root,'team/labs.html'))
    if(p==='/painel/seguranca')return asset(resolve(root,'team/recovery.html'))
    if (p === '/acesso-tutor')return asset(resolve(root,'team/tutor-access.html'))
    if (p === '/equipe')return asset(resolve(root,'team/index.html'))
    if (p === '/painel/registros')return asset(resolve(root,'team/audit.html'))
    if (p === '/painel/pendencias')return asset(resolve(root,'team/issues.html'))
    if (p === '/painel/equipe')return asset(resolve(root,'team/admin.html'))
    if (['/team-ui/audit-view.js','/team-ui/audit-page.js','/team-ui/task-board.js','/team-ui/issues.js','/team-ui/issue-client.js','/team-ui/activity-form.js','/team-ui/duties.js','/team-ui/shared.js','/team-ui/admin.js','/team-ui/staff.js','/team-ui/style.css'].includes(p))return asset(resolve(root,'team',p.split('/').pop()))
    if (p.startsWith('/models/') || p === '/bcs-fase14.html')
      return new Response('BCS inativo', { status: 404 })
    const owner = p === '/painel' || p.startsWith('/painel/') || p.startsWith('/owner-assets/'),
      base = resolve(root, owner ? 'owner-app/dist/client' : 'dist/client')
    let relative = owner
      ? p.startsWith('/owner-assets/')
        ? p.slice(1)
        : 'index.html'
      : p === '/'
        ? 'index.html'
        : decodeURIComponent(p.slice(1))
    const path = resolve(base, relative)
    if (!path.startsWith(base + '/')) return new Response(null, { status: 404 })
    try {
      return await asset(path)
    } catch (e) {
      if (e.code !== 'ENOENT' && e.code !== 'EISDIR') throw e
      if (request.headers.get('accept')?.includes('text/html'))
        return asset(resolve(base, 'index.html'))
      return new Response(null, { status: 404 })
    }
  }
  async function asset(path) {
    const bytes = await readFile(path)
    return new Response(bytes, {
      headers: {
        'content-type': MIME[extname(path)] || 'application/octet-stream',
        'cache-control':
          path.endsWith('.html') || path.endsWith('sw.js') || path.startsWith(resolve(root,'team')+'/') ? 'no-cache' : 'public, max-age=3600',
      },
    })
  }
  const server = http.createServer(async (req, res) => {
    try {
      const external =
        env.APP_ORIGIN || (env.NODE_ENV === 'production' ? null : `http://${req.headers.host}`)
      if (!external) throw Error('APP_ORIGIN required in production')
      let size = 0
      const chunks = []
      for await (const chunk of req) {
        size += chunk.length
        if (size > 6 * 1024 * 1024) {
          res.writeHead(413)
          res.end()
          return
        }
        chunks.push(chunk)
      }
      const headers = new Headers()
      for (const [k, v] of Object.entries(req.headers))
        if (v !== undefined) headers.set(k, Array.isArray(v) ? v.join(',') : v)
      const request = new Request(new URL(req.url, external), {
        method: req.method,
        headers,
        body: ['GET', 'HEAD'].includes(req.method) ? undefined : Buffer.concat(chunks),
      })
      const response = await dispatch(request)
      res.statusCode = response.status
      for (const [k, v] of response.headers) res.setHeader(k, v)
      if (new URL(req.url, external).pathname.startsWith('/api/'))
        res.setHeader('Cache-Control', 'no-store')
      res.setHeader('X-Content-Type-Options', 'nosniff')
      res.setHeader('Referrer-Policy', 'same-origin')
      res.setHeader('X-Frame-Options', 'SAMEORIGIN')
      res.setHeader('Content-Security-Policy', "frame-ancestors 'self'")
      res.end(req.method === 'HEAD' ? undefined : Buffer.from(await response.arrayBuffer()))
    } catch (e) {
      console.error('Request failed:', e.name)
      res.writeHead(500, { 'content-type': 'application/json', 'cache-control': 'no-store' })
      res.end('{"error":"Serviço temporariamente indisponível"}')
    }
  })
  return { store, dispatch, server, recovery, labs, pilotMatrix }
}
if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  await migrateFromSource(process.env)
  const app = createApplication()
  app.server.listen(Number(process.env.PORT || 8080), '0.0.0.0')
  app.recovery.start()
  app.labs.start()
  app.pilotMatrix.start()
  const shutdown = () =>
    app.server.close(() => {
      app.recovery.stop()
      app.store.close()
      process.exit(0)
    })
  process.on('SIGTERM', shutdown)
  process.on('SIGINT', shutdown)
}
