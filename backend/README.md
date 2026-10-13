# Backend Origem

API Express com TypeScript, Prisma e PostgreSQL no Neon.
As camadas seguem Route, Controller, Service e Repository.
O módulo de recomendação utiliza Strategy.
`src/utils/` contém funções reutilizáveis, incluindo hashing de senhas.

Funcionalidades atuais:

- `GET /health`: verifica acesso ao PostgreSQL real.
- `POST /pedidos`: cria pedidos com controle transacional de estoque.
- `GET /recomendacoes`: consulta recomendações pelo produto ou usuário.
- Fila persistente `pg-boss`, iniciada junto ao servidor.
- Worker `notificar-artesao` e publicação periódica das intenções pendentes.
- Seeds sintéticos demo e volume, com proteção para volume.
- Helmet nos headers HTTP e `x-powered-by` desabilitado.

As rotas não possuem prefixo `/api`.
O pagamento permanece simulado, sem gateway financeiro real.

## Requisitos

- Node.js 24
- npm
- PostgreSQL configurado no Neon
- `DATABASE_URL` e `DIRECT_URL` da mesma branch Neon

Nunca registre valores dessas variáveis no repositório.

## Execução local

Execute os comandos dentro de `backend/`.
Copie o exemplo somente quando `.env` ainda não existir:

```powershell
if (!(Test-Path .env)) { Copy-Item .env.example .env }
```

Edite `.env` e substitua as URLs fictícias.
Use uma branch Neon de desenvolvimento ou teste.
As migrations modificam o banco indicado por `DIRECT_URL`.
O seed demo reaplica seus dados sintéticos.

Instale as dependências e gere o cliente Prisma:

```powershell
npm ci
npm run prisma:generate
```

Execute as migrations e a carga idempotente:

```powershell
npm run db:migrate
npm run db:seed
```

Inicie o servidor:

```powershell
npm run dev
curl.exe http://127.0.0.1:3001/health
```

O host padrão é `127.0.0.1`, inclusive sem `HOST` explícito.
Falhas de validação encerram o processo com código 1.
A mensagem lista somente nomes das variáveis inválidas.
Outras falhas de boot retornam `Backend startup failed`.

## Scripts

| Comando | Função |
|---|---|
| `npm run dev` | Executa TypeScript com reinicialização automática |
| `npm run build` | Executa `prisma generate && tsc`, sem migrations |
| `npm start` | Executa `node dist/src/server.js`, sem migrations |
| `npm run start:prod` | Executa `prisma migrate deploy` antes do servidor compilado |
| `npm run typecheck` | Verifica TypeScript sem gerar arquivos |
| `npm run lint` | Executa ESLint |
| `npm test` | Executa testes unitários e integração PostgreSQL real |
| `npm run prisma:generate` | Gera o cliente Prisma |
| `npm run prisma:validate` | Valida o schema Prisma |
| `npm run db:migrate` | Aplica migrations pendentes usando `DIRECT_URL` |
| `npm run db:seed` | Executa a carga demo sintética |
| `npm run db:seed:volume` | Executa a carga de volume mediante opt-in |
| `npm run test:concorrencia` | Verifica checkout concorrente no PostgreSQL real |
| `npm run metricas:recomendacao` | Calcula métricas da recomendação no PostgreSQL real |

`start:prod` não define `NODE_ENV` automaticamente.
Configure as variáveis no ambiente antes de executá-lo.
O build não exige conexão ativa com o banco.
O Prisma exige `DIRECT_URL` configurada para carregar sua configuração.

## Variáveis de ambiente

`.env.example` contém somente valores fictícios.
Nunca reutilize seu `JWT_SECRET` em produção.

| Chave | Padrão ou exigência | Uso |
|---|---|---|
| `DATABASE_URL` | Obrigatória, URL PostgreSQL | Conexões da aplicação e `pg-boss` |
| `DIRECT_URL` | Obrigatória, URL PostgreSQL | Prisma CLI e migrations, conexão direta |
| `NODE_ENV` | `development` | Aceita `development`, `test` ou `production` |
| `HOST` | `127.0.0.1` | Endereço de escuta; configure `0.0.0.0` no Render |
| `PORT` | `3001` | Inteiro entre 1 e 65535; respeita o ambiente Render |
| `JWT_SECRET` | Obrigatória em produção | Mínimo de 32 caracteres úteis quando fornecida |
| `FRONTEND_ORIGIN` | `http://localhost:3000` | Origem HTTP ou HTTPS, sem caminho, barra final ou credenciais |
| `COOKIE_SECURE` | `true` em produção; `false` nos outros ambientes | Aceita somente textos `true` e `false`, convertidos para boolean |
| `CACHE_TTL_SECONDS` | `60` | Inteiro positivo, em segundos |
| `NOTIFICATION_PUBLISHER_INTERVAL_MS` | `3000` | Publicação periódica; inteiro entre 1000 e 60000 |
| `ALLOW_VOLUME_SEED` | Opt-in desativado no exemplo | `1` autoriza a carga de volume na branch de teste |
| `DATABASE_URL_DEPLOY` | Opcional, fictícia no exemplo | Identifica o banco de deploy bloqueado para volume |
| `CONCURRENCY_TEST_PORT` | `3910` | Porta exclusiva do script de concorrência |

