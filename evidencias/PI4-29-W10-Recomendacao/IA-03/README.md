# IA-03: recomendação pelo histórico autenticado

Implementação na branch codex/ia03-historico-recomendacoes.
Nenhum commit ou push executado.

RED: 14 falhas backend e seis frontend observadas.
A rota pessoal ainda retornava 404.
A rota pública aceitava usuarioId e recusava contexto vazio.
O frontend transmitia usuarioId e usava produto destacado para visitantes.
Um teste posterior reproduziu null para contexto vazio no hook.

GREEN: 517 testes backend passaram em 50 arquivos.
Comando: node node_modules/vitest/vitest.mjs run --testTimeout=15000.
GREEN: 842 testes frontend passaram em 89 arquivos.
Comando: npm test.
Lint e typecheck passaram nos dois projetos.
Prettier validou arquivos alterados, preservando CRLF existente.
git diff --check usa core.whitespace=cr-at-eol.

Strategy foi testada diretamente contra PostgreSQL real.
Rotas usam Supertest, autenticação real e schema isolado.
Não foram usados mocks de banco ou repository.

Smoke real: Next.js local, Express e PostgreSQL isolado.
Todos os usuários, pedidos e produtos foram sintéticos.
Compradora com cerâmica confirmada recebeu Bowl e Jarra de Ceramica.
Vaso de Barro Comprado ficou fora das recomendações pessoais.
Comprador sem compras confirmadas recebeu fallback geral.
Visitante recebeu fallback sem produto ou identidade na URL.

Capturas:

- vitrine-compradora-ceramica.jpg
- vitrine-sem-historico.jpg

As capturas não incluem a aba Network.
respostas-http.json registra estratégias e produtos das chamadas reais.
fluxo-http.json registra requisições observadas pelo servidor temporário.
As respostas pessoais mostram no-store e ausência de X-Cache.
Nenhum cookie, token, senha ou URL de conexão foi salvo.

Revisão local equivalente autorizada, registrada em revisao-seguranca.md.
Avisos anteriores sobre SSL, concorrência pg e act permanecem fora do escopo.
Não houve migration deploy na base publicada.
Servidor backend encerrou com IA03_SMOKE_CLEANED e código zero.
Frontend temporário e aba do navegador também foram encerrados.
O schema sintético foi descartado e os scripts temporários removidos.
Uma imagem sintética do tecido aponta para arquivo ausente.
Isso não afeta recomendações; as imagens de cerâmica carregaram.
