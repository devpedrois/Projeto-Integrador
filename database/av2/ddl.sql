-- Projeto Origem | AV2 de Modelagem e Projeto de Banco de Dados | 25/11/2026
-- Modelo físico relacional. Requer PostgreSQL 13 ou superior, testado em 16.
-- SQL sem extensões. Exige CREATE no banco. Execute ddl.sql antes de seed_dml.sql.
-- Atenção: cada execução recria o schema origem e apaga seus dados.
-- psql: psql -v ON_ERROR_STOP=1 -f ddl.sql
-- pgAdmin/DBeaver: abra o arquivo e execute o script inteiro.

-- Recriação atômica do modelo acadêmico.
BEGIN;

DROP SCHEMA IF EXISTS origem CASCADE;
CREATE SCHEMA origem;
SET search_path TO origem;

-- Domínios fechados do cadastro, da venda e das notificações.
CREATE TYPE papel_usuario AS ENUM ('comprador', 'artesao', 'admin');
CREATE TYPE status_pedido AS ENUM ('pendente', 'confirmado', 'cancelado');
CREATE TYPE status_item_pedido AS ENUM ('aguardando_envio', 'enviado');
CREATE TYPE metodo_pagamento AS ENUM ('pix_simulado');
CREATE TYPE status_pagamento AS ENUM ('aprovado', 'recusado');
CREATE TYPE status_intencao AS ENUM ('pendente', 'publicada', 'processada', 'falha');
CREATE TYPE tipo_notificacao AS ENUM ('novo_pedido');

-- Numeração global dos pedidos, preservada entre mudanças de ano.
CREATE SEQUENCE pedidos_numero_seq AS BIGINT
    MINVALUE 1 MAXVALUE 999999 NO CYCLE;

-- Tabelas em ordem de dependência.
CREATE TABLE regioes (
    id VARCHAR(40) CONSTRAINT nn_regioes_id NOT NULL,
    nome VARCHAR(120) CONSTRAINT nn_regioes_nome NOT NULL,

    CONSTRAINT pk_regioes PRIMARY KEY (id),
    CONSTRAINT uq_regioes_nome UNIQUE (nome),
    CONSTRAINT ck_regioes_nome_preenchido CHECK (length(trim(nome)) > 0),
    CONSTRAINT ck_regioes_slug_valido CHECK (id ~ '^[a-z0-9]+(-[a-z0-9]+)*$')
);

CREATE TABLE tecnicas (
    id VARCHAR(40) CONSTRAINT nn_tecnicas_id NOT NULL,
    nome VARCHAR(120) CONSTRAINT nn_tecnicas_nome NOT NULL,

    CONSTRAINT pk_tecnicas PRIMARY KEY (id),
    CONSTRAINT uq_tecnicas_nome UNIQUE (nome),
    CONSTRAINT ck_tecnicas_nome_preenchido CHECK (length(trim(nome)) > 0),
    CONSTRAINT ck_tecnicas_slug_valido CHECK (id ~ '^[a-z0-9]+(-[a-z0-9]+)*$')
);

CREATE TABLE categorias (
    id UUID CONSTRAINT nn_categorias_id NOT NULL DEFAULT gen_random_uuid(),
    nome VARCHAR(80) CONSTRAINT nn_categorias_nome NOT NULL,

    CONSTRAINT pk_categorias PRIMARY KEY (id),
    CONSTRAINT uq_categorias_nome UNIQUE (nome),
    CONSTRAINT ck_categorias_nome_preenchido CHECK (length(trim(nome)) > 0)
);

