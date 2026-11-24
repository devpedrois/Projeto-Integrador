# ADR-002: Manter timeout e fallback local quando o microsserviço de recomendação falhar

- **Status:** Aceito
- **Data:** 2026-11-23
- **Autor:** Sérgio Carvalho
- **Decisores:** Sérgio Carvalho e Pedro Iranildo (tech lead)
- **Turma:** Regular (terças)
- **Projeto:** Origem · marketplace da economia criativa e do artesanato de Pernambuco

## Contexto

A recomendação passou a ser um microsserviço com processo e deploy próprios (decisão D1, revogação de 02/11/2026). Isso criou o primeiro salto de rede síncrono no caminho do comprador: Vercel → API Express → HTTP com X-Service-Token → recomendação. O carrossel de recomendações aparece na home e no detalhe do produto, então é o componente que mais expõe esse salto. Hoje, falha de rede, status diferente de 200, JSON inválido ou timeout viram RecomendacaoIndisponivelError, e o service responde 200 com a estratégia "fallback-local", consultando produtos visíveis direto no PostgreSQL. Como não há estado de falha guardado entre requisições, a primeira chamada depois que o serviço volta já usa o microsserviço. O ponto fraco é a latência. O timeout é de 800 ms, sem retry. Quando o serviço está hibernando no Render, a conexão não é recusada, e cada requisição espera o timeout inteiro antes de cair no fallback. Respostas degradadas não entram no cache, para não congelar a degradação, e a rota pessoal nunca usa cache, então toda requisição durante a falha repete a tentativa. Dois fatos atenuam isso: o carrossel carrega no cliente, com esqueleto, sem bloquear a página; e as próprias chamadas da API acordam o serviço hibernado. A equipe é pequena e tem um semestre. Usa hospedagem gratuita (Render e Neon), com uma única instância da API, e o microsserviço é exigência da disciplina de FCCPD.

## Preocupações

disponibilidade, tolerância a falhas, latência durante a degradação, hibernação do plano gratuito, observabilidade, custo de infraestrutura, prazo

## Decisão

Manter o comportamento atual: timeout de 800 ms sem retry e fallback local quando o microsserviço falhar, sem guardar respostas degradadas no cache. A meta de latência do cenário passa de p95 ≤ 300 ms para p95 ≤ 1000 ms durante a falha. O Circuit Breaker fica registrado como evolução planejada, a ser adotada se um dos gatilhos de revisão for atingido: a medição mostrar p95 acima de 1000 ms durante a falha; a API passar a rodar com mais de uma instância ou com tráfego em que as tentativas repetidas sobrecarreguem a API; ou o timeout precisar subir para absorver respostas legítimas mais lentas.

## Justificativa

O cenário exige 100% de respostas 200 durante a falha, p95 limitado na rota de recomendações e volta às estratégias do microsserviço em até 30 s depois que ele se recupera. A primeira e a terceira exigências já são atendidas pelo código e cobertas por testes de integração na CI: todo modo de falha (rede, timeout, status, resposta inválida) cai no fallback local, e a recuperação acontece na primeira requisição seguinte, porque não há estado de falha a expirar. A meta original de 300 ms não é atingida enquanto o serviço hiberna. Mas a espera extra não aparece como falha para o comprador: o carrossel carrega no cliente, sem bloquear o resto da página, e as sugestões chegam em cerca de 1 s. A janela de falha mais comum também é curta, porque as chamadas da API despertam o serviço. O novo teto de 1000 ms cobre o timeout de 800 ms mais a consulta do fallback e continua sendo uma medida verificável. Por fim, a decisão não altera código, contrato, frontend nem infraestrutura, e não introduz estado em memória nem parâmetros novos para calibrar às vésperas da apresentação. É o mesmo critério de escopo controlado que manteve o PostgreSQL compartilhado.

## Consequências

Ganhos: nenhuma mudança de código, contrato ou frontend, e nenhum risco de regressão perto da entrega. O comportamento é simples de explicar e demonstrar: se o serviço falha, a API cai no fallback local, registra em log e identifica no campo estrategia; quando o serviço volta, a próxima requisição usa o microsserviço. A recuperação é imediata, sem a janela em que um Circuit Breaker aberto serviria fallback com o serviço já saudável. Os testes e evidências existentes continuam válidos.
Perdas: durante a indisponibilidade, cada carrossel leva cerca de 800 ms a mais, e toda requisição continua tentando o microsserviço, sem memória de falhas. O roteiro manual de aquecimento do README continua recomendado antes de demonstrações, para mostrar as estratégias do microsserviço e não o fallback. Respostas legítimas mais lentas que 800 ms viram "fallback-local". O PostgreSQL compartilhado continua sendo ponto comum de falha: se ele cair, nem o fallback local responde, e isso fica fora do escopo deste ADR.

