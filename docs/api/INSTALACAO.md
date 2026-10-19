# Guia de Instalação, Configuração e Migração de Dados — Meu Bichu

Este documento fornece as instruções completas para execução do projeto em ambiente local ou servidor de produção, configuração das variáveis de ambiente, aplicação das migrações do PocketBase e procedimentos seguros de exportação e migração de dados e arquivos existentes (respeitando a LGPD e boas práticas de segurança).

---

## 1. Requisitos do Sistema

- **Node.js**: v18.18+ ou v20+
- **Gerenciador de Pacotes**: `pnpm` (recomendado) ou `npm`
- **Backend**: PocketBase v0.36+ (integrado nativamente via Skip Cloud ou instância auto-hospedada)

---

## 2. Instalação e Execução Local

### 2.1 Clonar ou Descompactar o Pacote

Extraia o arquivo ZIP gerado pelo botão **Código** da aplicação:

```bash
unzip meu-bichu-codigo-fonte.zip -d meu-bichu
cd meu-bichu
```

### 2.2 Instalar Dependências

```bash
pnpm install
```

### 2.3 Variáveis de Ambiente

Crie o arquivo `.env` na raiz do projeto a partir do modelo de exemplo (nunca inclua tokens ou credenciais reais em repositórios públicos):

```bash
cp env.example .env
```

Conteúdo de `.env`:

```env
# URL do backend PocketBase (Skip Cloud ou local)
VITE_POCKETBASE_URL=https://app-personalizado-bd574.shrd00.internal.goskip.dev
```

### 2.4 Executar o Ambiente de Desenvolvimento

```bash
pnpm dev
```

Acesse a aplicação no navegador em `http://localhost:5173`.

---

## 3. Configuração do Backend e Migrações (PocketBase)

As migrações de esquema e sementes estão localizadas no diretório `pocketbase/migrations/`.

### 3.1 Ordem de Execução das Migrações

As migrações são nomeadas sequencialmente:

1. `0001_create_nutrition_collections.js`
2. `0002_seed_foods_catalog.js`
3. `0003_enrich_nutrition_schema.js`
4. `0004_create_bcs_and_enrich_foods.js`
5. `0006_enrich_dog_technical_info.js`
6. `0007_increase_dog_avatar_limit.js`
7. `0008_add_dog_gallery.js`
8. `0009_create_health_and_user_foods.js`
9. `0010_create_community_and_social.js`
10. `0011_seed_community_demo.js`
11. `0012_make_posts_images_optional.js`
12. `0017_create_pet_routine_events.js`
13. `0018_relax_professionals_user.js`
14. `1790688000_cleanup_qa_legacy_users.js`
15. `1790688001_cleanup_peer_users.js`

_Nota_: As migrações estão 100% aplicadas no backend do Skip Cloud.

### 3.2 Server-Side Hooks & Endpoints da API REST e MCP

Os handlers do servidor MCP e da API REST estão localizados em `pocketbase/hooks/`:

- `api_health.js`: Healthcheck (`GET /backend/v1/health`)
- `api_auth_login.js`: Login REST (`POST /backend/v1/auth/login`)
- `api_auth_me.js`: Perfil do usuário logado (`GET /backend/v1/auth/me`)
- `api_dogs.js` & `api_dogs_detail.js`: CRUD de Pets
- `api_weights.js`: Registro e consulta de pesagens
- `api_bcs.js`: Avaliação de condição corporal e recálculo metabólico
- `api_feeding_plans.js`: Consulta e ajuste de rações e metas calóricas
- `api_health_events.js`: Saúde assistida (vacinas, exames, remédios)
- `api_routine_events.js`: Agenda e atividades de rotina
- `api_foods.js`: Catálogo de rações
- `api_professionals.js`: Guia de profissionais e avaliações
- `api_posts.js`: Feed social, curtidas, comentários e seguidores
- `api_matches.js`: Encontros e matches caninos
- `mcp_server.js`: Servidor MCP JSON-RPC 2.0 (`POST /backend/v1/mcp`)

---

## 4. Procedimento de Migração e Exportação de Dados Existentes

### 4.1 Exportação Segura de Dados (Backup)

Para exportar os registros existentes sem expor credenciais:

1. Acesse o painel administrativo do PocketBase (`/_/`).
2. Navegue até **Settings** -> **Export / Backup**.
3. Baixe o backup snapshot do banco SQLite (`pb_data`).
4. Alternativamente, via API REST, utilize requisições paginadas com token de superusuário para exportar coleções em JSON.

### 4.2 Anonimização e Conformidade LGPD

- **Senhas**: Os hashes de senha em `users` usam bcrypt nativo do PocketBase e **nunca** devem ser exportados em texto puro.
- **Dados Pessoais**: Em migrações para ambientes de homologação ou teste, substitua e-mails, telefones e nomes reais de tutores por identificadores anônimos (`tutor_teste_1@exemplo.com`).
- **Arquivos e Fotos**: Os uploads ficam armazenados na pasta `pb_data/storage/`. Para migrar arquivos de mídia para outro servidor, sincronize essa pasta mantendo a mesma estrutura de diretórios e IDs de coleção.

---

## 5. Como Baixar o Pacote Exportável pelo App

A aplicação possui um utilitário nativo de empacotamento completo. Para baixar:

1. Abra a aplicação web no navegador.
2. No cabeçalho superior direito, clique no botão **Código** (com ícone de download).
3. O navegador baixará o arquivo `meu-bichu-codigo-fonte.zip` contendo:
   - Todo o código-fonte React + TypeScript (`src/`)
   - Todas as migrações e hooks do PocketBase (`pocketbase/`)
   - O esquema de banco de dados (`src/lib/pocketbase/schema.json`)
   - A documentação da API, contratos e servidor MCP (`docs/api/`)
   - Os testes automatizados (`src/**/__tests__`) e scripts auxiliares
