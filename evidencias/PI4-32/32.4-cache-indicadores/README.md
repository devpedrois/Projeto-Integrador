# 32.4: cache privado dos indicadores

Execução local em 08/11/2026.
Branch: `codex/32-4-cache-indicadores-artesao`.
Base: `f2e3d58db31250d83e92a28af43f09bc174a8809`, commit 21 integrado.
Fonte: [condição de execução](condicao-execucao.json).

## Resultado funcional

- Chave inclui exclusivamente a identidade autenticada do artesão.
- TTL privado absoluto de cinco minutos, separado do catálogo.
- Navegador conserva `Cache-Control: no-store`.
- Confirmação invalida somente os donos, depois do commit.
- Rollback conserva as entradas anteriores.
- Invalidação impede repovoamento por cargas anteriores.
- Autenticação permanece obrigatória mesmo durante HITs.

Fontes: [composição](../../../backend/src/app.ts),
[controller](../../../backend/src/controllers/indicadores.controller.ts),
[cache](../../../backend/src/utils/cache.ts),
[checkout](../../../backend/src/services/pedido.service.ts),
[repository transacional](../../../backend/src/repositories/pedido.repository.ts) e
[testes reais](../../../backend/tests/integration/indicadores-cache.integration.test.ts).

## Aceite de desempenho

O responsável exigiu HTTP completo e exatamente 1.500 pedidos.
Autorizou otimizar a autenticação dessa rota, mantendo revalidação PostgreSQL.
Foi mantida a massa determinística existente, sem ampliar pedidos.
Fontes: [teste](../../../backend/tests/integration/indicadores-cache-desempenho.integration.test.ts),
[massa](../../../backend/prisma/seeds/volume.ts) e [dados brutos](7b2c5851-791a-4cc2-b413-9ac502442463/http-volume.json).

| Medida                                |    Resultado |
| ------------------------------------- | -----------: |
| Pedidos confirmados                   |        1.500 |
| Produtos                              |        1.000 |
| Itens                                 |        1.550 |
| Pares medidos                         |           10 |
| MISS HTTP médio                       | 3,1703805 ms |
| HIT HTTP médio                        | 1,3020270 ms |
| Redução das médias HTTP               |  58,9315226% |
| Menor redução individual nessa coleta |  50,7987685% |

