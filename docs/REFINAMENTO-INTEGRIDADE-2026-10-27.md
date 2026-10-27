# Refinamento: integridade das edições

Primeira etapa após a revisão do commit 1633b19. Não altera dados existentes nem ativa contas reservadas.

## Entrega

- Leituras e gravações de registros entregam uma revisão opaca, derivada no servidor do conteúdo, conta, coleção, identificação e data de atualização. A revisão enviada no corpo não pode substituir os metadados do servidor.
- Edições PATCH exigem If-Match com a revisão que o editor efetivamente carregou. A revisão não é atualizada silenciosamente por uma consulta feita ao clicar em Salvar. Navegadores com código antigo precisam atualizar o app e reabrir o registro; a API recusa alterações sem revisão com 428.
- Uma revisão antiga recebe 409. Mesmo após a primeira conferência, a transação compara novamente o registro antes de aplicar a alteração, a pesagem derivada, arquivos e auditoria. Uma tentativa concorrente recusada não deixa efeitos parciais.
- Os formulários de pet, configurações, saúde, rotina e receita natural enviam a revisão carregada. Os erros mantêm o formulário aberto, sem reenviar automaticamente. As opções de concluir/desfazer cuidado guardam a nova revisão retornada pelo servidor.
- Falha posterior na limpeza de uma foto antiga não apaga uma foto já confirmada no banco. A limpeza considera apenas arquivos presentes antes daquela edição.

## Comportamento de conflito

A estratégia inicial é conservadora: recusar o formulário desatualizado, inclusive quando as mudanças são em campos diferentes. A pessoa precisa guardar suas anotações, reabrir o registro e conferir a versão atual antes de reaplicar a alteração. Não há mesclagem automática nem salvamento persistente de rascunho ao fechar a página. Isso deve ser explicitado ao evoluir a experiência de comparação.

## Limites e etapas seguintes

Esta entrega protege edições de registros existentes. Não acrescenta idempotência para novos registros, revisão de exclusões, correção do cache offline, prazo de requisições ou integração do cadastro profissional. Esses itens continuam no plano, assim como o cálculo energético, a automação de verificação e a divisão dos componentes grandes. Personalizações, tarefas e feedback da equipe continuam usando seus próprios mecanismos de conflito existentes.

Testes usam contas e arquivos temporários. A implantação deve seguir matriz, beta e produção, mantendo o piloto 01 original e as contas beta reservadas intactos.
