# Seletores de contas: ensaio exclusivo em testes sujos

Escopo autorizado: publicar somente na branch testes-sujos e no serviço bichu-testes-sujos. Não promover esta atualização à matriz, beta ou main. O código parte do commit já usado no laboratório, sem substituir as versões dos outros serviços.

O filtro de contas do painel mantém seleção múltipla somente para o banco local. Seus grupos recolhidos separam a seleção de indicadores dos atalhos de acesso. A tela Abrir app do tutor também usa grupos recolhidos: matriz original, beta e laboratório sujo.

Matriz navega ao acesso master do aplicativo principal. Beta navega ao gerenciamento existente no aplicativo principal para escolher a conta e conferir sua ativação. Esta atualização não altera esse gerenciamento nem torna automática a abertura de uma beta específica. Nenhum segredo ou dado real é copiado ao laboratório e nenhuma beta é ativada ao abrir os menus.

Para testar o painel local, uma sessão já autorizada na conta dirty pode solicitar explicitamente uma sessão de administração do próprio laboratório. A função é bloqueada em beta, matriz e produção, requer origem válida e conta dirty ativa com sessão não expirada, e registra o acesso na auditoria. Sua assinatura usa apenas a chave independente do laboratório. Não cria privilégios nos demais ambientes. O atalho fica na faixa de laboratório do tutor e em /teste-contas.

Validação: testes de isolamento e restrição por ambiente, seleção de IDs locais, ausência de contas reais copiadas e preservação das vinte beta reservadas, além da suíte existente, TypeScript e compilação das duas interfaces.
