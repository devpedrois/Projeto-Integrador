# 33.3: repository × SQL independente

Snapshot REPEATABLE READ, somente leitura.

| Indicador | Repository | SQL independente | Divergencia |
|---|---:|---:|---:|
| artesaosAtivos | 50 | 50 | 0 |
| produtosAtivos | 1000 | 1000 | 0 |
| pedidosConfirmados | 1500 | 1500 | 0 |
| receitaTotal | 807365.08 | 807365.08 | 0 |

Massa: 1000 produtos, 350 usuarios, 1500 pedidos.
A receita foi comparada como Decimal, sem conversao para float.
