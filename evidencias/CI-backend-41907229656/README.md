# Correção do CI backend e configuração do Render

Data: 04/11/2026.
Branch: `codex/fix-backend-ci-startup`.
Execução investigada: [CI 41907229656, backend](https://github.com/devpedrois/Projeto-Integrador/actions/runs/41907229656/job/126845043136).
Commit investigado: `05f39907f2ec75aaf6b195e3c00d8f26f5b4b38f`.

## Causas confirmadas

O GitHub registrou dois arquivos com falha.
O teste de escuta esperava somente `127.0.0.1`.
O consumidor iniciou normalmente e processou uma notificação pendente.
Seu log JSON foi acrescentado à saída esperada.
O teste agora desabilita somente seu consumidor interno.
A integração dedicada continua verificando o consumidor habilitado.

O `beforeAll` do seed fixava um limite de 60 segundos.
Esse valor sobrescrevia `--hookTimeout=120000` passado pelo workflow.
O setup aplica migrations e executa duas cargas idempotentes.
A nova massa inclui 35 avaliações com compras confirmadas.
O limite desse setup passou para 180 segundos.
As verificações de idempotência e integridade foram preservadas.

No Render, o build e as migrations terminaram normalmente.
A validação de runtime recusou duas variáveis ausentes ou inválidas:
`RECOMENDACAO_URL` e `RECOMENDACAO_SERVICE_TOKEN`.
O responsável confirmou que o microsserviço ainda não foi publicado.
Sua publicação e a configuração da API continuam necessárias.
Publicar o serviço não preenche automaticamente as variáveis da API.

## Verificação direcionada

PostgreSQL real, sem mocks de banco ou repositories.

```text
npm.cmd test -- tests/integration/seed.integration.test.ts tests/unit/server.test.ts tests/integration/server-queue-bootstrap.integration.test.ts --testTimeout=60000 --hookTimeout=120000
Test Files  3 passed (3)
Tests       12 passed (12)
Duration    69.72s

npm.cmd run lint
Exit code: 0

npm.cmd run typecheck
Exit code: 0

npm.cmd run build
Exit code: 0
```

Os dois arquivos originais passaram localmente antes da correção.
Essa execução levou 65,12 segundos, evidenciando a margem pequena.
As falhas específicas anteriores estão comprovadas no CI vinculado.

## Verificação ampla com as exclusões do CI

```text
npm.cmd test -- --testTimeout=60000 --hookTimeout=120000 --exclude tests/integration/concorrencia-script.integration.test.ts --exclude tests/integration/db-explain.integration.test.ts --exclude tests/integration/recomendacao-volume.integration.test.ts --exclude tests/integration/seed-volume.integration.test.ts
Test Files  8 failed | 69 passed (77)
Tests       12 failed | 789 passed | 21 skipped (822)
Duration    573.17s
```

A primeira execução usou a conexão local restrita da API.
Ela não possui permissão para criar schemas temporários.
A conexão `DIRECT_URL` possui os privilégios administrativos necessários.
A documentação existente exige essa conexão no processo de testes.
Os testes originais corrigidos passaram também nessa execução ampla.

Arquivos afetados pela diferença de permissões:

- `tests/integration/ddl-fisico.integration.test.ts`;
- `tests/integration/fila-notificacao.integration.test.ts`;
- `tests/integration/indices-consultas.integration.test.ts`;
- `tests/integration/bench-fila.integration.test.ts`;
- `tests/integration/notificacao-auto-publish.integration.test.ts`;
- `tests/integration/notificacao-migration.integration.test.ts`;
- `tests/integration/tecnica-regiao-migration.integration.test.ts`;
- `tests/integration/worker-process.integration.test.ts`.

A repetição usa `DATABASE_URL=DIRECT_URL` somente no subprocesso.
O arquivo `.env` e os privilégios de runtime permanecem intactos.

```text
Repetição dos oito arquivos com conexão administrativa de testes:
Test Files  8 passed (8)
Tests       33 passed (33)
Duration    82.43s
Exit code: 0
```

Cobertura final: 789 casos passaram na primeira execução ampla.
Os 33 restantes passaram na repetição com permissões adequadas.
Os 822 casos foram verificados em duas execuções.
Isso não representa uma execução única integralmente verde.
O CI remoto não foi reexecutado nesta correção local.

Prettier passou nos seis arquivos alterados.
`git diff --check` também passou.

## Revisão equivalente de segurança

Realizada na conversa, conforme escolha explícita do responsável.
Nenhuma alteração em autenticação, autorização ou código produtivo.
A validação obrigatória das variáveis de recomendação permanece ativa.
O consumidor continua habilitado por padrão no runtime da API.
O token de serviço deve diferir do segredo JWT.
A documentação preserva o papel restrito do microsserviço.
Nenhuma credencial foi incorporada aos arquivos alterados.
Nenhum commit, push ou deploy foi executado.

## Operação pendente no Render

Siga [Deploy no Render](../../services/recomendacao/README.md#deploy-no-render).
Prepare permissões e migrations antes de iniciar o serviço.
Valide seu `/health` antes de configurar a API.
Defina a origem HTTPS em `RECOMENDACAO_URL` da API.
Configure o mesmo token exclusivo nos dois serviços.
Depois, reimplante a API e valide as recomendações.
