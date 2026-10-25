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

## BD.4: pedidos, indicadores, avaliacoes e recomendacao

O runner passa a executar dezenove consultas parametrizadas.
As nove consultas historicas permanecem no catalogo.
As dez consultas adicionais reproduzem os acessos inspecionados.

| Consulta                          | Parametros                                                         |
| --------------------------------- | ------------------------------------------------------------------ |
| `indicadores-artesao.sql`         | `$1`: artesao autenticado                                          |
| `pedidos-artesao.sql`             | `$1`: status confirmado; `$2`: artesao; `$3`: limite; `$4`: offset |
| `pedidos-artesao-total.sql`       | `$1`: status confirmado; `$2`: artesao                             |
| `pedidos-artesao-itens.sql`       | `$1`: artesao; `$2`: UUIDs dos pedidos paginados                   |
| `avaliacao-compra-verificada.sql` | `$1`: comprador; `$2`: produto                                     |
| `avaliacao-elegibilidade.sql`     | `$1`: comprador; `$2`: produto                                     |
| `recomendacao-categoria.sql`      | `$1`: categoria; `$2`: produto excluido; `$3`: limite              |
| `recomendacao-regional.sql`       | mesmos parametros; `$4`: regiao contextual, podendo ser nula       |
| `recomendacao-historico.sql`      | `$1`: comprador; `$2`: limite                                      |
| `recomendacao-fallback.sql`       | `$1`: produto excluido; `$2`: comprador; `$3`: limite              |

Os parametros operacionais sao selecionados deterministicamente da massa.
No endpoint, as identidades continuam vindo da sessao.
A consulta de compra preserva `FOR SHARE OF pedido, item`.
Ela mede a verificacao transacional anterior ao INSERT.
O INSERT de avaliacao continua protegido pelo UNIQUE existente.
Nenhuma avaliacao e criada pelo runner.

Pedidos recebidos usa pagina, contagem e leitura dos itens.
O filtro de propriedade aparece na pagina e nos itens.
O status parametrizado e seu cast reproduzem o Prisma.
A projecao de itens inclui somente as colunas preexistentes.
`status` e `enviadoEm` nao existem nesta branch de volume.
Essas colunas projetadas nao alteram os predicados medidos.
A busca do nome do comprador por PK nao foi duplicada.
O lote de pedidos usa `ANY(uuid[])`, equivalente ao `IN` parametrizado.
Esses planos nao comprovam uma execucao HTTP completa.

`npm run db:explain -- --volume` usa `DATABASE_URL_VOLUME`.
O runner recusa producao e branches padrao ou deploy coincidentes.
Os candidatos aceitos sao uma allowlist interna de DDL:
`confirmado-id`, `confirmado-comprador` e `confirmado-ordenacao`.

```sh
npm run db:explain -- --volume --candidate confirmado-comprador --output ../evidencias/PI4-BD-W12-Indices-Consultas/BD.4-indices-suporte/nova-coleta
```

No PowerShell, use `npm.cmd` para preservar os argumentos.
O diretorio de saida precisa ser novo ou vazio.
O modo candidato coleta `antes/` e `depois/` na mesma transacao.
Executa ANALYZE antes das duas fases, sem forcar scans.
As consultas recebem aquecimento antes do EXPLAIN ANALYZE BUFFERS.
O hash SHA-256 confere resultados iguais entre as fases.
Somente `atualizadoEm`, calculado pelo relogio, e excluido do hash.
O hash preserva a ordem das linhas retornadas.

Todas as transacoes terminam com ROLLBACK, inclusive em falhas.
Usam BEGIN normal para permitir os locks de leitura.
O modo candidato verifica sua ausencia depois do ROLLBACK.
Essa verificacao fica registrada em `rollback.json`.
`--compare` preserva a comparacao historica em schema isolado.
Esse modo nao pode ser combinado com `--volume`.

Decisoes e limites: [indices-u2.md](../../../docs/indices-u2.md).
