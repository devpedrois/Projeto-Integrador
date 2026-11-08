# Baseline deterministica de recomendacao

## Escopo

O modulo seleciona produtos existentes. Ele nao gera conteudo, define precos
ou modera cadastros. Na U2, a baseline roda no microsservico Express,
seguindo Strategy e consultando views contratuais no PostgreSQL real.
Fontes: [composicao do microsservico](../../services/recomendacao/src/app.ts) e
[repository](../../services/recomendacao/src/repositories/recomendacao.repository.ts).

O [documento do modulo U2](../modulo-recomendacao-u2.md) consolida comportamento,
contratos, arquitetura, prints, metricas e limitacoes com fontes verificaveis.
As secoes historicas abaixo preservam a evolucao anterior.
Seus caminhos removidos e comandos antigos nao orientam execucoes atuais.
Use a [reproducao atual das metricas](../modulo-recomendacao-u2.md#como-reproduzir).

## Execucoes e contratos atuais

| Execucao                                   | Fonte e resposta                               | Implementacao                                                                                                                                |
| ------------------------------------------ | ---------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `FakeRecommendationAdapter`, historico AV1 | Repositorio local; `{ estrategia, itens }`     | [Adapter local](../../frontend/src/services/fake/recomendacoes/fake-recommendation.adapter.ts)                                               |
| Strategies do microsservico, U2            | Views PostgreSQL; `{ estrategia, produtoIds }` | [Composicao](../../services/recomendacao/src/app.ts) e [repository](../../services/recomendacao/src/repositories/recomendacao.repository.ts) |
| `HttpRecomendacaoClient`, API              | HTTP interno autenticado; selecao de IDs       | [Cliente HTTP](../../backend/src/integrations/recommendation/http-recomendacao.client.ts)                                                    |
| `HttpRecommendationAdapter`, frontend U2   | API publica; `{ estrategia, itens }`           | [Adapter HTTP](../../frontend/src/services/http/recomendacoes.adapter.ts)                                                                    |

A API hidrata IDs usando o catalogo publico existente.
Remove contexto, repetidos e produtos invisiveis; preserva a ordem selecionada.
Retorna ate oito produtos, com complemento local quando necessario.
Fontes: [service publico](../../backend/src/services/recomendacao.service.ts) e
[mapper ProdutoDTO](../../backend/src/utils/produto-dto.ts).

Nao apresente o adapter falso como resultado do PostgreSQL.
As [metricas U2](../metricas-recomendacao-u2.md#após-a-extração-para-o-microsserviço-07112026)
executam as Strategies reais pela operacao de lote.

## Arquitetura U2 e degradacao da API

A API autentica o comprador antes da chamada interna.
O microsservico recebe `usuarioId`, nunca o JWT do comprador.
As rotas internas exigem `X-Service-Token`, exceto `/health`.
Fontes: [controller publico](../../backend/src/controllers/recomendacao.controller.ts),
[cliente HTTP](../../backend/src/integrations/recommendation/http-recomendacao.client.ts) e
[router interno](../../services/recomendacao/src/routes/recomendacao.routes.ts).

`recomendacao_app` le somente as views contratuais da API.
Possui o schema privado `recomendacao`, inacessivel ao papel da API.
O lote registra suas execucoes nesse schema privado.
Fontes: [bootstrap](../../services/recomendacao/sql/bootstrap-permissoes.sql),
[lote](../../services/recomendacao/src/lote/index.ts) e
[isolamento verificado](../../evidencias/PI4-35/35.4-deploy-render/permissoes-producao.json).

`fallback-geral` pertence ao microsservico e resolve contextos sem candidatos.
`fallback-local` pertence a API e atende falhas do microsservico.
`misto` identifica selecao valida menor que oito apos hidratacao.
Nesse caso, a API tenta completar com produtos visiveis.
Essas respostas degradadas nao persistem no cache compartilhado.
A rota pessoal continua `no-store` em qualquer estrategia.
Fontes: [Strategies](../../services/recomendacao/src/strategies/categoria-recomendacao.strategy.ts),
[service publico](../../backend/src/services/recomendacao.service.ts) e
[controller](../../backend/src/controllers/recomendacao.controller.ts).

## Elegibilidade

O resultado publico exige produto ativo, estoque e ausencia de moderacao.
Tambem exige artesao ativo com papel artesanal no catalogo.
O filtro interno de categoria utiliza `elegivel` na view.
Esse filtro interno considera somente atividade e estoque do produto.
A hidratacao publica revalida os demais criterios na API.
Exclua contexto e IDs repetidos; retorne ate oito itens.
Fontes: [view](../../backend/prisma/migrations/20261104160116_views_contrato_recomendacao/migration.sql),
[catalogo](../../backend/src/repositories/catalogo.repository.ts) e
[service](../../backend/src/services/recomendacao.service.ts).

## Estrategia por produto

1. Selecione produtos da mesma categoria.
2. Com reforco regional, priorize mesma regiao.
3. Ordene por quantidade vendida decrescente.
4. Desempate pela nota media decrescente.
5. Desempate final pelo UUID crescente.

O reforco regional e uma prioridade lexicografica. Ele fica entre categoria
e vendas. Essa regra e deterministica e pode ser ligada ou desligada nos
testes comparativos.

Na composicao HTTP atual, o reforco permanece desligado.
O lote e as metricas permitem ativa-lo internamente.
Fontes: [composicao](../../services/recomendacao/src/app.ts),
[Strategy](../../services/recomendacao/src/strategies/categoria-recomendacao.strategy.ts) e
[metricas](../../services/recomendacao/scripts/lib/metricas.ts).

## Fallback geral

Use o fallback quando o contexto estiver vazio ou inexistente.
Tambem ocorre quando a categoria nao possui candidatos elegiveis.
Historico ausente ou esgotado usa fallback, excluindo compras confirmadas.
Fontes: [categoria](../../services/recomendacao/src/strategies/categoria-recomendacao.strategy.ts) e
[historico](../../services/recomendacao/src/strategies/historico-compra-recomendacao.strategy.ts).

A partir da IA-03, a vitrine anonima solicita fallback sem contexto.
O detalhe continua usando `produtoId` para pecas relacionadas.

Ordenacao do fallback:

1. quantidade vendida decrescente;
2. nota media decrescente;
3. UUID crescente.

Produtos sem vendas permanecem elegiveis. Considere vendas como zero.
Produtos sem avaliacoes possuem nota zero.

A view agrega vendas sem filtrar o status dos pedidos.
O fallback local da API conta apenas vendas confirmadas.
Essa diferenca integra as [limitacoes documentadas do modulo](../modulo-recomendacao-u2.md#2-estratégias-de-seleção).
Fontes: [view](../../backend/prisma/migrations/20261104160116_views_contrato_recomendacao/migration.sql) e
[consulta local](../../backend/src/repositories/catalogo.repository.ts).

## Contrato Strategy

A interface recebe um contexto e opcoes. Ela retorna `produtoIds` ordenados
e o nome da estrategia aplicada. Repositories fornecem somente IDs no ranking.
O service carrega produtos visiveis usando a consulta publica do catalogo.
Reconstroi a ordem selecionada e aplica `mapearProdutoDTO` em cada produto.
A resposta publica permanece `{ estrategia, itens: Produto[] }`.
IDs repetidos e o proprio produto de contexto sao removidos.
Produtos ocultos entre selecao e leitura sao omitidos sem reordenar restantes.
Selecoes menores que oito recebem tentativa de complemento como `misto`.
Fontes: [contrato interno](../../services/recomendacao/src/strategies/recomendacao.strategy.ts) e
[service da API](../../backend/src/services/recomendacao.service.ts).

Teste a Strategy usando dados persistidos no PostgreSQL. Nao use mocks de
repository ou banco.

Teste o adapter frontal usando o repositorio local real da Fake API. Cubra
loading, erro e vazio no componente. Uma fixture contratual comum deve
comprovar elegibilidade, ordenacao, desempates e limite nos dois lados.
A fixture base mantem regioes iguais. Assim, o reforco regional nao altera
o primeiro teste de paridade. Depois, uma fixture regional valida essa regra.

## Historico da implementacao

As secoes seguintes descrevem as respectivas entregas historicas.
Arquivos movidos, contratos substituidos e comandos removidos ficam contextualizados.
O estado U2 atual esta nas secoes anteriores.

## PI4-20.1 — Strategy real por categoria (sem fallback, sem endpoint)

`backend/src/integrations/recommendation/categoria-recomendacao.strategy.ts`
implementa a primeira fatia da baseline oficial: `CategoriaRecomendacaoStrategy`
consulta `PrismaRecomendacaoRepository`
(`backend/src/repositories/recomendacao.repository.ts`) contra PostgreSQL real,
seleciona candidatos ativos, com estoque e da mesma categoria do `produtoId` de
contexto, exclui o produto atual, ordena por vendas decrescente (soma de
`ItemPedido.quantidade`), depois nota media decrescente (media de
`Avaliacao.nota`) e por fim UUID crescente, retornando no maximo oito itens.

Fallback geral, endpoint HTTP, reforco regional e metricas v0 ficam para
subtarefas seguintes (ver escopo da PI4-20.1). Sem produto de contexto
encontrado, a Strategy retorna `itens: []` sem substituir por outro produto.

`backend/tests/integration/recomendacao.strategy.integration.test.ts` reaplica
a fixture contratual `fixtures/recomendacao-produto.fixture.json` (a mesma
usada pelo `FakeRecommendationAdapter` do frontend, T04.1) contra dados reais
inseridos no Neon de desenvolvimento, comprovando paridade de ordenacao entre
o adapter falso e a Strategy real para os mesmos dados.

A agregacao SQL usa subqueries separadas para vendas e nota media (uma por
`produtoId`) antes do `LEFT JOIN` com `Produto`; um `LEFT JOIN` direto nas
tabelas `ItemPedido` e `Avaliacao` multiplica linhas (fanout) e infla `SUM`
quando um produto tem mais de uma avaliacao, o que foi encontrado e corrigido
durante o TDD desta subtarefa.

## PI4-20.2 — Fallback geral (sem endpoint, sem reforco regional)

`CategoriaRecomendacaoStrategy` agora aplica o fallback geral descrito acima
quando: o `produtoId` de contexto nao existe; o produto existe mas nao possui
candidatos elegiveis na propria categoria; ou o contexto usa `usuarioId`
(sempre fallback na U1, sem consultar historico pessoal).

`PrismaRecomendacaoRepository.listarFallbackGeral` consulta produtos ativos e
com estoque em toda a base (sem filtro de categoria), com a mesma ordenacao
(vendas desc, nota media desc, UUID asc) e o mesmo limite de oito itens,
excluindo o produto de contexto quando ele existir. A estrategia retornada
passa a ser `"fallback-geral"`, sinalizando internamente qual caminho foi
aplicado.

`backend/tests/integration/recomendacao-fallback.strategy.integration.test.ts`
cobre os tres cenarios de acionamento do fallback, a ordenacao deterministica
com desempate por UUID, o limite de oito itens, a ausencia de repeticao de
IDs e a exclusao de produtos inativos, sem estoque ou do proprio contexto.
Endpoint HTTP e reforco regional continuam fora do escopo desta subtarefa.

## PI4-20.3 — Endpoint HTTP `GET /recomendacoes`

`backend/src/routes/recomendacao.routes.ts`, `recomendacao.controller.ts` e
`recomendacao.service.ts` expoem `CategoriaRecomendacaoStrategy` via HTTP,
seguindo Route/Controller/Service/Repository. `recomendacao.validator.ts`
valida a query na borda com zod `.strict()`: aceita exatamente um entre
`produtoId` e `usuarioId` (UUID), rejeitando ausencia, ambos ao mesmo tempo,
UUID invalido ou chaves desconhecidas com `400 VALIDACAO`.

`RecomendacaoItem`/`CandidatoRecomendacao` passaram a incluir os campos
publicos do produto (`id`, `nome`, `descricao`, `preco`, `quantidadeEstoque`,
`categoriaId`, `artesaoId`), sem expor colunas internas. O endpoint nao exige
autenticacao nesta fase (leitura publica, sem dado pessoal). `usuarioId`
continua caindo no fallback geral sintetico, sem consultar historico
pessoal, conforme a U1.

`backend/tests/integration/recomendacoes.route.integration.test.ts` cobre
`produtoId` valido, `usuarioId` valido, ausencia dos dois parametros, os dois
parametros juntos, UUID invalido e produto de contexto ausente (fallback).

## PI4-20.4 — Reforco regional (opcao interna, sem novo peso numerico)

`CategoriaRecomendacaoStrategy` recebe uma opcao interna
(`reforcoRegionalAtivo`) que, quando ligada, passa `regiaoContexto` (regiao do
artesao do produto de contexto) para `PrismaRecomendacaoRepository`. O
repository aplica prioridade lexicografica — `ORDER BY (regiao IS NOT
DISTINCT FROM regiaoContexto) DESC` — entre categoria e vendas, sem introduzir
peso numerico arbitrario. Desligada, a ordenacao volta exatamente ao baseline
de PI4-20.1/20.2. Fallback geral nao muda.

Testes de integracao cobrem candidatos de duas regioes, comparando a mesma
massa de dados com o reforco ligado e desligado, confirmando que os
desempates por vendas/nota/UUID continuam deterministicos dentro de cada
grupo de regiao.

Na BD-03, contexto e candidatos passam a ler `PerfilArtesao.regiaoId`.
O SQL compara `pa."regiaoId" IS NOT DISTINCT FROM regiaoContexto`.
A propriedade interna `regiao` do contexto transporta esse ID textual.
O contrato externo, fallback, desempates e ranking esperado nao mudam.
As fixtures regionais gravam FKs com os mesmos IDs dos seeds frontais.

## PI4-20.5 — Metricas v0 (script reproduzivel)

`backend/src/integrations/recommendation/recomendacao-metricas.ts` implementa
`calcularCobertura` e `calcularAcertoCategoria` com as formulas exatas desta
secao (denominador zero retorna zero explicitamente, sem excecao nem `NaN`),
mais `calcularMetricasBaseline`, que roda a Strategy real contra os produtos
elegiveis do repository e agrega numerador/denominador/percentual dos dois
indicadores.

`backend/scripts/metricas-recomendacao.ts` e o ponto de entrada executavel:
conecta no Postgres via `PrismaRecomendacaoRepository`, roda o calculo sobre a
carga sintetica real, imprime o resultado em JSON estavel e encerra com
codigo de saida diferente de zero em falha. Cobertura de teste unitario
(formulas puras) e de integracao (contra o seed real) em
`backend/tests/unit/recomendacao-metricas.unit.test.ts` e
`backend/tests/integration/recomendacao-metricas.integration.test.ts`.

## Metricas v0

Definicoes exatas:

```text
cobertura = produtosElegiveisComRecomendacao / produtosElegiveis * 100

acertoCategoria = recomendacoesComMesmaCategoria / totalRecomendacoes * 100
```

Se nao houver produtos elegiveis, cobertura vale zero. Se nenhuma
recomendacao for produzida, acerto por categoria vale zero.

Calcule as metricas sobre a carga sintetica versionada. Registre quantidade
de produtos, quantidade de recomendacoes e resultado percentual.

## IA-02: consumo HTTP na vitrine e no detalhe

NEXT_PUBLIC_DATA_SOURCE=http registra HttpRecommendationAdapter no container.
O recurso sai de PENDENTES_HTTP e chama GET /api/recomendacoes.
O adapter usa ApiClient e valida produtos pelo parser publico existente.
Preserva estrategia e ordem recebidas, inclusive fallback-geral.
Remove contexto, IDs repetidos e itens invisiveis antes do limite oito.
Nao executa ranking local nem consulta localStorage no modo HTTP.

FaixaRecomendacoes conserva loading, sucesso, vazio e erro do hook.
Ela recebe renderer opcional para reutilizar os mesmos estados.
No detalhe, Peças relacionadas usa ProdutoCard com links e acao existente.
O trilho horizontal possui colunas fixas e foco por teclado.
Falhas HTTP produzem alerta; nao viram lista vazia silenciosa.
NEXT_PUBLIC_DATA_SOURCE=fake conserva o adapter local da AV1.
Contexto usuarioId continua no fallback geral, conforme IA-01.

## Testes minimos da baseline

- Mais vendidos vencem dentro da mesma regiao.
- Nota media desempata vendas iguais.
- UUID estabiliza empates completos.
- Produto atual nunca aparece.
- Produto inativo nunca aparece.
- Produto sem estoque nunca aparece.
- Fallback funciona sem contexto aproveitavel.
- Vitrine anonima usa fallback geral sem contexto.
- Reforco regional altera a ordem esperada.
- Resposta nunca supera oito itens.

## IA-03: historico de compras pelo token

`HistoricoCompraRecomendacaoStrategy` implementa a mesma interface Strategy.
Seleciona categorias dos pedidos confirmados do comprador no PostgreSQL real.
Exclui produtos desses pedidos, inclusive no fallback quando categorias esgotam.
Pedidos pendentes e cancelados nao formam historico nem exclusoes.
Compras de terceiros nao definem categorias ou exclusoes pessoais.
Ranking conserva vendas desc, nota media desc e UUID asc.
Agregacoes separadas evitam multiplicacao entre vendas e avaliacoes.
Filtra produtos inativos, moderados, sem estoque e artesaos desativados.
Retorna ate oito IDs e identifica `historico-compra` na resposta.
Sem historico ou candidatos elegiveis, identifica `fallback-geral`.

`GET /recomendacoes/para-mim` exige autenticacao e papel comprador atual.
Identidade vem exclusivamente do token, nunca da URL.
Query pessoal deve ser vazia. Query publica rejeita `usuarioId`.
A rota pessoal nao acessa CacheStore e responde `Cache-Control: no-store`.
Mantem o mapper publico ProdutoDTO e a ordem selecionada.

No modo HTTP, vitrine de comprador usa `/api/recomendacoes/para-mim`.
Visitantes, artesaos e administradores usam `/api/recomendacoes` sem contexto.
O `usuarioId` no contrato frontal apenas seleciona a rota pessoal.
Esse identificador nao e enviado ao servidor.
O modo fake conserva fallback local, sem simular historico PostgreSQL.
Hook distingue contexto vazio para fallback e null para suspender consultas.

`recomendacoes-historico.integration.test.ts` testa Strategy diretamente e HTTP.
Usa schema isolado, PostgreSQL real e dados sinteticos, sem mocks de repository.
Cobre ceramica, varias categorias, ranking, exclusoes, fallback e limite oito.
Tambem cobre autenticacao, papeis, sessao alterada, query e ausencia de cache.

## IA-04: metricas HTTP nas bases demo e volume

Coleta: 14/10/2026, 17:42:35, America/Sao_Paulo.
JSON: `backend/metricas/recomendacao-volume.json`.
Ambiente: Node 22.12.0, Windows, Express local em loopback e PostgreSQL Neon.
Pedro autorizou recriar os seeds BD-05 em schemas temporarios de testes.
As duas bases desta rodada possuem origem `seed-isolado`.
Nenhuma migration ou seed foi aplicada no schema publico.
Schemas e servidores temporarios foram descartados ao concluir.

Comando unico validado no PowerShell, dentro de `backend/`:

```powershell
npm.cmd run metricas:recomendacao -- --isolado
```

Em outros shells, use `npm run` no lugar de `npm.cmd run`.
O seed de volume usa PRNG fixo 20261013.
Migrations e seeds versionados determinam os dados de cada execucao.
Os indicadores de qualidade repetem com os mesmos dados.
Os tempos variam conforme rede, hardware e carga concorrente.
A suite backend executava em paralelo nesta rodada.
Os tempos descrevem esse ambiente, sem representar o deploy publicado.

Para branches existentes, configure `DATABASE_URL` para demo e
`DATABASE_URL_VOLUME` para volume. Execute `npm.cmd run metricas:recomendacao`.
`--demo-env` e `--volume-env` escolhem nomes alternativos de variaveis.
Nunca passe uma URL pela linha de comando.
`--schema-demo` e `--schema-volume` selecionam schemas existentes.
Esse modo nao aplica migrations nem seeds: executa somente leitura.
O JSON e substituido apenas depois de ambas as bases medidas.

### Tamanho real das bases medidas

| Base   | Produtos | Elegiveis | Usuarios | Artesaos | Compradores ativos | Pedidos confirmados | Categorias elegiveis |
| ------ | -------: | --------: | -------: | -------: | -----------------: | ------------------: | -------------------: |
| demo   |       30 |        30 |        5 |        2 |                  2 |                   3 |                    5 |
| volume |     1000 |      1000 |      350 |       50 |                300 |                1500 |                    5 |

Todos os pedidos existentes nessas duas cargas estavam confirmados.
Elegibilidade segue o catalogo publico: produto ativo, estoque positivo,
sem moderacao e artesao ativo com papel artesao.

### Definicoes e procedimento

- Cobertura do catalogo: produtos elegiveis distintos recomendados / elegiveis.
- Cobertura v0: contextos que recebem itens / contextos avaliados.
- Taxa de fallback: respostas `fallback-geral` / contextos avaliados.
- Diversidade media: categorias distintas por resposta, incluindo vazias como zero.
- Diversidade global: uniao das categorias recomendadas / categorias elegiveis.
- Acerto por categoria v0: itens da categoria do contexto / itens retornados.

Percentuais multiplicam essas razoes por 100. Denominadores zero retornam zero.
As formulas v0 anteriores permanecem disponiveis e testadas.
O script atual preserva cobertura v0 e acerto por categoria no JSON.
Cobertura do catalogo mede circulacao de produtos, distinguindo-se da cobertura v0.

Avaliacao completa, sem amostragem: todos os produtos elegiveis para categoria,
todos os compradores ativos para historico. Ordem fixa por UUID crescente.
Cada contexto possui uma resposta de qualidade e um par de tempos.
`--repeticoes` permite de 1 a 10 pares por contexto.
Repeticoes aumentam amostras de latencia sem duplicar contagens de qualidade.

Cada par esvazia o cache de recomendacoes antes da chamada fria.
A chamada quente repete imediatamente o mesmo contexto.
Categoria precisa retornar MISS seguido de HIT.
Historico usa `/recomendacoes/para-mim` e permanece BYPASS em ambas as fases.
Nao foi adicionado cache pessoal para produzir ganhos artificiais.
Frio significa cache da aplicacao vazio; caches PostgreSQL e do sistema continuam.

Latencia cobre HTTP completo, incluindo recebimento e interpretacao do JSON.
Preparacao da base, conexao inicial e emissao de JWT ficam fora da medicao.
JWTs efemeros ficam em memoria, apenas para a API temporaria em loopback.
Autenticar e exigirPapel reconsultam identidade ativa e papel no PostgreSQL.
Nenhuma senha, identidade pessoal, cookie ou conexao aparece na saida.

P95 usa nearest-rank: amostra ordenada no indice `ceil(0.95 * n) - 1`.
Essa rodada usou uma repeticao. Nao foram descartados outliers.
Snapshot REPEATABLE READ impede mudancas nos dados entre fases.
Respostas divergentes, cache inesperado ou snapshot substituido abortam a coleta.

### Resultados completos

| Base   | Estrategia | Contextos | Cobertura catalogo % | Cobertura v0 % | Fallback % | Diversidade media | Frio media/p95 ms | Quente media/p95 ms | Cache quente |
| ------ | ---------- | --------: | -------------------: | -------------: | ---------: | ----------------: | ----------------: | ------------------: | ------------ |
| demo   | categoria  |        30 |               100.00 |         100.00 |       0.00 |              1.00 |   245.493/611.503 |         1.269/2.052 | HIT          |
| demo   | historico  |         2 |                20.00 |         100.00 |       0.00 |              1.00 |     115.7/116.217 |     114.058/114.423 | BYPASS       |
| volume | categoria  |      1000 |                 4.50 |         100.00 |       0.00 |              1.00 |   147.029/359.355 |         0.858/1.224 | HIT          |
| volume | historico  |       300 |                 4.30 |         100.00 |       0.33 |              2.83 |   170.885/407.879 |      163.33/390.938 | BYPASS       |

| Base   | Estrategia | Itens retornados | Produtos distintos | Categorias distintas | Acerto categoria v0 % | Amostras frio/quente |
| ------ | ---------- | ---------------: | -----------------: | -------------------: | --------------------: | -------------------: |
| demo   | categoria  |              150 |                 30 |                  5/5 |                100.00 |                30/30 |
| demo   | historico  |                9 |                  6 |                  1/5 |         Nao se aplica |                  2/2 |
| volume | categoria  |             8000 |                 45 |                  5/5 |                100.00 |            1000/1000 |
| volume | historico  |             2400 |                 43 |                  5/5 |         Nao se aplica |              300/300 |

### Leitura dos numeros

Todos os contextos receberam itens, mas a circulacao ficou concentrada.
Na carga de volume, categoria recomendou 45 dos 1000 produtos.
Historico recomendou 43 produtos, com media de 2.83 categorias por resposta.
Categoria manteve uma categoria por resposta e acerto v0 de 100%.
Isso evidencia concentracao nos produtos mais populares do ranking deterministico.
Um dos 300 compradores de volume precisou do fallback: 0.33%.
Na demo, o historico dos dois compradores concentrou-se em uma categoria.

Cache quente reduziu a media de categoria de 147.029 para 0.858 ms no volume.
Historico manteve tempos proximos entre fases, pois continua sem cache compartilhado.
P95 do historico demo possui apenas duas amostras, equivalendo ao maior tempo.
Os resultados nao demonstram relevancia percebida, causalidade ou satisfacao humana.
Essas metricas avaliam selecao, diversidade, fallback e comportamento HTTP observado.

## 30.6: benchmark da Strategy em lote

Execute `npm.cmd run bench:recomendacao` dentro de `backend/`.
O script exige `DATABASE_URL_VOLUME` separada dos bancos padrao e deploy.
URLs diretas e pooler do mesmo endpoint representam a mesma base.
Execucao em `NODE_ENV=production` e recusada antes de conectar.
Nenhum seed ou migration e aplicado pelo benchmark.

Todos os produtos publicamente visiveis formam os contextos, ordenados por UUID.
A massa precisa conter pelo menos mil produtos elegiveis.
O script chama diretamente a `CategoriaRecomendacaoStrategy` existente.
Preserva integralmente a Strategy, inclusive a elegibilidade interna dos candidatos.
Nao mede HTTP, serializacao de DTO ou cache da aplicacao.

Um pool de promises proprio executa C tarefas simultaneas.
As configuracoes sao C=1, C=4 e C=8, nesta ordem.
Cada configuracao usa exatamente um pool PostgreSQL com maximo C+2.
Todas as conexoes sao abertas antes da cronometragem.
Uma conexao exporta o snapshot; C+1 ficam disponiveis para consultas.
As sessoes compartilham `REPEATABLE READ READ ONLY` durante cada C.
Cada C recebe um snapshot novo; a branch deve permanecer dedicada.
Mudancas nos resultados entre snapshots sao registradas como divergencias.
As conexoes sao fechadas ao terminar cada configuracao.

Sao cinco rodadas totais por C, incluindo o aquecimento inicial.
Portanto, quinze rodadas ficam registradas e doze entram nas medianas.
Cada rodada cobre todos os contextos, sem amostragem de produtos.
O aquecimento tambem precisa manter paridade com a referencia sequencial.
Tempo total usa relogio monotono, cobrindo todas as chamadas da Strategy.
Preparacao, conexoes, catalogo, comparacao e arquivos ficam fora desse tempo.
Throughput e produtos por segundo. Speedup usa a mediana sequencial.
Eficiencia corresponde ao speedup dividido por C.

`--output` seleciona uma pasta nova; destinos existentes sao recusados.
Sem argumento, uma pasta temporal nasce em `evidencias/PI4-30/benchmark-recomendacao/`.
Sao gravados CSV bruto, JSON, tabela Markdown e grafico PNG.
`sequencial.json` preserva os IDs ordenados para cada produto de contexto.
`diff.json` registra produto, C, rodada, IDs esperados e recebidos.
O resultado esperado desse diff e `[]` em todas as quinze rodadas.
Checkpoints separados por C preservam configuracoes terminadas se ocorrer falha.
Erros na borda omitem detalhes internos e encerram com codigo diferente de zero.

O grafico usa Python e Matplotlib, ja empregados pelo benchmark 30.5.
Os requisitos existentes estao em `backend/scripts/requirements-bench-fila.txt`.
`BENCH_RECOMENDACAO_PYTHON` seleciona o executavel; o padrao e `python`.
Nenhuma dependencia npm foi adicionada ao pool de promises.

O JSON registra ambiente, limite de conexoes PostgreSQL e espera local amostrada.
Amostras de `waitingCount` ocorrem a cada dez milissegundos.
Esse indicador nao mede a espera dentro do pooler remoto.
`max_connections` nao representa a cota comercial de conexoes Neon.
Ganho sublinear registra um limite observado, sem atribuir causa isoladamente.
Caches PostgreSQL e sistema nao sao esvaziados entre as rodadas.

Coleta de 25/10/2026, PostgreSQL 18.6 Neon e Node 22.12.0 local:
mil contextos por rodada, quinze rodadas identicas, diff vazio.
Medianas para C=1/4/8: 74,155/18,738/9,333 segundos.
Throughput: 13,485/53,368/107,152 produtos por segundo.
Speedup: 1,000/3,957/7,946; eficiencia: 100,00/98,94/99,32%.
Espera local amostrada maxima zero, sem teto observado ate C=8.
Nao houve evidencia suficiente para atribuir limite ao pooler Neon.
Artefatos: `evidencias/PI4-30/benchmark-recomendacao/execucao-2026-10-25T20-35-37-389Z/`.

## IA.3: comparação com reforço regional

`metricas-recomendacao.ts` aceita `--reforco-regional on|off|ambos`.
O padrão é `ambos`, com execução na ordem on, off.
A opção pertence ao script; não integra a API pública.
O JSON versão 2 preserva as métricas HTTP anteriores.
Acrescenta `comparacaoRegional` somente à base `volume`.
Cada modo instancia `CategoriaRecomendacaoStrategy` com o booleano correspondente.
Executa uma resposta por produto elegível, sem HTTP ou cache.
Os modos compartilham o snapshot READ ONLY da base.
Repetições de latência HTTP não duplicam contagens comparativas.
O ranking original permanece inalterado.
IDs invisíveis, repetidos e do contexto seguem a projeção pública.

Cada modo registra produtos totais, elegíveis e recomendações retornadas.
Preserva cobertura do catálogo, cobertura v0 e fallback da Sprint 4.
Também calcula acerto por categoria e coincidência regional.
Coincidência regional usa região não nula igual à do contexto.
O denominador contém todos os itens recomendados daquele modo.
Regiões ausentes não são tratadas como coincidência.
`contextosSemRegiao` explicita essa limitação na base avaliada.
Todos os indicadores retornam zero com denominador zero.
A tabela comparativa preserva a precisão numérica do JSON.

Coleta somente leitura, dentro de `backend/`:

```powershell
npm.cmd run metricas:recomendacao -- --reforco-regional ambos --output metricas/recomendacao-u2.json
```

Usa `DATABASE_URL` para demo e `DATABASE_URL_VOLUME` para volume.
Nenhum seed ou migration é aplicado nesse modo.
`--isolado` continua disponível para recriar os seeds em schemas temporários.
Resultados e leitura: `docs/metricas-recomendacao-u2.md`.
