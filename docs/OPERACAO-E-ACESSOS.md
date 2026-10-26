# Operação e acessos públicos — Meu Bichu

## Backup automático

Banco SQLite completo e todos os objetos de fotos referenciados são copiados para um snapshot consistente, comprimidos e criptografados com AES-256-GCM. O envio é feito ao bucket privado bichu-backups, separado do volume /data. O objeto enviado é baixado e restaurado em pasta isolada: verificações incluem autenticação criptográfica, SHA-256 de banco e fotos, PRAGMA integrity_check, foreign_key_check e contagem de todas as tabelas, inclusive as da equipe.

Frequência: seis horas enquanto o serviço está rodando, com tentativa inicial na partida se não houver cópia recente. Retenção: sete dias, com limpeza após uma rodada bem-sucedida. Falhas são visíveis em /painel/seguranca e nos logs. Objetivo de perda máxima em condições normais: seis horas; indisponibilidade ou falhas podem ampliar essa janela. O sistema não garante recuperação se todas as cópias ou a chave forem perdidas.

A chave está na variável BACKUP_ENCRYPTION_KEY e pode ser baixada somente por sessão do proprietário em /painel/seguranca. Guardá-la em um cofre fora da hospedagem. Não colocar chave, senha SMTP ou arquivo de assinatura Android no GitHub. O bucket é externo ao volume, mas permanece no mesmo provedor e conta Railway; uma cópia em outro provedor/cofre ainda aumenta a independência operacional.

## Restauração de desastre

1. Parar as escritas e preservar o volume atual. Não rodar restauração sobre serviço ativo.
2. Baixar uma cópia .enc pelo painel do bucket na Railway e obter a chave guardada em local separado.
3. Usar uma pasta vazia: `BACKUP_ENCRYPTION_KEY` no ambiente e `node scripts/restore-encrypted.mjs arquivo.enc pasta-vazia`. O comando restaura e verifica o snapshot completo; não troca o volume automaticamente.
4. Conferir o relatório de todas as tabelas e fotos. Reaplicar exclusões de contas solicitadas após a data da cópia e revogar sessões/tokens anteriores antes de reabrir o serviço.
5. Com serviço parado e depois da conferência, substituir banco/objects pelo volume recuperado. Não restaurar WAL de outra cópia. Manter chaves/configurações da aplicação consistentes com o ambiente.
6. Reiniciar, testar os acessos e executar um novo backup. Um ensaio isolado não significa que o volume de produção foi sobrescrito.

Atenção: exclusão no banco ativo não altera snapshots históricos. A retenção de sete dias e a reaplicação de exclusões após restauração precisam fazer parte da operação. Exportações manuais antigas não são gerenciadas pela limpeza automática.

## Contas

Novas contas públicas: senha de 12 a 128 caracteres, e-mail confirmado, aceite de termos versionado e declaração de maioridade. Sem expiração de sete dias; sessões de até 30 dias. Pilotos antigos conservam sua expiração e seus dados. Cadastro usa /acesso.html?modo=cadastro. Tokens de confirmação expiram em 24 horas; recuperação de senha em 30 minutos. Tokens de uso único são armazenados por hash e a recuperação encerra sessões antigas. Limites por e-mail e globais reduzem abuso; respostas de recuperação não confirmam existência de conta.

Funcionários continuam criados individualmente pelo proprietário em /painel/equipe, com atribuições selecionáveis; não há cadastro público de colaborador. A recuperação de senha de funcionário fica em /acesso.html?modo=recuperar&tipo=funcionario e só atende contas ativas. O processo preserva permissões e encerra sessões anteriores.

## Ativar envio de e-mail

A conta informada pelo titular é suportemeubichu@gmail.com. SMTP_HOST=smtp.gmail.com, SMTP_PORT=465, SMTP_USER=suportemeubichu@gmail.com e SMTP_FROM já estão preparados. Falta SMTP_PASSWORD: usar senha de app do Google, quando disponível na conta com verificação em duas etapas. Inserir diretamente na Railway, variável do serviço meu-bichu-app; não enviar pelo chat. Não usar a senha normal da conta Google.

Depois de configurar, redeploy e confirmar a entrega real de e-mail para um endereço do titular. Sem credencial válida, o código informa indisponibilidade e não libera contas sem confirmação. Cadastro/recuperação estão implementados e testados com transporte controlado; esse teste não demonstra entrega real na caixa de entrada.

## Documentos

Páginas públicas: /termos.html, /privacidade.html, /suporte.html e /excluir-conta.html. Contato confirmado pelo titular: suportemeubichu@gmail.com. Completar/conferir nome legal do controlador antes de divulgação pública final; os textos não constituem certificação jurídica ou aprovação da loja. Não há coleta de CPF do tutor.

## Verificação em produção — 26/10/2026

Primeiro envio, download e restauração isolada aprovados às 16h24 (Brasília). Foram verificados 10 registros de contas, 56 registros do app e os 6 objetos de fotos, além das demais tabelas de métricas, autenticação, equipe e auditoria. O volume ativo não foi substituído pelo ensaio. O painel /painel/seguranca mostra o resultado atual de cada rodada; esta nota é uma evidência pontual, não substitui acompanhamento de falhas futuras.

Configuração consultada em produção: backup habilitado; cadastro público e recuperação de senha ainda indisponíveis porque SMTP_PASSWORD não foi fornecida. Não foram enviados e-mails reais de teste.
