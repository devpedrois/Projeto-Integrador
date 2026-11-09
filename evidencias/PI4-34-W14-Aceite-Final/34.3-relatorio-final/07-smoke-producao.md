# 34.3: publicação e smoke em produção

Coleta: 09/11/2026 15:50:49 BRT.
Commit da tag: `766d2fdf5c7ad1b775f2a034e1ce34b0ff1b0022`.
Referência: tag anotada `v1.0.0`.

## Publicação autorizada

O responsável autorizou o push nesta conversa.
O push atômico publicou `main` e `v1.0.0`.
As referências remotas apontam para o mesmo commit.
A tag permanece inalterada após a publicação.
Este registro pertence ao próximo commit documental.

## CI no commit publicado

[Workflow 42674004576](https://github.com/devpedrois/Projeto-Integrador/actions/runs/42674004576).

| Tentativa | Resultado observado                         | Evidência                                                                                                        |
| --------- | ------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| 1         | Erro interno do GitHub; nenhum job iniciado | [Metadados](pos-publicacao/ci-publicacao-tentativa-1.json), [tela](pos-publicacao/ci-publicacao-tentativa-1.png) |
| 2         | Mesmo erro interno; nenhum job iniciado     | [Metadados](pos-publicacao/ci-publicacao-tentativa-2.json), [tela](pos-publicacao/ci-publicacao-tentativa-2.png) |
| 3         | Jobs iniciados; microsserviço reprovado     | [Metadados](pos-publicacao/ci-publicacao-tentativa-3.json), [tela](pos-publicacao/ci-publicacao-tentativa-3.png) |

A terceira tentativa foi autorizada após o retorno da internet.
Nenhum código ou configuração mudou entre as tentativas.
Os erros internos estão registrados na [issue #3](https://github.com/devpedrois/Projeto-Integrador/issues/3).
Não há evidência para atribuí-los à conexão local.
Seus identificadores de correlação foram:

- Tentativa 1: `88b40563-a45e-4c28-bd56-0b7a5cd334a8`.
- Tentativa 2: `5bdbc65f-4502-4d76-b336-f8c3e8a6d542`.

| Job da tentativa 3 | Resultado nesta coleta                              |
| ------------------ | --------------------------------------------------- |
| Frontend           | Aprovado, incluindo lint, typecheck, testes e build |
| Recomendação       | Reprovado: 115 casos aprovados e um reprovado       |
| Backend            | Ainda em execução nesta coleta                      |

A falha ocorre em `services/recomendacao/tests/integration/metricas-lote.test.ts:132`.
Teste: `CLI gera JSON e diff vazio contra referencia fornecida`.
Erro observado: `Test timed out in 30000ms`.
O build do microsserviço foi pulado após essa reprovação.
A limpeza de schema e papéis efêmeros foi aprovada.
O motivo da demora não foi determinado.
A [issue #2 permanece aberta](https://github.com/devpedrois/Projeto-Integrador/issues/2).
[Log sanitizado do job](pos-publicacao/ci-publicacao-tentativa-3-recomendacao.txt).

O CI não satisfaz o aceite de execução verde.
Os testes locais verdes não substituem essa exigência.
Não foi iniciada nova tentativa após a falha de teste.
Código, configurações dos serviços e tag foram preservados.

## Commits publicados conferidos nos painéis

| Serviço             | Branch | Commit publicado                           | Estado                                           | Evidência                                               |
| ------------------- | ------ | ------------------------------------------ | ------------------------------------------------ | ------------------------------------------------------- |
| Frontend Vercel     | `main` | `766d2fdf5c7ad1b775f2a034e1ce34b0ff1b0022` | Ready, Production; deploy automático após o push | [Tela](pos-publicacao/vercel-publicado.png)             |
| API Render          | `main` | `c9d0eb20134af22bd11cf9e29f55f83c054bdfc7` | Live no commit anterior                          | [Tela](pos-publicacao/render-api-pos-push.png)          |
| Recomendação Render | `main` | `c9d0eb20134af22bd11cf9e29f55f83c054bdfc7` | Live no commit anterior                          | [Tela](pos-publicacao/render-recomendacao-pos-push.png) |

[Dados da inspeção posterior ao push](pos-publicacao/paineis-pos-push.json).
A Vercel publicou automaticamente pela integração Git existente.
Nenhum deploy manual foi iniciado nos serviços Render.
A convergência dos três commits permanece pendente.
O aquecimento posterior aos deploys também permanece pendente.

## Smoke e limitação autorizada do navegador

O responsável solicitou o navegador interno desta conversa.
Esse navegador não oferece janela anônima nem aba Network.
O responsável autorizou telas e console, registrando essas limitações.
Essa autorização não substitui CI verde nem commits convergentes.
O smoke não foi iniciado, devido ao bloqueio anterior.
Nenhuma conta de teste foi autenticada em produção.
Nenhum pedido foi criado nesta execução.

| Passo                              | Resultado                        | Data         |
| ---------------------------------- | -------------------------------- | ------------ |
| Vitrine                            | Não executado; bloqueado pelo CI | Sem execução |
| Busca com filtros                  | Não executado; bloqueado pelo CI | Sem execução |
| Produto e carrossel                | Não executado; bloqueado pelo CI | Sem execução |
| Perfil do artesão                  | Não executado; bloqueado pelo CI | Sem execução |
| Carrinho                           | Não executado; bloqueado pelo CI | Sem execução |
| Checkout                           | Não executado; bloqueado pelo CI | Sem execução |
| Meus pedidos                       | Não executado; bloqueado pelo CI | Sem execução |
| Painel do artesão: pedido recebido | Não executado; bloqueado pelo CI | Sem execução |
| Painel do artesão: notificação     | Não executado; bloqueado pelo CI | Sem execução |
| Painel admin: indicadores          | Não executado; bloqueado pelo CI | Sem execução |
| `/api/docs`                        | Não executado; bloqueado pelo CI | Sem execução |

Número do pedido: não criado.
Aceite de produção: pendente.
A data acima registra a coleta, sem presumir smoke executado.