## Alternativas consideradas

Circuit Breaker na chamada à recomendação (decorator de RecomendacaoStrategy que abre após 3 falhas seguidas por 15 a 30 s): não adotado agora. É a melhor resposta técnica para a meta de 300 ms e não muda contrato nem frontend, mas exige código novo, estado em memória por instância e dois parâmetros a calibrar para ganhar cerca de 800 ms num componente que não bloqueia a página. Fica como evolução planejada, acionada pelos gatilhos de revisão.
Servir a última resposta boa (stale-if-error): descartada, porque sozinha não remove a espera de 800 ms (ainda tenta a chamada antes), não ajuda com cache frio nem com a rota pessoal e exige alterar o MemoryCacheStore, que hoje apaga entradas expiradas.
Manter o microsserviço acordado (ping agendado ou plano pago): descartada. O plano pago viola a restrição de custo, o ping consome a cota gratuita compartilhada entre API e recomendação, e nenhum dos dois cobre crash nem deploy.
Reincorporar a recomendação à API (monólito modular): descartada, porque reverte a decisão D1 e o requisito de microsserviço da disciplina.

## Rastreabilidade

**Atributo de qualidade:** Disponibilidade · Tolerância a falhas

**Cenário que originou a decisão:**

> Em produção, com a API e o PostgreSQL saudáveis, o microsserviço de recomendação fica indisponível (hibernando, reiniciando ou fora do ar) por pelo menos 60 s enquanto compradores abrem a home e páginas de produto, gerando chamadas a /recomendacoes e /recomendacoes/para-mim. A API responde 200 com até 8 produtos visíveis e estratégia "fallback-local", o carrossel aparece sem erro e o evento fica registrado em log. Durante a falha, 100% das requisições respondem 200 e o p95 da rota /recomendacoes fica em até 1000 ms, desconsideradas as 5 primeiras requisições. Em até 30 s depois que o serviço volta, as respostas retornam às estratégias do microsserviço (categoria, historico-compra ou fallback-geral) sem reinício manual.

**Padrão arquitetural adotado:** Microsserviços

**Táticas empacotadas:** Detecção de falha por timeout; Tratamento de exceção; Degradação graciosa (fallback local)

Código: backend/src/integrations/recommendation/http-recomendacao.client.ts (timeout e falhas tipadas), backend/src/services/recomendacao.service.ts (troca para o fallback local e log de alerta), backend/src/controllers/recomendacao.controller.ts (respostas degradadas fora do cache), backend/src/config/environment.ts (RECOMENDACAO_TIMEOUT_MS), backend/src/app.ts (injeção da strategy), frontend/src/components/vitrine/FaixaRecomendacoes.tsx (carregamento no cliente).
Testes existentes: backend/tests/integration/recomendacao-fallback-local.integration.test.ts (cinco falhas seguidas e recuperação sem cache; timeout, status 503 e JSON inválido; rota pessoal degradada) e backend/tests/integration/http-recomendacao.integration.test.ts (microsserviço desligado). O contrato público é coberto por recomendacoes.route.integration.test.ts e recomendacoes-contrato.integration.test.ts.
Documentação: docs/arquitetura-distribuida.md, docs/modulo-recomendacao-u2.md, docs/cache-u2.md e docs/relatorio-desempenho-u2.md

## Verificação

- **Teste do cenário:** Os casos de falha por rede, timeout, status e JSON inválido, e a recuperação na requisição seguinte, já estão cobertos pelos testes existentes. Falta o caso de hibernação: um novo teste em backend/tests/integration/recomendacao-fallback-local.integration.test.ts com um servidor falso que aceita a conexão e não responde, mantendo o timeout padrão de 800 ms. O teste deve fazer 50 requisições sequenciais a /recomendacoes com produtos variados e afirmar que todas respondem 200 com "fallback-local" e que o p95 fica em até 1000 ms, desconsideradas as 5 primeiras. Em seguida, o servidor falso volta a responder normalmente, e o teste afirma que a próxima requisição volta a "categoria" ou "fallback-geral". Os testes atuais de recomendação devem continuar passando sem alteração. Em produção, a verificação é manual: suspender o microsserviço no Render, abrir 10 páginas de produto, conferir na aba Network o campo estrategia e o header Server-Timing, e contar nos logs da API os eventos recomendacao-fallback-local e o motivo (timeout na hibernação, rede no crash). Depois, retomar o serviço e confirmar que a próxima requisição volta às estratégias do microsserviço. As evidências ficam em evidencias/ADR-002-disponibilidade-recomendacao/.
