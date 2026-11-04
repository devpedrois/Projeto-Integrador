# WEB-08: carrinho persistido no servidor

Validado em 14/10/2026 com Next.js, Express e PostgreSQL reais.
Fixtures sinteticas ficaram em schema temporario isolado.
Schema e servidores foram encerrados depois da coleta.

## Comportamento confirmado

- Todas as rotas exigem sessao de comprador.
- Carrinho pertence ao token; entrada nao aceita identidade externa.
- POST soma quantidade e grava preco lido do produto.
- PATCH substitui quantidade, validando estoque atual.
- DELETE remove exclusivamente item do carrinho autenticado.
- Produto oculto ou de artesao inativo recebe 404.
- Quantidade excessiva recebe 409 com produtoId e nome.
- Escritas concorrentes nao perdem soma nem excedem estoque.
- Visitante adiciona localmente, sem chamar API de carrinho.
- Login mescla quantidades, limita estoque e limpa o local.
- Produto moderado apos adicao e descartado com aviso.
- Tres rodadas logout e login preservaram cinco unidades.
- Logout nao mostra o carrinho privado ao visitante.
- Remocao pela tela foi confirmada no PostgreSQL.
- Responsividade passou em 360, 768 e 1280px.

## Verificacao automatizada

- Backend: 383 testes em 40 arquivos passaram.
- Frontend: 789 testes em 82 arquivos passaram.
- Lint e typecheck passaram nos dois projetos.
- Prettier passou nos arquivos TypeScript alterados e novos.
- `git -c core.whitespace=cr-at-eol diff --check` passou.
- Nenhum banco ou repository foi mockado.

Testes frontend substituem somente transporte HTTP externo.
Testes backend usam migrations e PostgreSQL real isolado.
Avisos preexistentes: SSL do pg e act em use-artesaos-ativos.

## Capturas

Pasta: `fluxo-real-2026-10-14T14-58-05-568Z/`.

- `fluxo-web08.gif`: oito capturas reais do fluxo.
- `resultado.json`: chamadas, conflito e tres logins.
- `01-carrinho-visitante.png`: quatro unidades e item adicional.
- `02-login-mesclagem-limitada.png`: tres mais quatro limitados a cinco.
- `03-linhas-item-carrinho-postgresql.png`: linhas reais de ItemCarrinho.
- `04-409-nome-na-tela.png`: nome do produto no aviso.
- `05-persistencia-rodada-1.png` ate `05-persistencia-rodada-3.png`.
- `06-remocao-servidor.png`: carrinho vazio apos DELETE.
- `carrinho-360.png`, `carrinho-768.png`, `carrinho-1280.png`.
- Video WebM produzido pelo Playwright.

O painel HTTP apresenta respostas capturadas pela automacao.
O painel PostgreSQL apresenta linhas consultadas no banco real.
Esses paineis foram inseridos somente na coleta visual.
Nao representam DevTools nativo nem alteram o produto.

## Revisao equivalente de seguranca

Mantida nesta conversa, conforme escolha anterior do usuario.
Revisados rotas, schemas, service, repository, adapters e stores.

- Autenticacao confere usuario ativo e papel atual.
- Identidade e precos externos sao rejeitados por schemas estritos.
- Transacoes serializam carrinho e bloqueiam produto durante validacao.
- SQL usa parametros; DTOs projetam somente campos permitidos.
- Frontend preserva somente produtoId e nome no erro 409.
- Respostas atrasadas sao invalidadas no logout e troca de conta.
- Falhas parciais preservam itens locais ainda nao processados.
- Retomada nao duplica itens cujo sucesso foi confirmado.
- IDs antigos da fake API sao descartados com aviso.
- Erro de sincronizacao no login possui recuperacao visivel.
- Evidencias nao incluem senha, JWT ou conexoes de banco.

Os problemas encontrados receberam testes antes das correcoes.
Nao foram encontrados achados restantes no escopo revisado.

## Limites

Checkout real permanece na WEB-09.
O modo fake conserva stores locais da AV1.
Nao houve migration nova nem reserva de estoque.
API.md e evidencias seguem ignorados pelo .gitignore existente.
Nao houve commit, push ou deploy.
