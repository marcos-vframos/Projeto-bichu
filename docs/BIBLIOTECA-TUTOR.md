# Biblioteca do tutor

Área `/biblioteca`, acessível pelo menu do tutor. Acervo inicial: oito PDFs originais, cinco perfis (três caninos e dois felinos). Edições agrupadas; Bernese revisado e Ragdoll Coleção aparecem primeiro, com identificação explícita da edição. Pit Bull · Red Nose é um perfil de conteúdo, não uma afirmação de raça reconhecida independente.

## Organização e expansão

`public/biblioteca/catalogo.json` é o catálogo versionado. Cada perfil tem ID estável, espécie, resumo editorial, tags, capa e documentos. Cada documento guarda ID, edição, tamanho, SHA-256, páginas, nome original, URL e capítulos extraídos dos marcadores reais do PDF. O catálogo é validado antes do uso. Novos PDFs devem manter caminhos locais e os campos definidos em `src/lib/library-catalog.ts`; não usar URLs externas nem confundir uma nova edição com outra raça.

Para adicionar material: verificar autoria/autorização e revisão editorial, calcular SHA-256 dos bytes originais, usar nome com hash em `documentos`, criar capa pequena em `capas`, registrar metadados e destinos reais dos capítulos e executar testes/build. Novas versões usam outro hash, preservando a anterior. Os arquivos iniciais são cópias byte a byte do ZIP fornecido; nenhum formulário foi alterado. Não publicar dados pessoais em fichas do acervo.

A interface usa busca por raça, resumo, tags, título de documento, edição e capítulos. Áreas: cães, gatos, cuidados por tema, fichas e salvos. Mostra 12 perfis por lote. Imagens e leitor carregam sob demanda; o catálogo não baixa PDFs. Os PDFs e recursos do leitor são hospedados pelo próprio aplicativo. Para centenas de arquivos, planejar armazenamento de objetos com entrega por streaming/range antes de multiplicar o tamanho de cada publicação; o catálogo pode manter o contrato atual.

## Leitura e limites

PDF.js é carregado somente ao entrar em um documento. Leitura página a página, sumário com destinos, zoom, texto acessível, abertura e download do original. Trabalhador, fontes, CMaps e WASM são locais; CSP mantém conexões e workers na mesma origem e permite apenas compilação WASM, sem habilitar eval de JavaScript.

Favoritos e página lida usam chaves por perfil/documento nas preferências existentes, separadas por conta e sincronizadas no banco com a resolução de conflito já disponível em Configurações. São retomadas de leitura, não comprovação de aprendizado. A mudança de hash inicia progresso independente para outra edição. O conteúdo educativo não interfere em pets, pesos, saúde ou planos alimentares.

Os dois PDFs preenchíveis têm seus campos preservados no original para preenchimento em leitor compatível. O leitor embutido NÃO edita nem importa formulários e não salva seus valores no banco. Não há upload/gestão editorial pelo painel do proprietário nesta entrega: expansão é via catálogo versionado. Não apresentar os guias como revisados por veterinário: o expediente informa ausência de revisão técnico-veterinária.

## Verificação

Testes: integridade dos oito arquivos, páginas e capítulos reais via PDF.js, campos de formulário, busca sem acentos, limites de página, rejeição de URLs fora do acervo, HTTP/MIME dos PDFs/worker/WASM e bloqueio da API administrativa. Conferir ainda a navegação e renderização em aparelhos reais antes de divulgar amplamente; a checagem automatizada não equivale à validação física em iOS/Android.
