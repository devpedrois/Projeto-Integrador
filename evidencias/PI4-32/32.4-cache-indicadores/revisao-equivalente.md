# Revisão equivalente da 32.4

Revisão executada nesta conversa, conforme escolha do responsável.
Não houve delegação ao `security-auditor`.
Data: 08/11/2026.

## Identidade e autorização

O controller constrói a chave com a identidade autenticada.
A query estrita rejeita tentativas de informar outro usuário.
Autenticação e autorização executam antes de acessar o cache.
Fontes: [controller](../../../backend/src/controllers/indicadores.controller.ts),
[validator](../../../backend/src/validators/indicadores.validator.ts),
[router](../../../backend/src/routes/indicadores.routes.ts) e
[verificação de papel](../../../backend/src/middlewares/role.middleware.ts).

A autenticação otimizada consulta atividade e papel atuais.
O identificador é parâmetro SQL, após validação do JWT.
O schema pertence à conexão interna e possui allowlist.
O acesso utiliza o mesmo pool e credenciais do Prisma.
Não acrescenta credenciais ou conexão privilegiada alternativa.
Fontes: [repository](../../../backend/src/repositories/usuario.repository.ts),
[fábrica](../../../backend/src/database/prisma/client.ts) e
[service](../../../backend/src/services/auth.service.ts).

A preparação HMAC conserva a verificação em cada requisição.
Mantém algoritmo permitido, validade e schema do payload.
O usuário permanece sujeito à revogação no PostgreSQL.
Nenhuma decisão de autenticação é armazenada no cache.
Fontes: [token](../../../backend/src/utils/token.ts) e
[middleware](../../../backend/src/middlewares/auth.middleware.ts).

## Privacidade e armazenamento

As entradas possuem prefixo próprio e UUID do usuário.
Valores são clonados e o TTL não renova em HIT.
O navegador e intermediários recebem `Cache-Control: no-store`.
Os logs registram rota constante, estado e duração.
Não incluem UUID, cookie, token ou receita nos logs.
Fontes: [cache](../../../backend/src/utils/cache.ts),
[CacheHttp](../../../backend/src/utils/cache-http.ts) e
[logs reais](7b2c5851-791a-4cc2-b413-9ac502442463/http-volume.json).

## Confirmação e concorrência

Os donos vêm dos produtos bloqueados na transação.
O service aguarda a transação antes de invalidar entradas.
IDs internos são retirados do DTO público do pedido.
Um rollback não chega à etapa de invalidação.
A revisão do cache impede repovoamento por cargas anteriores.
Fontes: [repository](../../../backend/src/repositories/pedido.repository.ts),
[service](../../../backend/src/services/pedido.service.ts),
[cache](../../../backend/src/utils/cache.ts) e
[teste de concorrência de carga](../../../backend/tests/unit/cache.test.ts).

## Achado operacional

A leitura direta pode preceder a conexão do adapter Prisma.
Nesse caso, o encerramento não alcançava o pool próprio.
O teste real reproduziu a conexão permanecendo aberta.
Fonte: [red do ciclo de vida](pool-primeira-identidade-red.txt).

A leitura agora conecta o adapter antes do SQL direto.
Isso registra o pool no ciclo de vida do Prisma.
O teste passou após a correção, sem mocks.
Fontes: [repository](../../../backend/src/repositories/usuario.repository.ts),
[teste real](../../../backend/tests/integration/identidade-pool.integration.test.ts) e
[resultado verde](pool-primeira-identidade-verde.txt).

A leitura também passou com a conexão restrita da aplicação.
Foi consultado um UUID sintético ausente, sem expor dados.
Fonte: [verificação real](autenticacao-conexao-restrita.json).

## Resultado da revisão

Não restaram achados de segurança nesta revisão do escopo.
O achado de ciclo de vida foi corrigido antes da entrega.
Os testes finais aprovaram 185 casos em 18 arquivos.
Cobrem revogação, tokens inválidos, isolamento, TTL e invalidação.
Fontes: [reteste final](reteste-final-conexao-testes.txt),
[testes privados](../../../backend/tests/integration/indicadores-cache.integration.test.ts) e
[teste do pool](../../../backend/tests/integration/identidade-pool.integration.test.ts).

## Limites conhecidos

O cache é local, sem invalidação entre réplicas.
Escritas externas podem aparecer somente após expiração.
O HIT não elimina a dependência do banco para autenticar.
O benchmark local não garante latências em produção.
Fonte: [documento do cache](../../../docs/cache-u2.md).

As evidências usam exclusivamente a massa sintética de testes.
Nenhum teste de banco ou repository usa mocks nessa cobertura.
Fontes: [fixture](../../../backend/tests/helpers/indicadores-cache-fixture.ts),
[testes](../../../backend/tests/integration/indicadores-cache.integration.test.ts),
[massa](../../../backend/prisma/seeds/volume.ts) e
[benchmark](../../../backend/tests/integration/indicadores-cache-desempenho.integration.test.ts).
