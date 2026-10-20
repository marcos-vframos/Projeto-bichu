import { el, button, api, statusName, show } from './shared.js'
import { duties } from './duties.js'
const names = {
  login: 'Entrada do funcionário',
  create_staff: 'Cadastro de funcionário',
  revoke_staff: 'Revogação de acesso',
  assign: 'Atribuição de pergunta',
  unassign: 'Remoção de atribuição',
  reply: 'Resposta ao tutor',
  review_feedback: 'Avaliação de feedback',
  update_permissions: 'Alteração de permissões',
  create_task: 'Criação de responsabilidade',
  update_task: 'Atualização de responsabilidade',
  open_tutor: 'Abertura de conta do tutor',
  issue_sinalizada: 'Pendência sinalizada',
  issue_iniciar: 'Análise de pendência iniciada',
  issue_solicitar: 'Informações solicitadas',
  issue_solucionar: 'Pendência resolvida',
  issue_reabrir: 'Pendência reaberta',
  issue_mensagem: 'Mensagem na pendência',
  issue_aprovar_conteudo: 'Revisão aprovada e pendência resolvida',
}
const actorName=row=>row.details?.actorName||row.actor_name||(row.actor_id==='owner'?'Proprietário':'Funcionário não disponível')
const completed = (row) =>
  ['concluida', 'aprovada'].includes(row.details?.toStatus) &&
  row.details?.fromStatus !== row.details?.toStatus
const actionName = (row) =>
  completed(row)
    ? row.details.toStatus === 'aprovada'
      ? 'Revisão aprovada'
      : 'Atividade concluída'
    : names[row.action] || row.action
export function createAuditView(container, isVisible) {
  let items = [],
    next = 0,
    busy = false,
    enabled = false
  const filters = el('div', undefined, 'split'),
    personLabel = el('label', 'Funcionário'),
    person = el('select'),
    doneLabel = el('label', 'Somente atividades finalizadas'),
    done = el('input'),
    list = el('div'),
    details = el('section'),
    more = button('Carregar registros anteriores', () => load(true))
  done.type = 'checkbox'
  personLabel.append(person)
  doneLabel.prepend(done)
  filters.append(personLabel, doneLabel)
  details.hidden = true
  container.replaceChildren(filters, list, more, details)
  function open(row) {
    details.replaceChildren()
    details.hidden = false
    const title = el('h3', actionName(row))
    title.tabIndex = -1
    details.append(
      title,
      button('Fechar registro', () => (details.hidden = true)),
      el('p', 'Funcionário: ' + actorName(row)),
      el(
        'p',
        'Data e hora: ' +
          new Date(row.created_at).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }) +
          ' (Brasília)',
      ),
    )
    if (row.details?.title) details.append(el('h4', row.details.title))
    if (row.details?.category)
      details.append(
        el('p', 'Área: ' + (duties[row.details.category]?.name || row.details.category)),
      )
    if (row.details?.fromStatus || row.details?.toStatus)
      details.append(
        el(
          'p',
          'Situação: ' +
            (row.details.fromStatus ? statusName(row.details.fromStatus) : 'Criação') +
            ' → ' +
            statusName(row.details.toStatus),
        ),
      )
    if (row.details?.note)
      details.append(
        el('strong', 'Resultado / observação registrada'),
        el('p', row.details.note, 'content'),
      )
    if (!row.details)
      details.append(
        el(
          'p',
          'Registro anterior ao histórico detalhado. O resultado e a observação da época não estão disponíveis.',
          'muted',
        ),
      )
    if (row.record_id) details.append(el('small', 'Referência: ' + row.record_id))
    title.focus({ preventScroll: true })
    details.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
  async function load(append = false) {
    if (!enabled || busy) return
    busy = true
    more.disabled = true
    person.disabled = true
    done.disabled = true
    try {
      const query = new URLSearchParams({ offset: String(append ? next : 0) })
      if (person.value) query.set('actor', person.value)
      if (done.checked) query.set('completed', '1')
      const rows = await api('audit?' + query)
      items = append ? [...new Map(items.concat(rows).map((row) => [row.id, row])).values()] : rows
      next = (append ? next : 0) + rows.length
      more.hidden = rows.length < 200
      list.replaceChildren(
        ...items.map((row) => {
          const card = button('', () => open(row), 'responsibility')
          card.append(
            el('strong', actionName(row)),
            el('p', row.details?.title || names[row.action] || row.action),
            el(
              'small',
              actorName(row) +
                ' · ' +
                new Date(row.created_at).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }),
            ),
          )
          if (row.details?.toStatus)
            card.append(el('span', statusName(row.details.toStatus), 'badge'))
          return card
        }),
      )
      if (!items.length) list.append(el('p', 'Nenhum registro neste filtro.'))
    } catch (error) {
      show(error.message)
    } finally {
      busy = false
      more.disabled = false
      person.disabled = false
      done.disabled = false
    }
  }
  async function start() {
    const users = await api('users')
    for (const [id, name] of [
      ['', 'Todos os responsáveis'],
      ['owner', 'Proprietário'],
      ...users.map((user) => [user.id, user.name + (user.active ? '' : ' · acesso revogado')]),
    ]) {
      const option = el('option', name)
      option.value = id
      person.append(option)
    }
    enabled = true
    await load()
  }
  person.onchange = done.onchange = () => {
    details.hidden = true
    void load()
  }
  setInterval(() => {
    if (enabled && !document.hidden && isVisible() && details.hidden && next<=200) void load()
  }, 15000)
  return { start, load }
}
