# Microsserviço de recomendação

Node 22 e TypeScript estrito, Express e PostgreSQL via `pg`.
Use Node 22.13 ou superior na linha 22 para ESLint 10.

O serviço seleciona IDs ordenados, sem montar produtos públicos.
A API continua autenticando compradores e projetando seus DTOs.
A API usa `HttpRecomendacaoClient` nas duas rotas públicas.
O cliente valida a seleção, autentica por token e aplica timeout.
`RECOMENDACAO_URL` aceita somente origem HTTP/HTTPS sem credenciais.
`RECOMENDACAO_SERVICE_TOKEN` exige pelo menos 32 caracteres.
`RECOMENDACAO_TIMEOUT_MS` aceita 100–5000 ms, com padrão 800.
Não há retry. Falhas geram `RecomendacaoIndisponivelError` tipado.
O tratamento atual retorna 503 controlado; o fallback pertence à 36.1.

## Dados e ranking

O serviço lê somente duas views pertencentes à API:

| View                      | Colunas, nesta ordem                                                          |
| ------------------------- | ----------------------------------------------------------------------------- |
| `rec_produtos_elegiveis`  | `id`, `categoriaId`, `regiaoId`, `vendas`, `notaMedia`, `elegivel`, `visivel` |
| `rec_compras_confirmadas` | `compradorId`, `produtoId`                                                    |

`elegivel` preserva o filtro atual de categoria: ativo e estoque positivo.
`visivel` acrescenta ausência de moderação e artesão ativo.
Fallback e histórico usam `visivel`, como no backend existente.
A view mantém contextos ocultos para consultar categorias de compras antigas.
Os candidatos continuam filtrados em cada consulta.

`vendas` soma itens de todos os pedidos, exatamente como anteriormente.
Não foi adotado o nome impreciso `vendasConfirmadas`.
Somente a view de histórico filtra pedidos confirmados.
Datas não são expostas, pois nenhuma consulta as utiliza.
Vendas e avaliações são agregadas separadamente, evitando multiplicação.
Desempates usam vendas decrescentes, média decrescente e UUID crescente.
Reforço regional permanece uma opção interna da Strategy.

O schema privado `recomendacao` pertence a `recomendacao_app`.
Ele contém `schema_migrations` e `execucao_lote`.
O runner verifica checksums e serializa migrations com advisory lock.
A operação de lote ainda não está implementada.

## Rotas internas

| Método e rota                  | Query                                           | Resposta                                  |
| ------------------------------ | ----------------------------------------------- | ----------------------------------------- |
| `GET /health`                  | nenhuma                                         | `200 { "status": "ok" }`, ou 503 genérico |
| `GET /recomendacoes`           | `produtoId` UUID opcional; `limite` de 1 a 8    | `{ estrategia, produtoIds }`              |
| `GET /recomendacoes/historico` | `usuarioId` UUID obrigatório; `limite` de 1 a 8 | `{ estrategia, produtoIds }`              |

Limite padrão: oito. Campos desconhecidos recebem 400.
Todas as rotas, exceto health, exigem `X-Service-Token`.
Token ausente ou incorreto recebe `401 { "codigo": "TOKEN_SERVICO_INVALIDO" }`.
A comparação usa hashes SHA-256 de tamanho fixo e `timingSafeEqual`.
O histórico só deve ser chamado pela API após autenticação.
Não envie JWTs de usuários ao microsserviço.

## Configuração de runtime

| Variável                     | Regra ou padrão                                |
| ---------------------------- | ---------------------------------------------- |
| `DATABASE_URL`               | conexão PostgreSQL do papel `recomendacao_app` |
| `API_SCHEMA`                 | `public`                                       |
| `RECOMENDACAO_SCHEMA`        | `recomendacao`, diferente do schema da API     |
| `HOST`                       | `127.0.0.1`                                    |
| `PORT`                       | `3002`                                         |
| `RECOMENDACAO_SERVICE_TOKEN` | segredo aleatório com pelo menos 32 caracteres |
| `NODE_ENV`                   | `development`, `test` ou `production`          |

Schemas aceitam identificadores minúsculos, números e sublinhados.
Configuração inválida encerra o processo sem imprimir valores.
Use `HOST=0.0.0.0` somente quando a infraestrutura exigir.

