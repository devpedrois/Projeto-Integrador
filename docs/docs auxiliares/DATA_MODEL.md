# Modelo de dados do Origem

## Convencoes

- Identificadores usam UUID.
- Valores monetarios usam `Decimal` no PostgreSQL.
- Datas usam timestamp com timezone.
- Emails sao unicos e normalizados.
- Exclusoes funcionais usam estado `ativo`.
- Relacoes historicas nao usam cascade destrutivo.
- Restricoes estruturais pertencem ao banco.

## Fake API AV1: moderacao de produto

O `Produto` da Fake API possui o campo opcional `desativadoPorAdmin`. Ele
separa a moderacao do admin (US17) da remocao feita pelo proprio artesao,
que continua usando `ativo = false`. Ausente equivale a `false`, entao dados
ja persistidos no navegador seguem validos sem migracao.

Um produto fica disponivel para venda somente com `ativo`, sem
`desativadoPorAdmin` e com artesao ativo. A vitrine exige tambem estoque
positivo. Reativar pelo admin limpa apenas `desativadoPorAdmin` e nunca
restaura um produto removido pelo dono. O banco espelha o campo desde a
PI4-28 BD-02 (`Produto.desativadoPorAdmin`, `NOT NULL DEFAULT false`).

## Fase FCCPD: schema reduzido temporario

O primeiro schema possui `Produto`, `Pedido` e `ItemPedido`. Ele existe para
demonstrar checkout concorrente. Nao inclui autenticacao nem pagamento.

`Pedido` recebia um identificador sintetico temporario de comprador.
A evolucao criou a FK obrigatoria `compradorId` para `Usuario`.
A PI4-33.4 remove a referencia sintetica do modelo vigente.

Estruturas tecnicas da fila podem existir nesta fase:

- `IntencaoNotificacao`: pedido, estado, tentativas e timestamps;
- tabelas internas administradas pelo `pg-boss`.

`IntencaoNotificacao.pedidoId` e unico. A linha nasce na mesma transacao do
pedido. Assim, uma queda antes da publicacao nao perde a intencao.

## Modelo completo: onze entidades principais e duas referencias

| Entidade | Campos essenciais | Relacoes principais |
|---|---|---|
| Usuario | nome, email, senhaHash, papel, ativo, criadoEm | Perfil, carrinho, produtos, pedidos, avaliacoes |
| PerfilArtesao | historia, tecnicaPrincipalId, regiaoId, foto, completo | Usuario 1:0..1; Tecnica e Regiao N:1 |
| Categoria | nome | Produtos 1:N |
| Produto | nome, descricao, preco, tecnicaId, quantidadeEstoque, ativo, criadoEm | Artesao, categoria, tecnica, fotos |
| Tecnica | id textual alinhado ao seed frontal, nome UNIQUE | Produtos e perfis 1:N |
| Regiao | id textual alinhado ao seed frontal, nome UNIQUE | Perfis 1:N |
| ProdutoFoto | url, ordem | Produto N:1 |
| Carrinho | atualizadoEm | Comprador 1:0..1, itens 1:N |
| ItemCarrinho | quantidade, precoUnitario | Carrinho e produto |
| Pedido | numero, status, total, criadoEm | Comprador, itens, pagamento |
| ItemPedido | quantidade, precoUnitario, subtotal, status, enviadoEm | Pedido e produto |
| Pagamento | metodo, valor, status, dataPagamento | Pedido 1:0..1 |
| Avaliacao | nota, comentario, criadoEm | Comprador e produto |

`ServicoRecomendacao` nao e tabela. Ele e um componente de aplicacao.
Estruturas tecnicas da fila tambem nao entram nas onze entidades conceituais.

### PI4-28 BD-03 — tecnica e regiao como referencias

`Tecnica` e `Regiao` usam IDs textuais e nomes identicos aos seeds da Fake
API. Sao excecoes a convencao UUID. `Produto.tecnicaId` e obrigatorio, sem
default, com FK `RESTRICT`. `PerfilArtesao.tecnicaPrincipalId` e `regiaoId`
continuam opcionais para permitir perfis incompletos, com FKs `RESTRICT`.
Regiao pertence somente ao perfil. A regiao do produto resulta de join.
Indices de consulta permanecem no escopo da BD-04.

