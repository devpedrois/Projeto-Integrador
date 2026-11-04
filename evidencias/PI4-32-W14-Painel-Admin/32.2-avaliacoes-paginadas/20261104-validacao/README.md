# 32.2: avaliações públicas paginadas

Validação local em 04/11/2026, fuso America/Sao_Paulo.
Branch: `codex/32-2-avaliacoes-paginadas`.
Base inicial: `747b528`.

## Resultado

`GET /avaliacoes` aceita somente produtoId, limit e offset.
O limite padrão é 10, com faixa 1–50.
O offset padrão é zero, com inteiros seguros não negativos.
Entradas inválidas ou desconhecidas recebem 400 `VALIDACAO`.

Página e agregado compartilham uma transação PostgreSQL RepeatableRead.
O banco calcula AVG e COUNT sobre todas as avaliações.
A média mantém arredondamento para uma casa na leitura.
Somente os itens da página são carregados na aplicação.
A ordem é `criadoEm DESC, id ASC`.
Página vazia preserva média e total globais.

A resposta pública omite compradorId, nome e email.
A interface mostra nota, comentário e data, sem autor identificado.
A resposta autenticada do POST mantém o contrato anterior.
Não havia cache compartilhado em GET /avaliacoes.
Foi preservado `Cache-Control: no-store`.
O POST continua invalidando catálogo e recomendações.

O produto demo é “Boneca de Barro Pintada”, `produto-seed-03`.
Possui 35 comentários, compradores distintos e compras confirmadas anteriores.
Cada pedido tem item, preço congelado e pagamento simulado coerentes.
O seed mantém IDs determinísticos e usa upserts.
Duas execuções preservaram as contagens e os mesmos registros.

## TDD

Os testes foram escritos e executados antes da implementação.
No RED, a API rejeitou os novos parâmetros com 400.
Sem parâmetros, devolveu 35 itens em vez de dez.
O seed não possuía avaliações no produto escolhido.
O OpenAPI não documentava limit e offset.
Os quatro testes de componente não encontraram a seção.

O teste de integração usa distribuição propositalmente desigual:
trinta notas 5 e cinco notas 1.
O cálculo manual é 155 / 35 = 4,428… → 4,4.
Assim, calcular a média somente da página quebra o teste.
Há timestamps empatados para conferir o desempate pelo ID.

| Página | Offset | Itens | Média global | Total global |
|---|---:|---:|---:|---:|
| 1 | 0 | 10 | 4,4 | 35 |
| 2 | 10 | 10 | 4,4 | 35 |
| 3 | 20 | 10 | 4,4 | 35 |
| 4 | 30 | 5 | 4,4 | 35 |

Essa massa controlada difere do seed demonstrativo.
No seed, sete repetições de notas 1–5 produzem média 3,0.

## Verificações

| Verificação | Resultado | Evidência |
|---|---|---|
| Backend completo | 839/839, 81 arquivos | [backend-tests.txt](backend-tests.txt) |
| Frontend completo | 1022/1022, 109 arquivos | [frontend-tests.txt](frontend-tests.txt) |
| OpenAPI | 17/17, incluídos no backend completo | backend/tests/unit/openapi.test.ts |
| Integração nova de paginação | 13/13, incluídos no backend completo | backend/tests/integration/avaliacoes-paginadas.32-2.integration.test.ts |
| Seed e idempotência | 5/5, incluídos no backend completo | backend/tests/integration/seed.integration.test.ts |
| Cinco médias da 32.3 | 5/5, incluídas no backend completo | backend/tests/integration/avaliacoes-media.32-3.integration.test.ts |
| Backend lint e typecheck | Aprovados | [backend-checks.txt](backend-checks.txt) |
| Frontend lint e typecheck | Aprovados | [frontend-checks.txt](frontend-checks.txt) |
| Backend build | Aprovado | [backend-build.txt](backend-build.txt) |
| Frontend build | Aprovado | [frontend-build.txt](frontend-build.txt) |
| Paginação Playwright | 2/2 aprovados | [playwright-final.txt](playwright-final.txt) |