## Instalação, permissões e migrations

1. Em `backend/`, execute `npm ci` e `npx prisma migrate deploy`.
2. Neste diretório, execute `npm ci`.
3. Em terminal administrativo, execute `npm run bootstrap:permissoes`.
4. Com a conexão `recomendacao_app`, execute `npm run migrate`.
5. Configure somente as variáveis de runtime e execute `npm run dev`.

O bootstrap recebe `BOOTSTRAP_DATABASE_URL` e `RECOMENDACAO_DATABASE_PASSWORD`.
As senhas vêm do ambiente e nunca de arquivos versionados.
Para criar o papel restrito da API, informe também:

```text
API_DATABASE_ROLE=origem_api_app
API_DATABASE_PASSWORD=<segredo aleatório com pelo menos 32 caracteres>
API_QUEUE_SCHEMA=pgboss
```

Troque apenas o usuário e a senha de `DATABASE_URL` da API.
Mantenha `DIRECT_URL` administrativo exclusivamente para migrations e testes.
O runtime da API recebe DML nas tabelas do seu schema.
Ele também recebe uso das sequências, sem privilégios administrativos.
O schema da fila pode ser criado com esse proprietário.
Schemas de fila existentes com outro dono exigem autorização explícita.
Use também `TRANSFERIR_FILA=true` somente após revisar essa transferência.
O bootstrap transfere os objetos preservando dados e índices.
Ele aceita somente o administrador atual como proprietário anterior.
Sem essa opção, a transferência é recusada.
Não conceda ao runtime associação a `neon_superuser`.

Papéis administrativos continuam capazes de administrar objetos.
Por isso `neondb_owner` não serve como papel de runtime.
Papéis existentes com privilégios elevados são recusados pelo bootstrap.
Privilégios herdados via PUBLIC nas tabelas também causam falha.
O bootstrap não revoga privilégios globais de outros usuários.

Opcionalmente, `RECOMENDACAO_DATABASE_ROLE` altera o nome do papel criado.
Isso permite papéis exclusivos para testes e jobs concorrentes.
`API_SCHEMA` e `RECOMENDACAO_SCHEMA` também são configuráveis no bootstrap.
O SQL equivalente para `psql` está em `sql/bootstrap-permissoes.sql`.

## Deploy no Render

Prepare o Neon antes de publicar o serviço.
Use a mesma branch de produção utilizada pela API.
A ordem executada foi:

1. Confirmar as migrations do backend, aplicadas por `start:prod`.
   As views `rec_produtos_elegiveis` e `rec_compras_confirmadas` devem existir.
2. Executar `npm run bootstrap:permissoes` nesta pasta.
   Use `BOOTSTRAP_DATABASE_URL` administrativa, direta, sem pooler.
   Passe `RECOMENDACAO_DATABASE_PASSWORD` pelo ambiente da sessão.
   Gere a senha com `crypto.randomBytes(32)`, sem imprimi-la.
   Não grave credenciais em arquivos ou históricos de comandos.
3. Executar `npm run migrate` nesta pasta.
   Use `DATABASE_URL` do papel `recomendacao_app`.
4. Verificar permissões usando conexões reais dos dois papéis.
   O microsserviço lê as duas views, mas não tabelas da API.
   A API não lê o schema privado `recomendacao`.
   Uma escrita nesse schema deve funcionar como `recomendacao_app`.
   Faça a escrita de verificação em transação com rollback.

A conexão de runtime da API usa `origem_api_app`.
Essa troca de `DATABASE_URL` recebeu autorização explícita.
Um papel administrativo na API impediria o isolamento exigido.
Não copie a conexão administrativa para o microsserviço.
Preserve os bytes das migrations já aplicadas.
No Windows, conversões CRLF podem alterar o checksum.
Use o conteúdo LF versionado, sem editar o histórico do banco.

Crie um Web Service no Render com estas configurações:

| Campo | Configuração |
| --- | --- |
| Repositório e branch | Os mesmos da API, branch `main` |
| Plano | Free |
| Runtime | Docker |
| Root Directory | `services/recomendacao` |
| Dockerfile Path | `Dockerfile`, relativo à raiz configurada |
| Docker Build Context | `.` |
| Docker Command | Vazio, utiliza `npm start` do Dockerfile |
| Health Check Path | `/health` |

