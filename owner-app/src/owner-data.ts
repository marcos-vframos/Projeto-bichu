// Leitura entre Sites feita pelo navegador autenticado, com autorização curta de leitura.
export async function fetchOwnerData(path: string, options: RequestInit = {}) {
  if (!path.startsWith('/api/pilot/owner/')) throw new Error('Destino inválido')
  return fetch(path, {...options,method:'GET',credentials:'same-origin',cache:'no-store'})
}
export async function openOwnerFile(path: string) {
  const response = await fetchOwnerData(path)
  if (!response.ok) throw new Error('Não foi possível abrir a imagem')
  const url = URL.createObjectURL(await response.blob())
  const link = document.createElement('a'); link.href = url; link.target = '_blank'; link.rel = 'noopener'; link.click()
  setTimeout(() => URL.revokeObjectURL(url), 60000)
}

export async function respondFeedback(id:string,body:{message:string;status:string;replyId:string}) {
 const response=await fetch(`/api/team/cases/${encodeURIComponent(id)}/reply`,{method:'POST',credentials:'same-origin',headers:{'content-type':'application/json'},body:JSON.stringify(body)})
 if(!response.ok)throw Error((await response.json()).error||'Não foi possível salvar a resposta')
}
