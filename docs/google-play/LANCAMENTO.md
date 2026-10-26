# Meu Bichu — preparação para Google Play

Versão preparada em 26/10/2026. Nenhum aplicativo foi enviado ao Play Console por este trabalho.

## Página da loja

Nome: Meu Bichu

Descrição curta (até 80 caracteres):
Organize alimentação, peso e cuidados de cães e gatos em um só lugar.

Descrição completa:
Meu Bichu ajuda você a acompanhar a rotina dos seus cães e gatos.

Cadastre seus pets, organize refeições e confirme os cuidados do dia. Registre pesagens com datas e acompanhe a evolução do peso. Mantenha compromissos de saúde e lembretes organizados, consulte profissionais e compare opções de alimentação com base nas informações cadastradas.

Personalize sua experiência e mantenha os registros vinculados à sua conta. Envie dúvidas e sugestões pelo feedback e consulte as respostas da equipe no próprio aplicativo.

A localização e as métricas de uso são opcionais. Você pode controlar essas escolhas nas Configurações e excluir sua conta pelo app ou pela página pública de exclusão.

O Meu Bichu é uma ferramenta de organização. Os cálculos alimentares são estimativas e não substituem orientação veterinária, diagnóstico ou prescrição. Dietas para condições de saúde e alimentação natural exigem acompanhamento profissional. A avaliação corporal interativa BCS está inativa nesta versão.

Suporte: suportemeubichu@gmail.com
Política: https://meu-bichu-app-production.up.railway.app/privacidade.html
Termos: https://meu-bichu-app-production.up.railway.app/termos.html
Exclusão: https://meu-bichu-app-production.up.railway.app/excluir-conta.html
Atendimento: https://meu-bichu-app-production.up.railway.app/suporte.html

Sugestão de categoria: Estilo de vida. Público previsto nesta versão: maiores de 18 anos. O responsável deve confirmar a classificação final nas perguntas do Console. Não há anúncios, assinatura ou compras nesta versão. Não prometer diagnóstico, emagrecimento garantido, resultados clínicos ou disponibilidade de BCS.

## Segurança dos dados — mapa para preenchimento e conferência

O formulário deve refletir o build efetivamente enviado. Estas são orientações para preencher, não um formulário enviado ou aprovado.

| Categoria | Dados | Finalidade | Escolha |
|---|---|---|---|
| Informações pessoais | Nome escolhido, e-mail e identificador de conta | Conta, autenticação e suporte | Necessários à conta; nome escolhido na inscrição |
| Fotos | Fotos de pets/rações enviadas pelo usuário | Funções do app | Opcionais |
| Conteúdo do usuário | Cadastros dos pets, registros e mensagens de feedback | Organização e atendimento | Conforme funções usadas |
| Atividade no app | Navegação e tempo de uso | Análise de dificuldades e melhoria | Métricas opcionais, inicialmente desativadas nas contas públicas |
| Diagnóstico/desempenho | Falhas e duração de requisições | Confiabilidade e análise técnica | Telemetria opcional; hospedagem mantém registros operacionais próprios |
| Identificadores do dispositivo | Identificador gerado pelo aplicativo | Associar métricas ao aparelho | Junto à telemetria opcional |
| Localização | Android: permissão aproximada em primeiro plano | Contexto geográfico autorizado | Opcional e revogável; sem localização em segundo plano |

O site em navegador também pode receber coordenadas precisas se o navegador conceder. Confirme no formulário os tipos aplicáveis à versão Android final e ao conjunto de dados efetivamente coletado. Peso e saúde dos animais não são dados de saúde humana; campos livres podem receber informações pessoais que o usuário inserir. Não declarar que o app não coleta dados.

Há criptografia em trânsito por HTTPS; isso não é criptografia ponta a ponta. O proprietário e colaboradores autorizados conseguem ler informações necessárias às funções. Backups automáticos são criptografados. Railway e o provedor de e-mail processam dados para prestar o serviço; avalie as exceções de compartilhamento com prestadores descritas no formulário, sem confundir terceirização de processamento com venda de dados. Não foi feita certificação independente de segurança.

