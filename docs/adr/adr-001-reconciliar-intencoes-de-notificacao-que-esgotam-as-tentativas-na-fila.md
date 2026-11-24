# ADR-001: Reconciliar intenções de notificação que esgotam as tentativas na fila

- **Status:** Proposta
- **Critério para aceitação:** implementar a decisão e passar nos testes descritos em _Verificação_; até lá, o comportamento atual do código continua o descrito em _Contexto_
- **Data:** 2026-11-23
- **Autor:** MARIA LUIZA VIEIRA BELO LEITE FARIAS (mlvblf@cesar.school)
- **Turma:** Regular (terças)
- **Projeto:** Origem · marketplace da economia criativa e do artesanato de Pernambuco
- **Revisão:** referências conferidas contra `main` em `a767863` (23/11/2026)

> A numeração pode ser ajustada na consolidação das propostas da equipe: já
> existe uma "ADR 0001" (disponibilidade da recomendação, Sérgio Carvalho).

## Contexto

O checkout grava o pedido e uma IntencaoNotificacao na mesma transação (outbox, `pedido.repository.ts:442`). Um publicador envia ao pg-boss as intenções em "pendente" ou "falha" a cada 3 s (`NOTIFICATION_PUBLISHER_INTERVAL_MS`, padrão 3000), e um worker processa o aviso ao artesão com `retryLimit: 3` e backoff exponencial, ou seja, até 4 execuções por job (a original e 3 novas tentativas). O pedido nunca depende do aviso, o que já atende parte do atributo. Porém, quando as tentativas se esgotam, nenhum código marca a intenção como "falha": ela fica presa em "publicada". O publicador já sabe republicar intenções em "falha" (`listarPendentesOuFalha`), mas nunca encontra nenhuma, porque o status "falha" existe no enum e não é gravado em lugar nenhum. O resultado é que o artesão nunca é avisado. Cada execução com erro gera um log `resultado: "erro"` (`notificar-artesao.worker.ts:40-48`), mas não há um log que diga que as tentativas acabaram, e o teste que esgota as tentativas (`fila-notificacao.integration.test.ts:235`) confere só esses logs, não o status da intenção. A própria `docs/arquitetura-distribuida.md` registra que "esgotar tentativas exige acompanhamento e intervenção operacional". A equipe é pequena, tem um semestre e usa hospedagem gratuita (Render e Neon). A fila roda no próprio PostgreSQL e, em produção, o worker roda dentro do processo da API (`RUN_WORKER_IN_API=true`), porque o plano Free do Render não oferece Background Worker. A stack e o modelo de dados foram acordados com Desenvolvimento Web e Banco de Dados.

## Preocupações

tolerância a falhas, perda silenciosa de aviso, consistência eventual, idempotência, observabilidade, custo de infraestrutura, prazo

## Decisão

Manter a comunicação orientada a eventos com outbox e fechar o ciclo de falha dentro dela, sem nova fila, nova tabela nem migration:

1. **Marcar a falha.** Quando a última execução do job falha (`job.retryCount >= job.retryLimit`, metadados que o worker já recebe com `includeMetadata: true`), o worker marca a intenção como "falha" e registra um log de alerta próprio (ex.: `evento: "notificacao-tentativas-esgotadas"`, com `pedidoId` e o total de tentativas).
2. **Republicar com intervalo e teto.** O publicador continua relendo as intenções em "falha", mas só republica as que estão paradas há pelo menos 60 s (pela coluna `atualizadoEm`, que já existe) e que ainda não atingiram o teto. O teto é de 10 ciclos de republicação, medido pela coluna `tentativas`, que já conta cada execução do worker: 10 ciclos × 4 execuções = 40. Uma intenção que atinge o teto continua em "falha", deixa de ser republicada e gera um log de alerta de teto atingido.
3. **Reconciliar as presas em "publicada".** O publicador também devolve para "falha", sem contar como ciclo, as intenções em "publicada" sem atualização há mais de 10 minutos. Isso cobre jobs perdidos na fila (ex.: purgados ou expirados) e as intenções que ficaram presas antes desta mudança.

