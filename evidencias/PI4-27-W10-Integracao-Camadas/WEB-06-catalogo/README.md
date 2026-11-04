# WEB-06: catalogo publico HTTP

Branch: `codex/web-06-catalogo-publico`.
Implementacao restrita a leitura de produtos, filtros e avaliacoes.

## TDD

Backend: 25 testes falharam inicialmente pela ausencia das rotas.
Um teste ja passou pelo 404 de recurso ausente.
Depois da implementacao, os 26 testes passaram no PostgreSQL real.
O teste posterior de cache falhou e passou apos no-store.
Frontend: 14 testes falharam antes dos adapters e container HTTP.
Os testes passaram apos implementacao e validacao de respostas.
O teste de tipos confirma ProdutoDTO compativel com Produto.
Nenhum banco ou repository foi mockado.
Testes frontend unitarios substituem somente fetch na borda HTTP.

## Fluxo visual

[resultado.json](fluxo-real-2026-10-14T13-18-38-711Z/resultado.json)
registra chamadas HTTP e verificacoes aprovadas:

- Busca Vaso combinada com categoria e tecnica.
- IDs da tela iguais aos IDs da API.
- URL copiada reproduz o resultado numa segunda aba.
- Resolucao mobile sem overflow horizontal.
- Detalhe carregado por HTTP com resumo de avaliacoes.
- Moderacao e estoque zero removem o produto imediatamente.
- Ambos recebem 404 e detalhe indisponivel.
- Busca sem resultados apresenta estado vazio.

Imagens PNG e videos WebM estao nessa pasta.
GIF do fluxo: [busca-filtros-url.gif](fluxo-real-2026-10-14T13-18-38-711Z/busca-filtros-url.gif).
O fluxo utiliza Next.js, Express e PostgreSQL reais.
Registros pertencem a schema temporario isolado.
O visitante entra pelo botao existente em cada aba.
Recomendacoes, nomes/perfis e filtro de artesaos dependem das outras
subtarefas ainda pendentes. Nenhum usa fake no modo HTTP.

## Reproducao

Com dependencias instaladas e backend/.env configurado:

```powershell
node --import ./backend/node_modules/tsx/dist/loader.mjs evidencias/PI4-27-W10-Integracao-Camadas/WEB-06-catalogo/validar-fluxo-real.mjs
```

O script usa Playwright Node.js bundled e Microsoft Edge.
Sobe servidores locais nas portas 39415 e 39416.
No finally, encerra somente esses processos e o schema criado.
Primeira tentativa parou no gate de visitante.
A automacao foi corrigida para usar a entrada existente.
Arquivos dessa tentativa foram preservados.

Avisos conhecidos: SSL do driver PostgreSQL e act num
teste preexistente do frontend. Nenhum deles falhou testes.
Revisao equivalente: [04-revisao-seguranca.md](04-revisao-seguranca.md).

## Validacao final

- Backend: 329 testes aprovados em 36 arquivos.
- Frontend: 734 testes aprovados em 76 arquivos.
- Lint e typecheck aprovados nos dois projetos.
- Prettier aprovou todos os arquivos TypeScript alterados.
- Diff conferido preservando CRLF dos arquivos existentes.
- Servidores de evidencia encerrados apos o fluxo.

Logs: 01-testes-backend.txt, 02-testes-frontend.txt e arquivos 03-*.
API.md e evidencias permanecem locais, conforme .gitignore existente.
Nenhuma credencial foi gravada nesses arquivos.
Sem commit, push ou deploy.
