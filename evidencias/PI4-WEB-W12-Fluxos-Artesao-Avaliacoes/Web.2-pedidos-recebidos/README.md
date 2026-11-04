# Web.2: pedidos recebidos e envio por item

Data: 25/10/2026. Branch: `codex/web2-pedidos-recebidos`.
Responsável: Andrews. Revisor indicado: Pedro.

## Resultado final

- Backend: 680 testes aprovados em 64 arquivos.
- Frontend: 904 testes aprovados em 95 arquivos.
- Lint e typecheck aprovados nos dois projetos.
- Prisma validado e fontes formatados.
- Smoke real aprovado em 360/768/1280px.
- Cinco envios refletidos sem novo login do comprador.
- Revisão equivalente concluída sem achados bloqueantes.
- Migration aplicada no Neon com autorização explícita.

## Evidências

- `smoke-visual.json`: cinco envios e uma sessão do comprador.
- `cinco-envios-comprador.gif`: sequência das capturas reais.
- `artesao-*.png` e `comprador-*.png`: 360/768/1280px.
- `envio-1.png` até `envio-5.png`: evolução individual.
- `smoke-visual.log`: execução contra API e PostgreSQL reais.
- `migration-neon.json`: migration aplicada e metadados das colunas.
- `frontend-testes.log`: suíte completa do frontend.
- `backend-testes-final.log`: suíte após aplicar a migration.
- `*-lint.log` e `*-typecheck.log`: verificações por projeto.
- `revisao-seguranca.md`: revisão equivalente autorizada pelo usuário.

O smoke manteve o comprador autenticado durante os cinco envios.
O detalhe foi atualizado pelo botão “Atualizar pedido”.
Cinco itens ficaram enviados; o item alheio permaneceu aguardando.
As doze capturas não apresentaram estouro horizontal.
Nomes extensos também foram exercitados.
Não houve erro JavaScript nas duas páginas.
O schema temporário do smoke foi removido.

## TDD e banco

Os oito testes Web.2 falharam antes da implementação.
A primeira tentativa teve bloqueio DNS do sandbox.
A repetição autorizada executou PostgreSQL real.
Depois da implementação, os oito testes passaram.
Eles cobrem 401/403, 404 alheio, 409 e concorrência.
Os testes frontend falharam antes das novas funcionalidades.
A retenção da listagem entre contas também foi reproduzida.
O teste de regressão passou após a correção.

`backend-testes.log` preserva a execução anterior à migration.
Ela teve 679 sucessos e um checkout com 503.
Essa execução antecedeu a aplicação das novas colunas.
A revisão automática bloqueou aplicar no banco compartilhado.
Após autorização explícita, a migration foi aplicada.
`backend-testes-final.log` registra a execução posterior.

Os logs preservam avisos existentes das dependências.
Incluem TLS do driver PostgreSQL e React `act`.

## Reprodução

Nos dois projetos: `npm run lint`, `npm run typecheck`, `npm test`.
O backend requer as conexões PostgreSQL configuradas localmente.

Para o smoke, iniciar o frontend em modo HTTP:

```powershell
cd frontend
$env:NEXT_PUBLIC_DATA_SOURCE = 'http'
$env:BACKEND_URL = 'http://127.0.0.1:3302'
node node_modules/next/dist/bin/next dev --hostname 127.0.0.1 --port 3002
```

Em outro terminal, executar o harness:

```powershell
cd backend
$env:WEB2_PYTHON = '<executavel Python com Playwright instalado>'
node node_modules/tsx/dist/cli.mjs tests/e2e/web2-smoke.ts
```

O navegador usado é o Chrome instalado localmente.
O harness cria credenciais sintéticas somente em memória.
Cria e remove seu próprio schema PostgreSQL.
Não inicia fila nem modifica pedidos do banco compartilhado.

## Limites documentais

O documento da sprint não contém uma “decisão 2”.
Os campos seguiram o pedido explícito desta subtarefa.
O modelo atual não contém endereço de entrega.
A tela apresenta número, data, comprador e itens existentes.
`CLAUDE.md`, `API.md` e `DATA_MODEL.md` foram atualizados localmente.
Esses três arquivos permanecem ignorados pelo `.gitignore` existente.
Nenhum commit, push ou deploy foi realizado.