A migration `20261013230000_tecnica_regiao_referencias` executa em transacao,
bloqueia escritas nas duas tabelas durante o backfill, normaliza caixa,
acentos e espacos e converte os textos com `UPDATE ... FROM`. Remove os
textos somente apos verificar a conversao e adicionar as FKs. Valores
desconhecidos abortam a transacao e sao listados. Campos originalmente
nulos permanecem nulos, sem fabricar informacao.

O responsavel autorizou definir mapeamentos para a carga sintetica legada:

| Texto legado | Referencia escolhida |
|---|---|
| Ceramica em barro | tecnica-modelagem-argila |
| Marcenaria e renda | tecnica-marcenaria-artesanal |
| Recife - Comunidade do Pilar | regiao-pilar-recife |
| Caruaru - Alto do Moura | regiao-alto-moura-caruaru |

Produto nao possuia tecnica textual. Os nove IDs sinteticos receberam
escolhas explicitas, independentes da tecnica principal do artesao:

| Produto sintetico | Tecnica escolhida |
|---|---|
| Vaso de Barro Trancoso | Torno Ceramico |
| Jarra de Barro Fosca | Modelagem em Argila |
| Toalha de Renda File | Renda Irlandesa |
| Colcha Bordada Ponto Cruz | Bordado a Mao |
| Fruteira Entalhada | Entalhe em Madeira |
| Camisa Autoral Origem | Costura Autoral |
| Brinco de Semente Regional | Bijuteria em Sementes Naturais |
| Luminaria PET Reciclada | Tecelagem Manual |
| Cesto de Fibra Descontinuado | Trancado em Fibra Natural |

Renda File para Renda Irlandesa e PET para Tecelagem Manual sao
aproximacoes autorizadas da demonstracao, sem equivalencia tecnica real.
Nao sao regras de classificacao automatica. Produtos fora destes nove
IDs abortam a migration para receber escolha explicita. O seed passa a
gravar esses mesmos IDs nas relacoes. A evidencia de join esta em
`backend/prisma/evidence/bd03-tecnica-regiao.sql`.

## Enums

- `PapelUsuario`: `comprador`, `artesao`, `admin`.
- `StatusPedido`: `pendente`, `confirmado`, `cancelado`.
- `StatusItemPedido`: `aguardando_envio`, `enviado`.
- `MetodoPagamento`: `pix_simulado`.
- `StatusPagamento`: `aprovado`, `recusado`.
- `StatusIntencao`: `pendente`, `publicada`, `processada`, `falha`.

## Integridade minima

- Email de usuario possui unicidade.
- Estoque possui restricao `quantidadeEstoque >= 0`.
- Nota permanece entre 1 e 5.
- Quantidades permanecem maiores que zero.
- Produto exige artesao e categoria existentes.
- Pedido exige comprador existente no modelo completo.
- ItemPedido exige pedido e produto existentes.
- Pagamento possui, no maximo, um registro por pedido.
- Exclusao de produto nao remove itens historicos.

## Evolucao das migrations

### Web.2 — envio por item

Migration: `20261025160000_status_item_pedido`.
`ItemPedido.status` e obrigatorio, default `aguardando_envio`.
`ItemPedido.enviadoEm` e nullable, tipo `TIMESTAMPTZ(3)`.
Itens existentes recebem o default, preservando seus demais campos.
O estado do item independe de `Pedido.status`.
A API permite somente `aguardando_envio` para `enviado`.
Exige pedido confirmado e propriedade atual do produto.
Grava `enviadoEm` na mesma transacao, sem permitir reenvio.
Bloqueia o item e protege pedido/produto durante a verificacao.
Endereco de entrega nao existe no modelo atual.
Web.2 nao cria enderecos nem contatos ficticios.

O schema completo altera o schema reduzido existente. Preserve o historico
de migrations. Nao apague migrations aplicadas no Neon. Resolva campos novos
com migracoes explicitas e dados de transicao.

