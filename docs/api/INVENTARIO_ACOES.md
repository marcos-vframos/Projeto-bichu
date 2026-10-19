# Inventário Verificável de Ações — Meu Bichu

Este documento descreve detalhadamente todas as ações disponíveis na interface da aplicação **Meu Bichu**, mapeando cada fluxo aos arquivos reais de código-fonte, regras de validação, modelos e coleções do PocketBase (Skip Cloud), efeitos no banco de dados, permissões e respostas esperadas.

---

## Legenda de Classificação de Dados

- **[REAL]**: Funcionalidade em operação com dados e coleções reais do banco de dados (PocketBase).
- **[DEMO]**: Registros e sementes demonstrativas carregadas em migrations de demonstração (ex: perfis de profissionais e posts de exemplo das migrations `0010` e `0011`).
- **[INCOMPLETO / EM EXPANSÃO]**: Recursos cujo fluxo da interface ainda não possui backend nativo de ponta a ponta (exemplo: chat direto interno entre matches, que na interface atual redireciona para conversa direta via WhatsApp).

---

## 1. Módulo: Pets e Cadastro Canino

### 1.1 Listar Pets do Usuário / Dispositivo

- **Arquivos Envolvidos**: `src/pages/DogsList.tsx`, `src/contexts/DogContext.tsx`, `src/services/nutrition.ts`
- **Origem / Gatilho**: Abertura da lista de pets (`/dogs`) ou inicialização da aplicação.
- **Entradas**:
  - `device_key` (string do localStorage / cookie de dispositivo).
  - `user.id` (quando autenticado via `pb.authStore.record.id`).
- **Regras & Validações**:
  - Se usuário autenticado: filtra por `user = "${currentUserId}" || device_key = "${deviceKey}"`.
  - Se anônimo: filtra por `device_key = "${deviceKey}"`.
  - Ordenação decrescente por data de criação (`-created`).
- **Efeito no Banco**: Leitura (`getFullList`) na coleção `dogs`.
- **Permissões PocketBase**: `listRule` da collection `dogs` (aberta/pública).
- **Resposta Esperada**: Array de `DogRecord[]` contendo dados biométricos, microchip, tracker e URLs de fotos.
- **Classificação**: **[REAL]**

### 1.2 Criar Pet (Cadastro)

- **Arquivos Envolvidos**: `src/pages/DogForm.tsx`, `src/services/nutrition.ts`
- **Origem / Gatilho**: Formulário em `/dogs/new` (botão "Salvar Cão").
- **Entradas**:
  - `name`: string (obrigatório, trim).
  - `weight_kg`: número > 0 (obrigatório).
  - `breed`: string (opcional, padrão 'SRD').
  - `species`: string (opcional, padrão 'cao').
  - `birth_date`: date string ISO (opcional, fallback para data atual).
  - `sex`: select (`macho` | `femea`, padrão `macho`).
  - `sterilized`: boolean (padrão `false`).
  - `activity_level`: select (`baixa` | `moderada` | `alta`, padrão `moderada`).
  - `body_condition`: select (`abaixo_do_ideal` | `ideal` | `acima_do_ideal`, padrão `ideal`).
  - `size`: select (`mini` | `pequeno` | `medio` | `grande` | `gigante`, padrão `medio`).
  - `microchip`: string (opcional).
  - `tracker_brand`: string (opcional).
  - `tracker_id`: string (opcional).
  - `notes`: string (opcional).
  - `avatar`: arquivo de imagem (opcional, até 5MB).
  - `gallery`: lista de arquivos de imagem (opcional).
- **Regras & Validações**:
  - Nome não pode ser vazio.
  - Peso deve ser numérico positivo.
  - Associa automaticamente `device_key` e `user` (se logado).
  - Cria automaticamente um primeiro registro em `weight_logs` com a data atual e o peso inicial.
- **Efeito no Banco**:
  1. `create` em `dogs`.
  2. `create` em `weight_logs` (`dog = created.id, weight_kg, logged_at`).
- **Permissões PocketBase**: `createRule` em `dogs` e `weight_logs`.
- **Resposta Esperada**: `DogRecord` criado + redirecionamento para detalhes do pet.
- **Classificação**: **[REAL]**

### 1.3 Editar Pet

