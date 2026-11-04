# BD-04: consultas e indices

Tempos de execucao do servidor, em milissegundos.
Uma execucao de aquecimento precede cada EXPLAIN.
Nao representa p95 nem latencia HTTP.

| Consulta | Indice justificado | Plano antes | Plano depois | Tempo antes ms | Tempo depois ms |
|---|---|---|---|---:|---:|
| vitrine-publica | Produto_vitrine_criadoEm_idx | Limit → Sort → Seq Scan (Produto) | Nao comparado | 0.042 | Nao comparado |
| busca-termo | Produto_nome_trgm_idx, Produto_descricao_trgm_idx | Limit → Sort → Seq Scan (Produto) | Nao comparado | 0.043 | Nao comparado |
| filtro-categoria | Produto_categoriaId_idx | Limit → Sort → Seq Scan (Produto) | Nao comparado | 0.051 | Nao comparado |
| filtro-tecnica | Produto_tecnicaId_idx | Limit → Sort → Seq Scan (Produto) | Nao comparado | 0.063 | Nao comparado |
| filtro-regiao | PerfilArtesao_regiaoId_idx, Produto_artesaoId_idx | Limit → Sort → Nested Loop → Seq Scan (PerfilArtesao) → Seq Scan (Produto) | Nao comparado | 0.059 | Nao comparado |
| meus-pedidos | Pedido_compradorId_criadoEm_idx | Sort → Seq Scan (Pedido) | Nao comparado | 0.055 | Nao comparado |
| poller-fila | IntencaoNotificacao_status_idx | Seq Scan (IntencaoNotificacao) | Nao comparado | 0.055 | Nao comparado |
| notificacoes-artesao | Notificacao_usuarioId_lida_criadoEm_idx | Limit → Sort → Seq Scan (Notificacao) | Nao comparado | 0.062 | Nao comparado |
| itens-carrinho | ItemCarrinho_carrinhoId_produtoId_key | Bitmap Heap Scan (ItemCarrinho) → Bitmap Index Scan (ItemCarrinho_carrinhoId_produtoId_key) | Nao comparado | 0.086 | Nao comparado |

O planner permanece livre: enable_seqscan nunca e desativado.
Seq Scan pode custar menos em tabelas pequenas e filtros amplos.
O LIMIT pode favorecer o indice parcial ordenado, mesmo com outros indices.
Categoria e carrinho ja possuem indices anteriores a BD-04.

ItemCarrinho(carrinhoId) usa o prefixo esquerdo do unique composto
ItemCarrinho(carrinhoId, produtoId). Nenhum indice redundante foi criado.
