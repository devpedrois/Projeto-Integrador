import type { Client } from "pg";
import { FalhaValidacao } from "./bd-av2-catalogo.js";

// Cada consulta retorna somente linhas incompatíveis com o cenário do seed.
const divergencias = {
  total_pedido: `
    SELECT p.id FROM origem.pedidos p
    WHERE p.total IS DISTINCT FROM (
      SELECT sum(i.subtotal) FROM origem.itens_pedido i WHERE i.pedido_id = p.id
    )`,
  pagamento_pedido: `
    SELECT p.id FROM origem.pedidos p
    LEFT JOIN origem.pagamentos pg ON pg.pedido_id = p.id
    WHERE pg.valor IS DISTINCT FROM p.total
       OR (p.status = 'confirmado' AND pg.status <> 'aprovado')
       OR (p.status = 'cancelado' AND pg.status <> 'recusado')`,
  vendas_confirmadas: `
    SELECT pr.id FROM origem.produtos pr
    WHERE pr.quantidade_vendida <> COALESCE((
      SELECT sum(i.quantidade) FROM origem.itens_pedido i
      JOIN origem.pedidos p ON p.id = i.pedido_id
      WHERE i.produto_id = pr.id AND p.status = 'confirmado'
    ), 0)`,
  artesao_produto: `
    SELECT pr.id FROM origem.produtos pr
    JOIN origem.usuarios u ON u.id = pr.artesao_id WHERE u.papel <> 'artesao'`,
  comprador_pedido: `
    SELECT p.id FROM origem.pedidos p
    JOIN origem.usuarios u ON u.id = p.comprador_id WHERE u.papel <> 'comprador'`,
  comprador_avaliacao: `
    SELECT a.id FROM origem.avaliacoes a
    JOIN origem.usuarios u ON u.id = a.comprador_id WHERE u.papel <> 'comprador'`,
  compra_avaliada: `
    SELECT a.id FROM origem.avaliacoes a WHERE NOT EXISTS (
      SELECT 1 FROM origem.pedidos p JOIN origem.itens_pedido i ON i.pedido_id = p.id
      WHERE p.comprador_id = a.comprador_id AND i.produto_id = a.produto_id
        AND p.status = 'confirmado'
    )`,
  preco_carrinho: `
    SELECT i.carrinho_id FROM origem.itens_carrinho i
    JOIN origem.produtos pr ON pr.id = i.produto_id WHERE i.preco_unitario <> pr.preco`,
  intencao_confirmacao: `
    SELECT p.id FROM origem.pedidos p
    LEFT JOIN origem.intencoes_notificacao n ON n.pedido_id = p.id
    WHERE (p.status = 'confirmado') <> (n.id IS NOT NULL)
       OR (n.status = 'falha' AND n.tentativas = 0)`,
  avisos_artesaos: `
    WITH destinatarios AS (
      SELECT DISTINCT p.id AS pedido_id, pr.artesao_id AS usuario_id
      FROM origem.pedidos p JOIN origem.itens_pedido i ON i.pedido_id = p.id
      JOIN origem.produtos pr ON pr.id = i.produto_id WHERE p.status = 'confirmado'
    )
    SELECT 1 FROM destinatarios d FULL JOIN origem.notificacoes n USING (pedido_id, usuario_id)
    WHERE d.pedido_id IS NULL OR n.id IS NULL`,
};

export async function auditarCoerencia(
  cliente: Client,
  registrar: (linha: string) => void,
) {
  for (const [regra, consulta] of Object.entries(divergencias)) {
    const { rows } = await cliente.query<{ falhou: boolean }>(
      `SELECT EXISTS (${consulta}) AS falhou`,
    );
    if (rows[0]?.falhou !== false)
      throw new FalhaValidacao("Coerência divergente: " + regra);
    registrar("Coerência OK: " + regra);
  }
}
