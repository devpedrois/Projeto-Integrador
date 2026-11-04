# 31.6: resumo da execução congelada

Hash: `58996b984639983e9a9d2d2bc7599bb5495adadd`.
Coleta: 26/10/2026. Horários abaixo em Brasília.
Branch: `codex/31-6-relatorio-testes`.
Todas as suítes executaram esse mesmo hash, sem alterações rastreadas.

| Suíte             | Passou | Falhou | Pulado | Duração, s | Linhas            | Branches          | Data e hora         | Commit                                     | Saída bruta                           |
| ----------------- | ------ | ------ | ------ | ---------- | ----------------- | ----------------- | ------------------- | ------------------------------------------ | ------------------------------------- |
| backend-coverage  | 755    | 0      | 0      | 449,725    | 81,83%            | 76,78%            | 26/10/2026 13:33:41 | [58996b9](backend-coverage/execucao.json)  | [log](backend-coverage/terminal.txt)  |
| frontend-coverage | 955    | 0      | 0      | 29,935     | 84,27%            | 90,03%            | 26/10/2026 13:33:28 | [58996b9](frontend-coverage/execucao.json) | [log](frontend-coverage/terminal.txt) |
| integridade       | 9      | 0      | 0      | 7,315      | Não instrumentada | Não instrumentada | 26/10/2026 13:41:21 | [58996b9](integridade/execucao.json)       | [log](integridade/terminal.txt)       |
| e2e               | 4      | 0      | 0      | 42,459     | Não instrumentada | Não instrumentada | 26/10/2026 13:38:08 | [58996b9](e2e/execucao.json)               | [log](e2e/terminal.txt)               |
| concorrencia      | 3      | 0      | 0      | 11,754     | Não instrumentada | Não instrumentada | 26/10/2026 13:41:28 | [58996b9](concorrencia/execucao.json)      | [log](concorrencia/terminal.txt)      |

Vitest/Playwright contam casos; concorrência conta rodadas.
Duração inclui subprocesso, cobertura, limpeza e conferência Git final.
Não instrumentada significa ausência de coleta específica, sem percentual atribuído.
Playwright registrou 0 casos flaky.

Fontes adicionais:

- Cobertura backend: [JSON](backend-coverage/cobertura/coverage-summary.json), [HTML](backend-coverage/cobertura/index.html).
- Cobertura frontend: [JSON](frontend-coverage/cobertura/coverage-summary.json), [HTML](frontend-coverage/cobertura/index.html).
- E2E: [relatório HTML](e2e/playwright/cb7fb518f3e246de9f693f8898d92c59/html/index.html), [JSON](e2e/playwright/cb7fb518f3e246de9f693f8898d92c59/resultado.json), [limpeza](e2e/playwright/cb7fb518f3e246de9f693f8898d92c59/cleanup.json).
- Concorrência: [três rodadas reexecutadas](concorrencia/rodadas.json).
- [Resultados estruturados](02-resultados.json), [congelamento e versões](01-congelamento.json).

Lint e typecheck também passaram nos dois projetos.
Os providers V8 correspondem exatamente às versões Vitest instaladas.
Manifests e locks produtivos permaneceram preservados.

O último CI consultado falhou em outro hash, `8e78cdc`.
Causa: importação Playwright do frontend pelo typecheck backend.
Também houve dois erros derivados de tipagem nessa execução.
Esse contexto histórico não integra a tabela congelada acima.
Ticket aberto: [#1](https://github.com/devpedrois/Projeto-Integrador/issues/1).
[Metadados CI](ci-ultima.json), [falhas](ci-ultima-falhas.txt), [estado do ticket](ticket-ci.json).

[Método, comandos, limites e revisão](03-metodologia.md).
[Conferência automática do resumo](validar-relatorio.py).
