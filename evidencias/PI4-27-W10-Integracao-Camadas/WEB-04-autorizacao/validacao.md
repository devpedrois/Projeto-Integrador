# WEB-04: autenticação e autorização das rotas

Data: 13/10/2026, America/Sao_Paulo.
Branch: `codex/web-04-authorization`.
Banco: PostgreSQL real, sem mocks de banco ou repositories.

## Matriz verificada com supertest

| Sessão | POST /pedidos | PATCH /admin/usuarios/:id/papel |
|---|---|---|
| Anônimo | 401 | 401 |
| Comprador | 201 | 403 |
| Artesão | 403 | 403 |
| Admin | 403 | 200 |

O admin altera outro usuário entre comprador e artesao.
Alterar o próprio papel retorna 403, inclusive UUID maiúsculo.
Papel admin, papel inválido e campos extras retornam 400.
UUID inválido recebe 400; usuário alvo ausente recebe 404.
Sucesso devolve somente id, nome, email e papel.

Fonte: `backend/tests/integration/authorization.routes.integration.test.ts`.
A suíte adicionada contém 30 testes.

## Sessão e identidade

- Cookie ausente, JWT inválido ou expirado recebe 401.
- Assinatura incorreta, algoritmo diferente e claims inválidas recebem 401.
- Cookie JSON e codificação inválida recebem 401.
- Token de usuário ausente recebe 401.
- Usuário desativado depois do login recebe 401.
- Middleware popula res.locals.usuario com dados públicos do banco.
- Papel atual prevalece sobre claims de tokens antigos.
- Token declarando admin não eleva um comprador existente.
- Body com compradorId, compradorRef ou outra chave recebe 400.
- Campos extras nos itens também recebem 400.
- Pedido persistido referencia o comprador da sessão.
- compradorRef permanece nulo nos novos pedidos HTTP.

## Checkout e fila

Os seis testes existentes de checkout foram adaptados.
Todos fazem login real e enviam cookie de comprador.
O novo teste concorrente também usa cookie.
Estoque inicial um: respostas 201 e 409, somente um pedido.
O estoque final permanece zero.
Rollback por estoque insuficiente continua verificado.
O teste de publicação automática também envia cookie real.
Locks ordenados e transação da intenção foram preservados.

O script `backend/scripts/concorrencia-checkout.ts` não foi alterado.
Ele ainda envia compradorRef e compradorId sem autenticação.
Com a nova proteção, sua requisição recebe 401.
Sua adaptação permanece reservada ao commit 17.
O script legado não foi executado nesta subtarefa.
Hash Git conferido antes e depois:
`61f8958e7554f85d5dc8057fdea03de14643fe64`.

## TDD observado

Primeira execução da matriz: 26 falhas e quatro sucessos.
As falhas mostraram autorização ausente e rota administrativa inexistente.
Antes da implementação, checkout concorrente recebeu 400 e 400.
Após implementação, 38 testes direcionados passaram em três arquivos.
A suíte completa passou com 273 testes em 32 arquivos.
Saída real preservada em `01-terminal-testes-backend.txt`.

## Validações

```text
npm run lint      -> exit 0
npm run typecheck -> exit 0
npm run build     -> exit 0
npm test          -> exit 0, 273 passed, 32 files passed
```

Prettier aplicado à implementação e testes de autorização/checkout.
O aviso PostgreSQL sobre sslmode=require permanece preexistente.
Nenhuma migration ou nova dependência foi necessária.

## Revisão de segurança local

Revisão equivalente realizada nesta conversa, conforme preferência autorizada.
Nenhum agente foi delegado.

- Claims JWT passam por assinatura, algoritmo, expiração e schema.
- Usuário e papel são reconsultados antes das rotas protegidas.
- Usuário inativo não reutiliza sessão emitida anteriormente.
- Middleware de papel antecede a validação do recurso administrativo.
- Comprador não altera papel próprio nem de terceiros.
- Admin não altera o próprio papel, inclusive via UUID maiúsculo.
- Strict schemas impedem injeção de identidade e campos adicionais.
- Controllers e respostas públicas não expõem senhaHash.
- Persistência usa Prisma e SQL parametrizado existente.
- Permissões antigas não sobrevivem em tokens emitidos anteriormente.
- Respostas protegidas usam Cache-Control: no-store.
- Diff mantém o script do commit 17 intacto.

Sem commit, push ou merge nesta subtarefa.

## Evidências adicionais com curl

Coleta: 13/10/2026, 22:57:41, America/Sao_Paulo.
Aplicação Express local e PostgreSQL real.
Fixtures em schema temporário isolado, removido após a coleta.
Cookies e credenciais foram redigidos antes de salvar.

| Evidência | Respostas originais | Imagem renderizada |
|---|---|---|
| Matriz das duas rotas | 02-matriz-autorizacao-curl.txt | 03-matriz-autorizacao.png |
| Sessões inválidas e usuários desativados | 04-sessoes-invalidas.txt | 05-sessoes-invalidas.png |
| Body estrito e identidade persistida | 06-body-identidade.txt | 07-body-identidade.png |
| Papel atual e restrições administrativas | 08-admin-papel-autoalteracao.txt | 09-admin-papel-autoalteracao.png |
| Checkout concorrente autenticado | 10-checkout-concorrente-cookie.txt | 11-checkout-concorrente-cookie.png |

`12-resultados-adicionais.json` reúne respostas e consultas redigidas.
Os scripts de coleta e renderização foram preservados.
As imagens apresentam dados reais renderizados.
Não representam capturas do site ou painel Neon.
O script legado de concorrência permanece intacto.
