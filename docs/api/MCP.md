# Protocolo e Servidor MCP Remoto — Meu Bichu

Este documento descreve a especificação e as instruções de integração do **Servidor MCP Remoto (Model Context Protocol)** implementado na aplicação **Meu Bichu**, permitindo que assistentes de IA (como ChatGPT, Claude Desktop ou instâncias locais/remotas de agentes) consultem e executem as mesmas ações disponíveis na interface visual sobre a mesma base de dados persistente.

---

## 1. Visão Geral da Arquitetura

O servidor MCP opera em conformidade com a especificação **JSON-RPC 2.0 (Streamable HTTP)** sob transporte HTTPS remoto nativo do PocketBase (Skip Cloud):

- **URL Base do Endpoint MCP**:
  `https://app-personalizado-bd574.shrd00.internal.goskip.dev/backend/v1/mcp`
- **Protocolo**: Model Context Protocol (especificação `2024-11-05`) via `POST` HTTP.
- **Autenticação**:
  - Cabeçalho HTTP padrão: `Authorization: Bearer <TOKEN_POCKETBASE>`.
  - Para ferramentas que não dependem estritamente de autenticação (ex: consulta pública de rações, busca de profissionais ou pets via `device_key`), o cabeçalho é opcional.
  - Para ferramentas de mutação do usuário (curtidas, comentários, avaliações, seguir, criar post, dar match), o token de autenticação é obrigatório.

---

## 2. Como Obter o Token de Autenticação

Para autenticar as chamadas do ChatGPT ou outro cliente MCP:

1. **Via Rota de Login REST**:
   Envie uma requisição `POST /backend/v1/auth/login`:
   ```bash
   curl -X POST "https://app-personalizado-bd574.shrd00.internal.goskip.dev/backend/v1/auth/login" \
     -H "Content-Type: application/json" \
     -d '{"email":"seu_email@dominio.com","password":"sua_senha"}'
   ```
   A resposta conterá:
   ```json
   {
     "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
     "user": { "id": "...", "name": "...", "email": "..." }
   }
   ```
2. **Via Interface Web**:
   Ao efetuar login no app Meu Bichu, o token é emitido pelo PocketBase e fica acessível na sessão ativa do usuário.

---

## 3. Métodos do Protocolo MCP Suportados

### 3.1 `initialize`

Negociação de capacidades entre o cliente e o servidor MCP:

```json
// Requisição
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "initialize",
  "params": {
    "protocolVersion": "2024-11-05",
    "capabilities": {},
    "clientInfo": { "name": "ChatGPT", "version": "1.0.0" }
  }
}

// Resposta
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "protocolVersion": "2024-11-05",
    "capabilities": { "tools": { "listChanged": false } },
    "serverInfo": { "name": "meu-bichu-mcp-server", "version": "1.0.0" }
  }
}
```

### 3.2 `tools/list`

Retorna a lista de todas as 23 ferramentas registradas com seus respectivos JSON Schemas de validação.

### 3.3 `tools/call`

Executa uma ferramenta específica com os argumentos informados.

---

## 4. Catálogo Completo de Ferramentas MCP

