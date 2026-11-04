# IA.1: contrato formal e adapter HTTP

Data: 22/10/2026, America/Sao_Paulo.
Branch: `codex/ia-1-recommendation-contract`.
Autoria informada: Eliziane. Revisão informada: Pedro.

## Alterações

O adapter e a composição existentes foram preservados.
O container real está em `frontend/src/services/fake/container.ts`.
O teste novo compara todos os campos dos resultados.
Usa BrowserProdutoRepository real e a fixture contratual compartilhada.
Converte somente IDs de produto para UUIDs determinísticos.
A conversão preserva a ordem lexicográfica dos desempates.
A resposta fetch deriva do ranking esperado da fixture.
Ela não deriva da saída do adapter fake.

Os testes de erro agora verificam ServiceError e mensagens públicas.
Cobrem 400, 404 e 503, proibindo acesso ao localStorage.
O teste existente do container continua verificando a classe HTTP.
O OpenAPI já possuía exemplo e resposta 400.
Foi acrescentada somente a resposta 404 solicitada.
Produto ausente ou oculto continua usando fallback geral.

## Validações

- `frontend-adapter.txt`: 29 testes passaram, incluindo container.
- `backend-openapi-red.txt`: falha esperada pela ausência do 404.
- `backend-openapi-green.txt`: oito testes passaram após completar OpenAPI.
- `frontend-test.txt`: 844 testes passaram em 89 arquivos.
- `frontend-lint.txt` e `frontend-typecheck.txt`: comandos concluídos com zero.
- `backend-lint.txt` e `backend-typecheck.txt`: comandos concluídos com zero.
- `formatacao.txt`: Prettier aprovado nos arquivos TypeScript alterados.
- `backend-test.txt`: saída integral da suíte backend.
- A primeira execução backend teve 597 aprovações e um timeout.
- Caso afetado: `reflete moderacao e estoque imediatamente nas leituras`.
- O caso excedeu os cinco segundos padrão do Vitest.
- `backend-catalogo-reteste.txt`: os 27 testes do arquivo passaram.
- Esse reteste usou os limites existentes da CI.
- `backend-test-ci-timeouts.txt`: repetição completa com esses limites.
- Resultado final backend: 598 testes aprovados em 58 arquivos.
- A repetição completa terminou com código zero, sem exclusões.
- `revisao-seguranca.md`: revisão equivalente autorizada por Pedro.

Executar `npm.cmd run lint`, `npm.cmd run typecheck` e `npm.cmd test`
dentro de cada projeto reproduz as verificações principais.
O backend exige as conexões PostgreSQL configuradas no ambiente.
Os limites da CI são `--testTimeout=60000 --hookTimeout=120000`.
Nenhum teste foi excluído nesta repetição completa.
O sandbox bloqueava Supertest com EACCES em loopback.
Os testes HTTP foram executados fora desse sandbox.

## Vitrine HTTP

Executado Next.js, Express e PostgreSQL real em loopback.
O helper existente cria schema temporário dentro de uma transação.
O seed demo roda nesse schema. O encerramento executa rollback.
Nenhuma migration ou seed foi aplicada ao schema público.

Após escolher “Continuar como visitante”, a vitrine recebeu:
`GET /api/recomendacoes`, status 200, estratégia `fallback-geral`.
Os sete links exibidos correspondem exatamente à resposta JSON.
`network.json`, `resposta-http.json` e `smoke.json` registram essa execução.
`vitrine.png` registra a página sem instrumentação adicional.
`vitrine-network.png` acrescenta um painel diagnóstico das respostas observadas.
Esse painel foi gerado pelo Playwright; não representa DevTools nativo.
Nenhum código da interface foi alterado para a captura.

Algumas URLs sintéticas de imagens não resolvem DNS neste ambiente.
As falhas reais aparecem em `smoke-log.txt` e nas imagens.
O navegador também observou 401 nas consultas sem sessão.
Esses comportamentos existentes não foram alterados pela IA.1.

Reprodução da captura, dentro de `backend/`:

```powershell
node --import tsx ../evidencias/IA.1/vitrine-http.mjs
```

O script usa Chrome instalado e Playwright do runtime local.
Processos temporários são encerrados no bloco `finally`.
Não houve commit nem push.
