-- Projeto Origem | AV2 de Modelagem e Projeto de Banco de Dados | 25/11/2026
-- Requer PostgreSQL 13 ou superior, testado em 16. Sem extensões. O DDL exige CREATE no banco.
-- Executar depois do ddl.sql. Para repor os dados, recrie o schema origem com ddl.sql e repita esta carga.
-- psql: psql -v ON_ERROR_STOP=1 -f seed_dml.sql
-- pgAdmin/DBeaver: abra o arquivo e execute o script inteiro.

DO $ordem$
BEGIN
    IF pg_catalog.to_regnamespace('origem') IS NULL
       OR pg_catalog.to_regclass('origem.usuarios') IS NULL THEN
        RAISE EXCEPTION 'Execute ddl.sql antes de seed_dml.sql (schema origem nao encontrado)';
    END IF;
END
$ordem$;

SET search_path TO origem;
BEGIN;

-- Vocabulário regional e classificação das peças.
INSERT INTO regioes (
    id, nome
) VALUES
    ('regiao-pilar-recife', 'Comunidade do Pilar - Recife'),
    ('regiao-alto-moura-caruaru', 'Alto do Moura - Caruaru'),
    ('regiao-tracunhaem', 'Tracunhaém');

INSERT INTO tecnicas (
    id, nome
) VALUES
    ('tecnica-modelagem-argila', 'Modelagem em Argila'),
    ('tecnica-bordado-mao', 'Bordado à Mão'),
    ('tecnica-entalhe-madeira', 'Entalhe em Madeira'),
    ('tecnica-costura-autoral', 'Costura Autoral'),
    ('tecnica-bijuteria-sementes', 'Bijuteria em Sementes Naturais'),
    ('tecnica-marcenaria-artesanal', 'Marcenaria Artesanal');

INSERT INTO categorias (
    id, nome
) VALUES
    ('00000000-0000-4000-8000-000000000201', 'Cerâmica e Barro'),
    ('00000000-0000-4000-8000-000000000202', 'Renda e Bordado'),
    ('00000000-0000-4000-8000-000000000203', 'Madeira Entalhada e Marcenaria Artesanal'),
    ('00000000-0000-4000-8000-000000000204', 'Têxtil e Costura Autoral'),
    ('00000000-0000-4000-8000-000000000205', 'Bijuteria e Acessórios Artesanais'),
    ('00000000-0000-4000-8000-000000000206', 'Arte Reciclada e Sustentável');

-- Contas fictícias e suas especializações.
INSERT INTO usuarios (
    id, nome, email, senha_hash, papel, criado_em
) VALUES
    ('00000000-0000-4000-8000-000000000101', 'Administração da Mostra', 'admin@example.com',
     '!sem-autenticacao!', 'admin', '2026-11-01 09:00:00-03'),
    ('00000000-0000-4000-8000-000000000111', 'Oficina Argila e Sementes', 'oficina.argila@example.com',
     '!sem-autenticacao!', 'artesao', '2026-11-01 09:00:00-03'),
    ('00000000-0000-4000-8000-000000000112', 'Oficina Linha do Agreste', 'oficina.linha@example.com',
     '!sem-autenticacao!', 'artesao', '2026-11-01 09:00:00-03'),
    ('00000000-0000-4000-8000-000000000113', 'Oficina Madeira Circular', 'oficina.madeira@example.com',
     '!sem-autenticacao!', 'artesao', '2026-11-01 09:00:00-03'),
    ('00000000-0000-4000-8000-000000000121', 'Comprador da Mostra A', 'comprador.a@example.com',
     '!sem-autenticacao!', 'comprador', '2026-11-01 09:00:00-03'),
    ('00000000-0000-4000-8000-000000000122', 'Comprador da Mostra B', 'comprador.b@example.com',
     '!sem-autenticacao!', 'comprador', '2026-11-01 09:00:00-03'),
    ('00000000-0000-4000-8000-000000000123', 'Comprador da Mostra C', 'comprador.c@example.com',
     '!sem-autenticacao!', 'comprador', '2026-11-01 09:00:00-03');