- **Arquivos Envolvidos**: `src/pages/DogForm.tsx`, `src/services/nutrition.ts`
- **Origem / Gatilho**: Formulário em `/dogs/:id/edit`.
- **Entradas**: Parâmetros alterados do pet (nome, raça, peso, fotos, gallery, tracker, etc.).
- **Regras & Validações**:
  - Identificador válido do cão.
  - Respeita tipos de campos enumerados do PocketBase.
- **Efeito no Banco**: `update` na coleção `dogs`.
- **Permissões PocketBase**: `updateRule` em `dogs`.
- **Resposta Esperada**: `DogRecord` atualizado.
- **Classificação**: **[REAL]**

### 1.4 Excluir Pet

- **Arquivos Envolvidos**: `src/pages/DogDetail.tsx`, `src/services/nutrition.ts`
- **Origem / Gatilho**: Botão "Excluir Pet" no modal de confirmação.
- **Entradas**: `dogId` (string).
- **Regras & Validações**: Exclusão permitida para o cão associado ao usuário/dispositivo.
- **Efeito no Banco**: `delete` na coleção `dogs` (e registros dependentes se houver cascata).
- **Permissões PocketBase**: `deleteRule` em `dogs`.
- **Resposta Esperada**: Booleano de sucesso.
- **Classificação**: **[REAL]**

---

## 2. Módulo: Condição Corporal (BCS) e Peso

### 2.1 Avaliação Interativa de BCS (Body Condition Score 1 a 9)

- **Arquivos Envolvidos**: `src/pages/BcsInteractive.tsx`, `src/components/BCSAssessmentCockpit.tsx`, `src/lib/bcs-data.ts`, `src/lib/nutrition-calculator.ts`, `src/services/nutrition.ts`
- **Origem / Gatilho**: Cockpit interativo em `/bcs` ou `/bcs/:id`.
- **Entradas**:
  - `dog`: ID do cão (obrigatório).
  - `score`: número inteiro de 1 a 9 (obrigatório).
  - `notes`: texto de observação clínica (opcional).
  - `autoAdjustPlan`: booleano (se deve recalcular meta e porção alimentar do pet).
- **Regras & Validações**:
  - Escala BCS WSAVA:
    - 1 a 3: categoria `abaixo` -> meta recomendada `ganhar` (fator base 2.0).
    - 4 a 5: categoria `ideal` -> meta recomendada `manter` (fator base 1.6 castrado / 1.8 inteiro).
    - 6 a 7: categoria `sobrepeso` -> meta recomendada `emagrecer` (fator base 1.0).
    - 8 a 9: categoria `obesidade` -> meta recomendada `emagrecer` (fator base 1.0).
  - Se `autoAdjustPlan = true`:
    - Recalcula energia diária (RER = 70 _ peso^0.75 _ fator \* ajuste de atividade).
    - Desativa planos anteriores (`is_active = false`) e cria novo plano ativo em `feeding_plans`.
    - Atualiza campo `body_condition` em `dogs` (`abaixo_do_ideal`, `ideal`, `acima_do_ideal`).
- **Efeito no Banco**:
  1. `create` em `bcs_evaluations` com score, categoria, peso na data, meta anterior e nova meta.
  2. (Se autoAdjust) `update` em `dogs` (`body_condition`).
  3. (Se autoAdjust) `update` nos planos anteriores e `create` em `feeding_plans`.
- **Permissões PocketBase**: `createRule` em `bcs_evaluations`, `feeding_plans`, `updateRule` em `dogs`.
- **Resposta Esperada**: Registro `BcsEvaluationRecord` gravado com detalhamento das alterações.
- **Classificação**: **[REAL]**

### 2.2 Registro e Histórico de Peso (Weight Logs)

- **Arquivos Envolvidos**: `src/pages/WeightTracker.tsx`, `src/components/WeightSheet.tsx`, `src/services/nutrition.ts`
- **Origem / Gatilho**: Tela de peso (`/weight`) ou modal de pesagem rápida no cabeçalho.
- **Entradas**:
  - `dogId`: ID do cão.
  - `weightKg`: número > 0.
  - `loggedAt`: data ISO (opcional, padrão momento atual).
