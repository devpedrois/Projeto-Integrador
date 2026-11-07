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
A operação de lote registra início, conclusão, contagem e hash.

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

O script legado de métricas continua ferramenta local.
Ele carrega a implementação deste serviço, sem duplicar Strategies.
O benchmark do lote agora pertence exclusivamente a este serviço.


## Lote de recomendações, 35.6

Configure `DATABASE_URL` com o papel `recomendacao_app`.
O schema privado deve possuir a migration `001_execucao_lote.sql`.
A CLI aceita concorrência inteira entre 1 e 8.
O reforço regional fica desligado por padrão.

```sh
npm run lote -- --concorrencia 4 --reforco-regional --saida resultado-novo.json
```

O destino precisa ser novo; arquivos existentes são preservados.
A saída contém `resultados`, parâmetros, duração, ID e SHA-256.
`resultados` contém `{ produtoId, produtoIds }`, ordenados por `produtoId`.
O hash usa SHA-256 de `JSON.stringify(resultados)` em UTF-8.
A seleção usa `CategoriaRecomendacaoStrategy` e `listarElegiveis` existentes.
Contextos seguem `elegivel`, incluindo produtos ocultos por moderação.
Esse filtro já pertence ao contrato da Strategy.

O módulo está em `src/lote/index.ts`; o pool, em `src/lote/pool.ts`.
`gerarRecomendacoesEmLote({ concorrencia, reforcoRegional })` é a operação pública.
Ela prepara a sessão, calcula, persiste e fecha as conexões.
O segundo argumento opcional configura conexão e schemas.
`prepararLote` permite reutilizar o snapshot durante medições repetidas.
Feche essa sessão com `fechar()` após terminar.

O pool abre exatamente C+2 conexões do mesmo papel.
C conexões compartilham um snapshot `REPEATABLE READ READ ONLY`.
Uma conexão mantém o snapshot; outra persiste o registro privado.
Cada execução insere uma linha antes de calcular.
Depois atualiza essa mesma linha com conclusão e hash.
Falhas preservam a linha incompleta, sem conclusão ou hash.
Não existe retry automático ou escrita no catálogo.
Execuções simultâneas na mesma sessão são recusadas.
A conexão exige o proprietário restrito do schema privado.

### Benchmark B2 no microsserviço

Configure `DATABASE_URL_VOLUME` com `recomendacao_app` na branch de volume.
Essa branch deve diferir das bases padrão e deploy.
Prepare previamente as views, permissões e migration privada.
O benchmark recusa produção e exige mil produtos elegíveis.

```sh
npm run bench:lote
npm run bench:lote -- --output pasta-nova
```

Python com Matplotlib é necessário para o gráfico.
Os requisitos estão em `scripts/requirements-bench.txt`.
`BENCH_RECOMENDACAO_PYTHON` permite escolher o executável Python.
A saída padrão fica em `evidencias/PI4-35/35.6-lote/execucao-*`.

O protocolo mantém C=1,4,8 e cinco rodadas por C.
A primeira aquece; quatro medições formam cada mediana.
Cada configuração utiliza seu próprio snapshot consistente.
O tempo cobre apenas as chamadas da Strategy, até concluírem.
Preparação, catálogo, persistência, hash e arquivos ficam fora.
Throughput usa produtos por segundo; speedup compara medianas.
Eficiência divide speedup por C; nenhuma medição é descartada.
Toda rodada é comparada ao primeiro aquecimento sequencial.
`diff.json` registra divergências; `rodadas.csv` preserva os tempos.
`execucoes-lote.json` salva as quinze linhas efetivamente consultadas.
`consulta-execucoes.sql` permite conferir os mesmos IDs no PostgreSQL.
Os checkpoints `C-*.json` também preservam os registros privados.

A migração preserva a referência de 25/10/2026.
Mudanças ambientais ou contratuais precisam acompanhar a interpretação.
O máximo PostgreSQL não comprova a cota do pooler.
