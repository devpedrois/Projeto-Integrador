# BD-04: resumo dos indices

Coleta real no Neon em 13/10/2026, horario de Sao Paulo.
Massa BD-05: 1.000 produtos, 50 artesaos e 300 compradores.
Tambem inclui 1.500 pedidos, intencoes e notificacoes.
Carrinhos possuem 300 itens sinteticos complementares.
A comparacao ocorreu em schema isolado, seguido de rollback.

| Consulta | Indice | Plano antes | Plano depois | Tempo antes ms | Tempo depois ms |
|---|---|---|---|---:|---:|
| 01-vitrine-publica | Produto_vitrine_criadoEm_idx | Limit → Sort → Seq Scan (Produto) | Limit → Index Scan (Produto_vitrine_criadoEm_idx) | 0.464 | 0.054 |
| 02-busca-termo | Produto_nome_trgm_idx, Produto_descricao_trgm_idx | Limit → Sort → Seq Scan (Produto) | Limit → Sort → Bitmap Heap Scan (Produto) → BitmapOr → Bitmap Index Scan (Produto_nome_trgm_idx) → Bitmap Index Scan (Produto_descricao_trgm_idx) | 0.603 | 0.101 |
| 03-filtro-categoria | Produto_categoriaId_idx | Limit → Sort → Bitmap Heap Scan (Produto) → Bitmap Index Scan (Produto_categoriaId_idx) | Limit → Index Scan (Produto_vitrine_criadoEm_idx) | 0.2 | 0.105 |
| 04-filtro-tecnica | Produto_tecnicaId_idx | Limit → Sort → Seq Scan (Produto) | Limit → Index Scan (Produto_vitrine_criadoEm_idx) | 0.205 | 0.212 |
| 05-filtro-regiao | PerfilArtesao_regiaoId_idx, Produto_artesaoId_idx | Limit → Sort → Hash Join → Seq Scan (Produto) → Hash → Seq Scan (PerfilArtesao) | Limit → Nested Loop → Index Scan (Produto_vitrine_criadoEm_idx) → Memoize → Index Scan (PerfilArtesao_pkey) | 0.484 | 0.162 |
| 06-meus-pedidos | Pedido_compradorId_criadoEm_idx | Sort → Bitmap Heap Scan (Pedido) → Bitmap Index Scan (Pedido_compradorId_idx) | Sort → Bitmap Heap Scan (Pedido) → Bitmap Index Scan (Pedido_compradorId_criadoEm_idx) | 0.092 | 0.095 |
| 07-poller-fila | IntencaoNotificacao_status_idx | Seq Scan (IntencaoNotificacao) | Index Scan (IntencaoNotificacao_status_idx) | 0.179 | 0.061 |
| 08-notificacoes-artesao | Notificacao_usuarioId_lida_criadoEm_idx | Limit → Sort → Bitmap Heap Scan (Notificacao) → Bitmap Index Scan (Notificacao_usuarioId_pedidoId_tipo_key) | Limit → Sort → Bitmap Heap Scan (Notificacao) → Bitmap Index Scan (Notificacao_usuarioId_lida_criadoEm_idx) | 0.119 | 0.135 |
| 09-itens-carrinho | ItemCarrinho_carrinhoId_produtoId_key | Seq Scan (ItemCarrinho) | Seq Scan (ItemCarrinho) | 0.063 | 0.072 |

Os pares ficam em explain-antes-depois/NN-<consulta>-antes.txt e -depois.txt.
Os TXT preservam a saida PostgreSQL em FORMAT JSON.
Incluem SQL, parametros, buffers e tempos originais.
A migration correspondente esta em 02-migration-indices.sql.

Uma execucao de aquecimento precedeu cada EXPLAIN.
Tempos sao do servidor, sem latencia de rede.
Uma medicao isolada nao representa p95 ou ganho garantido.
Nenhuma consulta forca enable_seqscan=off.

A busca usa %977%, presente num nome sintetico.
Seus tres caracteres permitem extrair um trigrama.
O planner escolheu BitmapOr com ambos os GIN.

Categoria tem 204 correspondencias, ou 20,4% da massa.
O parcial ordenado permite encerrar no LIMIT 24.
Seu indice simples ja existia; nao foi duplicado.

Tecnica tem 66 correspondencias, ou 6,6% da massa.
O planner prefere o parcial por ORDER BY/LIMIT.
Regiao corresponde a 316 produtos e apenas 16 perfis.
O Seq Scan inicial nos 50 perfis e barato.
Depois, o planner escolhe Nested Loop, PK e Memoize.
Os indices de tecnica e regiao permanecem disponiveis.

Pedidos e notificacoes utilizam os novos indices compostos.
O Bitmap Heap Scan ainda precisa ordenar os resultados.
O indice simples de compradorId foi substituido pelo composto.

ItemCarrinho(carrinhoId) ja usa o prefixo do unique composto.
O unique e ItemCarrinho(carrinhoId, produtoId).
Nao foi criado outro indice somente em carrinhoId.
O planner mantem Seq Scan em 300 linhas pequenas.
Sao apenas quatro paginas, com custo estimado 7,75.
