# WEB-09 — checkout real com pagamento simulado

Data: 14/10/2026. Branch: `codex/web-09-checkout-real`.
Sem commit, push ou deploy.

## Evidencia transacional PostgreSQL

Teste: `backend/tests/integration/checkout.web09.integration.test.ts`.
O fixture usa schema PostgreSQL isolado e migrations reais.
Os compradores passam por cadastro e login HTTP reais.
O POST aceita itens do body, mantendo o contrato anterior.
O comprador vem exclusivamente da sessao validada.

O teste altera o preco do produto depois de adiciona-lo ao carrinho.
O SELECT faz JOIN entre Pedido, ItemPedido, Pagamento e IntencaoNotificacao.
As assercoes conferem estes resultados reais:

| Item | Quantidade | Preco unitario | Subtotal |
|---|---:|---:|---:|
| Vaso atualizado | 2 | 13.37 | 26.74 |
| Vaso sintetico WEB09 | 3 | 0.10 | 0.30 |

Pedido: confirmado, total 27.04, numero no formato ORG-AAAA-NNNNNN.
Pagamento: pix_simulado, aprovado, valor 27.04, exatamente um registro.
Intencao: pendente, exatamente uma por pedido.
Estoque do vaso: 18. Quantidade vendida: 2.
Carrinho do comprador: zero itens. Carrinho alheio: preservado.

O caso de estoque insuficiente recebe 409 com produtoId e nome.
Confere zero pedidos, itens, pagamentos e intencoes.
Compara todos os itens do carrinho antes e depois.
Confere que o estoque do outro produto permanece intacto.

Tres rodadas entre compradores distintos confirmam 201 e 409.
Cada rodada deixa um pedido, um pagamento e estoque zero.
O carrinho vencedor fica vazio; o perdedor permanece intacto.
Dez chamadas sequenciais geram dez numeros consecutivos distintos.
O teste tambem consulta pg_sequences para comprovar a sequence real.
Falhas sinteticas por trigger no pagamento e na outbox testam rollback.
O caso da outbox falha depois da limpeza do carrinho.
Triggers existem somente no schema isolado descartado ao encerrar.

## Evidencia frontend

Teste: `frontend/tests/components/checkout-http.test.tsx`.
Renderiza a pagina real com container, stores e adapters HTTP reais.
Somente o transporte fetch recebe respostas sinteticas controladas.
Confere POST /api/pedidos com produtoId e quantidade somente.
Mostra ORG-2026-000123 na confirmacao.
Nao faz DELETE posterior, pois a limpeza pertence a transacao backend.
409 nomeia Vaso atualizado e preserva carrinho para nova tentativa.
Falha na leitura do carrinho exibe erro recuperavel, sem falso vazio.
O teste DOM foi complementado pela coleta visual real abaixo.

## Evidencia visual no mesmo formato de WEB-07 e WEB-08

Pasta: `fluxo-real-2026-10-14T15-38-55-750Z/`.
Coleta concluida em 14/10/2026, com Next.js, Express e PostgreSQL reais.
Dados sinteticos ficaram em schema temporario isolado.
Schema, navegador e servidores foram encerrados ao terminar.

- `fluxo-web09.gif`: oito capturas reais, 1280x900, ciclo de 20 segundos.
- `01-carrinho-servidor.png`: itens persistidos e chamadas HTTP reais.
- `02-revisao-checkout.png`: tela de revisao antes da confirmacao.
- `03-confirmacao-numero-real.png`: numero retornado pelo backend.
- `04-select-pedido-itens-pagamento.png`: dois itens, valores e pagamento.
- `05-carrinho-vazio-apos-sucesso.png`: limpeza confirmada na tela e banco.
- `06-409-item-em-falta.png`: erro 409 nomeando o produto.
- `07-rollback-carrinho-preservado.png`: contagens e itens preservados.
- `08-dez-numeros-sequenciais.png`: dez sucessos conferidos no PostgreSQL.
- `checkout-360.png`, `checkout-768.png`, `checkout-1280.png`.
- `page@f1e9aff695a7402897b049f2dd31e889.webm`: video real do Playwright.
- `resultado.json`: respostas HTTP, SELECT, rollback e responsividade.
- `select-pedido-itens-pagamento.json`: resultado real do JOIN.
- `select-rollback-carrinho.json`: contagens e itens antes/depois.
- `numeros-sequenciais.json`: numeros HTTP e linhas conferidas no banco.

