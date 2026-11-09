# Relatório final de testes da U2

Projeto Integrador Origem, CESAR School, 2026.2.
Subtarefa 34.3, coleta em 09/11/2026.
Código congelado: `63eca03b3fd3cdda265b68cf958951cb9f7325b6`.
Horários de Brasília.

## 1. Resumo executivo

As seis suítes concluíram com código zero no mesmo hash.
Foram 2.003 aprovações de casos e três rodadas concorrentes.
Houve dois casos pulados, explicitados no resumo.
A árvore permaneceu limpa durante todas as execuções.
Não houve alteração de código, testes, manifests ou locks.

A referência local da entrega é a tag anotada `v1.0.0`.
O commit documental preserva o código executável da base testada.
CI remoto e produção dependem dos portões posteriores.

## 2. Plano e estratégia

| Nível        | Ferramentas                                    | Verificação                                                  |
| ------------ | ---------------------------------------------- | ------------------------------------------------------------ |
| Unitário     | Vitest, V8 e Testing Library                   | Regras, contratos, hooks e componentes                       |
| Integração   | Vitest, Supertest, Prisma e PostgreSQL real    | Persistência, autenticação, permissões e HTTP entre serviços |
| Integridade  | Script existente e PostgreSQL real             | Constraints, FKs com índices e views contratuais             |
| E2E          | Playwright, Next.js, API e microsserviço reais | Fluxos responsivos, pedidos, indicadores e avaliações        |
| Concorrência | Script HTTP e conferência SQL                  | Três disputas de 50 compradores por estoque unitário         |

Foi preservada a estrutura do relatório de 27/10/2026.
Cada suíte teve hash e árvore conferidos antes e depois.
Os registros foram gravados inicialmente fora do repositório.
Não foram usados mocks de banco ou repositories.

## 3. Resultados da execução congelada

A [tabela completa e seus logs](../evidencias/PI4-34-W14-Aceite-Final/34.3-relatorio-final/00-resumo.md)
registra contagens, duração, horário, hash e cobertura.

| Suíte                  | Passou | Falhou | Pulado | Linhas            | Branches          |
| ---------------------- | -----: | -----: | -----: | ----------------- | ----------------- |
| backend-coverage       |    837 |      0 |      1 | 77,03%            | 73,15%            |
| microsservico-coverage |    116 |      0 |      0 | 83,91%            | 75,26%            |
| frontend-coverage      |   1031 |      0 |      0 | 81,11%            | 89,97%            |
| integridade            |     12 |      0 |      0 | Não instrumentada | Não instrumentada |
| e2e                    |      7 |      0 |      1 | Não instrumentada | Não instrumentada |
| concorrencia           |      3 |      0 |      0 | Não instrumentada | Não instrumentada |

O backend pula o benchmark HTTP opt-in de indicadores.
O E2E pula a duplicação administrativa do projeto 360px.
Esse teste administrativo percorre três larguras internamente.
Nenhum teste foi retirado para obter aprovação.

As contagens somam execuções, sem deduplicar suítes sobrepostas.
Concorrência conta rodadas, separadamente dos casos Vitest e Playwright.
Não instrumentada indica ausência de coleta própria de cobertura.

## 4. Integridade, E2E e concorrência

Integridade: 12 casos aprovados, incluindo FKs com índices.
E2E: sete aprovações, uma duplicação pulada, nenhum flaky.
O microsserviço recebeu 22 chamadas reais; a limpeza foi confirmada.

| Rodada | Compradores | HTTP 201 | HTTP 409 | Estoque final | Pedidos | Pagamentos | Inesperadas |
| ------ | ----------: | -------: | -------: | ------------: | ------: | ---------: | ----------: |
| 1      |          50 |        1 |       49 |             0 |       1 |          1 |           0 |
| 2      |          50 |        1 |       49 |             0 |       1 |          1 |           0 |
| 3      |          50 |        1 |       49 |             0 |       1 |          1 |           0 |

A conferência PostgreSQL ocorreu antes da limpeza dos dados sintéticos.
As três rodadas preservaram um único vencedor por disputa.

## 5. CI, deploy e aceite de produção

O último CI consultado falhou em outro hash, `c9d0eb2`.
O teste CLI de métricas do microsserviço excedeu 30 segundos.
Frontend passou e backend foi cancelado nessa execução.
Registro: [issue aberta](https://github.com/devpedrois/Projeto-Integrador/issues/2).

Os testes locais não substituem CI verde na tag.
Os três serviços estavam em `main`, no commit `c9d0eb2`.
Nenhuma variável dos painéis foi alterada nesta coleta.

A publicação de `main` e `v1.0.0` exige autorização.
Depois, serão conferidos CI, deploys e smoke em produção.
O smoke usará dados sintéticos e registrará o pedido criado.
Seu resultado ficará em `07-smoke-producao.md`, após a tag.
Esse arquivo entrará no próximo commit documental.

## 6. Limites e evidências

As coberturas usam os padrões das versões Vitest instaladas.
Não foram acrescentados filtros de instrumentação.
Os tempos são de execução de testes, sem constituir benchmark.

A matriz vigente registra 39 aceites.
US08.C3 permanece identificado como aceite declarado pelo responsável.
Não foi reconstruída sua evidência visual excluída.

- [Resumo final e fontes](../evidencias/PI4-34-W14-Aceite-Final/34.3-relatorio-final/00-resumo.md).
- [Resultados estruturados](../evidencias/PI4-34-W14-Aceite-Final/34.3-relatorio-final/02-resultados.json).
- [Matriz de aceitação](matriz-aceitacao-u2.md).
- [Refatorações justificadas](refatoracoes-u2.md).

Não houve nova feature, alteração de contrato ou revisão humana presumida.
A revisão documental local conferiu escopo, evidências e credenciais.
