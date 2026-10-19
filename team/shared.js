export const $ = (selector) => document.querySelector(selector)
export const show = (message) => {
  $('#status').textContent = message || ''
}
export function el(tag, value, className) {
  const node = document.createElement(tag)
  if (value !== undefined) node.textContent = value
  if (className) node.className = className
  return node
}
export function button(label, action, className = 'secondary') {
  const node = el('button', label, className)
  node.type = 'button'
  node.onclick = async () => {
    node.disabled = true
    try {
      await action()
    } catch (error) {
      show(error.message)
    } finally {
      node.disabled = false
    }
  }
  return node
}
export async function api(path, body, method) {
  const response = await fetch('/api/team/' + path, {
    method: method || (body ? 'POST' : 'GET'),
    credentials: 'same-origin',
    cache: 'no-store',
    headers: body ? { 'content-type': 'application/json' } : {},
    body: body ? JSON.stringify(body) : undefined,
  })
  const data = await response.json()
  if (!response.ok) throw Error(data.error || 'Não foi possível concluir')
  return data
}
export async function privateAccess() {
  const token = new URLSearchParams(location.hash.slice(1)).get('access')
  if (token) {
    history.replaceState(null, '', location.pathname + location.search)
    const response = await fetch('/api/pilot/owner/unlock', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ token }),
    })
    if (!response.ok) throw Error('Link privado inválido')
  }
  return api('me')
}
export const statusName = (value) =>
  ({
    recebido: 'Recebido',
    em_avaliacao: 'Em avaliação',
    respondido: 'Respondido',
    resolvido: 'Resolvido',
    pendente: 'Pendente',
    em_andamento: 'Em andamento',
    concluida: 'Concluída',
  })[value] ||
  value ||
  'Recebido'
export const date = (value) =>
  value
    ? new Date(
        typeof value === 'string' && value.length === 10 ? value + 'T12:00:00' : value,
      ).toLocaleString(
        'pt-BR',
        typeof value === 'string' && value.length === 10
          ? { dateStyle: 'short' }
          : { dateStyle: 'short', timeStyle: 'short' },
      )
    : 'Sem prazo'
export function assignment(users, value) {
  const select = el('select')
  select.setAttribute('aria-label', 'Responsável')
  const none = el('option', 'Proprietário / sem atribuição')
  none.value = ''
  select.append(none)
  for (const user of users.filter((u) => u.active)) {
    const option = el('option', user.name)
    option.value = user.id
    select.append(option)
  }
  select.value = value || ''
  return select
}
