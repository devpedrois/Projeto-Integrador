# BD.3: revisão equivalente de segurança

Revisão nesta conversa, conforme escolha anterior de Pedro.
Não houve delegação para security-auditor.

Escopo: consulta SQL, autenticação, autorização, contrato e evidências.

- A rota aplica autenticar antes de exigirPapel('artesao').
- A sessão é revalidada no PostgreSQL pelo middleware existente.
- A identidade vem de response.locals.usuario, nunca da query.
- O validador recusa campos externos, inclusive artesaoId.
- Comprador e admin continuam proibidos com papel forjado no JWT.
- O filtro do artesão usa parâmetro no template $queryRaw.
- Não há interpolação textual de valores ou $queryRawUnsafe novo.
- A subquery agrega por produto/pedido antes do JOIN com Produto.
- Pedidos distintos são contados após restringir o artesão.
- Fotos e avaliações não multiplicam as linhas de vendas.
- Dados históricos não dependem da visibilidade atual do produto.
- Preço atual e total de pedidos compartilhados não definem receita.
- Erros inesperados usam o middleware seguro existente.
- O resultado não expõe compradores, pedidos individuais ou credenciais.
- Respostas usam Cache-Control no-store, sem cache compartilhado.
- Conferência de volume usa transação REPEATABLE READ READ ONLY.
- JWTs e segredo efêmeros ficam em memória, sem registro.
- Não foram aplicados seeds ou migrations na branch de volume.

Nenhum achado de segurança identificado no escopo alterado.
