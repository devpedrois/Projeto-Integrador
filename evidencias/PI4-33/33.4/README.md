# PI4-33.4: limpeza da identidade legada de pedidos

Data: 05/11/2026.
Branch: `codex/33-4-remover-referencia-legada`.

## Origem e inspecao

A coluna sintetica nasceu na migration `20260914000000_init_fccpd`.
Commit de origem: `8852968`, estrutura minima de demonstracao FCCPD.
Ela identificava compradores antes da existencia de `Usuario`.
A migration `20260915154901_add_dominio_completo` introduziu a FK real.
A migration `20260915163805_add_dominio_not_null` tornou essa FK obrigatoria.
A reconciliacao BD-02 tornou a referencia sintetica opcional.
O contrato HTTP atual identifica compradores pela sessao autenticada.

A busca anterior encontrou usos somente em fixtures e testes.
Tambem encontrou schema, DDL e documentacao legados.
Nao encontrou consumidores de producao, frontend, scripts ou seeds.
As pastas seeds, testes e tests nao existem na raiz.
Os seeds e testes existentes foram pesquisados dentro dos projetos.

## Aplicacao e preservacao

Ambiente: Neon de desenvolvimento, endpoint `ep-solitary-fire-ack2rila`.
Schema: `public`.
Migration: `20261105031508_remover_pedido_comprador_ref`.
Gerada por `prisma migrate diff` entre os schemas anterior e atual.
Aplicada por `npm run db:migrate`, sem alterar migrations anteriores.
Contem uma unica operacao: remover a coluna sintetica.
Nao remove FKs, indices, pedidos, itens ou pagamentos.

O preflight encontrou tres referencias preenchidas em tres pedidos.
Todos os pedidos ja tinham comprador real obrigatorio.
Nenhum backfill foi necessario.
A comparacao dos campos preservados utilizou SHA-256 e contagens.
Os tres pedidos, seis itens e tres pagamentos permaneceram identicos.

- [Preflight](preflight.json).
- [Aplicacao da migration](migration.txt).
- [Postflight e hashes preservados](postflight.json).
- [Estado final apos as suites e checksum aplicado](estado-final.json).

## Escopo e documentacao

O schema Prisma e o DDL consolidado foram atualizados.
Fixtures SQL e Prisma agora utilizam somente `compradorId`.
A autorizacao continua derivando o comprador da sessao validada.
Os testes preservam rejeicao de identidade enviada pelo cliente.
O modelo fisico, DATA_MODEL, API e README foram corrigidos.
`docs/indices-u2.md` nao citava a coluna removida.
Nenhum indice precisou de alteracao.
DATA_MODEL continua sendo um documento local ignorado pelo Git.

Busca executada: `rg -n compradorRef backend frontend services scripts fixtures`.
O resultado inclui apenas as migrations historicas e a nova remocao.
A nova migration precisa nomear a coluna para remove-la.
Os documentos historicos de planejamento e evidencias preservam seu contexto.

- [Busca nas fontes dos projetos](busca.txt).
- [Busca sem migrations: nenhuma ocorrencia](busca-sem-migrations.txt).

## Validacao

O teste novo falhou primeiro contra o PostgreSQL real.
A falha demonstrou a coluna extra no registro persistido.
A suite de integridade passou depois: 4 arquivos, 12 testes.
Inclui o teste das FKs e o novo contrato persistido.
A suite completa do backend passou: 83 arquivos, 847 testes.
A execucao verde utilizou `npm test -- --testTimeout=30000`.
O microsservico passou: 5 arquivos, 58 testes.
Lint e typecheck passaram nos dois projetos.
Prisma generate, validate e format passaram.
A verificacao de whitespace respeitou os arquivos CRLF existentes.

As suites usam PostgreSQL real, sem mocks de banco.
A suite completa do backend utiliza DIRECT_URL como DATABASE_URL.
Essa conexao permite os schemas temporarios exigidos pelos testes.
As duas conexoes apontam para o mesmo desenvolvimento.
As credenciais nao foram registradas nas evidencias.
O driver emite um aviso herdado sobre modos SSL.

- [RED](red.txt).
- [Integridade GREEN](green-integridade.txt).
- [Backend completo, execucao inicial](backend.txt).
- [Backend completo GREEN](backend-green.txt).
- [Microsservico](recomendacao.txt).
- [Lint backend](lint-backend.txt).
- [Typecheck backend](typecheck-backend.txt).
- [Lint do microsservico](lint-recomendacao.txt).
- [Typecheck do microsservico](typecheck-recomendacao.txt).

## Diagnostico do limite de tempo

A primeira suite completa utilizou o limite padrao do Vitest.
Resultado inicial: 846 testes passaram; um atingiu o timeout.
O teste `32.2 oferece 35 avaliacoes idempotentes com compras confirmadas`
excedeu cinco segundos, durante consultas sequenciais ao Neon.
A repeticao isolada com `--testTimeout=30000` passou nos cinco testes.
Nenhuma alteracao de codigo foi necessaria para esse diagnostico.
A repeticao completa com esse limite passou nos 847 testes.
O limite ampliado foi usado somente no comando de validacao.
Resultado: [seed com limite ampliado](seed-timeout-diagnostico.txt).

## Revisao local de seguranca

A revisao do diff nao encontrou vulnerabilidades novas.
A migration remove uma unica coluna, sem CASCADE.
Preserva a FK obrigatoria do comprador e os indices.
As fixtures continuam utilizando parametros SQL para valores.
Os validadores, autorizacao e DTOs de producao permanecem preservados.
O checkout continua rejeitando comprador fornecido no body.
As evidencias foram pesquisadas por URLs PostgreSQL e credenciais.
Nenhuma credencial foi encontrada.

O responsavel escolheu revisao equivalente nesta conversa.
A revisao local nao e apresentada como execucao de agente.
