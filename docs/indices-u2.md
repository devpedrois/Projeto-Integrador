# BD.4: índices de suporte às consultas novas

Responsável: Eliziane. Revisor indicado: Pedro.
Data: 25/10/2026.

Nenhum índice permanente adicional foi justificado nesta massa.
Foram medidos três candidatos parciais em Pedido.
Todos foram criados em transações terminadas com ROLLBACK.
As migrations e o schema Prisma permanecem sem alterações.

## Ambiente e metodologia

`DATABASE_URL_VOLUME` apontou para uma branch Neon separada.
A identidade foi comparada às conexões padrão antes da execução.
Nenhuma credencial foi incluída nos arquivos de evidência.
O schema medido foi `public`, com PostgreSQL real.
A massa continha 1.000 produtos e 1.550 itens.
Existiam 1.500 pedidos, todos com status `confirmado`.
A tabela Avaliacao estava vazia nesta coleta.

Cada fase executou ANALYZE sobre as tabelas envolvidas.
Cada consulta recebeu uma execução prévia de aquecimento.
Depois executou `EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)`.
`enable_seqscan` permaneceu `on`; nenhum plano foi forçado.
As fases utilizaram os mesmos parâmetros e dados.
Os tempos abaixo são milissegundos de execução no servidor.
São amostras individuais, sem significância estatística demonstrada.
Não representam p95, latência HTTP ou execução em produção.

## Consultas, índices efetivos e planos

A tabela compara o candidato `confirmado-comprador` com a base.
O índice parcial citado existiu somente na fase experimental.
A estrutura do plano é resumida em ordem de travessia.
Os JSONs preservam todos os nós, custos e buffers.

