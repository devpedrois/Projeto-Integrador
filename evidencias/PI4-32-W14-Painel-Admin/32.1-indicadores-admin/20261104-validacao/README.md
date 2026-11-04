# 32.1: indicadores gerais do administrador

Validação local em 04/11/2026, fuso America/Sao_Paulo.
Branch: `codex/32-1-indicadores-admin`.
Base inicial: `280bd87`.
Repository reutilizado: `f03999b`, subtarefa 33.3, commit 05.
Nenhum commit, merge ou push realizado nesta subtarefa.

## Entrega

- `GET /admin/indicadores` após a proteção global `/admin`.
- Query estrita vazia; sessão e papel revalidados no banco.
- Receita Decimal serializada com exatamente duas casas.
- `atualizadoEm` ISO UTC após a consulta.
- Respostas privadas com `Cache-Control: no-store`.
- Contrato, service HTTP e composição sem adapter fake novo.
- Card com quatro números, data e quatro estados.
- Recuperação pelo botão “Tentar novamente”.
- Formatação BRL e pt-BR, preservando valores muito grandes.
- OpenAPI, API.md, CLAUDE.md §8 e uso-de-ia.md atualizados.

`CLAUDE.md` permanece ignorado pelo Git, conforme configuração existente.
Os arquivos desta pasta também são evidências locais ignoradas.

## TDD

Os testes foram escritos antes da implementação.
No RED, o endpoint autenticado retornou 404.
As quatro queries inválidas também retornaram 404.
O teste OpenAPI encontrou a operação ausente.
Sete testes da página não encontraram o card.
As proteções existentes já retornavam 401 e 403.

Após implementar, passaram dez integrações e dezesseis testes OpenAPI.
Passaram também trinta testes frontend direcionados.
As integrações usaram PostgreSQL real, sem mocks de repositories.
A massa reproduz os valores conferidos no commit 05:

| Campo | Valor |
|---|---:|
| artesaosAtivos | 3 |
| produtosAtivos | 3 |
| pedidosConfirmados | 4 |
| receitaTotal | "100000000.29" |

Há pedidos pendentes, cancelados e totais nulos na massa.
Itens, fotos e avaliações não multiplicam os números.
Inclui produtos ocultos, sem estoque e de usuários inelegíveis.

## Verificação final

| Verificação | Resultado | Evidência |
|---|---|---|
| Backend, parâmetros do CI | 802/802, 75 arquivos | [backend-ci-tests.txt](backend-ci-tests.txt) |
| Quatro arquivos de carga, separados | 17/17, 4 arquivos | [backend-tests.txt](backend-tests.txt) |
| Backend total | 819/819, 79 arquivos | Soma das execuções acima |
| Frontend completo | 1010/1010, 107 arquivos | [frontend-final-tests.txt](frontend-final-tests.txt) |
| Backend lint e typecheck | Aprovados | [backend-checks.txt](backend-checks.txt) |
| Frontend lint e typecheck | Aprovados | [frontend-checks.txt](frontend-checks.txt) |
| Build backend | Aprovado | [backend-build.txt](backend-build.txt) |
| Build frontend | Aprovado | [frontend-production-build.txt](frontend-production-build.txt) |
| Playwright completo | 5 aprovados, 1 duplicação ignorada | [playwright.txt](playwright.txt) |

O teste administrativo mede dez recargas somente em 1280px.
Sua própria execução percorre as três larguras exigidas.
Por isso, a duplicação do projeto 360px fica ignorada.
Os quatro fluxos E2E anteriores continuaram aprovados.
O microsserviço real recebeu dezesseis chamadas válidas.
O harness confirmou a remoção do schema E2E.

Houve tentativas iniciais bloqueadas pelo sandbox, devidamente repetidas.
O build inicial não conseguiu baixar fontes Google.
A execução autorizada com rede compilou normalmente.
O novo service exigiu atualizar um mock de composição.
A suíte completa passou após esse ajuste de teste.
Os logs iniciais permanecem disponíveis, sem substituir os finais.

Os testes backend cobrem todos os arquivos da suíte.
Os quatro arquivos excluídos pelo CI rodaram separadamente.
O runner npm interpretou inicialmente seus caminhos como filtros.
Essa execução aprovou os dezessete testes desses arquivos.
A execução restante usou diretamente o CLI do Vitest.

## Desempenho e responsividade

Ambiente: Windows, Chrome, Next dev e API locais.
PostgreSQL 16 real em container descartável, porta local 5438.
O E2E criou schema próprio, com migrations e seed demonstrativo.
Nenhuma resposta HTTP foi interceptada ou substituída.

