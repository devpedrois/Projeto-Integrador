# WEB-14: notificações assíncronas

Smoke local com Express, PostgreSQL, pg-boss e Next.js HTTP.
Comprador e artesão usam sessões reais em contextos separados.
Dados sintéticos ficam em schema temporário isolado.
Publicador usa intervalo 3s; worker consulta a cada 1s.
O painel usa seu polling real de 15s.

Resultado observado: confirmação até badge em 14394 ms.
Persistiu uma notificação; leitura individual retornou 204.
O viewport mobile não apresentou transbordamento horizontal.
Servidores, navegador e schemas temporários foram encerrados.

`fluxo-http.json` registra tempo e chamadas HTTP sanitizadas.
`worker-processamento.log` registra estado consultado após processamento.
Esse log vem da consulta PostgreSQL, sem instrumentação fictícia.
`fluxo-http.gif` reúne capturas do fluxo real validado.
A animação é montagem de capturas, sem reprodução temporal.
As imagens não contêm a aba Network.
As chamadas reais estão documentadas no JSON.

Testes novos foram executados antes da implementação.
RED backend: sete falhas por notificações e rotas ausentes.
GREEN backend direcionado: sete testes WEB-14 aprovados.
GREEN fila e bootstrap: dez testes aprovados.
GREEN frontend: 838 testes aprovados.
Lint e typecheck passaram nos dois projetos.
Prettier validou os arquivos alterados com CRLF existente.
git diff --check considera CRLF via core.whitespace=cr-at-eol.

A primeira suíte backend teve 499 sucessos e dois timeouts.
O limite padrão de 5000ms venceu nos testes existentes:
`catalogo-moderacao.web12`: checkout simultâneo com estoque manual.
`catalogo.routes`: moderação e estoque nas leituras públicas.
Nenhum desses arquivos recebeu alteração nesta subtarefa.
Reexecução completa utiliza `npm test -- --testTimeout=15000`.
O log integral está em backend-tests-final.log.

Resultado final: 501 testes backend aprovados, 49 arquivos.
Reexecução encerrou com código zero em 277,77 segundos.

Revisão equivalente de segurança autorizada, sem delegação.
Nenhum commit ou push foi executado.
