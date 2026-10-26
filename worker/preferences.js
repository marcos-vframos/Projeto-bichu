export async function preferencesApi(request,db,account){
 const reply=(v,status=200)=>Response.json(v,{status,headers:{'cache-control':'no-store'}}),id=`preferences_${account.id}`
 const row=await db.prepare('SELECT data FROM pilot_records WHERE id=? AND account_id=?').bind(id,account.id).first(),current=row?JSON.parse(row.data):{}
 if(request.method==='GET')return reply(current)
 if(!['PATCH','PUT'].includes(request.method))return reply({error:'Método não permitido'},405)
 if(request.method==='PUT'&&row)return reply({error:'Atualize o aplicativo para sincronizar com segurança.'},409)
 const body=await request.json(),changes=request.method==='PATCH'?body?.changes:body,base=request.method==='PATCH'?body?.base:{}
 const object=v=>v&&typeof v==='object'&&!Array.isArray(v)
 if(!object(changes)||!object(base)||JSON.stringify(changes).length>100000||Object.entries(changes).some(([k,v])=>!k.startsWith('bichu_')||(v!==null&&(typeof v!=='string'||v.length>20000)))||(request.method==='PATCH'&&Object.keys(changes).some(k=>!Object.hasOwn(base,k)||(base[k]!==null&&typeof base[k]!=='string'))))return reply({error:'Preferência inválida'},400)
 const conflicts=Object.keys(changes).filter(k=>(current[k]??null)!==(base[k]??null)&&(current[k]??null)!==changes[k])
 if(conflicts.length)return reply({error:'Alterado em outro aparelho',conflicts,values:current},409)
 const values={...current};for(const[k,v]of Object.entries(changes)){if(v===null)delete values[k];else values[k]=v}
 const data=JSON.stringify(values),now=new Date().toISOString();if(data.length>100000)return reply({error:'Personalizações grandes demais'},400)
 if(row?.data===data)return reply({ok:true,values})
 const result=row?await db.prepare('UPDATE pilot_records SET data=?,updated_at=? WHERE id=? AND account_id=? AND data=?').bind(data,now,id,account.id,row.data).run():await db.prepare("INSERT INTO pilot_records(id,account_id,collection,dog_id,data,created_at,updated_at) VALUES(?,?,'account_preferences',NULL,?,?,?) ON CONFLICT(id) DO NOTHING").bind(id,account.id,data,now,now).run()
 if((result.meta?.changes??result.changes)===0)return reply({error:'As personalizações mudaram durante o envio. Tente novamente.'},503)
 return reply({ok:true,values})
}
