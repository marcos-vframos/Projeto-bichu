# Meu Bichu — servidor independente e equipe

Estado em 19/10/2026: servidor independente publicado em https://meu-bichu-app-production.up.railway.app, com banco e fotos migrados e verificados. Código em https://github.com/marcos-vframos/Projeto-bichu. O endereço antigo dos tutores redireciona para o novo e sua API está sem gravações. A cópia antiga permanece preservada para recuperação, sem ser usada pelo novo runtime.

## O que mudou

- Node.js 24 atende a interface do tutor (`/`), proprietário (`/painel`) e funcionário (`/equipe`). Todos usam a mesma API e banco SQLite persistente; fotos ficam no mesmo volume privado.
- O runtime não requer Sites, ChatGPT, Skip nem PocketBase. O diretório e o cliente PocketBase legados foram removidos. Nutrição e autenticação usam a API própria.
- As funções sociais e cadastro profissional que não estavam disponíveis no piloto continuam indisponíveis, com erro explícito e sem chamadas ao servidor legado. O diretório regional existente permanece na interface do piloto.
- O proprietário entra por link privado, sem formulário de usuário/senha. O link é uma credencial: não o envie aos convidados ou funcionários.
- O proprietário cria acessos individuais e atribui feedbacks em `/painel/equipe`. O funcionário vê só os feedbacks atribuídos a ele e responde. A resposta fica no registro original, aparece ao tutor e mantém autoria e auditoria. Revogar o funcionário encerra suas sessões e remove atribuições.
- Rotas administrativas, saúde, peso, localização, fotos e exportações não são liberadas à equipe. Dados que o tutor escrever voluntariamente no próprio feedback ficam visíveis ao atendente atribuído.
- Os sete dias do piloto continuam contados desde o primeiro acesso; a migração não reinicia o prazo nem apaga os registros.

## Executar

Requisitos: Node.js 24 e npm. Instale as dependências em uma máquina com acesso ao registro npm:

```sh
npm install --ignore-scripts
npm run build
npm test
```

Configure variáveis de ambiente com base em `env.example`. Gere `PILOT_PANEL_KEY` com `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`. Nunca coloque a chave, banco, backup ou dados de participantes no GitHub. O `.gitignore` já exclui os caminhos privados usuais.

Em produção use HTTPS, `NODE_ENV=production`, `APP_ORIGIN=https://seu-dominio` e `DATA_DIR=/data`. Inicie com `npm start`. O proprietário abre `https://seu-dominio/painel#access=CHAVE_PRIVADA`; o fragmento é removido da barra após a troca por cookie HttpOnly. O funcionário abre `https://seu-dominio/equipe` e usa o acesso criado pelo proprietário.

O Dockerfile inclui as duas interfaces compiladas e o servidor. O arquivo `railway.json` define build Docker e verificação `/healthz`. A imagem Docker foi construída e publicada com sucesso no Railway. Os builds Vite e testes Node também passaram localmente.

## Publicar no Railway ou em outro servidor

1. Publique esta pasta em um repositório privado seu; não inclua `node_modules`, `dist`, `data`, `backups` ou credenciais.
2. Crie um serviço a partir desse repositório, com o Dockerfile. No Railway, conecte um volume persistente em `/data` antes de liberar o piloto.
3. Configure as variáveis indicadas e o domínio HTTPS. Não configure `PILOT_PANEL_ORIGIN` nem `PILOT_BRIDGE_KEY`: a ponte entre Sites não faz parte desta implantação.
4. Use uma única instância do servidor. SQLite local e fotos em volume não suportam várias réplicas escrevendo simultaneamente. Ampliação exige planejar banco/armazenamento compartilhados.
5. Faça a migração abaixo e valide com os três perfis antes de distribuir o novo endereço.

O GitHub guarda o código; não executa este backend. Continuará sendo necessário um provedor de hospedagem, domínio e backups. O Docker e os arquivos exportáveis permitem trocar de provedor. Registro de marca/software não altera infraestrutura.

## Migrar os dados do piloto

A migração do piloto atual foi concluída: 10 contas, 53 registros, 6 arquivos, 840 eventos, 850 alterações, 8 aparelhos, 12 sessões e 2 registros de tentativas de login. Tabelas foram comparadas integralmente, incluindo hashes de senha, e fotos foram conferidas por SHA-256. A origem foi pausada antes da exportação. Nenhum prazo foi reiniciado. Qualquer base histórica externa do PocketBase que nunca tenha sido enviada a este piloto continua dependendo de exportação própria; não foi encontrada nesta migração.

