# 32.6: cache e Swagger final

Execução em 08/11/2026, horário de Brasília.
Branch: `codex/32-6-cache-swagger-final`.
Não foi realizado commit ou push.

## Entrega

- [Documento de cache](../../../docs/cache-u2.md).
- [OpenAPI implementado](../../../backend/src/docs/openapi.ts).
- [Teste de contrato](../../../backend/tests/unit/openapi.test.ts).
- [Contrato histórico sincronizado](../../../sprints/semana-02-03/04-Contratos-de-API.md).
- [Inventário documental em CLAUDE.md](../../../CLAUDE.md#8-contratos-de-api-vivo--manter-atualizado).

Foram conferidas todas as operações Express registradas.
O inventário possui 44 operações, iguais às documentadas.
Fonte: [paridade completa](09a6dd10-8235-4b7c-97b5-e60f2c32e8ff/rotas.json).
Assets do Swagger são servidos por middleware estático.
Não representam operações adicionais registradas nos routers da aplicação.
Fonte: [router de documentação](../../../backend/src/routes/docs.routes.ts).

## Evidência HTTP real

O [roteiro](../../../backend/scripts/cache-swagger.evidence.mjs) cria schema isolado.
Aplica migrations existentes e prepara dados exclusivamente sintéticos.
Sobe API e microsserviço reais em portas locais efêmeras.
Usa PostgreSQL real e papéis isolados no microsserviço.
Cookies e tokens temporários permanecem somente em memória.
Nenhum dado publicado foi alterado nessa coleta.

- [Respostas HTTP com headers e hash do corpo](09a6dd10-8235-4b7c-97b5-e60f2c32e8ff/http.json).
- [Log JSON do CacheHttp](09a6dd10-8235-4b7c-97b5-e60f2c32e8ff/cache-http.txt).
- [Log integral da execução](coleta.txt).
- [OpenAPI final servido pela API](9d7a3a85-9452-4ec8-a087-ac2e4842cded/openapi.json).
- [Print final do Swagger](9d7a3a85-9452-4ec8-a087-ac2e4842cded/swagger.png).
- [Limpeza dos objetos temporários](09a6dd10-8235-4b7c-97b5-e60f2c32e8ff/limpeza.json).
- [Inventário dos usos de cache](inventario-cache.txt).

A primeira coleta preserva os headers transcritos no documento.
A segunda repete os controles após corrigir exemplos públicos.
As duas execuções concluíram com sucesso e limpeza isolada.
Fontes: [coleta final](coleta-final.txt),
[HTTP final](9d7a3a85-9452-4ec8-a087-ac2e4842cded/http.json) e
[limpeza final](9d7a3a85-9452-4ec8-a087-ac2e4842cded/limpeza.json).

A coleta comprovou pares MISS/HIT com corpos iguais.
Cobriu lista, detalhe e recomendação com/sem contexto.
Uma edição autenticada de estoque invalidou esses pontos.
As leituras subsequentes retornaram MISS, depois HIT novamente.
São observações locais, sem generalização para desempenho produtivo.

Também verificou respostas pessoais e indicadores sem cache compartilhado.
Avaliações paginadas permaneceram sem cache, com `no-store`.
Seleção curta retornou `misto`, mantendo MISS nas duas chamadas.
Microsserviço desligado retornou `fallback-local`, também mantendo MISS.
Fonte: cenários do arquivo HTTP vinculado acima.

## Correções documentais verificadas

O Swagger passou a descrever os headers dos pontos cacheados.
Inclui `CACHE_TTL_SECONDS`, degradação e contexto inexistente sem 404.
DELETE de item ausente documenta o 404 realmente implementado.
As operações de documentação receberam descrições explícitas.
Indicadores, paginação e estratégias existentes foram preservados e conferidos.
Exemplos de seleções completas agora contêm oito produtos distintos.
Isso corresponde à condição de preservação da estratégia do módulo.
Fonte: [service público](../../../backend/src/services/recomendacao.service.ts).

O contrato histórico marca as rotas fora do semestre.
Corrige cadastro com sessão e remoção não idempotente do carrinho.
A seção 8 de `CLAUDE.md` concentra sua tabela de rotas vigentes.
O `.gitignore` permite versionar esse arquivo e o documento novo.
Essa exceção preserva a atualização solicitada no próximo commit.

## TDD e validações

[A primeira tentativa](tdd-inicial.txt) encontrou bloqueio de loopback no sandbox.
[A execução autorizada](tdd-red.txt) apresentou quatro falhas documentais esperadas.
Os testes precederam as alterações na especificação OpenAPI.
[Após as correções](openapi-verde.txt), os 20 testes OpenAPI passaram.
[Uma contraprova adicional](exemplos-red.txt) detectou exemplos parciais incorretos.
Após corrigi-los, os [21 testes finais](openapi-final.txt) passaram.

Lint e typecheck finais: [lint](lint-final.txt) e [typecheck](typecheck-final.txt).
Suíte backend completa: [log](testes-backend.txt).
Revisão: [conferência documental de segurança](revisao-seguranca.md).

A rodada completa terminou com 824 aprovados e uma falha.
Foram executados 825 casos em 80 arquivos.
A falha foi `32.6 exemplifica selecoes completas com oito produtos distintos`.
A rodada iniciou antes da correção desse exemplo.
Registrou o payload anterior, contendo somente um produto.
O [reteste após a rodada](openapi-pos-suite.txt) aprovou os 21 casos OpenAPI.
Os outros 79 arquivos passaram na rodada completa.
São execuções complementares; o log integral conserva seu resultado falho.
Nenhuma falha foi omitida ou reclassificada como aprovação integral.

Formatação final: [verificação](formatacao-final-verde.txt).
Links e exemplos finais: [conferência](validacao-documental-final.json).

## Reprodução

Dentro de `backend/`, com dependências instaladas:

```powershell
node --import tsx scripts/cache-swagger.evidence.mjs
npm.cmd test -- tests/unit/openapi.test.ts
```

O script recebe `DIRECT_URL` do ambiente de testes.
Cada execução cria um diretório novo para os artefatos.
O navegador usa Chrome, com Playwright instalado no frontend.
`E2E_CHROMIUM_EXECUTABLE_PATH` permite escolher outro executável local.
O roteiro fecha servidores e remove somente seus objetos temporários.

Avisos existentes do driver PostgreSQL foram preservados no log.
Eles tratam da evolução dos modos SSL e consultas concorrentes.
Não houve alteração de dependências ou configuração TLS nesta entrega.
