# Auditoria do modelo físico para a AV2 de Banco de Dados

**Achado que afeta o lógico v2.** O checkout permite repetir um produto no pedido. A quantidade agregada controla o estoque. Cada entrada mantém sua própria linha de venda. O responsável aprovou a PK `(pedido_id, numero_item)` em 25/11/2026. A seção 5 apresenta a evidência.

**Base da comparação.** O arquivo 00 identifica o ER avaliado em 20/08/2026. O diagrama de classes de 26/08 explica mudanças posteriores. O lógico v1 descreve onze entidades e uma estrutura técnica. O DDL consolidado contém quinze tabelas. A auditoria compara o DDL e o código na base `bb71341` com os documentos locais da AV1. A seção 5 inclui uma execução isolada do validador. [Registro da AV1](00-correcoes-professor-av1.md) · [Diagrama de classes](../../sprints/semana-02-03/03-Modelo-Conceitual-BD.md) · [Lógico v1](../../sprints/semana-06-07/01-Modelo-Logico-BD.md) · [Plano AV2, seções 0 a 2](../PROMPTS_EXECUCAO_BD_AV2.md)

O registro 00, o plano, os modelos da AV1 e os dois documentos auxiliares são fontes locais. Os links correspondentes pressupõem esse material no checkout.

## 1. Inventário do DDL consolidado

São 81 colunas, 15 PKs, 19 FKs e 12 CHECKs. Dos 28 índices explícitos, 12 impõem unicidade. Cada PK acrescenta seu próprio índice único. Há sete enums e uma sequência. As duas views aparecem somente no histórico de migrations. [DDL consolidado](../../backend/prisma/ddl-fisico.sql) · [Schema Prisma](../../backend/prisma/schema.prisma)

Cada tabela abaixo começa com a grafia física. Os campos aparecem com o equivalente em `snake_case`. O inventário conserva os tipos e defaults físicos. “Nenhum” indica ausência de default no PostgreSQL. O Prisma fornece `uuid()` para IDs e mantém `@updatedAt` no cliente. Essas anotações não criam defaults no servidor. As PKs e os índices sem método explícito usam B-tree. Todas as FKs físicas usam `ON UPDATE CASCADE`. Cada entrada informa sua ação de exclusão.

| Enum físico | Nome lógico | Valores permitidos |
|---|---|---|
| `PapelUsuario` | `papel_usuario` | `comprador`, `artesao`, `admin` |
| `StatusPedido` | `status_pedido` | `pendente`, `confirmado`, `cancelado` |
| `StatusItemPedido` | `status_item_pedido` | `aguardando_envio`, `enviado` |
| `MetodoPagamento` | `metodo_pagamento` | `pix_simulado` |
| `StatusPagamento` | `status_pagamento` | `aprovado`, `recusado` |
| `StatusIntencao` | `status_intencao` | `pendente`, `publicada`, `processada`, `falha` |
| `TipoNotificacao` | `tipo_notificacao` | `novo_pedido` |

