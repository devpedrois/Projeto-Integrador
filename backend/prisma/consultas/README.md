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

## BD.2: medicao HTTP com a massa de volume

`npm run bench:busca` mede os seis cenarios solicitados.
Utiliza o endpoint real, com cinco aquecimentos descartados.
Depois mede trinta requisicoes por cenario, sempre com MISS.
Os EXPLAINs adicionais usam o SQL capturado dessas requisicoes.
Nao substituem os nove SELECTs historicos deste diretorio.

Na coleta de 22/10/2026, existiam 1.000 produtos sinteticos.
Os seis p95 ficaram abaixo de 500 ms.
Todos os indices da Sprint 4 foram preservados.
Nenhuma migration `indices_busca_u2` foi criada.

O termo seletivo `977` usou ambos os GIN existentes.
Categoria utilizou `Produto_categoriaId_idx` no SQL HTTP.
Tecnica utilizou `Produto_tecnicaId_idx`.
Regiao utilizou `PerfilArtesao_regiaoId_idx` e `Produto_artesaoId_idx`.
As agregacoes posteriores aproveitaram indices de fotos, avaliacoes e itens.

Os Seq Scans restantes nao justificaram indices adicionais.
Sem filtro, o banco examinou apenas 1.000 produtos visiveis.
O termo `vaso` foi resolvido com scan inferior a 1 ms.
O join de usuarios examinou uma tabela de 350 registros.
O custo desses scans foi baixo na massa medida.
GIN e indices simples ja cobrem os predicados seletivos.
Nenhum plano foi forcado com `enable_seqscan=off`.
Criar outro indice equivalente duplicaria estruturas existentes.

O p95 HTTP inclui rede, serializacao e leitura do JSON.
Os tempos EXPLAIN medem execucao dentro do PostgreSQL.
Esses valores nao sao apresentados como a mesma metrica.
Massas maiores ou outra distribuicao exigem nova avaliacao.

Evidencias: `evidencias/PI4-BD-W12-Indices-Consultas/BD.2-busca-p95/`.
