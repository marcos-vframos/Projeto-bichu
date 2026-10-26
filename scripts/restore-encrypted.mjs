import {unpack} from '../server/recovery.mjs'
const[file,destination]=process.argv.slice(2)
if(!file||!destination||!process.env.BACKUP_ENCRYPTION_KEY)throw Error('Informe arquivo, pasta vazia e BACKUP_ENCRYPTION_KEY no ambiente. Nunca restaure sobre produção ativa.')
console.log(JSON.stringify(await unpack(file,process.env.BACKUP_ENCRYPTION_KEY,destination),null,2))
