-- Testes transacionais de integridade do modelo v2
-- Projeto Origem | AV2 de Banco de Dados | 25/11/2026
-- Requer PostgreSQL 13 ou superior, testado em 16.
-- Ordem: ddl.sql, seed_dml.sql, testes_restricoes.sql. Demo separada, após o seed.

BEGIN;
SET LOCAL search_path = origem, pg_temp;

-- As identidades pertencem somente a esta transação. O número explícito
-- evita consumir a sequência permanente, que não retorna com o ROLLBACK.
CREATE TEMP TABLE av2_caso ON COMMIT DROP AS
SELECT gen_random_uuid() AS comprador, gen_random_uuid() AS artesao,
       gen_random_uuid() AS artesao_livre, gen_random_uuid() AS categoria,
       gen_random_uuid() AS produto, gen_random_uuid() AS pedido,
       gen_random_uuid() AS produto_ausente,
       'av2-' || replace(gen_random_uuid()::text, '-', '') AS tecnica;

INSERT INTO origem.usuarios (id, nome, email, senha_hash, papel)
SELECT c.comprador, 'Comprador de teste', c.comprador || '@example.invalid', 'sintetico', 'comprador'
FROM pg_temp.av2_caso c;

INSERT INTO origem.usuarios (id, nome, email, senha_hash, papel)
SELECT u.id, 'Artesão de teste', u.id || '@example.invalid', 'sintetico', 'artesao'
FROM pg_temp.av2_caso c CROSS JOIN LATERAL (VALUES (c.artesao), (c.artesao_livre)) AS u(id);

INSERT INTO origem.perfis_artesao (usuario_id)
SELECT artesao_livre FROM pg_temp.av2_caso;
INSERT INTO origem.carrinhos (usuario_id)
SELECT comprador FROM pg_temp.av2_caso;
INSERT INTO origem.categorias (id, nome)
SELECT categoria, 'Teste ' || categoria FROM pg_temp.av2_caso;
INSERT INTO origem.tecnicas (id, nome)
SELECT tecnica, 'Teste ' || tecnica FROM pg_temp.av2_caso;
INSERT INTO origem.produtos (id, artesao_id, categoria_id, tecnica_id, nome, descricao, preco, quantidade_estoque)
SELECT produto, artesao, categoria, tecnica, 'Produto de teste', 'Peça sintética', 10.00, 3
FROM pg_temp.av2_caso;

INSERT INTO origem.pedidos (id, comprador_id, numero, status, total)
SELECT c.pedido, c.comprador, (
    SELECT 'ORG-9999-' || lpad(n::text, 6, '0')
    FROM generate_series(1, 999999) AS numeros(n)
    WHERE NOT EXISTS (
        SELECT 1 FROM origem.pedidos p WHERE p.numero = 'ORG-9999-' || lpad(n::text, 6, '0')
    ) LIMIT 1
), 'confirmado', 30.00
FROM pg_temp.av2_caso c;

INSERT INTO origem.avaliacoes (comprador_id, produto_id, nota)
SELECT comprador, produto, 5 FROM pg_temp.av2_caso;
INSERT INTO origem.itens_carrinho (carrinho_id, produto_id, quantidade, preco_unitario)
SELECT comprador, produto, 1, 10.00 FROM pg_temp.av2_caso;

DO $produto_repetido$
BEGIN
    BEGIN
        INSERT INTO origem.itens_pedido (pedido_id, numero_item, produto_id, quantidade, preco_unitario, subtotal)
        SELECT c.pedido, i.numero, c.produto, i.quantidade, 10.00, 10.00 * i.quantidade
        FROM pg_temp.av2_caso c CROSS JOIN (VALUES (1, 1), (2, 2)) AS i(numero, quantidade);
    EXCEPTION WHEN OTHERS THEN
        RAISE EXCEPTION 'caso produto_repetido: SQLSTATE %', SQLSTATE USING ERRCODE = SQLSTATE;
    END;
    IF (SELECT count(*) FROM origem.itens_pedido i JOIN pg_temp.av2_caso c
        ON i.pedido_id = c.pedido AND i.produto_id = c.produto) <> 2 THEN
        RAISE EXCEPTION 'caso produto_repetido: duas linhas esperadas';
    END IF;
    RAISE NOTICE 'OK produto_repetido';
