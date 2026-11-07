# Subtarefa 35.6

Branch de trabalho: `codex/35-6-lote-recomendacao`.
Nenhum commit ou push foi solicitado.

## Implementação

- Operação: `services/recomendacao/src/lote/index.ts`.
- Concorrência limitada: `services/recomendacao/src/lote/pool.ts`.
- Registro privado: `src/repositories/execucao-lote.repository.ts`.
- CLI: `npm run lote -- --concorrencia 4 --saida resultado-novo.json`.
- Reforço opcional: `--reforco-regional`.
- Benchmark: `npm run bench:lote`, dentro do microsserviço.
- Gráfico: `services/recomendacao/scripts/grafico-lote.py`.

A operação chama a Strategy de categoria existente.
O catálogo usa `listarElegiveis`, já presente no microsserviço.
Os resultados são ordenados por produtoId, independentemente das conclusões.
O hash corresponde a SHA-256 de JSON.stringify(resultados).
Cada execução insere e atualiza uma única linha privada.
Falhas mantêm a linha incompleta, sem conclusão ou hash.

## Metodologia

Cinco rodadas para cada C=1,4,8: quinze execuções.
O primeiro aquecimento fica fora de cada mediana.
Quatro medições permanecem integralmente na consolidação.
O pool C+2 inclui exportador, escritor e C leitores.
Leitores compartilham snapshot somente leitura por configuração.
Cada execução usa a operação real, sem duplicar processamento.
Preparação, catálogo, persistência e artefatos ficam fora do tempo.
Todas as respostas são comparadas ao primeiro aquecimento sequencial.
Throughput usa produtos por segundo; speedup compara medianas.
Eficiência divide speedup pela concorrência.
O PostgreSQL remoto e os caches permanecem aquecidos.

## Validação

O teste prévio falhou pela operação ausente, conforme `tdd.txt`.
A suíte completa do microsserviço passou em 97 testes.
As verificações finais de lote e CLI passaram: 24 testes.
A fixture adicional comprova o efeito regional na seleção.
A integração usa PostgreSQL real com papéis restritos temporários.
Inclui paridade C=1/C=4, validação, hash e quinze registros.
Também cobre snapshot, falha de leitura e sobreposição recusada.
Lint, typecheck, build e formatação do microsserviço passaram.
Lint e typecheck do backend também passaram.
A revisão equivalente está em `revisao-seguranca.md`.
Os scripts antigos do lote foram removidos do backend.

A suíte backend registrou 823 testes aprovados inicialmente.
O teste `32.2 oferece 35 avaliacoes idempotentes` excedeu cinco segundos.
O setup de `recomendacao.strategy.integration.test.ts` excedeu dez segundos.
Isso impediu cinco testes dessa integração na execução inicial.
O seed passou depois: cinco testes com `--testTimeout=15000`.
A Strategy passou depois: cinco testes com `--hookTimeout=120000`.
Esse comando também utilizou `--testTimeout=15000`.
Os testes preexistentes permaneceram inalterados nessas duas reexecuções.
Os logs iniciais e das reexecuções foram preservados.
Não se afirma execução padrão integralmente verde.
O conjunto de 829 casos ficou coberto pelas execuções combinadas.
A conexão administrativa foi restrita ao processo dos testes.
Nenhuma variável persistida de runtime foi alterada.

## Preparação da branch de volume

A consulta inicial encontrou exatamente 1.000 produtos.
Essa fixture ainda não possuía views nem schema privado.
As views utilizam o SQL contratual existente da API.
Essa preparação não registra migration no ledger Prisma.
Bootstrap e migration privada utilizam os runners existentes.
Somente `recomendacao_app` participa da operação e da coleta.
As credenciais são geradas na memória, sem persistir valores.
O catálogo não recebe seed, atualização ou exclusão.


## Coleta de 07/11/2026

Execução única: `execucao-2026-11-07T19-45-53-648Z`.
Todas as quinze rodadas terminaram, incluindo três aquecimentos.
Nenhuma medição foi excluída por desempenho.