| Consulta                                                                                         | Índices efetivos antes / depois                                                                                                                                  | Plano antes                                                                                                                                                                                                                                                                                                                                                                                                                                                               | Plano depois                                                                                                                                                                                                                                                                                                                                                                                                                                       | Antes ms | Depois ms |
| ------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------: | --------: |
| [`indicadores-artesao.sql`](../backend/prisma/consultas/indicadores-artesao.sql)                 | `Produto_artesaoId_idx`                                                                                                                                          | Aggregate > Sort > Hash Join > Aggregate > Hash Join > Seq Scan ItemPedido > Hash > Seq Scan Pedido > Hash > Bitmap Heap Scan Produto > Bitmap Index Scan `Produto_artesaoId_idx`                                                                                                                                                                                                                                                                                         | Mesmo plano                                                                                                                                                                                                                                                                                                                                                                                                                                        |    1.547 |     1.614 |
| [`pedidos-artesao.sql`](../backend/prisma/consultas/pedidos-artesao.sql)                         | `Pedido_pkey`, `Produto_artesaoId_idx`                                                                                                                           | Limit > Sort > Nested Loop > Aggregate > Hash Join > Seq Scan ItemPedido > Hash > Bitmap Heap Scan Produto > Bitmap Index Scan `Produto_artesaoId_idx` > Index Scan `Pedido_pkey`                                                                                                                                                                                                                                                                                         | Mesmo plano                                                                                                                                                                                                                                                                                                                                                                                                                                        |    0.404 |     0.408 |
| [`pedidos-artesao-total.sql`](../backend/prisma/consultas/pedidos-artesao-total.sql)             | `Pedido_pkey`, `Produto_artesaoId_idx`                                                                                                                           | Aggregate > Nested Loop > Aggregate > Hash Join > Seq Scan ItemPedido > Hash > Bitmap Heap Scan Produto > Bitmap Index Scan `Produto_artesaoId_idx` > Index Scan `Pedido_pkey`                                                                                                                                                                                                                                                                                            | Mesmo plano                                                                                                                                                                                                                                                                                                                                                                                                                                        |    0.399 |     0.400 |
| [`pedidos-artesao-itens.sql`](../backend/prisma/consultas/pedidos-artesao-itens.sql)             | `ItemPedido_pedidoId_idx`, `Produto_artesaoId_idx`                                                                                                               | Sort > Hash Join > Bitmap Heap Scan Produto > Bitmap Index Scan `Produto_artesaoId_idx` > Hash > Bitmap Heap Scan ItemPedido > Bitmap Index Scan `ItemPedido_pedidoId_idx`                                                                                                                                                                                                                                                                                                | Mesmo plano                                                                                                                                                                                                                                                                                                                                                                                                                                        |    0.125 |     0.132 |
| [`avaliacao-compra-verificada.sql`](../backend/prisma/consultas/avaliacao-compra-verificada.sql) | `ItemPedido_produtoId_idx`, `Pedido_compradorId_criadoEm_idx` / `ItemPedido_produtoId_idx`, `Pedido_confirmado_compradorId_id_idx`                               | Limit > LockRows > Nested Loop > Bitmap Heap Scan Pedido > Bitmap Index Scan `Pedido_compradorId_criadoEm_idx` > Materialize > Bitmap Heap Scan ItemPedido > Bitmap Index Scan `ItemPedido_produtoId_idx`                                                                                                                                                                                                                                                                 | Limit > LockRows > Nested Loop > Bitmap Heap Scan Pedido > Bitmap Index Scan `Pedido_confirmado_compradorId_id_idx` > Materialize > Bitmap Heap Scan ItemPedido > Bitmap Index Scan `ItemPedido_produtoId_idx`                                                                                                                                                                                                                                     |    0.057 |     0.060 |
| [`avaliacao-elegibilidade.sql`](../backend/prisma/consultas/avaliacao-elegibilidade.sql)         | `ItemPedido_produtoId_idx`, `Pedido_compradorId_criadoEm_idx` / `ItemPedido_produtoId_idx`, `Pedido_confirmado_compradorId_id_idx`                               | Result > Nested Loop > Bitmap Heap Scan Pedido > Bitmap Index Scan `Pedido_compradorId_criadoEm_idx` > Materialize > Bitmap Heap Scan ItemPedido > Bitmap Index Scan `ItemPedido_produtoId_idx` > Seq Scan Avaliacao                                                                                                                                                                                                                                                      | Result > Nested Loop > Index Only Scan `Pedido_confirmado_compradorId_id_idx` > Materialize > Bitmap Heap Scan ItemPedido > Bitmap Index Scan `ItemPedido_produtoId_idx` > Seq Scan Avaliacao                                                                                                                                                                                                                                                      |    0.064 |     0.058 |
| [`recomendacao-categoria.sql`](../backend/prisma/consultas/recomendacao-categoria.sql)           | `Produto_categoriaId_idx`                                                                                                                                        | Limit > Sort > Hash Join > Hash Join > Aggregate > Seq Scan ItemPedido > Hash > Bitmap Heap Scan Produto > Bitmap Index Scan `Produto_categoriaId_idx` > Hash > Subquery Scan > Aggregate > Seq Scan Avaliacao                                                                                                                                                                                                                                                            | Mesmo plano                                                                                                                                                                                                                                                                                                                                                                                                                                        |    0.717 |     0.679 |
| [`recomendacao-regional.sql`](../backend/prisma/consultas/recomendacao-regional.sql)             | `Produto_categoriaId_idx`                                                                                                                                        | Limit > Sort > Hash Join > Hash Join > Hash Join > Aggregate > Seq Scan ItemPedido > Hash > Bitmap Heap Scan Produto > Bitmap Index Scan `Produto_categoriaId_idx` > Hash > Seq Scan PerfilArtesao > Hash > Subquery Scan > Aggregate > Seq Scan Avaliacao                                                                                                                                                                                                                | Mesmo plano                                                                                                                                                                                                                                                                                                                                                                                                                                        |    0.766 |     0.793 |
| [`recomendacao-historico.sql`](../backend/prisma/consultas/recomendacao-historico.sql)           | `ItemPedido_pedidoId_idx`, `Pedido_compradorId_criadoEm_idx`, `Produto_pkey` / `ItemPedido_pedidoId_idx`, `Pedido_confirmado_compradorId_id_idx`, `Produto_pkey` | Limit > Unique > Sort > Nested Loop > Nested Loop > Bitmap Heap Scan Pedido > Bitmap Index Scan `Pedido_compradorId_criadoEm_idx` > Index Scan `ItemPedido_pedidoId_idx` > Index Scan `Produto_pkey` > Sort > Hash Join > Hash Join > Hash Join > Hash Join > Hash Join > Seq Scan Produto > Hash > CTE Scan > Hash > CTE Scan > Hash > Seq Scan Usuario > Hash > Subquery Scan > Aggregate > Seq Scan ItemPedido > Hash > Subquery Scan > Aggregate > Seq Scan Avaliacao | Limit > Unique > Sort > Nested Loop > Nested Loop > Index Only Scan `Pedido_confirmado_compradorId_id_idx` > Index Scan `ItemPedido_pedidoId_idx` > Index Scan `Produto_pkey` > Sort > Hash Join > Hash Join > Hash Join > Hash Join > Hash Join > Seq Scan Produto > Hash > CTE Scan > Hash > CTE Scan > Hash > Seq Scan Usuario > Hash > Subquery Scan > Aggregate > Seq Scan ItemPedido > Hash > Subquery Scan > Aggregate > Seq Scan Avaliacao |    1.646 |     1.651 |
| [`recomendacao-fallback.sql`](../backend/prisma/consultas/recomendacao-fallback.sql)             | `ItemPedido_pedidoId_idx`, `Pedido_compradorId_criadoEm_idx` / `ItemPedido_pedidoId_idx`, `Pedido_confirmado_compradorId_id_idx`                                 | Limit > Sort > Hash Join > Hash Join > Hash Join > Hash Join > Seq Scan Produto > Hash > Nested Loop > Bitmap Heap Scan Pedido > Bitmap Index Scan `Pedido_compradorId_criadoEm_idx` > Index Scan `ItemPedido_pedidoId_idx` > Hash > Seq Scan Usuario > Hash > Subquery Scan > Aggregate > Seq Scan ItemPedido > Hash > Subquery Scan > Aggregate > Seq Scan Avaliacao                                                                                                    | Limit > Sort > Hash Join > Hash Join > Hash Join > Hash Join > Seq Scan Produto > Hash > Nested Loop > Index Only Scan `Pedido_confirmado_compradorId_id_idx` > Index Scan `ItemPedido_pedidoId_idx` > Hash > Seq Scan Usuario > Hash > Subquery Scan > Aggregate > Seq Scan ItemPedido > Hash > Subquery Scan > Aggregate > Seq Scan Avaliacao                                                                                                    |    1.528 |     1.535 |

