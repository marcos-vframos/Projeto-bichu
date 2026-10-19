const DAY = 86400000
export const ADOPTION_RULE = { usefulDays: 4, participants: 6, periodDays: 7, finalDays: [6, 7] }

// Seven 24-hour periods from first login, matching guest expiry.
export function summarizeAdoption(firstAccessAt, timeline, now = Date.now()) {
  if (!Number.isFinite(firstAccessAt) || firstAccessAt <= 0) return {
    status: 'not_started', usefulDays: 0, returnedAtEnd: false, reached: false, elapsedDays: 0, endsAt: null, timeline: [],
  }
  const endsAt = firstAccessAt + ADOPTION_RULE.periodDays * DAY
  const valid = timeline.filter(d => Number.isInteger(d.period) && d.period >= 1 && d.period <= 7 && d.actions > 0)
  const usefulDays = new Set(valid.map(d => d.period)).size
  const returnedAtEnd = valid.some(d => ADOPTION_RULE.finalDays.includes(d.period))
  const reached = usefulDays >= ADOPTION_RULE.usefulDays && returnedAtEnd
  return {
    status: now < endsAt ? 'in_progress' : reached ? 'criterion_met' : 'criterion_not_met',
    usefulDays, returnedAtEnd, reached, endsAt,
    elapsedDays: Math.min(7, Math.max(0, Math.floor((now - firstAccessAt) / DAY) + 1)), timeline: valid,
  }
}