Os três parâmetros (intervalo, teto e tempo de reconciliação) entram como variáveis de ambiente validadas em `environment.ts`, com os valores acima como padrão e documentados no `.env.example`, para que os testes possam reduzi-los.

## Justificativa

O cenário exige 100% dos pedidos confirmados durante a falha do worker e 100% das intenções em "processada" até 5 minutos depois que ele volta. A primeira parte já é garantida pelo outbox, porque o pedido é confirmado antes de qualquer processamento assíncrono. A segunda depende de a intenção não se perder ao fim das tentativas. Marcá-la como "falha" a devolve ao ciclo do publicador, que já existe, já lê esse status e roda a cada 3 s. Depois que o worker volta, ela é republicada em no máximo cerca de 60 s mais um ciclo do publicador, bem dentro dos 5 minutos. O intervalo mínimo é necessário: sem ele, o publicador republicaria a intenção 3 s depois de cada falha, num laço que consome o worker e o banco enquanto a causa persiste. Com um ciclo de cerca de 70 s (4 execuções com backoff e mais 60 s de espera), o teto de 10 ciclos tolera uma falha contínua de cerca de 10 a 12 minutos, folga ampla para os 2 minutos do cenário. A exigência de zero notificações duplicadas continua atendida pelo índice único `@@unique([usuarioId, pedidoId, tipo])` em Notificacao e pelo `registrarSeAusente`, e `marcarComoProcessada` não regride uma intenção já processada, o que torna a republicação e a reconciliação seguras. Tudo isso usa o pg-boss e o PostgreSQL que já temos, sem nova infraestrutura e sem mudança de schema.

## Consequências

Ganhos: nenhuma intenção some em silêncio; a falha passa a deixar rastro em log e no status da tabela; o artesão recebe o aviso assim que o worker volta, sem intervenção manual, desde que a falha não ultrapasse o teto; o checkout não muda; não há migration nem mudança de contrato da API.
Perdas: o aviso pode chegar com alguns minutos de atraso, e por isso o artesão continua dependendo de consistência eventual. Uma mensagem com erro permanente vai ser reprocessada até o teto (10 ciclos, até 40 execuções), consumindo ciclos do worker e conexões do banco gratuito. A republicação e a reconciliação podem gerar jobs duplicados: se o worker estiver só parado (e não falhando) por mais de 10 minutos, o job original continua na fila e a reconciliação cria outro. Isso torna obrigatório que o índice único nunca seja removido. Também entram três parâmetros novos para calibrar e testar, e o tempo de reconciliação precisa ficar acima do tempo de expiração de job configurado no pg-boss, para não reconciliar um job que ainda está em execução. Uma falha mais longa que o teto (acima de cerca de 10 minutos) volta a exigir intervenção manual. Por fim, o alerta é apenas um log: se ninguém olhar os logs, uma intenção que bater no teto continua sem aviso até alguém perceber. Depois da implementação, o trecho de `docs/arquitetura-distribuida.md` que diz que esgotar tentativas exige intervenção operacional precisa ser atualizado.

## Alternativas consideradas

Manter como está: descartada, porque perde avisos sem deixar rastro, o que contraria a medida do cenário.
Aumentar o retryLimit (por exemplo, para 20): descartada, porque só adia o problema; quando o novo limite esgotar, a intenção some do mesmo jeito.
Dead letter queue do pg-boss com consumidor próprio: descartada por ora. O pg-boss 12 já oferece a opção `deadLetter` na fila, então a fila em si é barata, mas ainda exige um consumidor próprio e duplica a fonte de verdade, já que o status real do aviso está no outbox, não na fila.
Broker externo (RabbitMQ, Kafka): descartado pela restrição de custo e de operação para uma equipe pequena em um semestre.
Notificação síncrona dentro do checkout: descartada na escolha do padrão, porque acopla a confirmação do pedido ao sucesso do aviso.

## Rastreabilidade

**Atributo de qualidade:** Confiabilidade · Tolerância a falhas

**Cenário que originou a decisão:**

> Em produção, com a API e o checkout saudáveis, o worker de notificações passa 2 minutos falhando ao processar os jobs notificar-artesao e esgota as tentativas (4 execuções por job) enquanto compradores finalizam pedidos. O checkout confirma todos os pedidos normalmente (HTTP 201). As intenções que esgotaram as tentativas são marcadas como falha, registradas em log e republicadas automaticamente quando o worker volta. Em até 5 minutos após a recuperação, 100% das intenções estão em processada e cada artesão recebe o aviso do pedido uma única vez.