## Acesso para revisão

O aplicativo exige e-mail e senha. Criar uma conta pública confirmada exclusiva para a revisão após configurar SMTP; não usar uma conta piloto que vencerá em sete dias. Cadastrar dados fictícios e informar no Console as instruções de login. Não entregar à Google o link privado de proprietário, credenciais de funcionários ou dados reais de tutores.

## Android e assinatura

Projeto em /android. Pacote proposto: br.com.meubichu.app (confirmar antes da primeira publicação; o ID não representa registro de marca ou domínio). Target SDK 36, min SDK 26, versão 1.0.0/1. Java 17, Gradle 8.13, Android Gradle Plugin 8.13.2. Interface web própria com origem HTTPS fixa, seleção de fotos pelo seletor do sistema, localização aproximada opcional em primeiro plano, navegação externa no navegador e bloqueio de HTTP/conteúdo misto. Não inclui SDK de anúncio nem JavaScript bridge nativa.

Abrir /android no Android Studio, instalar SDK 36 e Gradle correspondente. Para teste: `gradle assembleDebug lint`. Para publicação, configurar as variáveis MB_UPLOAD_KEYSTORE, MB_UPLOAD_STORE_PASSWORD, MB_UPLOAD_KEY_ALIAS e MB_UPLOAD_KEY_PASSWORD e executar `gradle bundleRelease lint`. Sem essas variáveis, bundleRelease gera artefato sem assinatura de publicação. Guardar a chave privada de upload fora do repositório e ativar Play App Signing no Console. O workflow manual Android no GitHub também prepara APK de teste e AAB sem assinatura; ele não publica automaticamente.

O código Android está preparado, mas a compilação Android e a instalação em aparelho precisam de SDK Android e assinatura disponíveis. Build web aprovado não equivale a build Android aprovado. Validar upload de imagens, navegação Voltar, teclado, localização permitida/negada, sessão e recuperação de senha no APK antes de enviá-lo.

## Imagens

Arte vetorial de identidade e banner em docs/google-play/assets. Renderizar ícone em PNG 512×512 e banner em PNG/JPEG 1024×500. Conferir as regras visuais da loja antes de enviar. Capturas de tela devem mostrar o aplicativo real, com dados fictícios, sem credenciais e sem informações de participantes. Não usar mockups de funcionalidades ainda não disponíveis. São necessárias pelo menos duas capturas reais. O projeto inclui script de renderização das artes; as capturas reais do APK permanecem uma etapa de validação após compilação.

## Requisitos que dependem do titular

- Criar/verificar a conta Google Play Console no CPF; informar o nome legal completo e os dados de identidade exigidos pela Google. Confirmar o nome completo do responsável nos documentos públicos antes da liberação final.
- Aceitar os contratos da loja, pagar a taxa da conta e responder classificações e declarações.
- Guardar a chave de upload e escolher o identificador definitivo do app.
- Configurar e verificar o envio SMTP da conta suportemeubichu@gmail.com.
- Confirmar os formulários de anúncios, público-alvo, conteúdo, classificação etária, segurança dos dados, acesso de revisão e eventual declaração de recursos de saúde conforme o questionário efetivamente apresentado. O app é de cuidados animais, sem integração com Health Connect.
- Se a conta pessoal foi criada após 13/11/2023, cumprir o teste fechado com no mínimo 12 testadores inscritos durante 14 dias consecutivos e solicitar acesso à produção. A rodada interna dispensada não substitui essa exigência.

## Fontes oficiais consultadas

https://support.google.com/googleplay/android-developer/answer/14151465?hl=pt-BR
https://support.google.com/googleplay/android-developer/answer/11926878?hl=pt-BR
https://support.google.com/googleplay/android-developer/answer/13327111?hl=pt-BR
https://support.google.com/googleplay/android-developer/answer/10787469?hl=pt-BR
https://support.google.com/googleplay/android-developer/answer/9866151?hl=pt-BR
https://developer.android.com/develop/ui/views/layout/webapps/webview
https://developer.android.com/build/releases/agp-8-13-0-release-notes
