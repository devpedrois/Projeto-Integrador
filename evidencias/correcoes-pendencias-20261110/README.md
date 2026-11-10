# Correção das pendências da validação funcional

Data: 10/11/2026.
Branch: `codex/corrigir-pendencias-sprint-14-15`.
Base: `f0802685e5276a0d941ebc94e1c298de83437bee`.
Sem commit, push ou deploy.

As quatro pendências receberam correção e nova validação.
As mudanças de código permanecem locais.
A exclusão autorizada da avaliação atingiu o banco publicado.
As credenciais foram sincronizadas somente nos arquivos locais.

## Correções

### Filtros rápidos

O hook agora acumula alterações antes da navegação concluir.
As seleções aparecem imediatamente na interface.
Navegações intermediárias não descartam os filtros pendentes.
O histórico continua sincronizando os campos com a URL.

Foram adicionados quatro testes unitários de regressão.
O novo E2E cobre seleção rápida, recarga e histórico.
Ele passou nas larguras de 360px e 1280px.
A reprodução também passou no navegador interno, localmente.

Fontes: [hook](../../frontend/src/hooks/use-filtros-url.ts),
[testes unitários](../../frontend/tests/hooks/use-filtros-url.test.tsx)
e [E2E](../../frontend/e2e/filtros-rapidos.spec.ts).

### Inicialização e sessão

A consulta GET `/auth/me` repete somente falhas transitórias.
São até quatro tentativas, com intervalos progressivos.
Os intervalos são um, dois e quatro segundos.
Com timeout padrão, a espera máxima aproxima-se de 47 segundos.
HTTP 401 e respostas inválidas não recebem novas tentativas.
Login, cadastro e demais escritas não recebem repetição automática.

Durante a espera, a interface apresenta um estado acessível.
Ela mantém o conteúdo protegido oculto.
Após falhas persistentes, permanece disponível a recuperação manual existente.

No navegador, um gateway local produziu dois HTTP 503.
Depois encaminhou a consulta ao backend PostgreSQL real.
O backend respondeu 401, corretamente, para o visitante anônimo.
A interface recuperou o acesso sem clique em recuperação.
A consulta 401 posterior corresponde à recarga dos filtros.
Não houve mock de repository ou banco de dados.

A API publicada também apresentou uma inicialização de 35.108 ms.
Essa medição reforça a necessidade da recuperação automática.
O código novo aguarda publicação para atuar naquele frontend.

Fontes: [serviço](../../frontend/src/services/http/usuarios.service.ts),
[estado visual](../../frontend/src/components/layout/RestaurandoSessao.tsx),
[testes](../../frontend/tests/services/http/usuarios.service.test.ts)
e [sequência HTTP real](browser-gateway.json).

### Avaliação legada

O responsável autorizou excluir somente a avaliação inconsistente.
Identificador: `fb000000-0000-4000-8000-000000000004`.
O [backup completo](avaliacao-legada-backup.json) foi preservado antes da alteração.
A transação revalidou identidade e ausência de compra confirmada.
Exatamente uma avaliação foi removida.
As contagens de pedidos e pagamentos permaneceram iguais.

| Registro | Antes | Depois |
|---|---:|---:|
| Avaliações | 5 | 4 |
| Pedidos | 4 | 4 |
| Pagamentos | 4 | 4 |
| Avaliações sem compra confirmada | 1 | 0 |

A interface publicada passou a informar ausência de avaliações.
A nota da Fruteira Entalhada também deixou de aparecer.
Os demais dados comerciais foram preservados.

Evidências: [checagem vermelha](avaliacao-check-red.json),
[transação](avaliacao-reconciliada.json), [checagem verde](avaliacao-check-green.json)
e [interface publicada](avaliacao-publica-corrigida.jpg).

### Credenciais locais do microsserviço

O responsável autorizou ler duas variáveis no Render.
Foram lidas `DATABASE_URL` e `RECOMENDACAO_SERVICE_TOKEN`.
O acesso e login foram autorizados separadamente.
As configurações do Render permaneceram intactas.
Nenhuma credencial publicada foi rotacionada.

