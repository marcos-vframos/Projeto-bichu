const unavailable = async (..._args: unknown[]): Promise<never> => {
  throw new Error('Rede social e cadastro profissional não estão disponíveis nesta versão.')
}
const collection = <T = { id: string; [key: string]: unknown }>(_name: string) => ({
  getFullList: <R = T>(...args: unknown[]): Promise<R[]> => unavailable(...args),
  getOne: <R = T>(...args: unknown[]): Promise<R> => unavailable(...args),
  getFirstListItem: <R = T>(...args: unknown[]): Promise<R> => unavailable(...args),
  create: <R = T>(...args: unknown[]): Promise<R> => unavailable(...args),
  update: <R = T>(...args: unknown[]): Promise<R> => unavailable(...args),
  getList: <R = T>(...args: unknown[]): Promise<{ items: R[] }> => unavailable(...args),
  delete: unavailable,
})
export default {
  collection,
  authStore: { isValid: false, record: null as null | { id: string; name: string } },
  files: {
    getURL: (_record: unknown, _file: string): string => {
      throw new Error('Arquivo legado indisponível')
    },
  },
}
