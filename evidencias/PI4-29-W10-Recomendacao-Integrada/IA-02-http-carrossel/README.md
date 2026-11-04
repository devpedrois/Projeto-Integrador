# IA-02: recomendacoes HTTP e carrossel

Branch: `codex/ia-02-http-recommendations`.
Data: 14/10/2026.

NEXT_PUBLIC_DATA_SOURCE=http ativa HttpRecommendationAdapter no container.
RecomendacoesService sai de PENDENTES_HTTP.
Vitrine e detalhe chamam GET /api/recomendacoes.
O adapter valida contexto e produtos usando o cliente existente.
Preserva ordem e estrategia recebidas, inclusive fallback-geral.
Remove contexto, duplicados e invisiveis antes do limite oito.
Falhas HTTP continuam no estado de erro do hook.
O modo fake permanece funcional e separado do HTTP.

Peças relacionadas reutiliza ProdutoCard com links e acao existente.
FaixaRecomendacoes compartilha estados usando renderer opcional.
O trilho horizontal permite foco por teclado e scroll.

## TDD e verificacoes

- Antes da implementacao: 26 falhas e 18 sucessos.
- Testes direcionados: 66 sucessos em seis arquivos.
- Suite final: 761 sucessos em 78 arquivos.
- Lint, typecheck e Prettier passaram.
- Build de producao passou com NEXT_PUBLIC_DATA_SOURCE=http.
- Nenhuma alteracao produtiva no backend.

Testes unitarios substituem somente fetch ou services frontais.
A validacao de integracao usa Next.js, Express e PostgreSQL reais.
Nenhum banco ou repository foi mockado.

## Evidencias visuais e HTTP

A coleta final esta em `fluxo-real-2026-10-14T14-05-18-468Z/`.

- `vitrine-detalhe-network.gif`: sequencia das capturas reais.
- `vitrine-network.png` e `detalhe-network.png`: chamadas da pagina.
- `resposta-http.png`: resposta JSON aberta no navegador.
- `resposta-categoria.json` e `resposta-fallback.json`: payloads reais.
- `network.json`: eventos HTTP observados na pagina.
- `detalhe-360.png`, `detalhe-768.png`, `detalhe-1280.png`: responsividade.
- `erro-vitrine.png` e `erro-detalhe.png`: alertas com HTTP 503.
- `resultado.json`: igualdade API/tela, limites e medidas verificadas.
- Arquivo WEBM: video original da navegacao automatizada.

O painel Network e instrumentacao visual adicionada pela automacao.
Ele mostra eventos HTTP reais; nao representa DevTools nativo.
O GIF apenas agrupa PNGs reais em sequencia, sem redesenhar conteudo.
A falha 503 e controlada somente no servidor da evidencia.
Produtos e pedidos sinteticos ficam num schema temporario isolado.
Esse schema e os servidores locais foram encerrados no finally.

## Responsividade

| Viewport | Largura da pagina | Trilho | Conteudo | Card |
|---|---|---|---|---|
| 360px | 360px | 328px | 2192px | 260px |
| 768px | 768px | 720px | 2192px | 260px |
| 1280px | 1280px | 1192px | 2192px | 260px |

Sem overflow horizontal na pagina; scroll limitado ao carrossel.
O teste percorreu o trilho horizontal ate o fim.
Tambem comparou os oito IDs da tela com a API.
O produto atual nao aparece em categoria nem fallback.

A primeira coleta encontrou encolhimento dos cards pelo minmax.
Medidas CSS identificaram cards de 27px em 360px.
Colunas fixas corrigiram o problema nas tres larguras.
Coletas anteriores foram preservadas para rastrear essa falha.

## Revisao equivalente de seguranca

A escolha anterior de Pedro manteve a revisao nesta conversa.
Contexto aceita somente uma chave conhecida e identificador UUID.
URLs usam URLSearchParams; valores nao criam parametros extras.
Respostas desconhecidas passam pelo parser publico de Produto.
ApiClient preserva cookies, no-store, timeout e erros sanitizados.
Falha HTTP nunca aciona adapter falso ou localStorage.
React escapa textos; fotos usam o sanitizador existente.
Nao houve achados de seguranca no diff revisado.
O contexto usuarioId permanece no fallback geral existente.

PostgreSQL emitiu aviso preexistente sobre sslmode=require.
Nenhuma credencial, commit, push ou deploy foi produzido.

## Reproduzir

Com backend/.env configurado, execute a partir de backend/:

```powershell
node --import tsx ../evidencias/PI4-29-W10-Recomendacao-Integrada/IA-02-http-carrossel/validar-fluxo-real.mjs
```

O script usa Node.js bundled, Playwright Node.js e Edge.
As portas locais sao 39425 e 39426.
Documentos auxiliares e evidencias seguem o .gitignore existente.
