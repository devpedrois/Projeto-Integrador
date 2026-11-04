# BD.2: benchmark HTTP da busca

Cinco aquecimentos descartados e trinta medicoes por cenario.
Todos os requests exigem HTTP 200, X-Cache MISS e resultados nao vazios.
CSV inclui aquecimentos identificados; percentis usam somente medicoes.
P50 e p95 usam nearest-rank; nenhum outlier de medicao e descartado.

| Cenario | Medicoes | p50 ms | p95 ms | Max ms | Aprovado |
| --- | ---: | ---: | ---: | ---: | --- |
| sem-filtro | 30 | 41.447 | 43.075 | 43.741 | Sim |
| termo | 30 | 42.359 | 44.673 | 46.248 | Sim |
| categoria | 30 | 41.486 | 45.850 | 46.572 | Sim |
| tecnica | 30 | 41.682 | 43.436 | 46.071 | Sim |
| regiao | 30 | 41.273 | 44.180 | 47.993 | Sim |
| combinado | 30 | 41.725 | 44.085 | 45.022 | Sim |

Os planos usam as consultas SQL efetivamente executadas pelo HTTP.
Nenhum seed, migration, ANALYZE ou indice e aplicado pelo benchmark.
