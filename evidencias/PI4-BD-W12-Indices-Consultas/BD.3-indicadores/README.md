# BD.3: indicadores de vendas por artesão

Data: 22/10/2026, America/Sao_Paulo.
Branch: `codex/bd-3-indicadores-artesao`.
Responsável: Eliziane. Revisão informada: Pedro.

## Implementação e contrato

`GET /artesao/indicadores` segue Route, Controller, Service e Repository.
Autenticação e papel atual `artesao` são obrigatórios.
A identidade vem somente da sessão revalidada.
A query deve ser vazia; campos externos recebem 400.
As respostas usam `Cache-Control: no-store`.

O Repository executa uma consulta `$queryRaw` parametrizada.
A subquery agrega ItemPedido por produto e pedido confirmado.
O JOIN com Produto restringe os resultados ao artesão autenticado.
Pedidos distintos são contados após esse filtro.
Receita soma subtotais históricos, sem usar preço atual.
Produtos ocultos ou sem estoque conservam vendas históricas.
Sem vendas confirmadas retorna zeros e última venda nula.
Nenhum índice, migration, cache ou frontend foi acrescentado.

Última venda usa `Pedido.criadoEm`, conforme o modelo disponível.
Atualização usa `statement_timestamp()` da consulta PostgreSQL.
Receita é arredondada no SQL e convertida para number.
JSON numérico não conserva zeros decimais à direita.

## Testes e revisão

`red.txt`: nove falhas esperadas pela ausência da rota.
`green.txt`: nove casos novos e oito casos OpenAPI aprovados.
Os testes usam PostgreSQL real em schema isolado.
O helper existente remove o schema no encerramento.
Não existem mocks de repository ou banco nos testes novos.

Cobertura: pedidos confirmados com dois artesãos, itens repetidos,
vários produtos próprios, pendentes/cancelados, zeros, autenticação,
papéis atuais revalidados, query externa e OpenAPI.
Fotos e avaliações múltiplas não multiplicam os totais.
O horário foi comparado ao relógio do mesmo PostgreSQL.
Isso evita assumir sincronização exata entre Windows e Neon.

`backend-lint.txt`, `backend-typecheck.txt` e `formatacao.txt` registram verificações.
`backend-test.txt` registra a suíte backend completa.
Resultado backend: 607 testes aprovados em 59 arquivos.
`frontend-test.txt` registra 844 aprovações em 89 arquivos.
Lint e typecheck frontend constam nos arquivos correspondentes.
`revisao-seguranca.md` registra a revisão equivalente autorizada anteriormente.
Não houve delegação, commit ou push.

O primeiro lint detectou duas asserções não nulas nos testes.
Elas foram corrigidas; lint e typecheck foram reexecutados com sucesso.
O processo combinado conserva o código inicial desse lint antigo.
A suíte completa terminou com `tests=0`, sem falhas.
Os logs individuais finais registram as verificações posteriores.

Comando direcionado, dentro de `backend/`:

```powershell
npm.cmd test -- tests/integration/indicadores.route.integration.test.ts tests/unit/openapi.test.ts --testTimeout=60000 --hookTimeout=120000
```

Suíte completa backend usa os mesmos limites da CI, sem exclusões.
Frontend usa `npm.cmd test`.

## Conferência de volume

`conferencia-volume.md` contém a tabela dos cinco artesãos.
`conferencia-volume.json` registra respostas completas e comparações.
`conferir-volume.mjs` contém a chamada HTTP e SQL independente.

Fonte: conexão `DATABASE_URL_VOLUME`, schema `public`.
Massa existente: 1.000 produtos e 1.500 pedidos confirmados.
Cinco artesãos ativos com vendas foram selecionados por UUID.
Comparados: quantidade, receita, pedidos distintos e última venda.
O instante de atualização foi validado no relógio PostgreSQL.
Divergência total: zero.

Toda conferência executou em REPEATABLE READ READ ONLY.
HTTP e SQL independente compartilharam a mesma conexão e snapshot.
Nenhuma migration ou seed foi aplicada nessa branch.
Credenciais, JWTs e segredo efêmero não foram registrados.

Reprodução, dentro de `backend/`:

```powershell
node --import tsx ../evidencias/PI4-BD-W12-Indices-Consultas/BD.3-indicadores/conferir-volume.mjs
```

OpenAPI e uso de IA foram atualizados.
`docs/docs auxiliares/API.md` e `CLAUDE.md` também foram atualizados.
Esses dois documentos são ignorados pelo Git neste repositório.
