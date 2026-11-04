# Revisão equivalente de segurança da IA.1

Pedro escolheu revisão nesta conversa, sem delegação.
O agente security-auditor não foi executado.

Escopo: diff IA.1, adapter HTTP, composição, ApiClient e ServiceError.

- A alteração funcional limita-se à documentação OpenAPI.
- Não foram alteradas autenticação, autorização ou consultas SQL.
- O adapter conserva validação de UUID e contexto estrito.
- Respostas HTTP continuam validadas pelo parser público existente.
- O novo teste usa BrowserProdutoRepository real, sem repository mockado.
- A resposta de fetch utiliza produtos e ranking da fixture contratual.
- Os IDs são convertidos para UUIDs preservando desempates lexicográficos.
- A igualdade estrita verifica todos os campos e a ordem.
- HTTP 400, 404 e 503 geram instâncias de ServiceError.
- As mensagens públicas não reproduzem detalhes internos da resposta.
- O acesso a localStorage falha deliberadamente durante esses erros.
- Isso impede fallback fake silencioso de satisfazer os testes.
- O teste existente confirma HttpRecommendationAdapter no container HTTP.
- Contextos ausentes ou produtos ocultos conservam fallback geral.
- A documentação 404 não modifica a resposta desses contextos.
- Nenhuma credencial, cookie ou conexão foi adicionada ao diff.

Resultado: nenhum achado de segurança no escopo alterado.
