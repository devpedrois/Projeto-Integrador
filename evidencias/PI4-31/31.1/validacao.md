# 31.1: validação da integração contínua

Data: 22/10/2026. Branch Git: `codex/31-1-github-actions`.

## Implementação

- Workflow em push e pull_request, com jobs frontend e backend.
- Node 22, npm ci, cache por package-lock, permissões contents: read.
- Concurrency por branch cancela execuções anteriores.
- Backend gera Prisma e executa migrate deploy antes das verificações.
- JWT gerado por openssl rand, registrado como máscara antes do uso.
- DATABASE_URL_TEST e DIRECT_URL_TEST ficam nos repository secrets.
- A branch Neon ci foi criada somente com schema, sem copiar dados.
- A interface Tables confirmou zero tabelas no schema public.
- Nenhuma migration foi aplicada localmente ao demo ou deploy.
- A decisão 4 está ausente; o responsável confirmou essa ausência.
- Foram seguidas as conexões especificadas diretamente no pedido.

## Teste falhando e recuperação

Um teste temporário esperava `1` igual a `2`.
Ele foi acrescentado em `frontend/tests/config/next-config.test.ts`.
O arquivo foi restaurado integralmente ao final, sem commit.

Foi executado o comando `npm test` extraído do YAML.
A execução usou Bash com `-e -o pipefail`.
Uma etapa sentinela após o teste não foi executada.
Resultado: falha detectada, exit code 1, execução interrompida.
Log: `contraprova.log`.
Após a restauração, os 14 testes desse arquivo passaram.

## Cópia limpa

Fontes versionadas foram extraídas de HEAD, sem arquivos .env.
O primeiro typecheck revelou dependências e cliente Prisma ausentes.
Os testes do frontend importam contratos TypeScript do backend.
Instalar dependências e gerar o Prisma resolveu essa falha.
O novo generate.config.ts não contém datasource nem carrega dotenv.
A geração também passou com variáveis de conexão removidas.

Nessa cópia, passaram lint, typecheck, 842 testes e build do frontend.
Lint e typecheck backend passaram após adicionar a configuração.
Actionlint 1.7.12, Prettier dos novos arquivos e diff check passaram.

## Seleção da suíte de CI

O comando backend seleciona 50 arquivos de teste.
Exclui somente integrações que acionam cargas proibidas no pedido:

- concorrencia-script.integration.test.ts;
- db-explain.integration.test.ts;
- recomendacao-volume.integration.test.ts;
- seed-volume.integration.test.ts.

A lista está em `testes-ci-selecionados.log`.
Os testes unitários do gerador permanecem incluídos.

## PostgreSQL local

A primeira execução completa teve 549 testes aprovados e duas falhas.
Uma rodada de checkout excedeu o timeout padrão de 5 segundos.
A rodada seguinte encontrou FK durante a limpeza dos pedidos.
Nova execução completa passou com timeouts de teste de 15 segundos.
Hooks receberam 30 segundos, como no YAML.
Resultado: 54 arquivos e 551 testes aprovados, exit code 0.
Log sanitizado: `backend-suite.log`.

## Revisão de segurança equivalente

Revisão nesta conversa, conforme escolha anterior do responsável.
Nenhuma delegação foi realizada.

- Diff e novos arquivos sem connection strings secretas.
- Ações fixadas por SHA completo; checkout não persiste credenciais.
- Token do workflow limitado a leitura do conteúdo.
- Job frontend não recebe secrets nem exige conexão real.
- Preflight recusa conexão ausente ou inválida, sem imprimir valores.
- Senhas codificadas e decodificadas são mascaradas antes do Prisma.
- JWT aleatório é mascarado antes de escrever no GITHUB_ENV.
- Nenhum pull_request_target, eval ou interpolação de input em shell.
- PRs de forks falham no preflight por ausência dos secrets.
- CLI confirmou apenas os dois nomes dos secrets configurados.

## Validação remota

A primeira execução remota falhou em ambos os jobs.
Link: https://github.com/devpedrois/Projeto-Integrador/actions/runs/39848877000
O frontend teve dez falhas no formulário de produto.
O teste selecionava a categoria antes do carregamento terminar.
O backend teve dois documentos ausentes e catálogo vazio.
As migrations backend passaram; lint e typecheck passaram nos dois jobs.
O workflow remoto verde continua pendente de nova publicação.
O responsável fará o push pessoalmente.

## Correção após a execução remota

Branch: `codex/31-1-ci-fixes`.

- O helper do formulário aguarda a opção carregada.
- Dois documentos exigidos pelas suítes receberam exceções no gitignore.
- As exceções não incluem outros documentos dessas pastas.
- O teste de métricas cria cinco produtos num schema isolado.
- Três produtos são elegíveis; há um inativo e um esgotado.
- O schema recebe migrations e é removido após o teste.
- Nenhum seed demo ou de volume foi alterado.
- Nenhum teste foi removido, ignorado ou teve assertions enfraquecidas.
- As três suítes backend afetadas passaram, com onze testes.
- Os treze testes do formulário passaram.
- Lint e typecheck de ambos os projetos passaram.
- A revisão equivalente conferiu isolamento, credenciais e escopo.
- Os documentos não contêm conexões secretas ou tokens.
- LOGINS_TESTE.md contém somente credenciais sintéticas já documentadas.

Logs da falha: `frontend-github-failure.log` e `backend-github-failure.log`.
Logs das suítes corrigidas: `frontend-fix-suite.log` e `backend-fix-suite.log`.
Resultado das suítes completas, usando os comandos do workflow:

- Frontend: 89 arquivos, 842 testes aprovados, exit code 0.
- Backend: 50 arquivos, 536 testes aprovados, exit code 0.
- Duração backend local: 248,38 segundos.

Sem commit, merge ou push dessas correções pelo assistente.
