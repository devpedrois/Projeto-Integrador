# 31.3: E2E Playwright

Data: 25/10/2026, horário de Brasília.
Responsável: Sergio. Revisor indicado: Pedro.
Branch: `codex/31-3-playwright-e2e`.
Base: `3d77bb3`, com alterações locais desta subtarefa.

Express e Next.js reais, com transporte HTTP.
PostgreSQL real na branch sintética Neon já configurada.
Cada rodada aplicou migrations e seed demo próprios.
Nenhum mock de banco ou API nos fluxos E2E.
Chromium instalado usado via `E2E_CHROMIUM_EXECUTABLE_PATH`.

| Rodada | Início Brasília | Passaram | Falharam | Pulados | Flaky | Duração |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | 18:37:05 | 4 | 0 | 0 | 0 | 49,4s |
| 2 | 18:38:01 | 4 | 0 | 0 | 0 | 40,7s |
| 3 | 18:38:43 | 4 | 0 | 0 | 0 | 40,5s |

Cada rodada inclui os dois fluxos nos dois viewports.
Todos passaram na primeira tentativa, com retries desabilitados.
Os JSONs registram os resultados individuais e os tempos.
Os logs registram o comando `npm run test:e2e` completo.

Relatórios:

- [Rodada 1, com traces](rodada-1/757a129f92694e3eb9d09d8f6686a7ba/html/index.html).
- [Rodada 2](rodada-2/789cc8012a854ddeb85b1750c35ed931/html/index.html).
- [Rodada 3](rodada-3/a7a3261839664b3080cefa119bf039b9/html/index.html).
- [Trace do envio em 360px](rodada-1/757a129f92694e3eb9d09d8f6686a7ba/results/fluxos--b-artesao-envia-e-comprador-acompanha-Enviado-360px/trace.zip).

A primeira rodada usou `--trace=on` para salvar evidência.
O padrão permanece `on-first-retry` para trace e vídeo.
Os traces foram sanitizados, incluindo cópias do HTML.
A inspeção dos ZIPs confirmou zero credenciais detectadas.
Fontes embutidas foram removidas, preservando ações e imagens.

Cada rodada contém `runtime.json` e `cleanup.json`.
Os três arquivos de limpeza registram `removed: true`.
Consulta independente confirmou zero schemas `e2e31_*` restantes.

Validações adicionais:

- Frontend: lint e typecheck aprovados.
- Backend: lint e typecheck aprovados.
- Frontend: 943 testes aprovados em 101 arquivos.
- Backend: 267 testes unitários aprovados em 21 arquivos.
- Sanitização: regressão focada aprovada após ajuste final.
- Formatação dos arquivos alterados conferida com Prettier.
- Diff conferido respeitando CRLF dos arquivos existentes.

TDD: o teste do entrypoint falhou antes da implementação.
O teste de sanitização também apresentou falhas esperadas.
Ambos passaram após as respectivas implementações.
O sandbox impediu arquivos SSR temporários do Vitest backend.
A reexecução fora dele passou integralmente nos testes unitários.

Revisão equivalente realizada nesta conversa, sem delegação.
Conferidos isolamento das sessões, schemas e destinos protegidos.
Conferidos UUID estrito, SQL e limpeza limitada ao schema próprio.
Conferidas ausência de mocks, credenciais e alterações no CI.
Revisão humana de Pedro permanece sob responsabilidade do projeto.
Workers de notificação e smoke publicado ficam fora desta prova.