Fonte de todos os números: [JSON integral](7b2c5851-791a-4cc2-b413-9ac502442463/http-volume.json).
Saída verde: [medicao-http-apos-revisao.txt](medicao-http-apos-revisao.txt).
Conferência individual dos pares: [validação final](validacao-aceite-final.json).
O documento apresenta os [dez pares individualmente](../../../docs/cache-u2.md#medição-e-logs-reais).

O cliente mede até interpretar o JSON completo.
A autenticação consulta o banco em MISS e HIT.
Cliente e API executam em processos Linux separados.
São dez pares fixos de aquecimento, depois dez medidos.
Nenhum par medido é descartado pelo resultado.
O teste compara as médias aritméticas dos dez pares.
Todos os pares publicados também superaram 50% individualmente.
Fontes: [teste executável](../../../backend/tests/integration/indicadores-cache-desempenho.integration.test.ts),
[API real](../../../backend/scripts/helpers/indicadores-cache-servidor.ts) e
[coleta](7b2c5851-791a-4cc2-b413-9ac502442463/http-volume.json).

Não é uma promessa de latência no Render/Neon.
O cache permanece local ao processo, sem invalidação distribuída.
Fontes: [documento e limites](../../../docs/cache-u2.md#6-reprodução-e-limites).

## Diagnósticos preservados

Coletas anteriores permanecem disponíveis, inclusive resultados insuficientes.
Elas não são somadas à coleta final de aceite.

| Evidência                                                                                    | Contexto                                                     |
| -------------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| [Fixture inicial](b64a56cd-07e2-4180-8b2d-5ce131fae9a3/medicoes.json)                        | Separou CacheHttp de HTTP completo; não usa massa de volume. |
| [Volume no Neon](da9ef43a-08c6-4180-bede-d2e041793d86/http-volume.json)                      | Autenticação original; HTTP médio insuficiente.              |
| [PostgreSQL Docker e cliente Windows](db3aa255-13f2-471c-8185-08be4e8a412c/http-volume.json) | API no processo dos testes; HTTP insuficiente.               |
| [Experimento de projeção Prisma](45f329ea-1afe-450f-86b9-462f1e58ef1f/http-volume.json)      | Experimento revertido; HTTP insuficiente.                    |
| [API separada em Windows](cf5eae91-e930-4dd2-a8c0-c3a83a87e37c/http-volume.json)             | Autenticação original; HTTP insuficiente.                    |
| [API separada em Linux](0475cb55-c80c-44ad-86f5-30c5dc4ed80d/http-volume.json)               | Autenticação original; HTTP insuficiente.                    |
| [Consulta direta do usuário](9636abff-ab81-4b38-98eb-e270a64fe437/http-volume.json)          | Média HTTP suficiente; aquecimento inicial mais curto.       |
| [Validação individual adicional](213a71ee-1b48-45b8-85c3-fc447d0cee36/http-volume.json)      | Média suficiente; alguns pares individuais insuficientes.    |
| [Chave JWT preparada](6e09f788-91d2-4155-8c22-2398abf8da9a/http-volume.json)                 | Média suficiente; primeiro par individual insuficiente.      |
| [Aquecimento completo](31f3e1a4-bb42-4396-8513-14df153bd5d9/http-volume.json)                | Média suficiente; oscilação individual preservada.           |
| [Aceite anterior à revisão](87a39f89-b5ab-4153-b34d-1331c747ee4c/http-volume.json)           | Coleta suficiente antes da correção do ciclo do pool.        |
| [Aceite publicado](7b2c5851-791a-4cc2-b413-9ac502442463/http-volume.json)                    | Autenticação otimizada, aquecimento fixo, HTTP completo.     |

Os logs antigos podem conter nomes experimentais de testes.
`identidade-cache-verde.txt` contém uma falha de desempenho.
O nome desse arquivo não representa seu resultado.
As saídas e os JSONs brutos são a referência.

O diagnóstico da chave JWT está em [diagnostico-chave-jwt.txt](diagnostico-chave-jwt.txt).
A otimização prepara apenas a chave, nunca decisões de acesso.
Fonte: [sessão](../../../backend/src/utils/token.ts).

## TDD e validação

- [Red inicial do cache](tdd-red.txt).
- [Red dos donos coletados na transação](donos-transacao-red.txt).
- [Red da identidade consultada diretamente](identidade-direta-red.txt).
- [Red do encerramento do pool](pool-primeira-identidade-red.txt).
- [Regressão funcional anterior à otimização](revalidacao-funcional.txt).
- [Lint final](lint-apos-revisao.txt), [typecheck](typecheck-apos-revisao.txt) e [build](build-apos-revisao.txt).
- [Formatação final](formatacao-final.txt).
- [Suíte completa](testes-backend-final.txt).
- [Reteste final](reteste-final-conexao-testes.txt): 185 casos aprovados, em 18 arquivos.

A revisão equivalente foi escolhida pelo responsável nesta conversa.
Registro: [revisao-equivalente.md](revisao-equivalente.md).

A primeira rodada completa usou a conexão restrita da aplicação.
Essa conexão não pode criar schemas novos para os testes.
`DIRECT_URL` possui a permissão necessária nos dados sintéticos.
O diagnóstico não exibiu URLs ou credenciais.
Fonte: [permissões observadas](diagnostico-permissoes-testes.txt).

Os testes de worker e fila foram repetidos isoladamente.
Somente o processo de testes recebeu `DATABASE_URL=DIRECT_URL`.
Não houve alteração do `.env` ou dos privilégios da aplicação.
O [worker passou](worker-process-conexao-testes.txt), assim como a [fila](fila-conexao-testes.txt).
A [falha original do worker](worker-process-diagnostico.txt) permanece registrada.

A rodada completa registrou 802 aprovações, 12 falhas e 23 casos não executados.
Foram 82 arquivos: 73 aprovados, oito falhos e um benchmark desabilitado.
As falhas e os casos impedidos vieram das permissões de schemas.
Todos os oito arquivos foram incluídos no reteste final.
Também foram retestados autenticação, cache, indicadores, OpenAPI e inicialização.
O reteste passou após corrigir o ciclo do pool.
O benchmark privado foi executado separadamente e passou.
São rodadas complementares, sem alegação de aprovação integral única.
Fontes: [rodada original](testes-backend-final.txt),
[reteste verde](reteste-final-conexao-testes.txt) e
[benchmark após revisão](medicao-http-apos-revisao.txt).

A [conexão restrita da aplicação](autenticacao-conexao-restrita.json) também executou a leitura otimizada.
O teste consultou somente um UUID sintético ausente.
Confirmou o encerramento do pool após essa primeira operação.

## Reprodução

Instruções: [docs/cache-u2.md, seção 7](../../../docs/cache-u2.md#7-cache-privado-dos-indicadores-do-artesão-324).
O benchmark exige Docker e as imagens locais indicadas.
Os testes funcionais utilizam `DIRECT_URL` com schema isolado.
Não há mocks de banco ou de repositories nessa cobertura.

As imagens locais utilizadas foram:

| Imagem                         | ID local                                                                  |
| ------------------------------ | ------------------------------------------------------------------------- |
| `origem-backend-migrate:local` | `sha256:abc1af3fc081d264c2641a8ab9e2c862daebf8937f06b41e081f0af3a5795853` |
| `postgres:16`                  | `sha256:5db6dac2ef5dcff512f4f00a009c3c332b9f2f28f24277175bf3e4a3d02ef83a` |

O código atual é montado sobre a imagem de dependências.
Versões do runtime e PostgreSQL constam na [coleta](7b2c5851-791a-4cc2-b413-9ac502442463/http-volume.json).
As imagens e o encerramento dos containers constam no [registro de ambiente](ambiente-e-limpeza.json).
O [manifesto final](fontes-validadas-final.json) identifica as fontes por SHA-256.
O [manifesto anterior](fontes-validadas.json) precede a correção do ciclo do pool.
Links: [verificação final](links-verificados-final.json).
Credenciais configuradas: [verificação de exposição](verificacao-segredos-final.json).
Nenhum commit ou push foi realizado nesta subtarefa.