O pedido visual confirmou ORG-2026-000001, total 27.04.
Preco do vaso mudou de 12.35 para 13.37 depois da adicao.
O backend usou 13.37, independente do preco antigo no carrinho.
O pagamento pix_simulado ficou aprovado com valor 27.04.
O carrinho ficou vazio apos sucesso e intacto apos 409.
O conflito nao criou pedido, itens, pagamento ou intencao adicionais.
As chamadas seguintes geraram ORG-2026-000002 ate ORG-2026-000011.
Nao houve overflow em 360, 768 ou 1280px.

O painel HTTP exibe respostas reais capturadas pela automacao.
O painel PostgreSQL exibe dados consultados no banco real.
Esses paineis existem somente na coleta, sem alterar o produto.
Nao representam DevTools nativo.
O GIF combina PNGs originais do navegador usando Pillow.
Nao inclui telas fabricadas, mocks de banco ou credenciais.

Reproducao: executar `node --import tsx` no diretorio backend,
passando `../evidencias/PI4-27-W10-Integracao-Camadas/WEB-09-checkout/validar-fluxo-real.mjs`.
O script gera pasta nova por execucao, preservando coletas anteriores.
`gerar-gif.py` recebe a pasta concluida e gera seu GIF.

A primeira coleta parou ao transportar Decimal para o painel visual.
O coletor passou a serializar esse resultado sem alterar a aplicacao.
A coleta final concluiu todos os passos e suas assercoes.

## Revisao equivalente de seguranca

O usuario escolheu revisao nesta conversa, sem delegacao.
Foram revisados rota, middleware, validator, repository e adapter HTTP.
Autenticacao e papel comprador precedem criacao do pedido.
Identidade, preco, nome, total e numero nao sao controlados pelo body.
Schemas estritos rejeitam campos extras e quantidades invalidas.
Consultas de producao usam parametros, sem interpolacao de SQL externo.
Locks do comprador precedem produtos ordenados e incluem preco atual.
Produtos ocultos e artesaos indisponiveis sao recusados.
Pagamento e outbox falhos revertem estoque, vendas e carrinho.
O frontend valida resposta e descarta campos adicionais.
Erro inesperado recebe resposta generica, sem stack ou credenciais.
Nao foram encontrados achados restantes no escopo revisado.

## Migration e compatibilidade

Migration: `20261014160000_checkout_web09`.
Passou primeiro em schema isolado.
A revisao automatica bloqueou inicialmente alteracao do banco configurado.
O usuario autorizou aplicar no DIRECT_URL; a migration foi aplicada.
Nenhuma credencial foi registrada nesta evidencia.

db:explain carregava somente migrations anteriores aos indices BD-04.
O Prisma atual passou a exigir quantidadeVendida no schema comparativo.
Agora carrega as demais migrations e adia somente a migration dos indices.
O teste db:explain voltou a passar, preservando comparacao antes/depois.

Uma execucao completa mostrou falha intermitente de retry da fila.
O teste passou na reexecucao isolada, sem mudar codigo da fila.
O script de concorrencia WEB-10 permaneceu sem alteracao.

## Validacao final

| Verificacao | Resultado |
|---|---|
| npm test backend | 394 testes, 41 arquivos, todos passaram |
| npm test frontend | 792 testes, 83 arquivos, todos passaram |
| npm run lint nos dois projetos | Passou |
| npm run typecheck nos dois projetos | Passou |
| Prisma generate e validate | Passaram |
| Prettier nos arquivos alterados | Passou com end-of-line auto |
| Diff com verificacao de espacos e reconhecimento CRLF | Passou |
| Revisao equivalente de seguranca | Sem achados restantes |

A ultima suite completa backend passou, incluindo o retry da fila.
Os avisos preexistentes de SSL do pg e act do React permanecem.
