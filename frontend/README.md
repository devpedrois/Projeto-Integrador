# Frontend Origem

Marketplace da economia criativa pernambucana, usando Next.js e React.
A interface escolhe Fake API ou HTTP pela configuração.
A WEB-05 integra autenticação real pelo proxy da WEB-02.

## Execução local

Execute dentro de `frontend/`, usando Node.js 24:

```powershell
npm ci
npm run dev
```

Para ativar o proxy local, crie `.env.local`:

```dotenv
BACKEND_URL=http://127.0.0.1:3001
NEXT_PUBLIC_DATA_SOURCE=http
```

O backend deve estar rodando separadamente nessa porta.
Reinicie o Next.js depois de alterar a variável.
Para desenvolver offline, configure NEXT_PUBLIC_DATA_SOURCE=fake.

## Scripts

| Comando | Função |
|---|---|
| `npm run dev` | Servidor Next.js de desenvolvimento |
| `npm run build` | Build de produção |
| `npm start` | Servidor do build produzido |
| `npm run lint` | Verificação ESLint |
| `npm run typecheck` | Verificação TypeScript |
| `npm test` | Suíte Vitest |

O build usa `tsconfig.build.json` para verificar a aplicação.
Essa configuração inclui páginas, middleware e configuração Next.js.
Testes e configuração Vitest ficam fora do build de produção.
A verificação estrita de tipos continua habilitada.
O deploy frontend não exige gerar o cliente Prisma.

`npm run typecheck` continua usando `tsconfig.json`.
Ele verifica também testes e contratos entre frontend e backend.
Esses contratos exigem o cliente Prisma gerado localmente.
Prepare-o com `npm --prefix ../backend run prisma:generate`.
Execute esse comando a partir de `frontend/`.

## Variáveis

| Variável | Local | Deploy |
|---|---|---|
| `BACKEND_URL` | `http://127.0.0.1:3001` | Origem HTTPS do backend Render |
| `NEXT_PUBLIC_DATA_SOURCE` | `fake` ou `http` | `http` para integração real |

BACKEND_URL pertence ao servidor, sem prefixo `NEXT_PUBLIC_`.
Ela não é exposta pelo campo `env` do NextConfig.
Use somente uma origem HTTP ou HTTPS, sem credenciais.
Não inclua `/api`, caminhos, query ou fragmento.
Uma barra final é aceita e normalizada.
Ausência, valor vazio ou espaços não registram rewrite.
O build continua funcionando sem essa variável.
Quando fornecida incorretamente, a configuração retorna erro sem valores.
Na Vercel, alterar BACKEND_URL exige novo deploy.

## Proxy `/api`

O Next.js encaminha `/api/:path*` para `${BACKEND_URL}/:path*`.
Por exemplo, `/api/health` chega ao backend como `/health`.
O navegador continua usando o domínio do frontend.
O backend conserva suas rotas sem prefixo `/api`.
NEXT_PUBLIC_DATA_SOURCE seleciona os adapters, independentemente do rewrite.
HTTP exige BACKEND_URL configurada para um backend disponível.
Erros HTTP nunca acionam fallback para a Fake API.

O backend emite cookies sem atributo Domain explícito.
Assim, o cookie recebido pelo proxy usa a origem frontend.
HttpOnly impede leitura pelo JavaScript da página.
Confira sua persistência em DevTools, não em `document.cookie`.
Não é necessário CORS com credenciais para esse proxy.

## Validação do cookie real

O probe `/api/health/cookie` foi removido na WEB-03.
Agora valide com `POST /api/auth/login` e credenciais sintéticas.
Configure JWT_SECRET no backend antes de iniciar.
O cookie `origem_sessao` contém o JWT e expira em 24h.
Ele usa HttpOnly, SameSite=Lax e Path=/.
Secure segue COOKIE_SECURE: false no HTTP, true no HTTPS.
`GET /api/auth/me` deve retornar o usuário autenticado.
`POST /api/auth/logout` retorna 204 e expira o cookie.
Depois do logout, `/api/auth/me` deve retornar 401.
A interface consome esses endpoints quando configurada em HTTP.

## Deploy e validação manual

Nenhum desses passos foi executado pela WEB-02 local.

