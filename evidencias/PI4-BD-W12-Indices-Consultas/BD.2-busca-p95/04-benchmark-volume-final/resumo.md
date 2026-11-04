# BD.2: benchmark HTTP da busca

Cinco aquecimentos descartados e trinta medicoes por cenario.
Todos os requests exigem HTTP 200, X-Cache MISS e resultados nao vazios.
CSV inclui aquecimentos identificados; percentis usam somente medicoes.
P50 e p95 usam nearest-rank; nenhum outlier de medicao e descartado.

| Cenario | Medicoes | p50 ms | p95 ms | Max ms | Aprovado |
| --- | ---: | ---: | ---: | ---: | --- |
| sem-filtro | 30 | 41.600 | 45.370 | 46.162 | Sim |
| termo | 30 | 41.384 | 44.601 | 44.951 | Sim |
| categoria | 30 | 40.731 | 49.102 | 49.894 | Sim |
| tecnica | 30 | 40.723 | 41.883 | 42.327 | Sim |
| regiao | 30 | 40.724 | 42.661 | 46.236 | Sim |
| combinado | 30 | 40.566 | 42.377 | 42.871 | Sim |

Os planos usam as consultas SQL efetivamente executadas pelo HTTP.
Nenhum seed, migration, ANALYZE ou indice e aplicado pelo benchmark.
