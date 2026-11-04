# 31.6: relatório de execução de testes

Commit congelado: `58996b984639983e9a9d2d2bc7599bb5495adadd`.
Data da coleta: 26/10/2026, horário de Brasília.
Branch: `codex/31-6-relatorio-testes`.

Todas as suítes abaixo executaram esse mesmo commit.
Os metadados conferem HEAD antes e depois de cada execução.
A árvore rastreada permaneceu limpa durante todas as suítes.
Nenhum teste ou código produtivo foi alterado.

## Resultado por suíte

Passou, falhou e pulado contam casos Vitest/Playwright.
Na concorrência, esses campos contam rodadas de disputa.
Duração representa segundos de parede medidos pelo wrapper.
Inclui subprocesso, cobertura, limpeza e conferência Git final.
Os horários inicio/fim delimitam somente o subprocesso.
Por isso, sua diferença exclui a conferência Git posterior.
Datas da tabela indicam o início em Brasília.

| Suíte             | Passou | Falhou | Pulado | Duração, s | Linhas            | Branches          | Data e hora         | Commit                                     | Saída bruta                           |
| ----------------- | ------ | ------ | ------ | ---------- | ----------------- | ----------------- | ------------------- | ------------------------------------------ | ------------------------------------- |
| backend-coverage  | 755    | 0      | 0      | 449,725    | 81,83%            | 76,78%            | 26/10/2026 13:33:41 | [58996b9](backend-coverage/execucao.json)  | [log](backend-coverage/terminal.txt)  |
| frontend-coverage | 955    | 0      | 0      | 29,935     | 84,27%            | 90,03%            | 26/10/2026 13:33:28 | [58996b9](frontend-coverage/execucao.json) | [log](frontend-coverage/terminal.txt) |
| integridade       | 9      | 0      | 0      | 7,315      | Não instrumentada | Não instrumentada | 26/10/2026 13:41:21 | [58996b9](integridade/execucao.json)       | [log](integridade/terminal.txt)       |
| e2e               | 4      | 0      | 0      | 42,459     | Não instrumentada | Não instrumentada | 26/10/2026 13:38:08 | [58996b9](e2e/execucao.json)               | [log](e2e/terminal.txt)               |
| concorrencia      | 3      | 0      | 0      | 11,754     | Não instrumentada | Não instrumentada | 26/10/2026 13:41:28 | [58996b9](concorrencia/execucao.json)      | [log](concorrencia/terminal.txt)      |

Playwright registrou 0 casos flaky.
Cobertura não instrumentada significa ausência dessa coleta específica.
Não significa cobertura zero, nem resultado de outra execução.

## Cobertura e fontes verificáveis

| Suíte             | Linhas cobertas/total | Branches cobertas/total | Fontes                                                                                                    |
| ----------------- | --------------------- | ----------------------- | --------------------------------------------------------------------------------------------------------- |
| backend-coverage  | 2383/2912             | 1098/1430               | [JSON](backend-coverage/cobertura/coverage-summary.json), [HTML](backend-coverage/cobertura/index.html)   |
| frontend-coverage | 9619/11414            | 2421/2689               | [JSON](frontend-coverage/cobertura/coverage-summary.json), [HTML](frontend-coverage/cobertura/index.html) |

As métricas usam o escopo padrão de cada versão Vitest.
Não foram acrescentados filtros para elevar os percentuais.
Arquivos gerados/importados seguem os padrões de exclusão do Vitest.
As duas versões não possuem necessariamente denominadores equivalentes.

- [Vitest backend JSON](backend-coverage/vitest.json).
- [Vitest frontend JSON](frontend-coverage/vitest.json).
- [Integridade JSON](integridade/vitest.json).
- [E2E HTML](e2e/playwright/cb7fb518f3e246de9f693f8898d92c59/html/index.html).
- [E2E JSON](e2e/playwright/cb7fb518f3e246de9f693f8898d92c59/resultado.json).
- [Limpeza E2E](e2e/playwright/cb7fb518f3e246de9f693f8898d92c59/cleanup.json).
- [Concorrência: rodadas reexecutadas](concorrencia/rodadas.json).
- [Consolidação estruturada](02-resultados.json).

## Comandos e ambiente

Node: `v22.12.0`, Windows.
Backend: Vitest `5.0.0`, provider V8 `5.0.0`.
Frontend: Vitest `2.1.9`, provider V8 `2.1.9`.
Os providers foram instalados em runtimes locais isolados.
Junctions conectam cada provider ao respectivo Vitest congelado.
Manifests e arquivos lock produtivos permaneceram inalterados.
[Hashes e versões](01-congelamento.json).

