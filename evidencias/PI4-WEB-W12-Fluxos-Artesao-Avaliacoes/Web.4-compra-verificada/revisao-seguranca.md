# Web.4: revisão equivalente de segurança

Data: 22/10/2026. Responsável: Luiz Rocha. Revisor: Pedro.

Revisão técnica realizada nesta conversa, conforme escolha do responsável.
Não houve delegação ao agente security-auditor.

## Resultado

Nenhum achado impeditivo identificado no diff desta subtarefa.

| Superfície | Conferência e evidência |
|---|---|
| Autenticação | GET e POST usam autenticar e exigirPapel comprador. A sessão reconsulta o usuário no PostgreSQL. Testes cobrem 401 e artesão 403. |
| Identidade | Controllers usam response.locals.usuario.id. Query aceita somente produtoId. Body continua estrito; compradorId externo permanece rejeitado. |
| Autorização | JOIN exige comprador do token, status confirmado e produto correspondente. Testes negativos cobrem outro comprador, pendente, cancelado e ausência de compra. |
| Atomicidade | SELECT parametrizado e INSERT usam a mesma transação Prisma. FOR SHARE conserva o pedido e item até o commit. Trigger de teste exige RowShareLock no backend PostgreSQL do próprio INSERT. |
| Consulta prévia | Elegibilidade não autoriza uma escrita futura. Teste cancela pedido entre GET positivo e POST, que devolve 403 sem inserir. |
| Duplicação | UNIQUE comprador/produto permanece a barreira concorrente. Violação P2002 recebe 409; não sobrescreve a avaliação anterior. |
| SQL e erros | Interpolação Prisma parametrizada. UUID validado antes da consulta. Produto inexistente também recebe 403, sem expor existência. Respostas verificadas não incluem Prisma, SQL ou stack. |
| Privacidade e cache | Elegibilidade retorna somente podeAvaliar e motivo. Middleware define no-store. Cache público é invalidado depois do commit. Rejeição 403 mantém HIT e nenhuma avaliação inserida. |
| Interface | Resposta inválida falha fechada. Formulário só aparece com elegibilidade positiva. POST 403 remove o formulário; 409 mostra já avaliado. Testes de componente verificam ausência do botão. |
| Escopo | Sem migration, mudanças de status de pedido, deploy ou alteração de média. Reutiliza índices existentes. |

## Limites da evidência

Testes usam PostgreSQL real em schemas temporários isolados.
A Fake API continua uma simulação local autorizada da AV1.
Sua persistência no navegador não constitui barreira de segurança.
A autorização real permanece no POST autenticado do backend.
Não houve validação de publicação ou smoke em produção.
