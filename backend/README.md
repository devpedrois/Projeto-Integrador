# Backend Origem

API Express com TypeScript, Prisma e PostgreSQL no Neon.
As camadas seguem Route, Controller, Service e Repository.
O módulo de recomendação utiliza Strategy.
`src/utils/` contém funções reutilizáveis, incluindo hashing de senhas.

Funcionalidades atuais:

- `GET /health`: verifica acesso ao PostgreSQL real.
- `POST /auth/register`, `/auth/login`, `/auth/logout` e `GET /auth/me`.
- `POST /pedidos`: cria pedidos com controle transacional de estoque.
- `PATCH /admin/usuarios/:id/papel`: alteração administrativa de papel.
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
| `npm run test:concorrencia` | Script legado; adaptação ao login prevista no commit 17 |
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

JWT e cookie sustentam a autenticação da WEB-03.
CORS pertence à respectiva subtarefa.
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

## Autenticação WEB-03

Configure JWT_SECRET também para login em desenvolvimento.
Sem segredo válido, a emissão de sessão retorna 503.
Não existe segredo padrão para assinar tokens.

`POST /auth/register` recebe nome, email, senha e papel.
Nome exige entre 3 e 120 caracteres após trim.
Email normalizado exige formato válido e até 254 caracteres.
Senha exige oito caracteres, limitada a 72 bytes UTF-8.
O limite evita truncamento silencioso pelo bcrypt.
Somente `comprador` e `artesao` podem ser cadastrados publicamente.
Campos extras são rejeitados com 400.
Email em uso retorna 409, inclusive cadastros simultâneos.
Usuário e Carrinho ou PerfilArtesao nascem na mesma transação.
O perfil inicial tem `completo=false` e campos opcionais nulos.
Cadastro retorna 201 sem cookie ou login automático.

`POST /auth/login` recebe somente email e senha.
Login retorna o usuário público e cookie `origem_sessao`.
JWT HS256 expira em 24h, com sub, papel e nome.
O cookie usa HttpOnly, SameSite=Lax, Path=/ e Max-Age=86400.
Secure segue COOKIE_SECURE; Domain não é definido.
As respostas de autenticação usam Cache-Control: no-store.
Credenciais inválidas ou usuário inativo recebem a mesma resposta 401.
Email inexistente executa bcrypt.compare contra hash fixo custo 10.

`GET /auth/me` valida assinatura, claims e expiração.
Também reconsulta o usuário ativo no banco.
Retorna somente `{ id, nome, email, papel }`.
Sessão ausente, inválida ou usuário indisponível retorna 401.
`POST /auth/logout` expira o cookie e retorna 204.
O cliente descarta o JWT; não existe revogação central nesta etapa.
Nenhuma resposta de autenticação contém senhaHash.

O probe `/health/cookie` foi retirado na WEB-03.
Sua antiga variável ENABLE_COOKIE_PROBE não tem efeito.
Valide o cookie real usando login pelo proxy frontend.

## Autorização WEB-04

`autenticar` valida o JWT do cookie e consulta o usuário.
O resultado público popula `res.locals.usuario` com tipagem explícita.
Sessão ausente, inválida ou expirada recebe 401.
Usuário desativado após o login também recebe 401.
`exigirPapel(...papeis)` usa o papel atual do banco.
Sem permissão, retorna 403 e `ACESSO_NEGADO`.
Mudanças de papel valem também para tokens já emitidos.

`POST /pedidos` exige sessão ativa de comprador.
O body aceita somente `{ itens }`.
Campos extras também são rejeitados dentro dos itens.
`compradorId` vem da sessão validada; nunca do body.
`compradorRef` permanece nullable no banco como legado.
Pedidos novos deixam esse campo nulo.
Os locks, transação de estoque e outbox foram preservados.

`PATCH /admin/usuarios/:id/papel` exige admin ativo.
UUID do alvo é validado e normalizado para minúsculas.
O body aceita somente `{ papel: "comprador" | "artesao" }`.
Campos extras ou papel inválido recebem 400.
Admin tentando alterar o próprio papel recebe 403.
Alvo ausente recebe 404 e `USUARIO_NAO_ENCONTRADO`.
Sucesso retorna 200 com o usuário público, sem senhaHash.
A operação altera somente o papel do usuário.

Os testes de checkout usam login real e cookie.
Isso inclui concorrência e processamento automático da fila.
O script `scripts/concorrencia-checkout.ts` permanece no protocolo antigo.
Sua execução agora recebe 401, pois não realiza login.
A atualização desse script pertence ao commit 17.

## Limitações atuais

`compradorRef` permanece como campo legado, fora do contrato HTTP.
O checkout ainda utiliza os valores reduzidos da demonstração FCCPD.
Totais, pagamento e carrinho serão integrados nas respectivas subtarefas.
O modelo `Pagamento` já existe para dados simulados.
Gateways financeiros reais permanecem fora do escopo.

