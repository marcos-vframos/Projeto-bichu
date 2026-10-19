import { $, show, el, button, api, privateAccess, statusName, date, assignment } from './shared.js'
let users = [],
  questions = [],
  tasks = [],
  questionOffset = null,
  taskOffset = null
async function people() {
  users = await api('users')
  const list = $('#people-list')
  list.replaceChildren()
  if (!users.length) list.append(el('p', 'Nenhum funcionário cadastrado.'))
  for (const user of users) {
    const row = el('div', undefined, 'list-row')
    row.append(
      el('strong', user.name),
      el('p', user.email + (user.active ? '' : ' · Acesso revogado'), 'muted'),
    )
    if (user.active) {
      const link = el('a', 'Visualizar responsabilidades deste funcionário')
      link.href = '/equipe?funcionario=' + encodeURIComponent(user.id)
      row.append(
        link,
        button('Revogar acesso', async () => {
          if (!confirm('Revogar o acesso e devolver suas atribuições ao proprietário?')) return
          await api('users/' + user.id + '/revoke', {})
          await reload()
          show('Acesso revogado; responsabilidades devolvidas ao proprietário.')
        }),
      )
    }
    list.append(row)
  }
  const fresh = assignment(users, $('#task-assignee').value)
  fresh.id = 'task-assignee'
  fresh.name = 'userId'
  $('#task-assignee').replaceWith(fresh)
}
async function loadQuestions(more = false) {
  const data = await api(
    'cases' + (more && questionOffset !== null ? '?offset=' + questionOffset : ''),
  )
  questions = more ? questions.concat(data.items) : data.items
  questionOffset = data.nextOffset
  const list = $('#question-list')
  list.replaceChildren()
  if (!questions.length) list.append(el('p', 'Nenhuma pergunta recebida.'))
  for (const item of questions) {
    const row = el('div', undefined, 'list-row')
    row.append(
      el('p', item.message, 'content'),
      el('small', statusName(item.status) + ' · ' + date(item.created)),
    )
    const who = assignment(users, item.assignedTo)
    row.append(
      who,
      button('Salvar atribuição', async () => {
        await api('cases/' + item.id + '/assign', { userId: who.value || null })
        show('Pergunta atribuída.')
        await loadQuestions()
      }),
    )
    list.append(row)
  }
  $('#more-questions').hidden = questionOffset === null
}
async function loadTasks(more = false) {
  const data = await api('tasks' + (more && taskOffset !== null ? '?offset=' + taskOffset : ''))
  tasks = more ? tasks.concat(data.items) : data.items
  taskOffset = data.nextOffset
  const list = $('#task-list')
  list.replaceChildren()
  if (!tasks.length) list.append(el('p', 'Nenhuma responsabilidade criada.'))
  for (const item of tasks) {
    const row = el('div', undefined, 'list-row')
    row.append(
      el('h3', item.title),
      el('p', statusName(item.status) + ' · ' + date(item.due_date), 'muted'),
      el('p', item.details, 'content'),
    )
    if (item.note) row.append(el('p', 'Andamento: ' + item.note, 'content'))
    const who = assignment(users, item.user_id)
    row.append(
      who,
      button('Atualizar responsável', async () => {
        await api('tasks/' + item.id, { userId: who.value || null }, 'PATCH')
        show('Responsável atualizado.')
        await loadTasks()
      }),
    )
    list.append(row)
  }
  $('#more-tasks').hidden = taskOffset === null
}
async function reload() {
  await people()
  await Promise.all([loadQuestions(), loadTasks()])
}
for (const tab of document.querySelectorAll('[data-section]'))
  tab.onclick = () => {
    for (const other of document.querySelectorAll('[data-section]')) {
      const selected = other === tab
      other.setAttribute('aria-pressed', String(selected))
      $('#' + other.dataset.section).hidden = !selected
    }
  }
$('#create-person').onsubmit = async (event) => {
  event.preventDefault()
  const send = event.target.querySelector('button')
  send.disabled = true
  try {
    await api('users', Object.fromEntries(new FormData(event.target)))
    event.target.reset()
    await reload()
    show('Funcionário cadastrado. Faça as atribuições no painel administrativo.')
  } catch (error) {
    show(error.message)
  } finally {
    send.disabled = false
  }
}
$('#create-task').onsubmit = async (event) => {
  event.preventDefault()
  const send = event.target.querySelector('button')
  send.disabled = true
  try {
    const body = Object.fromEntries(new FormData(event.target))
    body.userId = body.userId || null
    body.dueDate = body.dueDate || null
    await api('tasks', body)
    event.target.reset()
    await loadTasks()
    show('Responsabilidade criada e disponível para o responsável.')
  } catch (error) {
    show(error.message)
  } finally {
    send.disabled = false
  }
}
$('#more-questions').onclick = () => loadQuestions(true).catch((error) => show(error.message))
$('#more-tasks').onclick = () => loadTasks(true).catch((error) => show(error.message))
$('#refresh-audit').onclick = async () => {
  try {
    const rows = await api('audit'),
      names = {
        login: 'Entrada do funcionário',
        create_staff: 'Cadastro de funcionário',
        revoke_staff: 'Revogação de acesso',
        assign: 'Atribuição de pergunta',
        unassign: 'Remoção de atribuição',
        reply: 'Resposta ao tutor',
        create_task: 'Criação de responsabilidade',
        update_task: 'Atualização de responsabilidade',
        open_tutor: 'Abertura de conta do tutor pelo proprietário',
      }
    $('#audit-list').replaceChildren(
      ...rows.map((row) =>
        el(
          'p',
          date(row.created_at) +
            ' · ' +
            (row.actor_name || 'Proprietário') +
            ' · ' +
            (names[row.action] || row.action),
        ),
      ),
    )
  } catch (error) {
    show(error.message)
  }
}
try {
  const me = await privateAccess()
  if (me.role !== 'owner') throw Error('Gestão disponível somente no painel do proprietário.')
  $('#admin').hidden = false
  await reload()
  show('')
} catch (error) {
  $('#admin').hidden = true
  show(error.message)
}