**Padrão arquitetural adotado:** Orientado a Eventos (com Transactional Outbox)

**Táticas empacotadas:** Processamento assíncrono; Usar intermediário (barramento ou fila); Retry com backoff; Consumidor idempotente; Reconciliação periódica; Degradação graciosa do consumidor

Código: `backend/src/jobs/notificar-artesao.worker.ts` (marcação de falha e log de alerta), `backend/src/jobs/notificar-artesao.handler.ts`, `backend/src/queues/notificacao.publisher.ts` e `backend/src/queues/bootstrap.ts` (intervalo, teto e reconciliação), `backend/src/queues/pg-boss.client.ts` (`NOTIFICAR_ARTESAO_RETRY_LIMIT`), `backend/src/repositories/intencao-notificacao.repository.ts` (`listarPendentesOuFalha`, nova marcação de falha), `backend/src/repositories/pedido.repository.ts` (criação da intenção no checkout), `backend/src/config/environment.ts` (novos parâmetros), enum `StatusIntencao` e modelos `IntencaoNotificacao` e `Notificacao` em `backend/prisma/schema.prisma`.
Testes existentes em `backend/tests/integration/fila-notificacao.integration.test.ts`: esgotamento com log por tentativa, sem conferir o status (linha 235); uma falha seguida de sucesso (282); recuperação após reinício (317); reentrega duplicada (339); reentrega concorrente (365); publicador não regride "processada" (385). Também relacionados: `notificacao-auto-publish.integration.test.ts` e `worker-process.integration.test.ts`.
Documentação: `docs/arquitetura-distribuida.md` (seção _Worker de notificações_) e `docs/concorrencia-checkout-u2.md`.

## Verificação

- **Teste do cenário (automatizado):** novo teste de integração em `backend/tests/integration/fila-notificacao.integration.test.ts`, com intervalo, teto e reconciliação reduzidos pelas variáveis de ambiente e backoff curto. Criar 20 pedidos pelo fluxo de checkout e registrar o worker real (`registerNotificarArtesaoWorker`) com um `NotificacaoRepository` que sempre falha, como no teste da linha 235 (Prisma apontando para um schema inexistente). Usar o worker real é necessário, porque é nele que fica a marcação de falha; um handler escrito no próprio teste não exercitaria o código novo. Afirmar que os 20 pedidos existem e que as 20 intenções estão em "falha", e não presas em "publicada", com o log de tentativas esgotadas. Em seguida, chamar `boss.offWork`, registrar o worker com o repositório real e afirmar que, dentro do prazo do cenário, as 20 intenções estão em "processada" e que existe exatamente uma Notificacao por artesão por pedido.
- **Teto e reconciliação (automatizados):** com o worker sempre falhando, afirmar que a intenção para de ser republicada ao atingir o teto e gera o log de teto atingido. Forçar uma intenção em "publicada" com `atualizadoEm` antigo e afirmar que ela volta a "falha" e depois chega a "processada".
- **Regressão:** os testes atuais de `fila-notificacao`, `notificacao-auto-publish` e `worker-process` devem continuar passando sem alteração, em especial o da linha 385 (o publicador nunca regride "processada").
- **Verificação manual (local, Docker Compose):** em produção o worker roda dentro da API (`RUN_WORKER_IN_API=true`), então parar o worker no Render derrubaria também o checkout. A verificação manual é feita no Docker Compose, com o worker em processo separado: parar o worker, fazer pedidos (todos com 201 e intenções paradas na fila), religar e conferir os status na tabela IntencaoNotificacao e os logs. Parar o worker comprova a parte de pedidos confirmados, mas não esgota as tentativas, porque os jobs só esperam na fila; o esgotamento é coberto pelo teste automatizado.
- **Evidências:** logs do teste e da execução manual salvos em `evidencias/`, seguindo o padrão das entregas anteriores.

---

_Gerado pelo estudo dirigido de Arquitetura de Software · ADS020 · 2026.2._
