import { $, el, button, api, privateAccess, show, date } from './shared.js'
import { urgency, issueState, issueHistory } from './issue-client.js'
import { showContext } from './activity-form.js'
let selected = null,
  people = [],
  items = [],
  offset = null,
  queueSerial = 0,
  detailSerial = 0
const dirty = () =>
  [...document.querySelectorAll('#issue-detail textarea')].some((x) => x.value !== x.defaultValue)
async function reporters() {
  people = await api('issues/reporters')
  $('#reporters').replaceChildren(
    ...people.map((user) => {
      const card = button(
        '',
        async () => {
          if (dirty() && !confirm('Descartar o texto não salvo?')) return
          selected = user.id
          detailSerial++
          for (const node of document.querySelectorAll('#reporters button'))
            node.setAttribute('aria-pressed', String(node === card))
          $('#issue-detail').replaceChildren()
          $('#issue-detail').hidden = true
          await queue()
          $('#queue-title').focus()
        },
        'responsibility',
      )
      card.append(
        el('strong', user.name),
        el('small', user.email + (user.active ? '' : ' · Acesso revogado')),
        el('span', `${user.pending || 0} pendentes · ${user.critical || 0} críticas`, 'badge'),
      )
      card.setAttribute('aria-pressed', String(selected === user.id))
      return card
    }),
  )
}
async function queue(more = false) {
  if (!selected) return
  const requestedReporter = selected,
    serial = ++queueSerial
  const query = new URLSearchParams({
    reporter: requestedReporter,
    history: $('#history').checked ? '1' : '0',
    ...(more && offset !== null ? { offset: String(offset) } : {}),
  })
  const data = await api('issues?' + query)
  if (serial !== queueSerial || requestedReporter !== selected) return
  items = more ? items.concat(data.items) : data.items
  offset = data.nextOffset
  $('#queue').hidden = false
  $('#queue-title').textContent =
    'Pendências de ' + (people.find((u) => u.id === selected)?.name || 'funcionário')
  $('#issues').replaceChildren(
    ...items.map((item) => {
      const card = button('', () => open(item.id), 'responsibility')
      card.append(
        el('span', urgency[item.priority] + ' · ' + issueState[item.status], 'badge'),
        el('strong', item.summary),
        el('small', 'Sinalizada em ' + date(item.created_at)),
      )
      return card
    }),
  )
  if (!items.length) $('#issues').append(el('p', 'Nenhuma pendência neste filtro.'))
  $('#more').hidden = offset === null
}
async function open(id) {
  if (dirty() && !confirm('Descartar o texto não salvo?')) return
  const serial = ++detailSerial
  const item = await api('issues/' + id),
    area = $('#issue-detail')
  if (serial !== detailSerial || item.reporter_id !== selected) return
  area.replaceChildren()
  area.hidden = false
  const title = el('h2', 'Resolver pendência')
  title.tabIndex = -1
  area.append(
    title,
    button('Fechar', () => {
      if (dirty() && !confirm('Descartar o texto não salvo?')) return
      area.replaceChildren()
      area.hidden = true
    }),
    el(
      'p',
      'Sinalizante: ' + (people.find((u) => u.id === item.reporter_id)?.name || item.reporter_id),
    ),
    el('p', item.summary, 'content'),
    el('p', urgency[item.priority] + ' · ' + issueState[item.status], 'badge'),
  )
  const source = item.currentSource || item.snapshot
  area.append(
    el('h3', 'Atividade de origem'),
    el('p', source.title || source.message || 'Registro de origem', 'content'),
  )
  if (source.details) area.append(el('p', source.details, 'content'))
  showContext(source, area)
  if (source.note) area.append(el('p', 'Andamento: ' + source.note, 'content'))
  issueHistory(item, area)
  const label = el('label', 'Orientação, informações solicitadas ou solução aplicada'),
    message = el('textarea'),
    priorityLabel = el('label', 'Urgência'),
    priority = el('select')
  message.maxLength = 4000
  label.append(message)
  for (const [value, name] of Object.entries(urgency)) {
    const option = el('option', name)
    option.value = value
    priority.append(option)
  }
  priority.value = item.priority
  priorityLabel.append(priority)
  area.append(label, priorityLabel)
  const actions = el('div', undefined, 'actions')
  const act = async (action) => {
    if (!message.value.trim()) {
      show('Descreva a ação ou solução antes de salvar.')
      message.focus()
      return
    }
    await api('issues/' + id, { action, message: message.value, priority: priority.value }, 'PATCH')
    message.defaultValue = message.value
    await reporters()
    await queue()
    await open(id)
    show('Ação registrada e disponível para o sinalizante.')
  }
  if (item.status !== 'resolvida')
    actions.append(
      button('Iniciar análise', () => act('iniciar')),
      button('Pedir informações ao funcionário', () => act('solicitar')),
      button('Registrar solução e concluir', () => act('solucionar')),
    )
  else actions.append(button('Reabrir pendência', () => act('reabrir')))
  actions.append(button('Enviar orientação ao funcionário', () => act('mensagem')))
  if (
    item.source_type === 'task' &&
    source.category === 'conteudo' &&
    source.status === 'aguardando_aprovacao'
  )
    actions.append(button('Aprovar revisão e resolver', () => act('aprovar_conteudo')))
  area.append(actions)
  title.focus({ preventScroll: true })
  area.scrollIntoView({ behavior: 'smooth', block: 'start' })
}
$('#refresh').onclick = async () => {
  try {
    if (dirty() && !confirm('Descartar o texto não salvo?')) return
    $('#issue-detail').replaceChildren()
    $('#issue-detail').hidden = true
    await reporters()
    await queue()
    show('Atualizado.')
  } catch (error) {
    show(error.message)
  }
}
$('#history').onchange = () => queue().catch((error) => show(error.message))
$('#more').onclick = () => queue(true).catch((error) => show(error.message))
try {
  const me = await privateAccess()
  if (me.role !== 'owner') throw Error('Central exclusiva do proprietário.')
  $('#resolution-workspace').hidden = false
  await reporters()
  show('Escolha um funcionário para resolver suas sinalizações.')
} catch (error) {
  $('#resolution-workspace').hidden = true
  show(error.message)
}
