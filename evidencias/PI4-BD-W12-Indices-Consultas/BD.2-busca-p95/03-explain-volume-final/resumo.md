# BD-04: consultas e indices

Tempos de execucao do servidor, em milissegundos.
Uma execucao de aquecimento precede cada EXPLAIN.
Nao representa p95 nem latencia HTTP.

| Consulta | Indice justificado | Plano antes | Plano depois | Tempo antes ms | Tempo depois ms |
|---|---|---|---|---:|---:|
| vitrine-publica | Produto_vitrine_criadoEm_idx | Limit → Index Scan (Produto_vitrine_criadoEm_idx) | Nao comparado | 0.056 | Nao comparado |
| busca-termo | Produto_nome_trgm_idx, Produto_descricao_trgm_idx | Limit → Sort → Bitmap Heap Scan (Produto) → BitmapOr → Bitmap Index Scan (Produto_nome_trgm_idx) → Bitmap Index Scan (Produto_descricao_trgm_idx) | Nao comparado | 0.058 | Nao comparado |
| filtro-categoria | Produto_categoriaId_idx | Limit → Index Scan (Produto_vitrine_criadoEm_idx) | Nao comparado | 0.072 | Nao comparado |
| filtro-tecnica | Produto_tecnicaId_idx | Limit → Index Scan (Produto_vitrine_criadoEm_idx) | Nao comparado | 0.142 | Nao comparado |
| filtro-regiao | PerfilArtesao_regiaoId_idx, Produto_artesaoId_idx | Limit → Sort → Hash Join → Seq Scan (Produto) → Hash → Bitmap Heap Scan (PerfilArtesao) → Bitmap Index Scan (PerfilArtesao_regiaoId_idx) | Nao comparado | 0.437 | Nao comparado |
| meus-pedidos | Pedido_compradorId_criadoEm_idx | Sort → Bitmap Heap Scan (Pedido) → Bitmap Index Scan (Pedido_compradorId_criadoEm_idx) | Nao comparado | 0.078 | Nao comparado |
| poller-fila | IntencaoNotificacao_status_idx | Bitmap Heap Scan (IntencaoNotificacao) → Bitmap Index Scan (IntencaoNotificacao_status_idx) | Nao comparado | 0.036 | Nao comparado |
| notificacoes-artesao | Notificacao_usuarioId_lida_criadoEm_idx | Limit → Sort → Bitmap Heap Scan (Notificacao) → Bitmap Index Scan (Notificacao_usuarioId_lida_criadoEm_idx) | Nao comparado | 0.048 | Nao comparado |
| itens-carrinho | ItemCarrinho_carrinhoId_produtoId_key | Bitmap Heap Scan (ItemCarrinho) → Bitmap Index Scan (ItemCarrinho_carrinhoId_produtoId_key) | Nao comparado | 0.039 | Nao comparado |

O planner permanece livre: enable_seqscan nunca e desativado.
Seq Scan pode custar menos em tabelas pequenas e filtros amplos.
O LIMIT pode favorecer o indice parcial ordenado, mesmo com outros indices.
Categoria e carrinho ja possuem indices anteriores a BD-04.

ItemCarrinho(carrinhoId) usa o prefixo esquerdo do unique composto
ItemCarrinho(carrinhoId, produtoId). Nenhum indice redundante foi criado.
