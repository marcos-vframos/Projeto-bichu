# Entrada temporária sem digitar login ou senha

Tutor e funcionário podem entrar por links individuais, emitidos em Painel do proprietário → Acessos sem senha (`/painel/acessos`). Validades disponíveis: 1, 7 (padrão) ou 30 dias. Cada abertura cria uma sessão HttpOnly da conta escolhida. Não existe lista pública de contas, acesso administrativo anônimo nem conta comunitária de funcionário.

O link completo aparece somente na emissão; no banco ficam SHA-256, papel, conta, validade, revogação e última entrada. O segredo usa fragmento `#entrada`, removido do endereço antes da chamada de entrada. Quem recebe o link pode entrar naquela conta até o vencimento ou revogação. O proprietário pode emitir outro link a qualquer momento.

O acesso temporário do tutor é uma autorização adicional, inclusive para consultar uma conta cujo convite expirou. Não altera senha, primeiro acesso, prazo original, identificação nem dados dos pets; a conta piloto 01 continua sendo a matriz original. Os dados não são apagados quando o link vence. As 20 contas beta reservadas e inativas não podem receber links nem ser ativadas por esse fluxo.

As permissões e atribuições do funcionário são consultadas a cada requisição. Ações continuam atribuídas a seu usuário. Revogar o link encerra as sessões emitidas por ele; revogar o funcionário bloqueia seus links. A recuperação de senha revoga também os links temporários da conta. Sessões normais de senha permanecem independentes da revogação de um link.

As URLs genéricas permanecem protegidas; não são uma entrada pública aos dados. O login por senha continua disponível como alternativa e para contas que não receberam link. O painel administrativo e suas chaves permanecem restritos. A Biblioteca, saúde, pesos e preferências permanecem nas mesmas contas.

A atualização adiciona as tabelas `temporary_access_links` e `temporary_access_sessions`. O backup normal preserva o banco; as referências históricas restritas ao piloto 01 continuam excluindo senhas, sessões e links. Nenhuma variável secreta é alterada ou compartilhada entre serviços.