INSERT INTO perfis_artesao (
    usuario_id, papel, historia, tecnica_principal_id, regiao_id, foto_url, completo
) VALUES
    ('00000000-0000-4000-8000-000000000111', 'artesao', 'Modela barro e combina sementes em pequenas séries.',
     'tecnica-modelagem-argila', 'regiao-pilar-recife', '/acervo/oficina-1.jpg', true),
    ('00000000-0000-4000-8000-000000000112', 'artesao',
     'Borda motivos florais e costura peças de uso cotidiano.', 'tecnica-bordado-mao',
     'regiao-alto-moura-caruaru', '/acervo/oficina-2.jpg', true),
    ('00000000-0000-4000-8000-000000000113', 'artesao', 'Entalha utensílios e reaproveita madeira da oficina.',
     'tecnica-entalhe-madeira', 'regiao-tracunhaem', '/acervo/oficina-3.jpg', true);

INSERT INTO carrinhos (
    usuario_id, papel, atualizado_em
) VALUES
    ('00000000-0000-4000-8000-000000000121', 'comprador', '2026-11-15 14:00:00-03'),
    ('00000000-0000-4000-8000-000000000122', 'comprador', '2026-11-15 14:00:00-03'),
    ('00000000-0000-4000-8000-000000000123', 'comprador', '2026-11-15 14:00:00-03');

-- Vitrine das seis categorias e seleção atual dos compradores.
INSERT INTO produtos (
    id, artesao_id, categoria_id, tecnica_id, nome, descricao, preco, quantidade_estoque,
    quantidade_vendida, criado_em
) VALUES
    ('00000000-0000-4000-8000-000000000301', '00000000-0000-4000-8000-000000000111',
     '00000000-0000-4000-8000-000000000201', 'tecnica-modelagem-argila', 'Vaso de barro do Pilar',
     'Vaso modelado à mão com acabamento fosco.', 48.50, 8, 3, '2026-11-02 09:00:00-03'),
    ('00000000-0000-4000-8000-000000000302', '00000000-0000-4000-8000-000000000112',
     '00000000-0000-4000-8000-000000000202', 'tecnica-bordado-mao', 'Guardanapo bordado',
     'Guardanapo de algodão com folha bordada na bainha.', 32.00, 15, 1, '2026-11-02 09:00:00-03'),
    ('00000000-0000-4000-8000-000000000303', '00000000-0000-4000-8000-000000000113',
     '00000000-0000-4000-8000-000000000203', 'tecnica-entalhe-madeira', 'Caixa entalhada',
     'Caixa de madeira com tampa entalhada em relevo.', 85.00, 4, 1, '2026-11-02 09:00:00-03'),
    ('00000000-0000-4000-8000-000000000304', '00000000-0000-4000-8000-000000000112',
     '00000000-0000-4000-8000-000000000204', 'tecnica-costura-autoral', 'Bolsa de tecido cru',
     'Bolsa de feira com alças costuradas e bolso interno.', 56.00, 9, 2, '2026-11-02 09:00:00-03'),
    ('00000000-0000-4000-8000-000000000305', '00000000-0000-4000-8000-000000000111',
     '00000000-0000-4000-8000-000000000205', 'tecnica-bijuteria-sementes', 'Colar de sementes',
     'Colar curto de sementes polidas em cordão de algodão.', 28.50, 11, 1, '2026-11-02 09:00:00-03'),
    ('00000000-0000-4000-8000-000000000306', '00000000-0000-4000-8000-000000000113',
     '00000000-0000-4000-8000-000000000206', 'tecnica-marcenaria-artesanal', 'Bandeja de retalhos de madeira',
     'Bandeja montada com sobras de madeira da oficina.', 62.00, 5, 0, '2026-11-02 09:00:00-03');

INSERT INTO produto_fotos (
    id, produto_id, url, ordem
) VALUES
    ('00000000-0000-4000-8000-000000000401', '00000000-0000-4000-8000-000000000301', '/acervo/vaso.jpg', 0),
    ('00000000-0000-4000-8000-000000000402', '00000000-0000-4000-8000-000000000302', '/acervo/guardanapo.jpg', 0),
    ('00000000-0000-4000-8000-000000000403', '00000000-0000-4000-8000-000000000303', '/acervo/caixa.jpg', 0),
    ('00000000-0000-4000-8000-000000000404', '00000000-0000-4000-8000-000000000304', '/acervo/bolsa.jpg', 0),
    ('00000000-0000-4000-8000-000000000405', '00000000-0000-4000-8000-000000000305', '/acervo/colar.jpg', 0),
    ('00000000-0000-4000-8000-000000000406', '00000000-0000-4000-8000-000000000306', '/acervo/bandeja.jpg', 0),
    ('00000000-0000-4000-8000-000000000407', '00000000-0000-4000-8000-000000000301', '/acervo/vaso-detalhe.jpg',
     1);

