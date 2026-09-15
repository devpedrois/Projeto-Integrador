# Backend FCCPD

Este backend atende somente à demonstração FCCPD em desenvolvimento.

O servidor aceita apenas conexões locais em `127.0.0.1`.
`NODE_ENV` aceita somente `development` ou `test`.
`NODE_ENV=production` impede a inicialização do backend.
Falhas de inicialização retornam somente `Backend startup failed`.

## Requisitos

- Node.js 24
- npm
- PostgreSQL configurado no Neon
- `DATABASE_URL` configurada no ambiente
- `DIRECT_URL` configurada no ambiente

Nunca registre valores dessas variáveis no repositório.

## Execução

Instale as dependências e gere o cliente Prisma:

```powershell
npm install
npm run prisma:generate
```

Execute as migrations e a carga idempotente:

```powershell
npm run db:migrate
npm run db:seed
```

Inicie o servidor e execute os testes:

```powershell
npm run dev
npm test
```

Use `npm run build`, `npm run typecheck` e `npm run lint` antes da entrega.

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

## Limites da demonstração

`compradorRef` é sintético e temporário. `POST /pedidos` também exige
`compradorId`, o UUID de um `Usuario` já existente (FK obrigatória desde a
PI4-19.5) — sem autenticação real, quem chama o endpoint ainda escolhe esse
UUID livremente. O modelo `Pagamento` e integrações com gateways financeiros
ficam fora desta demonstração.