Uma navegação inicial aqueceu a compilação do Next dev.
Depois ocorreram dez recargas completas autenticadas em 1280px.
O relógio começa em `navigationStart`, pela Performance API.
A leitura ocorre após quatro números e data visíveis.
Dois `requestAnimationFrame` garantem oportunidade de pintura.
O tempo inclui documento, hidratação, sessão, API e renderização.
Cada recarga confirmou HTTP 200 e `no-store`.
Os números abaixo não representam cold start do Render.

| Recarga | Card renderizado | Requisição da API |
|---|---:|---:|
| 1 | 391,9 ms | 15,1 ms |
| 2 | 389,9 ms | 26,8 ms |
| 3 | 423,6 ms | 18,8 ms |
| 4 | 452,3 ms | 26,1 ms |
| 5 | 465,3 ms | 28,1 ms |
| 6 | 413,2 ms | 15,9 ms |
| 7 | 396,6 ms | 14,8 ms |
| 8 | 390,3 ms | 18,2 ms |
| 9 | 382,3 ms | 16,4 ms |
| 10 | 398,2 ms | 20,3 ms |

Resultado: dez de dez abaixo de 2000 ms.
Maior tempo: 465,3 ms.

| Viewport | Largura do documento | Largura do body | Rolagem horizontal |
|---|---:|---:|---|
| 360px | 360px | 360px | Não |
| 768px | 768px | 768px | Não |
| 1280px | 1280px | 1280px | Não |

Artefatos originais:

- [Medições e resposta HTTP sanitizada](playwright/028a078050be434c81e0380c0b4605fa/results/admin-indicadores-32-1-ind-02c40-ez-recargas-e-tres-larguras-1280px/indicadores-admin.json).
- [Tabela gerada pelo teste](playwright/028a078050be434c81e0380c0b4605fa/results/admin-indicadores-32-1-ind-02c40-ez-recargas-e-tres-larguras-1280px/medicoes.md).
- [Painel 360px](playwright/028a078050be434c81e0380c0b4605fa/results/admin-indicadores-32-1-ind-02c40-ez-recargas-e-tres-larguras-1280px/admin-360px.png).
- [Painel 768px](playwright/028a078050be434c81e0380c0b4605fa/results/admin-indicadores-32-1-ind-02c40-ez-recargas-e-tres-larguras-1280px/admin-768px.png).
- [Painel 1280px](playwright/028a078050be434c81e0380c0b4605fa/results/admin-indicadores-32-1-ind-02c40-ez-recargas-e-tres-larguras-1280px/admin-1280px.png).
- [Relatório Playwright](playwright/028a078050be434c81e0380c0b4605fa/html/index.html).

O seed E2E e os testes anteriores alteram os agregados.
Portanto, screenshots E2E diferem da massa controlada de integração.
Ambas as execuções usam o mesmo repository real.
A evidência de rede está no JSON, sem cookies.

## Revisão equivalente de segurança

Revisão nesta conversa, conforme opção expressa do responsável.
O agente `security-auditor` não foi acionado por essa escolha.

| Aspecto | Evidência conferida | Resultado |
|---|---|---|
| Autorização | Router montado após `app.use("/admin", ...)` | Herda autenticação e papel admin |
| Papel persistido | Comprador/artesão com claim admin recebem 403 | Sem elevação pelo claim JWT |
| Conta desativada | Admin desativado recebe 401 | Sessão revalidada no banco |
| Input | Zod estrito rejeita campos, arrays e query aninhada | Sem seleção externa de identidade |
| Consultas | Reuso do repository do commit 05 | Somente leitura e SQL parametrizado |
| Resposta | Apenas quatro agregados e timestamp | Sem dados pessoais ou segredos |
| Cache | Middleware, controller e ApiClient usam no-store | Sem cache compartilhado privado |
| Interface | DTO validado, renderização React e remount por conta | Respostas antigas descartadas |
| Precisão | Decimal no backend e BigInt na formatação | Sem perda de centavos |
| Evidências | JSON limitado a path, status, cache e agregados | Sem cookies ou credenciais |

Nenhum achado impeditivo identificado na alteração.

## Reproduzir

Backend no ambiente de teste, com conexões já configuradas:

```powershell
node node_modules/vitest/vitest.mjs run tests/integration/indicadores-admin.route.integration.test.ts tests/unit/openapi.test.ts --testTimeout=60000 --hookTimeout=120000
```

Frontend:

```powershell
npm test
npm run lint
npm run typecheck
npm run build
```

Para o E2E, configure `E2E_DATABASE_URL` separado do desenvolvimento.
Configure também `E2E_CHROMIUM_EXECUTABLE_PATH` e `E2E_ARTIFACT_DIR`.
Então execute `node e2e/run.mjs` dentro de `frontend/`.
O harness cria e remove seu schema automaticamente.
