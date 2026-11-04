# WEB-12: revisão local equivalente

Revisão autorizada por Pedro em 14/10/2026.
Não houve delegação ao security-auditor.

Inspecionados routes, controllers, services, validators e repositories novos.
Inspecionados também autenticação, DTOs e adapters HTTP alterados.
Testes de banco usam PostgreSQL real, em schema isolado.

| Controle | Evidência |
|---|---|
| Identidade autenticada | POST vincula artesaoId ao usuário da sessão |
| Propriedade | PATCH, DELETE e estoque validam dono ou admin |
| Papéis atuais | Middleware consulta usuário ativo no PostgreSQL |
| Administração | Guard global em /admin e exigirPapel local |
| Autoria imutável | Schemas rejeitam artesaoId no PATCH |
| Moderação protegida | Dono não altera desativadoPorAdmin nem reativa bloqueado |
| Moderação reversível | Flags independentes preservam exclusão lógica |
| Automoderação | UUID normalizado impede admin moderar sua conta |
| Concorrência | FOR UPDATE compartilha linha com checkout |
| Revalidação | Bloqueio administrativo verificado depois do lock |
| SQL | Queries parametrizadas com tagged templates Prisma |
| Entrada | Zod strict, UUID, limites monetários e estoque inteiro |
| Fotos | URLs HTTPS ou caminhos locais seguros |
| Respostas | DTOs explícitos sem senha ou senhaHash |
| Falhas | Express 5 encaminha rejeições ao errorMiddleware |
| Dados | Schema isolado; nenhum registro de produção alterado |

Sem achados bloqueantes no escopo WEB-12.
Nenhuma dependência, schema ou migration de produção foi alterada.

GET privado inclui produtos moderados, inativos e sem estoque.
UsuariosService.list corresponde à listagem administrativa de artesãos.
O perfil público continua usando busca pública e DTO público.

Cadastro herda a técnica principal quando tecnicaId está ausente.
Perfil sem técnica deve ser preenchido antes desse cadastro.
Essa validação preserva o campo obrigatório no modelo existente.
