import { $, show, el, button, api, privateAccess, statusName, date } from './shared.js'
let mode = 'questions',
  cases = [],
  tasks = [],
  caseOffset = null,
  taskOffset = null,
  busy = false
let permissions = []
const can = (key) => permissions.includes(key)
const assignee = new URLSearchParams(location.search).get('funcionario')
const query = (offset) => {
  const q = new URLSearchParams()
  if (assignee) q.set('assignee', assignee)
  if (offset !== null && offset !== undefined) q.set('offset', offset)
  const value = q.toString()
  return value ? '?' + value : ''
}
const dirty = () =>
  [...document.querySelectorAll('#detail textarea')].some((x) => x.value !== x.defaultValue)
async function load(more = false) {
  if (busy) return
  if (!more && dirty() && !confirm('Descartar o texto ainda não salvo e atualizar?')) return
  busy = true
  $('#refresh').disabled = true
  try {
    if (more) {
      if (mode === 'questions') {
        const data = await api('cases' + query(caseOffset))
        cases.push(...data.items)
        caseOffset = data.nextOffset
      } else {
        const data = await api('tasks' + query(taskOffset))
        tasks.push(...data.items)
        taskOffset = data.nextOffset
      }
    } else {
      const me = await api('me' + query())
      permissions = me.permissions
      $('#questions').hidden = !can('questions.read')
      $('#tasks').hidden = !can('tasks.read')
      if (mode === 'questions' && !can('questions.read')) mode = 'tasks'
      if (mode === 'tasks' && !can('tasks.read') && can('questions.read')) mode = 'questions'
      const [c, t] = await Promise.all([
        can('questions.read') ? api('cases' + query()) : { items: [], nextOffset: null },
        can('tasks.read') ? api('tasks' + query()) : { items: [], nextOffset: null },
      ])
      cases = c.items
      tasks = t.items
      caseOffset = c.nextOffset
      taskOffset = t.nextOffset
      $('#detail').hidden = true
    }
    show('')
    render()
  } catch (error) {
    if(error.status===401){$('#workspace').hidden=true;$('#login-panel').hidden=false;$('#refresh').hidden=true;$('#logout').hidden=true;cases=[];tasks=[];$('#responsibilities').replaceChildren();$('#detail').replaceChildren()}
    show(error.message)
  } finally {
    busy = false
    $('#refresh').disabled = false
  }
}
function render() {
  if (!can('questions.read') && !can('tasks.read')) {
    $('#responsibilities').replaceChildren(
      el('p', 'Nenhuma atribuição autorizada. Solicite a definição ao proprietário.'),
    )
    $('#summary').textContent = ''
    $('#more').hidden = true
    return
  }
  const questions = mode === 'questions',
    items = questions ? cases : tasks
  $('#questions').textContent =
    `Perguntas e feedbacks (${cases.length}${caseOffset !== null ? '+' : ''})`
  $('#tasks').textContent = `Tarefas atribuídas (${tasks.length}${taskOffset !== null ? '+' : ''})`
  $('#questions').setAttribute('aria-pressed', String(questions))
  $('#tasks').setAttribute('aria-pressed', String(!questions))
  $('#summary').textContent = questions
    ? 'Clique em uma pergunta para ler e responder.'
    : 'Clique em uma responsabilidade para ver as instruções e registrar o andamento.'
  const list = $('#responsibilities')
  list.replaceChildren()
  if (!items.length)
    list.append(
      el(
        'p',
        questions
          ? 'Nenhuma pergunta atribuída no momento.'
          : 'Nenhuma tarefa atribuída no momento.',
      ),
    )
  for (const item of items) {
    const card = button(
      '',
      () => (questions ? openQuestion(item) : openTask(item)),
      'responsibility',
    )
    card.setAttribute('aria-controls', 'detail')
    card.append(
      el('span', statusName(item.status), 'badge'),
      el('strong', questions ? (item.message || 'Pergunta').slice(0, 130) : item.title),
      el(
        'small',
        questions
          ? date(item.created)
          : `Prioridade ${item.priority === 'alta' ? 'alta' : item.priority === 'baixa' ? 'baixa' : 'normal'} · ${item.due_date ? 'Prazo: ' + date(item.due_date) : 'Sem prazo definido'}`,
      ),
    )
    list.append(card)
  }
  $('#more').hidden = (questions ? caseOffset : taskOffset) === null
}
function detail(title) {
  const area = $('#detail')
  area.replaceChildren()
  const head = el('header'),
    heading = el('h2', title)
  heading.id = 'detail-title'
  heading.tabIndex = -1
  head.append(
    heading,
    button('Fechar', () => {
      if (dirty() && !confirm('Descartar o texto não salvo?')) return
      area.hidden = true
    }),
  )
  area.append(head)
  area.hidden = false
  heading.focus({ preventScroll: true })
  area.scrollIntoView({ behavior: 'smooth', block: 'start' })
  return area
}
function openQuestion(item) {
  if (dirty() && !confirm('Descartar o texto não salvo?')) return
  const area = detail('Pergunta recebida')
  area.append(el('p', statusName(item.status), 'badge'), el('p', item.message, 'content'))
  for (const reply of item.replies || []) {
    const block = el('blockquote')
    block.append(
      el('strong', (reply.authorName || 'Responsável') + ' · ' + date(reply.createdAt)),
      el('p', reply.message, 'content'),
    )
    area.append(block)
  }
  if (item.review)
    area.append(
      el(
        'p',
        'Avaliação interna · Prioridade ' +
          item.review.priority +
          ' · ' +
          (item.review.note || 'Sem observações'),
        'content',
      ),
    )
  if (can('questions.review')) {
    const form = el('form'),
      statusLabel = el('label', 'Status do feedback'),
      status = el('select'),
      priorityLabel = el('label', 'Prioridade'),
      priority = el('select'),
      noteLabel = el('label', 'Observação interna (visível apenas para a equipe)'),
      note = el('textarea')
    for (const [value, title] of [
      ['recebido', 'Recebido'],
      ['em_avaliacao', 'Em avaliação'],
      ['respondido', 'Respondido'],
      ['resolvido', 'Resolvido'],
    ]) {
      const option = el('option', title)
      option.value = value
      status.append(option)
    }
    status.value = item.status || 'recebido'
    for (const [value, title] of [
      ['baixa', 'Baixa'],
      ['normal', 'Normal'],
      ['alta', 'Alta'],
    ]) {
      const option = el('option', title)
      option.value = value
      priority.append(option)
    }
    priority.value = item.review?.priority || 'normal'
    note.value = note.defaultValue = item.review?.note || ''
    note.maxLength = 2000
    statusLabel.append(status)
    priorityLabel.append(priority)
    noteLabel.append(note)
    const send = el('button', 'Salvar avaliação e status')
    form.append(statusLabel, priorityLabel, noteLabel, send)
    form.onsubmit = async (e) => {
      e.preventDefault()
      send.disabled = true
      try {
        await api('cases/' + item.id + '/review', {
          status: status.value,
          priority: priority.value,
          note: note.value,
        })
        note.defaultValue = note.value
        await load()
        show('Avaliação e status salvos.')
      } catch (error) {
        show(error.message)
      } finally {
        send.disabled = false
      }
    }
    area.append(form)
  }
  if (!can('questions.reply')) return
  const form = el('form'),
    label = el('label', 'Sua resposta'),
    message = el('textarea')
  message.required = true
  message.maxLength = 2000
  label.append(message)
  const stateLabel = el('label', 'Situação após a resposta'),
    state = el('select')
  for (const [value, name] of [
    ['respondido', 'Respondido'],
    ['em_avaliacao', 'Em avaliação'],
    ['resolvido', 'Resolvido'],
  ]) {
    const option = el('option', name)
    option.value = value
    state.append(option)
  }
  stateLabel.append(state)
  const send = el('button', 'Enviar resposta ao tutor')
  form.append(label, stateLabel, send)
  const replyId = crypto.randomUUID()
  form.onsubmit = async (event) => {
    event.preventDefault()
    send.disabled = true
    try {
      await api('cases/' + item.id + '/reply', {
        message: message.value,
        status: state.value,
        replyId,
      })
      message.value = ''
      message.defaultValue = ''
      await load()
      show('Resposta salva e disponível ao tutor.')
    } catch (error) {
      show(error.message)
    } finally {
      send.disabled = false
    }
  }
  area.append(form)
}
function openTask(item) {
  if (dirty() && !confirm('Descartar o texto não salvo?')) return
  const area = detail(item.title)
  area.append(
    el('p', statusName(item.status), 'badge'),
    el('p', item.details || 'Sem instruções adicionais.', 'content'),
    el('p', 'Prazo: ' + date(item.due_date), 'muted'),
  )
  if (!can('tasks.update')) {
    if (item.note) area.append(el('p', item.note, 'content'))
    return
  }
  const label = el('label', 'Registro do andamento'),
    note = el('textarea')
  note.maxLength = 2000
  note.value = note.defaultValue = item.note || ''
  label.append(note)
  area.append(label)
  const actions = el('div', undefined, 'actions')
  const save = async (status) => {
    await api('tasks/' + item.id, { status, note: note.value }, 'PATCH')
    note.defaultValue = note.value
    await load()
    show('Andamento da responsabilidade salvo.')
  }
  if (item.status !== 'em_andamento')
    actions.append(button('Iniciar / retomar tarefa', () => save('em_andamento')))
  if (item.status !== 'concluida')
    actions.append(button('Marcar como concluída', () => save('concluida')))
  actions.append(button('Salvar observação', () => save(item.status)))
  area.append(actions)
}
for (const [id, value] of [
  ['questions', 'questions'],
  ['tasks', 'tasks'],
])
  $('#' + id).onclick = () => {
    if (dirty() && !confirm('Descartar o texto não salvo?')) return
    closeMenu()
    mode = value
    $('#detail').hidden = true
    render()
  }