END
$produto_repetido$;

DO $produto_inexistente$
DECLARE
    alvo text;
BEGIN
    BEGIN
        UPDATE origem.itens_pedido SET produto_id = (SELECT produto_ausente FROM pg_temp.av2_caso)
        WHERE pedido_id = (SELECT pedido FROM pg_temp.av2_caso) AND numero_item = 1;
    EXCEPTION
        WHEN SQLSTATE '23503' THEN
            GET STACKED DIAGNOSTICS alvo = CONSTRAINT_NAME;
            IF alvo IS DISTINCT FROM 'fk_itens_pedido_produto_id' THEN
                RAISE EXCEPTION 'caso produto_inexistente: alvo inesperado';
            END IF;
            RAISE NOTICE 'OK produto_inexistente';
            RETURN;
        WHEN OTHERS THEN
            RAISE EXCEPTION 'caso produto_inexistente: SQLSTATE %', SQLSTATE USING ERRCODE = SQLSTATE;
    END;
    RAISE EXCEPTION 'caso produto_inexistente: operação aceita';
END
$produto_inexistente$;

DO $nota_seis$
DECLARE
    alvo text;
BEGIN
    BEGIN
        UPDATE origem.avaliacoes SET nota = 6
        WHERE comprador_id = (SELECT comprador FROM pg_temp.av2_caso);
    EXCEPTION
        WHEN SQLSTATE '23514' THEN
            GET STACKED DIAGNOSTICS alvo = CONSTRAINT_NAME;
            IF alvo IS DISTINCT FROM 'ck_avaliacoes_nota_valida' THEN
                RAISE EXCEPTION 'caso nota_seis: alvo inesperado';
            END IF;
            RAISE NOTICE 'OK nota_seis';
            RETURN;
        WHEN OTHERS THEN
            RAISE EXCEPTION 'caso nota_seis: SQLSTATE %', SQLSTATE USING ERRCODE = SQLSTATE;
    END;
    RAISE EXCEPTION 'caso nota_seis: operação aceita';
END
$nota_seis$;

DO $estoque_negativo$
DECLARE
    alvo text;
BEGIN
    BEGIN
        UPDATE origem.produtos SET quantidade_estoque = -1
        WHERE id = (SELECT produto FROM pg_temp.av2_caso);
    EXCEPTION
        WHEN SQLSTATE '23514' THEN
            GET STACKED DIAGNOSTICS alvo = CONSTRAINT_NAME;
            IF alvo IS DISTINCT FROM 'ck_produtos_estoque_nao_negativo' THEN
                RAISE EXCEPTION 'caso estoque_negativo: alvo inesperado';
            END IF;
            RAISE NOTICE 'OK estoque_negativo';
            RETURN;
        WHEN OTHERS THEN
            RAISE EXCEPTION 'caso estoque_negativo: SQLSTATE %', SQLSTATE USING ERRCODE = SQLSTATE;
    END;
    RAISE EXCEPTION 'caso estoque_negativo: operação aceita';
END
$estoque_negativo$;

DO $preco_zero$
DECLARE
    alvo text;
BEGIN
    BEGIN
        UPDATE origem.produtos SET preco = 0
        WHERE id = (SELECT produto FROM pg_temp.av2_caso);
    EXCEPTION
        WHEN SQLSTATE '23514' THEN
            GET STACKED DIAGNOSTICS alvo = CONSTRAINT_NAME;
            IF alvo IS DISTINCT FROM 'ck_produtos_preco_positivo' THEN
                RAISE EXCEPTION 'caso preco_zero: alvo inesperado';
            END IF;
            RAISE NOTICE 'OK preco_zero';
            RETURN;
        WHEN OTHERS THEN
            RAISE EXCEPTION 'caso preco_zero: SQLSTATE %', SQLSTATE USING ERRCODE = SQLSTATE;
    END;
    RAISE EXCEPTION 'caso preco_zero: operação aceita';
END
$preco_zero$;

DO $email_duplicado_normalizado$
DECLARE
    alvo text;