Execute essas rotas somente em ambiente controlado nesta etapa.
O modo produção permite validar boot, health e headers.
Esta entrega ainda não representa a aplicação final autenticada.

## Indices e EXPLAIN BD-04

`npm run db:explain` mede nove consultas em leitura somente.
Usa DIRECT_URL e grava planos JSON em pasta nova.
Tabelas operacionais vazias tambem recebem sua captura.
O script aceita `--schema`, `--phase`, `--termo` e `--output`.
Termos possuem entre tres e 120 caracteres.
Nao sobrescreve arquivos existentes nem expoe credenciais em erros.

Para comparar, autorize somente uma branch Neon de teste.
Defina EXPLAIN_ISOLATED=1 e execute `npm run db:explain -- --compare`.
Esse modo recria a carga BD-05 em schema temporario.
Aplica os indices entre capturas antes/depois e termina com rollback.
Nao execute essa comparacao no banco de deploy.

Consulte [SQL e justificativas](prisma/consultas/README.md).
Veja [planos e tempos](../evidencias/PI4-28-W10-Modelo-Fisico/BD-04-indices/01-resumo-indices.md).
As escolhas naturais do planner estao documentadas nessa evidencia.
Categoria e carrinho aproveitam indices preexistentes.
O parcial da vitrine permanece definido na migration SQL.

## Cache — onde e por quê

WEB-13 aplica cache somente nas leituras públicas de catálogo:

| Endpoint | Chave | Motivo |
|---|---|---|
| `GET /produtos` | `produtos:lista:` e query validada normalizada | Evita repetir filtros, joins e agregações no PostgreSQL |
| `GET /produtos/:id` | `produtos:detalhe:` e UUID normalizado | Reutiliza o DTO público entre visitas à mesma peça |
| `GET /recomendacoes?produtoId=...` | `recomendacoes:produto:` e UUID normalizado | Evita repetir seleção, ranking e carregamento dos produtos |

As chaves ordenam os campos após validação Zod.
Defaults de paginação são incluídos; termos vazios são omitidos.
Termos recebem trim e lowercase; UUIDs recebem lowercase.
Filtros diferentes e páginas diferentes possuem chaves distintas.

`CACHE_TTL_SECONDS` define a validade, com padrão de 60 segundos.
`MemoryCacheStore` limita o armazenamento a 500 entradas por padrão.
Entradas expiradas são removidas; lotação descarta a menos recentemente usada.
Leituras não renovam o TTL. Valores armazenados e retornados são copiados.
O limite pode ser definido no construtor do store.

Uma instância é criada por aplicação Express e compartilhada internamente.
No Render, esta implementação pressupõe uma única instância do backend.
Reiniciar o processo esvazia o cache, gerando novos MISS.
O cache reduz viagens ao Neon sem adicionar infraestrutura nesta etapa.

`CacheStore` expõe `get`, `set` com TTL em milissegundos e
`invalidarPorPrefixo`. Os métodos são assíncronos.
Uma implementação Redis pode substituir o store via `createApp`:

```typescript
createApp(prisma, environment, { cacheStore });
```

Não é necessário reescrever os services ou controllers.
Antes de escalar o Render para múltiplas instâncias, use armazenamento
compartilhado e coordene também invalidação e leituras em andamento.
WEB-13 não instala Redis nem implementa sua integração.

Toda escrita confirmada de produto, estoque, moderação e pedido
invalida `produtos:` e `recomendacoes:` após concluir a transação.
Mudanças de papel e perfil do artesão também invalidam essas entradas.
Elas alteram a visibilidade ou a região exibida pelo catálogo.
Escritas recusadas preservam o cache dos dados confirmados.
Uma leitura anterior à invalidação não repovoa entradas antigas.
Gravações e invalidações no store são serializadas internamente.
Alterações externas ao processo dependem do TTL ou invalidação explícita.

Recomendações com `usuarioId` não são armazenadas neste cache.
Autenticação, carrinho, pedidos e painéis privados também não são cacheados.
O cookie não participa das chaves das três leituras públicas.
Esses endpoints públicos retornam o mesmo contrato independentemente da sessão.
Respostas de erro não são armazenadas.

`X-Cache` informa `MISS` ou `HIT` nas leituras elegíveis.
`Server-Timing: cache;dur=...` expõe a duração do carregamento em milissegundos.
O log JSON registra rota fixa, estado do cache e duração da resposta.
Não registra query, identidades, cookies, tokens ou conteúdo das respostas.
`Cache-Control: no-store` preserva a proteção dos caches do navegador.
O cache aqui descrito é controlado dentro do backend.

Os testes fazem duas chamadas e comparam MISS com HIT mais rápido.
Também confirmam invalidação em todas as rotas de escrita atuais.
TTL é testado com relógio fake, inclusive através do HTTP.
Os testes de integração usam PostgreSQL real em schema isolado.

```powershell
npm test -- tests/unit/cache.test.ts tests/integration/cache.web13.integration.test.ts
```
