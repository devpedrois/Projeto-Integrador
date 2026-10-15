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