BEGIN
    BEGIN
        INSERT INTO origem.usuarios (nome, email, senha_hash)
        SELECT 'Duplicata', lower(upper(email)), 'sintetico' FROM origem.usuarios
        WHERE id = (SELECT comprador FROM pg_temp.av2_caso);
    EXCEPTION
        WHEN SQLSTATE '23505' THEN
            GET STACKED DIAGNOSTICS alvo = CONSTRAINT_NAME;
            IF alvo IS DISTINCT FROM 'uq_usuarios_email' THEN
                RAISE EXCEPTION 'caso email_duplicado_normalizado: alvo inesperado';
            END IF;
            RAISE NOTICE 'OK email_duplicado_normalizado';
            RETURN;
        WHEN OTHERS THEN
            RAISE EXCEPTION 'caso email_duplicado_normalizado: SQLSTATE %', SQLSTATE USING ERRCODE = SQLSTATE;
    END;
    RAISE EXCEPTION 'caso email_duplicado_normalizado: operação aceita';
END
$email_duplicado_normalizado$;

DO $email_duplicado_em_maiusculas$
DECLARE
    alvo text;
BEGIN
    BEGIN
        INSERT INTO origem.usuarios (nome, email, senha_hash)
        SELECT 'Duplicata', upper(email), 'sintetico' FROM origem.usuarios
        WHERE id = (SELECT comprador FROM pg_temp.av2_caso);
    EXCEPTION
        WHEN SQLSTATE '23514' THEN
            GET STACKED DIAGNOSTICS alvo = CONSTRAINT_NAME;
            IF alvo IS DISTINCT FROM 'ck_usuarios_email_minusculo' THEN
                RAISE EXCEPTION 'caso email_duplicado_em_maiusculas: alvo inesperado';
            END IF;
            RAISE NOTICE 'OK email_duplicado_em_maiusculas';
            RETURN;
        WHEN OTHERS THEN
            RAISE EXCEPTION 'caso email_duplicado_em_maiusculas: SQLSTATE %', SQLSTATE USING ERRCODE = SQLSTATE;
    END;
    RAISE EXCEPTION 'caso email_duplicado_em_maiusculas: operação aceita';
END
$email_duplicado_em_maiusculas$;

DO $email_em_maiusculas$
DECLARE
    alvo text;
BEGIN
    BEGIN
        INSERT INTO origem.usuarios (nome, email, senha_hash)
        VALUES ('Caixa', 'NOVO-' || gen_random_uuid() || '@example.invalid', 'sintetico');
    EXCEPTION
        WHEN SQLSTATE '23514' THEN
            GET STACKED DIAGNOSTICS alvo = CONSTRAINT_NAME;
            IF alvo IS DISTINCT FROM 'ck_usuarios_email_minusculo' THEN
                RAISE EXCEPTION 'caso email_em_maiusculas: alvo inesperado';
            END IF;
            RAISE NOTICE 'OK email_em_maiusculas';
            RETURN;
        WHEN OTHERS THEN
            RAISE EXCEPTION 'caso email_em_maiusculas: SQLSTATE %', SQLSTATE USING ERRCODE = SQLSTATE;
    END;
    RAISE EXCEPTION 'caso email_em_maiusculas: operação aceita';
END
$email_em_maiusculas$;

DO $subtotal_incoerente$
DECLARE
    alvo text;
BEGIN
    BEGIN
        UPDATE origem.itens_pedido SET subtotal = subtotal + 1
        WHERE pedido_id = (SELECT pedido FROM pg_temp.av2_caso) AND numero_item = 1;
    EXCEPTION
        WHEN SQLSTATE '23514' THEN
            GET STACKED DIAGNOSTICS alvo = CONSTRAINT_NAME;
            IF alvo IS DISTINCT FROM 'ck_itens_pedido_subtotal_calculado' THEN
                RAISE EXCEPTION 'caso subtotal_incoerente: alvo inesperado';
            END IF;
            RAISE NOTICE 'OK subtotal_incoerente';
            RETURN;
        WHEN OTHERS THEN
            RAISE EXCEPTION 'caso subtotal_incoerente: SQLSTATE %', SQLSTATE USING ERRCODE = SQLSTATE;
    END;
    RAISE EXCEPTION 'caso subtotal_incoerente: operação aceita';
