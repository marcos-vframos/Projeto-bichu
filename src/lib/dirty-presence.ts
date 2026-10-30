export const dirtyPresenceEnabled=()=>sessionStorage.getItem('mb_lab_kind')==='dirty'
export function petDestination(path:string,id:string){
 if(/^\/caes\/[^/]+(?:\/(?:peso|plano|saude|editar))?$/.test(path)&&!['/caes/novo'].includes(path))return path.replace(/^\/caes\/[^/]+/,`/caes/${encodeURIComponent(id)}`)
 return path==='/rotina-da-casa'?'/':path
}
