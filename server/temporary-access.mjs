import {createHash,randomBytes} from 'node:crypto'
import {ownerSession} from './team.mjs'
const day=86400000,hash=value=>createHash('sha256').update(value).digest('hex')
const reply=(data,status=200,headers={})=>Response.json(data,{status,headers:{'cache-control':'no-store',...headers}})
function target(db,env,role,id){
 if(role==='staff')return db.prepare('SELECT id,name AS label FROM team_users WHERE id=? AND active=1').get(id)
 if(role!=='tutor')return null
 if(env.LAB_KIND&&!db.prepare('SELECT 1 FROM lab_accounts WHERE account_id=? AND active=1').get(id))return null
 return db.prepare('SELECT id,email AS label FROM pilot_accounts WHERE id=?').get(id)
}
function audit(db,actor,action,id,details){
 const event=crypto.randomUUID(),name=actor==='owner'?'Proprietário':db.prepare('SELECT name FROM team_users WHERE id=?').get(actor)?.name||'Tutor'
 db.prepare('INSERT INTO team_audit VALUES(?,?,?,?,?)').run(event,actor,action,id,Date.now())
 db.prepare('INSERT INTO team_audit_details VALUES(?,?)').run(event,JSON.stringify({...details,actorName:name}))
}
export function hasTemporaryTutorCookie(req,db){
 const token=req.headers.get('cookie')?.match(/(?:^|;\s*)mb_pilot=([a-f0-9]{48})\b/)?.[1]
 return !!token&&!!db.prepare("SELECT 1 FROM temporary_access_sessions WHERE role='tutor' AND token_hash=?").get(hash(token))
}
export function clearTemporaryTutorSession(req,db){
 const token=req.headers.get('cookie')?.match(/(?:^|;\s*)mb_pilot=([a-f0-9]{48})\b/)?.[1]
 if(!token||!hasTemporaryTutorCookie(req,db))return
 db.prepare('DELETE FROM pilot_sessions WHERE token_hash=?').run(hash(token))
 db.prepare("DELETE FROM temporary_access_sessions WHERE role='tutor' AND token_hash=?").run(hash(token))
}
export async function temporaryAccessApi(req,store,env){
 const db=store.raw,path=new URL(req.url).pathname
 if(path==='/api/access/temporary/enter'){
  if(req.method!=='POST')return reply({error:'Método não permitido'},405)
  const body=await req.json().catch(()=>null)
  if(!/^[a-f0-9]{64}$/.test(body?.token||''))return reply({error:'Link temporário inválido, expirado ou revogado.'},403)
  db.exec('BEGIN IMMEDIATE')
  try{
   const now=Date.now(),link=db.prepare('SELECT * FROM temporary_access_links WHERE token_hash=? AND revoked_at IS NULL AND expires_at>?').get(hash(body.token),now)
   if(!link||!target(db,env,link.role,link.subject_id)){db.exec('ROLLBACK');return reply({error:'Link temporário inválido, expirado ou revogado.'},403)}
   const token=randomBytes(24).toString('hex'),digest=hash(token),table=link.role==='tutor'?'pilot_sessions':'team_sessions'
   db.prepare(`INSERT INTO ${table} VALUES(?,?,?)`).run(digest,link.subject_id,link.expires_at)
   db.prepare('INSERT INTO temporary_access_sessions VALUES(?,?,?)').run(link.role,digest,link.id)
   db.prepare('UPDATE temporary_access_links SET last_used_at=? WHERE id=?').run(now,link.id)
   audit(db,link.role==='staff'?link.subject_id:'tutor','temporary_access_enter',link.id,{role:link.role,subjectId:link.subject_id})
   db.exec('COMMIT')
   return reply({ok:true,role:link.role,expiresAt:link.expires_at},200,{'set-cookie':`${link.role==='tutor'?'mb_pilot':'mb_team'}=${token}; HttpOnly; SameSite=Strict; Path=${link.role==='tutor'?'/api/pilot':'/api'}; Max-Age=${Math.max(1,Math.floor((link.expires_at-now)/1000))}${env.COOKIE_SECURE===false?'':'; Secure'}`})
  }catch(error){db.exec('ROLLBACK');throw error}
 }
 if(!await ownerSession(req,env.PILOT_PANEL_KEY))return reply({error:'Exclusivo do proprietário'},403)
 if(path==='/api/pilot/owner/access-links/targets'&&req.method==='GET'){
  const tutors=env.LAB_KIND?db.prepare('SELECT a.id,a.email AS label FROM pilot_accounts a JOIN lab_accounts l ON l.account_id=a.id WHERE l.active=1 ORDER BY a.email').all():db.prepare('SELECT id,email AS label FROM pilot_accounts ORDER BY email').all()
  return reply({tutors,staff:db.prepare('SELECT id,name AS label FROM team_users WHERE active=1 ORDER BY name').all()})
 }
 if(path==='/api/pilot/owner/access-links'&&req.method==='GET')return reply({items:db.prepare(`SELECT l.id,l.role,l.subject_id AS subjectId,l.created_at AS createdAt,l.expires_at AS expiresAt,l.revoked_at AS revokedAt,l.last_used_at AS lastUsedAt,CASE WHEN l.role='tutor' THEN a.email ELSE u.name END AS label FROM temporary_access_links l LEFT JOIN pilot_accounts a ON l.role='tutor' AND a.id=l.subject_id LEFT JOIN team_users u ON l.role='staff' AND u.id=l.subject_id ORDER BY l.created_at DESC LIMIT 250`).all()})
 if(path==='/api/pilot/owner/access-links'&&req.method==='POST'){
  const body=await req.json().catch(()=>null)
  if(!body||!['tutor','staff'].includes(body.role)||typeof body.subjectId!=='string'||![1,7,30].includes(body.days))return reply({error:'Escolha uma conta e uma validade de 1, 7 ou 30 dias.'},400)
  db.exec('BEGIN IMMEDIATE')
  try{
   const subject=target(db,env,body.role,body.subjectId)
   if(!subject){db.exec('ROLLBACK');return reply({error:'Conta indisponível ou funcionário desativado.'},400)}
   const id=crypto.randomUUID(),token=randomBytes(32).toString('hex'),now=Date.now(),expiresAt=now+body.days*day
   db.prepare('INSERT INTO temporary_access_links(id,token_hash,role,subject_id,created_at,expires_at) VALUES(?,?,?,?,?,?)').run(id,hash(token),body.role,body.subjectId,now,expiresAt)
   audit(db,'owner','temporary_access_create',id,{role:body.role,subjectId:body.subjectId,expiresAt})
   db.exec('COMMIT')
   const origin=new URL(req.url).origin
   return reply({id,role:body.role,label:subject.label,expiresAt,url:origin+(body.role==='staff'?'/equipe?acesso=funcionario':'/')+'#entrada='+token},201)
  }catch(error){db.exec('ROLLBACK');throw error}
 }
 const revoke=path.match(/^\/api\/pilot\/owner\/access-links\/([a-f0-9-]{36})\/revoke$/)
 if(revoke&&req.method==='POST'){
  db.exec('BEGIN IMMEDIATE')
  try{
   const link=db.prepare('SELECT * FROM temporary_access_links WHERE id=?').get(revoke[1])
   if(!link){db.exec('ROLLBACK');return reply({error:'Link não encontrado'},404)}
   if(!link.revoked_at){
    const table=link.role==='tutor'?'pilot_sessions':'team_sessions'
    db.prepare(`DELETE FROM ${table} WHERE token_hash IN (SELECT token_hash FROM temporary_access_sessions WHERE link_id=? AND role=?)`).run(link.id,link.role)
    db.prepare('UPDATE temporary_access_links SET revoked_at=? WHERE id=?').run(Date.now(),link.id)
    audit(db,'owner','temporary_access_revoke',link.id,{role:link.role,subjectId:link.subject_id})
   }
   db.exec('COMMIT');return reply({ok:true})
  }catch(error){db.exec('ROLLBACK');throw error}
 }
 return reply({error:'Rota indisponível'},404)
}
