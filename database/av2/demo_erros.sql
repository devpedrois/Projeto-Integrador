-- Demonstração de restrições para o vídeo
-- Projeto Origem | AV2 de Banco de Dados | 25/11/2026
-- Requer PostgreSQL 13 ou superior, testado em 16.
-- Ordem: ddl.sql, seed_dml.sql, testes_restricoes.sql. Demo separada, após o seed.

-- Execute uma instrução por vez, após a carga válida.

-- Produto inexistente na linha de venda: fk_itens_pedido_produto_id.
UPDATE origem.itens_pedido SET produto_id = gen_random_uuid()
WHERE (pedido_id, numero_item) = (
    SELECT pedido_id, numero_item FROM origem.itens_pedido ORDER BY pedido_id, numero_item LIMIT 1
);

-- Nota acima de cinco: ck_avaliacoes_nota_valida.
UPDATE origem.avaliacoes SET nota = 6
WHERE id = (SELECT id FROM origem.avaliacoes ORDER BY id LIMIT 1);

-- Segundo cadastro com o mesmo email normalizado: uq_usuarios_email.
INSERT INTO origem.usuarios (nome, email, senha_hash)
SELECT 'Cadastro de demonstração', email, 'hash-sintetico'
FROM origem.usuarios ORDER BY id LIMIT 1;

-- Total obrigatório ausente: NOT NULL em pedidos.total.
UPDATE origem.pedidos SET total = NULL
WHERE id = (SELECT id FROM origem.pedidos ORDER BY id LIMIT 1);

-- Categoria utilizada por uma peça: fk_produtos_categoria_id, ON DELETE RESTRICT.
DELETE FROM origem.categorias
WHERE id = (SELECT categoria_id FROM origem.produtos ORDER BY id LIMIT 1);

-- Envio sem data correspondente: ck_itens_pedido_data_envio_status.
UPDATE origem.itens_pedido SET status = 'enviado', enviado_em = NULL
WHERE (pedido_id, numero_item) = (
    SELECT pedido_id, numero_item FROM origem.itens_pedido ORDER BY pedido_id, numero_item LIMIT 1
);
