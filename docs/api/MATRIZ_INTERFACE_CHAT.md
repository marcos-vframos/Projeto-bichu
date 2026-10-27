# Mapa de interface e API

As três interfaces utilizam o servidor próprio, com autorização distinta. A interface não fornece uma chave administrativa a um tutor ou funcionário.

| Interface | Rotas | Registros |
| --- | --- | --- |
| Tutor | `/api/pilot/records`, `/api/pilot/preferences`, `/api/pilot/me` | Dados exclusivamente da conta autenticada |
| Funcionário | `/api/team` | Atividades e casos permitidos pelas atribuições e responsáveis |
| Proprietário | `/api/pilot/owner`, `/api/team` | Consultas consolidadas e controles administrativos autorizados |
| Matriz | `/api/pilot/owner/labs/matrix` | Piloto 01 original e referências congeladas, sem restauração implícita |
| Autenticação pública | `/api/access` | Cadastro, confirmação e recuperação, conforme configuração de e-mail |

Não existe correspondência com ferramentas MCP públicas nesta versão. Os caminhos e métodos completos devem ser conferidos em server/index.mjs, server/team.mjs e worker/pilot-api.js antes de uma integração.
