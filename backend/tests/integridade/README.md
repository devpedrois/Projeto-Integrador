# BD-07: integridade do modelo físico

Execute dentro de `backend/`:

```powershell
npm.cmd run test:integridade
```

Configure `DATABASE_URL` exclusivamente para a branch Neon de teste.
O helper existente carrega essa variável de `backend/.env`.
O banco deve conter as migrations atuais já aplicadas.
A suíte não aplica migrations nem utiliza mocks.

Cada caso abre uma transação e cria fixtures próprias.
O `afterEach` executa rollback, inclusive quando uma asserção falha.
Depois consulta os IDs criados nas nove tabelas utilizadas.
A verificação exige zero linhas residuais antes de liberar a conexão.
Os pedidos recebem números explícitos, sem avançar a sequence.

| Caso                                | SQLSTATE esperado | Restrição                                 |
| ----------------------------------- | ----------------- | ----------------------------------------- |
| Estoque negativo                    | `23514`           | `Produto_quantidadeEstoque_check`         |
| Preço zero ou negativo              | `23514`           | `Produto_preco_check`                     |
| Nota 6                              | `23514`           | `Avaliacao_nota_check`                    |
| E-mail repetido com caixa diferente | `23505`           | `Usuario_email_lower_key`                 |
| Exclusão de produto com pedido      | `23001`           | `ItemPedido_produtoId_fkey`               |
| Segundo pagamento do pedido         | `23505`           | `Pagamento_pedidoId_key`                  |
| Notificação repetida                | `23505`           | `Notificacao_usuarioId_pedidoId_tipo_key` |
| Exclusão de técnica referenciada    | `23001`           | `Produto_tecnicaId_fkey`                  |

São nove testes, pois preço cobre zero e negativo separadamente.
O Neon utilizado retorna `23001` nas exclusões `RESTRICT`.
Pedro autorizou esse ajuste após a execução inicial.
As duas FKs continuam com `ON DELETE RESTRICT`.
A classificação `restrict_violation` consta na [documentação PostgreSQL](https://www.postgresql.org/docs/18/errcodes-appendix.html).

## PI4-33.1: índice em toda chave estrangeira

`fk-com-indice.integridade.test.ts` consulta somente o catálogo PostgreSQL.
Usa o schema retornado por `current_schema()` na conexão existente.
O teste falha também quando esse schema não contém FKs.

Compara `pg_constraint.conkey` com o prefixo ordenado de `pg_index.indkey`.
Aceita índices comuns, PRIMARY KEY e UNIQUE da própria tabela.
Considera somente índices válidos, prontos e sem predicado parcial.
Colunas INCLUDE não contam como colunas-chave do índice.
Cada coluna descoberta aparece como `tabela.coluna` na falha.

`MODO_ESTRITO` permanece `false`, aceitando prefixos de índices compostos.
Se o professor rejeitar prefixos, altere a constante para `true`.
O modo estrito exige exatamente as colunas-chave da FK.

O script `test:integridade` já inclui todos os arquivos deste diretório.
O CI também os descobre pelo comando `npm test` existente.
Nenhuma alteração dos scripts ou do workflow foi necessária.

Na execução anterior à 33.2, somente `PerfilArtesao.tecnicaPrincipalId` falhou.
Os outros dez testes de integridade passaram.
O modo estrito acrescentou cinco FKs à lista:

- `Avaliacao.compradorId`;
- `ItemCarrinho.carrinhoId`;
- `Notificacao.usuarioId`;
- `Pedido.compradorId`;
- `ProdutoFoto.produtoId`.

O RED permanece esperado até a implementação da 33.2.
Nenhum índice ou migration foi criado nesta subtarefa.
Evidências locais: [PI4-33.1](../../../evidencias/PI4-33/33.1/20261104-134954/README.md).
