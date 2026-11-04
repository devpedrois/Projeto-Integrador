# 30.6: recomendacoes em lote

| C | Pool | Medicoes | Mediana s | Produtos/s | Speedup | Eficiencia % |
|---:|---:|---:|---:|---:|---:|---:|
| 1 | 3 | 4 | 74.155 | 13.485 | 1.000 | 100.00 |
| 4 | 6 | 4 | 18.738 | 53.368 | 3.957 | 98.94 |
| 8 | 10 | 4 | 9.333 | 107.152 | 7.946 | 99.32 |

Paridade: aprovada; 15 rodadas; 0 divergencias.
Cinco rodadas por C incluem um aquecimento e quatro medicoes.
Medianas e throughput consolidado descartam os tres aquecimentos.
CSV inclui todos os tempos e identifica os aquecimentos.
Speedup por rodada usa a mediana sequencial como referencia.
Maior throughput medido: 107.152 produtos/s.
Pico de espera no pool local: 0.
A medicao nao isola CPU, rede ou espera no pooler Neon.
Ganho sublinear deve ser interpretado como limite observado do ambiente.
Nao se atribui esse limite ao Neon sem telemetria do provedor.
O exportador de snapshot usa uma das C+2 conexoes.
Cada C utiliza snapshot proprio. Diff inclui mudancas entre snapshots.
A Strategy permanece integralmente inalterada, inclusive sua elegibilidade interna.
Os contextos usam visibilidade publica completa do catalogo.
Sem HTTP, cache de aplicacao, seeds, migrations ou escrita na base.
Ambiente e metodologia completos estao em resultado.json.