$('#refresh').onclick = () => load()
$('#more').onclick = () => load(true)
async function enter(me) {
  $('#login-panel').hidden = true
  $('#identity').textContent =
    me.name +
    (me.role === 'owner'
      ? ' · Visão do proprietário' + (assignee ? ' · Funcionário selecionado' : '')
      : '')
  $('#logout').hidden = me.role !== 'staff'
  $('#workspace').hidden = false
  $('#refresh').hidden = false
  await load()
}
$('#staff-login').onsubmit = async (event) => {
  event.preventDefault()
  const send = event.target.querySelector('button')
  send.disabled = true
  try {
    await api('login', Object.fromEntries(new FormData(event.target)))
    event.target.reset()
    await enter(await api('me'))
  } catch (error) {
    show(error.message)
  } finally {
    send.disabled = false
  }
}
$('#logout').onclick = async () => {
  if (dirty() && !confirm('Sair e descartar o texto não salvo?')) return
  try {
    await api('logout', {})
    location.replace('/equipe?acesso=funcionario')
  } catch (error) {
    show(error.message)
  }
}
try {
  await enter(await privateAccess())
} catch (error) {
  $('#login-panel').hidden = false
  show('Informe seu e-mail e senha individuais.')
}
setInterval(() => {
  if (!document.hidden && !$('#workspace').hidden && $('#detail').hidden) void load()
}, 30000)

const toggle = $('#menu-toggle'),
  menu = $('#staff-menu')
function closeMenu() {
  menu.hidden = true
  toggle.setAttribute('aria-expanded', 'false')
}
toggle.onclick = () => {
  menu.hidden = !menu.hidden
  toggle.setAttribute('aria-expanded', String(!menu.hidden))
}
$('#menu-close').onclick = closeMenu
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    closeMenu()
    toggle.focus()
  }
})
