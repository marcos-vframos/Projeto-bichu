import {createHash,createHmac} from 'node:crypto'
const hash=x=>createHash('sha256').update(x).digest('hex'),hmac=(k,x)=>createHmac('sha256',k).update(x).digest()
export async function s3(env,method,key='',body,options={}){
 const host=new URL(env.BACKUP_ENDPOINT),bucket=env.BACKUP_BUCKET
 if(host.protocol!=='https:')throw Error('Backup requires HTTPS')
 host.hostname=bucket+'.'+host.hostname;host.pathname='/'+key.split('/').map(encodeURIComponent).join('/')
 for(const[k,v]of Object.entries(options.query||{}))host.searchParams.set(k,v)
 const date=new Date().toISOString().replace(/[:-]|\.\d{3}/g,''),day=date.slice(0,8),region=env.BACKUP_REGION||'auto',scope=`${day}/${region}/s3/aws4_request`,payload=options.hash||hash(body||'')
 const headers={'host':host.host,'x-amz-content-sha256':payload,'x-amz-date':date},names=Object.keys(headers).sort(),canonical=names.map(k=>`${k}:${headers[k]}\n`).join(''),query=[...host.searchParams].sort(([a],[b])=>a.localeCompare(b)).map(([k,v])=>`${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join('&')
 const request=[method,host.pathname,query,canonical,names.join(';'),payload].join('\n'),signing=hmac(hmac(hmac(hmac('AWS4'+env.BACKUP_SECRET_ACCESS_KEY,day),region),'s3'),'aws4_request'),signature=hmac(signing,`AWS4-HMAC-SHA256\n${date}\n${scope}\n${hash(request)}`).toString('hex')
 const r=await fetch(host,{method,headers:{...headers,authorization:`AWS4-HMAC-SHA256 Credential=${env.BACKUP_ACCESS_KEY_ID}/${scope}, SignedHeaders=${names.join(';')}, Signature=${signature}`},body,duplex:body?'half':undefined,redirect:'error',signal:AbortSignal.timeout(300000)})
 if(!r.ok)throw Error(`Backup storage HTTP ${r.status}`)
 return r
}