INSERT INTO itens_carrinho (
    carrinho_id, produto_id, quantidade, preco_unitario
) VALUES
    ('00000000-0000-4000-8000-000000000121', '00000000-0000-4000-8000-000000000303', 1, 85.00),
    ('00000000-0000-4000-8000-000000000122', '00000000-0000-4000-8000-000000000302', 2, 32.00),
    ('00000000-0000-4000-8000-000000000123', '00000000-0000-4000-8000-000000000306', 1, 62.00);

-- O ano identifica a mostra. O sufixo consome a sequência usada pelo DDL.
INSERT INTO pedidos (
    id, comprador_id, numero, status, total, criado_em
) VALUES
    ('00000000-0000-4000-8000-000000000501', '00000000-0000-4000-8000-000000000121',
     'ORG-2026-' || to_char(nextval('origem.pedidos_numero_seq'), 'FM000000'), 'confirmado', 129.00,
     '2026-11-05 10:00:00-03'),
    ('00000000-0000-4000-8000-000000000502', '00000000-0000-4000-8000-000000000122',
     'ORG-2026-' || to_char(nextval('origem.pedidos_numero_seq'), 'FM000000'), 'confirmado', 133.50,
     '2026-11-06 10:00:00-03'),
    ('00000000-0000-4000-8000-000000000503', '00000000-0000-4000-8000-000000000123',
     'ORG-2026-' || to_char(nextval('origem.pedidos_numero_seq'), 'FM000000'), 'confirmado', 140.50,
     '2026-11-07 10:00:00-03'),
    ('00000000-0000-4000-8000-000000000504', '00000000-0000-4000-8000-000000000121',
     'ORG-2026-' || to_char(nextval('origem.pedidos_numero_seq'), 'FM000000'), 'cancelado', 62.00,
     '2026-11-08 10:00:00-03');

INSERT INTO itens_pedido (
    pedido_id, numero_item, produto_id, quantidade, preco_unitario, subtotal, status, enviado_em
) VALUES
    ('00000000-0000-4000-8000-000000000501', 1, '00000000-0000-4000-8000-000000000301', 2, 48.50, 97.00,
     'enviado', '2026-11-09 11:00:00-03'),
    ('00000000-0000-4000-8000-000000000501', 2, '00000000-0000-4000-8000-000000000302', 1, 32.00, 32.00,
     'aguardando_envio', NULL),
    ('00000000-0000-4000-8000-000000000502', 1, '00000000-0000-4000-8000-000000000303', 1, 85.00, 85.00,
     'enviado', '2026-11-10 11:00:00-03'),
    ('00000000-0000-4000-8000-000000000502', 2, '00000000-0000-4000-8000-000000000301', 1, 48.50, 48.50,
     'aguardando_envio', NULL),
    ('00000000-0000-4000-8000-000000000503', 1, '00000000-0000-4000-8000-000000000304', 2, 56.00, 112.00,
     'enviado', '2026-11-11 11:00:00-03'),
    ('00000000-0000-4000-8000-000000000503', 2, '00000000-0000-4000-8000-000000000305', 1, 28.50, 28.50,
     'aguardando_envio', NULL),
    ('00000000-0000-4000-8000-000000000504', 1, '00000000-0000-4000-8000-000000000306', 1, 62.00, 62.00,
     'aguardando_envio', NULL);

INSERT INTO pagamentos (
    id, pedido_id, metodo, valor, status, data_pagamento
) VALUES
    ('00000000-0000-4000-8000-000000000601', '00000000-0000-4000-8000-000000000501', 'pix_simulado', 129.00,
     'aprovado', '2026-11-05 10:01:00-03'),
    ('00000000-0000-4000-8000-000000000602', '00000000-0000-4000-8000-000000000502', 'pix_simulado', 133.50,
     'aprovado', '2026-11-06 10:01:00-03'),
    ('00000000-0000-4000-8000-000000000603', '00000000-0000-4000-8000-000000000503', 'pix_simulado', 140.50,
     'aprovado', '2026-11-07 10:01:00-03'),
    ('00000000-0000-4000-8000-000000000604', '00000000-0000-4000-8000-000000000504', 'pix_simulado', 62.00,
     'recusado', '2026-11-08 10:01:00-03');

