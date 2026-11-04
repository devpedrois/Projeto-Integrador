# BD-07: evidências de integridade

Branch Git: `codex/bd-07-integridade`.
Banco real: PostgreSQL 18.6, branch Neon de teste confirmada.

Execute dentro de `backend/`:

```powershell
npm.cmd run test:integridade
```

Resultado: nove testes passaram, com rollback por caso.
Preço possui casos separados para zero e negativo.
As duas exclusões RESTRICT retornam `23001`, conforme autorização.
As demais violações retornam `23514` ou `23505`.
Todas as asserções também verificam a constraint específica.

| Evidência | Resultado |
| --- | --- |
| `01-red-constraints-ausentes.log` | Nove falhas esperadas contra DDL sem as constraints |
| `02-green.log` | Nove casos verdes contra as constraints existentes |
| `03-estado-neon.json` | Contagens e sequence idênticas; zero resíduos BD-07 |
| `04-backend-completo.log` | 548 testes verdes em 54 arquivos |
| `05-revisao-seguranca.md` | Revisão local equivalente, sem achados bloqueantes |
| `06-checks.log` | Lint, typecheck, formatação e whitespace |

O RED ocorreu em schemas temporários, dentro das transações.
Rollback também removeu esses schemas e seus dados.
Nenhuma constraint existente foi removida ou alterada.

A comparação independente cobriu nove tabelas e a sequence.
Os hooks verificam os IDs criados após cada rollback.
Essas verificações também passaram durante a contraprova vermelha.

Não houve commit nem push.
