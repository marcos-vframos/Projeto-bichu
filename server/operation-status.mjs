import {mailConfigured,LEGAL_VERSION} from './access.mjs'

// Owner-only operational evidence. Never return credential values or claim mail delivery.
export function operationStatus(store,env,backup){
 const mailKeys=['SMTP_HOST','SMTP_USER','SMTP_PASSWORD','SMTP_FROM']
 const mailReady=mailConfigured(env)
 const verifiedAt=backup.last?.verifiedAt||null
 const recent=Boolean(verifiedAt&&Date.now()-Date.parse(verifiedAt)<12*3600000)
 return {
  registration:{enabled:env.PUBLIC_REGISTRATION==='true'&&mailReady,permanent:true,emailConfirmation:true},
  email:{configured:mailReady,missing:mailReady?[]:mailKeys.filter(key=>!env[key]),deliveryVerified:false},
  employees:{active:store.raw.prepare('SELECT COUNT(*) n FROM team_users WHERE active=1').get().n,withoutPermissions:store.raw.prepare("SELECT COUNT(*) n FROM team_users u LEFT JOIN team_permissions p ON p.user_id=u.id WHERE u.active=1 AND (p.permissions IS NULL OR p.permissions='[]')").get().n,newAccountDefault:'Sem atribuições',individualAccounts:true},
  master:{administrationOnly:true},
  backup:{configured:backup.configured,verifiedAt,recent,error:backup.error,scope:'Fora do volume, na mesma conta Railway',intervalHours:backup.intervalHours,retentionDays:backup.retentionDays},
  privacy:{legalVersion:LEGAL_VERSION,supportEmail:'suportemeubichu@gmail.com',accountDeletion:'/excluir-conta.html',policy:'/privacidade.html',terms:'/termos.html'},
  manualChecks:['Comprovar entrega real de confirmação e recuperação de senha.','Conferir o nome civil completo do controlador nos documentos públicos.','Guardar a chave de recuperação fora da hospedagem e manter cópia em conta ou provedor independente.','Na restauração de desastre, reaplicar exclusões posteriores ao snapshot antes de reabrir o serviço.']
 }
}
