export const duties = {
  suporte: {
    name: 'Suporte ao tutor',
    description: 'Resolver dúvidas sobre o funcionamento do app.',
    fields: [
      'Tutor ou referência do atendimento',
      'Dúvida recebida',
      'Orientação ou solução proposta',
    ],
  },
  falhas: {
    name: 'Triagem de falhas',
    description: 'Registrar problema, aparelho, evidências e prioridade.',
    fields: [
      'Aparelho, sistema e navegador',
      'Passos para reproduzir',
      'Resultado esperado e resultado observado',
      'Evidência ou link da captura',
    ],
  },
  profissionais: {
    name: 'Conferência de profissionais',
    description: 'Verificar contatos, categorias e cadastros duplicados.',
    fields: [
      'Nome e referência do profissional',
      'Contato e categoria conferidos',
      'Fonte e data da verificação',
      'Duplicidade ou correção sugerida',
    ],
  },
  piloto: {
    name: 'Acompanhamento do piloto',
    description: 'Organizar dificuldades e sugestões dos participantes.',
    fields: [
      'Participante ou referência',
      'Dificuldade observada',
      'Sugestão do participante',
      'Próxima ação de acompanhamento',
    ],
  },
  conteudo: {
    name: 'Revisão de conteúdo',
    description: 'Conferir informações e encaminhar correções para aprovação.',
    fields: [
      'Área e referência do conteúdo',
      'Texto ou informação a revisar',
      'Fontes consultadas',
      'Correção proposta',
    ],
  },
}