JWT, origem, cookie e TTL ficam preparados nesta subtarefa.
Autenticação, CORS e cache serão implementados nas respectivas subtarefas.
`COOKIE_SECURE=false` é aceito explicitamente, inclusive em produção.
No deploy HTTPS, configure sempre `COOKIE_SECURE=true`.

## Deploy no Render

A WEB-01 prepara o boot e documenta o deploy.
Provisionamento e proxy do frontend pertencem à WEB-02.

Configure um Web Service com raiz `backend/`:

- Build Command: `npm ci --include=dev && npm run build`.
- Start Command: `npm run start:prod`.
- Health Check Path: `/health`.
- `NODE_ENV=production` e `HOST=0.0.0.0`.
- `DATABASE_URL` e `DIRECT_URL` reais no painel Render.
- `JWT_SECRET` aleatório exclusivo, com pelo menos 32 caracteres.
- `FRONTEND_ORIGIN` com a origem HTTPS do frontend publicado.
- `COOKIE_SECURE=true` e `CACHE_TTL_SECONDS=60`.

Mantenha Prisma CLI disponível também no comando de inicialização.
`npm ci --include=dev` inclui a CLI e o compilador.
O start aplica migrations antes de iniciar o HTTP.
Uma migration malsucedida impede a inicialização.
Não execute seeds automaticamente durante o deploy.

Gere o segredo fora do repositório, sem registrá-lo:

```powershell
node -e "process.stdout.write(require('node:crypto').randomBytes(32).toString('hex'))"
```

Para validar localmente o binário em modo produção:

```powershell
npm run build
$env:NODE_ENV = "production"
$env:HOST = "0.0.0.0"
# Defina JWT_SECRET no ambiente antes de executar.
npm start
```

Em outro terminal, `curl.exe http://127.0.0.1:3001/health` retorna 200.
Isso exige banco acessível e bootstrap `pg-boss` concluído.
Com segredo curto, o boot falha antes da conexão.

## Validação

```powershell
npm run lint
npm run typecheck
npm test
npm run build
```

Use somente a branch Neon destinada aos testes.
Os testes usam PostgreSQL real, sem mocks de repositories.
Parte da suíte cria fixtures e schemas temporários.

## Seeds BD-05

`npm run db:seed` carrega as cinco contas documentadas em
`docs/docs auxiliares/LOGINS_TESTE.md`, 30 produtos, duas especializacoes
de artesao, seis categorias, dez avaliacoes e tres pedidos confirmados
com pagamento `pix_simulado` aprovado. Os dados de catalogo sao um
snapshot dos seeds frontais em `prisma/seeds/demo.ts`. O teste de paridade
detecta divergencias. Referencias de tecnica e regiao permanecem alinhadas.
O perfil incompleto da Maria conserva regiao nula.

`src/utils/senha.ts` usa bcrypt nativo, custo 10. O build local e a
geracao/comparacao reais validam o binario instalado. Nao houve falha
nativa que justificasse bcryptjs. O build do Render nao foi executado.

Para volume, use somente a branch de teste Neon. Defina `DATABASE_URL`
dessa branch, `ALLOW_VOLUME_SEED=1` e, quando disponivel,
`DATABASE_URL_DEPLOY`. Execute `npm run db:seed:volume`.
Sem autorizacao explicita ou com endpoint igual ao deploy, o script
recusa antes de conectar. Compara tambem endpoints diretos e com pooler,
independentemente de credenciais e parametros de conexao.

Em base limpa: 50 artesaos, 300 compradores, 1.000 produtos e 1.500
pedidos confirmados, cada um com item e pagamento aprovado. O gerador
usa seed fixa `20261013`, IDs e datas deterministicas. Hashes bcrypt
usam salt aleatorio; determinismo nao significa hashes identicos.
Insercoes em lote evitam milhares de viagens ao Neon.
Ambos os comandos gravam atomicamente e nao apagam dados preexistentes.
Repeticoes preservam as contagens. O demo reaplica os dados sinteticos.

Os testes BD-05 usam PostgreSQL real em schemas isolados e rollback.
`DIRECT_URL` deve apontar para a mesma branch de teste de `DATABASE_URL`.
O teste de volume compara duas cargas limpas e repeticoes, inclusive
produtos, pedidos, itens, valores e datas. Evidencias nao incluem senhas,
hashes ou connection strings.

## Saúde

`GET /health` confirma o acesso ao PostgreSQL.

Com banco disponível, retorna `200`:

```json
{ "status": "ok", "database": "reachable" }
```

Se o banco não estiver disponível, retorna `503`:

```json
{ "status": "error", "message": "Service unavailable" }
```

As respostas não incluem mensagens internas ou credenciais.

## Limitações atuais

`compradorRef` é sintético e temporário. `POST /pedidos` também exige
`compradorId`, o UUID de um `Usuario` já existente (FK obrigatória desde a
PI4-19.5). Sem autenticação real, quem chama o endpoint ainda escolhe esse
UUID livremente. Autenticação e autorização reais permanecem pendentes.
O modelo `Pagamento` já existe para dados simulados.
Gateways financeiros reais permanecem fora do escopo.

Execute essas rotas somente em ambiente controlado nesta etapa.
O modo produção permite validar boot, health e headers.
Esta entrega ainda não representa a aplicação final autenticada.
