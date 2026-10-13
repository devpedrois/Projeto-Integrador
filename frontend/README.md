# Frontend Origem

Marketplace da economia criativa pernambucana, usando Next.js e React.
A interface atual consome a Fake API da AV1.
A WEB-02 prepara o proxy para a integração posterior.

## Execução local

Execute dentro de `frontend/`, usando Node.js 24:

```powershell
npm ci
npm run dev
```

Para ativar o proxy local, crie `.env.local`:

```dotenv
BACKEND_URL=http://127.0.0.1:3001
```

O backend deve estar rodando separadamente nessa porta.
Reinicie o Next.js depois de alterar a variável.
O desenvolvimento sem BACKEND_URL mantém a Fake API disponível.

## Scripts

| Comando | Função |
|---|---|
| `npm run dev` | Servidor Next.js de desenvolvimento |
| `npm run build` | Build de produção |
| `npm start` | Servidor do build produzido |
| `npm run lint` | Verificação ESLint |
| `npm run typecheck` | Verificação TypeScript |
| `npm test` | Suíte Vitest |

## Variáveis

| Variável | Local | Deploy |
|---|---|---|
| `BACKEND_URL` | `http://127.0.0.1:3001` | Origem HTTPS do backend Render |

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
O proxy não troca automaticamente os services da Fake API.
Essa integração pertence às subtarefas seguintes.

O backend emite cookies sem atributo Domain explícito.
Assim, o cookie recebido pelo proxy usa a origem frontend.
HttpOnly impede leitura pelo JavaScript da página.
Confira sua persistência em DevTools, não em `document.cookie`.
Não é necessário CORS com credenciais para esse proxy.

## Probe temporário de cookie

No backend, habilite `ENABLE_COOKIE_PROBE=true` e reinicie o servidor.
Acesse `/api/health/cookie` pelo frontend.
A resposta esperada é:

```json
{ "status": "ok", "cookie": "origem_cookie_probe" }
```

O cookie `origem_cookie_probe` contém somente o valor sintético `ok`.
Ele recebe `HttpOnly`, `SameSite=Lax`, `Path=/` e validade de cinco minutos.
O atributo `Secure` segue a variável backend `COOKIE_SECURE`.
Use `COOKIE_SECURE=false` no HTTP local.
Use `COOKIE_SECURE=true` no deploy HTTPS.
Sem ENABLE_COOKIE_PROBE ou com `false`, a rota retorna 404.
O probe não autentica usuários nem cria sessões reais.
A resposta usa `Cache-Control: no-store`.
Desative ENABLE_COOKIE_PROBE após capturar a evidência.
A rota será removida no commit 07.

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
   Habilite ENABLE_COOKIE_PROBE temporariamente.
2. Rode `npm run db:seed` uma vez na base de deploy.
   Confirme DATABASE_URL e DIRECT_URL dessa base antes da execução.
   Não execute a carga de volume no deploy.
3. Configure BACKEND_URL na Vercel com a origem Render.
   Selecione o ambiente correto e faça novo deploy.
   Confira `https://<vercel>/api/health`: resposta 200 e banco acessível.
4. Abra `https://<vercel>/api/health/cookie` em janela anônima.
   Em DevTools > Application > Cookies, selecione o domínio Vercel.
   Confira `origem_cookie_probe`, HttpOnly, SameSite=Lax, Secure e Path=/.
   Recarregue e confirme o envio do cookie em Network.
   Capture status 200, Set-Cookie e a tabela de cookies.

Se o passo 4 falhar, pare e avise o responsável.
Não aplique o plano B automaticamente.
Após sucesso, desative o probe e guarde as evidências.

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
