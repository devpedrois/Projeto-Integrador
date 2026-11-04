# BD-06 — evidencias de validacao

Data: 13/10/2026. Branch: `codex/bd-06-notificacao`.
Sem commit, staging ou push nesta execucao.

## Migration

`20261013230100_add_notificacao` foi aplicada no Neon de desenvolvimento
com autorizacao explicita do responsavel. `npx.cmd prisma migrate deploy`
concluiu com codigo zero. As seis migrations anteriores foram preservadas.
`01-migration.sql` e copia identica da migration aplicada.

A migration cria enum `TipoNotificacao('novo_pedido')`, tabela `Notificacao`,
FKs `usuarioId` e `pedidoId`, unicidade em `(usuarioId, pedidoId, tipo)` e
indice da FK `pedidoId`. Campos obrigatorios: UUID de identificacao, UUIDs
das referencias, tipo, `lida` com default `false` e timestamp com timezone
`criadoEm` com default de data atual. As duas FKs usam `ON DELETE RESTRICT`.

O teste de migration reexecutou todas as migrations anteriores e a BD-06
em schema isolado no PostgreSQL real. A tabela nasceu vazia e as duas FKs
foram verificadas. O schema de teste foi descartado por rollback.

`npx.cmd prisma migrate diff --from-config-datasource --to-schema
prisma/schema.prisma --exit-code` retornou `No difference detected`.

## TDD e idempotencia

Primeiro os testes falharam por repository e migration ausentes. Depois,
o teste de repository foi executado antes da aplicacao da tabela e falhou
com `P2021`, comprovando que precisava da estrutura real de banco.

Depois da aplicacao, os seis testes especificos passaram:

- Duas chamadas iguais: primeira retorna `true`, segunda retorna `false`.
  `count` para a chave composta retorna exatamente uma linha.
- A linha criada possui UUID, `lida = false` e data de criacao.
- Reentrega preserva ID, data original e `lida = true` ja gravado.
- Pedidos distintos produzem registros distintos.
- Usuario inexistente e pedido inexistente sao rejeitados com `P2003`.
- A migration aplica apos o historico existente e instala as FKs restritas.

Testes usaram Prisma e PostgreSQL reais, sem mocks. Dados sinteticos foram
revertidos com transacoes. O repository pode receber o delegate Prisma
dentro de uma transacao e usa `createMany({ skipDuplicates: true })`.

## Validacoes finais

| Verificacao em backend/ | Resultado |
|---|---|
| `npx.cmd prisma format` | Schema formatado |
| `npx.cmd prisma generate` | Client regenerado |
| `npx.cmd prisma validate` | Schema valido |
| `npm.cmd run lint` | Codigo zero |
| `npm.cmd run typecheck` | Codigo zero |
| `npx.cmd vitest run --reporter verbose --no-color` | 25 arquivos; 154 testes passaram |
| `git -c core.whitespace=cr-at-eol diff --check` | Codigo zero |

O log real da suíte completa esta em `02-terminal-testes.txt`.
Ele inclui o teste `dois registros iguais resultam em uma linha`.
O driver PostgreSQL emitiu aviso preexistente sobre modos SSL; nenhum
segredo ou configuracao de conexao foi alterado.

## Revisao de seguranca local

Revisao local conforme escolha do responsavel nesta conversa. Nenhum
agente foi delegado. Schema, migration, repository, testes e diff foram
inspecionados. Nenhum achado de seguranca no escopo da BD-06.

- Migration apenas aditiva e atomica, com `BEGIN` e `COMMIT`.
- FKs restritas protegem os registros referenciados, sem cascades novos.
- Unicidade garantida no PostgreSQL, sem janela entre SELECT e INSERT.
- Repository insere somente os tres campos previstos e ignora duplicatas,
  preservando o registro existente. Defaults sao aplicados pelo modelo.
- Tipos estritos e enum limitam os valores da interface interna.
  Nao foi criado novo entry point externo nesta subtarefa.
- Queries de dados seguem parametrizadas pelo Prisma. O schema isolado de
  teste usa identificador derivado de UUID gerado localmente.
- Os logs omitem valores das conexoes e utilizam somente dados sinteticos.

`git diff --exit-code -- backend/src/jobs/notificar-artesao.handler.ts
backend/src/jobs/notificar-artesao.worker.ts` confirmou os dois arquivos
inalterados. A integracao do repository ao handler permanece no commit 23.

`CONCURRENCY.md`, `DATA_MODEL.md` e `docs/uso-de-ia.md` foram atualizados.
Os dois documentos auxiliares e a pasta `evidencias/` sao ignorados pelo
Git atual. Nenhuma alteracao de `.gitignore` ou staging foi realizada.
