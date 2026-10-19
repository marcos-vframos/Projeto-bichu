# Procedimentos e Relatório de Testes — API REST e Servidor MCP

Este documento descreve os fluxos de teste manuais e automatizados desenvolvidos para validar o funcionamento ponta a ponta da **API REST** e do **Servidor MCP Remoto (JSON-RPC 2.0)** do Meu Bichu, comprovando a equivalência de cálculos e a persistência compartilhada com a interface web.

---

## 1. Teste Automatizado de Paridade Nutricional (NRC / WSAVA)

- **Arquivo**: `src/lib/nutrition-parity.test.ts`
- **Objetivo**: Garantir que as equações energéticas utilizadas no frontend (`calculateNutrition` e `getDefaultMeals` em `src/lib/nutrition-calculator.ts`) produzam exatamente os mesmos resultados que os hooks de backend do PocketBase (`api_bcs.js` e `api_feeding_plans.js`).
- **Casos Validados**:
  1. Cão de 10 kg, inteiro, atividade moderada (+10%), meta manter (fator 1.8), ração 3800 kcal/kg.
  2. Cão de 25 kg, castrado, atividade baixa (-10%), meta emagrecer (fator 1.0), ração 3500 kcal/kg.
  3. Cão de 5 kg, inteiro, atividade alta (+20%), meta ganhar (fator 2.0), ração 4000 kcal/kg.
- **Resultado**: 100% dos testes passaram com paridade exata de `dailyKcal`, `dailyGrams` e repartição de refeições.

---

## 2. Roteiro de Testes Manuais com cURL

Defina a URL base:

```bash
export API_URL="https://app-personalizado-bd574.shrd00.internal.goskip.dev/backend/v1"
```

### 2.1 Healthcheck da API

```bash
curl -X GET "$API_URL/health"
# Resposta esperada: HTTP 200 { "status": "ok", "app": "Meu Bichu", "version": "1.0.0" }
```

### 2.2 Autenticação (Login)

```bash
curl -X POST "$API_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"marcos.vframos@gmail.com","password":"SUA_SENHA"}'
# Retorna: { "token": "...", "user": { "id": "...", "name": "Marcos Ramos" } }
```

### 2.3 CRUD de Pets via API REST

```bash
# 1. Criar Pet de teste
curl -X POST "$API_URL/dogs" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"name":"qa-mcp-pet","weight_kg":14.2,"breed":"Beagle","activity_level":"moderada"}'

# 2. Obter Detalhes do Pet
curl -X GET "$API_URL/dogs/$DOG_ID"

# 3. Editar Pet
curl -X PATCH "$API_URL/dogs/$DOG_ID" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"weight_kg":14.5,"notes":"Peso atualizado no retorno da pesagem"}'

# 4. Excluir Pet de teste (Cleanup)
curl -X DELETE "$API_URL/dogs/$DOG_ID" \
  -H "Authorization: Bearer $TOKEN"
```

### 2.4 Registro de Peso e Atualização Síncrona

```bash
curl -X POST "$API_URL/weight-logs" \
  -H "Content-Type: application/json" \
  -d '{"dog":"'$DOG_ID'","weight_kg":14.8}'
# Confirmação: weight_logs criado e campo weight_kg em dogs sincronizado para 14.8.
```

### 2.5 Avaliação BCS e Recálculo Automático

```bash
curl -X POST "$API_URL/bcs-evaluations" \
  -H "Content-Type: application/json" \
  -d '{"dog":"'$DOG_ID'","score":7,"auto_adjust":true}'
# Confirmação: bcs_evaluations gravado, categoria sobrepeso, meta ajustada para emagrecer e novo feeding_plans ativo criado.
```

---

## 3. Testes do Servidor MCP Remoto (JSON-RPC 2.0)

O endpoint `/backend/v1/mcp` aceita chamadas do protocolo Model Context Protocol:

### 3.1 Inicialização (`initialize`)

```bash
curl -X POST "$API_URL/mcp" \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "initialize",
    "params": {
      "protocolVersion": "2024-11-05",
      "capabilities": {},
      "clientInfo": { "name": "ChatGPT-Connector", "version": "1.0.0" }
    }
  }'
# Resposta: HTTP 200 com capabilities e serverInfo "meu-bichu-mcp-server".
```

### 3.2 Listagem de Ferramentas (`tools/list`)

```bash
curl -X POST "$API_URL/mcp" \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 2,
    "method": "tools/list",
    "params": {}
  }'
# Resposta: lista com as 23 ferramentas mapeadas e schemas JSON válidos.
```

### 3.3 Execução de Ferramenta (`tools/call` -> `listar_meus_pets`)

```bash
curl -X POST "$API_URL/mcp" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "jsonrpc": "2.0",
    "id": 3,
    "method": "tools/call",
    "params": {
      "name": "listar_meus_pets",
      "arguments": {}
    }
  }'
# Resposta: lista formatada em texto + payload estruturado com os pets do usuário.
```

### 3.4 Execução de Ferramenta (`tools/call` -> `registrar_bcs`)

```bash
curl -X POST "$API_URL/mcp" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "jsonrpc": "2.0",
    "id": 4,
    "method": "tools/call",
    "params": {
      "name": "registrar_bcs",
      "arguments": {
        "dog_id": "'$DOG_ID'",
        "score": 5,
        "auto_adjust": true
      }
    }
  }'
# Resposta: escore 5/9 registrado, categoria ideal, meta manter, porção alimentar recalculada.
```

---

## 4. Testes de Ciclo de Vida e Isolamento de Dados

Durante os testes de homologação, foram gerados registros de validação prefixados com `qa-mcp-` (usuário, pet, pesagem, avaliação BCS, rotina e evento de saúde). Todos os registros foram conferidos e subsequentemente deletados através das rotinas de limpeza, garantindo que **nenhum dado real de tutores ou cães de produção foi alterado, corrompido ou sobrescrito**.
