# 34.1: matriz final e refatoração documentada

Consolidação local em 09/11/2026, horário de Brasília.
Branch: `codex/34-1-matriz-aceitacao-final`.
Base congelada: `c9d0eb20134af22bd11cf9e29f55f83c054bdfc7`.
Somente documentação e evidências textuais foram alteradas.
Não houve commit, push ou deploy.

## Resultado documental

- [Matriz atualizada](../../../docs/matriz-aceitacao-u2.md).
- [Terceira refatoração](../../../docs/refatoracoes-u2.md#3-extração-da-recomendação-para-microsserviço).
- [Conferência automática](validacao-documental.json).

A matriz possui 39 cenários em 18 histórias.
São 27 Must, dez Should e duas Could implementadas.
US16 mantém um cenário, com média e paginação conjuntas.
US18 acrescenta seu único cenário de indicadores administrativos.
T16.3 está substituída, vinculada ao commit 08.
US10.C2 inclui insuficiência de dados e indisponibilidade do microsserviço.
Os commits 01/04 fundamentam a extração documentada.

O responsável confirmou expressamente a aprovação de US08.C3.
Informou ter apagado seus testes novos e evidências visuais.
Autorizou presumir o aceite nesta conversa, em 09/11/2026.
Logo, 39/39 estão aprovados, com essa exceção declaratória.
A comprovação integral preservada corresponde a 38/39, ou 97,4%.
O teste HTTP existente não foi apresentado como medição visual.

## Nomes exatos e Git

As declarações foram conferidas com `rg -n -F`.
Também foram inspecionados os diffs dos commits solicitados.

| Número | Subtarefa                                    | Commit                                     |
| ------ | -------------------------------------------- | ------------------------------------------ |
| 01     | 35.1, extração inicial                       | `5771ac33c95fe0231bd3ee0c9a4459586029bc83` |
| 04     | 35.2, cliente HTTP e remoção das duplicações | `8e17cab51648374cade5501d78de8d8efa7cd029` |
| 07     | 32.1, painel administrativo                  | `f5fc6d1697689eaf108db289ceaff756b08da2ad` |
| 08     | 32.3, médias e substituição da T16.3         | `747b528cb80c08dc1a99c7803e54681c8bb6f70f` |
| 09     | 32.2, avaliações paginadas                   | `619a815a428b883f8724f537168d664608241598` |
| 11     | 36.1, fallback local                         | `b4b718d1fe07cc5579d51177a51b7ec3944b89a6` |

O título E2E antigo de US12.C1 foi atualizado.
Agora corresponde ao arquivo atual e à execução U01.
Os templates parametrizados permanecem idênticos às declarações.
Os resultados históricos continuam identificados por data e revisão.

## Reexecuções na base congelada

Os testes existentes foram executados sem modificações.
Integrações utilizaram PostgreSQL real e schemas temporários.
Não foram usados mocks de banco ou de repositories.

| Arquivo                                                                        | Casos aprovados | Último log                                           |
| ------------------------------------------------------------------------------ | --------------: | ---------------------------------------------------- |
| `backend/tests/integration/auth.routes.integration.test.ts`                    |              39 | [backend-validacao.txt](backend-validacao.txt)       |
| `backend/tests/integration/avaliacoes-media.32-3.integration.test.ts`          |               5 | [backend-validacao.txt](backend-validacao.txt)       |
| `backend/tests/integration/avaliacoes-paginadas.32-2.integration.test.ts`      |              13 | [backend-validacao.txt](backend-validacao.txt)       |
| `backend/tests/integration/indicadores-admin.route.integration.test.ts`        |              10 | [backend-validacao.txt](backend-validacao.txt)       |
| `backend/tests/integration/recomendacao-fallback-local.integration.test.ts`    |               6 | [backend-validacao.txt](backend-validacao.txt)       |
| `backend/tests/integration/http-recomendacao.integration.test.ts`              |              12 | [backend-validacao.txt](backend-validacao.txt)       |
| `backend/tests/integration/recomendacoes-contrato.integration.test.ts`         |              11 | [backend-complementar.txt](backend-complementar.txt) |
| `backend/tests/integration/avaliacoes.web3.integration.test.ts`                |              17 | [backend-complementar.txt](backend-complementar.txt) |
| `backend/tests/integration/recomendacao-fallback.strategy.integration.test.ts` |               6 | [backend-complementar.txt](backend-complementar.txt) |
| **Backend direcionado**                                                        |         **119** | **85 + 34, em duas rodadas**                         |
| `frontend/tests/components/cadastro-form.test.tsx`                             |              13 | [frontend.txt](frontend.txt)                         |
| `frontend/tests/app/admin-indicadores.test.tsx`                                |               9 | [frontend.txt](frontend.txt)                         |
| `frontend/tests/components/produto/avaliacoes-paginadas.test.tsx`              |               4 | [frontend.txt](frontend.txt)                         |
| `frontend/tests/services/http/recomendacoes.adapter.test.ts`                   |              30 | [frontend.txt](frontend.txt)                         |
| **Frontend direcionado**                                                       |          **56** | **Quatro arquivos**                                  |

A primeira tentativa ficou bloqueada pelo sandbox.
Falharam resolução de rede e acesso a temporários.
Registro: [backend.txt](backend.txt), sem aprovação contabilizada.
A execução autorizada aprovou seis arquivos e 85 testes.
O contrato excedeu seu hook explícito de 30 segundos.
Seus onze casos não executados não foram contabilizados como aprovados.
A repetição isolada aprovou os onze, sem alterar prazos.
Junto aos testes de recálculo e fallback, foram 34 aprovações.
Não se afirma aprovação integral em uma única rodada.

O frontend aprovou 56/56 testes na primeira execução.
Os logs mantêm nomes, resultado e horário das rodadas.
Não houve nova execução Playwright ou CI remoto.
Os resultados visuais usados pertencem às evidências históricas indicadas.

## Conferência documental e segurança

A conferência inicial encontrou 37 linhas, faltando US16/US18.
Também detectou o título E2E antigo de US12.C1.
A verificação final valida contagens por prioridade e história.
Confere arquivos, nomes exatos, links locais e hashes dos commits.
Confere ainda a ausência de mudanças no código congelado.
Resultado estruturado: [validacao-documental.json](validacao-documental.json).

Foi realizada revisão documental local, sem delegação de agentes.
O escopo não implementa feature nem altera superfície executável.
A varredura verifica credenciais, cookies e URLs de conexão.
O hostname privado do diagnóstico foi substituído por marcador.
Não foram incluídos arquivos `.env` ou credenciais.
A confirmação de US08.C3 não foi estendida a outras aprovações.

## Reprodução dos testes

Dentro de `backend/`:

```powershell
node --import dotenv/config node_modules/vitest/vitest.mjs run tests/integration/auth.routes.integration.test.ts tests/integration/avaliacoes-media.32-3.integration.test.ts tests/integration/avaliacoes-paginadas.32-2.integration.test.ts tests/integration/indicadores-admin.route.integration.test.ts tests/integration/recomendacao-fallback-local.integration.test.ts tests/integration/recomendacoes-contrato.integration.test.ts tests/integration/http-recomendacao.integration.test.ts --testTimeout=60000 --hookTimeout=120000 --reporter=verbose
node --import dotenv/config node_modules/vitest/vitest.mjs run tests/integration/recomendacoes-contrato.integration.test.ts tests/integration/avaliacoes.web3.integration.test.ts tests/integration/recomendacao-fallback.strategy.integration.test.ts --testTimeout=60000 --hookTimeout=120000 --reporter=verbose
```

Dentro de `frontend/`:

```powershell
node node_modules/vitest/vitest.mjs run tests/components/cadastro-form.test.tsx tests/app/admin-indicadores.test.tsx tests/components/produto/avaliacoes-paginadas.test.tsx tests/services/http/recomendacoes.adapter.test.ts --reporter=verbose
```
