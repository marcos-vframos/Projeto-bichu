# Auditoria após correções — 13/10/2026

## Implementado

A galeria mantém os 18 IDs existentes e inclui 20 novos emblemas, em PNG individual com alpha real e margens transparentes. O clique abre o menu; pressionar três segundos abre a escolha. Pré-visualizações têm fundo transparente e carregamento sob demanda. Imagens grandes da interface foram otimizadas (aproximadamente 14 MB → 1,8 MB) e páginas usam carregamento separado.

Métricas de uso respeitam a desativação no cliente e no servidor. Exclusão confirmada remove a conta, pets, alimentação, saúde, fotos, personalizações, eventos, aparelhos, sessões e histórico de auditoria dessa conta. Existe exclusão com credenciais na entrada, inclusive após a expiração; outras contas permanecem intactas. Backups anteriores exportados exigem exclusão separada pelo responsável.

Consulta offline usa cache separado por conta, exibe a data da sincronização, respeita opt-out e mantém o prazo do piloto. Não existe fila de gravação offline: registros novos exigem conexão. API autenticada não é armazenada pelo service worker. Fotos não são disponibilizadas offline.

Coleções agora permitem paginação de 200 registros; o serviço de nutrição percorre as páginas sem o limite anterior de 1.000 registros. Verificação local usa mil contas e dez mil registros, além de paginação e tentativas de acesso cruzado. Isso não mede mil usuários simultâneos na hospedagem.

Exportação privada do banco e fotos: `MB_BACKUP_ORIGIN` e `MB_BACKUP_KEY` em variáveis de ambiente; executar `node scripts/backup-pilot.mjs /pasta/privada/backup`. Usar janela sem gravações para manter consistência entre páginas. Restaurar em pasta vazia com `node scripts/restore-backup-local.mjs /pasta/backup /pasta/recuperacao`. O banco é restaurado em transação. A restauração de registros, fotos e histórico foi testada em base isolada; não foi feita restauração da produção nem configurado agendamento automático de backups.

BCS interativo está inativo na interface e na gravação do servidor. Histórico anterior permanece. Os arquivos 3D são preservados para trabalho futuro, mas suas rotas públicas foram bloqueadas. O módulo não interpreta escores pela ferramenta MCP nesta versão.

## Pendências reais

Ainda é necessária avaliação veterinária dos cálculos e a validação do módulo BCS para cães e gatos. Qualidade visual de uma malha não comprova precisão clínica. É necessária validação em celulares reais: menu, personalizações após nova entrada, pesagem, resposta de feedback, conexão instável e painel.

A migração histórica do PocketBase depende do backup/exportação real do banco e arquivos, ausentes no código recuperado. Não afirmar que dados históricos foram migrados.

Ainda falta medir carga simultânea na hospedagem, organizar rotinas de backup com responsabilidade e retenção, e preparar/validar o pacote Android e requisitos da Google Play. Estes itens não se tornam concluídos por testes locais ou publicação web.

Próximo passo recomendado: verificar os fluxos essenciais nos aparelhos do piloto, avaliar retorno em vários dias e erros de sincronização antes de ampliar o público. BCS só deve ser reativado após revisão veterinária documentada e comparação com avaliações presenciais.
