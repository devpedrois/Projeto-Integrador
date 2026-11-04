# 31.1: prazos de integração na CI

Data: 22/10/2026. Branch: `codex/31-1-ci-timeouts`.

## Evidência de falha

Execução: https://github.com/devpedrois/Projeto-Integrador/actions/runs/39852400761

O frontend terminou aprovado, incluindo testes e build.
O backend passou migrations, lint e typecheck.
A suíte backend levou 935,74 segundos no runner remoto.
A execução local anterior levou 248,38 segundos.

As três falhas foram exclusivamente limites de tempo:

| Local | Limite excedido |
| --- | --- |
| catálogo: moderação e estoque nas leituras | teste de 15s |
| checkout: dez números sequenciais | teste de 20s |
| contrato de recomendações | preparação de 30s |

Resultado remoto: 523 testes aprovados, dois falhos, onze pulados.
Os onze testes foram pulados pela falha de preparação da suíte.
Log sanitizado: `backend-github-run2-failure.log`.

## Correção

O workflow permite 60s por teste e 120s por hook.
O limite total do job backend passou para 30 minutos.
Dois overrides explícitos precisaram acompanhar os novos prazos.
Esses overrides usam o prazo maior somente com CI=true.
Fora da CI, seus limites originais foram preservados.

Nenhum teste ou assertion foi removido.
Nenhum retry foi adicionado.
Os mesmos cinquenta arquivos backend continuam selecionados.
O seed demo, seed de volume e deploy não foram alterados.

## Verificação

- Comparação estrutural TypeScript confirmou callbacks sem alteração lógica.
- Foram comparados nove callbacks de recomendações e dez do checkout.
- Comparação YAML confirmou apenas os três prazos alterados.
- Actionlint, formatação, lint e typecheck backend passaram.
- A suíte completa usa o comando atual extraído do YAML.
- A execução local foi configurada com CI=true e PostgreSQL real.
- Log da suíte: `backend-ci-timeouts-suite.log`.
- Resultado final: 50 arquivos e 536 testes aprovados, exit code 0.
- Duração local: 295,15 segundos, com CI=true.

## Revisão equivalente de segurança

Revisão nesta conversa, sem delegação, conforme escolha do responsável.
Credenciais, máscaras, permissions, cache e exclusões foram preservados.
Nenhuma migration foi aplicada ao demo ou deploy.
Não houve commit, merge ou push dessas alterações pelo assistente.
O workflow verde remoto depende do próximo push do responsável.
