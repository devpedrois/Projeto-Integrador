# IA.3: métricas com reforço regional

Data: 25/10/2026, 19:13:40, America/Sao_Paulo.
Registro UTC no JSON: `2026-10-25T22:13:40.700Z`.
Fonte: [recomendacao-u2.json](../backend/metricas/recomendacao-u2.json).
Origem da base: `branch-configurada`, com dados sintéticos de volume.

## Comando reproduzível

Execute dentro de `backend/`, usando as variáveis locais configuradas:

```powershell
npm.cmd run metricas:recomendacao -- --reforco-regional ambos --output metricas/recomendacao-u2.json
```

`DATABASE_URL` seleciona demo; `DATABASE_URL_VOLUME` seleciona volume.
O comando consulta as bases existentes em modo somente leitura.
Não aplica seeds ou migrations.
Para repetir os números, mantenha a massa inalterada.
`--reforco-regional` aceita `on`, `off` ou `ambos`.
O padrão é `ambos`.
A opção regional continua interna, sem parâmetro na API pública.

## Tamanho da base de volume

| Medida | Quantidade |
|---|---:|
| Produtos totais | 1000 |
| Produtos elegíveis | 1000 |
| Categorias elegíveis | 6 |
| Artesãos | 50 |
| Compradores ativos | 300 |
| Pedidos confirmados | 1500 |
| Contextos sem região | 0 |

Todos os produtos elegíveis foram avaliados em ambos os modos.
On e off compartilham o mesmo snapshot `REPEATABLE READ`.
A transação é `READ ONLY`.
Cada modo instancia a `CategoriaRecomendacaoStrategy` real.
A comparação chama diretamente a Strategy, sem HTTP ou cache.
As medições HTTP anteriores permanecem em `estrategias` no JSON.
Seus tempos usam o padrão regional desligado.
Esta tabela utiliza somente `bases[volume].comparacaoRegional`.

## Comparação on × off

Os valores abaixo preservam a precisão integral do JSON.

| Reforco regional | Produtos | Elegiveis | Recomendacoes | Cobertura catalogo % | Cobertura v0 % | Fallback % | Acerto categoria % | Mesma regiao % |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| on | 1000 | 1000 | 8000 | 16.2 | 100 | 0 | 100 | 100 |
| off | 1000 | 1000 | 8000 | 5.4 | 100 | 0 | 100 | 33.6875 |

| Numerador / denominador | on | off |
|---|---:|---:|
| Cobertura do catálogo | 162 / 1000 | 54 / 1000 |
| Cobertura v0 | 1000 / 1000 | 1000 / 1000 |
| Fallback | 0 / 1000 | 0 / 1000 |
| Acerto por categoria | 8000 / 8000 | 8000 / 8000 |
| Mesma região do contexto | 8000 / 8000 | 2695 / 8000 |

## Definições

Total de recomendações soma itens retornados em todos os contextos.
Cobertura do catálogo conta produtos distintos recomendados sobre elegíveis.
Cobertura v0 conta contextos com itens sobre contextos avaliados.
Fallback conta respostas `fallback-geral` sobre contextos avaliados.
Acerto por categoria conta itens da categoria do contexto.
Seu denominador é o total de recomendações daquele modo.
Coincidência regional compara `PerfilArtesao.regiaoId` com a região do contexto.
Seu denominador também contém todos os itens recomendados.
Regiões ausentes não contam como coincidência.
Denominadores zero produzem percentual zero.
Todos os percentuais multiplicam a razão por 100.

Elegibilidade segue o catálogo público, incluindo moderação e artesão ativo.
IDs invisíveis, duplicados e do contexto seguem a projeção pública.
Nenhuma regra do ranking foi alterada nesta subtarefa.

## Leitura dos números

O reforço elevou a coincidência regional de 33.6875% para 100%.
A cobertura do catálogo passou de 5.4% para 16.2%.
Produtos distintos recomendados passaram de 54 para 162.
Acerto por categoria, cobertura v0 e fallback permaneceram iguais.
Ambos os modos produziram 8000 recomendações.
Mesmo com reforço, a exposição continua concentrada.

A regra prioriza a região dentro da categoria.
Esse mecanismo explica a coincidência regional elevada.
Os números não demonstram satisfação humana ou vendas incrementais.
São indicadores de seleção sobre uma massa sintética.

Esta rodada possui seis categorias elegíveis.
O relatório da Sprint 4 possuía cinco categorias.
A comparação válida aqui usa on e off deste snapshot.
O relatório anterior não funciona como controle desta rodada.
Ele permanece preservado em `backend/metricas/recomendacao-volume.json`.

Revisão e logs: [evidências IA.3](../evidencias/IA.3/README.md).
