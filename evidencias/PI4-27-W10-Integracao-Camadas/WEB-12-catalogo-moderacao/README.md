# WEB-12: evidências

Data: 14/10/2026. Branch: codex/web-12-catalogo-moderacao.
Implementação restrita ao catálogo privado e moderação.
Não houve commit ou push.

## Validações finais

| Verificação | Resultado |
|---|---|
| Backend: npm test | 462 testes, 46 arquivos, todos passaram |
| Frontend: npm test | 833 testes, 88 arquivos, todos passaram |
| Backend: lint e typecheck | Exit 0 |
| Frontend: lint e typecheck | Exit 0 |
| Prettier dos arquivos alterados | Todos formatados |
| git diff --check | Exit 0 |
| Revisão local equivalente | Sem achados bloqueantes |
| PENDENTES_HTTP | Vazio, exigido pelo teste do checkpoint |

Logs finais: backend-tests.log e frontend-tests-entrega.log.
Os outros logs registram iterações anteriores.
Permanecem avisos preexistentes do pg e React act.
Não representam testes falhando.

## TDD e autorização

Os testes backend iniciais falharam nas rotas ausentes.
Depois, 26 testes específicos passaram no PostgreSQL real.
Foram verificadas matrizes de PATCH, DELETE e estoque.
Dono recebe 200; outro artesão recebe 403.
Admin recebe 200; anônimo recebe 401.
Comprador recebe 403 nas operações protegidas.
Varredura administrativa inclui a rota existente de alteração de papel.
Também verifica caminhos administrativos inexistentes antes da validação.

Há testes de checkout simultâneo e espera por lock.
Há testes de pedidos históricos após exclusão lógica.
Há testes de login bloqueado e restauração após moderação.
UUID maiúsculo não permite automoderação administrativa.
Inputs extras, URLs inseguras e estoque inválido são rejeitados.

## Verificação visual HTTP

fluxo-http.gif reúne oito capturas reais do navegador.
O navegador consumiu Next.js com proxy para Express local.
O Express usou PostgreSQL real, em schema isolado.
Foi usado exclusivamente um artesão e um admin sintéticos.

Foram verificados cadastro, edição e estoque zero.
O produto removido permaneceu no catálogo privado.
Artesão e produto foram moderados e reativados.
A reativação administrativa preservou a remoção feita pelo dono.

As capturas não incluem a aba Network.
Não foi obtida essa visualização pelas ferramentas disponíveis.
As chamadas HTTP têm cobertura automatizada nos logs e testes.

Os servidores temporários foram encerrados.
O schema exclusivo do smoke foi identificado e descartado.
Nenhum dado de produção foi alterado.

Revisão detalhada: revisao-seguranca.md.
O contrato atualizado fica em docs/docs auxiliares/API.md.
Essa documentação e esta pasta seguem ignoradas pelo Git existente.