END
$subtotal_incoerente$;

DO $envio_sem_data$
DECLARE
    alvo text;
BEGIN
    BEGIN
        UPDATE origem.itens_pedido SET status = 'enviado', enviado_em = NULL
        WHERE pedido_id = (SELECT pedido FROM pg_temp.av2_caso) AND numero_item = 1;
    EXCEPTION
        WHEN SQLSTATE '23514' THEN
            GET STACKED DIAGNOSTICS alvo = CONSTRAINT_NAME;
            IF alvo IS DISTINCT FROM 'ck_itens_pedido_data_envio_status' THEN
                RAISE EXCEPTION 'caso envio_sem_data: alvo inesperado';
            END IF;
            RAISE NOTICE 'OK envio_sem_data';
            RETURN;
        WHEN OTHERS THEN
            RAISE EXCEPTION 'caso envio_sem_data: SQLSTATE %', SQLSTATE USING ERRCODE = SQLSTATE;
    END;
    RAISE EXCEPTION 'caso envio_sem_data: operação aceita';
END
$envio_sem_data$;

DO $perfil_de_comprador$
DECLARE
    alvo text;
BEGIN
    BEGIN
        INSERT INTO origem.perfis_artesao (usuario_id)
        SELECT comprador FROM pg_temp.av2_caso;
    EXCEPTION
        WHEN SQLSTATE '23503' THEN
            GET STACKED DIAGNOSTICS alvo = CONSTRAINT_NAME;
            IF alvo IS DISTINCT FROM 'fk_perfis_artesao_usuario_id_papel' THEN
                RAISE EXCEPTION 'caso perfil_de_comprador: alvo inesperado';
            END IF;
            RAISE NOTICE 'OK perfil_de_comprador';
            RETURN;
        WHEN OTHERS THEN
            RAISE EXCEPTION 'caso perfil_de_comprador: SQLSTATE %', SQLSTATE USING ERRCODE = SQLSTATE;
    END;
    RAISE EXCEPTION 'caso perfil_de_comprador: operação aceita';
END
$perfil_de_comprador$;

DO $item_carrinho_duplicado$
DECLARE
    alvo text;
BEGIN
    BEGIN
        INSERT INTO origem.itens_carrinho (carrinho_id, produto_id, quantidade, preco_unitario)
        SELECT comprador, produto, 2, 10.00 FROM pg_temp.av2_caso;
    EXCEPTION
        WHEN SQLSTATE '23505' THEN
            GET STACKED DIAGNOSTICS alvo = CONSTRAINT_NAME;
            IF alvo IS DISTINCT FROM 'pk_itens_carrinho' THEN
                RAISE EXCEPTION 'caso item_carrinho_duplicado: alvo inesperado';
            END IF;
            RAISE NOTICE 'OK item_carrinho_duplicado';
            RETURN;
        WHEN OTHERS THEN
            RAISE EXCEPTION 'caso item_carrinho_duplicado: SQLSTATE %', SQLSTATE USING ERRCODE = SQLSTATE;
    END;
    RAISE EXCEPTION 'caso item_carrinho_duplicado: operação aceita';
END
$item_carrinho_duplicado$;

DO $numero_item_duplicado$
DECLARE
    alvo text;
BEGIN
    BEGIN
        INSERT INTO origem.itens_pedido (pedido_id, numero_item, produto_id, quantidade, preco_unitario, subtotal)
        SELECT pedido, 1, produto, 1, 10.00, 10.00 FROM pg_temp.av2_caso;
    EXCEPTION
        WHEN SQLSTATE '23505' THEN
            GET STACKED DIAGNOSTICS alvo = CONSTRAINT_NAME;
            IF alvo IS DISTINCT FROM 'pk_itens_pedido' THEN
                RAISE EXCEPTION 'caso numero_item_duplicado: alvo inesperado';
            END IF;
            RAISE NOTICE 'OK numero_item_duplicado';
            RETURN;
        WHEN OTHERS THEN
            RAISE EXCEPTION 'caso numero_item_duplicado: SQLSTATE %', SQLSTATE USING ERRCODE = SQLSTATE;
    END;
    RAISE EXCEPTION 'caso numero_item_duplicado: operação aceita';