| Tool MCP                 | Descrição                                                | Parâmetros Principais                            | Autenticação Requerida?                 |
| ------------------------ | -------------------------------------------------------- | ------------------------------------------------ | --------------------------------------- |
| `listar_meus_pets`       | Lista todos os pets vinculados ao usuário ou dispositivo | `device_key` (opcional)                          | Não (se device_key) / Sim (recomendado) |
| `obter_pet`              | Detalhes do pet, raça, porte e condição corporal         | `dog_id`                                         | Não                                     |
| `criar_pet`              | Cadastra novo cão com pesagem inicial automática         | `name`, `weight_kg`, `breed`, `activity_level`   | Opcional                                |
| `editar_pet`             | Atualiza peso, raça, castração ou notas                  | `dog_id`, `name`, `weight_kg`, etc.              | Proprietário                            |
| `excluir_pet`            | Remove o pet                                             | `dog_id`                                         | Proprietário                            |
| `registrar_peso`         | Registra pesagem no histórico e sincroniza peso do pet   | `dog_id`, `weight_kg`, `logged_at`               | Opcional                                |
| `listar_pesos`           | Lista o histórico de pesagens                            | `dog_id`                                         | Não                                     |
| `registrar_bcs`          | Registra escore BCS (1-9) e recalcula porção alimentar   | `dog_id`, `score`, `auto_adjust`                 | Opcional                                |
| `obter_plano_alimentar`  | Consulta gramas/dia e divisão de refeições ativa         | `dog_id`                                         | Não                                     |
| `ajustar_plano`          | Recalcula meta alimentar com equações NRC/WSAVA          | `dog_id`, `kcal_per_kg`, `goal`, `meals_per_day` | Opcional                                |
| `listar_registros_saude` | Vacinas, medicamentos e consultas                        | `dog_id`                                         | Não                                     |
| `criar_registro_saude`   | Adiciona procedimento na saúde assistida                 | `dog_id`, `type`, `title`, `event_date`          | Opcional                                |
| `listar_eventos_rotina`  | Passeios, banhos e agenda de rotina                      | `dog_id`                                         | Não                                     |
| `criar_evento_rotina`    | Adiciona atividade de rotina com início/fim              | `dog_id`, `title`, `category`, `event_date`      | Opcional                                |
| `registrar_racao`        | Cadastra ração no catálogo colaborativo                  | `name`, `brand`, `kcal_per_kg`, `protein_pct`    | Opcional                                |
| `listar_profissionais`   | Busca veterinários, adestradores e creches               | `category` (opcional)                            | Não                                     |
| `avaliar_profissional`   | Avalia com nota de 1 a 5 e recalcula média               | `professional_id`, `rating`, `comment`           | **Sim**                                 |
| `listar_posts`           | Feed social da comunidade pet                            | -                                                | Não                                     |
| `criar_post`             | Publica no feed comunitário                              | `caption`, `dog_id`, `location`                  | **Sim**                                 |
| `curtir_post`            | Toggle like no post                                      | `post_id`                                        | **Sim**                                 |
| `comentar_post`          | Comenta na publicação                                    | `post_id`, `text`                                | **Sim**                                 |
| `seguir`                 | Toggle follow em outro tutor                             | `target_user_id`                                 | **Sim**                                 |
| `registrar_match`        | Like / Pass em encontro canino ou profissional           | `target_type`, `target_id`, `action`             | **Sim**                                 |

---

## 5. Instruções de Configuração no ChatGPT (Connectors / Actions / Custom GPTs)

### Status de Habilitação Externa

> **IMPORTANTE — AVISO DE CONECTIVIDADE EXTERNA:**
> O servidor MCP e as rotas da API estão 100% implementados, testados e funcionais no backend do Meu Bichu. No entanto, a conexão direta via **MCP Connectors** depende da habilitação do recurso na conta e na interface do ChatGPT/OpenAI (onde conectores MCP remotos são habilitados gradualmente pela plataforma). Portanto, este servidor está pronto para conexão, mas a comunicação efetiva via chat só ocorrerá quando o usuário configurar o conector no ChatGPT com os parâmetros abaixo.

### Como Conectar via Custom GPT ou MCP Connector

1. No ChatGPT, acesse **Explore GPTs** -> **Create GPT** -> aba **Configure**.
2. Em **Actions** ou **Connectors**, configure:
   - **Authentication Type**: `Bearer` (ou `API Key` no cabeçalho `Authorization: Bearer <SEU_TOKEN>`).
   - **Endpoint URL**: `https://app-personalizado-bd574.shrd00.internal.goskip.dev/backend/v1/mcp`
   - **Schema**: Importe a especificação das ferramentas listadas em `docs/api/MCP.md` ou use as chamadas JSON-RPC diretas.
3. Exemplos de prompts suportados pelo ChatGPT após conectado:
   - _"Liste os meus cachorros cadastrados no Meu Bichu."_
   - _"O Bob pesou 10.2 kg hoje de manhã, registre o peso dele."_
   - _"Fiz a avaliação corporal do Bob e o escore foi 6/9 (leve sobrepeso). Registre o BCS e recalcule a ração diária dele."_
   - _"Qual é a recomendação de gramas de ração por dia para o Bob atualmente?"_
   - _"Agende uma consulta veterinária para tomar a vacina V10 no dia 15 de outubro."_
