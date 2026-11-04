# WEB-05: cliente HTTP e sessao real

Branch: `codex/web-05-http-session`.
Validacao local em 14/10/2026.

O fluxo real passou no Chromium com PostgreSQL isolado.
A Fake API continua como modo padrao dos testes.
Adapters pendentes falham explicitamente, sem fallback local.

## Validacoes

- Lint e typecheck passaram.
- Builds fake e HTTP passaram.
- Suite final: 720 testes em 75 arquivos.
- Os 683 testes anteriores continuam passando.
- As assinaturas publicas dos consumidores foram preservadas.
- Revisao local equivalente de seguranca concluida.
- Nenhum commit, push ou deploy foi realizado.

## Chamadas reais

| Etapa | Metodo e rota | Resultado |
|---|---|---|
| Sessao inicial ausente | GET /api/auth/me | 401 |
| Cadastro | POST /api/auth/register | 201 |
| Login | POST /api/auth/login | 200 e cookie HttpOnly |
| Reload | GET /api/auth/me | 200, comprador restaurado |
| Logout | POST /api/auth/logout | 204, cookie removido |
| Consulta apos logout | GET /api/auth/me | 401 |
| Admin sem cookie | GET /admin | 307 para login com retorno |

O teste confirmou o comprador no PostgreSQL real.
Identidade admin falsa no localStorage foi ignorada.
Comprador autenticado recebeu acesso negado em /admin.
O cookie foi verificado sem gravar seu valor.
O schema temporario e servidores foram encerrados ao terminar.

[Registro das chamadas reais](fluxo-real-2026-10-14T03-30-51-255Z/02-fluxo-real.json).
[Gravacao nativa Chromium em WebM](fluxo-real-2026-10-14T03-30-51-255Z/page@54172764581a0dc1beb3ed030528bb54.webm).
[Captura apos reload](fluxo-real-2026-10-14T03-30-51-255Z/sessao-apos-reload.png).
A gravacao nao inclui DevTools; chamadas constam no JSON.

## Logs e revisao

[Suite final](07-testes-seguranca-final.txt).
[Lint](lint-final.txt), [typecheck](typecheck-final.txt).
[Build fake](03-build.txt), [build HTTP final](08-build-http-final.txt).
[Revisao de seguranca](04-revisao-seguranca.md).

A primeira execucao teve bloqueio de cache no sandbox.
Outra execucao detectou dependencia de gravacao ausente.
ffmpeg foi instalado somente no cache do Playwright.
Um seletor ambiguo de senha foi corrigido no teste.
Essas correcoes nao alteraram o comportamento do produto.

## Reproducao local

Use Node.js 24 no frontend e backend.
Configure o backend em branch Neon de desenvolvimento.
Configure JWT_SECRET, COOKIE_SECURE=false e URLs PostgreSQL locais.
No frontend, configure as seguintes variaveis:

```dotenv
BACKEND_URL=http://127.0.0.1:3001
NEXT_PUBLIC_DATA_SOURCE=http
```

Reinicie o frontend apos alterar as variaveis.
Abra cadastro, cadastre comprador sintetico e efetue login.
Recarregue a pagina, confirme identidade e encerre a sessao.
Acesse /admin sem cookie e confirme o redirect.
Falhas de conexao oferecem nova tentativa, sem sessao local.

O harness validar-fluxo-real.mjs reproduz essa verificacao automaticamente.
Ele requer Playwright do runtime e Microsoft Edge instalado.
Ele cria schema sintetico proprio, removido ao encerrar.
Nao execute esse harness na base de producao.
O backend autentica realmente; nao ha mocks de repositories.

## Limites da subtarefa

Catalogo, carrinho, recomendacao e moderacao HTTP permanecem pendentes.
O contador de carrinho mostra somente estado inicial vazio.
Mutacoes HTTP pendentes nao escrevem memoria nem localStorage.
Presenca de cookie nao comprova autenticacao nem concede papel.
Essas validacoes pertencem ao backend existente.
O resultado local nao comprova deploy publico ou HTTPS.

Referencias primarias usadas:
[Middleware Next.js 15](https://nextjs.org/docs/15/app/api-reference/file-conventions/middleware) e
[AbortController](https://developer.mozilla.org/en-US/docs/Web/API/AbortController).