END
$numero_item_duplicado$;

DO $numero_pedido_invalido$
DECLARE
    alvo text;
BEGIN
    BEGIN
        UPDATE origem.pedidos SET numero = 'NUMERO-INVALIDO'
        WHERE id = (SELECT pedido FROM pg_temp.av2_caso);
    EXCEPTION
        WHEN SQLSTATE '23514' THEN
            GET STACKED DIAGNOSTICS alvo = CONSTRAINT_NAME;
            IF alvo IS DISTINCT FROM 'ck_pedidos_numero_formato' THEN
                RAISE EXCEPTION 'caso numero_pedido_invalido: alvo inesperado';
            END IF;
            RAISE NOTICE 'OK numero_pedido_invalido';
            RETURN;
        WHEN OTHERS THEN
            RAISE EXCEPTION 'caso numero_pedido_invalido: SQLSTATE %', SQLSTATE USING ERRCODE = SQLSTATE;
    END;
    RAISE EXCEPTION 'caso numero_pedido_invalido: operação aceita';
END
$numero_pedido_invalido$;

DO $status_pedido_invalido$
BEGIN
    BEGIN
        UPDATE origem.pedidos SET status = 'inexistente'
        WHERE id = (SELECT pedido FROM pg_temp.av2_caso);
    EXCEPTION
        WHEN SQLSTATE '22P02' THEN
            RAISE NOTICE 'OK status_pedido_invalido';
            RETURN;
        WHEN OTHERS THEN
            RAISE EXCEPTION 'caso status_pedido_invalido: SQLSTATE %', SQLSTATE USING ERRCODE = SQLSTATE;
    END;
    RAISE EXCEPTION 'caso status_pedido_invalido: operação aceita';
END
$status_pedido_invalido$;

DO $total_obrigatorio$
DECLARE
    alvo text;
BEGIN
    BEGIN
        UPDATE origem.pedidos SET total = NULL
        WHERE id = (SELECT pedido FROM pg_temp.av2_caso);
    EXCEPTION
        WHEN SQLSTATE '23502' THEN
            GET STACKED DIAGNOSTICS alvo = COLUMN_NAME;
            IF alvo IS DISTINCT FROM 'total' THEN
                RAISE EXCEPTION 'caso total_obrigatorio: alvo inesperado';
            END IF;
            RAISE NOTICE 'OK total_obrigatorio';
            RETURN;
        WHEN OTHERS THEN
            RAISE EXCEPTION 'caso total_obrigatorio: SQLSTATE %', SQLSTATE USING ERRCODE = SQLSTATE;
    END;
    RAISE EXCEPTION 'caso total_obrigatorio: operação aceita';
END
$total_obrigatorio$;

DO $pedido_com_itens$
DECLARE
    alvo text;
BEGIN
    BEGIN
        DELETE FROM origem.pedidos
        WHERE id = (SELECT pedido FROM pg_temp.av2_caso);
    EXCEPTION
        WHEN SQLSTATE '23503' THEN
            GET STACKED DIAGNOSTICS alvo = CONSTRAINT_NAME;
            IF alvo IS DISTINCT FROM 'fk_itens_pedido_pedido_id' THEN
                RAISE EXCEPTION 'caso pedido_com_itens: alvo inesperado';
            END IF;
            RAISE NOTICE 'OK pedido_com_itens';
            RETURN;
        WHEN OTHERS THEN
            RAISE EXCEPTION 'caso pedido_com_itens: SQLSTATE %', SQLSTATE USING ERRCODE = SQLSTATE;
    END;
    RAISE EXCEPTION 'caso pedido_com_itens: operação aceita';
END
$pedido_com_itens$;

-- O teste RESTRICT anterior isola a FK dos itens antes destes vínculos.
INSERT INTO origem.pagamentos (pedido_id, valor, status)
SELECT pedido, 30.00, 'aprovado' FROM pg_temp.av2_caso;
INSERT INTO origem.intencoes_notificacao (pedido_id)
SELECT pedido FROM pg_temp.av2_caso;

DO $segundo_pagamento$
DECLARE
    alvo text;