### PI4-19.2 — schema Prisma completo, sem migration nova ainda

`backend/prisma/schema.prisma` evoluiu do schema reduzido (`Produto`,
`Pedido`, `ItemPedido`, `IntencaoNotificacao`) para as onze entidades de
dominio, seguindo `sprints/semana-06-07/01-Modelo-Logico-BD.md`. Nenhuma
migration foi gerada nesta subtarefa; o Neon de desenvolvimento continua no
schema reduzido ate a PI4-19.3, que cria e aplica a migration.

Campos que preservam dados ja gravados pelo backend reduzido:

- `Produto`: `artesaoId`, `categoriaId`, `descricao` e `preco` nascem
  opcionais. O produto semeado pelo FCCPD (`prisma/seed.ts`) nao tem artesao,
  categoria nem preco definidos; a migration seguinte decide entre backfill
  ou manter opcional ate a subtarefa que popula esses dados.
- `Pedido`: a referencia sintetica foi preservada nesta etapa historica.
  `compradorId` nasceu como FK opcional para `Usuario`.
  A PI4-19.5 tornou a FK obrigatoria apos conferir os dados.
  A PI4-33.4 remove a referencia sintetica restante.
  `numero` e `total` tambem nascem opcionais pelo mesmo motivo: pedidos ja
  criados pelo backend reduzido nao tem esses valores.
- `ItemPedido`: `precoUnitario` e `subtotal` nascem opcionais pela mesma
  razao — itens ja gravados nao carregam preco congelado.

Nenhuma FK nova usa `onDelete: Cascade` sobre tabelas de historico
(`Pedido`, `ItemPedido`, `Pagamento`). Cascade aparece somente em
especializacoes 1:0..1 de `Usuario` (`PerfilArtesao`, `Carrinho`) e em
`ProdutoFoto`, que nao e historico de venda.

### PI4-19.3 — migration aplicada no Neon de desenvolvimento

`backend/prisma/migrations/20260915154901_add_dominio_completo/migration.sql`
evolui o schema reduzido do FCCPD para as onze entidades de dominio. Gerada
por diff schema-a-schema (`prisma migrate diff`, sem shadow database) e
revisada manualmente antes da aplicacao, para preservar dois checks que o
Prisma nao representa no `schema.prisma` (sem suporte estavel a `@@check` na
versao 7.10 usada aqui) e que nao apareceriam no diff automatico:

- `Produto_quantidadeEstoque_check` (herdado da migration inicial, intocado);
- `ItemPedido_quantidade_check` (herdado, intocado);
- `ItemCarrinho_quantidade_check` (novo, adicionado manualmente na migration);
- `Avaliacao_nota_check` (novo, adicionado manualmente na migration).

Aplicada com `prisma migrate deploy` (nao `migrate dev`) porque o shell nao
interativo do ambiente de execucao recusa `migrate dev`; o comando roda
contra a mesma DIRECT_URL de desenvolvimento (branch Neon
`ep-solitary-fire-ack2rila`, prefixo ja usado pelas duas migrations
anteriores). Historico anterior (`20260914000000_init_fccpd`,
`20260915023849_add_intencao_notificacao`) nao foi alterado.

Confirmado apos aplicar: 11 tabelas de dominio + `IntencaoNotificacao` +
`_prisma_migrations`; 14 foreign keys; uniques (`Usuario.email`,
`Pedido.numero`, `Pagamento.pedidoId`, `Avaliacao.compradorId+produtoId`,
`ItemCarrinho.carrinhoId+produtoId`, `ProdutoFoto.produtoId+ordem`,
`Categoria.nome`); NOT NULL nos campos essenciais de `Usuario` e `Produto`;
Naquela etapa, a referencia sintetica e os campos monetarios eram opcionais.
`numero`, `total`, `precoUnitario` e `subtotal` continuam opcionais.
A referencia sintetica foi removida na PI4-33.4.

### PI4-19.4 — carga sintetica representativa (seed idempotente)

