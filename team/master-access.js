export async function enterMaster(credentials,request=fetch){
 const dirty=credentials.area==='dirty'
 const response=await request('/api/access/master/login',{method:'POST',credentials:'same-origin',headers:{'content-type':'application/json'},body:JSON.stringify({...credentials,area:dirty?'proprietario':credentials.area})})
 const data=await response.json()
 if(!response.ok)throw Error(data.error||'Não foi possível entrar.')
 if(!dirty)return data.redirect
 const opened=await request('/api/pilot/owner/labs/dirty/open',{method:'POST',credentials:'same-origin',headers:{'content-type':'application/json'},body:JSON.stringify({slot:'dirty'})})
 const lab=await opened.json()
 if(!opened.ok)throw Error(lab.error||'Não foi possível abrir a conta de testes sujos.')
 const url=new URL(lab.url)
 if(url.origin!=='https://bichu-testes-sujos-production.up.railway.app'||url.pathname!=='/'||!/^#lab=[a-f0-9]{48}$/.test(url.hash))throw Error('O laboratório retornou um endereço de acesso inválido.')
 return url.href
}
if(typeof document!=='undefined'){
 const form=document.getElementById('master-login'),message=document.getElementById('message'),submit=document.getElementById('submit'),area=document.getElementById('area')
 const requested=new URLSearchParams(location.search).get('area')
 if(['proprietario','matriz','funcionario','dirty'].includes(requested))area.value=requested
 form.addEventListener('submit',async event=>{
  event.preventDefault();submit.disabled=true;message.textContent='Verificando acesso…'
  const credentials=Object.fromEntries(new FormData(form));form.elements.password.value=''
  try{
   const redirect=await enterMaster(credentials)
   sessionStorage.removeItem('mb_offline_session');sessionStorage.removeItem('mb_active_account')
   // The master screen can be embedded in the owner's workspace. Switch the full context.
   window.top.location.assign(redirect)
  }catch(error){message.textContent=error.message;submit.disabled=false}
 })
}
