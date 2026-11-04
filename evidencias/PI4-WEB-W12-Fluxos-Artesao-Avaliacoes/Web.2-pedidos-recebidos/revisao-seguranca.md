# Web.2: revisão equivalente

Data: 25/10/2026.
Responsável indicado: Andrews. Revisor indicado: Pedro.
Revisão técnica realizada pelo Codex nesta conversa.
O usuário escolheu revisão local, sem delegação ao security-auditor.

## Resultado

Nenhum achado bloqueante permaneceu na revisão.
A troca de contas retinha a listagem anterior.
Foi corrigida mediante remontagem pelo identificador da sessão.
O teste `tests/app/pedidos-recebidos.web2.test.tsx` cobre essa regressão.

## Verificações

- A rota autentica e exige papel atual `artesao`.
- Identidade vem exclusivamente de `response.locals.usuario.id`.
- UUID, corpo vazio e query vazia são validados.
- Item alheio e inexistente retornam o mesmo 404.
- A propriedade é filtrada dentro da transação.
- SQL usa parâmetros para ambos os identificadores.
- O item recebe bloqueio exclusivo antes da transição.
- Pedido e produto recebem bloqueio compartilhado.
- O estado do pedido é conferido antes da escrita.
- O instante vem do servidor, sem input externo.
- Reenvio retorna 409, preservando o instante original.
- Quatro envios simultâneos produziram um sucesso.
- Listagem aplica propriedade também nos itens internos.
- Leituras privadas preservam `Cache-Control: no-store`.
- DTOs não expõem pagamentos ou itens alheios ao artesão.
- O frontend exige confirmação e bloqueia envios simultâneos.
- Conflitos refazem a leitura do estado persistido.
- React renderiza nomes como texto, sem HTML arbitrário.

## Limites

Revisão local e testes automatizados contra PostgreSQL real.
Smoke executado localmente com Chrome e schema isolado.
Não representa deploy nem smoke de produção.
Endereço de entrega não existe no modelo vigente.
