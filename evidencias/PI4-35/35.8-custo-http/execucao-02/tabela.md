# 35.8: custo do salto HTTP

| Configuracao | p50 ms | p95 ms | Maximo ms |
| --- | ---: | ---: | ---: |
| A: in-process | 171.942 | 499.963 | 784.693 |
| B: API + microsservico | 223.078 | 787.686 | 1012.345 |
| Diferenca B - A | 51.136 | 287.723 | 227.652 |

A: `df92c704a3cd3bcb6800b103d4ddcafb596e2b09`. B: `1fd856b2acdef56598ca8eb31e54811d1a67a09d`.

Trinta medicoes validas por configuracao, apos cinco aquecimentos.
Dez produtos identicos, tres ciclos; percentis por nearest-rank.
O CSV preserva aquecimentos; nenhuma medicao foi descartada.

O salto HTTP adiciona latencia de rede e serializacao.
O ganho da separacao esta no isolamento de falha,
no deploy independente e na escala do lote.
A separacao nao tem como objetivo reduzir latencia individual.

A diferenca observada compara duas implementacoes historicas completas.
Ela inclui consultas Prisma versus views SQL e observabilidade.
Nao representa uma estimativa isolada do transporte HTTP.
Variabilidade do Neon e ordem A/B tambem influenciam resultados.
Caches do PostgreSQL e sistema operacional permanecem ativos.
As chamadas sao locais; o banco de volume e remoto.
Esta medicao nao comprova isolamento, deploy ou escalabilidade.

Metodologia, ambiente e hashes dos dados: resultado.json.