- **Regras & Validações**:
  - Peso numérico > 0.
  - Ao registrar novo peso, atualiza sincronamente o campo `weight_kg` em `dogs`.
- **Efeito no Banco**:
  1. `create` em `weight_logs`.
  2. `update` em `dogs` (`weight_kg = novoPeso`).
- **Permissões PocketBase**: `createRule` em `weight_logs`, `updateRule` em `dogs`.
- **Resposta Esperada**: Objeto `WeightLogRecord` criado e peso do cão atualizado.
- **Classificação**: **[REAL]**

---

## 3. Módulo: Nutrição, Alimentação e Comparação de Rações

### 3.1 Consulta e Configuração de Plano Alimentar

- **Arquivos Envolvidos**: `src/pages/FeedingPlan.tsx`, `src/lib/nutrition-calculator.ts`, `src/services/nutrition.ts`
- **Origem / Gatilho**: Rota `/feeding` ou `/dogs/:id/feeding`.
- **Entradas**:
  - `dogId`: ID do pet.
  - `food_name`: nome da ração ou alimento comercial.
  - `kcal_per_kg`: densidade calórica (número, ex: 3800).
  - `meals_per_day`: 1 a 4 refeições diárias.
  - `goal`: `manter` | `emagrecer` | `ganhar`.
  - `meals_json`: distribuição de horários e gramas por refeição.
- **Regras & Validações**:
  - Fórmula oficial NRC/WSAVA implementada em `calculateNutrition`:
    - RER = 70 \* (pesoKg ^ 0.75)
    - Base factor: emagrecer = 1.0; manter = 1.6 (castrado) ou 1.8 (inteiro); ganhar = 2.0.
    - Ajuste de atividade: baixa = -10%, moderada = +10%, alta = +20%.
    - Gramas diárias = kcal_diária / (kcal_per_kg / 1000).
- **Efeito no Banco**:
  - Inativação de planos anteriores do cão (`is_active = false`).
  - Criação de novo registro ativo em `feeding_plans`.
- **Permissões PocketBase**: `createRule` e `updateRule` em `feeding_plans`.
- **Resposta Esperada**: `FeedingPlanRecord` ativo com divisão de refeições calculada.
- **Classificação**: **[REAL]**

### 3.2 Catálogo de Rações e Comparação

- **Arquivos Envolvidos**: `src/pages/FoodComparison.tsx`, `src/services/nutrition.ts`
- **Origem / Gatilho**: Tela de comparação de rações (`/foods` ou `/compare-foods`).
- **Entradas**: Seleção de 2 ou mais rações para cálculo de custo/dia e densidade de proteína/kcal.
- **Regras & Validações**: Leitura somente-leitura do catálogo curado `foods`.
- **Efeito no Banco**: Consulta `foods` com ordenação por nome.
- **Permissões PocketBase**: `listRule` e `viewRule` em `foods`.
- **Resposta Esperada**: Lista de `FoodRecord[]`.
- **Classificação**: **[REAL]** (catálogo padrão com dados semeados em `0002_seed_foods_catalog.js`).

### 3.3 Envio Colaborativo de Ração com Fotos do Rótulo

- **Arquivos Envolvidos**: `src/pages/FoodComparison.tsx`, `src/services/nutrition.ts`
- **Origem / Gatilho**: Botão "Cadastrar Nova Ração" / Envio de foto do rótulo.
- **Entradas**:
  - `name`, `brand`, `kcal_per_kg`, `protein_pct`, `fat_pct`, `fiber_pct`, `moisture_pct`, `package_weight_kg`, `package_price_brl`, `ingredients`.
  - `front_photo`: arquivo de imagem da frente do pacote.
  - `spec_photo`: arquivo de imagem da tabela nutricional / níveis de garantia.
- **Regras & Validações**:
  - Grava com status padrão `validado` ou `pendente`.
  - Respeita anonimização LGPD (associa apenas `device_key`, sem vazar dados pessoais).
- **Efeito no Banco**: `create` em `user_foods`.
- **Permissões PocketBase**: `createRule` em `user_foods`.
- **Resposta Esperada**: Registro `UserFoodRecord` criado.
- **Classificação**: **[REAL]**

---

## 4. Módulo: Saúde Assistida e Rotina

