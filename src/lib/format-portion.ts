const formatter = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 })
export function formatPortion(grams: number): string { return Number.isFinite(grams) ? formatter.format(grams) : '—' }
