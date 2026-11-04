# PI4-33.2: índice da técnica principal

Data: 04/11/2026.
Branch mantida: `codex/33-1-fk-com-indice`.
Commit anterior, criado pelo responsável: `b1f1e1d`.
Nenhum commit ou push foi realizado nesta subtarefa.

## Alteração aplicada

Migration: `20261104165644_indice_perfil_tecnica_principal`.

```sql
CREATE INDEX "PerfilArtesao_tecnicaPrincipalId_idx"
ON "PerfilArtesao"("tecnicaPrincipalId");
```

O schema Prisma recebeu `@@index([tecnicaPrincipalId])`.
Também foram atualizados o relatório de índices e o modelo físico.
O DDL consolidado recebeu exatamente o mesmo índice.
Nenhuma migration anterior foi modificada.
O modo estrito do teste 33.1 permanece desativado.

## RED e aplicação

O status inicial confirmou onze migrations aplicadas.
O teste 33.1 falhou somente para `PerfilArtesao.tecnicaPrincipalId`.
Os outros dez testes de integridade passaram.

Comando de geração executado em `backend/`:

```powershell
npx.cmd prisma migrate dev --name indice_perfil_tecnica_principal --create-only
```

O rascunho gerado continha também operações alheias ao escopo.
Incluía recriação dos GIN e alteração do DEFAULT de `Pedido.numero`.
Foi preservado em `migration-gerada-antes-da-revisao.sql` para rastreabilidade.
Essas operações foram removidas da migration nova antes da aplicação.
O SQL final contém somente o `CREATE INDEX` solicitado.

A revisão automática bloqueou inicialmente a tentativa de aplicação.
Apontou as operações alheias, que já haviam sido removidas.
Uma nova leitura comprovou o conteúdo final do arquivo.
O status confirmou somente essa migration pendente.
A aplicação autorizada seguinte utilizou `npx.cmd prisma migrate deploy`.
Esse comando aplicou somente a migration revisada, sem gerar outras.

O status final confirmou doze migrations, sem pendências.
O checksum aplicado coincide exatamente com o arquivo local.
O cliente psql confirmou o índice com `\d "PerfilArtesao"`.
Foi executado pela imagem oficial `postgres:18-alpine` em container temporário.
Credenciais foram transmitidas exclusivamente por variáveis de ambiente.

Arquivos de comprovação:

- [Status inicial](migrate-status-antes.txt).
- [RED anterior à alteração](red-antes.txt).
- [Geração da migration](migrate-create.txt).
- [Migration pendente após a revisão](migrate-status-pendente.txt).
- [Aplicação do SQL revisado](migrate-deploy.txt).
- [Status após aplicação](migrate-status-depois.txt).
- [Checksum conferido](migration-aplicada.json).
- [Saída real do psql](psql-perfil-artesao.txt).

## Verificações concluídas

- `npm.cmd run test:integridade`: onze testes passaram.
- `npm.cmd run lint`: código de saída zero.
- `npm.cmd run typecheck`: código de saída zero.
- `npx.cmd prisma format`: schema formatado.
- Revisão equivalente de segurança: sem achados na alteração.

Logs: [integridade](green-integridade.txt), [lint](lint.txt)
e [typecheck](typecheck.txt).
Revisão: [revisao-equivalente.md](revisao-equivalente.md).

## Diagnóstico da conexão da suíte completa

O `.env` local usa uma conexão de API sem permissão CREATE.
Alguns testes exigem criar e remover schemas isolados.
A primeira execução completa passou 731 testes e falhou doze.
Outros 21 testes não executaram após falhas nos hooks.
Oito arquivos apresentaram falhas relacionadas às permissões:

- `worker-process.integration.test.ts`: dois casos, inicialização da API.
- `notificacao-auto-publish.integration.test.ts`: inicialização da API.
- `bench-fila.integration.test.ts`: remoção do schema de outra conexão.
- `tecnica-regiao-migration.integration.test.ts`: sete casos, CREATE SCHEMA.
- `notificacao-migration.integration.test.ts`: CREATE SCHEMA.
- `ddl-fisico.integration.test.ts`: hook de criação do schema.
- `indices-consultas.integration.test.ts`: hook de criação do schema.
- `fila-notificacao.integration.test.ts`: hook de criação da fila.

A porta 3114 estava disponível durante o diagnóstico.
`has_database_privilege` confirmou CREATE ausente na conexão habitual.
Confirmou também CREATE presente na conexão `DIRECT_URL` de desenvolvimento.
Os dois testes de worker passaram com essa conexão no processo.
Nenhum privilégio foi concedido e nenhum `.env` foi alterado.

Para a nova execução, o processo recebeu `DATABASE_URL = DIRECT_URL`.
O comando permaneceu `npm.cmd test`, sem exclusões.
O banco continuou PostgreSQL real, com os helpers existentes.

Logs: [primeira execução](testes-backend.txt),
[reprodução isolada](diagnostico-worker.txt)
e [worker com conexão de testes](worker-conexao-teste.txt).

## Resultado final da suíte completa

`npm.cmd test` passou os 764 testes, em 75 arquivos.
Nenhum teste foi excluído ou pulado nessa execução.
Código de saída: zero. Duração: 561,73 segundos.
Somente o ambiente do processo recebeu `DATABASE_URL = DIRECT_URL`.
Log integral: [testes-backend-conexao-teste.txt](testes-backend-conexao-teste.txt).

## Conferência das consultas

O catálogo filtra a técnica da peça por `Produto.tecnicaId`.
O perfil público consulta `Usuario.id` e sua especialização por `usuarioId`.
Essas consultas não foram modificadas.
O índice novo cobre a FK e filtros pela técnica principal.
Não foi afirmado ganho de desempenho sem medição.
