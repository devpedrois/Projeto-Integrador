# BD-04: consultas do catalogo e operacionais

Cada arquivo contem um SELECT parametrizado.
Execute com os parametros indicados, sem interpolar valores.

| Consulta                   | Parametros                                            | Indice justificado                                                  |
| -------------------------- | ----------------------------------------------------- | ------------------------------------------------------------------- |
| `vitrine-publica.sql`      | nenhum                                                | `Produto_vitrine_criadoEm_idx`, parcial e ordenado                  |
| `busca-termo.sql`          | `$1`: padrao ILIKE, exemplo `%vaso%`                  | GIN `Produto_nome_trgm_idx` e `Produto_descricao_trgm_idx`          |
| `filtro-categoria.sql`     | `$1`: UUID da categoria                               | `Produto_categoriaId_idx`, preexistente                             |
| `filtro-tecnica.sql`       | `$1`: ID textual da tecnica                           | `Produto_tecnicaId_idx`                                             |
| `filtro-regiao.sql`        | `$1`: ID textual da regiao                            | `PerfilArtesao_regiaoId_idx` e `Produto_artesaoId_idx` preexistente |
| `meus-pedidos.sql`         | `$1`: UUID do comprador autenticado                   | `Pedido_compradorId_criadoEm_idx`                                   |
| `poller-fila.sql`          | nenhum                                                | `IntencaoNotificacao_status_idx`                                    |
| `notificacoes-artesao.sql` | `$1`: UUID do usuario autenticado; `$2`: boolean lida | `Notificacao_usuarioId_lida_criadoEm_idx`                           |
| `itens-carrinho.sql`       | `$1`: UUID do comprador autenticado                   | unique `ItemCarrinho_carrinhoId_produtoId_key`, preexistente        |

O unique do carrinho ja atende seu prefixo esquerdo.
Nao existe necessidade de outro indice somente em carrinhoId.
O indice simples de compradorId foi substituido pelo composto.
O indice parcial vive na migration SQL `indices_consultas`.
Os demais novos indices tambem constam no schema Prisma.
`pg_trgm` e instalado no schema public da base.
As operator classes GIN usam esse namespace explicitamente.

Os SELECTs publicos mantem ativo, moderacao e estoque disponivel.
Todos ordenam por criadoEm descendente e limitam 24 produtos.
Regiao pertence ao perfil e chega pelo join do artesao.
Estas consultas preparam WEB-06, sem implementar seus endpoints.
O mapper futuro adicionara fotos e agregacoes ao DTO.
Meus pedidos representa exclusivamente o escopo comprador.
O poller reproduz `listarPendentesOuFalha()` do repository atual.
Notificacoes preparam a listagem filtrada por estado de leitura.

Use termos com pelo menos tres caracteres nas medicoes.
O script escapa percentuais, underscores e barras invertidas.
Termos e IDs seguem como parametros do driver PostgreSQL.
IDs de usuario dos endpoints futuros devem vir da sessao.

Planos e tempos estao em [evidencias BD-04](../../../evidencias/PI4-28-W10-Modelo-Fisico/BD-04-indices/01-resumo-indices.md).

## Consumo na WEB-06

`src/repositories/catalogo.repository.ts` consolida os cinco SELECTs publicos
acima numa consulta estatica. Preserva ILIKE, filtros por FK, join regional
e predicados do indice parcial. Acrescenta artesao ativo, filtro por artesao,
detalhe por ID, pagina limitada e desempate por ID.
O SQL permanece fixo, sem interpolacao. Oito valores seguem separados
por parametros `$1` a `$8`, inclusive limit e offset.
`$queryRawUnsafe` recebe exclusivamente essa constante e valores vinculados.
Nenhum valor controlado pelo usuario forma texto SQL.
Fotos, notas e vendas confirmadas usam agregacoes laterais apos paginacao.
As consultas historicas de BD-04 permanecem reproduziveis.
