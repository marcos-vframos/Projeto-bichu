# Instalação do Meu Bichu

A aplicação atual executa seu próprio servidor Node.js 24. O banco SQLite e os arquivos ficam no volume persistente DATA_DIR. Nenhum serviço do gerador de sites é necessário para construir ou executar o app.

## Instalar e construir

Execute `pnpm install --frozen-lockfile --ignore-scripts`, `npm run build` e `npm test`. A construção inclui as interfaces do tutor e do proprietário. Para desenvolvimento, use `pnpm dev`; ele não conecta ao banco de produção.

## Executar

Defina APP_ORIGIN com a origem HTTPS pública, DATA_DIR com o volume persistente, PORT e PILOT_PANEL_KEY com uma chave aleatória de 64 caracteres hexadecimais. Inicie com `npm start`. Configure as variáveis BACKUP_* para cópias externas e SMTP_* para envio de e-mail, sem publicar segredos no repositório. Veja env.example, docs/LANCAMENTO.md quando disponível e o README principal.

Os caminhos públicos são `/`, `/painel` e `/equipe`. O proprietário usa seu link privado; funcionários e tutores têm autorizações próprias. A API operacional está em `/api/pilot`, `/api/team` e `/api/access`, na mesma origem.

As migrações de banco executadas localmente estão em drizzle/. A migração histórica não roda ao iniciar o servidor. Uma importação excepcional, autorizada e destinada a uma base vazia pode ser executada explicitamente com `node scripts/import-legacy-pilot.mjs`; sua implementação verifica integridade e bloqueia destinos preenchidos.

## Dados e recuperação

Mantenha o volume, as chaves administrativas e de criptografia e o armazenamento de backup sob controle do proprietário. Código no GitHub não substitui backup dos dados. Não copie dados reais para beta ou testes sujos. A conta matriz é o piloto 01 original; consultar uma referência histórica não restaura nem sobrescreve essa conta.