CREATE TABLE usuarios (
    id UUID CONSTRAINT nn_usuarios_id NOT NULL DEFAULT gen_random_uuid(),
    nome VARCHAR(120) CONSTRAINT nn_usuarios_nome NOT NULL,
    email VARCHAR(160) CONSTRAINT nn_usuarios_email NOT NULL,
    senha_hash TEXT CONSTRAINT nn_usuarios_senha_hash NOT NULL,
    papel papel_usuario CONSTRAINT nn_usuarios_papel NOT NULL DEFAULT 'comprador',
    ativo BOOLEAN CONSTRAINT nn_usuarios_ativo NOT NULL DEFAULT true,
    criado_em TIMESTAMPTZ CONSTRAINT nn_usuarios_criado_em NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT pk_usuarios PRIMARY KEY (id),
    CONSTRAINT uq_usuarios_email UNIQUE (email),
    CONSTRAINT uq_usuarios_id_papel UNIQUE (id, papel),
    CONSTRAINT ck_usuarios_email_minusculo CHECK (email = lower(email)),
    CONSTRAINT ck_usuarios_email_formato CHECK (email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
    CONSTRAINT ck_usuarios_hash_preenchido CHECK (length(senha_hash) > 0),
    CONSTRAINT ck_usuarios_nome_preenchido CHECK (length(trim(nome)) > 0)
);

CREATE TABLE perfis_artesao (
    usuario_id UUID CONSTRAINT nn_perfis_artesao_usuario_id NOT NULL,
    papel papel_usuario CONSTRAINT nn_perfis_artesao_papel NOT NULL DEFAULT 'artesao',
    historia TEXT,
    tecnica_principal_id VARCHAR(40),
    regiao_id VARCHAR(40),
    foto_url TEXT,
    completo BOOLEAN CONSTRAINT nn_perfis_artesao_completo NOT NULL DEFAULT false,

    CONSTRAINT pk_perfis_artesao PRIMARY KEY (usuario_id),
    CONSTRAINT fk_perfis_artesao_usuario_id_papel FOREIGN KEY (usuario_id, papel)
        REFERENCES usuarios (id, papel) ON DELETE CASCADE ON UPDATE RESTRICT,
    CONSTRAINT fk_perfis_artesao_tecnica_principal_id FOREIGN KEY (tecnica_principal_id)
        REFERENCES tecnicas (id) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_perfis_artesao_regiao_id FOREIGN KEY (regiao_id)
        REFERENCES regioes (id) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT ck_perfis_artesao_papel_artesao CHECK (papel = 'artesao')
);

CREATE TABLE carrinhos (
    usuario_id UUID CONSTRAINT nn_carrinhos_usuario_id NOT NULL,
    papel papel_usuario CONSTRAINT nn_carrinhos_papel NOT NULL DEFAULT 'comprador',
    atualizado_em TIMESTAMPTZ CONSTRAINT nn_carrinhos_atualizado_em NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT pk_carrinhos PRIMARY KEY (usuario_id),
    CONSTRAINT fk_carrinhos_usuario_id_papel FOREIGN KEY (usuario_id, papel)
        REFERENCES usuarios (id, papel) ON DELETE CASCADE ON UPDATE RESTRICT,
    CONSTRAINT ck_carrinhos_papel_comprador CHECK (papel = 'comprador')
);

CREATE TABLE produtos (
    id UUID CONSTRAINT nn_produtos_id NOT NULL DEFAULT gen_random_uuid(),
    artesao_id UUID CONSTRAINT nn_produtos_artesao_id NOT NULL,
    categoria_id UUID CONSTRAINT nn_produtos_categoria_id NOT NULL,
    tecnica_id VARCHAR(40) CONSTRAINT nn_produtos_tecnica_id NOT NULL,
    nome VARCHAR(160) CONSTRAINT nn_produtos_nome NOT NULL,
    descricao TEXT CONSTRAINT nn_produtos_descricao NOT NULL,
    preco NUMERIC(10,2) CONSTRAINT nn_produtos_preco NOT NULL,
    quantidade_estoque INTEGER CONSTRAINT nn_produtos_quantidade_estoque NOT NULL DEFAULT 0,
    quantidade_vendida INTEGER CONSTRAINT nn_produtos_quantidade_vendida NOT NULL DEFAULT 0,
    ativo BOOLEAN CONSTRAINT nn_produtos_ativo NOT NULL DEFAULT true,
    desativado_por_admin BOOLEAN CONSTRAINT nn_produtos_desativado_por_admin NOT NULL DEFAULT false,
    criado_em TIMESTAMPTZ CONSTRAINT nn_produtos_criado_em NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT pk_produtos PRIMARY KEY (id),
    CONSTRAINT fk_produtos_artesao_id FOREIGN KEY (artesao_id)
        REFERENCES usuarios (id) ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT fk_produtos_categoria_id FOREIGN KEY (categoria_id)
        REFERENCES categorias (id) ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT fk_produtos_tecnica_id FOREIGN KEY (tecnica_id)
        REFERENCES tecnicas (id) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT ck_produtos_preco_positivo CHECK (preco > 0),
    CONSTRAINT ck_produtos_estoque_nao_negativo CHECK (quantidade_estoque >= 0),
    CONSTRAINT ck_produtos_vendas_nao_negativas CHECK (quantidade_vendida >= 0),
    CONSTRAINT ck_produtos_nome_preenchido CHECK (length(trim(nome)) > 0)
);

CREATE TABLE produto_fotos (
    id UUID CONSTRAINT nn_produto_fotos_id NOT NULL DEFAULT gen_random_uuid(),
    produto_id UUID CONSTRAINT nn_produto_fotos_produto_id NOT NULL,
    url TEXT CONSTRAINT nn_produto_fotos_url NOT NULL,
    ordem SMALLINT CONSTRAINT nn_produto_fotos_ordem NOT NULL DEFAULT 0,

    CONSTRAINT pk_produto_fotos PRIMARY KEY (id),
    CONSTRAINT uq_produto_fotos_produto_id_ordem UNIQUE (produto_id, ordem),
    CONSTRAINT fk_produto_fotos_produto_id FOREIGN KEY (produto_id)
        REFERENCES produtos (id) ON DELETE CASCADE ON UPDATE RESTRICT,
    CONSTRAINT ck_produto_fotos_ordem_nao_negativa CHECK (ordem >= 0)
);

CREATE TABLE itens_carrinho (
    carrinho_id UUID CONSTRAINT nn_itens_carrinho_carrinho_id NOT NULL,
    produto_id UUID CONSTRAINT nn_itens_carrinho_produto_id NOT NULL,
    quantidade INTEGER CONSTRAINT nn_itens_carrinho_quantidade NOT NULL,
    preco_unitario NUMERIC(10,2) CONSTRAINT nn_itens_carrinho_preco_unitario NOT NULL,

    CONSTRAINT pk_itens_carrinho PRIMARY KEY (carrinho_id, produto_id),
    CONSTRAINT fk_itens_carrinho_carrinho_id FOREIGN KEY (carrinho_id)
        REFERENCES carrinhos (usuario_id) ON DELETE CASCADE ON UPDATE RESTRICT,
    CONSTRAINT fk_itens_carrinho_produto_id FOREIGN KEY (produto_id)
        REFERENCES produtos (id) ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT ck_itens_carrinho_quantidade_positiva CHECK (quantidade > 0),
    CONSTRAINT ck_itens_carrinho_preco_unitario_positivo CHECK (preco_unitario > 0)
);

CREATE TABLE pedidos (
    id UUID CONSTRAINT nn_pedidos_id NOT NULL DEFAULT gen_random_uuid(),
    comprador_id UUID CONSTRAINT nn_pedidos_comprador_id NOT NULL,
    numero VARCHAR(30) CONSTRAINT nn_pedidos_numero NOT NULL
        DEFAULT ('ORG-' || to_char(CURRENT_TIMESTAMP, 'YYYY') || '-'
                 || lpad(nextval('origem.pedidos_numero_seq'::regclass)::text, 6, '0')),
    status status_pedido CONSTRAINT nn_pedidos_status NOT NULL DEFAULT 'pendente',
    total NUMERIC(10,2) CONSTRAINT nn_pedidos_total NOT NULL,
    criado_em TIMESTAMPTZ CONSTRAINT nn_pedidos_criado_em NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT pk_pedidos PRIMARY KEY (id),
    CONSTRAINT uq_pedidos_numero UNIQUE (numero),
    CONSTRAINT fk_pedidos_comprador_id FOREIGN KEY (comprador_id)
        REFERENCES usuarios (id) ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT ck_pedidos_numero_formato CHECK (numero ~ '^ORG-[0-9]{4}-[0-9]{6}$'),
    CONSTRAINT ck_pedidos_total_nao_negativo CHECK (total >= 0)
);

ALTER SEQUENCE pedidos_numero_seq OWNED BY pedidos.numero;

CREATE TABLE itens_pedido (
    pedido_id UUID CONSTRAINT nn_itens_pedido_pedido_id NOT NULL,
    numero_item SMALLINT CONSTRAINT nn_itens_pedido_numero_item NOT NULL,
    produto_id UUID CONSTRAINT nn_itens_pedido_produto_id NOT NULL,
    quantidade INTEGER CONSTRAINT nn_itens_pedido_quantidade NOT NULL,
    preco_unitario NUMERIC(10,2) CONSTRAINT nn_itens_pedido_preco_unitario NOT NULL,
    subtotal NUMERIC(10,2) CONSTRAINT nn_itens_pedido_subtotal NOT NULL,
    status status_item_pedido CONSTRAINT nn_itens_pedido_status NOT NULL DEFAULT 'aguardando_envio',
    enviado_em TIMESTAMPTZ,

    CONSTRAINT pk_itens_pedido PRIMARY KEY (pedido_id, numero_item),
    CONSTRAINT fk_itens_pedido_pedido_id FOREIGN KEY (pedido_id)
        REFERENCES pedidos (id) ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT fk_itens_pedido_produto_id FOREIGN KEY (produto_id)
        REFERENCES produtos (id) ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT ck_itens_pedido_numero_item_positivo CHECK (numero_item > 0),
    CONSTRAINT ck_itens_pedido_quantidade_positiva CHECK (quantidade > 0),
    CONSTRAINT ck_itens_pedido_preco_unitario_positivo CHECK (preco_unitario > 0),
    CONSTRAINT ck_itens_pedido_subtotal_calculado
        CHECK (subtotal = quantidade * preco_unitario),
    CONSTRAINT ck_itens_pedido_data_envio_status
        CHECK ((status = 'enviado') = (enviado_em IS NOT NULL))
);

CREATE TABLE pagamentos (
    id UUID CONSTRAINT nn_pagamentos_id NOT NULL DEFAULT gen_random_uuid(),
    pedido_id UUID CONSTRAINT nn_pagamentos_pedido_id NOT NULL,
    metodo metodo_pagamento CONSTRAINT nn_pagamentos_metodo NOT NULL DEFAULT 'pix_simulado',
    valor NUMERIC(10,2) CONSTRAINT nn_pagamentos_valor NOT NULL,
    status status_pagamento CONSTRAINT nn_pagamentos_status NOT NULL,
    data_pagamento TIMESTAMPTZ CONSTRAINT nn_pagamentos_data_pagamento NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT pk_pagamentos PRIMARY KEY (id),
    CONSTRAINT uq_pagamentos_pedido_id UNIQUE (pedido_id),
    CONSTRAINT fk_pagamentos_pedido_id FOREIGN KEY (pedido_id)
        REFERENCES pedidos (id) ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT ck_pagamentos_valor_positivo CHECK (valor > 0)
);

CREATE TABLE avaliacoes (
    id UUID CONSTRAINT nn_avaliacoes_id NOT NULL DEFAULT gen_random_uuid(),
    comprador_id UUID CONSTRAINT nn_avaliacoes_comprador_id NOT NULL,
    produto_id UUID CONSTRAINT nn_avaliacoes_produto_id NOT NULL,
    nota SMALLINT CONSTRAINT nn_avaliacoes_nota NOT NULL,
    comentario TEXT,
    criado_em TIMESTAMPTZ CONSTRAINT nn_avaliacoes_criado_em NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT pk_avaliacoes PRIMARY KEY (id),
    CONSTRAINT uq_avaliacoes_comprador_id_produto_id UNIQUE (comprador_id, produto_id),
    CONSTRAINT fk_avaliacoes_comprador_id FOREIGN KEY (comprador_id)
        REFERENCES usuarios (id) ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT fk_avaliacoes_produto_id FOREIGN KEY (produto_id)
        REFERENCES produtos (id) ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT ck_avaliacoes_nota_valida CHECK (nota BETWEEN 1 AND 5),
    CONSTRAINT ck_avaliacoes_comentario_tamanho CHECK (length(comentario) <= 500)
);

CREATE TABLE intencoes_notificacao (
    id UUID CONSTRAINT nn_intencoes_notificacao_id NOT NULL DEFAULT gen_random_uuid(),
    pedido_id UUID CONSTRAINT nn_intencoes_notificacao_pedido_id NOT NULL,
    status status_intencao CONSTRAINT nn_intencoes_notificacao_status NOT NULL DEFAULT 'pendente',
    tentativas INTEGER CONSTRAINT nn_intencoes_notificacao_tentativas NOT NULL DEFAULT 0,
    criado_em TIMESTAMPTZ CONSTRAINT nn_intencoes_notificacao_criado_em NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMPTZ CONSTRAINT nn_intencoes_notificacao_atualizado_em NOT NULL DEFAULT CURRENT_TIMESTAMP,
    processada_em TIMESTAMPTZ,

    CONSTRAINT pk_intencoes_notificacao PRIMARY KEY (id),
    CONSTRAINT uq_intencoes_notificacao_pedido_id UNIQUE (pedido_id),
    CONSTRAINT fk_intencoes_notificacao_pedido_id FOREIGN KEY (pedido_id)
        REFERENCES pedidos (id) ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT ck_intencoes_notificacao_tentativas_nao_negativas CHECK (tentativas >= 0),
    CONSTRAINT ck_intencoes_notificacao_data_processamento_status
        CHECK ((status = 'processada') = (processada_em IS NOT NULL)),
    CONSTRAINT ck_intencoes_notificacao_cronologia_atualizacao
        CHECK (atualizado_em >= criado_em),
    CONSTRAINT ck_intencoes_notificacao_cronologia_processamento
        CHECK (processada_em >= criado_em)
);

CREATE TABLE notificacoes (
    id UUID CONSTRAINT nn_notificacoes_id NOT NULL DEFAULT gen_random_uuid(),
    usuario_id UUID CONSTRAINT nn_notificacoes_usuario_id NOT NULL,
    pedido_id UUID CONSTRAINT nn_notificacoes_pedido_id NOT NULL,
    tipo tipo_notificacao CONSTRAINT nn_notificacoes_tipo NOT NULL,
    lida BOOLEAN CONSTRAINT nn_notificacoes_lida NOT NULL DEFAULT false,
    criado_em TIMESTAMPTZ CONSTRAINT nn_notificacoes_criado_em NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT pk_notificacoes PRIMARY KEY (id),
    CONSTRAINT uq_notificacoes_usuario_id_pedido_id_tipo UNIQUE (usuario_id, pedido_id, tipo),
    CONSTRAINT fk_notificacoes_usuario_id FOREIGN KEY (usuario_id)
        REFERENCES usuarios (id) ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT fk_notificacoes_pedido_id FOREIGN KEY (pedido_id)
        REFERENCES pedidos (id) ON DELETE RESTRICT ON UPDATE RESTRICT
);

-- Acesso por chave estrangeira e consultas da vitrine.
CREATE INDEX ix_perfis_artesao_usuario_id_papel
    ON perfis_artesao (usuario_id, papel);
CREATE INDEX ix_perfis_artesao_tecnica_principal_id
    ON perfis_artesao (tecnica_principal_id);
CREATE INDEX ix_perfis_artesao_regiao_id
    ON perfis_artesao (regiao_id);

CREATE INDEX ix_carrinhos_usuario_id_papel
    ON carrinhos (usuario_id, papel);

CREATE INDEX ix_produtos_artesao_id
    ON produtos (artesao_id);
CREATE INDEX ix_produtos_categoria_id
    ON produtos (categoria_id);
CREATE INDEX ix_produtos_tecnica_id
    ON produtos (tecnica_id);
CREATE INDEX ix_produtos_criado_em_vitrine
    ON produtos (criado_em DESC)
    WHERE ativo AND NOT desativado_por_admin AND quantidade_estoque > 0;

CREATE INDEX ix_itens_carrinho_produto_id
    ON itens_carrinho (produto_id);

CREATE INDEX ix_pedidos_comprador_id_criado_em
    ON pedidos (comprador_id, criado_em DESC);

CREATE INDEX ix_itens_pedido_produto_id
    ON itens_pedido (produto_id);

CREATE INDEX ix_avaliacoes_produto_id
    ON avaliacoes (produto_id);

CREATE INDEX ix_notificacoes_pedido_id
    ON notificacoes (pedido_id);

-- Papel de cada tabela no marketplace.
COMMENT ON TABLE regioes IS 'Identifica as regiões de origem dos artesãos.';
COMMENT ON TABLE tecnicas IS 'Identifica as técnicas usadas pelos artesãos e nas peças.';
COMMENT ON TABLE categorias IS 'Classifica as peças para navegação no catálogo.';
COMMENT ON TABLE usuarios IS 'Identifica compradores, artesãos e administradores da plataforma.';
COMMENT ON TABLE perfis_artesao IS 'Reúne a história, a técnica principal e a região do artesão.';
COMMENT ON TABLE carrinhos IS 'Representa o carrinho de compras de um comprador.';
COMMENT ON TABLE produtos IS 'Descreve as peças dos artesãos, seus preços e o estoque disponível.';
COMMENT ON TABLE produto_fotos IS 'Organiza as fotos de cada peça na ordem de exibição.';
COMMENT ON TABLE itens_carrinho IS 'Registra a quantidade e o preço de cada produto no carrinho.';
COMMENT ON TABLE pedidos IS 'Registra a compra, seu titular, seu estado e o total.';
COMMENT ON TABLE itens_pedido IS 'Preserva a posição, o preço e o envio de cada linha da venda.';
COMMENT ON TABLE pagamentos IS 'Registra o resultado do pagamento simulado de um pedido.';
COMMENT ON TABLE avaliacoes IS 'Guarda a nota e o comentário do comprador sobre a peça adquirida.';
COMMENT ON TABLE intencoes_notificacao IS 'Registra a intenção de notificar um pedido e acompanha seu processamento.';
COMMENT ON TABLE notificacoes IS 'Guarda os avisos de pedidos e sua leitura pelo destinatário.';

COMMIT;
