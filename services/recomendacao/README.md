# Microsserviço de recomendação

Node 22 e TypeScript estrito, Express e PostgreSQL via `pg`.
Use Node 22.13 ou superior na linha 22 para ESLint 10.

O serviço seleciona IDs ordenados, sem montar produtos públicos.
A API continua autenticando compradores e projetando seus DTOs.
A composição atual da API permanece usando suas Strategies locais.
A integração HTTP será realizada na subtarefa 35.2.

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
Os testes também executam as Strategies originais para comparar ordem.
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
