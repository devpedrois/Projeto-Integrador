# Web.4: compra verificada para avaliações

Data: 22/10/2026. Responsável: Luiz Rocha. Revisor: Pedro.
Branch: `codex/web4-verified-reviews`.

## Comportamento implementado

POST exige pedido confirmado do comprador contendo o produto.
Sem compra confirmada recebe 403 `COMPRA_NAO_VERIFICADA`.
Checagem e insert compartilham a transação Prisma.
FOR SHARE bloqueia o pedido e item até o commit.
GET autenticado de elegibilidade orienta o formulário.
Sucesso retorna motivo nulo; rejeições indicam o motivo contratado.
O botão não aparece para comprador sem compra confirmada.
Pedidos pendentes, cancelados e alheios não autorizam avaliações.
A média continua calculada na leitura.

## TDD e cenários

Testes de integração foram escritos antes da implementação.
O primeiro ciclo registrou 13 falhas e um sucesso.
Houve POST indevido retornando 201 para comprador sem compra.
Depois da implementação, os 14 cenários Web.4 passaram.
O log preservado é a execução verde final, sem reconstrução do RED.

As três contas são sintéticas e persistidas no PostgreSQL:

| Conta ou cenário | Resultado verificado |
|---|---|
| Comprador com compra confirmada | Elegibilidade true/null; POST 201; nova consulta false/ja_avaliou; repetição 409 |
| Comprador sem compra correspondente | Elegibilidade false/nao_comprou; POST 403; nenhuma avaliação inserida |
| Artesão | GET e POST 403 |
| Anônimo | GET e POST 401 |
| Pedido pendente ou cancelado | POST 403 |
| Pedido de outro comprador | POST 403 |
| Cancelamento após GET positivo | POST revalida e devolve 403 |
| Avaliação legada sem compra | Permanece não elegível e POST 403 |
| Query inválida ou identidade externa | 400 VALIDACAO sem detalhes internos |
| Mesma transação | Trigger BEFORE INSERT exige lock de autorização na própria conexão PostgreSQL |
| Cache aquecido e POST rejeitado | Cache permanece HIT |
| Interface sem compra | Sem formulário, botão de envio ou POST |
| Interface com GET positivo e POST 403 | Formulário removido após resposta da API |
| Adapter HTTP | Cookie de sessão, sem compradorId no transporte; respostas inválidas não concedem acesso |

Schemas temporários são criados e removidos pelo helper existente.
Não foram usados mocks de banco ou repositories.
Testes de interface simulam somente o transporte HTTP.

## Execução

Na pasta backend:

```powershell
npm test -- tests/integration/avaliacoes.web4.integration.test.ts
npm test
npm run lint
npm run typecheck
```

Na pasta frontend:

```powershell
npm test
npm run lint
npm run typecheck
```

Logs: `backend-web4.txt`, `backend-testes.txt`, `frontend-testes.txt`.
Backend: 662 testes passaram em 62 arquivos.
Frontend: 889 testes passaram em 93 arquivos.
Execução específica Web.4: 14 testes de integração passaram.
Lint e typecheck passaram nos dois projetos.
Prettier passou em todos os arquivos TypeScript alterados.
Resultados completos das suítes constam nos logs correspondentes.
Os logs registram avisos existentes de PostgreSQL e React act.
Nenhum teste falhou nas execuções finais.

## Índices e documentação

Inspecionados e reutilizados, sem migration:

- `ItemPedido_pedidoId_idx` e `ItemPedido_produtoId_idx`;
- prefixo comprador de `Pedido_compradorId_criadoEm_idx`;
- UNIQUE comprador/produto em Avaliacao.

OpenAPI, API.md e CLAUDE.md seção 8 foram atualizados.
Declaração de IA registra Luiz Rocha e Pedro.
API.md, CLAUDE.md e evidencias já são ignorados pelo Git.
Essa configuração foi preservada.

Revisão equivalente: `revisao-seguranca.md`.
Nenhum commit, push ou deploy foi executado nesta subtarefa.
Esta evidência comprova execução local, sem smoke publicado.
