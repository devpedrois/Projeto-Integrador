# Web.5: indicadores do artesão

Data: 25/10/2026. Responsável e revisor indicado: Pedro.
Branch: `codex/web5-indicadores-artesao`.

## Validações finais

- Frontend: 935 testes aprovados em 100 arquivos.
- Backend: 680 testes aprovados em 64 arquivos.
- Lint e typecheck passaram nos dois projetos.
- Build frontend de produção passou.
- Formatação conferida com Prettier.
- Revisão equivalente concluída sem achados bloqueantes.

Os logs preservam avisos existentes de React e PostgreSQL.
Esses avisos não produziram falhas nas suítes.

## Resultado funcional

Card integrado ao painel existente.
Exibe quantidade vendida, receita BRL, pedidos e atualização.
Reutiliza `formatarMoeda`, sem cálculos financeiros na interface.
Contempla carregando, sucesso, vazio e erro recuperável.
Vazio significa nenhum pedido confirmado, sem confundir receita zero.
Erros não apresentam vendas zeradas como resultado válido.
Trocar de conta descarta os indicadores anteriores.

O contrato preserva os cinco campos do endpoint existente.
HTTP consulta `/artesao/indicadores`, sem identificador externo.
Usa sessão por cookie e `cache: no-store`.
A versão fake consulta repositories locais reais da Fake API.
Agrega somente itens próprios de pedidos confirmados.
Usa preços congelados, centavos inteiros e pedidos distintos.
O container seleciona explicitamente HTTP ou fake.
Nenhum erro HTTP ativa fallback local.
Não houve alteração de rota, consulta ou schema backend.

## Dez recargas com backend real

Executado com Playwright e Chrome instalado.
Frontend usa `next build` e `next start`, localmente.
API Express local consulta PostgreSQL Neon real.
O banco compartilhado não tinha o artesão demo atual.
A tentativa inicial está preservada em `performance.log`.
A execução válida usou o seed oficial em schema isolado.
O artesão foi João Artesão, `seed-artesao-01`.
Nenhuma venda compartilhada foi alterada pelo harness.
O schema temporário foi removido ao terminar.

Login e primeira abertura ficaram fora da amostra.
Foram medidas dez recargas consecutivas, sem descartar rodadas.
Cada recarga realizou uma consulta real de indicadores.
`Resource Timing` registra a duração completa da requisição.
Renderização parte de `navigationStart` e inclui hidratação e autenticação.
Termina com dados completos no DOM e `requestAnimationFrame`.
Não foi adicionada instrumentação à aplicação de produção.

| Recarga | Requisição, ms | Card renderizado, ms |
|---|---:|---:|
| 1 | 169,90 | 259,90 |
| 2 | 151,50 | 229,80 |
| 3 | 151,70 | 235,40 |
| 4 | 151,30 | 228,80 |
| 5 | 151,40 | 231,10 |
| 6 | 150,70 | 236,00 |
| 7 | 150,50 | 228,40 |
| 8 | 150,70 | 234,60 |
| 9 | 150,90 | 236,50 |
| 10 | 151,00 | 226,30 |

Dez de dez requisições ficaram abaixo de 2.000 ms.
Dez de dez renderizações ficaram abaixo de 2.000 ms.
Máximos: 169,90 ms na requisição; 259,90 ms na renderização.
Todas as respostas conferiram com os valores visíveis.
Foram exibidos 2 itens vendidos, R$ 118,80 e 2 pedidos.
O atributo `datetime` conferiu com `atualizadoEm` em cada rodada.
Não houve erros JavaScript.
Capturas adicionais em 360/768/1280px passaram sem estouro horizontal.

## Arquivos

- `medicoes.json`: ambiente, dez respostas e tempos completos.
- `medicoes.csv`: dez linhas para conferência independente.
- `performance-isolado.log`: execução válida e limpeza do schema.
- `card-*.png`: capturas do card em três larguras.
- `painel-*.png`: painel completo nas mesmas larguras.
- `frontend-build.log`: build local HTTP utilizado na medição.
- `frontend-testes.log`: suíte completa frontend.
- `backend-testes.log`: suíte completa backend existente.
- `*-lint.log` e `*-typecheck.log`: validações por projeto.
- `revisao-seguranca.md`: revisão equivalente nesta conversa.

## Reprodução

Requer Python com Playwright, Chrome e PostgreSQL configurado.
O harness aplica migrations e seed somente no schema temporário.

Terminal frontend:

```powershell
cd frontend
$env:NEXT_PUBLIC_DATA_SOURCE = 'http'
$env:BACKEND_URL = 'http://127.0.0.1:3305'
npm run build
node node_modules/next/dist/bin/next start --hostname 127.0.0.1 --port 3005
```

Terminal backend:

```powershell
cd backend
$env:WEB5_PYTHON = '<executavel Python com Playwright instalado>'
node node_modules/tsx/dist/cli.mjs tests/e2e/web5-performance.ts
```

O processo inicia uma API temporária na porta 3305.
Ao concluir, encerra essa API e remove o schema.
O frontend deve ser encerrado pelo terminal que o iniciou.
Credenciais sintéticas passam somente pela memória dos processos.
Os arquivos de evidência não contêm cookies ou senhas.

## Limites

Medição local de recargas, com seed demo e conexão aquecida.
Não comprova latência de produção ou primeira inicialização do Neon.
Não houve commit, push ou deploy.
`API.md` foi atualizado localmente e permanece ignorado pelo Git.
