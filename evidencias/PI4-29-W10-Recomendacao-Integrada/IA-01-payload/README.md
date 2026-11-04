# IA-01: contrato publico de recomendacoes

Branch: `codex/ia-01-recommendation-payload`.
Data: 14/10/2026.

Strategy retorna `{ estrategia, produtoIds }`.
O service carrega produtos visiveis numa consulta parametrizada.
Reutiliza a leitura do catalogo e `mapearProdutoDTO`.
Preserva a ordem, elimina repeticoes e exclui o contexto.
A resposta HTTP permanece `{ estrategia, itens: Produto[] }`.
Ranking, fallback, reforco regional e formulas nao mudaram.

## TDD

Antes da implementacao, 12 testes falharam e cinco passaram.
Falhas comprovaram campos ausentes e selecao antiga da Strategy.
O typecheck frontal detectou incompatibilidade com RecomendacaoResultado.
Depois da implementacao, 35 testes backend direcionados passaram.
Nove testes frontais de contrato e fixture passaram.
Os testes novos usam PostgreSQL real em schema isolado.
Os demais testes PostgreSQL mantem suas fixtures existentes.
Nao houve mocks de banco ou repositories.

## Verificacoes

Resultados completos estao nos arquivos TXT desta pasta.
Suite backend: 340 testes passaram em 37 arquivos.
Suite frontend: 735 testes passaram em 77 arquivos.
Lint e typecheck passaram nos dois projetos.
Prettier passou nos arquivos TypeScript alterados.
O diff foi conferido respeitando finais CRLF preexistentes.
A fixture compartilhada nao foi alterada.
PostgreSQL emitiu aviso preexistente sobre sslmode=require.
As configuracoes e credenciais existentes foram preservadas.

## Revisao equivalente de seguranca

Pedro escolheu revisao nesta conversa, sem delegacao.
Queries de ranking mantem interpolacao parametrizada do Prisma.
A consulta do catalogo usa SQL estatico e parametros separados.
IDs entram como array UUID, sem concatenacao de valores.
Visibilidade exige produto ativo, estoque e ausencia de moderacao.
Tambem exige usuario ativo com papel artesao.
Testes verificam todas essas restricoes nas recomendacoes.
Schemas estritos validam a resposta publica completa.
O mapper elimina colunas internas antes da resposta HTTP.
Entrada continua validada na borda pelo schema estrito existente.
Erros continuam tratados pelo controller e middleware existentes.
usuarioId conserva fallback geral, sem consultar dados pessoais.
Nenhum achado de seguranca na alteracao revisada.

Nenhum commit, push ou deploy foi executado.
