# 30.1: concorrência no checkout integrado

Data: 22/10/2026.
Responsável: Sergio. Revisor: Pedro.
Branch: `codex/30-1-concorrencia-checkout`.

O script existente foi ampliado, mantendo autenticação e três rodadas.
Os testes usam PostgreSQL real, sem mocks de repositories.

## Execução de aceite

Comando executado em `backend/`, usando o padrão de 50 clientes:

```powershell
npm.cmd run test:concorrencia -- --saida ../evidencias/PI4-30-W12-Arquitetura-Distribuida/30.1-concorrencia-checkout/rodadas-50-clientes.json
```

| Rodada | Clientes | HTTP 201 | HTTP 409 | Estoque | Pedidos | Pagamentos | Inesperadas |
|---|---|---|---|---|---|---|---|
| 1 | 50 | 1 | 49 | 0 | 1 | 1 | 0 |
| 2 | 50 | 1 | 49 | 0 | 1 | 1 | 0 |
| 3 | 50 | 1 | 49 | 0 | 1 | 1 | 0 |

Exit code: **0**. Três rodadas aprovadas.
Foram confirmados 50 cadastros e 50 logins distintos.
O log contém SQL parametrizado e resultados consultados no PostgreSQL.
A consulta de pagamentos considera somente pedidos daquele produto.
O schema temporário foi removido ao terminar.
Uma consulta independente confirmou zero schemas residuais desta execução.

O arquivo JSON precisa ser novo e seu diretório existente.
Uma falha de escrita encerra com exit code 1.
A conferência SQL ocorre antes da limpeza do schema temporário.

## Validações

| Verificação | Resultado | Evidência |
|---|---|---|
| Backend completo | 671 testes, 62 arquivos, exit 0 | `testes-backend.log` |
| Regressão final da 30.1 | 27 testes, exit 0 | `testes-30.1.log` |
| Frontend completo | 889 testes, 93 arquivos, exit 0 | `testes-frontend.log` |
| Lint backend | exit 0 | `lint-backend.log` |
| Typecheck backend | exit 0 | `typecheck-backend.log` |
| Lint frontend | exit 0 | `lint-frontend.log` |
| Typecheck frontend | exit 0 | `typecheck-frontend.log` |
| Prettier dos três arquivos TypeScript alterados | exit 0 | `formatacao.log` |
| Diff sem espaços indevidos, reconhecendo CRLF existente | exit 0 | `diff-check.log` |
| TDD e regressões novas | RED observado; GREEN confirmado | `tdd.md` |
| Revisão equivalente nesta conversa | Nenhum achado nas alterações | `revisao-seguranca.md` |

O diff foi conferido com `git -c core.whitespace=cr-at-eol diff --check`.
O script preserva o CRLF já presente no arquivo rastreado.
Os logs registram avisos preexistentes de SSL e depreciação do pg.
O frontend também registrou aviso de `act` em `use-artesaos-ativos`.
Esses avisos não causaram falhas nos testes.

## Arquivos de evidência

- `execucao-50-clientes.log`: execução completa, SQL e exit code.
- `rodadas-50-clientes.json`: números das três rodadas para consolidação posterior.
- `conferencia-independente.log`: conferência do JSON e ausência do schema.
- `tdd.md`: falhas observadas antes da implementação.
- `revisao-seguranca.md`: revisão equivalente autorizada nesta conversa.

O diretório de evidências permanece ignorado pelo Git existente.
`CONCURRENCY.md` e o roteiro FCCPD também permanecem ignorados.
As atualizações desses documentos estão salvas localmente.
O registro `docs/uso-de-ia.md` está entre os arquivos rastreados alterados.
Nenhum commit ou push foi realizado.
