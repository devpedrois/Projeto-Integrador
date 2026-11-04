# BD-04: consultas e indices

Tempos de execucao do servidor, em milissegundos.
Uma execucao de aquecimento precede cada EXPLAIN.
Nao representa p95 nem latencia HTTP.

| Consulta | Indice justificado | Plano antes | Plano depois | Tempo antes ms | Tempo depois ms |
|---|---|---|---|---:|---:|
| vitrine-publica | Produto_vitrine_criadoEm_idx | Limit → Sort → Seq Scan (Produto) | Limit → Index Scan (Produto_vitrine_criadoEm_idx) | 0.537 | 0.066 |
| busca-termo | Produto_nome_trgm_idx, Produto_descricao_trgm_idx | Limit → Sort → Seq Scan (Produto) | Limit → Index Scan (Produto_vitrine_criadoEm_idx) | 0.641 | 0.879 |
| filtro-categoria | Produto_categoriaId_idx | Limit → Sort → Bitmap Heap Scan (Produto) → Bitmap Index Scan (Produto_categoriaId_idx) | Limit → Index Scan (Produto_vitrine_criadoEm_idx) | 0.231 | 0.087 |
| filtro-tecnica | Produto_tecnicaId_idx | Limit → Sort → Seq Scan (Produto) | Limit → Index Scan (Produto_vitrine_criadoEm_idx) | 0.208 | 0.137 |
| filtro-regiao | PerfilArtesao_regiaoId_idx, Produto_artesaoId_idx | Limit → Sort → Hash Join → Seq Scan (Produto) → Hash → Seq Scan (PerfilArtesao) | Limit → Nested Loop → Index Scan (Produto_vitrine_criadoEm_idx) → Memoize → Index Scan (PerfilArtesao_pkey) | 0.46 | 0.155 |
| meus-pedidos | Pedido_compradorId_criadoEm_idx | Sort → Bitmap Heap Scan (Pedido) → Bitmap Index Scan (Pedido_compradorId_idx) | Sort → Bitmap Heap Scan (Pedido) → Bitmap Index Scan (Pedido_compradorId_criadoEm_idx) | 0.095 | 0.096 |
| poller-fila | IntencaoNotificacao_status_idx | Seq Scan (IntencaoNotificacao) | Index Scan (IntencaoNotificacao_status_idx) | 0.199 | 0.065 |
| notificacoes-artesao | Notificacao_usuarioId_lida_criadoEm_idx | Limit → Sort → Bitmap Heap Scan (Notificacao) → Bitmap Index Scan (Notificacao_usuarioId_pedidoId_tipo_key) | Limit → Sort → Bitmap Heap Scan (Notificacao) → Bitmap Index Scan (Notificacao_usuarioId_lida_criadoEm_idx) | 0.141 | 0.129 |
| itens-carrinho | ItemCarrinho_carrinhoId_produtoId_key | Seq Scan (ItemCarrinho) | Seq Scan (ItemCarrinho) | 0.064 | 0.063 |

O planner permanece livre: enable_seqscan nunca e desativado.
Seq Scan pode custar menos em tabelas pequenas e filtros amplos.
O LIMIT pode favorecer o indice parcial ordenado, mesmo com outros indices.
Categoria e carrinho ja possuem indices anteriores a BD-04.

ItemCarrinho(carrinhoId) usa o prefixo esquerdo do unique composto
ItemCarrinho(carrinhoId, produtoId). Nenhum indice redundante foi criado.