**Numeração ORG.** O default concatena `ORG-`, ano de `CURRENT_TIMESTAMP`, hífen e seis dígitos da sequência global. `Pedido_numero_seq` usa `BIGINT`, limites 1–999999 e `NO CYCLE`. A sequência pertence a `Pedido.numero`. A troca de ano altera o prefixo, sem reiniciar o contador. Um NULL explícito ainda é aceito pelo DDL. [Sequência](../../backend/prisma/ddl-fisico.sql#L8) · [Default de numero](../../backend/prisma/ddl-fisico.sql#L132)

### Usuario → `usuarios`

[Fonte física, linha 33](../../backend/prisma/ddl-fisico.sql#L33)

| Coluna física | Coluna lógica | Tipo físico | Aceita NULL? | Default físico |
|---|---|---|---|---|
| `id` | `id` | `UUID` | Não | Nenhum |
| `nome` | `nome` | `TEXT` | Não | Nenhum |
| `email` | `email` | `TEXT` | Não | Nenhum |
| `senhaHash` | `senha_hash` | `TEXT` | Não | Nenhum |
| `papel` | `papel` | `PapelUsuario` | Não | `'comprador'` |
| `ativo` | `ativo` | `BOOLEAN` | Não | `true` |
| `criadoEm` | `criado_em` | `TIMESTAMPTZ(3)` | Não | `CURRENT_TIMESTAMP` |

| Restrição ou índice físico | Definição nas colunas lógicas |
|---|---|
| `Usuario_pkey` | PK `id` |
| `Usuario_senhaHash_check` | CHECK `length(senha_hash) > 0` |
| `Usuario_email_key` | Índice UNIQUE `(email)` |
| `Usuario_email_lower_key` | Índice UNIQUE `(lower(email))` |

### PerfilArtesao → `perfis_artesao`

[Fonte física, linha 46](../../backend/prisma/ddl-fisico.sql#L46)

| Coluna física | Coluna lógica | Tipo físico | Aceita NULL? | Default físico |
|---|---|---|---|---|
| `usuarioId` | `usuario_id` | `UUID` | Não | Nenhum |
| `historia` | `historia` | `TEXT` | Sim | Nenhum |
| `tecnicaPrincipalId` | `tecnica_principal_id` | `TEXT` | Sim | Nenhum |
| `regiaoId` | `regiao_id` | `TEXT` | Sim | Nenhum |
| `foto` | `foto` | `TEXT` | Sim | Nenhum |
| `completo` | `completo` | `BOOLEAN` | Não | `false` |

| Restrição ou índice físico | Definição nas colunas lógicas |
|---|---|
| `PerfilArtesao_pkey` | PK `usuario_id` |
| `PerfilArtesao_tecnicaPrincipalId_fkey` | FK `tecnica_principal_id` → `tecnicas.id`. Exclusão `RESTRICT`. |
| `PerfilArtesao_regiaoId_fkey` | FK `regiao_id` → `regioes.id`. Exclusão `RESTRICT`. |
| `PerfilArtesao_usuarioId_fkey` | FK `usuario_id` → `usuarios.id`. Exclusão `CASCADE`. |
| `PerfilArtesao_regiaoId_idx` | Índice `(regiao_id)` |
| `PerfilArtesao_tecnicaPrincipalId_idx` | Índice `(tecnica_principal_id)` |

### Categoria → `categorias`

[Fonte física, linha 58](../../backend/prisma/ddl-fisico.sql#L58)

| Coluna física | Coluna lógica | Tipo físico | Aceita NULL? | Default físico |
|---|---|---|---|---|
| `id` | `id` | `UUID` | Não | Nenhum |
| `nome` | `nome` | `TEXT` | Não | Nenhum |

| Restrição ou índice físico | Definição nas colunas lógicas |
|---|---|
| `Categoria_pkey` | PK `id` |
| `Categoria_nome_key` | Índice UNIQUE `(nome)` |

### Tecnica → `tecnicas`

[Fonte física, linha 66](../../backend/prisma/ddl-fisico.sql#L66)

| Coluna física | Coluna lógica | Tipo físico | Aceita NULL? | Default físico |
|---|---|---|---|---|
| `id` | `id` | `TEXT` | Não | Nenhum |
| `nome` | `nome` | `TEXT` | Não | Nenhum |

| Restrição ou índice físico | Definição nas colunas lógicas |
|---|---|
| `Tecnica_pkey` | PK `id` |
| `Tecnica_nome_key` | Índice UNIQUE `(nome)` |

### Regiao → `regioes`

[Fonte física, linha 74](../../backend/prisma/ddl-fisico.sql#L74)

| Coluna física | Coluna lógica | Tipo físico | Aceita NULL? | Default físico |
|---|---|---|---|---|
| `id` | `id` | `TEXT` | Não | Nenhum |
| `nome` | `nome` | `TEXT` | Não | Nenhum |

| Restrição ou índice físico | Definição nas colunas lógicas |
|---|---|
| `Regiao_pkey` | PK `id` |
| `Regiao_nome_key` | Índice UNIQUE `(nome)` |

### Produto → `produtos`

[Fonte física, linha 82](../../backend/prisma/ddl-fisico.sql#L82)

| Coluna física | Coluna lógica | Tipo físico | Aceita NULL? | Default físico |
|---|---|---|---|---|
| `id` | `id` | `UUID` | Não | Nenhum |
| `nome` | `nome` | `TEXT` | Não | Nenhum |
| `artesaoId` | `artesao_id` | `UUID` | Não | Nenhum |
| `categoriaId` | `categoria_id` | `UUID` | Não | Nenhum |
| `tecnicaId` | `tecnica_id` | `TEXT` | Não | Nenhum |
| `descricao` | `descricao` | `TEXT` | Não | Nenhum |
| `preco` | `preco` | `DECIMAL(10,2)` | Não | Nenhum |
| `quantidadeEstoque` | `quantidade_estoque` | `INTEGER` | Não | Nenhum |
| `quantidadeVendida` | `quantidade_vendida` | `INTEGER` | Não | `0` |
| `ativo` | `ativo` | `BOOLEAN` | Não | `true` |
| `desativadoPorAdmin` | `desativado_por_admin` | `BOOLEAN` | Não | `false` |
| `criadoEm` | `criado_em` | `TIMESTAMPTZ(3)` | Não | `CURRENT_TIMESTAMP` |

| Restrição ou índice físico | Definição nas colunas lógicas |
|---|---|
| `Produto_pkey` | PK `id` |
| `Produto_tecnicaId_fkey` | FK `tecnica_id` → `tecnicas.id`. Exclusão `RESTRICT`. |
| `Produto_artesaoId_fkey` | FK `artesao_id` → `usuarios.id`. Exclusão `RESTRICT`. |
| `Produto_categoriaId_fkey` | FK `categoria_id` → `categorias.id`. Exclusão `RESTRICT`. |
| `Produto_quantidadeEstoque_check` | CHECK `quantidade_estoque >= 0` |
| `Produto_preco_check` | CHECK `preco > 0` |
| `Produto_quantidadeVendida_check` | CHECK `quantidade_vendida >= 0` |
| `Produto_artesaoId_idx` | Índice `(artesao_id)` |
| `Produto_categoriaId_idx` | Índice `(categoria_id)` |
| `Produto_tecnicaId_idx` | Índice `(tecnica_id)` |
| `Produto_nome_trgm_idx` | Índice `USING GIN (nome public.gin_trgm_ops)` |
| `Produto_descricao_trgm_idx` | Índice `USING GIN (descricao public.gin_trgm_ops)` |
| `Produto_vitrine_criadoEm_idx` | Índice `(criado_em DESC) WHERE ativo AND NOT desativado_por_admin AND quantidade_estoque > 0` |

### ProdutoFoto → `produto_fotos`

[Fonte física, linha 100](../../backend/prisma/ddl-fisico.sql#L100)

| Coluna física | Coluna lógica | Tipo físico | Aceita NULL? | Default físico |
|---|---|---|---|---|
| `id` | `id` | `UUID` | Não | Nenhum |
| `produtoId` | `produto_id` | `UUID` | Não | Nenhum |
| `url` | `url` | `TEXT` | Não | Nenhum |
| `ordem` | `ordem` | `INTEGER` | Não | `0` |

| Restrição ou índice físico | Definição nas colunas lógicas |
|---|---|
| `ProdutoFoto_pkey` | PK `id` |
| `ProdutoFoto_produtoId_fkey` | FK `produto_id` → `produtos.id`. Exclusão `CASCADE`. |
| `ProdutoFoto_produtoId_ordem_key` | Índice UNIQUE `(produto_id, ordem)` |

### Carrinho → `carrinhos`

[Fonte física, linha 110](../../backend/prisma/ddl-fisico.sql#L110)

| Coluna física | Coluna lógica | Tipo físico | Aceita NULL? | Default físico |
|---|---|---|---|---|
| `usuarioId` | `usuario_id` | `UUID` | Não | Nenhum |
| `atualizadoEm` | `atualizado_em` | `TIMESTAMPTZ(3)` | Não | Nenhum |

| Restrição ou índice físico | Definição nas colunas lógicas |
|---|---|
| `Carrinho_pkey` | PK `usuario_id` |
| `Carrinho_usuarioId_fkey` | FK `usuario_id` → `usuarios.id`. Exclusão `CASCADE`. |

### ItemCarrinho → `itens_carrinho`

[Fonte física, linha 118](../../backend/prisma/ddl-fisico.sql#L118)

| Coluna física | Coluna lógica | Tipo físico | Aceita NULL? | Default físico |
|---|---|---|---|---|
| `id` | `id` | `UUID` | Não | Nenhum |
| `carrinhoId` | `carrinho_id` | `UUID` | Não | Nenhum |
| `produtoId` | `produto_id` | `UUID` | Não | Nenhum |
| `quantidade` | `quantidade` | `INTEGER` | Não | Nenhum |
| `precoUnitario` | `preco_unitario` | `DECIMAL(10,2)` | Não | Nenhum |

| Restrição ou índice físico | Definição nas colunas lógicas |
|---|---|
| `ItemCarrinho_pkey` | PK `id` |
| `ItemCarrinho_carrinhoId_fkey` | FK `carrinho_id` → `carrinhos.usuario_id`. Exclusão `CASCADE`. |
| `ItemCarrinho_produtoId_fkey` | FK `produto_id` → `produtos.id`. Exclusão `RESTRICT`. |
| `ItemCarrinho_quantidade_check` | CHECK `quantidade > 0` |
| `ItemCarrinho_precoUnitario_check` | CHECK `preco_unitario >= 0` |
| `ItemCarrinho_produtoId_idx` | Índice `(produto_id)` |
| `ItemCarrinho_carrinhoId_produtoId_key` | Índice UNIQUE `(carrinho_id, produto_id)` |

### Pedido → `pedidos`

[Fonte física, linha 129](../../backend/prisma/ddl-fisico.sql#L129)

| Coluna física | Coluna lógica | Tipo físico | Aceita NULL? | Default físico |
|---|---|---|---|---|
| `id` | `id` | `UUID` | Não | Nenhum |
| `compradorId` | `comprador_id` | `UUID` | Não | Nenhum |
| `numero` | `numero` | `TEXT` | Sim | Numeração ORG |
| `status` | `status` | `StatusPedido` | Não | `'pendente'` |
| `total` | `total` | `DECIMAL(10,2)` | Sim | Nenhum |
| `criadoEm` | `criado_em` | `TIMESTAMPTZ(3)` | Não | `CURRENT_TIMESTAMP` |

| Restrição ou índice físico | Definição nas colunas lógicas |
|---|---|
| `Pedido_pkey` | PK `id` |
| `Pedido_compradorId_fkey` | FK `comprador_id` → `usuarios.id`. Exclusão `RESTRICT`. |
| `Pedido_total_check` | CHECK `total >= 0` |
| `Pedido_numero_key` | Índice UNIQUE `(numero)` |
| `Pedido_compradorId_criadoEm_idx` | Índice `(comprador_id, criado_em DESC)` |

### ItemPedido → `itens_pedido`

[Fonte física, linha 141](../../backend/prisma/ddl-fisico.sql#L141)

| Coluna física | Coluna lógica | Tipo físico | Aceita NULL? | Default físico |
|---|---|---|---|---|
| `id` | `id` | `UUID` | Não | Nenhum |
| `pedidoId` | `pedido_id` | `UUID` | Não | Nenhum |
| `produtoId` | `produto_id` | `UUID` | Não | Nenhum |
| `quantidade` | `quantidade` | `INTEGER` | Não | Nenhum |
| `precoUnitario` | `preco_unitario` | `DECIMAL(10,2)` | Sim | Nenhum |
| `subtotal` | `subtotal` | `DECIMAL(10,2)` | Sim | Nenhum |
| `status` | `status` | `StatusItemPedido` | Não | `'aguardando_envio'` |
| `enviadoEm` | `enviado_em` | `TIMESTAMPTZ(3)` | Sim | Nenhum |

| Restrição ou índice físico | Definição nas colunas lógicas |
|---|---|
| `ItemPedido_pkey` | PK `id` |
| `ItemPedido_pedidoId_fkey` | FK `pedido_id` → `pedidos.id`. Exclusão `RESTRICT`. |
| `ItemPedido_produtoId_fkey` | FK `produto_id` → `produtos.id`. Exclusão `RESTRICT`. |
| `ItemPedido_quantidade_check` | CHECK `quantidade > 0` |
| `ItemPedido_precoUnitario_check` | CHECK `preco_unitario >= 0` |
| `ItemPedido_subtotal_check` | CHECK `subtotal >= 0` |
| `ItemPedido_pedidoId_idx` | Índice `(pedido_id)` |
| `ItemPedido_produtoId_idx` | Índice `(produto_id)` |

### Pagamento → `pagamentos`

[Fonte física, linha 155](../../backend/prisma/ddl-fisico.sql#L155)

| Coluna física | Coluna lógica | Tipo físico | Aceita NULL? | Default físico |
|---|---|---|---|---|
| `id` | `id` | `UUID` | Não | Nenhum |
| `pedidoId` | `pedido_id` | `UUID` | Não | Nenhum |
| `metodo` | `metodo` | `MetodoPagamento` | Não | `'pix_simulado'` |
| `valor` | `valor` | `DECIMAL(10,2)` | Não | Nenhum |
| `status` | `status` | `StatusPagamento` | Não | Nenhum |
| `dataPagamento` | `data_pagamento` | `TIMESTAMPTZ(3)` | Não | `CURRENT_TIMESTAMP` |

| Restrição ou índice físico | Definição nas colunas lógicas |
|---|---|
| `Pagamento_pkey` | PK `id` |
| `Pagamento_pedidoId_fkey` | FK `pedido_id` → `pedidos.id`. Exclusão `RESTRICT`. |
| `Pagamento_valor_check` | CHECK `valor > 0` |
| `Pagamento_pedidoId_key` | Índice UNIQUE `(pedido_id)` |

### Avaliacao → `avaliacoes`

[Fonte física, linha 167](../../backend/prisma/ddl-fisico.sql#L167)

| Coluna física | Coluna lógica | Tipo físico | Aceita NULL? | Default físico |
|---|---|---|---|---|
| `id` | `id` | `UUID` | Não | Nenhum |
| `compradorId` | `comprador_id` | `UUID` | Não | Nenhum |
| `produtoId` | `produto_id` | `UUID` | Não | Nenhum |
| `nota` | `nota` | `INTEGER` | Não | Nenhum |
| `comentario` | `comentario` | `TEXT` | Sim | Nenhum |
| `criadoEm` | `criado_em` | `TIMESTAMPTZ(3)` | Não | `CURRENT_TIMESTAMP` |

| Restrição ou índice físico | Definição nas colunas lógicas |
|---|---|
| `Avaliacao_pkey` | PK `id` |
| `Avaliacao_compradorId_fkey` | FK `comprador_id` → `usuarios.id`. Exclusão `RESTRICT`. |
| `Avaliacao_produtoId_fkey` | FK `produto_id` → `produtos.id`. Exclusão `RESTRICT`. |
| `Avaliacao_nota_check` | CHECK `nota BETWEEN 1 AND 5` |
| `Avaliacao_produtoId_idx` | Índice `(produto_id)` |
| `Avaliacao_compradorId_produtoId_key` | Índice UNIQUE `(comprador_id, produto_id)` |

### IntencaoNotificacao → `intencoes_notificacao`

[Fonte física, linha 179](../../backend/prisma/ddl-fisico.sql#L179)

| Coluna física | Coluna lógica | Tipo físico | Aceita NULL? | Default físico |
|---|---|---|---|---|
| `id` | `id` | `UUID` | Não | Nenhum |
| `pedidoId` | `pedido_id` | `UUID` | Não | Nenhum |
| `status` | `status` | `StatusIntencao` | Não | `'pendente'` |
| `tentativas` | `tentativas` | `INTEGER` | Não | `0` |
| `criadoEm` | `criado_em` | `TIMESTAMPTZ(3)` | Não | `CURRENT_TIMESTAMP` |
| `atualizadoEm` | `atualizado_em` | `TIMESTAMPTZ(3)` | Não | Nenhum |
| `processadaEm` | `processada_em` | `TIMESTAMPTZ(3)` | Sim | Nenhum |

| Restrição ou índice físico | Definição nas colunas lógicas |
|---|---|
| `IntencaoNotificacao_pkey` | PK `id` |
| `IntencaoNotificacao_pedidoId_fkey` | FK `pedido_id` → `pedidos.id`. Exclusão `RESTRICT`. |
| `IntencaoNotificacao_pedidoId_key` | Índice UNIQUE `(pedido_id)` |
| `IntencaoNotificacao_status_idx` | Índice `(status)` |

### Notificacao → `notificacoes`

[Fonte física, linha 192](../../backend/prisma/ddl-fisico.sql#L192)

| Coluna física | Coluna lógica | Tipo físico | Aceita NULL? | Default físico |
|---|---|---|---|---|
| `id` | `id` | `UUID` | Não | Nenhum |
| `usuarioId` | `usuario_id` | `UUID` | Não | Nenhum |
| `pedidoId` | `pedido_id` | `UUID` | Não | Nenhum |
| `tipo` | `tipo` | `TipoNotificacao` | Não | Nenhum |
| `lida` | `lida` | `BOOLEAN` | Não | `false` |
| `criadoEm` | `criado_em` | `TIMESTAMPTZ(3)` | Não | `CURRENT_TIMESTAMP` |

| Restrição ou índice físico | Definição nas colunas lógicas |
|---|---|
| `Notificacao_pkey` | PK `id` |
| `Notificacao_usuarioId_fkey` | FK `usuario_id` → `usuarios.id`. Exclusão `RESTRICT`. |
| `Notificacao_pedidoId_fkey` | FK `pedido_id` → `pedidos.id`. Exclusão `RESTRICT`. |
| `Notificacao_pedidoId_idx` | Índice `(pedido_id)` |
| `Notificacao_usuarioId_lida_criadoEm_idx` | Índice `(usuario_id, lida, criado_em DESC)` |
| `Notificacao_usuarioId_pedidoId_tipo_key` | Índice UNIQUE `(usuario_id, pedido_id, tipo)` |

## 2. Diferenças e decisões para o lógico v2

“Entra no lógico v2” identifica a regra ou estrutura adotada. “Fica fora” identifica o elemento descartado. A coluna final explica a escolha. A seção 5 registra a decisão do responsável sobre D4.

| Elemento comparado | Lógico v1 e situação física atual | Decisão | Destino e motivo |
|---|---|---|---|
| Convenção de nomes | V1 usa plural em snake_case. O físico usa nomes Prisma entre aspas. | entra no lógico v2 | D1 mantém o vocabulário avaliado. A seção 1 fornece a correspondência. |
| Schema public | O consolidado cria public e pressupõe aplicação vazia. | fica fora | D2 reserva origem para a avaliação. |
| UUID das entidades | O v1 prevê geração no banco. O físico exige IDs fornecidos pelo cliente. | entra no lógico v2 | D3 repõe o default nativo gen_random_uuid() nas PKs UUID próprias. As PKs compartilhadas recebem o ID parental. |
| Extensão pgcrypto do v1 | O DDL atual dispensa essa extensão. | fica fora | D3/D11 usam a função nativa do PostgreSQL 13+. |
| Precisão temporal | V1 usa TIMESTAMPTZ. O físico especifica precisão 3 em todas as datas. | entra no lógico v2 | D3 preserva fuso horário. A precisão de milissegundos caracteriza o físico atual. |
| usuarios.nome | VARCHAR(120) no v1, TEXT no banco. | entra no lógico v2 | Preservar limite 120 e exigir nome preenchido. |
| usuarios.email | O v1 admite CITEXT ou índice funcional. O banco mantém TEXT e dois índices únicos. | entra no lógico v2 | D6 fixa VARCHAR(160), minúsculas, formato mínimo e UNIQUE nomeada. Um índice funcional sozinho permite armazenar maiúsculas. |
| Índices físicos de email | O físico indexa email e lower(email) separadamente. | fica fora | A normalização obrigatória permite uma única chave candidata. |
| usuarios.senha_hash | CHECK não vazio presente nas duas versões. | entra no lógico v2 | Conservar a validação de comprimento prevista em D7. |
| Papel e especializações | V1 descreve a condição. As FKs físicas compartilham apenas usuario_id. | entra no lógico v2 | D9 acrescenta papel fixo nas filhas, UNIQUE(id, papel) no pai e FKs compostas. O impacto administrativo consta na seção 6. |
| perfis_artesao.foto | V1 e físico usam foto. O conceitual entregue identifica uma URL. | entra no lógico v2 | Adotar foto_url, opcional, para identificar o conteúdo. |
| tecnicas | Ausente no v1. O físico possui ID TEXT e nome único. | entra no lógico v2 | Centralizar o vocabulário. D3/D7 limitam o slug a VARCHAR(40) e validam sua forma. |
| regioes | Ausente no v1. O físico possui ID TEXT e nome único. | entra no lógico v2 | Compartilhar a referência regional entre perfis. Aplicar o mesmo domínio de slug. |
| perfis_artesao.tecnica_principal | Texto livre opcional no v1. O físico referencia Tecnica. | entra no lógico v2 | tecnica_principal_id opcional permite perfil incompleto e busca consistente. |
| perfis_artesao.regiao | Texto livre opcional no v1. O físico referencia Regiao. | entra no lógico v2 | regiao_id opcional evita repetir grafias. A região do produto resulta do perfil. |
| categorias.nome | VARCHAR(80) no v1, TEXT no banco. | entra no lógico v2 | Recuperar o limite 80, o nome único e o CHECK de preenchimento. |
| produtos.nome | VARCHAR(160) no v1, TEXT no banco. | entra no lógico v2 | Recuperar o limite 160 e rejeitar nomes vazios. |
| produtos.tecnica_id | Ausente no v1. A FK física é obrigatória. | entra no lógico v2 | A peça pode usar técnica distinta daquela do perfil. |
| produtos.quantidade_estoque | O v1 prevê default zero. O banco exige valor explícito. | entra no lógico v2 | Restaurar zero inicial. Preservar a faixa não negativa. |
| produtos.quantidade_vendida | Ausente no v1. O físico mantém contador com default zero e CHECK. | entra no lógico v2 | Preservar o contador acumulado pelo checkout na transação da venda. |
| produtos.desativado_por_admin | Ausente no v1. O físico separa moderação e atividade. | entra no lógico v2 | A liberação administrativa preserva a escolha do artesão. |
| produto_fotos.ordem | SMALLINT com faixa no v1. O físico usa INTEGER sem CHECK. | entra no lógico v2 | Restaurar SMALLINT, default zero e ordem não negativa. Preservar unicidade por produto. |
| carrinhos.atualizado_em | V1 prevê now(). O físico delega inicialização e atualização ao Prisma. | entra no lógico v2 | Restabelecer o default de inserção. Atualizações posteriores exigem escrita explícita. |
| itens_carrinho.id | V1 e físico usam UUID substituto e UNIQUE no par. | fica fora | D4 promove (carrinho_id, produto_id) a PK da associação. |
| itens_carrinho.preco_unitario | V1 exige preço positivo. O físico também aceita zero. | entra no lógico v2 | Restaurar o limite estrito previsto em D7. |
| pedidos.comprador_ref | Identificador histórico citado pelo v1. A última migration removeu a coluna. | fica fora | comprador_id obrigatório identifica o usuário real. |
| pedidos.numero | V1 exige VARCHAR(30) obrigatório e único. O físico aceita TEXT nulo com default e índice único. | entra no lógico v2 | Exigir formato ORG-AAAA-NNNNNN, tamanho 30, NOT NULL e unicidade nomeada. |
| Pedido_numero_seq | Sequência física sem entidade correspondente no v1. | entra no lógico v2 | Documentar o gerador de pedidos.numero como mecanismo físico de numeração no schema origem. Preserva a geração concorrente sem acrescentar tabela. |
| pedidos.total | V1 exige total. O físico admite NULL apesar do CHECK. | entra no lógico v2 | Tornar obrigatório e preservar o limite não negativo. |
| itens_pedido.id | V1 e físico usam UUID por linha. O físico permite repetir produto. | fica fora | D4 exige PK composta para a entidade fraca. O responsável aprovou numero_item como discriminador. |
| itens_pedido e produto repetido | O par (pedido_id, produto_id) não é único no checkout. | entra no lógico v2 | Registrar a multiplicidade observada. Adotar (pedido_id, numero_item), conforme aprovação do responsável. |
| itens_pedido.preco_unitario | Obrigatório e positivo no v1. O físico permite NULL e zero. | entra no lógico v2 | Exigir preço histórico positivo, obrigatório e independente do catálogo. |
| itens_pedido.subtotal | V1 exige igualdade ao produto de quantidade e preço. O físico verifica apenas subtotal não negativo, quando preenchido. | entra no lógico v2 | Tornar obrigatório e verificar o cálculo na própria linha. |
| itens_pedido.status | Ausente no v1. O físico acrescenta dois estados de envio. | entra no lógico v2 | Preservar status_item_pedido e o estado inicial aguardando_envio. |
| itens_pedido.enviado_em | Ausente no v1. O físico admite data opcional sem vínculo declarativo ao estado. | entra no lógico v2 | Exigir data preenchida se, e somente se, enviado. |
| pagamentos.metodo | O v1 limita o método. O físico também define pix_simulado como default. | entra no lógico v2 | Preservar o único método e seu default. status exige informação do resultado. |
| avaliacoes.nota | V1 usa SMALLINT. O físico usa INTEGER com faixa 1 a 5. | entra no lógico v2 | Recuperar SMALLINT e preservar a faixa. |
| avaliacoes.comentario | V1 e físico usam TEXT opcional. Apenas a API limita o tamanho. | entra no lógico v2 | D7 leva o limite de 500 caracteres ao banco. |
| intencoes_notificacao | Já consta no v1, §5.1. Existe no físico com UNIQUE por pedido. | entra no lógico v2 | Contabilizar separadamente a intenção durável criada no checkout. |
| intencoes_notificacao.tentativas | V1 exige inteiro não negativo. No físico existe apenas default zero. | entra no lógico v2 | Restaurar CHECK preservando o default. |
| intencoes_notificacao.processada_em | O v1 relaciona processamento e data. O físico admite combinações incoerentes. | entra no lógico v2 | Vincular processada ao preenchimento da data, nos dois sentidos. |
| Datas das intenções | O físico usa @updatedAt no cliente, sem CHECK cronológico. | entra no lógico v2 | atualizado_em e processada_em, quando presente, devem ser posteriores ou iguais a criado_em. |
| notificacoes | Ausente no v1. O banco persiste destinatário, pedido, tipo, leitura e criação. | entra no lógico v2 | Preservar entrega idempotente pela UNIQUE (usuario_id, pedido_id, tipo). |
| Nomes e slugs de referência | TEXT aceita nomes vazios e IDs fora do formato. | entra no lógico v2 | D7 exige nomes com conteúdo após trim e slugs válidos. |
| Chaves candidatas | O v1 descreve UNIQUE. O físico as implementa com índices. | entra no lógico v2 | Declarar constraints nomeadas. A PK composta substitui o UNIQUE do carrinho. |
| Exclusão das referências | O físico usa CASCADE nas quatro composições indicadas em D5 e RESTRICT nas demais FKs. | entra no lógico v2 | Manter histórico e vocabulários. Para as duas referências opcionais do perfil, D5 admite justificar SET NULL no commit 02. |
| Atualização das referências | O DDL permite CASCADE nas 19 FKs. | entra no lógico v2 | Limitar CASCADE aos três vínculos com slugs. Usar RESTRICT nos demais, inclusive nas especializações. |
| Índices sobre FKs | V1 adiou índices. O físico cobre as 19 referências. | entra no lógico v2 | D10 cobre cada FK por índice dedicado ou prefixo de chave. Rever cobertura das FKs compostas de D9. |
| Vitrine | O índice parcial ordena produtos ativos, com estoque e sem moderação por data. | entra no lógico v2 | D10 conserva o predicado e a ordenação decrescente. |
| Busca por trigramas | Dois GIN usam a extensão pg_trgm. | fica fora | D10/D11 dispensam extensões na instalação da avaliação. |
| Índices operacionais | Índice por status da intenção e índice da caixa de notificações aceleram leituras específicas. | fica fora | Sua forma exata excede o mínimo de D10. O prefixo da UNIQUE já cobre o destinatário. |
| Pedidos por comprador e data | O físico substituiu o índice simples pelo composto. | entra no lógico v2 | Seu prefixo cobre a FK e a data atende ao histórico do comprador. Evitar duplicação. |
| rec_produtos_elegiveis | View criada por migration. O DDL consolidado a omite. | fica fora | Contrato de leitura do microsserviço, sem entidade adicional. |
| rec_compras_confirmadas | View criada por migration. O DDL consolidado a omite. | fica fora | Projeta compras confirmadas para recomendação. |
| Schema pgboss | O v1 já cita tabelas mantidas pela biblioteca. | fica fora | O ciclo de vida dos jobs pertence ao pg-boss. |
| Schema recomendacao | Privado do microsserviço. Ausente do consolidado da API. | fica fora | Preservar a propriedade dos dados por serviço. |

A cobertura das FKs considera a primeira coluna do índice existente. Os candidatos parciais de pedidos confirmados foram experimentais. O parcial vigente da vitrine consta no próprio DDL. [Índices da U2](../indices-u2.md) · [Modelo de dados da aplicação](../docs%20auxiliares/DATA_MODEL.md) · [Regras de domínio](../docs%20auxiliares/DOMAIN.md)

### Histórico conferido em ordem de aplicação

| Migration | Efeito verificado |
|---|---|
| [`20260914000000_init_fccpd`](../../backend/prisma/migrations/20260914000000_init_fccpd/migration.sql) | Cria Produto, Pedido e ItemPedido. Introduz compradorRef, dois CHECKs, duas FKs e dois índices dos itens. |
| [`20260915023849_add_intencao_notificacao`](../../backend/prisma/migrations/20260915023849_add_intencao_notificacao/migration.sql) | Cria StatusIntencao e a intenção persistente. Garante uma intenção por pedido. |
| [`20260915154901_add_dominio_completo`](../../backend/prisma/migrations/20260915154901_add_dominio_completo/migration.sql) | Acrescenta quatro enums e oito tabelas de domínio. Amplia produtos, pedidos e itens. Mantém campos legados opcionais durante a transição. Introduz índices, FKs e CHECKs de quantidade e nota. |
| [`20260915163805_add_dominio_not_null`](../../backend/prisma/migrations/20260915163805_add_dominio_not_null/migration.sql) | Exige compradorId em Pedido. Exige artesaoId e categoriaId em Produto. |
| [`20261013213237_reconciliar_modelo_logico`](../../backend/prisma/migrations/20261013213237_reconciliar_modelo_logico/migration.sql) | Valida dados, recompõe descrição e preço legados, desativa produtos afetados e normaliza emails. Acrescenta sete CHECKs, unicidade funcional e desativadoPorAdmin. Torna compradorRef opcional. |
| [`20261013230000_tecnica_regiao_referencias`](../../backend/prisma/migrations/20261013230000_tecnica_regiao_referencias/migration.sql) | Cria Tecnica e Regiao com nomes únicos. Carrega referências e usa três tabelas temporárias no preenchimento. Troca textos do perfil por FKs opcionais. Exige técnica no produto. |
| [`20261013230100_add_notificacao`](../../backend/prisma/migrations/20261013230100_add_notificacao/migration.sql) | Cria TipoNotificacao e Notificacao, duas FKs, índice de pedido e unicidade por destinatário, pedido e tipo. |
| [`20261014010000_indices_consultas`](../../backend/prisma/migrations/20261014010000_indices_consultas/migration.sql) | Instala pg_trgm, dois GIN e o parcial da vitrine. Indexa técnica, região, intenções e notificações. Substitui o índice simples de comprador pelo composto com data. |
| [`20261014160000_checkout_web09`](../../backend/prisma/migrations/20261014160000_checkout_web09/migration.sql) | Cria e sincroniza Pedido_numero_seq com os números válidos existentes. Vincula default e propriedade. Soma vendas confirmadas no preenchimento de quantidadeVendida e exige valor não negativo. |
| [`20261025160000_status_item_pedido`](../../backend/prisma/migrations/20261025160000_status_item_pedido/migration.sql) | Cria StatusItemPedido. Acrescenta status obrigatório com default e enviadoEm opcional. |
| [`20261104160116_views_contrato_recomendacao`](../../backend/prisma/migrations/20261104160116_views_contrato_recomendacao/migration.sql) | Cria rec_produtos_elegiveis e rec_compras_confirmadas. O consolidado omite ambas. A primeira distingue elegibilidade e visibilidade. A segunda projeta comprador e produto das compras confirmadas. |
| [`20261104165644_indice_perfil_tecnica_principal`](../../backend/prisma/migrations/20261104165644_indice_perfil_tecnica_principal/migration.sql) | Indexa tecnicaPrincipalId no perfil. Completa a cobertura das FKs. |
| [`20261105031508_remover_pedido_comprador_ref`](../../backend/prisma/migrations/20261105031508_remover_pedido_comprador_ref/migration.sql) | Remove compradorRef de Pedido. Permanece a FK obrigatória compradorId. |

## 3. AV1 e destinos das divergências

O arquivo 00 registra **zero correções formais**. A nota oficial permanece desconhecida. Não há conflito docente com D1–D11. C1–C22 são achados do grupo. O lógico v2 deve manter a seção “Rastreabilidade conceitual (20/08) → lógico v2”. Cada linha abaixo indica onde justificar a evolução. [Registro do responsável, seções 2 a 4](00-correcoes-professor-av1.md)

| Achado | Ponto exato do lógico v2 | Decisão e motivo |
|---|---|---|
| C1 | Rastreabilidade, US11/US12 · ER de carrinhos e itens_carrinho | entra no lógico v2. As duas entidades surgem no diagrama de classes de 26/08 para persistir o carrinho. |
| C2 | Inventário, contagem por origem | entra no lógico v2. Partir das nove entidades avaliadas. Somar duas do carrinho, duas referências e duas estruturas técnicas. Total de quinze. |
| C3 | Convenções de chave · dicionário das PKs | entra no lógico v2. UUID identifica entidades expostas pela API. Slugs identificam referências. Chaves compartilhadas e compostas seguem D4. |
| C4 | Rastreabilidade, Categoria.descricao | fica fora. A descrição do conceitual desapareceu do v1 e do banco. A classificação vigente usa id e nome. |
| C5 | usuarios.ativo | entra no lógico v2. A moderação precisa desativar a conta preservando o histórico. |
| C6 | perfis_artesao.completo | entra no lógico v2. US03 registra completude do perfil. |
| C7 | perfis_artesao.foto_url | entra no lógico v2. Unificar foto_url do ER e foto do v1/físico sob o nome que identifica a URL. |
| C8 | produtos.quantidade_estoque | entra no lógico v2. A coluna quantifica as unidades disponíveis. |
| C9 | pedidos.numero | entra no lógico v2. Fornece identificador legível e único. |
| C10 | itens_pedido.subtotal · catálogo de CHECKs | entra no lógico v2. Preservar o valor derivado armazenado e conferir quantidade × preço. |
| C11 | pagamentos.metodo · enum metodo_pagamento | entra no lógico v2 apenas pix_simulado. cartao_simulado fica fora pelo escopo de US20. |
| C12 | pagamentos.status · enum status_pagamento | entram aprovado e recusado. O estado pendente fica fora pela resposta imediata do pagamento simulado. |
| C13 | pagamentos.data_pagamento | entra no lógico v2. Registrar o instante do pagamento com nome específico. |
| C14 | tecnicas, regioes · FKs de perfis_artesao | entra no lógico v2. Vocabulários compartilhados substituem os textos livres. Os vínculos do perfil continuam opcionais. |
| C15 | produtos.tecnica_id | entra no lógico v2. Cada produto referencia sua própria técnica. |
| C16 | itens_pedido · diagrama da entidade fraca · exemplo de 2FN | entra no lógico v2 a identificação dentro do pedido. O responsável aprovou numero_item como discriminador, conforme seção 5. |
| C17 | itens_carrinho · associação N:M e exemplo de 2FN | entra no lógico v2. O par carrinho/produto já é candidato único. Seus atributos dependem do par. |
| C18 | usuarios, perfis_artesao e carrinhos · especializações e FKs | entra no lógico v2. D9 vincula a chave composta ao papel fixo da filha. Registrar o efeito sobre a troca administrativa. |
| C19 | usuarios.email · chaves candidatas | entra no lógico v2. Fixar VARCHAR(160), minúsculas obrigatórias e UNIQUE nomeada. |
| C20 | Convenções, geração de UUID e requisitos de execução | fica fora a extensão pgcrypto. D3 permite UUID nativo em PostgreSQL 13+. |
| C21 | produtos, itens_pedido e notificacoes · changelog da U2 | entram no lógico v2 quantidade_vendida, desativado_por_admin, status e enviado_em dos itens, além das notificações persistidas. |
| C22 | Índices, coluna inicial por FK e consultas atendidas | entra no lógico v2 a cobertura D10 para categoria, técnica, região e relações de vendas/avaliações. O parcial atende à vitrine. Os GIN ficam fora por portabilidade. |

## 4. Matriz da rubrica

| Requisito | Situação do ddl-fisico.sql | Exigência para a entrega AV2 |
|---|---|---|
| R1 | Parcial. Quinze tabelas cobrem o sistema atual. Grafias, papéis e identificação dos itens divergem do lógico avaliado. | Mapear as quinze tabelas no schema origem. Explicitar 1:1 opcional, 1:N, N:M, especializações e entidade fraca. Rastrear as mudanças desde o ER entregue. |
| R2 | Parcial. UUID, DECIMAL(10,2), TIMESTAMPTZ(3), booleanos e enums já existem. TEXT predomina nos campos curtos. Nota e ordem são INTEGER. | Aplicar D3 por coluna. Usar tamanhos do lógico, slugs VARCHAR(40), SMALLINT para nota e ordem, NUMERIC(10,2) para dinheiro e UUID com default nativo quando próprio. |
| R3 | As quinze tabelas possuem PK nomeada e simples. ItemCarrinho tem UNIQUE no par. ItemPedido admite produto repetido. | Usar PK compartilhada nas especializações e composta na associação do carrinho. Na entidade fraca, usar (pedido_id, numero_item), conforme seção 5. |
| R4 | As 19 FKs declaram ações. Quatro usam ON DELETE CASCADE. As outras quinze usam RESTRICT. Todas propagam updates. | Declarar FKs dentro das tabelas. Justificar ON DELETE por relação. Restringir updates de UUID e propagar renomeações de slug. Implementar as duas FKs compostas de D9. |
| R5 | Há 70 colunas NOT NULL e 21 defaults. Número, total, preço e subtotal históricos aceitam NULL. Chaves alternativas usam índices únicos. | Exigir os quatro campos legados. Conservar opcionais legítimos. Nomear UNIQUE, normalizar email e declarar defaults de IDs, datas, estados iniciais, flags e contadores conforme o dicionário. |
| R6 | Sete enums e doze CHECKs cobrem parte do domínio. Faltam faixas, igualdade do subtotal, textos, cronologia e coerência entre status e datas. | Aplicar todo D7. Validar preços unitários positivos, ordem, tentativas, slugs, nomes, hash, email, número e comentário. Conferir subtotal, estados de envio/processamento, datas e papéis das especializações. |
| R7 | Estrutura preparada para schema vazio, com FKs posteriores. Depende de pg_trgm. Uma segunda execução encontra tipos e sequência existentes. O arquivo não contém povoamento. | Criar tipos, depois pais e filhos, depois índices. Recriar somente origem. Executar DDL e seed em sequência, com três ou mais registros válidos por tabela. Validar execução e repetição no PostgreSQL 16 descartável, conforme D2/D8/D11. |
| Critério 2 | Os 4,0 pontos dependem do lógico revisado. O físico nomeia PK/FK/CHECK, usa índices para unicidade e declara NOT NULL nas colunas. | Nomear PK, FK, UNIQUE e CHECK conforme D8. Nomear no texto do DDL cada declaração NOT NULL exigida pela rubrica. Verificar obrigatoriedade, ações, tipos, sintaxe e ordem no PostgreSQL 16. |

### Fechamento da entrega AV2 em 25/11/2026

| Requisito | Resultado verificado | Arquivo e linha |
|---|---|---|
| R1 · Fidelidade | As 15 tabelas implementam o v2. As especializações usam a chave do usuário. A linha de venda identifica cada ocorrência do produto. | [Relações do v2, L600](../../sprints/semana-16-18/01-Modelo-Logico-BD-v2.md#L600) · [Perfil, L76](../../database/av2/ddl.sql#L76) · [Itens do pedido, L181](../../database/av2/ddl.sql#L181) |
| R2 · Tipos | Sete enums fecham os estados e os papéis. UUID, VARCHAR, NUMERIC, SMALLINT e TIMESTAMPTZ preservam os domínios. | [Enums, L16](../../database/av2/ddl.sql#L16) · [Referências, L29](../../database/av2/ddl.sql#L29) · [Tipos da venda, L181](../../database/av2/ddl.sql#L181) |
| R3 · Identidade | As 15 PKs são nomeadas. As PKs compostas distinguem o produto no carrinho e a posição no pedido. | [Carrinho, L152](../../database/av2/ddl.sql#L152) · [Pedido, L191](../../database/av2/ddl.sql#L191) |
| R4 · Referências | As 19 FKs declaram as duas ações e têm índice compatível. Excluir um usuário remove sua especialização. Renomear um slug propaga a referência. | [Especialização, L86](../../database/av2/ddl.sql#L86) · [Slug, L88](../../database/av2/ddl.sql#L88) · [Inventário, L35](../../evidencias/bd-av2/04-revisao-ddl.txt#L35) |
| R5 · Domínio | As 75 colunas obrigatórias têm NOT NULL nomeado no script. Há 11 UNIQUEs e defaults para identidade, numeração, status e datas. | [Usuários, L58](../../database/av2/ddl.sql#L58) · [Pedidos, L161](../../database/av2/ddl.sql#L161) |
| R6 · Semântica | Os 32 CHECKs cobrem faixas, textos, subtotal, especialização e cronologia. | [Subtotal e envio, L199](../../database/av2/ddl.sql#L199) · [Nota, L234](../../database/av2/ddl.sql#L234) · [Processamento, L256](../../database/av2/ddl.sql#L256) |
| R7 · Execução | DDL executado duas vezes. A carga confirmou 71 registros nas 15 tabelas. Psql e pg passaram em PostgreSQL 13.23 e 16.15. | [Recriação, L11](../../database/av2/ddl.sql#L11) · [Carga, L20](../../database/av2/seed_dml.sql#L20) · [Contagem, L217](../../database/av2/seed_dml.sql#L217) |
| Critério 2 · DDL | Tipos, obrigatoriedade, nomes, expressões e ações foram conferidos por tabela. As quatro execuções confirmaram sintaxe e ordem. | [Revisão estrutural, L18](../../evidencias/bd-av2/04-revisao-ddl.txt#L18) · [Registro final](../../evidencias/bd-av2/validacao-final-2026-11-25.txt) |

Os seis comandos do roteiro produziram os erros previstos. A apresentação individual em vídeo continua como etapa da avaliação. [Roteiro de execução](../../database/av2/README.md) · [Rubrica](../PROMPTS_EXECUCAO_BD_AV2.md)

## 5. Checkout e chave de itens_pedido

**O mesmo produto pode ocupar duas linhas no pedido.** O checkout utiliza duas coleções com finalidades distintas.

| Etapa | Efeito comprovado | Arquivo e linhas |
|---|---|---|
| Entrada HTTP | POST /pedidos exige comprador. O validador aceita 1 a 20 entradas, normaliza o UUID e exige quantidade positiva. Permite IDs repetidos. | [pedido.routes.ts, 45–50](../../backend/src/routes/pedido.routes.ts#L45-L50) · [pedido.validator.ts, 5–12](../../backend/src/validators/pedido.validator.ts#L5-L12) |
| Chamada | O controller usa a identidade autenticada. PedidoService.criar repassa os itens ao repositório. | [pedido.controller.ts, 120–121](../../backend/src/controllers/pedido.controller.ts#L120-L121) · [pedido.service.ts, 44–51](../../backend/src/services/pedido.service.ts#L44-L51) |
| Estoque | PrismaPedidoRepository.criar soma quantidades em um Map por produto. Ordena as chaves, bloqueia as linhas com FOR UPDATE e verifica o estoque agregado. | [pedido.repository.ts, 326–346](../../backend/src/repositories/pedido.repository.ts#L326-L346) · [362–371](../../backend/src/repositories/pedido.repository.ts#L362-L371) |
| Cálculo | O repositório volta a percorrer input.itens. Calcula preço e subtotal por entrada, depois soma os subtotais. | [pedido.repository.ts, 374–388](../../backend/src/repositories/pedido.repository.ts#L374-L388) |
| Escrita | A baixa usa o Map. createMany recebe a lista por entrada. Cada linha recebe novo UUID, o mesmo pedido_id e o produto_id informado. | [pedido.repository.ts, 396–425](../../backend/src/repositories/pedido.repository.ts#L396-L425) |
| Restrição efetiva | ItemPedido tem PK em id e índices separados para pedidoId e produtoId. Nenhuma restrição impõe unicidade do par. | [ddl-fisico.sql, 141–152](../../backend/prisma/ddl-fisico.sql#L141-L152) · [índices, 252–255](../../backend/prisma/ddl-fisico.sql#L252-L255) |

**Conferência do validador.** O schema real aceitou duas entradas do mesmo UUID com grafias de caixa distintas e quantidades 1 e 2. Após normalização, ambas mantiveram o mesmo UUID. Uma lista vazia foi rejeitada.

**Resultado deduzido da transação.** Essas entradas exigem três unidades disponíveis. Com saldo suficiente e produto elegível, o checkout baixa três unidades e grava duas linhas. Cada linha pode receber seu próprio estado de envio.

**Decisão aprovada pelo responsável em 25/11/2026.** Usar PK `(pedido_id, numero_item)` em `itens_pedido`. Definir `numero_item SMALLINT` positivo, numerado dentro do pedido. Manter `produto_id` como FK obrigatória e indexada, permitindo repetições. A PK distingue linhas e preserva sua dependência do pedido. O lógico v2 deve registrar essa revisão de D4 e C16.

## 6. Regras entre tabelas e garantias atuais

Um CHECK local enxerga os valores da própria linha. Os vínculos abaixo exigem consultar outras linhas ou operar numa transação. As garantias da API dizem respeito ao fluxo indicado.

| Regra | Onde a aplicação garante hoje | Alcance e destino |
|---|---|---|
| Perfil pertence a artesão | PrismaUsuarioRepository.criarComEspecializacao cria o perfil no cadastro. PrismaPerfilArtesaoRepository.atualizar bloqueia o usuário e verifica atividade e papel. [Cadastro, 73–89](../../backend/src/repositories/usuario.repository.ts#L73-L89) · [Perfil, 74–86](../../backend/src/repositories/perfil-artesao.repository.ts#L74-L86) | A FK física verifica somente usuario_id. D9 acrescenta papel fixo e FK composta. |
| Carrinho pertence a comprador | PrismaUsuarioRepository.criarComEspecializacao cria o carrinho do comprador. createCarrinhoRouter exige papel. PrismaCarrinhoRepository.bloquear faz upsert por usuário. [Cadastro, 77–87](../../backend/src/repositories/usuario.repository.ts#L77-L87) · [Rota, 10](../../backend/src/routes/carrinho.routes.ts#L10) · [Carrinho, 72–81](../../backend/src/repositories/carrinho.repository.ts#L72-L81) | A guarda antecede a escrita. D9 tornará o papel obrigatório também na relação. |
| Produto pertence a artesão | GestaoProdutosService.criar usa a identidade autenticada. PrismaGestaoProdutosRepository.criar bloqueia Usuario, exige artesão ativo e grava artesaoId. [Service, 24–27](../../backend/src/services/gestao-produtos.service.ts#L24-L27) · [Repository, 86–111](../../backend/src/repositories/gestao-produtos.repository.ts#L86-L111) | Verificação na criação. A FK simples conserva apenas a identidade após troca de papel. |
| Pedido pertence a comprador | createPedidoRouter exige comprador. PedidoController.criar obtém usuario.id da sessão. PedidoService.criar o envia ao repositório. [Rota, 45–50](../../backend/src/routes/pedido.routes.ts#L45-L50) · [Controller, 120–121](../../backend/src/controllers/pedido.controller.ts#L120-L121) · [Service, 44–51](../../backend/src/services/pedido.service.ts#L44-L51) | O bloqueio transacional do comprador usa somente o ID. O papel é verificado na entrada HTTP. |
| Avaliação pertence a comprador | createAvaliacaoRouter exige comprador. AvaliacaoController.criar fornece usuario.id. AvaliacaoService.criar delega a persistência. [Rota, 10–22](../../backend/src/routes/avaliacao.routes.ts#L10-L22) · [Controller, 27–34](../../backend/src/controllers/avaliacao.controller.ts#L27-L34) · [Service, 15–17](../../backend/src/services/avaliacao.service.ts#L15-L17) | O papel é verificado na rota. A FK física alcança qualquer usuário existente. |
| Avaliação exige compra confirmada daquele produto | PrismaAvaliacaoRepository.criar cruza pedido, comprador e item antes da inserção. A transação bloqueia pedido e item para leitura. [avaliacao.repository.ts, 56–82](../../backend/src/repositories/avaliacao.repository.ts#L56-L82) | Sem compra correspondente, retorna 403. A unicidade comprador/produto é proteção adicional do banco. |
| Pedido contém ao menos um item | validateCriarPedido aplica criarPedidoSchema. PrismaPedidoRepository.criar grava pedido e itens na mesma transação. [Validação, 10–12](../../backend/src/validators/pedido.validator.ts#L10-L12) · [aplicação, 118–129](../../backend/src/validators/pedido.validator.ts#L118-L129) · [transação, 326–328](../../backend/src/repositories/pedido.repository.ts#L326-L328) · [escrita, 396–425](../../backend/src/repositories/pedido.repository.ts#L396-L425) | O mínimo é garantido pela entrada HTTP e atomicidade. A FK do item, isoladamente, aceita pedido sem filhos. |
| Total do pedido e igualdade com o valor pago | PrismaPedidoRepository.criar soma valores Decimal, grava total no pedido e reutiliza esse valor no pagamento simulado. [Cálculo, 374–388](../../backend/src/repositories/pedido.repository.ts#L374-L388) · [Pedido, 397–404](../../backend/src/repositories/pedido.repository.ts#L397-L404) · [Pagamento, 427–434](../../backend/src/repositories/pedido.repository.ts#L427-L434) | Garantia na transação de checkout. Cada CHECK monetário físico verifica apenas a faixa local. |
| Venda respeita disponibilidade e atualiza contadores | PrismaPedidoRepository.criar verifica estoque agregado, atividade, moderação e papel do proprietário. A escrita decrementa estoque e incrementa vendas. [Disponibilidade, 340–371](../../backend/src/repositories/pedido.repository.ts#L340-L371) · [Contadores, 405–414](../../backend/src/repositories/pedido.repository.ts#L405-L414) | A validade da venda usa Produto e Usuario. O CHECK de estoque complementa o bloqueio do produto. |
| Envio exige pedido confirmado e produto do artesão | PrismaPedidoRepository.enviarItem verifica proprietário, estado do item e pedido confirmado sob bloqueio. Atualiza status e enviadoEm juntos. [pedido.repository.ts, 155–190](../../backend/src/repositories/pedido.repository.ts#L155-L190) | D7 pode validar a coerência entre status e data. O vínculo com o pedido continua na aplicação. |
| Checkout confirmado gera intenção persistente | PrismaPedidoRepository.criar insere a intenção antes de encerrar a transação. [pedido.repository.ts, 427–446](../../backend/src/repositories/pedido.repository.ts#L427-L446) | A UNIQUE por pedido limita a uma intenção. A transação assegura a criação conjunta. |

**Troca administrativa de papel.** A rota PATCH /admin/usuarios/:id/papel exige admin. O validador aceita comprador ou artesão como destino. UsuarioService.alterarPapel impede alterar o próprio papel. PrismaUsuarioRepository.alterarPapel atualiza somente Usuario.papel. Assim, um comprador promovido a artesão pode conservar seu carrinho. O caminho inverso pode conservar um perfil de artesão. O mesmo limite se aplica ao papel atual em vínculos históricos. [Rota, 11–16](../../backend/src/routes/usuario.routes.ts#L11-L16) · [Validador, 5–8](../../backend/src/validators/usuario.validator.ts#L5-L8) · [Service, 26–40](../../backend/src/services/usuario.service.ts#L26-L40) · [Repository, 133–142](../../backend/src/repositories/usuario.repository.ts#L133-L142)

No modelo acadêmico, D9 exige UNIQUE em usuarios(id, papel). Cada especialização terá papel fixado por CHECK e FK (usuario_id, papel) com ON UPDATE RESTRICT. Mudar o papel exige resolver antes o vínculo incompatível. O bloqueio depende da existência de perfil ou carrinho. As FKs simples de produtos, pedidos e avaliações continuam dependentes das verificações descritas acima.

**Revisão adversarial.** O modelo do agente `security-auditor` estava indisponível nesta conta. O revisor equivalente conferiu as 81 colunas, os 74 objetos nomeados e as 13 migrations. A revisão ajustou a descrição do contador de vendas e a exigência de nomear NOT NULL no script.
