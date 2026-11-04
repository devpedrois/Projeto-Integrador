# WEB-03: autenticação no backend

Data: 13/10/2026, America/Sao_Paulo.
Branch: `codex/web-03-auth`.
Runtime verificado: Node.js 24.19.0.
Dados sintéticos; PostgreSQL real, sem mocks de repositories.

## TDD observado

| Execução | Resultado observado |
|---|---|
| Supertest antes da implementação | 33 falhas por HTTP 404; 1 teste passou |
| Remoção do probe antes da implementação | 2 falhas por HTTP 200, esperado 404 |
| Remoção da configuração antes da correção | 3 falhas em ENABLE_COOKIE_PROBE |
| JSON malformado antes da correção | 2 falhas por HTTP 503, esperado 400 |
| Primeira implementação de auth e remoção do probe | 39 testes passaram |
| Suíte completa após correções | 242 testes passaram em 31 arquivos |

## Aceite

| Critério | Evidência automatizada |
|---|---|
| Cadastro comprador | 201, email normalizado e Carrinho persistido |
| Cadastro artesão | 201, PerfilArtesao incompleto e campos opcionais nulos |
| Papel administrativo público | 400; nenhum usuário persistido |
| Email em uso | 409 com normalização e em duas requisições simultâneas |
| Senha no banco | Hash lido por Prisma; prefixo `$2b$10$` e compare real válido |
| Atomicidade comprador/artesão | Trigger real falha no segundo insert; usuário ausente depois |
| Recuperação após rollback | Mesmo email pode ser cadastrado após a falha |
| Sem login automático | Cadastro não emite cookie; /auth/me retorna 401 |
| Três logins inválidos | Status 401 e igualdade de string em response.text |
| Email inexistente | Spy observa bcrypt.compare real com hash fixo custo 10 |
| Sessão de 24h | JWT verificado; exp menos iat igual a 86400 |
| Cookie | HttpOnly, SameSite=Lax, Path=/, Max-Age=86400, sem Domain |
| Secure configurável | Verificado para COOKIE_SECURE true e false |
| Usuário público | Corpo contém exatamente id, nome, email e papel |
| Logout | 204, cookie expirado; próxima consulta recebe 401 |
| JWT inválido | 401 para assinatura, algoritmo, expiração e claims inválidos |
| Usuário desativado | /auth/me reconsulta banco e retorna 401 |
| Segredo ausente | Login válido retorna 503 sem cookie |
| JSON inválido | 400 sem corpo original ou detalhes internos |
| Probe removido | GET e POST retornam 404, inclusive configuração legada |

Fonte: `backend/tests/integration/auth.routes.integration.test.ts`, 36 cenários.
Regressão: testes unitários de ambiente e health-cookie.
O schema temporário WEB-03 é isolado e removido após execução.
Nenhuma migration de produção foi criada nesta subtarefa.

## Validações finais

Comandos executados dentro de backend/, usando Node.js 24:

```text
npm run lint       -> exit 0
npm run typecheck  -> exit 0
npm test          -> exit 0, 242 passed, 31 files passed
npm run build     -> exit 0, Prisma Client 7.10.0 gerado
```

Prettier executado nos arquivos TypeScript alterados.
O aviso PostgreSQL sobre sslmode=require já existia no ambiente.
Nenhuma senha, hash completo, JWT ou connection string consta aqui.

## Revisão de segurança local

O responsável escolheu revisão nesta conversa, sem delegação.
A revisão equivalente ao security-auditor verificou:

- Cadastro administrativo e campos extras bloqueados na borda.
- Hash bcrypt fora das respostas e logs da aplicação.
- Compare realizado antes de rejeitar usuário inativo.
- Hash fixo sintético para email inexistente.
- Assinatura HS256 e validação de claims e expiração.
- Cookie HttpOnly, SameSite=Lax e Secure configurável.
- Nenhum segredo padrão ou fallback inseguro.
- Reconsulta do usuário ativo no endpoint de sessão.
- Transação curta; bcrypt executado antes de abrir a transação.
- Queries Prisma parametrizadas, sem SQL de usuário concatenado.
- Falhas de persistência sem detalhes internos na resposta.
- Diff restrito à WEB-03 e retirada do probe.

`npm audit --json` retornou sete alertas preexistentes:
@prisma/config, deepmerge-ts, fast-uri, mysql2, prisma,
proxy-addr e source-map-js.
Total: um moderado, cinco altos e um crítico.
As versões afetadas são idênticas às versões no HEAD anterior.
As novas dependências de autenticação não aparecem nos alertas.
Correção global dessas dependências não pertence à WEB-03.

Logout expira o cookie, sem revogar cópias externas do JWT.
Proteção das rotas existentes pertence à WEB-04.
Nenhum commit, push ou deploy foi realizado.
