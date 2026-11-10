# Revisão equivalente de segurança

Revisão realizada nesta conversa, conforme escolha do responsável.
Escopo: correções dos filtros, sessão, credenciais e avaliação legada.
Não houve delegação para `security-auditor`.

## Resultado

Nenhuma falha de segurança bloqueante foi identificada neste escopo.
As verificações abaixo utilizaram código, testes e PostgreSQL real.

| Limite | Verificação | Resultado |
|---|---|---|
| Sessão | Repetição limitada somente ao GET `/auth/me` | Preservado |
| Escritas | Login e cadastro não recebem repetição automática | Preservado |
| Autenticação | HTTP 401 encerra tentativas imediatamente | Teste aprovado |
| Respostas | Identidade inválida continua rejeitada | Testes existentes aprovados |
| Timeout | Primeira consulta abortada; próxima recupera sessão | Teste aprovado |
| Conteúdo protegido | Carregamento não revela conteúdo autenticado | Testes aprovados |
| Corridas de sessão | Resposta antiga não substitui login posterior | Suíte existente aprovada |
| Filtros | Serialização com `URLSearchParams`; parâmetros conhecidos | Preservado |
| Navegação | Histórico externo sincroniza novamente os filtros | Testes unitário e E2E aprovados |
| Microsserviço | Leitura das views; tabelas da API negadas | PostgreSQL real confirmou |
| Credenciais | Dois valores autorizados lidos no Render | Sincronização somente local |
| Evidências | Valores secretos permanecem em arquivos ignorados | Conferência final registrada separadamente |
| Dado legado | Backup; identidade exata; transação; compra revalidada | Uma exclusão autorizada |
| Histórico comercial | Contagens de pedidos e pagamentos preservadas | Quatro registros em cada tabela |

O GET de sessão mantém cookies e origem existentes.
Não houve ampliação de permissões, desativação de controles ou rotação.
O painel Render não recebeu alterações de configuração.
O resultado publicado autenticado do microsserviço foi HTTP 200.

Fontes: `frontend/src/services/http/usuarios.service.ts`,
`frontend/src/hooks/use-filtros-url.ts`, `RouteGuard.tsx`, `GateAcesso.tsx`
e as evidências JSON desta pasta.