`services/recomendacao/.env` recebeu os valores corretos.
O token correspondente foi sincronizado em `backend/.env`.
O destino local permaneceu `http://127.0.0.1:3002`.
Os arquivos anteriores possuem cópias privadas ignoradas pelo Git.
Senhas e tokens não foram incluídos nas evidências públicas.

Um processo local real foi iniciado com essas credenciais.
Saúde, recomendações gerais, categoria e histórico funcionaram.
O cliente HTTP da API também recebeu uma seleção válida.
O papel continuou sem acesso à tabela `Usuario`.
O microsserviço publicado respondeu 200 com o token sincronizado.

Evidências: [smoke autenticado](micro-smoke.json) e [logs sanitizados](micro-runtime.txt).

## Nova bateria de testes

| Camada | Aprovados | Ignorados | Falhas finais |
|---|---:|---:|---:|
| Frontend | 1.041 | 0 | 0 |
| Backend | 837 | 1 | 0 |
| Microsserviço | 116 | 0 | 0 |
| E2E | 9 | 1 | 0 |
| Total | **2.003** | **2** | **0** |

Lint, typecheck e build passaram nos três projetos.
As ignoradas permanecem as duas condições da configuração anterior.
O teste de desempenho exige ativação explícita.
O caso admin móvel é coberto pela execução maior.

O E2E final gerou 23 chamadas reais ao microsserviço.
Todas as chamadas registradas responderam HTTP 200.
Nenhum caso final precisou de repetição automática.
O schema E2E foi removido e sua ausência confirmada.
Os testes utilizaram os bancos QA exclusivos da auditoria.

Na primeira execução E2E, dois casos móveis falharam.
O teste novo usava o nome `Filtros` após recarregar.
O botão então se chama `Filtros 2`.
O seletor foi corrigido para aceitar o contador.
Houve também timeout único no cadastro do segundo contexto.
Ele passou na reprodução isolada e na execução completa seguinte.
Não houve mudança de código para esse timeout isolado.

A tentativa automática inicial também não encontrou FFmpeg.
O componente oficial do Playwright foi instalado.
As execuções iniciais foram preservadas para comparação.

## Evidências automatizadas

- [Testes vermelhos anteriores às correções](frontend-red.json).
- [Primeira validação verde direcionada](frontend-green-inicial.json).
- [Caso de timeout com aborto e recuperação](sessao-timeout-green.json).
- [Frontend final](frontend-tests.json) e [resumo](frontend-summary.json).
- [Backend final](backend-tests.json) e [resumo](backend-summary.json).
- [Build backend](backend-build-summary.json).
- [Microsserviço final](micro-tests.json) e [resumo](micro-summary.json).
- [E2E final](e2e/301b1b469cdc4361ace87c0907d9e054/resultado.json).
- [Chamadas reais](e2e/301b1b469cdc4361ace87c0907d9e054/recomendacao.log).
- [Limpeza E2E](e2e/301b1b469cdc4361ace87c0907d9e054/cleanup.json).
- [Primeira execução E2E](e2e-inicial.txt).
- [Reprodução móvel aprovada](e2e-regressions.txt).
- [Validação manual no navegador](browser-validation.json).
- [Verificações publicadas e consistência PostgreSQL](production-checks.json).
- [Revisão equivalente de segurança](revisao-seguranca.md).
- [Conferência final das evidências](verification.json).

## Banco e limites de publicação

A contagem inicial de migrations foi refinada nesta revisão.
Existem 13 migrations ativas, todas presentes no banco publicado.
O histórico possui 14 registros, incluindo uma migration revertida.
As 19 chaves estrangeiras continuam cobertas por índices.
As consultas finais não encontraram inconsistências comerciais restantes.

O frontend publicado ainda aguarda as correções de código.
Não foi realizado deploy para mudar esse estado.
Apenas a avaliação autorizada foi alterada no banco publicado.
Os testes e a validação visual do código ocorreram localmente.

## Capturas

- [Recuperação em andamento](sessao-recuperando-local.jpg).
- [Recuperação automática concluída](sessao-recuperada-local.jpg).
- [Filtros rápidos corrigidos](filtros-corrigidos-local.jpg).
- [Avaliação pública corrigida](avaliacao-publica-corrigida.jpg).
