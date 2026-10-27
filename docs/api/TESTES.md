# Verificação do Meu Bichu

Execute `npm run build`, `npm test`, `pnpm exec tsc --noEmit -p tsconfig.app.json` e `pnpm exec tsc --noEmit -p owner-app/tsconfig.app.json`.

`npm run audit:independence` verifica o código atual; a construção também verifica os arquivos publicados. O controle rejeita endpoints do gerador anterior, credenciais demonstrativas e instrumentação do editor.

Os testes em tests/ cobrem isolamento por conta, autenticação, personalizações, nutrição, tarefas e permissões dos colaboradores, registros do proprietário, exclusão, backups criptografados, matriz original e ambientes beta/sujo. Os testes usam bases temporárias e dados fictícios.

Na publicação, confira as páginas tutor, funcionário e proprietário, o favicon próprio, o cabeçalho Content-Security-Policy e a abertura da matriz com o identificador original do piloto 01. Compare os registros reais antes e depois, sem criar registros fictícios em produção. Inspecione tráfego no navegador quando a ferramenta disponibilizar essa observação; ausência de referências no código não prova ausência de todas as possíveis requisições de uma sessão.

O BCS continua inativo. Não validar nem anunciar essa função como lançada.