Comandos executados, nos projetos correspondentes:

```text
vitest run --coverage
npm run test:integridade
npm run test:e2e
npm run test:concorrencia -- --saida <arquivo-novo>
```

Os metadados preservam os argumentos completos realmente utilizados.
Os comandos npm foram executados pelo npm-cli.js instalado.
Vitest recebeu reporters JSON, texto, HTML e json-summary.
A cobertura também seria salva caso testes falhassem.
O backend usou testTimeout=60000 e hookTimeout=120000.
São os limites da CI para PostgreSQL remoto.
Nenhum arquivo de teste foi excluído da suíte completa.
Integridade manteve os limites do seu script existente.

Os testes de banco utilizaram PostgreSQL real.
Os helpers existentes isolaram fixtures, schemas e transações.
E2E utilizou a conexão de volume, separada das conexões padrão.
Seu schema temporário recebeu migrations e seed sintético próprios.
O runner confirmou a remoção desse schema ao terminar.
Não houve upload externo, push, deploy ou novas migrations permanentes.

As coberturas começaram em paralelo na máquina local.
E2E sobrepôs parte da execução backend, noutra branch de dados.
Integridade e concorrência foram executadas após a suíte backend.
Esses tempos documentam testes, sem representar benchmarks isolados.

## Concorrência e integridade

O script da 30.1 foi executado novamente neste hash.
Não foi reutilizado o resultado histórico do commit 10.
Cada rodada iniciou 50 compradores autenticados e estoque unitário.
O JSON conserva pedidos, pagamentos, estoque e respostas por rodada.
O log inclui a conferência SQL antes da limpeza.

Os testes de integridade verificam constraints no PostgreSQL real.
Cada caso usa rollback e verifica ausência dos próprios IDs.
O script atual contém essas verificações, sem mocks de banco.

## Verificações complementares

Lint e typecheck foram executados nos dois projetos.
Todos os quatro comandos terminaram com código zero.
Seus metadados também registram o mesmo hash congelado.

- [Backend lint](backend-lint/terminal.txt).
- [Backend typecheck](backend-typecheck/terminal.txt).
- [Frontend lint](frontend-lint/terminal.txt).
- [Frontend typecheck](frontend-typecheck/terminal.txt).

## Falha do último CI e ticket aberto

Este contexto histórico fica separado da coleta congelada acima.
A última execução CI consultada foi `40239567812`.
Ela executou `8e78cdc4e5f601c1de2aad9eb78d99985fae564e`, outro hash.
O frontend passou; o backend falhou no typecheck.
Os testes backend foram pulados após essa falha.
[Metadados CI](ci-ultima.json), [log original de falha](ci-ultima-falhas.txt).

O erro principal foi TS2307 em `scripts/web6-evidencias.ts:14`.
O script importa Playwright diretamente do node_modules frontend.
O job backend instala somente suas próprias dependências.
Também apareceram dois erros TS7006 derivados nessa execução.
A instalação local possui ambos projetos e passou no typecheck.
Esse resultado local não substitui uma execução CI limpa.

Ticket aberto: [#1](https://github.com/devpedrois/Projeto-Integrador/issues/1).
O estado OPEN foi conferido em [ticket-ci.json](ticket-ci.json).
A correção desse problema permanece fora da subtarefa documental.
Não se afirma CI verde para o hash congelado.

## Rastreabilidade e revisão

[executar.mjs](executar.mjs) guarda comando, horários, hash e código de saída.
Os logs preservam avisos reais e a saída dos processos.
Somente credenciais conhecidas e tokens receberam redação automática.
O JSON backend também teve URLs sintéticas redigidas nos títulos.
Contagens, resultados e tempos permaneceram idênticos.
[Registro da sanitização](07-sanitizacao.json).
Não foram descartadas falhas ou assertions para produzir o resumo.
[validar-relatorio.py](validar-relatorio.py) confronta resumo, JSONs e logs.
A conferência rejeita hashes diferentes ou totais divergentes.
Também confere hashes dos logs e percentuais de cobertura.

Foi realizada revisão documental local, sem delegação.
Conferidos escopo, contagens, fontes, falhas e exposição de credenciais.
Nenhum commit foi criado pela execução desta subtarefa.
