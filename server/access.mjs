import {randomBytes,createHash} from 'node:crypto'
import {passwordHash} from './team.mjs'
export const LEGAL_VERSION='2026-10-26'
const sha=s=>createHash('sha256').update(s).digest('hex'),token=()=>randomBytes(32).toString('hex'),ok=(x,status=200)=>Response.json(x,{status,headers:{'cache-control':'no-store'}})
export const mailConfigured=e=>Boolean(e.SEND_MAIL||(e.SMTP_HOST&&e.SMTP_USER&&e.SMTP_PASSWORD&&e.SMTP_FROM))
async function send(env,to,subject,text){if(env.SEND_MAIL)return env.SEND_MAIL({to,subject,text});const {default:mailer}=await import('nodemailer');const port=Number(env.SMTP_PORT||465);const transport=mailer.createTransport({host:env.SMTP_HOST,port,secure:port===465,requireTLS:port!==465,auth:{user:env.SMTP_USER,pass:env.SMTP_PASSWORD},connectionTimeout:10000,greetingTimeout:10000,socketTimeout:20000});try{await transport.sendMail({from:env.SMTP_FROM,to,subject,text})}finally{transport.close()}}
function limit(db,id,max){const now=Date.now(),row=db.prepare('SELECT * FROM access_limits WHERE id=?').get(id);if(row&&now-row.window_at<3600000&&row.hits>=max)return false;db.prepare('INSERT INTO access_limits VALUES(?,?,1) ON CONFLICT(id) DO UPDATE SET window_at=excluded.window_at,hits=?').run(id,row&&now-row.window_at<3600000?row.window_at:now,row&&now-row.window_at<3600000?row.hits+1:1);return true}
function validPassword(p){return typeof p==='string'&&p.length>=12&&p.length<=128}
async function issue(db,env,purpose,subject,payload,millis){const value=token(),now=Date.now();db.prepare('DELETE FROM access_tokens WHERE expires_at<? OR (subject=? AND purpose=?)').run(now,subject,purpose);db.prepare('INSERT INTO access_tokens VALUES(?,?,?,?,?,?)').run(sha(value),purpose,subject,JSON.stringify(payload),now+millis,now);const url=env.APP_ORIGIN+'/acesso.html'+(purpose==='reset_staff'?'?tipo=funcionario':'')+'#'+(purpose==='verify_tutor'?'verify':'reset')+'='+value;try{await send(env,subject,purpose==='verify_tutor'?'Confirme sua conta Meu Bichu':'Recupere seu acesso Meu Bichu',`Abra o link para ${purpose==='verify_tutor'?'confirmar seu e-mail':'definir uma nova senha'}:\n${url}\n\nEste link é individual e de uso único. Se você não solicitou, ignore esta mensagem. Suporte: suportemeubichu@gmail.com`)}catch{db.prepare('DELETE FROM access_tokens WHERE token_hash=?').run(sha(value));throw Error('Não foi possível enviar o e-mail. Tente novamente mais tarde.') }}
export async function accessApi(req,store,env){const p=new URL(req.url).pathname,db=store.raw
 if(p==='/api/access/config'&&req.method==='GET')return ok({registrationEnabled:env.PUBLIC_REGISTRATION==='true'&&mailConfigured(env),recoveryEnabled:mailConfigured(env),supportEmail:'suportemeubichu@gmail.com',legalVersion:LEGAL_VERSION})
 if(req.method!=='POST')return ok({error:'Método não permitido'},405)
 let b;try{b=await req.json()}catch{return ok({error:'Dados inválidos'},400)}
 db.prepare('DELETE FROM access_limits WHERE window_at<?').run(Date.now()-86400000)
 if(!limit(db,'global:'+p,200))return ok({error:'Muitas solicitações. Tente mais tarde.'},429)
 if(p==='/api/access/register'||p==='/api/access/recover'){
 const email=String(b.email||'').trim().toLowerCase();if(email.length>120||! /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))return ok({error:'E-mail inválido'},400)
 if(!limit(db,p+':'+sha(email),3))return ok({error:'Aguarde antes de solicitar outro e-mail.'},429)
 if(!mailConfigured(env))return ok({error:'Envio automático de e-mail ainda não está configurado. Contate suportemeubichu@gmail.com.'},503)
 if(p.endsWith('/register')){
 if(env.PUBLIC_REGISTRATION!=='true')return ok({error:'O cadastro público ainda não foi liberado.'},503)
 if(!validPassword(b.password)||typeof b.name!=='string'||!b.name.trim()||b.name.length>80||b.legalVersion!==LEGAL_VERSION||b.accepted!==true||b.adult!==true)return ok({error:'Informe nome, senha de 12 a 128 caracteres e aceite os termos como maior de 18 anos.'},400)
 if(!db.prepare('SELECT 1 FROM pilot_accounts WHERE email=?').get(email)){
 const salt=token();try{await issue(db,env,'verify_tutor',email,{salt,hash:await passwordHash(b.password,salt),name:b.name.trim(),legalVersion:LEGAL_VERSION,acceptedAt:Date.now()},86400000)}catch(e){return ok({error:e.message},503)}
 }
 return ok({message:'Se este e-mail puder ser cadastrado, você receberá um link de confirmação válido por 24 horas. Se já possui conta, entre ou recupere a senha.'})
 }
 const staff=b.kind==='staff',row=db.prepare(staff?'SELECT id,active FROM team_users WHERE email=?':'SELECT id FROM pilot_accounts WHERE email=?').get(email)
 if(row&&(!staff||row.active))try{await issue(db,env,staff?'reset_staff':'reset_tutor',email,{id:row.id},1800000)}catch(e){return ok({error:e.message},503)}
 return ok({message:'Se houver uma conta elegível, o link de recuperação chegará ao e-mail cadastrado. Ele expira em 30 minutos.'})
 }
 if(!['/api/access/verify','/api/access/reset'].includes(p)||! /^[a-f0-9]{64}$/.test(b.token||''))return ok({error:'Link inválido'},400)
 const row=db.prepare('SELECT * FROM access_tokens WHERE token_hash=?').get(sha(b.token));if(!row||row.expires_at<=Date.now())return ok({error:'Link inválido, utilizado ou expirado. Faça uma nova solicitação.'},400)
 if(p.endsWith('/verify')&&row.purpose!=='verify_tutor'||p.endsWith('/reset')&&!row.purpose.startsWith('reset_'))return ok({error:'Link inválido'},400)
 if(p.endsWith('/reset')&&!validPassword(b.password))return ok({error:'Use uma senha de 12 a 128 caracteres.'},400)
 const data=JSON.parse(row.payload),salt=token(),hash=p.endsWith('/reset')?await passwordHash(b.password,salt):null
 db.exec('BEGIN IMMEDIATE');try{
 // Recheck after the asynchronous password calculation, then consume once.
 const current=db.prepare('SELECT * FROM access_tokens WHERE token_hash=? AND expires_at>?').get(row.token_hash,Date.now());if(!current){db.exec('ROLLBACK');return ok({error:'Link utilizado ou expirado'},400)}
 if(row.purpose==='verify_tutor'){
 const id=crypto.randomUUID(),now=Date.now();if(db.prepare('SELECT 1 FROM pilot_accounts WHERE email=?').get(row.subject)){db.exec('ROLLBACK');return ok({error:'Conta já existente. Entre ou recupere sua senha.'},409)}
 db.prepare("INSERT INTO pilot_accounts(id,email,password_salt,password_hash,expires_at,created_at,account_kind,legal_version,legal_accepted_at) VALUES(?,?,?,?,?,?,'public',?,?)").run(id,row.subject,data.salt,data.hash,253402300799000,now,data.legalVersion,data.acceptedAt)
 db.prepare("INSERT INTO pilot_records(id,account_id,collection,data,created_at,updated_at) VALUES(?,?,'account_preferences',?,?,?)").run('preferences_'+id,id,JSON.stringify({bichu_tutor_name:data.name,bichu_privacy_analytics:'false'}),new Date(now).toISOString(),new Date(now).toISOString())
 }else{
 const staff=row.purpose==='reset_staff',table=staff?'team_users':'pilot_accounts',user=db.prepare(`SELECT id FROM ${table} WHERE id=? AND email=?${staff?' AND active=1':''}`).get(data.id,row.subject)
 if(!user){db.exec('ROLLBACK');return ok({error:'Conta indisponível'},400)}
 db.prepare(staff?'UPDATE team_users SET salt=?,password_hash=? WHERE id=?':'UPDATE pilot_accounts SET password_salt=?,password_hash=? WHERE id=?').run(salt,hash,data.id)
 db.prepare(staff?'DELETE FROM team_sessions WHERE user_id=?':'DELETE FROM pilot_sessions WHERE account_id=?').run(data.id)
 db.prepare('UPDATE temporary_access_links SET revoked_at=? WHERE role=? AND subject_id=? AND revoked_at IS NULL').run(Date.now(),staff?'staff':'tutor',data.id)
 db.prepare(staff?'DELETE FROM team_attempts WHERE email=?':'DELETE FROM pilot_login_attempts WHERE email=?').run(row.subject)
 }
 db.prepare('DELETE FROM access_tokens WHERE subject=?').run(row.subject);db.exec('COMMIT')
 return ok({message:row.purpose==='verify_tutor'?'Conta confirmada. Você já pode entrar.':'Senha alterada. Entre novamente em seus aparelhos.'})
 }catch(e){db.exec('ROLLBACK');throw e}
}