| C | Pool | Mediana s | Produtos/s | Speedup | Eficiência % |
|---:|---:|---:|---:|---:|---:|
| 1 | 3 | 123.248 | 8.114 | 1.000 | 100.00 |
| 4 | 6 | 25.960 | 38.521 | 4.748 | 118.69 |
| 8 | 10 | 13.273 | 75.339 | 9.285 | 116.07 |

`diff.json` contém `[]`, com um único SHA-256.
O hash é `42d18493870a926bf81994842caaf559d35f775fc83863874da45b9863e4fa3e`.
`execucoes-lote.json` contém quinze registros de `recomendacao_app`.
A tabela privada passou de zero para quinze execuções concluídas.
A consulta reproduzível está em `consulta-execucoes.sql`.
O catálogo permaneceu com 1.000 produtos após a coleta.

O fechamento local foi concluído pelo pool pg.
O pooler remoto manteve uma sessão ociosa, sem transação.
Isso foi confirmado depois em `diagnostico-sql.json`.
Não há transação leitora aberta do lote nessa conferência.

- [Resultado e metodologia](execucao-2026-11-07T19-45-53-648Z/resultado.json).
- [CSV integral](execucao-2026-11-07T19-45-53-648Z/rodadas.csv).
- [Diff vazio](execucao-2026-11-07T19-45-53-648Z/diff.json).
- [Consulta salva](execucao-2026-11-07T19-45-53-648Z/consulta-execucoes.sql).
- [Registros efetivamente consultados](execucao-2026-11-07T19-45-53-648Z/execucoes-lote.json).
- [Conferência independente](execucao-2026-11-07T19-45-53-648Z/conferencia-independente.json).
- [Gráfico](execucao-2026-11-07T19-45-53-648Z/throughput.png).

O gráfico foi inspecionado visualmente: 1760 × 800 pixels.
A conferência independente recalculou mediana, throughput, speedup e eficiência.
Também comparou CSV, JSON, hash, IDs e registros persistidos.

## Diferença frente à referência de 25/10

A referência tinha speedups 3,957 e 7,946.
A coleta atual apresentou 4,748 e 9,285.
Os ganhos ficaram acima da referência, com eficiência acima de 100%.
Isso exige interpretar o custo da referência sequencial.

Cada contexto dessa massa executa duas consultas da Strategy.
Todas as seis categorias possuem pelo menos 32 produtos elegíveis.
O custo efetivo por consulta, ponderado por C, foi:

- C=1: 61,624 ms.
- C=4: 51,920 ms.
- C=8: 53,093 ms.

A baseline sequencial teve maior custo de I/O por consulta.
Essa diferença explica aritmeticamente o speedup acima de C.
O tempo também inclui driver e escalonamento das tarefas.
Não representa eficiência de CPU superior ao paralelismo ideal.

A sondagem posterior encontrou servidor entre 0,137 e 0,849 ms.
As mesmas consultas levaram aproximadamente 58 ms no cliente.
Isso sustenta uma carga dominada pelo caminho remoto de I/O.
Os planos e amostras estão em `diagnostico-sql.json`.

Outra sondagem preservou 240 amostras de `SELECT 1`.
Comparou um e dois leitores, sequencialmente, na ordem A/B/B/A.
As medianas variaram entre 50,428 e 55,315 ms.
Não apareceu vantagem sistemática por alternar dois leitores.
A sondagem está em `diagnostico-conexoes.json`.

O pool atual reserva uma conexão para o escritor privado.
O original disponibilizava C+1 leitores além do exportador.
Ambos respeitam C tarefas e C+2 conexões totais.
A sondagem não confirmou essa mudança como causa isolada.

As sondagens ocorreram após o benchmark, usando conexão administrativa.
Não repetiram o lote nem alteraram seus registros e medições.
Não isolam fisicamente rede, proxy, pooler ou escalonamento.
A causa física única da variação não foi determinada.
Não se atribui o excedente a CPU ou limites do Neon.
Os tempos originais permanecem preservados, sem normalização ou descarte.
