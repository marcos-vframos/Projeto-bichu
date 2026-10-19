export function getErrorMessage(error:unknown):string {return error instanceof Error ? error.message : 'Não foi possível concluir a operação.'}
