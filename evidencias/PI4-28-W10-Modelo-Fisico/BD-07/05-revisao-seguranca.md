# BD-07: revisão de segurança equivalente

Pedro escolheu revisão nesta conversa, sem delegação.
A revisão cobriu somente os arquivos de BD-07.

- SQL utiliza parâmetros para todos os valores variáveis.
- As fixtures possuem UUIDs próprios e dados sintéticos.
- Nenhum teste seleciona ou altera registros de terceiros.
- Cada caso mantém uma única transação explícita.
- O teardown reverte também as tentativas bem-sucedidas indevidas.
- Após rollback, verifica todos os IDs nas tabelas utilizadas.
- Conexões são liberadas em `finally`.
- Falha no rollback provoca descarte da conexão.
- Pedidos informam números próprios, evitando consumo da sequence.
- A suíte exige código PostgreSQL e constraint específica.
- Os testes utilizam banco real, sem mocks.
- Nenhuma credencial ou conexão foi adicionada aos arquivos.
- As migrations e constraints existentes foram preservadas.

A contraprova criou DDL sem restrições em schemas transacionais.
Isso ocorreu exclusivamente na branch Neon de teste confirmada.
Cada transação recebeu rollback, inclusive após falhas esperadas.
O arquivo temporário da contraprova foi removido ao terminar.

Resultado: nenhum achado bloqueante no escopo de BD-07.
Alteração concorrente em `.gitignore` foi preservada.
Não houve commit nem push.
