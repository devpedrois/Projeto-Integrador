# Refatorações justificadas da U2

Subtarefa 31.5 · 26/10/2026.
Responsável: Luiza. Revisor indicado: Pedro.
Base documental: `d489b0b`.

Consolidação 34.1: 09/11/2026, base congelada `c9d0eb2`.
Foram selecionadas três mudanças estruturais verificáveis no Git.
Elas ocorreram em commits que também acrescentaram funcionalidades.
Os efeitos funcionais estão identificados separadamente abaixo.
Esta entrega não realiza novas refatorações.

## Evidência histórica de CI da 31.5

Os hashes completos abaixo existem no histórico local.
Os arquivos de teste também existem na base consultada.
As execuções remotas foram consultadas em 26/10/2026.

| Referência                                                                                                            | Commit executado                           | Resultado observado                                                             |
| --------------------------------------------------------------------------------------------------------------------- | ------------------------------------------ | ------------------------------------------------------------------------------- |
| [CI anterior ao commit 03](https://github.com/devpedrois/Projeto-Integrador/actions/runs/39856854893)                 | `819aa97cd11b02516ec68e81b7ec8a03d30a2795` | Os testes de servidor citados passaram. O run completo falhou em outro arquivo. |
| [Último CI integralmente verde consultado](https://github.com/devpedrois/Projeto-Integrador/actions/runs/40232946842) | `376c5f95429ab9e74558384fb210c4072d932c73` | Backend e frontend aprovados. Todos os testes citados abaixo passaram.          |
| [CI mais recente consultado](https://github.com/devpedrois/Projeto-Integrador/actions/runs/40239567812)               | `8e78cdc4e5f601c1de2aad9eb78d99985fae564e` | Frontend aprovado. Backend falhou no typecheck, antes dos testes.               |

O run recente não comprova regressão dos testes backend.
Ele também não comprova que estejam verdes nessa revisão.
O aceite de CI estava pendente naquela consulta histórica.
O verde backend documentado pertence expressamente a `376c5f9`.

A falha recente está em `backend/scripts/web6-evidencias.ts`.
O typecheck registra `TS2307` para `playwright-core/index.js`.
Também registra dois `TS7006`, envolvendo parâmetros sem tipos inferidos.
Os logs filtrados estão nas [evidências da 31.5](../evidencias/PI4-31/31.5/README.md).
Essa falha não foi corrigida nesta tarefa documental.

## 1. Separação do bootstrap HTTP e do consumidor

Commit 03: [2a37f91b909bcb2d2c2b9a90c8d6e93ebd9db010](https://github.com/devpedrois/Projeto-Integrador/commit/2a37f91b909bcb2d2c2b9a90c8d6e93ebd9db010).
Data: 22/10/2026. Subtarefa original: 30.3.

### Problema concreto e princípio aplicado

`startServer` acumulava inicialização HTTP, publicador e registro do consumidor.
Iniciar o backend sempre registrava esse consumidor no processo HTTP.
Não havia entrypoint próprio para executar apenas o worker.

O trecho refatorado aplica SRP à inicialização dos processos.
Também reutiliza a composição da infraestrutura em funções compartilhadas.
API e worker continuam usando os mesmos handlers e repositories.
Não houve criação de microsserviços ou troca de fila.

### Diff resumido

| Antes                                                                                  | Depois                                                                                                     |
| -------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `server.ts:startServer` iniciava pg-boss, fila, repositories e consumidor diretamente. | [bootstrap.ts](../backend/src/queues/bootstrap.ts) concentra `iniciarPublicador` e `iniciarConsumidor`.    |
| O intervalo de publicação era controlado dentro de `startServer`.                      | `iniciarPublicador` devolve uma função de parada, aguardando publicação ativa.                             |
| Servidor HTTP sempre registrava o consumidor.                                          | [server.ts](../backend/src/server.ts) inicia o publicador e condiciona o consumidor à flag.                |
| Não existia inicialização exclusiva do consumidor.                                     | [worker.ts:startWorker](../backend/src/worker.ts) inicia somente o consumidor e gerencia seu encerramento. |

Essa extração é a refatoração registrada neste caso.
O entrypoint independente e seus scripts também ampliaram capacidades operacionais.
`RUN_WORKER_IN_API=true` preservou o modo integrado como padrão.
Separar processos exige configurar a flag e iniciar o worker.
Não se afirma que o deploy remoto tenha sido separado.

### Testes antes e depois

| Arquivo                                                                                                                                         | Comportamento protegido                                                | Antes, CI `819aa97`                   | Depois, CI `376c5f9` |
| ----------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- | ------------------------------------- | -------------------- |
| [backend/tests/unit/server.test.ts](../backend/tests/unit/server.test.ts)                                                                       | Importação sem iniciar recursos, erros sanitizados e bind explícito.   | **5/5 aprovados**.                    | **5/5 aprovados**.   |
| [backend/tests/integration/server-queue-bootstrap.integration.test.ts](../backend/tests/integration/server-queue-bootstrap.integration.test.ts) | Health e processamento após inicialização integrada.                   | **2/2 aprovados**.                    | **2/2 aprovados**.   |
| [backend/tests/unit/worker.test.ts](../backend/tests/unit/worker.test.ts)                                                                       | Importação inerte, ambiente inválido e liberação após falha.           | Arquivo inexistente antes da mudança. | **3/3 aprovados**.   |
| [backend/tests/integration/worker-process.integration.test.ts](../backend/tests/integration/worker-process.integration.test.ts)                 | API sem consumidor, processos independentes, unicidade e encerramento. | Arquivo inexistente antes da mudança. | **2/2 aprovados**.   |

Prova anterior: [log do CI `819aa97`](https://github.com/devpedrois/Projeto-Integrador/actions/runs/39856854893).
Prova posterior: [job backend verde](https://github.com/devpedrois/Projeto-Integrador/actions/runs/40232946842/job/121288366732).
Os dois testes novos complementam a regressão anterior.
As integrações usam PostgreSQL e repositories reais.
O run anterior inteiro não estava verde.
Seus resultados individuais acima foram conferidos nos logs.

### Dívida e limites

Separação no código não comprova worker independente em produção.
O modo integrado permanece disponível e precisa de decisão operacional.
O teste usa encaminhamento IPC dos sinais no Windows.
Em Unix, usa sinais nativos contra os processos filhos.
A fila mantém retries e efeito idempotente, sem execução única garantida.
Naquela consulta, o CI impedia nova validação remota backend.

## 2. Composição da recomendação e reaproveitamento da faixa

Commit: [1529f71b4cf126a6dfc74b77a43dc45c206a1501](https://github.com/devpedrois/Projeto-Integrador/commit/1529f71b4cf126a6dfc74b77a43dc45c206a1501).
Data: 14/10/2026. Sprint 4, integração IA-02.

### Problema concreto e princípio aplicado

O contrato `RecomendacoesService` já sustentava hook e interface.
No modo HTTP, a composição ainda devolvia uma pendência explícita.
O adapter fake continuava atendendo o modo local.
A faixa apresentava seus produtos com renderização própria fixa.

A composição passou a selecionar uma implementação HTTP desse contrato.
A faixa recebeu um renderer para reutilizar `ProdutoCard` no detalhe.
O hook continuou responsável pelos estados de leitura.
O renderer passou a definir a apresentação de cada produto.

O caso aplica DIP, composição e separação de responsabilidades.
A seleção intercambiável segue o contrato usado pelos adapters.
A Strategy de ranking permanece no backend.
O frontend não ganhou outra implementação desse ranking no modo HTTP.

### Diff resumido

| Antes                                                                           | Depois                                                                                                                                                          |
| ------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `obterRecomendacoesService` devolvia `recomendacoesHttpPendentes` no modo HTTP. | [container.ts](../frontend/src/services/fake/container.ts) instancia `HttpRecommendationAdapter` e remove a pendência.                                          |
| O modo fake usava `FakeRecommendationAdapter`.                                  | A mesma implementação fake permanece selecionada no modo local.                                                                                                 |
| A faixa controlava estados e uma apresentação fixa dos itens.                   | [FaixaRecomendacoes.tsx](../frontend/src/components/vitrine/FaixaRecomendacoes.tsx) aceita `titulo` e `renderizarProduto`, preservando sua apresentação padrão. |
| O detalhe usava a faixa com apresentação padrão.                                | [DetalheProduto.tsx](../frontend/src/components/produto/DetalheProduto.tsx) compõe a faixa com `ProdutoCard`.                                                   |
| Contrato e hook já existiam.                                                    | `RecomendacoesService` e [useRecomendacoes](../frontend/src/hooks/use-recomendacoes.ts) não foram alterados nesse commit.                                       |

Não houve substituição literal do fake pelo HTTP globalmente.
Foi ativada a implementação HTTP na composição correspondente.
Criar o adapter e consumir a API são funcionalidades novas.
O reaproveitamento estrutural está no contrato, hook, faixa e renderer.
O commit também mudou componentes e comportamento visual.
Portanto, não sustenta a afirmação de interface inteiramente inalterada.

### Testes antes e depois

O snapshot anterior é `bd585e0244f6c41a8e37422a88b91197eeb3ce6f`.
Ele é o pai direto de `1529f71`.
Em 26/10/2026, seus testes foram reexecutados isoladamente.
Foram usadas as dependências frontend já instaladas, sem instalação nova.
Esse resultado local não representa CI histórico daquela revisão.

| Arquivo                                                                                                                       | Comportamento protegido                                                 | Antes, snapshot pai                      | Depois, CI `376c5f9` |
| ----------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- | ---------------------------------------- | -------------------- |
| [frontend/tests/services/fake-recommendation.adapter.test.ts](../frontend/tests/services/fake-recommendation.adapter.test.ts) | Ranking da fixture, elegibilidade, limite e exclusão do contexto.       | **8/8 aprovados**, reexecução local.     | **9/9 aprovados**.   |
| [frontend/tests/hooks/use-recomendacoes.test.tsx](../frontend/tests/hooks/use-recomendacoes.test.tsx)                         | Carregamento, sucesso, vazio, erro e contexto.                          | **6/6 aprovados**, reexecução local.     | **7/7 aprovados**.   |
| [frontend/tests/components/faixa-recomendacoes.test.tsx](../frontend/tests/components/faixa-recomendacoes.test.tsx)           | Estados da faixa e apresentação dos produtos.                           | **5/5 aprovados**, reexecução local.     | **6/6 aprovados**.   |
| [frontend/tests/services/http/recomendacoes.adapter.test.ts](../frontend/tests/services/http/recomendacoes.adapter.test.ts)   | Composição HTTP, paridade contratual, ordem e ausência de acesso local. | Arquivo inexistente antes da integração. | **24/24 aprovados**. |
| [frontend/tests/components/produto/detalhe-produto.test.tsx](../frontend/tests/components/produto/detalhe-produto.test.tsx)   | Detalhe, recomendações e interação com os cards.                        | Não incluído na reexecução anterior.     | **23/23 aprovados**. |

Prova posterior: [job frontend verde](https://github.com/devpedrois/Projeto-Integrador/actions/runs/40232946842/job/121288366601).
As mesmas contagens passaram no [run frontend mais recente](https://github.com/devpedrois/Projeto-Integrador/actions/runs/40239567812/job/121308265602).
As tabelas incluem testes acrescentados posteriormente ao commit original.
A paridade completa foi reforçada em [fdce565](https://github.com/devpedrois/Projeto-Integrador/commit/fdce565eb8364460b6a37adb5404a32d9de5a866).
Esses casos posteriores não são atribuídos à refatoração original.

A reexecução local atual aprovou os mesmos cinco arquivos.
Resultado: **69 testes aprovados**, após **19 aprovados** no snapshot anterior.
As quantidades diferem porque a cobertura foi ampliada posteriormente.
Logs: [antes](../evidencias/PI4-31/31.5/01-antes-composicao-validado.txt) e [depois](../evidencias/PI4-31/31.5/02-depois-composicao.txt).

### Dívida e limites

O container continua localizado em `services/fake`, mesmo atendendo HTTP.
Essa localização mistura o nome da infraestrutura com a composição.
Os testes do adapter substituem `fetch`, não executam rede real.
Eles comprovam contrato e seleção, sem comprovar deploy ou transporte externo.
Os resultados fake e HTTP não são universalmente idênticos.
A paridade demonstrada está limitada à fixture contratual compartilhada.

## 3. Extração da recomendação para microsserviço

Commit 01, subtarefa 35.1:
[5771ac33c95fe0231bd3ee0c9a4459586029bc83](https://github.com/devpedrois/Projeto-Integrador/commit/5771ac33c95fe0231bd3ee0c9a4459586029bc83).
Commit 04, subtarefa 35.2:
[8e17cab51648374cade5501d78de8d8efa7cd029](https://github.com/devpedrois/Projeto-Integrador/commit/8e17cab51648374cade5501d78de8d8efa7cd029).
Ambos foram implementados em 04/11/2026.

### Problema concreto e princípios aplicados

O módulo de recomendação executava acoplado à API.
Compartilhava processo, inicialização e publicação com o servidor HTTP.
Não havia isolamento de falha nem deploy independente.
Alterar ou publicar o ranking exigia publicar a API.

A extração aplica SRP aos processos e dados privados.
O microsserviço assume seleção, ranking e suas próprias migrations.
A API conserva autenticação pública e hidratação de produtos.
O contrato interno devolve estratégia e IDs ordenados.
A Strategy permanece intercambiável pela mesma interface de seleção.
O cliente HTTP implementa esse contrato na composição da API.

O processo separado permite deploy independente e contém falhas.
O timeout limita a espera pelo serviço indisponível.
Na 35.2, falhas ainda geravam resposta pública 503 controlada.
A continuidade visual chegou depois, pelo fallback da 36.1.
Esse fallback não é atribuído aos commits 01/04.

### Diff resumido

| Antes                                                              | Depois nos commits 01 e 04                                                                                                                                |
| ------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `app.ts` compunha Strategies e repository Prisma no processo HTTP. | 01 cria `services/recomendacao/`; 04 compõe [HttpRecomendacaoClient](../backend/src/integrations/recommendation/http-recomendacao.client.ts) na API.      |
| A recomendação consultava diretamente tabelas da API.              | 01 cria views de contrato; [PgRecomendacaoRepository](../services/recomendacao/src/repositories/recomendacao.repository.ts) consulta somente essas views. |
| Não existiam processo, schema privado ou migration próprios.       | 01 acrescenta servidor, configuração, token interno, bootstrap de permissões, migration privada e job de CI.                                              |
| Ranking por categoria e histórico permanecia no backend.           | 01 reproduz as Strategies no microsserviço; 04 remove algoritmos, repository e métricas duplicados do backend.                                            |
| O service recebia diretamente a seleção calculada localmente.      | 04 recebe seleção HTTP validada; catálogo hidrata os IDs, preservando o DTO público.                                                                      |
| Métricas e benchmark importavam algoritmos locais.                 | 04 usa um helper para carregar a implementação única. A mudança posterior do lote pertence à 35.6.                                                        |
| Não existia uma fronteira de rede entre API e ranking.             | 04 acrescenta token de serviço, timeout padrão de 800 ms e erros tipados, sem retry.                                                                      |

O commit 01 manteve temporariamente a implementação original ativa.
Isso permitiu comparar ambos os algoritmos antes da troca.
O commit 04 completou a troca e removeu duplicações.
Processo HTTP interno, permissões e operação independente ampliaram capacidades.

### Testes verdes antes e depois

O ponto anterior é a API ainda executando in-process.
Seu código produtivo permaneceu intacto no commit 01.
O [JSON backend da 35.1](../evidencias/PI4-35/35.1/testes-backend.json)
registra 763/763 aprovados, incluindo os testes abaixo.
O ponto posterior é a integração HTTP do commit 04.
O [log backend da 35.2](../evidencias/PI4-35-W14-Microsservico-Docker/35.2-cliente-http/06-backend-tests.txt)
registra 786/786 aprovados nos 72 arquivos selecionados.
Essas execuções são locais, sem representar CI remoto.

| Arquivo:nome exato                                                                                                                                                                                   | Antes da troca HTTP                                                      | Depois da troca HTTP                                        |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ | ----------------------------------------------------------- |
| [backend/tests/integration/recomendacoes-contrato.integration.test.ts](../backend/tests/integration/recomendacoes-contrato.integration.test.ts): `preserva exatamente o ranking esperado da fixture` | Aprovado no JSON 35.1, Strategy original.                                | Aprovado na suíte 35.2, seleção HTTP.                       |
| Mesmo arquivo: `Strategy retorna somente IDs ordenados e nome da estrategia`                                                                                                                         | Aprovado no JSON 35.1.                                                   | Aprovado na suíte 35.2, com a mesma expectativa.            |
| [services/recomendacao/tests/integration/recomendacao.test.ts](../services/recomendacao/tests/integration/recomendacao.test.ts): comparação com o original                                           | Em 01: `reproduz IDs e ordem da fixture interna e do backend`, aprovado. | Em 04: `reproduz IDs e ordem da fixture interna`, aprovado. |
| [backend/tests/integration/http-recomendacao.integration.test.ts](../backend/tests/integration/http-recomendacao.integration.test.ts): `preserva IDs e ordem calculados pelo microsservico: %s`      | Teste inexistente antes de 04.                                           | Dois casos aprovados: rota pública e pessoal.               |

A [suíte do microsserviço em 01](../evidencias/PI4-35/35.1/testes-microsservico-final.json)
registra 54/54 aprovações, incluindo a comparação direta.
A [validação posterior da 35.2](../evidencias/PI4-35-W14-Microsservico-Docker/35.2-cliente-http/09-validacoes-observadas.json)
registra 58/58 no microsserviço e quatro E2E aprovados.

O título histórico foi conferido no fonte do commit 01.
Em 04, a referência ao algoritmo removido foi retirada.
A expectativa preserva a [fixture de seleção](../fixtures/recomendacao-selecao.fixture.json).
São oito IDs, comparados como array completo por `toEqual`.
Essa igualdade verifica os mesmos IDs na mesma ordem.
O teste de contrato também compara o array esperado.
O teste HTTP compara a API com a seleção interna.
Ele cobre `/recomendacoes` e `/recomendacoes/para-mim`.
As comparações verificam conteúdo e ordenação integralmente.

A [reexecução da 34.1](../evidencias/PI4-34/34.1/README.md)
registra separadamente a validação da base congelada `c9d0eb2`.
Ela não foi atribuída retroativamente aos commits originais.
As integrações usam PostgreSQL real, sem mocks de repositories.

### Dívida e limites

Separar processos introduz rede, serialização e nova dependência operacional.
O servidor PostgreSQL continua compartilhado pelos serviços.
O isolamento usa papéis, views contratuais e schema privado.
Não equivale a bancos físicos ou disponibilidade PostgreSQL independentes.
Os resultados comprovam paridade nas fixtures e contextos exercitados.
Não demonstram disponibilidade universal nem menor latência individual.
O [benchmark posterior da 35.8](../evidencias/PI4-35/35.8-custo-http/README.md)
registrou aumento de latência na configuração distribuída medida.
Esse resultado posterior não integra a prova original de extração.

## Candidato inspecionado e excluído: agregação no repository

Commit 06: [8daa70b32c6661dd2d28264b025518b601d863ef](https://github.com/devpedrois/Projeto-Integrador/commit/8daa70b32c6661dd2d28264b025518b601d863ef).
O diff cria `indicadores.repository.ts`, service, controller e rota.
Não existe uma implementação anterior dessa consulta sendo extraída.
É uma funcionalidade nova respeitando a arquitetura em camadas.
Por isso, não foi contabilizada como terceira refatoração.
Também não se atribui ganho medido de desempenho à extração inexistente.

## Limites históricos da entrega 31.5

Foram alterados somente documentos e sua inclusão no Git.
Nenhuma implementação, configuração de CI ou dependência foi modificada.
Não houve nova execução de testes backend ou acesso ao PostgreSQL.
As provas backend são os resultados remotos identificados acima.
Não houve commit, push, deploy ou aprovação humana presumida.
Naquela consulta, o aceite dependia de resolver a falha registrada.

## Limites da consolidação 34.1

Foram atualizados somente documentos e evidências textuais.
Os testes existentes foram reexecutados sem alterar código.
Resultados atuais e históricos possuem referências distintas.
US08.C3 permanece identificada como aceite declarado pelo responsável.
Sua evidência visual excluída não foi reconstruída ou inventada.
Não houve commit, push, deploy ou nova refatoração.
