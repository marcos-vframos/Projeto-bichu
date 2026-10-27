# Integrações e API atual

Esta versão não publica um servidor MCP. As instruções antigas de autenticação e ferramentas remotas não descreviam o servidor atual e foram substituídas.

A aplicação utiliza API HTTP própria na mesma origem: `/api/pilot` para conta e registros do tutor, `/api/team` para atividades autorizadas dos colaboradores, `/api/pilot/owner` para consultas e controles do proprietário e `/api/access` para os fluxos definitivos de cadastro e recuperação.

Cookies HttpOnly, validação de origem e permissões por sessão protegem os acessos. Não enviar a chave do proprietário a colaboradores ou integrações externas. A existência de uma rota não dá autorização para consultá-la; o servidor verifica o perfil e o registro permitido.

Uma futura integração MCP exige projeto e revisão de segurança próprios. Não usar endpoints históricos nem presumir ferramentas que não foram implementadas.
