# P1: build backend independente do frontend

Data: 02/11/2026.
Base: 1786ad0.
Branch: codex/fix-backend-build-isolation.

## Causa confirmada

backend/tsconfig.json incluía scripts/web6-evidencias.ts.
Esse script manual importa Playwright de frontend/node_modules.
Render e o job backend instalam somente dependências backend.
A ausência desse módulo produz TS2307 e dois TS7006.
A instalação local completa mascarava essa dependência indevida.

O [run 41504513337](https://github.com/devpedrois/Projeto-Integrador/actions/runs/41504513337)
confirma esses três erros no typecheck de 1786ad0.
[Log consultado](00-github-falha.txt).
O log Render fornecido contém os mesmos diagnósticos.

## Correção

O tsconfig exclui somente o script manual de evidências.
node_modules e dist também permanecem excluídos.
API, worker, Prisma, scripts restantes e testes continuam checados.
strict e todas as verificações existentes permanecem habilitados.
Nenhuma dependência ou versão foi alterada.
O script Web.6 permanece disponível para execução manual.
Sua execução continua exigindo as dependências frontend instaladas.

## TDD e instalação independente

Teste: compila API e worker sem instalar dependencias do frontend.
Arquivo: backend/tests/unit/build-isolation.test.ts.

O teste copia fontes/configuração e fixtures para diretório temporário.
Disponibiliza somente as dependências backend por junction/symlink.
Executa o compilador TypeScript real, sem mocks.
Confirma emissão de server.js e worker.js, sem script manual.
Remove somente seu diretório temporário no finally.

| Evidência | Resultado |
| --- | --- |
| [01-red.txt](01-red.txt) | Falha pelos mesmos TS2307 e dois TS7006. |
| [02-green.txt](02-green.txt) | Regressão aprovada após a correção. |
| [03-build.txt](03-build.txt) | npm run build aprovado. |
| [04-lint.txt](04-lint.txt) | Lint aprovado. |
| [05-typecheck.txt](05-typecheck.txt) | Typecheck aprovado. |
| [06-backend-tests.txt](06-backend-tests.txt) | Suíte padrão: 759 aprovados, 1 timeout de 5s no catálogo, 73 arquivos. |
| [07-npm-ci-isolado.txt](07-npm-ci-isolado.txt) | npm ci --include=dev em instalação nova. |
| [08-build-isolado.txt](08-build-isolado.txt) | npm run build sem frontend/node_modules aprovado. |
| [09-typecheck-isolado.txt](09-typecheck-isolado.txt) | Typecheck da instalação nova aprovado. |
| [10-teste-isolado.txt](10-teste-isolado.txt) | Regressão executada na instalação nova: 1/1. |
| [11-format.txt](11-format.txt) | Formatação aprovada. |
| [12-ci-tests.txt](12-ci-tests.txt) | 743/743 em 69 arquivos, com limites/exclusões do CI. Catálogo também aprovado. |

A instalação independente não recebeu arquivos .env reais.
Prisma generate utilizou configuração sintética, sem acessar banco.
Os arquivos package.json e package-lock.json vieram do backend.
Node local: 22.12.0, Windows; npm: 10.9.0.
O log Render usa Node 24.21.0 em Linux.
Não se atribui esta validação ao ambiente remoto do Render.
Os avisos de engine locais não impediram essas verificações.

## Revisão equivalente de segurança

Revisão realizada nesta conversa, conforme escolha anterior do responsável.
Não houve delegação ao agente security-auditor.
O ajuste altera somente o escopo da compilação.
Não desabilita tipagem estrita, validação ou autorização.
Não adiciona dependências, credenciais ou acesso ao banco.
As cópias temporárias do teste não incluem arquivos .env.
Nenhum achado bloqueante identificado neste ajuste.

## Limites da entrega

CI e Render ainda precisam executar a correção publicada.
O run remoto citado comprova a falha anterior.
Entrega destinada a commit e merge locais.
Não inclui push, redeploy ou fechamento da issue #1.

A suíte padrão falhou exclusivamente por limite de tempo.
Caso: reflete moderacao e estoque imediatamente nas leituras.
Arquivo: backend/tests/integration/catalogo.routes.integration.test.ts.
Erro preservado: Test timed out in 5000ms.
O workflow existente usa testTimeout=60000 e hookTimeout=120000.
A repetição reproduz esses limites e suas quatro exclusões existentes.
Nenhum teste de catálogo nem timeout do projeto foi alterado.

A repetição com configuração do CI passou integralmente.
Foram 743 testes em 69 arquivos, sem falhas.
A execução foi local; o CI remoto permanece não reexecutado.