### 4.1 Registros de Saúde Assistida (Vacinas, Medicamentos, Consultas, Tratamentos)

- **Arquivos Envolvidos**: `src/pages/AssistedHealth.tsx`, `src/services/nutrition.ts`
- **Origem / Gatilho**: Tela de saúde assistida (`/health` ou `/health/:id`).
- **Entradas**:
  - `dog`: ID do cão.
  - `type`: select (`consulta` | `vacina` | `medicacao` | `tratamento` | `evento`).
  - `title`: título do procedimento/medicamento (obrigatório).
  - `event_date`: data ISO.
  - `dosage`: texto descritivo (ex: '1 comprimido de 5mg').
  - `frequency`: texto descritivo (ex: 'a cada 12 horas').
  - `duration`: texto descritivo (ex: '7 dias').
  - `professional`: nome do veterinário responsável.
  - `location`: clínica ou hospital veterinário.
  - `completed`: booleano indicando conclusão.
  - `notes`: observações adicionais.
- **Regras & Validações**:
  - Título não pode ser vazio.
  - Tipo deve pertencer ao enum homologado.
  - Ação de alternar conclusão (`toggleHealthEventCompleted`) altera apenas o campo booleano `completed`.
- **Efeito no Banco**: `create`, `update`, `delete` na coleção `health_events`.
- **Permissões PocketBase**: `createRule`, `updateRule`, `deleteRule` em `health_events`.
- **Resposta Esperada**: `HealthEventRecord` atualizado.
- **Classificação**: **[REAL]**

### 4.2 Agenda e Rotina Independente do Pet

- **Arquivos Envolvidos**: `src/pages/AssistedHealth.tsx`, `src/services/nutrition.ts`
- **Origem / Gatilho**: Aba "Rotina e Eventos" da tela de saúde/rotina.
- **Entradas**:
  - `dog`: ID do cão.
  - `user`: ID do usuário.
  - `title`: título da atividade.
  - `category`: select (`passeio` | `aniversario` | `adestramento` | `competicao` | `banho_tosa` | `encontro` | `viagem` | `outro`).
  - `event_date`: data do evento.
  - `start_time`: horário de início (string HH:mm).
  - `end_time`: horário de término (string HH:mm).
  - `location`: local do evento.
  - `repeat`: select (`nenhuma` | `diaria` | `semanal` | `quinzenal` | `mensal` | `anual`).
  - `completed`: booleano.
  - `notes`: observações.
- **Regras & Validações**: Validação de formato de horários e enum de recorrência.
- **Efeito no Banco**: CRUD na coleção `pet_routine_events`.
- **Permissões PocketBase**: Regras abertas de CRUD em `pet_routine_events`.
- **Resposta Esperada**: `RoutineEventRecord`.
- **Classificação**: **[REAL]**

---

## 5. Módulo: Guia de Profissionais e Avaliações

### 5.1 Busca e Listagem de Profissionais

- **Arquivos Envolvidos**: `src/pages/ProfessionalsList.tsx`, `src/services/community.ts`
- **Origem / Gatilho**: Rota `/professionals`.
- **Entradas**: Filtro por categoria (`veterinario`, `adestrador`, `banho_tosa`, etc.) ou busca por texto (nome/cidade).
- **Regras & Validações**: Ordenação primária por média de avaliação (`-rating_avg`) e total de avaliações (`-reviews_count`).
- **Efeito no Banco**: `getFullList` em `professionals`.
- **Permissões PocketBase**: `listRule` e `viewRule` em `professionals`.
- **Resposta Esperada**: Array de `ProfessionalRecord[]`.
- **Classificação**: **[REAL]** (com sementes em **[DEMO]**).

### 5.2 Cadastro e Edição do Perfil Profissional

- **Arquivos Envolvidos**: `src/pages/ProfessionalForm.tsx`, `src/services/community.ts`
- **Origem / Gatilho**: Rota `/professionals/new` ou `/professionals/:id/edit`.
- **Entradas**:
  - `name`, `category`, `specialties` (JSON array de strings), `bio`, `credentials`, `city`, `state`, `address`, `phone`, `whatsapp`, `instagram`, fotos (`avatar`, `cover_image`, `portfolio`).