A recomendação mantém subconsultas agregadas antes dos joins.
Sua soma de vendas usa todos os itens, como implementado.
Pedido participa somente dos filtros de histórico e exclusão.
Um índice por status não acelera aquelas agregações globais.

O plano de indicadores agrega itens confirmados antes do join.
Na massa medida, ler Pedido sequencialmente teve baixo custo.
A propriedade do artesão usa `Produto_artesaoId_idx`.
A avaliação usa comprador e produto como filtros seletivos.
O INSERT permanece protegido pelo UNIQUE comprador/produto existente.
O EXPLAIN de POST mede a verificação com `FOR SHARE`.
Nenhum INSERT foi executado por esse arquivo de consulta.

## Candidatos temporários e decisão

| Candidato                                                  | Consulta representativa   | Antes ms | Depois ms | Buffers hit antes/depois | Motivo do descarte                                                                                                                                                                                           |
| ---------------------------------------------------------- | ------------------------- | -------: | --------: | -----------------------: | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `Pedido(id) WHERE status = confirmado`                     | `indicadores-artesao`     |    1.709 |     1.548 |                    57/57 | O planner manteve Seq Scan de Pedido. Todos os pedidos atendem ao predicado. Duplicaria praticamente a PK e acrescentaria escrita.                                                                           |
| `Pedido(compradorId, id) WHERE status = confirmado`        | `avaliacao-elegibilidade` |    0.064 |     0.058 |                     11/9 | Foi utilizado, mas o ganho absoluto foi de 0,006 ms nesta amostra. O índice existente já atende comprador. O parcial cobriria todos os pedidos, acrescentando escrita sem benefício operacional demonstrado. |
| `Pedido(criadoEm DESC, id DESC) WHERE status = confirmado` | `pedidos-artesao`         |    0.410 |     0.415 |                  189/189 | O planner manteve o acesso por artesão e a ordenação dos pedidos encontrados. O índice não foi escolhido nesse acesso e acrescentaria manutenção a cada checkout.                                            |