Os testes de banco usam PostgreSQL 16 real e descartável.
Nenhum repository ou banco foi substituído por mock.
O frontend cobre navegação, limites, loading, vazio e recuperação.
Também valida páginas incompletas e descarte de identidade extra.

O primeiro E2E mostrou a tela inicial de acesso.
O roteiro foi corrigido para selecionar “Continuar como visitante”.
Também foi instalado o FFmpeg exigido pelo diagnóstico do Playwright.
A repetição aprovou os dois testes, sem retry.
O log inicial permanece em [playwright.txt](playwright.txt).
Nele, os cinco E2E anteriores passaram normalmente.
A duplicação administrativa em 360px permanece ignorada pelo próprio teste.

## Navegação real e capturas

O teste usa Next dev, API e microsserviço reais.
O harness aplica migrations e o seed em schema isolado.
As respostas HTTP não são interceptadas nem simuladas.
Percorre páginas 1–4 e volta para a terceira.
Confere 10/10/10/5 itens e média 3,0 com total 35.
Verifica ausência de compradorId no JSON recebido.
Confere ausência de rolagem horizontal nos dois viewports.
O harness confirmou a remoção do schema ao terminar.

- [Página 1 em 360px](playwright/3ab0a7a8f8d244388bed80a8856fbdd2/results/produto-avaliacoes-32-2-pr-d76b7-paginas-de-avaliacoes-reais-360px/produto-pagina-1-360px.png).
- [Página 4 em 360px](playwright/3ab0a7a8f8d244388bed80a8856fbdd2/results/produto-avaliacoes-32-2-pr-d76b7-paginas-de-avaliacoes-reais-360px/produto-pagina-4-360px.png).
- [Página 1 em 1280px](playwright/3ab0a7a8f8d244388bed80a8856fbdd2/results/produto-avaliacoes-32-2-pr-d76b7-paginas-de-avaliacoes-reais-1280px/produto-pagina-1-1280px.png).
- [Página 4 em 1280px](playwright/3ab0a7a8f8d244388bed80a8856fbdd2/results/produto-avaliacoes-32-2-pr-d76b7-paginas-de-avaliacoes-reais-1280px/produto-pagina-4-1280px.png).
- [Relatório Playwright final](playwright/3ab0a7a8f8d244388bed80a8856fbdd2/html/index.html).

## Revisão equivalente de segurança

Realizada nesta conversa, seguindo a opção já autorizada.
Não houve delegação ao agente security-auditor.

| Aspecto | Verificação |
|---|---|
| Query | Zod estrito, inteiros seguros, limite máximo 50 |
| SQL | Prisma parametrizado, sem interpolação de input |
| Privacidade | Select e DTO público sem identidade do comprador |
| Visibilidade | Mantida a checagem de produto público antes da leitura |
| Consistência | Página e agregado no mesmo snapshot RepeatableRead |
| Cache | GET no-store; invalidação do POST preservada |
| Interface | Renderização React de texto, sem HTML arbitrário |
| Seed | Somente dados sintéticos, compras anteriores e IDs estáveis |
| Testes | Schema temporário e limpeza pelo helper existente |
| Evidências | Sem cookies, tokens ou credenciais reais |

Nenhum achado impeditivo identificado na alteração.

## Documentação e Git

OpenAPI, `docs/docs auxiliares/API.md` e `CLAUDE.md` §8 atualizados.
`docs/uso-de-ia.md` registra o apoio efetivamente prestado.
`CLAUDE.md` e esta pasta permanecem ignorados pelo Git.
Nenhuma subtarefa futura foi antecipada.
Não houve commit, merge ou push nesta subtarefa.

## Reproduzir

Dentro de backend, com conexões de teste configuradas:

```powershell
node node_modules/vitest/vitest.mjs run --testTimeout=60000 --hookTimeout=120000
npm run lint
npm run typecheck
npm run build
```

Dentro de frontend:

```powershell
npm test
npm run lint
npm run typecheck
npm run build
```

Configure E2E_DATABASE_URL, E2E_CHROMIUM_EXECUTABLE_PATH e E2E_ARTIFACT_DIR.
Então execute `node e2e/run.mjs produto-avaliacoes.spec.ts` no frontend.
O harness cria e remove seu schema automaticamente.