`backend/prisma/seed.ts` evoluiu do seed reduzido do FCCPD (um `Produto`
isolado) para uma carga sintetica cobrindo as onze entidades de dominio:
6 categorias oficiais, 5 usuarios (1 admin, 2 artesao, 2 comprador, cada um
com `senhaHash` reconhecivel como demonstracao, prefixo `seed$demo$`,
nunca uma senha em texto plano), 2 perfis de artesao em regioes diferentes
(Recife - Comunidade do Pilar e Caruaru - Alto do Moura), 1 carrinho com 1
item, 9 produtos distribuidos pelas 6 categorias, 10 fotos, 3 pedidos com 6
itens, 3 pagamentos e 4 avaliacoes.

Casos deliberados para sustentar IA, busca e integridade: um produto sem
nenhuma venda (`Jarra de Barro Fosca`), um produto sem estoque mas ainda
ativo (`Colcha Bordada Ponto Cruz`, visivel apenas ao proprio artesao) e um
produto inativo (`Cesto de Fibra Descontinuado`). Vendas (`ItemPedido`) e
notas (`Avaliacao`) variam por produto para sustentar desempates da
baseline de recomendacao (`docs/docs auxiliares/RECOMMENDATION.md`).

Todos os identificadores sao UUIDs fixos e o seed usa `upsert` (por `id`,
chave primaria ou natural conforme o modelo) em vez de `create`, tornando a
reexecucao idempotente sem duplicar registros — coberto por
`tests/integration/seed.integration.test.ts` contra o Neon de
desenvolvimento (roda o seed duas vezes seguidas e confirma contagens
estaveis por tabela). O seed roda fora de uma transacao Prisma unica: o
round-trip de rede ate o Neon (cerca de 50 upserts) excede o timeout padrao
de transacao interativa (5s); cada upsert e idempotente isoladamente, entao
a falta de atomicidade global nao compromete o resultado final.

`tests/integration/pedidos.integration.test.ts` passou a isolar seus dados
pela identidade sintetica do proprio teste, evitando limpeza global.
A limpeza antiga conflitava com os pedidos persistentes do seed.
Ela violava a FK `Pagamento_pedidoId_fkey` (`RESTRICT`).
Os testes atuais identificam pedidos pela FK ou pelo ID.

### PI4-19.5 — testes de integridade do schema completo e NOT NULL em artesaoId/categoriaId/compradorId

`backend/prisma/migrations/20260915163805_add_dominio_not_null/migration.sql`
promove `Produto.artesaoId`, `Produto.categoriaId` e `Pedido.compradorId` de
opcionais para `NOT NULL`. Nenhum backfill foi necessario: a carga sintetica
da PI4-19.4 ja preenchia os tres campos em toda linha existente (confirmado
por consulta antes de gerar a migration).
A referencia sintetica permaneceu legada ate a PI4-33.4.
`compradorId` passou a ser a FK real e obrigatoria.

Consequencia direta no backend minimo do FCCPD: `POST /pedidos`
(`backend/src/validators/pedido.validator.ts`,
`backend/src/repositories/pedido.repository.ts`) passou a exigir
`compradorId` (UUID de um `Usuario` existente) no corpo da requisicao,
alem da referencia sintetica entao aceita. O contrato atual usa a sessao.
`scripts/concorrencia-checkout.ts`
cria um `Usuario` artesao, um `Usuario` comprador e uma `Categoria`
sinteticos uma unica vez no inicio da execucao (reaproveitados pelas 3
rodadas) e os remove no `finally`, junto com o `Produto` e `Pedido` de cada
rodada.

Testes de integridade do schema completo (onze entidades) vivem em
`backend/tests/integration/dominio-completo.constraints.integration.test.ts`,
cobrindo: pedido sem usuario, item sem pedido, item sem produto, produto sem
artesao, produto sem categoria, email duplicado, estoque negativo, nota fora
do intervalo 1-5, segundo pagamento para o mesmo pedido, e a preservacao de
`ItemPedido` quando um `Produto` e desativado logicamente (`ativo = false`,
sem cascade). `backend/tests/integration/constraints.integration.test.ts`
(schema reduzido do FCCPD) foi ajustado para criar artesao/categoria/
comprador sinteticos antes de inserir `Produto`/`Pedido`, ja que essas FKs
deixaram de aceitar `NULL`. Fixtures compartilhadas ficam em
`backend/tests/helpers/dominio-fixtures.ts`.

