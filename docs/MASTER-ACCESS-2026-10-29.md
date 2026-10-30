# Acesso master de testes

A identidade do criador é configurada somente no servidor principal pelas variáveis MASTER_ACCESS_EMAIL, MASTER_ACCESS_SALT e MASTER_ACCESS_HASH. O hash usa scrypt, sal aleatório de 32 bytes e saída de 64 bytes. A senha e o hash não pertencem ao repositório. Os ambientes de laboratório rejeitam o acesso master, mesmo que sejam configurados por engano.

Entradas: `/acesso-master?area=proprietario`, `/acesso-master?area=matriz` e `/acesso-master?area=funcionario`. Os formulários normais de tutor e equipe também reconhecem a identidade configurada. Não há cadastro público capaz de conferir o papel master.

Proprietário usa a sessão administrativa já existente. Matriz seleciona exclusivamente o ID original de piloto01@meubichu.test; nenhuma conta, registro, personalização, senha ou prazo original do piloto é substituído. Ausência da matriz gera erro, sem criar uma matriz vazia. A identidade da equipe é criada na primeira entrada, com suas próprias sessões, permissões editáveis e identificação no histórico. Entrar na equipe não emite sessão administrativa. Revogação e redução de permissões permanecem efetivas.

Origem obrigatória para POST, comparação do hash em tempo constante, bloqueio de 15 minutos após cinco falhas e cookies HttpOnly/SameSite/ Secure em produção. O servidor HTTP transmite múltiplos Set-Cookie individualmente.

Cinco testes novos cobrem preservação da matriz, acesso por papel, revogação, falhas de credenciais, CSRF, limites de tentativas, isolamento de laboratórios e transporte real dos cookies por HTTP. A identidade master é para testes do criador; não substitui os funcionários existentes ou as contas beta reservadas.
