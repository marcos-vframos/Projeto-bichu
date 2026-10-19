# Meu Bichu — servidor independente e equipe

Estado em 19/10/2026: implementação local testada. NÃO publicada, NÃO migrada com os dados reais. Os dois Sites anteriores continuam sendo a produção. Esta pasta é uma cópia independente; nenhuma modificação foi publicada neles.

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

O Dockerfile inclui as duas interfaces compiladas e o servidor. O arquivo `railway.json` define build Docker e verificação `/healthz`. A imagem Docker não foi construída nesta sessão: o acesso externo necessário à instalação foi bloqueado. Os builds Vite e testes Node foram executados localmente.

## Publicar no Railway ou em outro servidor

1. Publique esta pasta em um repositório privado seu; não inclua `node_modules`, `dist`, `data`, `backups` ou credenciais.
2. Crie um serviço a partir desse repositório, com o Dockerfile. No Railway, conecte um volume persistente em `/data` antes de liberar o piloto.
3. Configure as variáveis indicadas e o domínio HTTPS. Não configure `PILOT_PANEL_ORIGIN` nem `PILOT_BRIDGE_KEY`: a ponte entre Sites não faz parte desta implantação.
4. Use uma única instância do servidor. SQLite local e fotos em volume não suportam várias réplicas escrevendo simultaneamente. Ampliação exige planejar banco/armazenamento compartilhados.
5. Faça a migração abaixo e valide com os três perfis antes de distribuir o novo endereço.

O GitHub guarda o código; não executa este backend. Continuará sendo necessário um provedor de hospedagem, domínio e backups. O Docker e os arquivos exportáveis permitem trocar de provedor. Registro de marca/software não altera infraestrutura.

## Migrar os dados do piloto

A migração real ainda está pendente. Nesta sessão a conexão à origem foi bloqueada pela rede; nenhum backup de produção foi baixado ou importado. Qualquer base histórica externa do PocketBase precisa de exportação própria: não consta neste pacote.

1. Interrompa as gravações na origem durante a exportação final. Avise os participantes para não usar o app nessa janela e bloqueie as gravações no servidor de origem antes da troca. Não mantenha dois endereços gravando em bases diferentes.
2. Em ambiente privado configure `MB_BACKUP_ORIGIN` com a URL antiga e `MB_BACKUP_KEY` com a chave administrativa antiga, como variáveis de ambiente, nunca no comando ou GitHub. Execute `node scripts/backup-pilot.mjs /caminho/privado/backup`. O exportador inclui as oito tabelas do piloto e fotos. Compare uma segunda exportação durante a pausa para confirmar estabilidade.
3. Com o destino parado e uma pasta de dados vazia, execute `node scripts/restore-backup-local.mjs /caminho/privado/backup /caminho/volume-vazio`. A restauração recusa um destino ocupado e verifica os tamanhos de todas as fotos antes de importar. Ela não altera a origem.
4. Execute `node scripts/verify-migration.mjs /caminho/privado/backup /caminho/volume-restaurado`. Esse comando compara todas as linhas, hashes de fotos e integridade relacional. Só aceite o destino quando concluir sem erro.
5. Inicie o destino com esse volume. Confira contas, pets, peso/datas, saúde, preferências, fotos, feedbacks e respectivas respostas. Teste login existente: as senhas salvas são hashes, preservados na exportação, sem precisar revelá-las.
6. Crie um funcionário de teste no painel, atribua um feedback e confirme a resposta no tutor. Teste revogação e bloqueio de acesso à administração.
7. Só então distribua o novo endereço e deixe o antigo sem aceitar gravações. Se houver falha antes da liberação, mantenha a origem como produção e descarte o destino de teste. Depois de haver gravações no destino, qualquer retorno exige reconciliar essas gravações.

Depois da troca, backups devem incluir o volume completo, inclusive as tabelas `team_*` e fotos. A rotina antiga de oito tabelas serve à migração inicial, não é um backup completo da nova equipe. Para uma cópia inicial simples e consistente, pare o serviço, copie todo `/data` para destino privado, retome e teste a restauração em outro volume. Antes de ampliar uso real, configure retenção e backups automáticos no provedor.

## Validação executada

17 testes Node passaram, incluindo restauração de foto e histórico, isolamento entre tutores, expiração, preferências, servidor independente, atribuição, resposta ao tutor, autoria, revogação e bloqueio de falsificação do cabeçalho administrativo. Builds das duas interfaces e verificações TypeScript passaram. Não houve validação em aparelhos, domínio novo ou infraestrutura externa nesta sessão.
