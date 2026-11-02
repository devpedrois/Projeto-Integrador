# Revisão equivalente de segurança: US01.C1

Realizada em 02/11/2026, antes do commit.
O responsável escolheu revisão equivalente nesta conversa.
Não houve execução nem delegação ao agente security-auditor.
Sua indisponibilidade não foi alegada.

Foram inspecionados controller, service, repository, validator e token.
Também foram conferidos middleware de erros, transporte e SessionStore.
A revisão considerou os testes de integração e E2E executados.

| Controle | Evidência e conclusão |
| --- | --- |
| Cadastro público | Schema estrito aceita comprador/artesao; admin e extras recebem 400 sem cookie. |
| Papel do JWT | iniciarSessao recebe o DTO selecionado pelo repository após commit. Não recebe o body. |
| Criação atômica | Transação existente preservada. Falha da especialização reverte usuário e não emite cookie. |
| Sessão | Cadastro e login chamam a mesma iniciarSessao. HttpOnly, SameSite=Lax, Path=/, Secure configurável, Max-Age/Expires de 24h. |
| Falha após commit | JWT_SECRET ausente produz 503 seguro; conta e carrinho permanecem. O catch encaminha erros ao error.middleware. |
| Dados públicos | Select do repository e serialização HTTP preservam somente identidade pública. Senha e senhaHash não integram sessão nem resposta. |
| Identidade frontend | Formulário publica somente id/nome/email/papel no store antes de navegar. HTTP não grava identidade em localStorage. |
| Recarregamento | E2E valida GET /auth/me e sessão após reload para comprador e artesão. |
| Navegação | Destinos constantes locais: comprador em /, artesão em /painel-artesao. Não recebe URL externa. |
| Modo fake | Mesmo formulário e store; persistência local testada com adapter/repository reais da simulação. Sem fallback HTTP para fake. |
| Autorização | Middleware de áreas protegidas e revalidação backend permanecem vigentes. Presença de cookie não concede papel. |

Nenhum achado bloqueante identificado nesta correção.
Não foi executado smoke em produção nem CI remoto.

Referências: [RED backend](01-backend-red.log),
[GREEN backend](02-backend-green.log),
[GREEN frontend](04-frontend-green.log),
[E2E](06-e2e-green.log).