O módulo `server/migrate.mjs` importa uma única vez a partir de `MIGRATION_SOURCE` e `MIGRATION_KEY`: exige origem em modo de leitura, compara duas exportações, valida arquivos e restaura em transação apenas num destino vazio. As variáveis temporárias foram esvaziadas depois da importação. Os passos abaixo documentam o procedimento e a recuperação, não uma operação pendente.

1. Interrompa as gravações na origem durante a exportação final. Avise os participantes para não usar o app nessa janela e bloqueie as gravações no servidor de origem antes da troca. Não mantenha dois endereços gravando em bases diferentes.
2. Em ambiente privado configure `MB_BACKUP_ORIGIN` com a URL antiga e `MB_BACKUP_KEY` com a chave administrativa antiga, como variáveis de ambiente, nunca no comando ou GitHub. Execute `node scripts/backup-pilot.mjs /caminho/privado/backup`. O exportador inclui as oito tabelas do piloto e fotos. Compare uma segunda exportação durante a pausa para confirmar estabilidade.
3. Com o destino parado e uma pasta de dados vazia, execute `node scripts/restore-backup-local.mjs /caminho/privado/backup /caminho/volume-vazio`. A restauração recusa um destino ocupado e verifica os tamanhos de todas as fotos antes de importar. Ela não altera a origem.
4. Execute `node scripts/verify-migration.mjs /caminho/privado/backup /caminho/volume-restaurado`. Esse comando compara todas as linhas, hashes de fotos e integridade relacional. Só aceite o destino quando concluir sem erro.
5. Inicie o destino com esse volume. Confira contas, pets, peso/datas, saúde, preferências, fotos, feedbacks e respectivas respostas. Teste login existente: as senhas salvas são hashes, preservados na exportação, sem precisar revelá-las.
6. Crie um funcionário de teste no painel, atribua um feedback e confirme a resposta no tutor. Teste revogação e bloqueio de acesso à administração.
7. Só então distribua o novo endereço e deixe o antigo sem aceitar gravações. Se houver falha antes da liberação, mantenha a origem como produção e descarte o destino de teste. Depois de haver gravações no destino, qualquer retorno exige reconciliar essas gravações.

Depois da troca, backups devem incluir o volume completo, inclusive as tabelas `team_*` e fotos. A rotina antiga de oito tabelas serve à migração inicial, não é um backup completo da nova equipe. Para uma cópia inicial simples e consistente, pare o serviço, copie todo `/data` para destino privado, retome e teste a restauração em outro volume. Antes de ampliar uso real, configure retenção e backups automáticos no provedor.

## Validação executada

18 testes Node passaram, incluindo restauração de foto e histórico, isolamento entre tutores, expiração, preferências, servidor independente, atribuição, resposta ao tutor, autoria, revogação e bloqueio de falsificação do cabeçalho administrativo. Builds das duas interfaces e verificações TypeScript passaram. O domínio novo foi validado por HTTPS: três interfaces acessíveis, proprietário autenticado por link privado, bloqueio de consultas sem sessão e seis fotos verificadas por hash. Não houve teste visual nos aparelhos nesta sessão.

## Acesso temporário do proprietário às duas áreas

Abra uma vez o link privado de proprietário no navegador. No painel, use “Abrir app do tutor” para escolher uma das contas existentes, ou “Abrir área da equipe” para entrar sem usuário e senha. A sessão privada é compartilhada entre as três áreas. O app informa a conta escolhida e permite trocá-la. As mudanças feitas pelo proprietário são salvas na conta escolhida. A entrada é auditada. O tráfego de navegação do proprietário não alimenta as métricas de uso dos participantes. A validade original das contas convidadas não é modificada.

Essa dispensa de formulário vale para o proprietário autenticado pelo link privado. Nenhum acesso público aos dados foi aberto, e a equipe mantém as permissões individuais quando voltar a usar suas próprias contas.

## Funcionários e responsabilidades

A gestão de funcionários fica exclusivamente em `/painel/equipe`, dentro da administração: cadastro, revogação, atribuição de perguntas, criação de tarefas com prazo e prioridade e histórico. `/equipe` mostra apenas “Minhas responsabilidades”, com botões individuais para perguntas e tarefas; ao clicar, o funcionário abre os detalhes e pode responder ou registrar andamento/conclusão. Não há formulário de entrar na conta nem controles administrativos nessa tela. O acesso continua privado e exige uma sessão autorizada.

Funcionários acessam só suas atribuições. O proprietário pode visualizar todas, ou abrir a visão de um funcionário pelo botão na administração. Responsabilidades não são registros clínicos e não liberam acesso geral aos dados dos pets. Tarefas e andamento são persistidos na tabela `team_tasks`; os backups do novo servidor devem incluir todo o volume, conforme já documentado.
