import {$,el,button,privateAccess,show} from './shared.js'
let targets={tutors:[],staff:[]}
async function request(path='',body){
 const response=await fetch('/api/pilot/owner/access-links'+path,{method:body?'POST':'GET',credentials:'same-origin',cache:'no-store',headers:body?{'content-type':'application/json'}:{},body:body?JSON.stringify(body):undefined})
 const data=await response.json();if(!response.ok)throw Error(data.error||'Não foi possível consultar os acessos');return data
}
function choices(){
 const list=$('#role').value==='tutor'?targets.tutors:targets.staff
 $('#subject').replaceChildren(...list.map(target=>{const option=el('option',target.label);option.value=target.id;return option}))
 $('#generate').disabled=!list.length
}
async function reload(){
 targets=await request('/targets');choices()
 const {items}=await request();$('#links').replaceChildren()
 if(!items.length)$('#links').append(el('p','Nenhum link emitido ainda.'))
 for(const item of items){
  const active=!item.revokedAt&&item.expiresAt>Date.now(),row=el('article',undefined,'panel')
  row.append(el('strong',(item.role==='tutor'?'Tutor · ':'Funcionário · ')+(item.label||'Conta removida')),el('p',(item.revokedAt?'Revogado':active?'Ativo':'Expirado')+' · validade: '+new Date(item.expiresAt).toLocaleString('pt-BR')))
  if(item.lastUsedAt)row.append(el('p','Última entrada: '+new Date(item.lastUsedAt).toLocaleString('pt-BR'),'muted'))
  if(active)row.append(button('Revogar link e encerrar suas sessões',async()=>{await request('/'+item.id+'/revoke',{});await reload();if($('#new-link').dataset.id===item.id){$('#new-link').hidden=true;$('#link-value').value=''}show('Link revogado e sessões correspondentes encerradas.')}))
  $('#links').append(row)
 }
}
$('#role').onchange=choices
$('#create-link').onsubmit=async event=>{
 event.preventDefault();$('#generate').disabled=true
 try{
  const form=new FormData(event.currentTarget),data=await request('',{role:form.get('role'),subjectId:form.get('subjectId'),days:Number(form.get('days'))})
  $('#link-value').value=data.url;$('#open-link').href=data.url;$('#new-description').textContent=data.label+' · válido até '+new Date(data.expiresAt).toLocaleString('pt-BR');$('#new-link').dataset.id=data.id;$('#new-link').hidden=false
  await reload();show('Link individual criado. Copie-o ou abra a conta.');$('#link-value').focus();$('#link-value').select()
 }catch(error){show(error.message)}finally{choices()}
}
$('#copy').onclick=async()=>{try{await navigator.clipboard.writeText($('#link-value').value);show('Link copiado.')}catch{$('#link-value').focus();$('#link-value').select();show('Selecione e copie o link destacado.')}}
$('#refresh').onclick=()=>reload().catch(error=>show(error.message))
try{const me=await privateAccess();if(me.role!=='owner')throw Error('Área exclusiva do proprietário.');await reload();$('#content').hidden=false;show('Escolha a conta para gerar um acesso sem senha.')}catch(error){show(error.message)}
