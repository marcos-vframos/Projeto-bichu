import { handlePilot } from './pilot-api.js'

const tools = [
  {
    name: 'listar_areas_meu_bichu',
    title: 'Listar áreas do Meu Bichu',
    description: 'Mostra as áreas navegáveis do aplicativo Meu Bichu e seus endereços. Não lê dados pessoais.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
    annotations: { readOnlyHint: true },
  },
  {
    name: 'calcular_energia_canina',
    title: 'Calcular energia canina',
    description: 'Aplica exatamente a fórmula de RER, fatores e ajuste de atividade da versão atual do Meu Bichu. É uma estimativa para revisão, não uma prescrição veterinária.',
    inputSchema: {
      type: 'object',
      properties: {
        peso_kg: { type: 'number', exclusiveMinimum: 0, maximum: 150 },
        castrado: { type: 'boolean' },
        atividade: { type: 'string', enum: ['baixa', 'moderada', 'alta'] },
        objetivo: { type: 'string', enum: ['manter', 'emagrecer', 'ganhar'] },
        kcal_por_kg_racao: { type: 'number', exclusiveMinimum: 1000, maximum: 8000 },
        refeicoes_por_dia: { type: 'integer', minimum: 1, maximum: 4 },
      },
      required: ['peso_kg', 'castrado', 'atividade', 'objetivo', 'kcal_por_kg_racao'],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true },
  },

]

function jsonRpc(id, result, status = 200) {
  return new Response(JSON.stringify({ jsonrpc: '2.0', id, result }), {
    status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  })
}
function error(id, code, message, status = 200) {
  return new Response(JSON.stringify({ jsonrpc: '2.0', id, error: { code, message } }), {
    status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  })
}
function check(input, schema) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('Parâmetros inválidos')
  for (const required of schema.required ?? []) if (!(required in input)) throw new Error('Falta: ' + required)
  for (const [key, value] of Object.entries(input)) {
    const rule = schema.properties[key]
    if (!rule) throw new Error('Parâmetro desconhecido: ' + key)
    if (rule.type === 'number' && (typeof value !== 'number' || !Number.isFinite(value))) throw new Error('Número inválido: ' + key)
    if (rule.type === 'integer' && !Number.isInteger(value)) throw new Error('Inteiro inválido: ' + key)
    if (rule.type === 'boolean' && typeof value !== 'boolean') throw new Error('Booleano inválido: ' + key)
    if (rule.type === 'string' && typeof value !== 'string') throw new Error('Texto inválido: ' + key)
    if (rule.enum && !rule.enum.includes(value)) throw new Error('Opção inválida: ' + key)
    if (rule.minimum != null && value < rule.minimum || rule.maximum != null && value > rule.maximum ||
        rule.exclusiveMinimum != null && value <= rule.exclusiveMinimum) throw new Error('Valor fora do intervalo: ' + key)
  }
}
function runTool(name, input, origin) {
  if (name === 'listar_areas_meu_bichu') return {
    areas: [
      ['Início', '/'], ['Meus pets', '/caes'],
      ['Controle de peso', '/peso'], ['Plano alimentar', '/plano'],
      ['Comparador de rações', '/comparador'], ['Saúde assistida', '/saude-assistida'],
      ['Profissionais', '/profissionais'], ['Configurações', '/configuracoes'],
    ].map(([nome, rota]) => ({ nome, url: origin + rota })),
    estado: 'Prévia de avaliação. Dados do perfil Luna são exemplos locais no navegador.',
  }
  if (name === 'calcular_energia_canina') {
    const rer = 70 * Math.pow(input.peso_kg, 0.75)
    const factor = input.objetivo === 'emagrecer' ? 1 : input.objetivo === 'ganhar' ? 2 : input.castrado ? 1.6 : 1.8
    const adjustment = { baixa: -10, moderada: 10, alta: 20 }[input.atividade]
    const kcal = Math.round(rer * factor * (1 + adjustment / 100))
    const grams = Math.round(kcal / (input.kcal_por_kg_racao / 1000))
    const count = input.refeicoes_por_dia ?? 2
    return { rer_kcal: Math.round(rer), fator_base: factor, ajuste_atividade_percentual: adjustment,
      energia_diaria_kcal: kcal, racao_diaria_g: grams, refeicoes_por_dia: count,
      gramas_por_refeicao: Math.round(grams / count),
      nota: 'Reproduz a lógica atual do app; não é uma recomendação clínica individual.' }
  }
  const category = input.escore <= 3 ? 'abaixo do ideal' : input.escore <= 5 ? 'ideal' :
    input.escore <= 7 ? 'sobrepeso' : 'obesidade'
  return { escore: input.escore, categoria: category,
    nota: 'O escore exige observação e palpação; a categoria isolada não diagnostica o animal.' }
}
async function handleMcp(request) {
  if (request.method !== 'POST') return new Response('Use POST', { status: 405 })
  let call
  try { call = await request.json() } catch { return error(null, -32700, 'JSON inválido', 400) }
  if (!call || call.jsonrpc !== '2.0' || typeof call.method !== 'string') return error(call?.id ?? null, -32600, 'Requisição inválida', 400)
  if (call.method === 'notifications/initialized') return new Response(null, { status: 202 })
  if (call.method === 'initialize') return jsonRpc(call.id, {
    protocolVersion: '2025-03-26', capabilities: { tools: { listChanged: false } },
    serverInfo: { name: 'meu-bichu', version: '0.1.0' },
  })
  if (call.method === 'tools/list') return jsonRpc(call.id, { tools })
  if (call.method === 'tools/call') {
    const tool = tools.find((item) => item.name === call.params?.name)
    if (!tool) return error(call.id, -32602, 'Ferramenta desconhecida')
    try {
      const input = call.params.arguments ?? {}
      check(input, tool.inputSchema)
      const output = runTool(tool.name, input, new URL(request.url).origin)
      return jsonRpc(call.id, { content: [{ type: 'text', text: JSON.stringify(output) }] })
    } catch (e) {
      return jsonRpc(call.id, { content: [{ type: 'text', text: String(e.message) }], isError: true })
    }
  }
  return error(call.id, -32601, 'Método desconhecido')
}
export default {
  async fetch(request, env) {
    if (new URL(request.url).pathname.startsWith('/api/pilot/')) {
      try { return await handlePilot(request, env) }
      catch (error) { console.error('Falha na API do piloto', error); return Response.json({ error: 'Serviço temporariamente indisponível' }, { status: 500, headers: { 'cache-control': 'no-store' } }) }
    }
    if (/^\/(bcs-fase14\.html|models\/)/.test(new URL(request.url).pathname)) return new Response('BCS inativo nesta versão',{status:404})
    if (new URL(request.url).pathname === '/mcp') return handleMcp(request)
    if (!env.ASSETS) return new Response('Site indisponível', { status: 503 })
    const response = await env.ASSETS.fetch(request)
    if (response.status !== 404 || request.method !== 'GET' || !request.headers.get('accept')?.includes('text/html')) return response
    // Serve the root document internally. /index.html is canonicalized to /
    // by the asset service, which otherwise redirects every SPA route home.
    return env.ASSETS.fetch(new Request(new URL('/', request.url), request))
  },
}
