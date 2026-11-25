# Pre-requisitos e ordem obrigatoria

Use PostgreSQL 13 ou superior, em psql, pgAdmin ou DBeaver. Os scripts da AV2 do projeto Origem usam recursos nativos. Foram testados no PostgreSQL 13.23 e no 16.15.

Conecte-se a um banco local vazio com permissão `CREATE` nesse banco. O usuário `postgres` de uma instalação local normalmente possui essa permissão. Para criar um banco separado, execute o comando abaixo com um usuário que possua `CREATEDB`. Em seguida, conecte-se a `origem_av2`.

```sql
CREATE DATABASE origem_av2;
```

1. Execute **ddl.sql**. O script recria somente o schema `origem`, cria suas 15 tabelas e termina sem erro. Os demais schemas do banco dedicado ficam intactos.
2. Execute **seed_dml.sql** no mesmo banco. A carga termina com uma contagem de 15 tabelas, cada uma com pelo menos três linhas. Antecipar o seed produz a mensagem `Execute ddl.sql antes de seed_dml.sql (schema origem nao encontrado)`.
3. Opcionalmente, execute **testes_restricoes.sql** e, depois, os comandos individuais de **demo_erros.sql**.

**Reexecução.** Executar o DDL novamente apaga os dados e recria o schema `origem`. Use um banco dedicado à avaliação, sem dependências externas nesse schema. Depois, execute o seed uma vez. A carga usa identificadores fixos para permitir acompanhar as relações.

## Execução por cliente

**psql.** No terminal, entre na pasta `database/av2/`. Use o mesmo banco e usuário nos três comandos. Substitua o nome do banco se necessário.

```sh
psql -d origem_av2 -v ON_ERROR_STOP=1 -f ddl.sql
psql -d origem_av2 -v ON_ERROR_STOP=1 -f seed_dml.sql
psql -d origem_av2 -v ON_ERROR_STOP=1 -f testes_restricoes.sql
```

**pgAdmin ou DBeaver.** Abra o Query Tool ou editor SQL conectado ao banco escolhido. Abra o DDL e execute o arquivo inteiro. Repita com o seed. A última grade mostra `tabela` e `linhas`. Para testar as restrições, execute o terceiro arquivo inteiro e consulte as mensagens do servidor. São esperados 21 avisos `OK`. O `ROLLBACK` final preserva a carga.

**Demonstração em vídeo.** Abra `demo_erros.sql` após o seed. Com a confirmação automática de transações ativa, selecione uma instrução comentada por vez e execute a seleção. No psql interativo, cole uma instrução por vez. O PostgreSQL rejeita os seis comandos. Entre eles estão um produto inexistente, uma nota 6 e um email repetido.

## Dados da demonstração

O modelo representa a compra de artesanato pernambucano. A carga distribui seis peças pelas seis categorias oficiais. Os três compradores fazem quatro pedidos. Três são confirmados, e o cancelado tem pagamento recusado. O pedido `ORG-2026-000001` reúne duas unidades do vaso a 48,50 e um guardanapo a 32,00. Tanto o pedido quanto o pagamento registram 129,00.

O ano da mostra é fixo. Os quatro sufixos consomem a sequência de pedidos para preservar a numeração das próximas compras. As contas são fictícias e usam marcadores impróprios para autenticação.

## Regras de negócio e constraints

| Regra de negócio | Constraint que a garante |
|---|---|
| Cada email identifica uma conta e usa minúsculas. | `uq_usuarios_email` e `ck_usuarios_email_minusculo` |
| O perfil pertence a uma conta de artesão. | `ck_perfis_artesao_papel_artesao` e `fk_perfis_artesao_usuario_id_papel` |
| O carrinho pertence a uma conta de comprador. | `ck_carrinhos_papel_comprador` e `fk_carrinhos_usuario_id_papel` |
| Cada peça referencia uma técnica cadastrada. | `fk_produtos_tecnica_id` |
| O preço de catálogo é positivo. | `ck_produtos_preco_positivo` |
| O estoque disponível pode chegar a zero. | `ck_produtos_estoque_nao_negativo` |
| Cada posição de foto é exclusiva por produto. | `uq_produto_fotos_produto_id_ordem` |
| O carrinho reúne cada produto em uma linha. | `pk_itens_carrinho`, sobre `carrinho_id, produto_id` |
| O número legível do pedido segue o padrão e é único. | `ck_pedidos_numero_formato` e `uq_pedidos_numero` |
| Cada posição é única dentro do pedido, inclusive com produtos repetidos. | `pk_itens_pedido`, sobre `pedido_id, numero_item` |
| Um pedido com itens conserva seu histórico. | `fk_itens_pedido_pedido_id` com `ON DELETE RESTRICT` |
| O subtotal corresponde à quantidade vezes o preço unitário. | `ck_itens_pedido_subtotal_calculado` |
| Apenas um item enviado tem data de envio, obrigatória nesse estado. | `ck_itens_pedido_data_envio_status` |
| Cada pedido admite um pagamento simulado. | `uq_pagamentos_pedido_id` |
| Cada comprador avalia o mesmo produto uma vez. | `uq_avaliacoes_comprador_id_produto_id` |
| A nota vai de um a cinco. | `ck_avaliacoes_nota_valida` |
| O processamento exige data igual ou posterior à criação. | `ck_intencoes_notificacao_data_processamento_status` e `ck_intencoes_notificacao_cronologia_processamento` |
| O destinatário recebe um aviso por pedido e tipo. | `uq_notificacoes_usuario_id_pedido_id_tipo` |

## Validação automatizada

O validador confere as regras entre tabelas da carga. Entre elas estão o total das linhas por pedido, o valor do pagamento, as vendas confirmadas por produto e a compra que autoriza cada avaliação. Ele também confere papéis, preços do carrinho, intenções e destinatários dos avisos.

Para reproduzir, publique a porta 5432 de um contêiner PostgreSQL **local e descartável** em loopback. Configure `BD_AV2_DATABASE_URL` com os dados desse banco e um usuário com `CREATEDB`. Com as dependências do backend instaladas, execute o comando na raiz.

```sh
npm --prefix backend run bd:av2:validar
```

O comando usa PostgreSQL 16 por padrão. Para a prova de compatibilidade, aponte a variável para um contêiner PostgreSQL 13 e acrescente `-- --postgres13`. Cada execução cria um banco para psql e outro para a biblioteca pg. Nesse segundo modo, cada arquivo é enviado inteiro, como no editor gráfico. [Evidência final](../../evidencias/bd-av2/validacao-final-2026-11-25.txt)

## Otimizacoes do sistema publicado fora deste script

A aplicação publicada usa índices GIN com `pg_trgm` nas buscas por `produtos.nome` e `produtos.descricao`. As views `rec_produtos_elegiveis` e `rec_compras_confirmadas` fornecem dados ao microsserviço de recomendação. A entrega acadêmica usa índices B-tree nas chaves e um índice parcial para a vitrine.