As migrations foram executadas antes do deploy Docker.
Não dependa de Shell ou jobs avulsos no plano Free.
Configure somente estas variáveis no microsserviço:

| Variável | Origem ou valor |
| --- | --- |
| `DATABASE_URL` | Conexão pooled de `recomendacao_app` |
| `API_SCHEMA` | `public` |
| `RECOMENDACAO_SCHEMA` | `recomendacao` |
| `HOST` | `0.0.0.0` |
| `NODE_ENV` | `production` |
| `RECOMENDACAO_SERVICE_TOKEN` | Segredo novo gerado com `crypto.randomBytes(32)` |

Mantenha senha e token somente no ambiente e painel.
Não imprima segredos nem reutilize o `JWT_SECRET`.
Use o mesmo token exclusivamente na API e neste serviço.
O Render fornece `PORT`; o servidor respeita esse valor.
`/health` é público e verifica a conexão PostgreSQL.
As rotas de recomendação exigem `X-Service-Token`.

Aguarde o deploy ficar Live e `/health` responder 200.
Depois, configure as três variáveis de integração na API:

- `RECOMENDACAO_URL`: origem HTTPS do serviço, sem barra final.
- `RECOMENDACAO_SERVICE_TOKEN`: o mesmo segredo do microsserviço.
- `RECOMENDACAO_TIMEOUT_MS=800`.

Reimplante a API usando um commit remoto da `main`.
Valide `/health` e a rota protegida sem token, respectivamente 200 e 401.
Na vitrine publicada, `/api/recomendacoes` deve responder 200.
Confirme `categoria` ou `fallback-geral` e o carrossel preenchido.
Se houver `fallback-local`, investigue URL, token e cold start.

O plano Free oferece 750 horas mensais por workspace.
Essas horas são compartilhadas entre os serviços Free.
Após inatividade, cada serviço pode levar aproximadamente um minuto para acordar.
Acorde API e microsserviço antes das demonstrações.
Depois, confirme recomendações vindas do módulo.
Consulte [limites Free](https://render.com/docs/free) e
[configuração de monorepos](https://render.com/docs/monorepo-support).

## Testes e build

```sh
npm run lint
npm run typecheck
npm test
npm run build
npm start
```

Os testes usam `BOOTSTRAP_DATABASE_URL`, ou `DIRECT_URL` local.
O helper carrega o arquivo ignorado `backend/.env` quando disponível.
Cada execução cria schemas e papéis com nomes aleatórios.
Aplica todas as migrations backend, bootstrap e migrations privadas.
As verificações usam conexões reais dos dois papéis restritos.
O ranking usa a massa da fixture já existente.
As integrações da API comparam IDs e ordem por HTTP real.
O ranking e o reforço regional permanecem cobertos neste serviço.
O backend precisa das dependências e do Prisma Client gerado.
Os objetos temporários são removidos ao finalizar.

A suíte completa do backend também provisiona schemas temporários.
Execute-a com uma conexão administrativa exclusiva do processo de testes.
Não substitua a conexão restrita persistida no runtime da API.

O job `recomendacao` usa a branch Neon de CI existente.
Reutiliza `DIRECT_URL_TEST` e `DATABASE_URL_TEST`.
O primeiro precisa continuar administrativo para migrations e bootstrap.
O job gera senhas efêmeras e mascara seus valores.
Nenhum secret novo é necessário.
As credenciais locais não alteram configurações do Render ou Vercel.

## Integração e E2E da API

O helper `backend/scripts/helpers/recomendacao-runtime.ts` sobe este app
num listener HTTP efêmero, após bootstrap e migrations privadas.
Cada execução usa schemas e papéis exclusivos, equivalentes a
`recomendacao_app`, sem acesso às tabelas da API.
O E2E reutiliza o schema de catálogo criado pelo harness.
Seu token é efêmero e nunca entra nos artefatos.
O arquivo `recomendacao.log` registra método, caminho e status.
O runner exige chamadas reais de recomendação com status 200.
A limpeza remove o schema privado, os papéis e o schema E2E.

Scripts legados de métricas e benchmark continuam ferramentas locais.
Eles carregam a implementação deste serviço, sem duplicar Strategies.
A operação de lote pertence à 35.6 e permanece fora desta entrega.