### PI4-28 BD-02 — reconciliacao com o modelo logico

`backend/prisma/migrations/20261013213237_reconciliar_modelo_logico/migration.sql`
aproxima o schema aplicado do modelo logico
(`sprints/semana-06-07/01-Modelo-Logico-BD.md` §4). Gerada por
`prisma migrate dev --create-only`, completada com SQL manual e aplicada com
`prisma migrate dev` no Neon de desenvolvimento. Ordem da migration:

0. preflight em bloco `DO`: aborta com mensagem clara se houver email
   duplicado apos normalizar caixa e espacos, `senhaHash` vazio,
   `Produto.preco <= 0`, valores negativos em `ItemPedido`, `ItemCarrinho` ou
   `Pedido.total`, ou `Pagamento.valor <= 0`. Esses casos nao tem correcao
   automatica segura, e abortar antes evita uma migration marcada como falha
   no meio do caminho;
1. backfill dos produtos legados do FCCPD: `descricao` nula ou vazia recebe
   texto sintetico, `preco` nulo recebe `1.00` e a linha passa a
   `ativo = false`, para nao ser vendida pelo preco sintetico. No Neon de
   desenvolvimento nenhuma linha precisou de backfill (0 de 9 produtos), mas o
   passo protege bases com produtos criados pelo schema reduzido;
2. `Produto.descricao` e `Produto.preco` passam a `NOT NULL`, com
   `Produto_preco_check (preco > 0)`;
3. checks de nao negatividade: `ItemPedido_precoUnitario_check`,
   `ItemPedido_subtotal_check`, `ItemCarrinho_precoUnitario_check`,
   `Pedido_total_check` (`>= 0`) e `Pagamento_valor_check` (`> 0`);
4. emails existentes normalizados com trim e lowercase, igual ao
   `UsuarioService`; depois `Usuario_email_lower_key`, indice unico funcional
   em `lower(email)`, e
   `Usuario_senhaHash_check (length("senhaHash") > 0)`;
5. `Produto.desativadoPorAdmin BOOLEAN NOT NULL DEFAULT false`;
6. a referencia sintetica de `Pedido` passa a nullable.
   O comentario SQL marcou sua remocao para a Sprint 6.

Os checks e o indice funcional nao aparecem no `schema.prisma`; o Prisma 7.10
nao os expressa. `prisma migrate diff` do banco para o schema volta vazio,
entao nao ha drift. O indice exato `Usuario_email_key` continua existindo
para `findUnique` por email.

`ItemPedido.precoUnitario`, `ItemPedido.subtotal`, `Pedido.total` e
`Pedido.numero` seguem nullable: os pedidos do backend minimo de FCCPD ainda
nao gravam esses valores. Um `CHECK` aceita `NULL`, entao os checks novos nao
quebram o checkout atual.

A normalizacao do email tambem acontece na aplicacao:
`backend/src/services/usuario.service.ts` aplica `trim` e `lowercase` antes de
persistir, e `PrismaUsuarioRepository` traduz a violacao de unicidade para
`409 EMAIL_JA_CADASTRADO`. Ainda nao existe rota que use esse service.

### PI4-28 BD-06 — estrutura tecnica Notificacao

`Notificacao` fica fora das onze entidades de dominio, como
`IntencaoNotificacao`. Tem `id` UUID, `usuarioId` UUID, `pedidoId` UUID,
`tipo` enum `TipoNotificacao` com `novo_pedido`, `lida` obrigatorio com
default `false` e `criadoEm` timestamp com timezone e default `now()`.
As FKs para `Usuario` e `Pedido` usam `RESTRICT` e `ON UPDATE CASCADE`.

