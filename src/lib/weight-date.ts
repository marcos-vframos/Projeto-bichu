// Registros antigos de data civil eram serializados à meia-noite UTC.
export function weightDate(value: string) {
  return new Date(/T00:00:00(?:\.000)?Z$/.test(value) ? `${value.slice(0,10)}T12:00:00-03:00` : value)
}
