# Análise dos testes e navegação do proprietário

O menu lateral do proprietário começa recolhido. Ele reúne o resumo, o app do tutor, pendências, registros da equipe, Análise dos testes, configurações, backup, gestão da equipe e atualização. Abre pelo botão Menu; fecha por seleção, Escape, botão de fechar ou clique fora. A área selecionada continua dentro do painel.

## Ambientes e autorização

Análise dos testes consulta `/api/pilot/owner/labs/{matrix|beta|dirty}/analytics`. A sessão privada do proprietário é obrigatória. O servidor consulta beta e testes sujos usando suas chaves internas, sem entregá-las ao navegador. A matriz consulta somente o identificador original do piloto 01, no banco principal; não inclui as outras contas reais. Nenhuma consulta copia dados da matriz para os laboratórios.

Filtros: ambiente, período móvel de 24 horas, 7 ou 30 dias e versão do servidor. Os ambientes são consultados separadamente e não são somados aos indicadores de adoção da produção. Os indicadores abrem registros, com paginação das evidências. Falhas de gravação abrem somente respostas de erro de POST, PATCH ou DELETE.

## Definições

- Taxa de erro: respostas API com status a partir de 400 divididas por todas as respostas API registradas. Eventos adicionais de lentidão ou erro não aumentam esse denominador. Conflitos 409, gravações com erro, falhas de rede, falhas de servidor e erros de interface são distinguidos.
- Média e P95: durações válidas das respostas, observadas no aparelho e incluindo rede. P95 usa a observação na posição teto de 95% da amostra ordenada; não é a média dos percentis de cada aparelho. Durações ausentes não são inventadas.
- Ocorrências: respostas com erro, erros de interface e erros de conexão, deduplicados por conta, aparelho e identificação de requisição quando ela existe. Eventos históricos sem essa identificação podem repetir sinais de um mesmo problema.
- Uso ativo: pulsos de tempo aceitos pelo servidor, com limites já aplicados ao aparelho. Os novos pulsos também são registrados com versão e data em pilot_events. Isso permite filtrar tempo por período e versão; não redistribui o tempo acumulado anterior, nem mede tempo com o app fechado.
- Cadastro: quantidade acumulada de contas iniciadas, pets e registros do respectivo ambiente. Esses valores de cadastro não obedecem ao filtro temporal de eventos.
- Feedback e checklist: relatos criados ou atualizados no período, associados à versão informada na coleta. O checklist mantém a última resposta por conta e versão; seus resultados são declarações manuais, não comprovação automática de persistência.

Os cálculos técnicos usam consultas agregadas a todos os eventos recebidos dentro do filtro. Evidências são paginadas em 50 registros. São mostradas até 20 rotas prioritárias e 100 pares conta/aparelho mais recentes; uma limitação de aparelhos é sinalizada. A comparação inclui até 50 versões técnicas e as versões dos relatos consultados. Isso deve ser considerado ao investigar testes pesados com muitas versões.

## Versões e cobertura

Novos eventos recebem a versão do servidor a partir do ambiente do próprio serviço; o cliente não a escolhe. A construção identifica a versão da interface, permitindo detectar diferenças entre interface e servidor. Rotas têm consultas e fragmentos removidos; senhas, corpos das requisições e dados precisos de localização não entram neste diagnóstico.

Eventos antigos sem versão ficam no grupo Versão não registrada. Nunca são atribuídos retroativamente ao código atual. Ausência de medição pode decorrer de falta de uso, coleta desativada, modo offline ou falha de envio. Não significa ausência de defeitos nem mede disponibilidade. Acesso do proprietário ao tutor continua sem gerar telemetria de adoção, inclusive na matriz piloto 01.

## Checklist beta

O botão Checklist do teste aparece somente na beta. Inclui cadastro/edição do pet, pesagem e gráfico, plano alimentar, saúde, persistência depois de sair e entrar e feedback. Cada item aceita Ainda não testei, Funcionou, Falhou ou Não se aplica, com comentário opcional. O envio é explícito e não habilita métricas do aparelho.

GET e POST em `/api/pilot/lab-checklist` exigem uma sessão da própria conta beta ativa. O servidor determina a versão e o dono do registro. A revisão esperada evita que um envio antigo sobrescreva outra resposta salva por outro aparelho. Em conflito, as respostas locais ficam na tela até o participante optar por recarregar. Contas reservadas continuam desativadas; nenhum teste é preenchido automaticamente.

## Decisões do proprietário

Nesta entrega foram escolhidos: prioridade para risco de perda de dados, lentidão acima de 1,5 segundo e checklist manual. Próximas decisões úteis: prioridade e responsável por ocorrência, confirmação de uma correção na versão seguinte, alertas com limite mínimo de amostra e cobertura dos seis aparelhos já usados no piloto. Não foi instalado rastreamento de cliques, gravação de sessão ou captura automática de telas.