A chave unica `(usuarioId, pedidoId, tipo)` impede duplicacao por reentrega.
Ela tambem indexa a FK `usuarioId`. O indice simples `pedidoId` suporta
a verificacao da outra FK. O indice de leitura do painel pertence a BD-04.
O repository ignora conflitos de unicidade sem sobrescrever dados.
A migration `20261013230100_add_notificacao` acrescenta somente enum,
tabela, constraints e indices, dentro de uma transacao.
O handler da fila permanece inalterado nesta subtarefa.

### PI4-27 WEB-09 — checkout completo e pagamento simulado

Migration: `20261014160000_checkout_web09`.
`Produto.quantidadeVendida` recebe inteiro obrigatorio, default zero e check
nao negativo. O backfill soma itens de pedidos confirmados existentes.
O checkout incrementa esse contador junto da baixa de estoque.
O catalogo preserva sua agregacao sobre itens confirmados.

`Pedido.numero` recebe default PostgreSQL baseado em `Pedido_numero_seq`.
Formato: `ORG-AAAA-NNNNNN`, com ano do CURRENT_TIMESTAMP do banco.
A sequence global inicia depois do maior sufixo legado reconhecido.
Usa NO CYCLE, limite 999999 e pertence a coluna numero.
Nao reinicia anualmente. Ao atingir o limite, exige nova migration.
Dez sucessos consecutivos sem outras insercoes produzem numeros consecutivos.
Abortos depois do nextval podem deixar lacunas, conforme PostgreSQL:
https://www.postgresql.org/docs/current/functions-sequence.html.

Os campos monetarios usam Decimal nas contas da transacao.
Pedido.total e Pagamento.valor sao a soma dos subtotais.
ItemPedido captura precoUnitario atual e subtotal da quantidade solicitada.
Pedidos novos persistem status confirmado e pagamento pix_simulado aprovado.
Campos nullable continuam aceitando registros historicos FCCPD.

### PI4-33.4 — identidade unica do comprador no pedido

Migration: `20261105031508_remover_pedido_comprador_ref`.
Remove somente a referencia sintetica legada de `Pedido`.
A coluna nasceu no schema reduzido da demonstracao FCCPD.
O schema atual identifica compradores somente pela FK obrigatoria `compradorId`.
Sua FK `Usuario.id` e o indice composto permanecem preservados.

Antes da aplicacao, os tres pedidos tinham referencia sintetica preenchida.
Todos ja possuíam `compradorId` valido; nenhum backfill foi necessario.
A migration foi aplicada no Neon de desenvolvimento.
Os demais campos dos pedidos, itens e pagamentos foram preservados.
A comparacao utilizou contagens e hashes antes e depois.
Fixtures e testes passaram a usar somente a FK real.
Evidencias: [PI4-33.4](../../evidencias/PI4-33/33.4/README.md).

## Modelo físico da AV2 de BD

O [modelo lógico v2](../../sprints/semana-16-18/01-Modelo-Logico-BD-v2.md) orienta os scripts previstos em `database/av2/`. A decisão D1 separa o DDL acadêmico das migrations Prisma. A aplicação publicada continua usando seu schema de produção. Os scripts acadêmicos criam os objetos no schema dedicado `origem` de um PostgreSQL local descartável. Nesse schema, preços, subtotais, totais e pagamentos rejeitam `NaN`. Cada nome exige ao menos um caractere diferente de espaço em branco.

A primeira coluna usa o nome acadêmico. A segunda identifica o modelo Prisma publicado. A correspondência de campos usa “lógico → Prisma”. Campos com grafia idêntica aparecem uma vez. A última coluna registra diferenças de representação ou integridade.