INSERT INTO avaliacoes (
    id, comprador_id, produto_id, nota, comentario, criado_em
) VALUES
    ('00000000-0000-4000-8000-000000000701', '00000000-0000-4000-8000-000000000121',
     '00000000-0000-4000-8000-000000000301', 5, 'O acabamento fosco valorizou o relevo.',
     '2026-11-13 12:00:00-03'),
    ('00000000-0000-4000-8000-000000000702', '00000000-0000-4000-8000-000000000122',
     '00000000-0000-4000-8000-000000000303', 4, 'A tampa encaixa bem e o entalhe é delicado.',
     '2026-11-14 12:00:00-03'),
    ('00000000-0000-4000-8000-000000000703', '00000000-0000-4000-8000-000000000123',
     '00000000-0000-4000-8000-000000000304', 5, 'As alças ficaram confortáveis na feira.',
     '2026-11-15 12:00:00-03');

-- Publicação assíncrona e avisos por artesão participante da venda.
INSERT INTO intencoes_notificacao (
    id, pedido_id, status, tentativas, criado_em, atualizado_em, processada_em
) VALUES
    ('00000000-0000-4000-8000-000000000801', '00000000-0000-4000-8000-000000000501', 'processada', 1,
     '2026-11-05 10:01:00-03', '2026-11-05 10:03:00-03', '2026-11-05 10:03:00-03'),
    ('00000000-0000-4000-8000-000000000802', '00000000-0000-4000-8000-000000000502', 'pendente', 0,
     '2026-11-06 10:01:00-03', '2026-11-06 10:01:00-03', NULL),
    ('00000000-0000-4000-8000-000000000803', '00000000-0000-4000-8000-000000000503', 'falha', 2,
     '2026-11-07 10:01:00-03', '2026-11-07 10:06:00-03', NULL);

INSERT INTO notificacoes (
    id, usuario_id, pedido_id, tipo, lida, criado_em
) VALUES
    ('00000000-0000-4000-8000-000000000901', '00000000-0000-4000-8000-000000000111',
     '00000000-0000-4000-8000-000000000501', 'novo_pedido', true, '2026-11-05 10:02:00-03'),
    ('00000000-0000-4000-8000-000000000902', '00000000-0000-4000-8000-000000000112',
     '00000000-0000-4000-8000-000000000501', 'novo_pedido', true, '2026-11-05 10:02:00-03'),
    ('00000000-0000-4000-8000-000000000903', '00000000-0000-4000-8000-000000000113',
     '00000000-0000-4000-8000-000000000502', 'novo_pedido', false, '2026-11-06 10:02:00-03'),
    ('00000000-0000-4000-8000-000000000904', '00000000-0000-4000-8000-000000000111',
     '00000000-0000-4000-8000-000000000502', 'novo_pedido', false, '2026-11-06 10:02:00-03'),
    ('00000000-0000-4000-8000-000000000905', '00000000-0000-4000-8000-000000000112',
     '00000000-0000-4000-8000-000000000503', 'novo_pedido', false, '2026-11-07 10:02:00-03'),
    ('00000000-0000-4000-8000-000000000906', '00000000-0000-4000-8000-000000000111',
     '00000000-0000-4000-8000-000000000503', 'novo_pedido', false, '2026-11-07 10:02:00-03');

COMMIT;

-- Conferência após a confirmação da transação.
SELECT 'regioes' AS tabela, count(*) AS linhas FROM origem.regioes
UNION ALL SELECT 'tecnicas', count(*) FROM origem.tecnicas
UNION ALL SELECT 'categorias', count(*) FROM origem.categorias
UNION ALL SELECT 'usuarios', count(*) FROM origem.usuarios
UNION ALL SELECT 'perfis_artesao', count(*) FROM origem.perfis_artesao
UNION ALL SELECT 'carrinhos', count(*) FROM origem.carrinhos
UNION ALL SELECT 'produtos', count(*) FROM origem.produtos
UNION ALL SELECT 'produto_fotos', count(*) FROM origem.produto_fotos
UNION ALL SELECT 'itens_carrinho', count(*) FROM origem.itens_carrinho
UNION ALL SELECT 'pedidos', count(*) FROM origem.pedidos
UNION ALL SELECT 'itens_pedido', count(*) FROM origem.itens_pedido
UNION ALL SELECT 'pagamentos', count(*) FROM origem.pagamentos
UNION ALL SELECT 'avaliacoes', count(*) FROM origem.avaliacoes
UNION ALL SELECT 'intencoes_notificacao', count(*) FROM origem.intencoes_notificacao
UNION ALL SELECT 'notificacoes', count(*) FROM origem.notificacoes
ORDER BY tabela;