- **Regras & Validações**:
  - Nome e categoria obrigatórios.
  - Usuário autenticado vinculado em `user`.
- **Efeito no Banco**: `create` ou `update` em `professionals`.
- **Permissões PocketBase**: `createRule` e `updateRule` em `professionals`.
- **Resposta Esperada**: `ProfessionalRecord`.
- **Classificação**: **[REAL]**

### 5.3 Avaliação de Profissional (Reviews)

- **Arquivos Envolvidos**: `src/pages/ProfessionalDetail.tsx`, `src/services/community.ts`
- **Origem / Gatilho**: Botão "Avaliar Profissional" na página do profissional.
- **Entradas**:
  - `professional`: ID do profissional.
  - `rating`: número inteiro de 1 a 5.
  - `comment`: texto da avaliação.
- **Regras & Validações**:
  - Requer usuário autenticado.
  - Cada par `professional + user` é único (`idx_reviews_prof_user`).
  - Recálculo atômico ou imediato de `rating_avg` e `reviews_count` no registro do profissional.
- **Efeito no Banco**:
  1. `create` em `professional_reviews`.
  2. `update` em `professionals` com a nova média aritmética calculada.
- **Permissões PocketBase**: `createRule` em `professional_reviews`, `updateRule` em `professionals`.
- **Resposta Esperada**: `ProfessionalReviewRecord` criado.
- **Classificação**: **[REAL]**

---

## 6. Módulo: Rede Social Pet (Feed, Posts, Curtidas, Comentários, Seguir)

### 6.1 Feed Social Pet

- **Arquivos Envolvidos**: `src/pages/SocialFeed.tsx`, `src/services/community.ts`
- **Origem / Gatilho**: Rota `/feed`.
- **Entradas**: Nenhuma (carregamento por `-created`).
- **Regras & Validações**:
  - Expande relações `user` e `dog`.
  - Se usuário logado, calcula dinamicamente flag booleana `has_liked` consultando `post_likes`.
- **Efeito no Banco**: Leitura em `posts` e `post_likes`.
- **Permissões PocketBase**: Leitura pública.
- **Resposta Esperada**: Lista de `Post[]`.
- **Classificação**: **[REAL]**

### 6.2 Criar Publicação no Feed

- **Arquivos Envolvidos**: `src/pages/SocialFeed.tsx`, `src/services/community.ts`
- **Origem / Gatilho**: Modal "Criar Postagem".
- **Entradas**:
  - `caption`: texto da legenda.
  - `dog`: ID do cão (opcional).
  - `images`: arquivo ou múltiplos arquivos de foto.
  - `location`: cidade ou local.
- **Regras & Validações**: Requer usuário autenticado. Associa nome do autor e do pet.
- **Efeito no Banco**: `create` em `posts`.
- **Permissões PocketBase**: `createRule` em `posts`.
- **Resposta Esperada**: `PostRecord` criado.
- **Classificação**: **[REAL]**

### 6.3 Curtir / Descurtir Publicação (Toggle Like)

- **Arquivos Envolvidos**: `src/pages/SocialFeed.tsx`, `src/services/community.ts`
- **Origem / Gatilho**: Ícone de coração no post.
- **Entradas**: `postId`.
- **Regras & Validações**:
  - Requer usuário autenticado.
  - Se já curtiu: deleta registro em `post_likes` e decrementa `likes_count` em `posts`.
  - Se não curtiu: cria registro em `post_likes` e incrementa `likes_count` em `posts`.
- **Efeito no Banco**: `create`/`delete` em `post_likes` + `update` em `posts`.
- **Resposta Esperada**: `{ has_liked: boolean, likes_count: number }`.
- **Classificação**: **[REAL]**

### 6.4 Comentar em Publicação

- **Arquivos Envolvidos**: `src/pages/SocialFeed.tsx`, `src/services/community.ts`
- **Origem / Gatilho**: Campo de comentário na publicação.
- **Entradas**: `postId`, `text`.
- **Regras & Validações**: Requer usuário autenticado. Texto não vazio. Incrementa `comments_count`.
- **Efeito no Banco**: `create` em `post_comments` + `update` em `posts`.
- **Resposta Esperada**: `PostCommentRecord`.
- **Classificação**: **[REAL]**

