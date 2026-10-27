# Independência do Meu Bichu — 27/10/2026

## Diagnóstico

O ícone roxo da aba era o favicon herdado. As páginas não declaravam um ícone próprio e o navegador recorria ao arquivo antigo. Além disso, o catálogo de retratos e alguns avatares demonstrativos ainda referenciavam o serviço de imagens da Curling, empresa que se identifica como criadora da Skip. Essas URLs eram uma dependência de recursos visuais, não uma evidência de envio dos registros de saúde ao gerador.

O código de autenticação, personalização, registros, equipe e proprietário utiliza a API do próprio aplicativo. O servidor mantém SQLite e fotos no volume Railway; os arquivos de recuperação ficam no armazenamento configurado pelo proprietário. Não há SDK do gerador no conjunto de dependências de execução.

## Correções

- Favicon e ícone de toque próprios, derivados da arte transparente já usada pelo Meu Bichu, declarados explicitamente nas páginas e com URL nova para evitar o cache do ícone antigo.
- Remoção do plugin de instrumentação visual, de seus pacotes diretos, do marcador de edição protegido e das credenciais demonstrativas antigas.
- Substituição de todos os retratos padrão remotos pelos 21 recortes locais da mesma grade já usada no aplicativo. As paletas e fotos pessoais continuam preservadas. Golden Retriever e Boxer, sem retrato local correspondente e com o serviço remoto indisponível para cópia, usam o símbolo do app, sem mostrar foto de outra raça. Os dois temas neutros usam retratos locais compatíveis com seu estilo. Avatares de exemplo passam a usar desenho neutro local.
- Correção da documentação de instalação, API e testes que descrevia outro backend e um MCP não publicado.
- Remoção da importação automática na inicialização. O importador histórico continua disponível exclusivamente como comando de manutenção explícito para destino vazio, com suas verificações de integridade.
- Política de conteúdo restringindo scripts à própria origem, conexões de dados à própria origem e imagens a arquivos próprios, dados ou blobs. Fontes tipográficas do Google continuam como recurso externo identificado; não fazem parte do gerador.
- Auditoria automática no código e na construção publicada, impedindo retorno de endpoints antigos ou metadados do editor.

## Configuração preservada

A integração Railway devolve nomes das variáveis, não seus valores. Foi solicitado esvaziar MIGRATION_SOURCE e MIGRATION_KEY, mas a revisão automática rejeitou a alteração por possível perda de credencial sem autorização específica. Os valores foram preservados. O servidor não lê nem utiliza essas variáveis ao iniciar; somente o comando manual de importação pode lê-las se for deliberadamente executado pelo operador. Isso não impede a operação independente.

Não foram removidos contas, pets, fotos, pesagens ou histórico. A matriz continua sendo o piloto 01 original; beta e testes sujos permanecem separados. Histórico Git e referências antigas de recuperação não são reescritos, pois precisam conservar o que foi publicado em cada momento.

## Evidências e limites

A auditoria de código e arquivos construídos, os testes, as verificações TypeScript e os cabeçalhos HTTP são verificações reproduzíveis. A ausência de endpoints no artefato, combinada com a política do navegador, impede o carregamento padrão de recursos do gerador. Não constitui uma alegação de que extensões instaladas pelo usuário, software do aparelho ou páginas antigas abertas em outras origens estejam sob controle do aplicativo.

Independência do gerador não significa ausência de infraestrutura: a operação ainda utiliza hospedagem, armazenamento, domínio e envio de e-mail escolhidos pelo proprietário. Migrar de hospedagem exige transferir volume, arquivos e configuração; o registro de marca não faz essa transferência.
