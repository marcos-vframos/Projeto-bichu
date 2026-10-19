// Este Site tem política de plataforma restrita ao proprietário.
// A identidade encaminhada é específica deste Site; não é o ID da conta ou do app dos tutores.
const OWNER_SESSION_MS=30*86400000
const encoder=new TextEncoder()
function answer(data,status=200,headers={}) {return Response.json(data,{status,headers:{'cache-control':'no-store',...headers}})}
function hex(bytes) { return [...bytes].map(b => b.toString(16).padStart(2, '0')).join('') }
function randomSecret() { return hex(crypto.getRandomValues(new Uint8Array(24))) }
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

export default { async fetch(request, env) {
  const url = new URL(request.url)
  if (url.pathname.startsWith('/api/')) {
    if (!['GET','HEAD'].includes(request.method) && request.headers.get('origin') !== url.origin) return answer({error:'Origem inválida'},403)
    if (url.pathname === '/api/pilot/owner/unlock' && request.method === 'POST') {
      const { token } = await request.json()
      if (!env.PILOT_PANEL_KEY || token !== env.PILOT_PANEL_KEY) return answer({error:'Link administrativo inválido'},403)
      return answer({ok:true},200,{'set-cookie':`mb_owner=${await panelCookie(env.PILOT_PANEL_KEY)}; HttpOnly; Secure; SameSite=Strict; Path=/api/pilot/owner; Max-Age=${OWNER_SESSION_MS/1000}`})
    }
    if (!request.headers.get('oai-authenticated-user-id') && !await validPanelCookie(request,env.PILOT_PANEL_KEY)) return answer({error:'Acesso exclusivo do proprietário'},403)
    if (url.pathname === '/api/pilot/owner/session' && request.method === 'GET') return answer({authorized:true})
    if (url.pathname === '/api/pilot/owner/lock' && request.method === 'POST') return answer({ok:true},200,{'set-cookie':'mb_owner=; HttpOnly; Secure; SameSite=Strict; Path=/api/pilot/owner; Max-Age=0'})
    if (url.pathname === '/api/pilot/owner/feedback-ticket' && request.method === 'POST') {
      if(!env.PILOT_BRIDGE_KEY || !env.PILOT_DATA_ORIGIN)return answer({error:'Conexão indisponível'},503)
      const {id,body}=await request.json()
      if(typeof id!=='string'||!/^[a-f0-9-]{36}$/.test(id)||typeof body!=='object'||!body||typeof body.message!=='string'||body.message.length>2000||!['em_avaliacao','respondido','resolvido'].includes(body.status)||typeof body.replyId!=='string'||!/^[a-f0-9-]{36}$/.test(body.replyId))return answer({error:'Resposta inválida'},400)
      const content=JSON.stringify({message:body.message,status:body.status,replyId:body.replyId})
      const hash=hex(new Uint8Array(await crypto.subtle.digest('SHA-256',encoder.encode(content))))
      const path=`/api/pilot/owner/feedback/${id}/reply`
      const payload=JSON.stringify({aud:'owner-feedback-reply',path,hash,exp:Date.now()+120000,nonce:randomSecret()})
      const signature=hex(new Uint8Array(await crypto.subtle.sign('HMAC',await panelSigningKey(env.PILOT_BRIDGE_KEY),encoder.encode(payload))))
      return answer({origin:env.PILOT_DATA_ORIGIN,path,content,ticket:`${hex(encoder.encode(payload))}.${signature}`})
    }
    if (url.pathname === '/api/pilot/owner/data-ticket' && request.method === 'GET') {
      if (!env.PILOT_BRIDGE_KEY || !env.PILOT_DATA_ORIGIN) return answer({error:'Conexão de dados indisponível'},503)
      const payload = JSON.stringify({ aud: 'owner-read', exp: Date.now() + 120000, nonce: randomSecret() })
      const signature = hex(new Uint8Array(await crypto.subtle.sign('HMAC', await panelSigningKey(env.PILOT_BRIDGE_KEY), encoder.encode(payload))))
      return answer({origin:env.PILOT_DATA_ORIGIN,ticket:`${hex(encoder.encode(payload))}.${signature}`})
    }
    if (request.method !== 'GET'  || !/^\/api\/pilot\/owner\/(dashboard|participants|activity|records|changes|files\/[^/]+\/[^/]+)$/.test(url.pathname)) return answer({error:'Rota desconhecida'},404)
    if (!env.PILOT_BRIDGE_KEY || !env.PILOT_DATA_ORIGIN) return answer({error:'Conexão de dados indisponível'},503)
    try {
      const response=await fetch(`${env.PILOT_DATA_ORIGIN}${url.pathname}${url.search}`,{headers:{authorization:`Bearer ${env.PILOT_BRIDGE_KEY}`},redirect:'error'})
      return new Response(response.body,{status:response.status,headers:{'content-type':response.headers.get('content-type') || 'application/json','cache-control':'no-store','x-content-type-options':'nosniff'}})
    } catch {return answer({error:'Não foi possível consultar o banco dos participantes'},502)}
  }
  const asset=await env.ASSETS.fetch(request)
  if(asset.status !== 404) return asset
  return env.ASSETS.fetch(new Request(new URL('/',url),request))
} }