| Tabela lógica | Modelo Prisma | Campos correspondentes | Diferença relevante |
|---|---|---|---|
| `regioes` | `Regiao` | `id`, `nome` | Slug limitado a VARCHAR(40) e validado no acadêmico. |
| `tecnicas` | `Tecnica` | `id`, `nome` | Slug limitado a VARCHAR(40) e validado no acadêmico. |
| `categorias` | `Categoria` | `id`, `nome` | Nome limitado a 80 caracteres. |
| `usuarios` | `Usuario` | `id`, `nome`, `email`, `senha_hash` → `senhaHash`, `papel`, `ativo`, `criado_em` → `criadoEm` | Email minúsculo e UNIQUE declarativa. UNIQUE (id, papel) sustenta as filhas. |
| `perfis_artesao` | `PerfilArtesao` | `usuario_id` → `usuarioId`, `papel` → só no acadêmico, `historia`, `tecnica_principal_id` → `tecnicaPrincipalId`, `regiao_id` → `regiaoId`, `foto_url` → `foto`, `completo` | foto_url corresponde a foto. O acadêmico adiciona papel fixo e FK composta. A PK continua usuario_id. |
| `carrinhos` | `Carrinho` | `usuario_id` → `usuarioId`, `papel` → só no acadêmico, `atualizado_em` → `atualizadoEm` | O acadêmico adiciona papel fixo e FK composta. A PK continua usuario_id. |
| `produtos` | `Produto` | `id`, `artesao_id` → `artesaoId`, `categoria_id` → `categoriaId`, `tecnica_id` → `tecnicaId`, `nome`, `descricao`, `preco`, `quantidade_estoque` → `quantidadeEstoque`, `quantidade_vendida` → `quantidadeVendida`, `ativo`, `desativado_por_admin` → `desativadoPorAdmin`, `criado_em` → `criadoEm` | Vendas, moderação e técnica permanecem explícitas. O estoque acadêmico começa em zero. |
| `produto_fotos` | `ProdutoFoto` | `id`, `produto_id` → `produtoId`, `url`, `ordem` | Ordem usa SMALLINT e recebe CHECK no acadêmico. |
| `itens_carrinho` | `ItemCarrinho` | `carrinho_id` → `carrinhoId`, `produto_id` → `produtoId`, `quantidade`, `preco_unitario` → `precoUnitario` | O acadêmico promove o par carrinho/produto a PK. O publicado possui id UUID próprio e índice único no par. |
| `pedidos` | `Pedido` | `id`, `comprador_id` → `compradorId`, `numero`, `status`, `total`, `criado_em` → `criadoEm` | numero e total são obrigatórios no acadêmico. O publicado aceita NULL em ambos. |
| `itens_pedido` | `ItemPedido` | `pedido_id` → `pedidoId`, `numero_item` → só no acadêmico, `produto_id` → `produtoId`, `quantidade`, `preco_unitario` → `precoUnitario`, `subtotal`, `status`, `enviado_em` → `enviadoEm` | A PK acadêmica é (pedido_id, numero_item). O publicado usa id UUID. numero_item existe apenas no acadêmico. preco_unitario e subtotal passam a obrigatórios. |
| `pagamentos` | `Pagamento` | `id`, `pedido_id` → `pedidoId`, `metodo`, `valor`, `status`, `data_pagamento` → `dataPagamento` | Ambos admitem até um pagamento por pedido. |
| `avaliacoes` | `Avaliacao` | `id`, `comprador_id` → `compradorId`, `produto_id` → `produtoId`, `nota`, `comentario`, `criado_em` → `criadoEm` | O acadêmico limita o comentário e usa SMALLINT para nota. |
| `intencoes_notificacao` | `IntencaoNotificacao` | `id`, `pedido_id` → `pedidoId`, `status`, `tentativas`, `criado_em` → `criadoEm`, `atualizado_em` → `atualizadoEm`, `processada_em` → `processadaEm` | O acadêmico acrescenta coerência temporal e vínculo entre status e processamento. |
| `notificacoes` | `Notificacao` | `id`, `usuario_id` → `usuarioId`, `pedido_id` → `pedidoId`, `tipo`, `lida`, `criado_em` → `criadoEm` | Ambos preservam a identidade do aviso por destinatário, pedido e tipo. |

As especializações usam `(usuario_id, papel) → usuarios(id, papel)`. A troca administrativa de papel exige resolver o vínculo existente no modelo acadêmico. O sistema publicado atualiza o papel pela aplicação. Nos itens de pedido, repetir produto continua permitido. O número da linha distingue cada ocorrência. [Auditoria do modelo físico](../bd-av2/01-auditoria-modelo-fisico.md)
