import { el } from './shared.js'
import { duties } from './duties.js'
export function contextFields(category, container) {
  container.replaceChildren()
  for (const field of duties[category]?.fields || []) {
    const label = el('label', field),
      input = el('textarea')
    input.maxLength = 2000
    input.dataset.activityField = field
    label.append(input)
    container.append(label)
  }
}
export function readContext(container) {
  return Object.fromEntries(
    [...container.querySelectorAll('[data-activity-field]')].map((input) => [
      input.dataset.activityField,
      input.value,
    ]),
  )
}
export function showContext(item, container) {
  let context = {}
  try {
    context = JSON.parse(item.context || '{}')
  } catch {}
  for (const field of duties[item.category]?.fields || [])
    if (context[field]) {
      const block = el('div')
      block.append(el('strong', field), el('p', context[field], 'content'))
      container.append(block)
    }
}
