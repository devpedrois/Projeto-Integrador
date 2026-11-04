# Revisão equivalente de segurança

Responsável e revisor indicado: Pedro.
Revisão realizada nesta conversa, conforme escolha explícita do responsável.
O agente `security-auditor` não foi delegado.

## Escopo examinado

Entry point, validação de ambiente, pool de promises e PostgreSQL.
Também foram examinados snapshots, exportações e execução do Python.
A Strategy e o cliente Prisma produtivo permanecem inalterados.

## Achado corrigido

A primeira validação comparava hostname e caminho sem normalização completa.
Aliases por maiúsculas, ponto final e percent-encoding escapavam da comparação.
O driver `pg-connection-string` instalado permite `host` na query string.
Parâmetros de roteamento também poderiam invalidar a identidade verificada.

Foram criadas quatro contraprovas antes da correção.
As quatro falharam conforme registrado em `ambiente-red.log`.
A validação agora normaliza hostname, porta e caminho PostgreSQL.
Rejeita parâmetros de host, porta, banco, serviço e opções de roteamento.
Após a correção, dezessete testes unitários passaram em `ambiente-green.log`.

A execução real já utilizava URLs distintas e parâmetros TLS usuais.
O ajuste de validação não modifica consultas ou medições dessa execução.

## Controles conferidos

- Produção e bancos padrão/deploy são recusados antes de conectar.
- Nenhuma URL PostgreSQL aparece nos artefatos do benchmark.
- Contextos e recomendações exportam somente IDs sintéticos e métricas.
- Todas as sessões de consulta iniciam transações somente leitura.
- O estado de leitura é conferido antes de liberar as conexões.
- Valores da Strategy continuam parametrizados pelo repository existente.
- Identificadores de schema e snapshot possuem validação estrita.
- O pool não ultrapassa C+2 e não cria pools auxiliares.
- Falhas do pool próprio aguardam tarefas iniciadas antes da liberação.
- Encerrar as sessões desfaz as transações e libera snapshots.
- Erros externos são sanitizados na borda da CLI.
- Destinos existentes são recusados; arquivos novos usam criação exclusiva.
- Python recebe argumentos separados, sem shell e com janela oculta.
- Não há seed, migration, envio externo ou credenciais versionadas.

## Limitações preservadas

O pooler remoto pode introduzir espera invisível ao `waitingCount` local.
Snapshots são independentes entre C, com comparação contra a referência C=1.
A coleta exige branch dedicada para interpretar desempenho sem outras escritas.
Os candidatos refletem exatamente a Strategy atual, conforme escopo solicitado.
Nenhuma correção funcional da Strategy foi antecipada nesta subtarefa.

Não foram identificados bloqueadores remanescentes nesta revisão local.
