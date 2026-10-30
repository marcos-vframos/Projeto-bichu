type HealthItem = { id: string; title: string; event_date: string; completed?: boolean }
function dayKey(value: string | Date) {
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) { const date=new Date(value+'T12:00:00-03:00'); return !Number.isNaN(date.getTime())&&date.toISOString().slice(0,10)===value?value:'' }
  const date = typeof value === 'string' ? new Date(value) : value
  return Number.isNaN(date.getTime()) ? '' : new Intl.DateTimeFormat('en-CA', { timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit' }).format(date)
}
export function summarizeHealth<T extends HealthItem>(items: T[], now = new Date()) {
  const today = dayKey(now)
  const pending = items.filter(item => !item.completed && dayKey(item.event_date)).sort((a,b) => dayKey(a.event_date).localeCompare(dayKey(b.event_date)) || a.event_date.localeCompare(b.event_date))
  return { next: pending.find(item => dayKey(item.event_date) >= today) || null, overdue: pending.filter(item => dayKey(item.event_date) < today).length }
}
export function displayHealthDate(value: string) {
  const date = /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(value+'T12:00:00-03:00') : new Date(value)
  return new Intl.DateTimeFormat('pt-BR',{timeZone:'America/Sao_Paulo',day:'2-digit',month:'2-digit'}).format(date)
}
