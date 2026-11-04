# 32.3: conferência da média de avaliações

Execução local em 04/11/2026, fuso America/Sao_Paulo.
Branch: `codex/32-3-media-avaliacoes`.
Base inicial: `f5fc6d1`.

## Resultado

Cinco conjuntos aprovados, com divergência zero.
O teste consulta `GET /avaliacoes` com PostgreSQL real.
Confere `resumo.media`, `resumo.total` e as notas retornadas.
Os resultados esperados são literais escritos no próprio teste.
Nenhuma expectativa reutiliza a função produtiva de cálculo.

| Notas | Cálculo manual | resumo.media | resumo.total | Divergência |
|---|---|---:|---:|---:|
| [5] | 5 / 1 = 5 | 5 | 1 | 0 |
| [1,2] | 3 / 2 = 1,5 | 1,5 | 2 | 0 |
| [4,4,5] | 13 / 3 = 4,333… → 4,3 | 4,3 | 3 | 0 |
| [1,2,3,4,5,5] | 20 / 6 = 3,333… → 3,3 | 3,3 | 6 | 0 |
| [4,5,5] | 14 / 3 = 4,666… → 4,7 | 4,7 | 3 | 0 |

Cada conjunto possui um produto diferente no schema temporário.
Todos são inseridos antes das leituras, verificando o isolamento.
Cada comprador avalia uma única vez cada produto.
As notas são persistidas pelo Prisma, sem mocks de repositories.
O helper existente cria e remove o schema isolado.

## Verificações

| Verificação | Resultado | Evidência |
|---|---|---|
| Cinco conjuntos solicitados | 5/5 aprovados | [cinco-conjuntos-final.txt](cinco-conjuntos-final.txt) |
| Avaliações Web.3, Web.4 e catálogo | 59/59 aprovados | [avaliacoes-existentes.txt](avaliacoes-existentes.txt) |
| Lint e typecheck backend | Aprovados | [checks-final.txt](checks-final.txt) |
| Prettier do novo teste | Aprovado | Verificado pelo CLI local |
| Diff sem erros de whitespace | Aprovado | `git -c core.whitespace=cr-at-eol diff --check` |
| Código produtivo preservado | Aprovado | `git diff --exit-code -- backend/src` |

Total desta validação: 64 testes aprovados.
A suíte inteira não foi repetida nesta subtarefa.
Não houve alteração de comportamento produtivo nesta entrega.
O primeiro typecheck apontou inferência insuficiente na fixture.
Foi corrigida com uma lista explicitamente tipada de IDs.
A execução final repetiu os cinco casos após essa correção.

Trata-se de caracterização de um comportamento já implementado.
Os cinco testes passaram com o cálculo existente.
Nenhuma alteração produtiva foi criada para provocar um RED.

## Documentação

Foi acrescentada a nota solicitada na linha da T16.3:

> substituída em 02/11/2026: média calculada na leitura; assíncrono da AV2 atendido pela notificação de pedido; ver CONCURRENCY.md

Destino: `sprints/semana-02-03/02-Historias-de-Usuario.md`.
Esse arquivo permanece ignorado pelo Git, conforme configuração existente.
A alteração está salva no workspace, sem staging forçado.

`docs/matriz-aceitacao-u2.md` recebeu uma nota específica de US16.
A nota registra D5, a substituição e o teste correspondente.
Os totais históricos da matriz não foram recalculados.
`docs/uso-de-ia.md` registra o apoio efetivamente prestado.

## Revisão da alteração

Foram conferidos isolamento, limpeza e ausência de credenciais.
Foram usadas somente contas sintéticas e notas de 1–5.
Não há novos endpoints, permissões ou consultas produtivas.
Nenhum arquivo em `backend/src` foi modificado.
Não foram antecipadas paginação ou outras subtarefas.

Não houve commit, merge ou push nesta subtarefa.

## Reproduzir

Dentro de `backend/`, com o banco de teste configurado:

```powershell
node node_modules/vitest/vitest.mjs run tests/integration/avaliacoes-media.32-3.integration.test.ts --reporter=verbose
node node_modules/vitest/vitest.mjs run tests/integration/avaliacoes.web3.integration.test.ts tests/integration/avaliacoes.web4.integration.test.ts tests/integration/catalogo.routes.integration.test.ts --testTimeout=60000 --hookTimeout=120000
npm run lint
npm run typecheck
```
