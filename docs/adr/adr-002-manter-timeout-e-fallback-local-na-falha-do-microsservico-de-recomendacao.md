# ADR-002: Manter timeout e fallback local quando o microsserviço de recomendação falhar

- **Status:** Aceita
- **Data:** 2026-11-24
- **Autor:** SÉRGIO CARVALHO MASSAD CHOUSINHO (scmc@cesar.school)
- **Turma:** Regular (terças)
- **Projeto:** Origem · marketplace da economia criativa e do artesanato de Pernambuco

## Contexto

A recomendação roda como um microsserviço separado, com processo e deploy próprios, e a API o chama por HTTP a cada carrossel da home e das páginas de produto. Hoje, falha de rede, status diferente de 200, resposta inválida ou timeout fazem a API responder 200 com a estratégia "fallback-local", consultando produtos visíveis direto no PostgreSQL, e a primeira chamada depois que o serviço volta já usa o microsserviço. O ponto fraco é a latência: o timeout é de 800 ms, sem retry, e quando o serviço hiberna no Render a conexão não é recusada, então cada requisição espera o timeout inteiro antes de cair no fallback. O carrossel carrega no cliente, sem bloquear a página, e as próprias chamadas da API acordam o serviço hibernado. A equipe é pequena, de estudantes com outras disciplinas em paralelo, e tem um semestre. Usa hospedagem gratuita (Render e Neon), com uma única instância da API. A stack foi acordada com Desenvolvimento Web, o modelo de dados com Banco de Dados, e o microsserviço é exigência de FCCPD.

## Preocupações

tolerância a falhas, disponibilidade da vitrine, latência durante a degradação, hibernação do plano gratuito, observabilidade, custo de infraestrutura, prazo

## Decisão

Manter a chamada da API ao microsserviço com timeout de 800 ms, sem retry, e fallback local quando ele falhar, sem guardar respostas degradadas no cache. O Circuit Breaker fica como evolução planejada, adotado se a medição mostrar p95 acima de 1000 ms, se a API passar a ter mais de uma instância ou se o timeout precisar subir.

## Justificativa

O cenário exige 100% de respostas 200 durante a falha, p95 de até 1000 ms na rota de recomendações e volta ao microsserviço em até 30 segundos. A primeira e a terceira exigências já são atendidas pelo código e cobertas por testes de integração na CI: todo modo de falha cai no fallback local, e a recuperação acontece na requisição seguinte, porque não há estado de falha a expirar. O teto de 1000 ms cobre o timeout de 800 ms mais a consulta do fallback. A espera extra não aparece como falha para o comprador, porque o carrossel carrega no cliente, sem bloquear o resto da página. Como o navegador só conversa com a API, toda falha do microsserviço passa por ela e é convertida em fallback. A decisão não altera código, contrato, frontend nem infraestrutura, e não cria estado em memória nem parâmetros novos para calibrar às vésperas da entrega.

## Consequências

Ganhos: nenhuma mudança de código, contrato ou frontend, e nenhum risco de regressão perto da entrega. O comportamento é simples de explicar e de demonstrar: se o serviço falha, a API cai no fallback local, registra em log e identifica no campo estrategia; quando ele volta, a próxima requisição usa o microsserviço. A recuperação é imediata, sem a janela em que um Circuit Breaker aberto serviria fallback com o serviço já saudável.
Perdas: durante a indisponibilidade, cada carrossel leva cerca de 800 ms a mais, e toda requisição continua tentando o microsserviço, sem memória de falhas. O aquecimento manual antes de demonstrações continua necessário para mostrar as estratégias do microsserviço e não o fallback. Respostas legítimas mais lentas que 800 ms viram "fallback-local". O PostgreSQL compartilhado continua sendo ponto comum de falha: se ele cair, nem o fallback local responde.

## Alternativas consideradas

Circuit Breaker na chamada à recomendação: não adotado agora. Removeria a espera enquanto o circuito estivesse aberto, mas exige código novo, estado em memória e dois parâmetros a calibrar para ganhar cerca de 800 ms num componente que não bloqueia a página. Fica como evolução planejada.
Servir a última resposta boa (stale-if-error): descartada, porque sozinha não remove a espera (ainda tenta a chamada antes), não ajuda com cache frio nem com a rota pessoal e exige alterar o cache em memória.
Manter o microsserviço acordado (ping agendado ou plano pago): descartada. O plano pago viola a restrição de custo, o ping consome a cota gratuita compartilhada, e nenhum dos dois cobre crash nem deploy.
Reincorporar a recomendação à API: descartada, porque reverte a decisão de ter o microsserviço, que é requisito da disciplina.

## Rastreabilidade

**Atributo de qualidade:** Confiabilidade · Tolerância a falhas

**Cenário que originou a decisão:**

> Em produção, com a API e o banco saudáveis e compradores navegando normalmente, o microsserviço de recomendação fica indisponível (hibernando, reiniciando ou fora do ar) por pelo menos 60 segundos. Durante a falha, a API devolve até 8 produtos pelo fallback local, o carrossel da home e das páginas de produto aparece sem erro e a falha fica registrada em log, com 100% das requisições respondendo HTTP 200 e p95 de até 1000 ms na rota de recomendações, desconsideradas as 5 primeiras. Em até 30 segundos após o serviço voltar, as recomendações retornam às estratégias do microsserviço sem reinício manual.

**Padrão arquitetural adotado:** Cliente-servidor

**Táticas empacotadas:** Limitar a exposição da API

Código: backend/src/integrations/recommendation/http-recomendacao.client.ts (timeout e falhas tipadas), backend/src/services/recomendacao.service.ts (troca para o fallback local e log), backend/src/controllers/recomendacao.controller.ts (respostas degradadas fora do cache), backend/src/config/environment.ts (RECOMENDACAO_TIMEOUT_MS), frontend/src/components/vitrine/FaixaRecomendacoes.tsx (carregamento no cliente).
Testes existentes: backend/tests/integration/recomendacao-fallback-local.integration.test.ts (cinco falhas seguidas e recuperação sem cache; timeout, status 503 e JSON inválido; rota pessoal degradada) e backend/tests/integration/http-recomendacao.integration.test.ts (microsserviço desligado).
Documentação: docs/arquitetura-distribuida.md, docs/modulo-recomendacao-u2.md e docs/cache-u2.md.

## Verificação

- **Teste do cenário:** Novo teste de integração em backend/tests/integration/recomendacao-fallback-local.integration.test.ts com um servidor falso que aceita a conexão e não responde, simulando a hibernação, mantendo o timeout padrão de 800 ms. O teste faz 50 requisições sequenciais a /recomendacoes com produtos variados e afirma que todas respondem 200 com "fallback-local" e que o p95 fica em até 1000 ms, desconsideradas as 5 primeiras. Em seguida, o servidor falso volta a responder normalmente, e o teste afirma que a próxima requisição retorna a "categoria" ou "fallback-geral". Os testes atuais de recomendação devem continuar passando sem alteração. Em produção, a verificação é manual: suspender o microsserviço no Render, abrir 10 páginas de produto, conferir na aba Network o campo estrategia e nos logs da API os eventos recomendacao-fallback-local, depois retomar o serviço e confirmar que a próxima requisição volta às estratégias do microsserviço.

---

_Gerado pelo estudo dirigido de Arquitetura de Software · ADS020 · 2026.2._
