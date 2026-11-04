# IA-03: revisão local equivalente

Data: 14/10/2026.
Pedro escolheu revisão local equivalente, sem delegação ao security-auditor.

Escopo revisado: Strategy, repository, controller, validators, rotas e adapter HTTP.

- A rota pessoal exige autenticar e exigirPapel comprador.
- A autenticação reconsulta usuário ativo e papel atual.
- O controller lê identidade somente de response.locals.usuario.
- Query pessoal estrita rejeita qualquer chave.
- Query pública rejeita usuarioId, inclusive acompanhado de produtoId.
- SQL usa parâmetros Prisma para identificadores e limite.
- Histórico exige comprador próprio e pedido confirmado.
- Exclusão de compras permanece ativa no fallback pessoal.
- Candidatos ocultos, moderados e sem estoque são filtrados.
- Artesãos desativados não fornecem candidatos.
- Agregações separadas impedem multiplicação entre vendas e notas.
- Resposta conserva somente campos públicos do ProdutoDTO.
- A rota pessoal não acessa CacheStore nem emite X-Cache.
- A resposta pessoal usa Cache-Control no-store.
- O adapter não transmite usuarioId em URL ou body.
- Falhas permanecem tratadas na borda e sanitizadas.

Testes adversariais usam PostgreSQL real e Supertest.
Cobrem anonimato, artesão, admin, token adulterado e expirado.
Cobrem desativação e alteração de papel depois da emissão.
Cobrem comprador alheio, pedidos pendentes, cancelados e compras repetidas.
O teste de cache faz leituras e escritas indevidas falharem.
Nenhum achado bloqueante identificado no escopo revisado.
