# PI4-35.2: cliente HTTP da recomendação

Execução local: 04/11/2026.
Branch: codex/35-2-cliente-http-recomendacao.
Base: df92c70.
Não houve commit, push ou execução remota do CI.

## Entrega

O backend consulta o microsserviço por HTTP autenticado.
O cliente valida a seleção interna usando Zod.
O timeout padrão é 800 ms, sem retry.
Falhas distinguem timeout, rede, status e resposta inválida.
O tratamento atual mantém o 503 genérico existente.
O fallback local continua reservado à subtarefa 36.1.
Controllers, rotas, validators e OpenAPI permaneceram intactos.
Foram removidos os algoritmos, consultas e métricas duplicados.
Scripts legados carregam a implementação única do microsserviço.
A operação de lote não foi antecipada.

## TDD e validação

- [RED unitário](01-red.txt): configuração e cliente ainda ausentes.
- [RED de integração](02-integracao-red.txt): serviço desligado retornava 200.
- [Backend final](06-backend-tests.txt): 786 testes aprovados em 72 arquivos.
  Foram usados os mesmos filtros do job backend.
- [Compatibilidade das métricas](07-metricas-legadas.txt): dois testes aprovados.
- [Verificações complementares](09-validacoes-observadas.json): resultados locais observados.
- [Revisão equivalente de segurança](08-revisao-seguranca.md): autorizada nesta conversa.

Integrações utilizam PostgreSQL real, sem mocks de repositories.
Cada execução cria schemas e papéis exclusivos.
O bootstrap aplica permissões antes das migrations privadas.
O microsserviço consulta somente as views de contrato.
Testes verificam a proibição de leitura das tabelas.
Também verificam a remoção dos objetos temporários.
As rotas preservam os IDs e a ordem calculados.
O token incorreto produz falha tipada de status.
O serviço desligado produz falha de rede e 503.

A primeira suíte completa registrou falhas durante a implementação.
O harness ainda não fornecia as novas variáveis obrigatórias.
A integração de avaliações também precisava do microsserviço.
O log anterior foi preservado em [03-backend-tests.txt](03-backend-tests.txt).

## E2E responsivo

Resultado final: quatro aprovações, sem falhas, skips ou retries.
Viewports: 360 e 1280 px.
O log registra 16 chamadas reais, todas com 200.
Oito chamadas usam histórico e oito usam contexto público.
O token efêmero não aparece nos artefatos.
A limpeza confirmou a ausência do schema E2E.

- [Saída final do E2E](05-e2e.txt).
- [Resultado estruturado](e2e/7bf98311233f4ed8b704172e57720e18/resultado.json).
- [Log do microsserviço](e2e/7bf98311233f4ed8b704172e57720e18/recomendacao.txt).
- [Limpeza confirmada](e2e/7bf98311233f4ed8b704172e57720e18/cleanup.json).
- [Relatório HTML](e2e/7bf98311233f4ed8b704172e57720e18/html/index.html).

A primeira tentativa concorreu com testes Next no diretório .next.
O conflito provocou arquivos ausentes durante o viewport 1280.
A execução final ocorreu após encerrar a suíte frontend.
O registro anterior permanece em [04-e2e.txt](04-e2e.txt).

## Reprodução

Instale dependências em backend, frontend e services/recomendacao.
Use conexões administrativas somente nos processos dos testes.
A conexão E2E deve apontar para outra branch sintética.
O harness aceita DATABASE_URL_VOLUME como E2E_DATABASE_URL.
Configure E2E_CHROMIUM_EXECUTABLE_PATH com um Chromium instalado.
Execute npm run test:e2e dentro de frontend.
O runner gera seu próprio token efêmero.

As evidências permanecem locais, conforme o .gitignore existente.
O CI remoto depende da publicação explicitamente autorizada.
