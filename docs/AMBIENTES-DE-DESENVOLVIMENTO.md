# Ambientes de desenvolvimento do Meu Bichu

## Acessos e separação

No proprietário: Configurações gerais → Ambientes de desenvolvimento. A autorização é a sessão privada já existente do proprietário; não se pede outro usuário ou senha. Não publicar esse acesso. Os links gerados para abrir uma conta são individuais, de uso único, válidos por dez minutos; a sessão resultante dura até 30 dias. Se o navegador bloquear a abertura automática, o painel mantém o link clicável.

- Matriz: servidor bichu-matriz, banco e arquivos no volume próprio. Uma conta interna para estabelecer referências e experimentar uma atualização antes da beta. Arquivos de versões são criptografados, mantidos sem expiração automática no volume e no bucket privado bichu-matriz-versoes. Guardar a chave LAB_CONTROL_KEY fora da hospedagem se for preciso recuperar esses arquivos em desastre.
- Testes sujos: servidor bichu-testes-sujos, com volume, banco, arquivos e chaves próprios. Não recebe credenciais, arquivos ou banco dos usuários reais, da matriz ou da beta. Testes de carga afetam seus recursos próprios; os ambientes ainda compartilham o provedor e a conta de faturamento Railway. Não representa independência de uma indisponibilidade global da hospedagem.
- Beta: servidor bichu-beta e volume próprios. beta-01 ativa; beta-02 a beta-21 reservadas, desativadas e sem registros de uso. Cada conta possui registros isolados pelo identificador de conta. Não contém cópia dos pets reais.

As contas internas usam identificadores em .invalid, não caixas de e-mail reais. Não há senha de usuário para compartilhar; o proprietário gera o acesso individual no painel. Não confundir essas reservas com contas públicas verificadas por e-mail. Cada conta beta ativada tem todas as funções atualmente disponíveis ao tutor; não recebe privilégios do proprietário ou do funcionário. O BCS continua inativo enquanto não for liberado como funcionalidade do produto.

Desativar uma beta revoga suas sessões e tickets. Reativar preserva seus dados anteriores; não limpa a conta automaticamente. As vinte contas adicionais desta entrega começam apenas com preferências mínimas de identificação, sem pets, saúde, peso ou feedback.

## Arquivo da matriz e comparação

Cada publicação da matriz registra automaticamente uma referência da identificação da versão, uma vez por release. O proprietário também pode clicar em Guardar referência desta atualização, nomear a versão e descrever o que mudou. Os dados são congelados no momento do registro, e novas alterações não substituem os registros anteriores.

Na pasta Histórico da matriz há consultas somente de leitura e comparação entre duas referências, indicando registros adicionados, removidos ou alterados, com antes e depois. A versão identifica o commit quando fornecido pela hospedagem, com link para o código correspondente no GitHub.

Uma referência de dados NÃO é uma instância executável do aplicativo antigo. Ela preserva os dados e identifica o código; para navegar na interface antiga é necessário publicar aquele commit em um ambiente de visualização separado. Não restaurar uma referência antiga sobre a matriz ativa para fazer uma simples consulta. Volumes/buckets exigem continuidade da conta de hospedagem e guarda das chaves; não há promessa de conservação eterna independente do provedor.

## Avaliações beta em cada tela

Todas as rotas do app autenticado que usam o layout do tutor mostram Avaliar esta tela na beta. O usuário escolhe notas de facilidade de uso, clareza visual e velocidade (1 a 5), informa se conseguiu concluir a ação e pode comentar. O servidor associa tela, conta beta, identificação da versão e data; o cliente não pode escolher outra conta para atribuir o feedback.

As avaliações ficam no banco beta como feedbacks e são consultadas no painel principal → Configurações gerais → Avaliações por tela. Não são adicionadas ao banco de participantes reais nem entram nas métricas de adoção deles. Telas públicas de autenticação e páginas estáticas de termos/suporte não estão sob o layout autenticado.

## Ordem das próximas atualizações

1. Implementar e publicar primeiro na branch matriz e no serviço bichu-matriz. Guardar uma referência nomeada, validar funcionalidade e conferir o histórico.
2. Promover o commit validado para beta e publicar no serviço bichu-beta. Ativar apenas as contas necessárias e reunir avaliações por tela.
3. Usar a branch testes-sujos e o laboratório para carga, dados inconsistentes e casos extremos, sempre com dados fictícios.
4. Depois da validação, promover o mesmo código para main e publicar para os usuários reais. Não copiar dados de testes para produção.

A separação de branches e serviços está configurada; as promoções são deliberadas. Não foi criada uma regra de proteção GitHub que impeça o titular de publicar diretamente na main. Atualizações no código não são feitas automaticamente a partir de sugestões de feedback.
