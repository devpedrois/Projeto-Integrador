# 35.6: recomendacoes em lote

| C | Pool | Medicoes | Mediana s | Produtos/s | Speedup | Eficiencia % |
|---:|---:|---:|---:|---:|---:|---:|
| 1 | 3 | 4 | 123.248 | 8.114 | 1.000 | 100.00 |
| 4 | 6 | 4 | 25.960 | 38.521 | 4.748 | 118.69 |
| 8 | 10 | 4 | 13.273 | 75.339 | 9.285 | 116.07 |

Paridade: aprovada; 15 rodadas; 0 divergencias.
Cinco rodadas por C incluem um aquecimento e quatro medicoes.
Medianas e throughput consolidado descartam os tres aquecimentos.
CSV inclui todos os tempos e identifica os aquecimentos.
Speedup por rodada usa a mediana sequencial como referencia.
Maior throughput medido: 75.339 produtos/s.
Pico de espera no pool local: 0.
A medicao nao isola CPU, rede ou espera no pooler Neon.
Ganho sublinear deve ser interpretado como limite observado do ambiente.
Nao se atribui esse limite ao Neon sem telemetria do provedor.
O exportador de snapshot usa uma das C+2 conexoes.
Cada C utiliza snapshot proprio. Diff inclui mudancas entre snapshots.
A Strategy permanece integralmente inalterada, inclusive sua elegibilidade interna.
Os contextos usam listarElegiveis: ativo e estoque positivo, conforme view contratual.
Sem HTTP, cache de aplicacao, seeds ou migrations durante a coleta. Escrita somente no schema privado.
Ambiente e metodologia completos estao em resultado.json.
