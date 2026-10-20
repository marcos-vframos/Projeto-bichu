import { $, el, button, api, show, statusName, date } from './shared.js'
import { duties } from './duties.js'
export function createTaskBoard(openTask, isDirty, isActive) {
  let items = [],
    next = null,
    loading = false,
    scope = 'today',
    generation = 0
  const tools = $('#board-tools'),
    filter = el('select'),
    label = el('label', 'Demandas da equipe')
  filter.setAttribute('aria-label', 'Filtrar tarefas')
  for (const [value, name] of [
    ['today', 'Hoje e atrasadas'],
    ['mine', 'Minhas tarefas do dia'],
    ['all', 'Todas as demandas'],
  ]) {
    const option = el('option', name)
    option.value = value
    filter.append(option)
  }
  label.append(filter)
  tools.append(
    label,
    el(
      'p',
      'Grade compartilhada: todos acompanham o andamento; o responsável executa a tarefa.',
      'muted',
    ),
  )
  filter.onchange = async () => {
    if (isDirty() && !confirm('Descartar o texto não salvo?')) {
      filter.value = scope
      return
    }
    scope = filter.value
    items = []
    next = null
    await load()
  }
  async function load(more = false) {
    if (loading || (more && next === null)) return
    loading = true
    filter.disabled = true
    const serial = ++generation
    $('#more').disabled = true
    try {
      const selected = new URLSearchParams(location.search).get('funcionario'),
        pages = more
          ? [next]
          : Array.from({ length: Math.max(1, Math.ceil(items.length / 9)) }, (_, i) => i)
      const results = await Promise.all(
        pages.map((page) => {
          const query = new URLSearchParams({ scope, page: String(page) })
          if (selected) query.set('assignee', selected)
          return api('tasks/board?' + query)
        }),
      )
      const data = {
        today: results[0].today,
        items: results.flatMap((result) => result.items),
        nextPage: results[results.length-1].nextPage,
      }
      if (!isActive() || serial !== generation) return
      items = [
        ...new Map(
          (more ? items.concat(data.items) : data.items).map((item) => [item.id, item]),
        ).values(),
      ]
      next = data.nextPage
      tools.hidden = false
      $('#new-activity').hidden = true
      $('#summary').textContent =
        'Quadro da equipe · ' +
        date(data.today) +
        ' · ' +
        (scope === 'all' ? 'Todas as demandas' : 'Pendências do dia e tarefas atrasadas')
      const grid = $('#responsibilities')
      grid.classList.add('task-board')
      grid.replaceChildren(
        ...items.map((item) => {
          const card = button(
            '',
            async () => {
              if (!item.canExecute) {
                show(
                  'Responsável: ' +
                    (item.responsible_name || 'a definir') +
                    '. Somente o responsável pode abrir os detalhes e executar a tarefa.',
                )
                return
              }
              if (isDirty() && !confirm('Descartar o texto não salvo?')) return
              const current = await api('tasks/' + item.id)
              openTask(current)
            },
            'responsibility board-card',
          )
          const stripe = el(
            'span',
            'Responsável: ' + (item.responsible_name || 'A definir'),
            'responsible-stripe',
          )
          stripe.style.backgroundColor = item.badge_color
          const hex = item.badge_color.replace('#', ''),
            rgb = [0, 2, 4]
              .map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
              .map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4))
          const luminance = rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722
          stripe.style.color = luminance > 0.179 ? '#000' : '#fff'
          card.append(
            stripe,
            el('strong', item.title),
            el('small', duties[item.category]?.name || 'Tarefas gerais'),
            el('span', statusName(item.status) + ' · Prioridade ' + item.priority, 'badge'),
            el('small', 'Prazo: ' + date(item.due_date)),
            el('small', item.canExecute ? 'Abrir e executar tarefa' : 'Acompanhamento da equipe'),
          )
          return card
        }),
      )
      if (!items.length) grid.append(el('p', 'Nenhuma demanda neste filtro.'))
      $('#more').hidden = next === null
      $('#board').setAttribute('aria-pressed', 'true')
    } catch (error) {
      show(error.message)
      if (error.status === 401) throw error
    } finally {
      loading = false
      filter.disabled = false
      $('#more').disabled = false
    }
  }
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting) && isActive() && $('#detail').hidden && !isDirty() && next !== null)
          void load(true)
      },
      { rootMargin: '120px' },
    ).observe($('#board-sentinel'))
  }
  return { load }
}
