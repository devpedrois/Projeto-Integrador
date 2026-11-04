# 31.2: checkout, pedido e pagamento

Data: 25/10/2026.
Responsável: Sergio. Revisor humano indicado: Pedro.
Branch: `codex/31-2-pagamento-us20`.
Base: `6111cb7`.

## Entrega

Criado `backend/tests/integration/pagamento.us20.integration.test.ts`.
A suíte exercita cadastro, login, checkout e detalhe reais.
Utiliza Supertest, Express, Prisma e PostgreSQL, sem mocks.
Nenhum arquivo de produção, contrato ou workflow foi alterado.

Dois casos existentes foram transferidos da suíte WEB-09.
Um caso de privacidade foi transferido da WEB-11.
As demais regressões permaneceram nos arquivos originais.
O caso de falha sintética permaneceu na WEB-09.
Não houve duplicação dos casos completos de checkout.

| Origem                                                  | Destino e complemento                                                            |
| ------------------------------------------------------- | -------------------------------------------------------------------------------- |
| WEB-09: valores, pagamento, outbox e carrinho           | US20: preserva as verificações e acrescenta leitura HTTP do pagamento.           |
| WEB-09: estoque insuficiente e preservação transacional | US20: mantém 409, ausência de pedido/pagamento e integridade do carrinho.        |
| WEB-11: terceiro e UUID inexistente recebem 404         | US20: consulta primeiro como proprietário e verifica ausência de dados privados. |

## Nomes usados para rastreabilidade

O backlog US20 possui dois cenários nomeados.
O primeiro trata do registro do pagamento confirmado.
O segundo trata da visibilidade do status do pagamento.
Estoque insuficiente representa o contracaso da confirmação.
Os nomes preservam essa numeração para a futura matriz.

Arquivo: `backend/tests/integration/pagamento.us20.integration.test.ts`.

1. `US20 - cenários 1 e 2: registra pagamento único e exibe o status no detalhe`.
2. `US20 - cenário 1: estoque insuficiente retorna 409 sem pedido ou pagamento`.
3. `US20 - cenário 2: outro comprador não visualiza o pagamento`.

No primeiro caso, o total esperado é 27,04.
Esse total resulta de `2 × 13,37 + 3 × 0,10`.
Asserções conferem método, aprovação, quantidade e valor persistidos.
O detalhe deve devolver esse mesmo pagamento ao proprietário.
No segundo caso, pedidos e pagamentos permanecem com contagem zero.
No terceiro caso, a negação não expõe identificadores privados.

## Verificações

| Verificação                                                     | Evidência                               |
| --------------------------------------------------------------- | --------------------------------------- |
| Três suítes relacionadas: 31 testes aprovados                   | `01-regressao-local.txt`                |
| Backend lint aprovado                                           | `02-lint-backend.txt`                   |
| Backend typecheck aprovado                                      | `03-typecheck-backend.txt`              |
| Mutação omitindo pagamento detectada                            | `04-contraprova-pagamento-omitido.txt`  |
| Mutação removendo propriedade detectada                         | `05-contraprova-comprador-ignorado.txt` |
| Suíte completa com `CI=true`: 671 testes, 63 arquivos aprovados | `06-suite-backend-completa.txt`         |
| Revisão equivalente autorizada                                  | `07-revisao-seguranca.md`               |

Os três arquivos de testes passaram pelo Prettier.
A revisão de whitespace passou, considerando CRLF no Windows.
As contraprovas falharam pelas violações esperadas de comportamento.
O plugin altera somente módulos carregados em memória.
Não houve modificação temporária de arquivos de produção.
Não foi inventado RED inicial para comportamento já existente.

A primeira tentativa no sandbox não executou a validação.
Ela encontrou restrição de rede e arquivos temporários indisponíveis.
A execução autorizada seguinte confirmou os 31 testes verdes.
Avisos existentes de SSL do `pg` aparecem nos logs.
Outros avisos da suíte completa devem ser consultados no log.

## CI

O workflow existente é `.github/workflows/ci.yml`, da 31.1.
O Vitest inclui arquivos `tests/**/*.test.ts` automaticamente.
O novo arquivo não corresponde às exclusões do job.
Assim, o workflow já executará a suíte da US20.

Comando da suíte completa, dentro de `backend/`:

```powershell
$env:CI = 'true'
npm.cmd test -- --testTimeout=60000 --hookTimeout=120000
```

Essa execução local inclui também os arquivos excluídos pelo CI.
Ela não substitui um resultado remoto do GitHub Actions.
Não houve commit, push ou publicação desta alteração.
O aceite remoto permanece pendente da publicação autorizada.

## Limites de escopo

Frontend, benchmarks, matrizes e relatórios gerais permanecem fora desta entrega.
Não houve aplicação de migrations no schema público.
O helper aplica migrations somente ao schema isolado dos testes.
`docs/uso-de-ia.md` recebeu somente o registro resumido desta tarefa.
Esta pasta de evidências permanece ignorada pelo Git existente.