Todos os três candidatos possuem pares completos das dezenove consultas.
Os ganhos pontuais não são tratados como ganhos garantidos.
O custo de escrita é uma consequência estrutural adicional.
Sua magnitude não foi medida por benchmark nesta subtarefa.
Os candidatos ocuparam 64, 96 e 80 KiB adicionais, respectivamente.

### Outros índices descartados

| Índice proposto                      | Motivo                                                                                                         | Evidência vigente                                                                                                               |
| ------------------------------------ | -------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `ItemPedido(produtoId)`              | Já existente. Não duplicar.                                                                                    | `ItemPedido_produtoId_idx`, migration `20260914000000_init_fccpd`. Usado na compra verificada.                                  |
| `ItemPedido(pedidoId)`               | Já existente. Não duplicar.                                                                                    | `ItemPedido_pedidoId_idx`, mesma migration. Usado nos itens e no histórico.                                                     |
| `Produto(artesaoId)`                 | Já existente. Não duplicar.                                                                                    | `Produto_artesaoId_idx`, migration `20260915154901_add_dominio_completo`. Usado nos três acessos do artesão.                    |
| `Avaliacao(produtoId)`               | Já existente. Sem seletividade mensurável nesta tabela vazia.                                                  | `Avaliacao_produtoId_idx`, mesma migration. O plano medido usa Seq Scan vazio.                                                  |
| `Pedido(compradorId, criadoEm DESC)` | Já existente desde a Sprint 4. Não duplicar.                                                                   | `Pedido_compradorId_criadoEm_idx`, migration `20261014010000_indices_consultas`. Usado em compra, elegibilidade e histórico.    |
| `Avaliacao(compradorId, produtoId)`  | Já protegido por UNIQUE. Não criar B-tree redundante.                                                          | `Avaliacao_compradorId_produtoId_key`. Preserva unicidade no INSERT. A tabela vazia não obrigou seu uso no SELECT.              |
| `Pedido(status)`                     | Baixa seletividade. Todos os 1.500 pedidos são confirmados. Acrescentaria escrita.                             | Distribuição registrada em `context.counts.pedidosConfirmados`. Os planos preferem Seq Scan ou acessos pelas chaves existentes. |
| Índices cobrindo SUM/AVG globalmente | Agregações leem todos os itens e notas disponíveis. Sem ganho comprovado para justificar duplicação e escrita. | Seq Scan e HashAggregate nos JSONs de recomendação. Reavaliar com mais avaliações e outra escala.                               |

Os quatro índices simples precedem a Sprint 4.
O composto de comprador foi acrescentado naquela sprint.
Todos já existiam antes da execução da BD.4.

## Limites da evidência

A distribuição atual não permite avaliar status raro.
Uma massa mista ou maior exige repetir a comparação.
Não se extrapola desempenho de avaliações com zero registros.
O índice de avaliações existente foi preservado.

Pedidos recebidos foi separado em página, contagem e itens.
O SQL da página reproduz status parametrizado e EXISTS do Prisma.
O filtro do artesão também permanece na consulta dos itens.
O lote usa ANY(uuid[]), equivalente ao IN parametrizado.
A projeção dos itens omite status e enviadoEm.
Essas colunas da Web.2 faltam nesta branch de volume.
Nenhuma migration alheia foi aplicada para produzir esta medição.
Os predicados e joins de suporte foram preservados.
As leituras de nomes por PK não foram medidas novamente.
Esta evidência não confirma a execução HTTP completa desses endpoints.

## Reprodução e arquivos

Execute no diretório `backend`, com as variáveis locais configuradas.
No PowerShell, use `npm.cmd` para preservar as flags.

```sh
npm run db:explain -- --volume --candidate confirmado-id --output ../evidencias/PI4-BD-W12-Indices-Consultas/BD.4-indices-suporte/nova-coleta-id
npm run db:explain -- --volume --candidate confirmado-comprador --output ../evidencias/PI4-BD-W12-Indices-Consultas/BD.4-indices-suporte/nova-coleta-comprador
npm run db:explain -- --volume --candidate confirmado-ordenacao --output ../evidencias/PI4-BD-W12-Indices-Consultas/BD.4-indices-suporte/nova-coleta-ordenacao
```