1. Crie um Web Service no Render, com raiz `backend/`.
   Build: `npm ci --include=dev && npm run build`.
   Start: `npm run start:prod`.
   Configure as chaves de `backend/.env.example` com valores adequados.
   Use `NODE_ENV=production`, `HOST=0.0.0.0` e `COOKIE_SECURE=true`.
   Defina DATABASE_URL e DIRECT_URL da base de deploy.
   Defina JWT_SECRET aleatório exclusivo, com pelo menos 32 caracteres.
   FRONTEND_ORIGIN deve corresponder à origem HTTPS publicada na Vercel.
   Respeite PORT fornecida pelo Render; configure health check `/health`.
2. Rode `npm run db:seed` uma vez na base de deploy.
   Confirme DATABASE_URL e DIRECT_URL dessa base antes da execução.
   Não execute a carga de volume no deploy.
3. Configure BACKEND_URL na Vercel com a origem Render.
   Selecione o ambiente correto e faça novo deploy.
   Confira `https://<vercel>/api/health`: resposta 200 e banco acessível.
4. Envie `POST /api/auth/login` pelo domínio Vercel.
   Use uma conta sintética já cadastrada e ativa.
   Em DevTools > Application > Cookies, selecione o domínio Vercel.
   Confira `origem_sessao`, HttpOnly, SameSite=Lax, Secure e Path=/.
   Consulte `/api/auth/me` e confirme envio em Network.
   Capture status 200, Set-Cookie e a tabela de cookies.

Se o passo 4 falhar, pare e avise o responsável.
Não aplique o plano B automaticamente.
Após sucesso, guarde evidências sem credenciais ou tokens.

## Plano B, condicionado à falha e autorização

O plano B usa acesso direto ao backend entre origens.
O backend precisaria liberar somente FRONTEND_ORIGIN via CORS.
Ele também precisaria enviar `Access-Control-Allow-Credentials: true`.
Nunca combine credenciais com origem curinga `*`.
O cliente precisaria usar `fetch` com `credentials: "include"`.
Os cookies precisariam de `SameSite=None; Secure` e HTTPS.
Preflights, proteção CSRF e bloqueios de terceiros exigiriam validação.
O Safari pode bloquear cookies entre esses domínios.
Nesse cenário, o cookie pertenceria ao domínio backend.
Este plano permanece documentado, sem implementação nesta subtarefa.

## Sessão real WEB-05

Sem NEXT_PUBLIC_DATA_SOURCE, o padrão permanece fake, inclusive nos testes.
Valores desconhecidos falham explicitamente, sem selecionar outra fonte.
Variáveis NEXT_PUBLIC exigem reinício local ou novo build no deploy.

O cliente usa /api, credentials include e cache no-store.
O timeout padrão é dez segundos, com AbortController.
A espera abrange fetch e leitura do JSON.
Erros possuem ServiceError, código conhecido e mensagem sanitizada.
401 representa sessão ausente, preservando CREDENCIAIS_INVALIDAS no login.
Erros de rede, timeout e resposta inválida são recuperáveis.

HttpUsuariosService implementa register, login, logout e me.
O SessionStore hidrata em GET /auth/me no modo HTTP.
Ele não lê nem grava sessão em localStorage nesse modo.
Respostas atrasadas não sobrescrevem login ou logout posteriores.
Falhas de hidratação exibem recuperação, sem assumir sessão anônima.
Logout aguarda confirmação do backend antes de encerrar e navegar.

O middleware exige cookie nas três áreas protegidas em HTTP.
Sem cookie, redireciona para /login?retorno=<destino local>.
Em fake, a navegação continua usando a guarda existente.
Presença de cookie não comprova identidade ou papel.
RouteGuard consulta a sessão hidratada e controla a apresentação.
A autorização real permanece no backend, incluindo papel atual.
Login aceita retorno e redirect legados, validando destino local.

PENDENTES_HTTP identifica adapters ainda não implementados.
Em desenvolvimento, suas pendências aparecem uma vez no console.
Operações pendentes rejeitam com HTTP_NAO_IMPLEMENTADO, sem dados fake.
UsuariosService.list também permanece pendente nesta subtarefa.
O contador de carrinho usa estado inicial vazio, sem persistência.
Mutações do carrinho HTTP são bloqueadas antes de alterar estado.
Catálogo, carrinho, checkout e demais adapters ficam nas próximas subtarefas.

O contrato preserva list, register e login existentes.
logout e me opcionais preservam os consumidores e fixtures anteriores.
UsuariosSessaoService exige esses métodos no adapter HTTP.
Hooks, componentes e páginas preservam suas assinaturas públicas.

Evidências e gravação local ficam em
[WEB-05](../evidencias/PI4-27-W10-Integracao-Camadas/WEB-05-http-sessao/README.md).
