import { el, button, api, show, date } from './shared.js'
export const urgency = { critica: 'Crítica', alta: 'Alta', normal: 'Normal', baixa: 'Baixa' }
export const issueState = {
  aberta: 'Aberta',
  em_analise: 'Em análise',
  aguardando_funcionario: 'Aguardando funcionário',
  resolvida: 'Resolvida',
}
export function issueHistory(item, area) {
  for (const row of item.updates) {
    const block = el('blockquote')
    block.append(
      el('strong', (row.actor_name || 'Proprietário') + ' · ' + date(row.created_at)),
      el('p', row.message, 'content'),
    )
    area.append(block)
  }
}
export function signalControl(type, id, area) {
  area.append(
    button('Sinalizar pendência ao proprietário', () => {
      const form = el('form'),
        label = el('label', 'O que precisa ser resolvido pelo proprietário?'),
        message = el('textarea'),
        priorityLabel = el('label', 'Urgência de resolução'),
        priority = el('select'),
        send = el('button', 'Enviar sinalização')
      message.required = true
      message.maxLength = 2000
      label.append(message)
      for (const [value, name] of Object.entries(urgency)) {
        const option = el('option', name)
        option.value = value
        priority.append(option)
      }
      priority.value = 'normal'
      priorityLabel.append(priority)
      form.append(
        label,
        priorityLabel,
        send,
        button('Cancelar sinalização', () => form.remove()),
      )
      area.append(form)
      message.focus()
      form.onsubmit = async (event) => {
        event.preventDefault()
        send.disabled = true
        try {
          await api('issues', {
            sourceType: type,
            sourceId: id,
            summary: message.value,
            priority: priority.value,
          })
          form.remove()
          show('Pendência enviada ao proprietário. Acompanhe em Minhas sinalizações.')
        } catch (error) {
          show(error.message)
        } finally {
          send.disabled = false
        }
      }
    }),
  )
}