Os diretórios de saída precisam estar novos ou vazios.
O runner recusa produção e conexões coincidentes com padrão/deploy.
Os três DDLs são internos e escolhidos por allowlist.
Parâmetros são vinculados pelo driver, incluindo UUIDs e paginação.
A transação usa Repeatable Read e termina com ROLLBACK.
FOR SHARE exige BEGIN normal, mesmo sendo uma leitura.
O runner confere hashes dos resultados antes/depois.
Somente atualizadoEm, derivado do relógio, fica fora do hash.
A ausência do candidato é verificada após o ROLLBACK.
Essa confirmação foi gravada em `rollback.json` nas três coletas.

Planos desta coleta:

- [Candidato por ID](../evidencias/PI4-BD-W12-Indices-Consultas/BD.4-indices-suporte/verificacao/confirmado-id/resumo.md).
- [Candidato por comprador](../evidencias/PI4-BD-W12-Indices-Consultas/BD.4-indices-suporte/verificacao/confirmado-comprador/resumo.md).
- [Candidato ordenado](../evidencias/PI4-BD-W12-Indices-Consultas/BD.4-indices-suporte/verificacao/confirmado-ordenacao/resumo.md).

Cada diretório contém antes/ e depois/ com JSONs integrais.
São 57 pares, com hashes iguais e rollback confirmado.
Essas evidências permanecem locais, conforme o gitignore existente.
O relatório, as consultas e o runner integram a alteração.

## Validação e revisão

Os testes começaram falhando por ausência das novas opções.
A integração também falhou ao encontrar somente nove consultas.
Depois validou dezenove consultas e os três candidatos reais.
O teste de hashes falhou antes da implementação correspondente.
Nenhum mock de PostgreSQL ou repository foi empregado.

A revisão equivalente foi autorizada nesta conversa.
Foram conferidos parametrização, allowlist, isolamento e rollback.
Também foram conferidos preservação de evidências e erros sanitizados.
Lint e typecheck passaram no backend e no frontend.
Os 942 testes frontend passaram, em 100 arquivos.
Os 726 testes backend passaram, em 69 arquivos.
A formatação dos arquivos alterados também foi conferida.

A primeira suíte no volume passou 723 testes.
Três testes de checkout retornaram HTTP 503.
Faltavam `ItemPedido.status` e `ItemPedido.enviadoEm` naquela base.
Uma leitura Prisma confirmou o erro P2022 correspondente.
As falhas ocorreram em `authorization.routes.integration.test.ts` e `pedidos.integration.test.ts`.
Os nomes dos três testes constam no diagnóstico local.

Pedro autorizou uma base temporária e sua limpeza.
Essa base recebeu as dez migrations existentes do projeto.
A suíte completa passou nessa base atualizada e isolada.
A base foi removida, com ausência verificada após os testes.
A massa original de volume permaneceu preservada.
Nenhuma migration da Web.2 foi aplicada ao volume público.

Registros locais de validação:

- [Suíte backend final](../evidencias/PI4-BD-W12-Indices-Consultas/BD.4-indices-suporte/testes-backend-temporario.log).
- [Criação e remoção da base temporária](../evidencias/PI4-BD-W12-Indices-Consultas/BD.4-indices-suporte/banco-temporario-final.json).
- [Diagnóstico das falhas ambientais iniciais](../evidencias/PI4-BD-W12-Indices-Consultas/BD.4-indices-suporte/diagnostico-volume.json).
- [Revisão equivalente](../evidencias/PI4-BD-W12-Indices-Consultas/BD.4-indices-suporte/revisao-equivalente.md).

## Referências

A escolha considera seletividade e manutenção de índices parciais.
Fonte: [PostgreSQL, índices parciais](https://www.postgresql.org/docs/current/indexes-partial.html).
ANALYZE executa a consulta; os buffers descrevem acessos reais.
Fonte: [PostgreSQL, EXPLAIN](https://www.postgresql.org/docs/current/sql-explain.html).
Base histórica: [modelo físico, seção de índices](../sprints/semana-10-11/01-Modelo-Fisico-BD.md#6-indices-e-consultas).
