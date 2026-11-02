# US01.C1: cadastro com sessão automática

Execução local: 02/11/2026.
Branch: codex/us01-c1-cadastro-sessao.
Base: aa37c48, main limpo após commit do README.
Escopo: somente US01.C1 e documentação solicitada.

Cadastro reutiliza iniciarSessao, já utilizada pelo login.
O JWT usa o papel retornado pelo banco.
SessionStore recebe a identidade antes da navegação.
Comprador segue para /; artesão, para /painel-artesao.
Não existe chamada adicional de login após cadastro.

## TDD preservado

| Execução | Resultado |
| --- | --- |
| [01-backend-red.log](01-backend-red.log) | 6 falhas esperadas, 47 aprovações. Cookies e OpenAPI ausentes; falha pós-commit ainda retornava 201. PostgreSQL real. |
| [02-backend-green.log](02-backend-green.log) | 53/53: auth 39, OpenAPI 14. |
| [03-frontend-red.log](03-frontend-red.log) | 5 falhas esperadas, 8 aprovações. Formulário ainda navegava para login e não autenticava o store. |
| [04-frontend-green.log](04-frontend-green.log) | 31/31: cadastro, login, store HTTP e adapter HTTP. |
| [05b-e2e-red.log](05b-e2e-red.log) | Falha esperada em 360px: /login?cadastro=sucesso em vez de /. |
| [06-e2e-green.log](06-e2e-green.log) | 4/4 em 360px e 1280px; zero skips, falhas e flaky. |

O RED E2E restaurou temporariamente o formulário anterior.
Um finally restaurou automaticamente o formulário corrigido.
O primeiro comando E2E não encontrou testes.
O npm não repassou seus argumentos; não conta como RED.
O RED válido utilizou diretamente node e2e/run.mjs.
O GREEN executou npm run test:e2e, sem filtros.

## Ambiente e reprodução

Backend: npm test, npm run lint, npm run typecheck.
Frontend: npm test, npm run lint, npm run typecheck.
E2E: npm run test:e2e, dentro de frontend.

Integrações auth usam o helper de schema isolado WEB-03.
E2E usou conexão de testes localmente configurada.
DATABASE_URL_VOLUME foi fornecida como E2E_DATABASE_URL.
Sua identidade difere de DATABASE_URL e DIRECT_URL.
As proteções existentes contra ambiente de produção permaneceram ativas.
Nenhuma conexão ou credencial foi copiada para este registro.
Chromium: instalação local do Google Chrome.

Cada execução E2E criou seu próprio schema e2e31_.
A limpeza confirmou ausência do schema após os testes.
Logs textuais foram sanitizados antes do versionamento.
Os avisos existentes do pg não representam falhas.

## Verificações complementares

| Verificação | Resultado |
| --- | --- |
| [Lint backend](07-backend-lint.log) | Aprovado. |
| [Typecheck backend](08-backend-typecheck.log) | Aprovado. |
| [Lint frontend](10-frontend-lint.log) | Aprovado. |
| [Typecheck frontend](11-frontend-typecheck.log) | Aprovado. |
| [Suíte backend](09-backend-tests.log) | 759/759 em 72 arquivos, PostgreSQL real. |
| [Suíte frontend](12-frontend-tests.log) | 958/958 em 102 arquivos. |
| [Prettier dos arquivos alterados](13-format.log) | Aprovado; finais de linha existentes preservados. |

## Relatório E2E validado

[Resultado JSON](06-e2e-green/9a5e2a7419ce45d6b7fab23dee794094/resultado.json).
[Limpeza confirmada](06-e2e-green/9a5e2a7419ce45d6b7fab23dee794094/cleanup.json).
[Relatório HTML local](06-e2e-green/9a5e2a7419ce45d6b7fab23dee794094/html/index.html).

Fluxo (a): cadastro, sessão, recarga, compra e Meus pedidos.
Fluxo (b): inclui cadastro e recarga de novo artesão.
Depois, utiliza o artesão do produto para verificar envio.
Esse login posterior serve exclusivamente ao acompanhamento do pedido.

## Revisão e documentação

[Revisão equivalente de segurança](14-revisao-seguranca.md), autorizada nesta conversa.
Não houve delegação ao agente security-auditor.
Matriz: 36/37 aprovados, 97,3%; US01: 4/4, 100%.
Somente US08.C3 permanece parcial.
P4 foi marcada resolvida; hash textual ficará ao responsável.
API.md, CLAUDE.md e o documento P4 estavam ignorados.
Foram incluídos explicitamente para atender à entrega documental.
Um documento não pode conter o próprio hash final.
Não houve push, merge, deploy ou CI remoto.