### 6.5 Seguir / Deixar de Seguir Usuário (Toggle Follow)

- **Arquivos Envolvidos**: `src/pages/UserProfile.tsx`, `src/services/community.ts`
- **Origem / Gatilho**: Botão "Seguir" no perfil do tutor.
- **Entradas**: `targetUserId`.
- **Regras & Validações**:
  - Requer usuário autenticado.
  - Não pode seguir a si mesmo.
- **Efeito no Banco**: `create` ou `delete` em `follows` (`follower, following`).
- **Resposta Esperada**: Booleano indicando novo estado (`true` = seguindo).
- **Classificação**: **[REAL]**

---

## 7. Módulo: Descobrir e Matches (Canicultura / Profissionais)

### 7.1 Encontro e Tinder Canino / Matching

- **Arquivos Envolvidos**: `src/pages/DiscoverMatches.tsx`, `src/services/community.ts`
- **Origem / Gatilho**: Rota `/discover`.
- **Entradas**:
  - `target_type`: `professional` | `dog`.
  - `target_id`: ID do profissional ou do pet alvo.
  - `action`: `like` | `pass`.
- **Regras & Validações**:
  - Requer usuário autenticado.
  - Se a ação for `like`, verifica se existe `like` mútuo do proprietário alvo.
  - Se recíproco, marca ambos com `is_mutual = true`.
- **Efeito no Banco**: Upsert em `pet_matches`.
- **Permissões PocketBase**: `createRule` e `updateRule` em `pet_matches`.
- **Resposta Esperada**: `{ is_mutual: boolean, record: PetMatchRecord }`.
- **Classificação**: **[REAL]** para a gravação dos matches; **[INCOMPLETO / EM EXPANSÃO]** para o chat interno pós-match (a interface atual orienta contato via WhatsApp direto ou perfil).

---

## 8. Módulo: Conta, Perfil do Tutor e Sessão

### 8.1 Registro de Usuário e Criação de Perfil

- **Arquivos Envolvidos**: `src/pages/Register.tsx`, `src/services/auth.ts`, `src/contexts/AuthContext.tsx`
- **Origem / Gatilho**: Rota `/register`.
- **Entradas**: `name`, `email`, `password`, `passwordConfirm`, `username`, `city`, `state`, `phone`, `role`.
- **Regras & Validações**:
  - Email válido e senha mínima de 8 caracteres.
  - Cria conta em `users`, autentica, cria perfil em `tutor_profiles` e executa rotina suave de vinculação de dados do `device_key` ao `user.id`.
- **Efeito no Banco**:
  1. `create` em `users`.
  2. `create` em `tutor_profiles`.
  3. `update` em `dogs` órfãos do `device_key` para atribuir `user = user.id`.
- **Permissões PocketBase**: `createRule` aberta em `users` e `tutor_profiles`.
- **Resposta Esperada**: Sessão autenticada (token JWT + registro de usuário).
- **Classificação**: **[REAL]**

### 8.2 Autenticação (Login com Email e Senha)

- **Arquivos Envolvidos**: `src/pages/Login.tsx`, `src/services/auth.ts`, `src/contexts/AuthContext.tsx`
- **Origem / Gatilho**: Rota `/login`.
- **Entradas**: `email`, `password`.
- **Regras & Validações**: Validação padrão PocketBase auth with password.
- **Efeito no Banco**: Emissão de token JWT e atualização de `lastResetSentAt`/autenticação.
- **Resposta Esperada**: `{ token, record: UserRecord }`.
- **Classificação**: **[REAL]**

### 8.3 Edição de Perfil do Tutor

- **Arquivos Envolvidos**: `src/pages/Settings.tsx`, `src/pages/UserProfile.tsx`, `src/services/auth.ts`
- **Origem / Gatilho**: Aba de perfil em `/settings` ou `/profile/:id`.
- **Entradas**: `display_name`, `bio`, `city`, `state`, `phone`, `role`, `avatar`.
- **Regras & Validações**: Requer usuário logado dono do registro.
- **Efeito no Banco**: `update` em `tutor_profiles`.
- **Permissões PocketBase**: `updateRule` em `tutor_profiles`.
- **Resposta Esperada**: `TutorProfileRecord` atualizado.
- **Classificação**: **[REAL]**
