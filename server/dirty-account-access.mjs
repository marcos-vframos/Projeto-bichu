import {createHash,createHmac,randomBytes} from 'node:crypto'
import {ownerSession} from './team.mjs'
const MAIN='https://meu-bichu-app-production.up.railway.app'
const json=(data,status=200,headers={})=>Response.json(data,{status,headers:{'cache-control':'no-store',...headers}})
export async function dirtyAccountAccess(request,store,env){
 const path=new URL(request.url).pathname
 if(!['/api/pilot/lab-owner-session','/api/pilot/owner/account-directory'].includes(path))return null
 if(env.LAB_KIND!=='dirty')return json({error:'Disponível apenas no laboratório de testes sujos.'},404)
 if(path.endsWith('/lab-owner-session')){
  if(request.method!=='POST')return json({error:'Método não permitido'},405)
  const token=request.headers.get('cookie')?.match(/(?:^|;\s*)mb_pilot=([a-f0-9]{48})(?:;|$)/)?.[1]
  const account=token?store.raw.prepare("SELECT l.account_id FROM lab_accounts l JOIN pilot_sessions s ON s.account_id=l.account_id WHERE l.slot='dirty' AND l.active=1 AND s.token_hash=? AND s.expires_at>?").get(createHash('sha256').update(token).digest('hex'),Date.now()):null
  if(!account)return json({error:'Abra primeiro a conta de testes sujos pelo painel principal.'},403)
  // Explicit test-only elevation, signed with this isolated laboratory's own key.
  const data=(Date.now()+30*86400000)+'.'+randomBytes(24).toString('hex'),signature=createHmac('sha256',env.PILOT_PANEL_KEY).update(data).digest('hex')
  store.raw.prepare('INSERT INTO team_audit VALUES(?,?,?,?,?)').run(crypto.randomUUID(),'owner','open_dirty_test_panel',account.account_id,Date.now())
  return json({ok:true,localOnly:true},200,{'set-cookie':`mb_owner=${data}.${signature}; HttpOnly; SameSite=Strict; Path=/api; Max-Age=2592000${env.COOKIE_SECURE===false?'':'; Secure'}`})
 }
 if(request.method!=='GET')return json({error:'Método não permitido'},405)
 if(!await ownerSession(request,env.PILOT_PANEL_KEY))return json({error:'Acesso exclusivo do proprietário deste laboratório.'},403)
 return json({localKind:'dirty',groups:[
  {id:'matrix',label:'Matriz original · Piloto 01',description:'Conta real no aplicativo principal. Não faz parte dos indicadores deste laboratório.',links:[{label:'Abrir matriz original com o acesso master',url:MAIN+'/acesso-master?area=matriz'}]},
  {id:'beta',label:'Contas beta',description:'O painel principal consulta as contas e seus estados atuais. Nenhuma conta será ativada ao abrir este menu.',links:[{label:'Escolher beta principal',url:MAIN+'/painel/configuracoes'},{label:'Consultar as 20 contas beta adicionais',url:MAIN+'/painel/configuracoes'}]},
  {id:'dirty',label:'Testes sujos · ambiente atual',description:'Banco e arquivos isolados. Somente estas contas compõem os indicadores desta página.',accounts:store.raw.prepare('SELECT a.id,a.email,l.active FROM lab_accounts l JOIN pilot_accounts a ON a.id=l.account_id ORDER BY l.slot').all()}
 ]})
}
