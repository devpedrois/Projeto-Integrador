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

## Limites da demonstração

`compradorRef` é sintético e temporário. `POST /pedidos` também exige
`compradorId`, o UUID de um `Usuario` já existente (FK obrigatória desde a
PI4-19.5) — sem autenticação real, quem chama o endpoint ainda escolhe esse
UUID livremente. O modelo `Pagamento` e integrações com gateways financeiros
ficam fora desta demonstração.
