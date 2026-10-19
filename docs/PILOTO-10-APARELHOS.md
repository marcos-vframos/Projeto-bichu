# Piloto de dez acessos — 29/09/2026

A versão de teste usa D1 para os dados estruturados, R2 para fotos e um identificador individual com senha para cada aparelho. A API aplica o ID da conta no servidor em toda leitura, gravação e arquivo. O acesso expira sete dias após o primeiro login e a sessão é encerrada no mesmo prazo. Preferências visuais locais, como tema e pet selecionado, não são dados centrais do piloto.

Foram removidos da navegação e das rotas o Feed da Matilha, Descobrir & Matches, cadastro e avaliação de profissionais e a distribuição do ZIP de código. O catálogo regional permanece para consulta, sem formulário de inscrição. O BCS e os registros de pets continuam disponíveis.

As dez credenciais são geradas fora do repositório em `acessos-piloto-meu-bichu.json`, entregue ao proprietário, e nunca entram no Git. Os endereços `@meubichu.test` são identificadores de login; não recebem e-mail. O responsável deve distribuir uma senha por participante. A chave de administração é um segredo do ambiente hospedado, entregue separadamente ao proprietário. `GET /api/pilot/admin/stats` mostra totais; `GET /api/pilot/admin/export?offset=0` fornece páginas de registros, eventos e metadados; `GET /api/pilot/admin/files/{id}` baixa uma foto. Essas rotas exigem `Authorization: Bearer <chave>`.

Dados de pets, pesagens, planos alimentares, BCS, eventos de saúde/rotina e rações do usuário são gravados em D1. Fotos são armazenadas em R2, com metadados e autorização em D1. Telemetria aceita somente nome de evento técnico e duração. A tela de entrada informa a finalidade e a retenção: o término do acesso não exclui os registros automaticamente.

O painel do proprietário fica em `/painel`. O proprietário recebe um link privado com chave no fragmento da URL, que abre o painel sem login ou senha. A chave é removida da URL ao abrir e trocada por um cookie HttpOnly, Secure e SameSite=Strict válido por 30 dias. Reabrir o link renova o acesso; trocar o segredo `PILOT_PANEL_KEY` revoga links e sessões anteriores. A identidade do proprietário autenticada pelo Site também é aceita. Credenciais de participante não autorizam o painel. Mostra os dez estados de acesso, última atividade, total de registros, evolução de peso e BCS dos pets, falhas, média e percentil 95 dos tempos de resposta. As medições começam após a publicação da instrumentação; o painel informa quando os limites de consulta truncam os resultados.

## Dados históricos do PocketBase

Os anexos recebidos contêm o código e migrações, mas não um backup de `pb_data`, arquivos nem exportação das coleções. Não há registros históricos para importar nesta entrega. Ao receber uma exportação completa do PocketBase e do armazenamento de arquivos, mapear IDs e relações, importar em lote com verificação de contagens e integridade e conferir fotos. Não declarar uma migração concluída a partir do código-fonte.

## Verificação antes dos dez aparelhos

- Aplicar migrações D1, provisionar os dez acessos e testar um login real no Site.
- Em duas contas, cadastrar pet e foto, atualizar, recarregar, sair e entrar; verificar que uma conta não lê nem altera dados da outra por URL/API.
- Confirmar política de backup/restauração do D1 e R2 e disponibilizar ao responsável um procedimento de exportação e exclusão.
- O Site está acessível para os dez testadores, mas a interface e as APIs pessoais exigem as credenciais individuais. O proprietário deve entregar cada senha em particular.

## Painel separado e histórico

O painel do proprietário usa outro projeto e domínio: `https://meu-bichu-proprietario.marcos-vframos.chatgpt.site`. Os convidados permanecem no domínio original. As sessões dos participantes não abrem o painel. O servidor do painel consulta a API de leitura do app com `PILOT_BRIDGE_KEY`, segredo presente apenas nos dois servidores. A aplicação dos convidados desativa o acesso administrativo direto quando `PILOT_PANEL_ORIGIN` está configurado. O banco continua no projeto original, sem copiar ou apagar dados.

O novo site tem acesso de plataforma restrito ao proprietário. Não existe formulário de usuário/senha no painel; a sessão do proprietário na plataforma ou seu link privado libera a sessão interna. A plataforma pode exigir autenticação da conta do proprietário.

A migração 0002 cria histórico via triggers de criação, alteração e exclusão dos registros: saúde, peso, BCS, alimentação, pets, rotina, alimentos e confirmações. Não recupera versões sobrescritas antes da migração. Exclusões preservam os dados textuais no histórico; arquivos removidos não são preservados automaticamente.

O checklist das refeições usa a data do servidor em America/Sao_Paulo, por conta, pet e refeição. A confirmação guarda a porção, nome e horário exibidos. Alterar esses valores exige nova confirmação. No novo dia, a lista fica pendente sem apagar os registros dos anteriores. O proprietário consulta os registros atuais ou o histórico por conta, categoria e pet, em páginas de 100 itens.

O cadastro aceita espécie canina ou felina, com raça felina de texto livre. Cães antigos sem espécie continuam caninos. Para gatos, o cálculo usa fatores de manutenção/crescimento felinos da tabela do MSD; metas automáticas de ganho/perda são desativadas. A avaliação de BCS felina é um registro informado pelo tutor, separado do modelo canino 3D.

### Correção da leitura entre os dois Sites

A consulta do painel pelo servidor retornava 502 antes de chegar à API do app. O navegador autenticado agora obtém em `/api/pilot/owner/data-ticket` uma autorização HMAC de leitura válida por dois minutos. A chave compartilhada permanece apenas nos servidores. O navegador lê a API do app com esse ticket; o app exige GET, validade e origem exata do painel, com CORS restrito. Fotos também são abertas com esse fluxo. O banco e os acessos dos convidados permanecem no projeto original.
