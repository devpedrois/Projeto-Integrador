# Integracao publicada: verificacao final

Verificado em 02/11/2026. Todos os quatro pontos solicitados passaram.

| Item | Resultado | Evidencia |
|---|---|---|
| Filtro por artesao | 4 artesaos, sem e-mail; filtro de Maria retornou 4 produtos | filtro-artesao-producao.jpg |
| Fotos | 10 URLs corrigidas; 6 ilustracoes publicas de categoria verificadas | fotos-corrigidas-producao.jpg |
| Upload | Upload 200; imagem 200; perfil persistido; conta e PNG temporarios removidos | upload-real-confirmado.jpg |
| Swagger | /api/docs canonicaliza para /api/docs/; UI e assets 200; GET executado na UI retornou 200 | swagger-execucao-200.jpg |

Backend: 762/762 testes. Frontend: 969/969 testes.
Builds, lint e typecheck passaram nas duas aplicacoes.
Revisao equivalente de seguranca concluida, sem bloqueios.

Frontend Production Ready: 6f55c3817b6173a4405abe33856bbaca51a94464.
Backend Render Live: 345631a5e1d5ab852e50541a44046329c687f5f5.
O ultimo commit alterou somente frontend e contrato; backend permanece identico.
Main local e remota sincronizadas, arvore limpa e commits sem coautoria.

A verificacao publicada encontrou o caso sem barra do Swagger.
Esse caso ganhou canonicalizacao no middleware e regressao real.
A interface Swagger executou GET /api/artesaos e recebeu 200.

Somente dez valores ProdutoFoto.url foram alterados no dominio anterior.
Quinze tabelas foram conferidas; demais linhas e colunas permaneceram iguais.
Nenhum seed completo foi executado.
As imagens sao ilustracoes sinteticas de categoria, preservando o catalogo demonstrativo.
O token do Blob esta configurado no Render e foi mantido oculto.
A conta temporaria e o PNG de 68 bytes do teste foram removidos.
As seis imagens do catalogo foram preservadas.

Resultados JSON e prints acompanham este arquivo.
Nenhum segredo, senha ou valor de cookie integra o pacote.
