# Auditoria técnica — 26/10/2026

Base: main 48571fa. Escopo exclusivo: Meu Bichu.

## Correções

- Personalizações enviadas por campo com valor de origem, comparação no servidor e resolução explícita de conflito. Aparelhos com alterações diferentes não substituem o retrato inteiro da conta. Pendências ficam guardadas por conta. Importação indiscriminada das preferências globais antigas removida para evitar mistura entre usuários.
- API verifica a conta esperada quando o cliente envia o identificador; o serviço de nutrição e as personalizações enviam esse identificador. Escritas genéricas de personalizações bloqueadas.
- Peso, lançamento de pesagem, metadados e auditoria gravados na mesma transação. Plano ativo anterior só é desativado se o novo plano puder ser salvo. Registro associado a um pet não pode ser transferido silenciosamente a outro.
- Resposta do proprietário usa a API da equipe e seu registro de auditoria. Atualizações de status sem mensagem não criam notificações vazias.
- Tarefas recebem comparação de versão para evitar sobrescrita por formulário antigo. Funcionário continua sujeito à atribuição e às permissões no servidor.
- Logout limpa a sessão offline da aba. Redirecionamento do painel aponta para Railway.
- Histórico distingue novas alterações de tutor e proprietário; intervenções do proprietário não entram no indicador de adoção. Dados anteriores ficam com origem desconhecida, sem atribuição retroativa inventada.
- Contadores de pets, páginas, falhas e lentidão usam totais do banco, independentemente do limite da amostra de gráficos. Cobertura e limites de análise aparecem no painel.

## Limpeza e cobertura

Inventário e análise estática de referências: 190 arquivos TS/JS. Removidos 36 componentes genéricos de interface sem referência no grafo do projeto, aproximadamente 3.800 linhas. Build completo confirma ausência de importações quebradas. Módulos do produto e históricos de migração preservados.

Revisão manual concentrada em autenticação, armazenamento, API, sincronização, pesos, tarefas, feedbacks e indicadores. Esta auditoria não equivale a revisão manual linha a linha de todo o conteúdo clínico ou de todos os módulos visuais.

## Validação

25 testes automatizados aprovados, incluindo isolamento de conta, acessos diretos à API, permissões, revogação, persistência após reinício, tarefa concluída e histórico, respostas ao tutor e proprietário, paginação e carga sintética existente. Novas regressões verificam duas versões de personalização, exclusões de preferências, rejeição de conflito e rollback de peso/plano com falha forçada.

Build de tutor e proprietário e TypeScript aprovados. Lint ainda contém avisos preexistentes de código não utilizado e dependências de hooks; eles não foram corrigidos mecanicamente para evitar mudanças de comportamento. Há aviso de tamanho de pacote no build.

## Limites e próximo passo

Falta repetir a validação visual e de rede intermitente nos seis aparelhos físicos, com duas sessões alterando o mesmo campo e com encerramento/reentrada. Os testes de API não substituem esses testes de navegador.

Ausência de eventos não prova abandono nem revela a causa: acesso expirado, métricas desativadas, perda de rede e dificuldade real precisam ser confrontados com feedback e registros. Dados históricos sem identificação de autor podem conter testes administrativos. Não foi feita inferência individual de abandono a partir de dados de produção nesta entrega.

Antes de ampliar o piloto: executar o roteiro de dois aparelhos, tarefa atribuída/concluída, feedback respondido, logout/login e conferência dos mesmos registros no painel. Backup externo e restauração periódica continuam sendo uma responsabilidade operacional; esta entrega não configura um novo serviço de backup.
