# Revisão equivalente de segurança: Web.1

Data: 22/10/2026.
Responsável informado: Andrews. Revisor informado: Pedro.
Revisão técnica executada pelo Codex nesta conversa.
O usuário escolheu revisão equivalente, sem delegação ao security-auditor.

Escopo revisado: rota, validator, controller, service, repository, OpenAPI e testes.

- A rota autentica antes de exigir o papel atual `artesao`.
- Autenticação reconsulta usuário ativo e papel no PostgreSQL.
- A identidade deriva somente de `response.locals.usuario.id`.
- Query estrita rejeita seletores externos e parâmetros repetidos.
- Limite máximo 100; offset máximo 10000.
- `Pedido` exige status confirmado e existência de item próprio.
- A seleção aninhada aplica novamente o filtro de propriedade.
- Lista e contagem usam o mesmo filtro e snapshot RepeatableRead.
- A consulta Prisma usa valores parametrizados, sem SQL concatenado.
- O select não carrega total financeiro, pagamento ou email.
- O DTO usa allowlist explícita, sem espalhar registros completos.
- A soma Decimal considera somente subtotais dos itens selecionados.
- As respostas protegidas recebem `Cache-Control: no-store`.
- Erros seguem middleware existente, sem stack ou SQL na resposta.
- Os testes inspecionam todo o payload para produtos alheios.
- Há cobertura de 401, 403, adulteração da query e revogação de papel.
- Nenhuma migration, tela ou status por item foi adicionado.

Nenhum achado acionável identificado neste escopo.
Essa revisão local não representa validação de deploy.

API.md e CLAUDE.md foram atualizados localmente.
Ambos permanecem ignorados pelas regras preexistentes do Git.
Não houve commit nem push nesta tarefa.
