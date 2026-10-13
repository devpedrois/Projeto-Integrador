# BD-03 — validacao em 13/10/2026

Branch: `codex/bd-03-tecnica-regiao`. Sem commit ou push.

## Resultado no PostgreSQL real

A migration `20261013230000_tecnica_regiao_referencias` foi aplicada com
`npx.cmd prisma migrate deploy`, apos autorizacao explicita do responsavel
para alterar o Neon de desenvolvimento. As cinco migrations anteriores
foram preservadas. O comando concluiu com codigo zero.

Antes: nove produtos e dois perfis, com tecnica e regiao em texto no perfil.
Depois: nove produtos com tecnica e regiao resolvidas por join; dois perfis
com `tecnicaPrincipalId` e `regiaoId` preenchidos. Dez tecnicas e tres regioes
possuem IDs e nomes identicos aos seeds frontais. Produto exige tecnica,
sem default. Perfil permite campos nulos para cadastro incompleto.

Consulta reproduzivel: `bd03-tecnica-regiao.sql`.
Resultado da consulta: `bd03-tecnica-regiao.resultado.json`.
Os mapeamentos sinteticos autorizados constam em `DATA_MODEL.md`.
Renda File e PET receberam aproximacoes documentadas, sem alegar
equivalencia entre tecnicas reais.

## TDD e verificacoes

| Verificacao | Comando em backend/ | Resultado |
|---|---|---|
| Vermelho inicial de integridade | `npx.cmd vitest run tests/integration/tecnica-regiao.integration.test.ts` | 11 falhas por tabelas, colunas e constraints ainda ausentes |
| Vermelho inicial de migration | `npx.cmd vitest run tests/integration/tecnica-regiao-migration.integration.test.ts` | 7 falhas por migration ainda ausente |
| Suíte completa final | `npm.cmd test` | 23 arquivos; 148 testes passaram |
| Verificacao focal apos ajustes finais | `npx.cmd vitest run tests/integration/tecnica-regiao.integration.test.ts tests/integration/tecnica-regiao-migration.integration.test.ts` | 18 testes passaram |
| Lint | `npm.cmd run lint` | Codigo zero |
| Typecheck | `npm.cmd run typecheck` | Codigo zero |
| Formatacao Prisma | `npx.cmd prisma format` | Schema formatado |
| Validacao Prisma | `npx.cmd prisma validate` | Schema valido |
| Client Prisma | `npx.cmd prisma generate` | Client regenerado |
| Alinhamento banco/schema | `npx.cmd prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --exit-code` | Sem diferencas; codigo zero |
| Espacos e quebras Windows | `git -c core.whitespace=cr-at-eol diff --check` | Codigo zero |

Testes de banco utilizaram PostgreSQL real. Os testes de migration
reexecutam o historico anterior em schemas isolados dentro de transacoes.
Rollback remove os dados sinteticos e os schemas desses testes.

Os testes cobrem normalizacao de caixa, acentos e espacos, aliases
autorizados, campos nulos, preservacao dos nove produtos, nomes unicos,
tecnica obrigatoria, FKs invalidas, exclusao restrita, valores desconhecidos
e rollback antes de remover textos. O Neon devolveu SQLSTATE `23001` para
exclusoes restritas; insercao de FK inexistente devolveu `23503`.

Os testes da Strategy por categoria, fallback, reforco regional, endpoint
e metricas passaram na suíte completa. A fixture JSON compartilhada e o
ranking esperado nao foram alterados. Apenas a persistencia das fixtures
passou a fornecer `tecnicaId` e `regiaoId` validos.

## Verificacao adicional do frontend

`npm.cmd run typecheck` passou. `npm.cmd test` passou com 68 arquivos e
669 testes. A primeira tentativa de testes sofreu `EPERM` no sandbox;
a repeticao autorizada fora do sandbox passou.

`npm.cmd run lint` falhou exclusivamente em `frontend/next-env.d.ts:3`,
por `@typescript-eslint/triple-slash-reference` na referencia gerada de
`.next/types/routes.d.ts`. Nenhum arquivo frontal foi alterado nesta
subtarefa. O erro preexistente fica registrado, sem declarar lint frontal
limpo. O driver PostgreSQL tambem emitiu aviso existente sobre modos SSL;
nao foram alteradas credenciais ou configuracoes de conexao.

## Revisao de seguranca local

O responsavel escolheu revisao local, dispensando delegacao ao agente
`security-auditor`. Revisao realizada sobre schema, SQL, seeds, repository,
fixtures, evidencias e diff. Nenhum achado de seguranca no escopo alterado.

- Migration atomica com `BEGIN`/`COMMIT` e bloqueio das tabelas durante a
  conversao, impedindo escrita concorrente entre preflight e backfill.
- Valores desconhecidos abortam e sao listados. Textos so sao removidos
  depois de verificar o preenchimento dos IDs e instalar as FKs.
- `RESTRICT` protege as tres novas relacoes. Nenhuma exclusao em cascata
  foi adicionada. Os checks monetarios e o historico existente permaneceram.
- SQL de recomendacao segue parametrizado por tagged template Prisma.
  Identificadores interpolados nos testes sao constantes internas ou
  schemas derivados de UUID gerado localmente, sem input externo.
- Evidencias incluem apenas IDs e nomes da carga sintetica. Nao contêm
  senhas, hashes, valores de ambiente, URLs de conexao ou tokens.
- Escolhas por ID de produto sao limitadas aos nove registros legados.
  Produtos desconhecidos abortam; nao ha regra generica de classificacao.
- Indices de consultas, autenticacao e endpoints novos permanecem fora da
  BD-03. Os documentos auxiliares atualizados sao ignorados pelo Git atual;
  seus arquivos locais foram preservados e nenhum staging foi realizado.