BEGIN
    BEGIN
        INSERT INTO origem.pagamentos (pedido_id, valor, status)
        SELECT pedido, 30.00, 'aprovado' FROM pg_temp.av2_caso;
    EXCEPTION
        WHEN SQLSTATE '23505' THEN
            GET STACKED DIAGNOSTICS alvo = CONSTRAINT_NAME;
            IF alvo IS DISTINCT FROM 'uq_pagamentos_pedido_id' THEN
                RAISE EXCEPTION 'caso segundo_pagamento: alvo inesperado';
            END IF;
            RAISE NOTICE 'OK segundo_pagamento';
            RETURN;
        WHEN OTHERS THEN
            RAISE EXCEPTION 'caso segundo_pagamento: SQLSTATE %', SQLSTATE USING ERRCODE = SQLSTATE;
    END;
    RAISE EXCEPTION 'caso segundo_pagamento: operação aceita';
END
$segundo_pagamento$;

DO $processada_sem_data$
DECLARE
    alvo text;
BEGIN
    BEGIN
        UPDATE origem.intencoes_notificacao SET status = 'processada', processada_em = NULL
        WHERE pedido_id = (SELECT pedido FROM pg_temp.av2_caso);
    EXCEPTION
        WHEN SQLSTATE '23514' THEN
            GET STACKED DIAGNOSTICS alvo = CONSTRAINT_NAME;
            IF alvo IS DISTINCT FROM 'ck_intencoes_notificacao_data_processamento_status' THEN
                RAISE EXCEPTION 'caso processada_sem_data: alvo inesperado';
            END IF;
            RAISE NOTICE 'OK processada_sem_data';
            RETURN;
        WHEN OTHERS THEN
            RAISE EXCEPTION 'caso processada_sem_data: SQLSTATE %', SQLSTATE USING ERRCODE = SQLSTATE;
    END;
    RAISE EXCEPTION 'caso processada_sem_data: operação aceita';
END
$processada_sem_data$;

DO $processada_antes_da_criacao$
DECLARE
    alvo text;
BEGIN
    BEGIN
        UPDATE origem.intencoes_notificacao SET status = 'processada', processada_em = criado_em - interval '1 second'
        WHERE pedido_id = (SELECT pedido FROM pg_temp.av2_caso);
    EXCEPTION
        WHEN SQLSTATE '23514' THEN
            GET STACKED DIAGNOSTICS alvo = CONSTRAINT_NAME;
            IF alvo IS DISTINCT FROM 'ck_intencoes_notificacao_cronologia_processamento' THEN
                RAISE EXCEPTION 'caso processada_antes_da_criacao: alvo inesperado';
            END IF;
            RAISE NOTICE 'OK processada_antes_da_criacao';
            RETURN;
        WHEN OTHERS THEN
            RAISE EXCEPTION 'caso processada_antes_da_criacao: SQLSTATE %', SQLSTATE USING ERRCODE = SQLSTATE;
    END;
    RAISE EXCEPTION 'caso processada_antes_da_criacao: operação aceita';
END
$processada_antes_da_criacao$;

DO $perfil_em_cascata$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM origem.perfis_artesao
                   WHERE usuario_id = (SELECT artesao_livre FROM pg_temp.av2_caso)) THEN
        RAISE EXCEPTION 'caso perfil_em_cascata: perfil de controle ausente';
    END IF;
    BEGIN
        DELETE FROM origem.usuarios WHERE id = (SELECT artesao_livre FROM pg_temp.av2_caso);
    EXCEPTION WHEN OTHERS THEN
        RAISE EXCEPTION 'caso perfil_em_cascata: SQLSTATE %', SQLSTATE USING ERRCODE = SQLSTATE;
    END;
    IF NOT FOUND OR EXISTS (SELECT 1 FROM origem.perfis_artesao
                           WHERE usuario_id = (SELECT artesao_livre FROM pg_temp.av2_caso)) THEN
        RAISE EXCEPTION 'caso perfil_em_cascata: exclusão incompleta';
    END IF;
    RAISE NOTICE 'OK perfil_em_cascata';
END
$perfil_em_cascata$;

ROLLBACK;
