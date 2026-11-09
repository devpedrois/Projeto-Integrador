# 34.3: resumo da execução final congelada

Hash executado: `63eca03b3fd3cdda265b68cf958951cb9f7325b6`.
Coleta em 09/11/2026, com horários de Brasília.
Branch durante todas as suítes: `main`.
Árvore limpa conferida antes e depois de cada suíte.
Os registros permaneceram no temporário durante toda a execução.

| Suíte                  | Passou | Falhou | Pulado | Duração, s | Linhas            | Branches          | Início em Brasília  | Hash      | Evidência                                                                                     |
| ---------------------- | -----: | -----: | -----: | ---------: | ----------------- | ----------------- | ------------------- | --------- | --------------------------------------------------------------------------------------------- |
| backend-coverage       |    837 |      0 |      1 |    691,653 | 77,03%            | 73,15%            | 09/11/2026 14:34:44 | `63eca03` | [metadados](backend-coverage/execucao.json), [log](backend-coverage/terminal.txt)             |
| microsservico-coverage |    116 |      0 |      0 |    177,187 | 83,91%            | 75,26%            | 09/11/2026 14:46:16 | `63eca03` | [metadados](microsservico-coverage/execucao.json), [log](microsservico-coverage/terminal.txt) |
| frontend-coverage      |   1031 |      0 |      0 |     38,436 | 81,11%            | 89,97%            | 09/11/2026 14:49:13 | `63eca03` | [metadados](frontend-coverage/execucao.json), [log](frontend-coverage/terminal.txt)           |
| integridade            |     12 |      0 |      0 |      9,428 | Não instrumentada | Não instrumentada | 09/11/2026 14:49:52 | `63eca03` | [metadados](integridade/execucao.json), [log](integridade/terminal.txt)                       |
| e2e                    |      7 |      0 |      1 |    104,137 | Não instrumentada | Não instrumentada | 09/11/2026 14:50:01 | `63eca03` | [metadados](e2e/execucao.json), [log](e2e/terminal.txt)                                       |
| concorrencia           |      3 |      0 |      0 |     15,455 | Não instrumentada | Não instrumentada | 09/11/2026 14:51:46 | `63eca03` | [metadados](concorrencia/execucao.json), [log](concorrencia/terminal.txt)                     |

Vitest e Playwright contam casos; concorrência conta rodadas.
A duração inclui subprocesso, cobertura, limpeza e conferência Git final.
As seis suítes encerraram com código zero.
São 2.003 aprovações de casos, além das três rodadas.
As contagens representam execuções, sem deduplicar casos entre suítes.
Não houve casos flaky no E2E.

## Casos pulados

- Backend: um benchmark opcional dos indicadores HTTP.
  Sua execução depende do opt-in `EVIDENCIA_INDICADORES`.
- E2E: duplicação administrativa do projeto 360px.
  O próprio teste percorre 360px, 768px e 1280px.
  Essa medição executa somente no projeto 1280px.

Os dois casos pulados não foram contados como aprovados.
Nenhum teste foi removido ou desabilitado nesta subtarefa.

## Cobertura e fontes

- Backend: [resumo JSON](backend-coverage/coverage-summary.json) e [casos](backend-coverage/vitest.json).
- Microsserviço: [resumo JSON](microsservico-coverage/coverage-summary.json) e [casos](microsservico-coverage/vitest.json).
- Frontend: [resumo JSON](frontend-coverage/coverage-summary.json) e [casos](frontend-coverage/vitest.json).

O escopo usa os padrões das respectivas versões Vitest.
Não foram acrescentados filtros para elevar os percentuais.
Integridade, E2E e concorrência não tiveram instrumentação própria.
Isso não representa cobertura zero dessas execuções.

## Integridade, E2E e concorrência

A integridade aprovou 12 casos com PostgreSQL real.
Inclui `fk-com-indice.integridade.test.ts`.
Confere modelo físico, comprador do pedido e views contratuais.
[Casos executados](integridade/vitest.json).

O E2E aprovou sete casos, com uma duplicação pulada.
O microsserviço recebeu 22 chamadas reais durante essa execução.
[Chamadas HTTP verificadas](e2e/chamadas-microsservico.json).
A limpeza confirmou a remoção do schema temporário.
[Execução E2E](e2e/execucao.json).

Em cada rodada, 50 compradores disputaram estoque unitário.
Foram um HTTP 201 e 49 respostas 409.
Estoque final zero; um pedido e um pagamento.
Não houve resposta inesperada nas três rodadas.
[Estado consultado](concorrencia/rodadas.json).

## CI e serviços antes da liberação

O último CI consultado executou outro hash, `c9d0eb2`.
[Run 42447756271](https://github.com/devpedrois/Projeto-Integrador/actions/runs/42447756271).
Frontend aprovado; microsserviço falhou; backend foi cancelado.
A falha foi timeout de 30 segundos na CLI de métricas.
O microsserviço local atual aprovou seus 116 casos.
Isso não substitui CI remoto verde no commit da tag.
[Issue aberta](https://github.com/devpedrois/Projeto-Integrador/issues/2), [metadados](ci-ultima.json) e [log](ci-ultima-falhas.txt).

Os três serviços publicados apontavam para `main`, em `c9d0eb2`.
Frontend Ready na Vercel; API e recomendação Live no Render.
A inspeção ocorreu antes da primeira suíte.
Nenhuma variável ou configuração de serviço foi alterada.
[Dados conferidos nos painéis](paineis-antes.json).

- [Vercel](vercel-antes.png).
- [API Render](render-api-antes.png).
- [Recomendação Render](render-recomendacao-antes.png).

## Referência de entrega e portões posteriores

A referência local da entrega é a tag anotada `v1.0.0`.
O commit do relatório acrescenta somente documentação e evidências.
Seu código executável preserva o hash testado acima.
O commit documental pode ser resolvido pela própria tag.

Push de `main` e da tag depende de autorização explícita.
Depois, faltam CI verde, três deploys e smoke em produção.
Nenhuma aprovação de produção é presumida pelos testes locais.
O smoke e os commits publicados serão registrados após a tag.
Esse registro pertencerá ao próximo commit documental, sem mover a tag.

## Ambiente, método e revisão

[Congelamento e versões](01-congelamento.json), [precondições](00-precondicoes.json)
e [resultados estruturados](02-resultados.json).
Os argumentos completos constam nos metadados de cada suíte.
O backend utilizou os limites de tempo do CI.
Microsserviço e frontend preservaram seus limites existentes.

Os providers V8 correspondem às versões Vitest instaladas.
O provider ausente do microsserviço foi preparado no temporário.
Manifests e locks permaneceram inalterados.
Não foram utilizados mocks de banco ou de repositories.

A revisão documental local conferiu contagens, hashes e credenciais.
Não houve implementação de feature nem delegação de agentes.
Logs, JSON e capturas foram sanitizados sem alterar resultados.
[Registro de sanitização](06-sanitizacao.json).
[Conferência dos resultados e links](05-validacao-relatorio.json).
