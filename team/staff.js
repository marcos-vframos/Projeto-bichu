import { $, show, el, button, api, privateAccess, statusName, date } from './shared.js'
let mode = 'questions',
  cases = [],
  tasks = [],
  caseOffset = null,
  taskOffset = null,
  busy = false
const assignee = new URLSearchParams(location.search).get('funcionario')
const query = (offset) => {
  const q = new URLSearchParams()
  if (assignee) q.set('assignee', assignee)
  if (offset !== null && offset !== undefined) q.set('offset', offset)
  return q.size ? '?' + q : ''
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
      const [c, t] = await Promise.all([api('cases' + query()), api('tasks' + query())])
      cases = c.items
      tasks = t.items
      caseOffset = c.nextOffset
      taskOffset = t.nextOffset
      $('#detail').hidden = true
    }
    show('')
    render()
  } catch (error) {
    show(error.message)
  } finally {
    busy = false
    $('#refresh').disabled = false
  }
}
function render() {
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
    mode = value
    $('#detail').hidden = true
    render()
  }
$('#refresh').onclick = () => load()
$('#more').onclick = () => load(true)
try {
  const me = await privateAccess()
  $('#identity').textContent =
    me.name +
    (me.role === 'owner'
      ? ' · Visão do proprietário' + (assignee ? ' · Funcionário selecionado' : '')
      : '')
  $('#workspace').hidden = false
  $('#refresh').hidden = false
  await load()
} catch (error) {
  show('Este endereço exige seu acesso privado. ' + error.message)
}
setInterval(() => {
  if (!document.hidden && !$('#workspace').hidden && $('#detail').hidden) void load()
}, 30000)
