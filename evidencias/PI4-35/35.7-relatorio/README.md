# 35.7: relatório distribuído e de desempenho

Base inspecionada: `f3b199e`, após a medição HTTP.
Branch de trabalho: `codex/35-7-relatorio-distribuido`.
Esta entrega altera documentação, diagrama e regra de versionamento.
Não executa deploy, migrations nem novas coletas de desempenho.

## Documentos entregues

- [Arquitetura distribuída](../../../docs/arquitetura-distribuida.md).
- [Fonte Mermaid](../../../docs/arquitetura-distribuida.mmd).
- [PNG renderizado](../../../docs/arquitetura-distribuida.png).
- [Relatório de desempenho](../../../docs/relatorio-desempenho-u2.md).
- [README, FCCPD — Parte 2](../../../README.md#fccpd--parte-2).

## Fontes históricas confrontadas

| Commit da sequência | Hash verificado | Evidência principal                                                                  |
| ------------------- | --------------- | ------------------------------------------------------------------------------------ |
| 01, extração        | `5771ac3`       | [serviço e permissões](../35.1/README.md)                                            |
| 04, cliente HTTP    | `8e17cab`       | [integração real](../../PI4-35-W14-Microsservico-Docker/35.2-cliente-http/README.md) |
| 06, Docker          | `280bd87`       | [Compose e isolamento](../../PI4-35-W14-Microsservico-Docker/35.3-docker/README.md)  |
| 14, lote paralelo   | `62991ad`       | [metodologia e resultados](../35.6-lote/README.md)                                   |
| 16, comunicação     | `001c6e7`       | [capturas e logs](../35.5-comunicacao/README.md)                                     |
| 18, custo HTTP      | `f3b199e`       | [CSV e tabela](../35.8-custo-http/README.md)                                         |

Também foram inspecionados os documentos e diagramas anteriores.
O checkout e a busca conservam suas coletas históricas.
O gráfico histórico B2 permanece preservado, sem alteração.
A rodada posterior à extração utiliza seu próprio gráfico original.

## Validação da entrega

O diagnóstico anterior está em [antes.json](antes.json).
Os hashes permitem identificar os documentos usados como entrada.
A validação final está em [validacao.json](validacao.json).

A conferência recalcula estatísticas a partir dos CSVs preservados.
Depois confronta JSON, tabelas documentais e paridade das respostas.
Ela também verifica links locais, âncoras e fontes dos gráficos.
O PNG novo foi renderizado por Mermaid CLI com Chrome local.
Todos os rótulos e setas foram conferidos visualmente.
Versão, comando, dimensões e hashes constam na validação final.

O relatório aponta cada requisito da rubrica para sua seção.
Também explicita limitações da comparação HTTP e do ambiente Neon.
Os resultados acima do ideal são discutidos como variação experimental.
Não são apresentados como eficiência superior de CPU.

## Revisão documental de segurança e precisão

A revisão foi realizada nesta conversa, sem delegação.
Foi conferida a distinção entre código e implantação observada.
O Compose demonstra API, recomendação e worker em containers.
A captura remota anterior registra API Node e recomendação Docker.
O texto conserva essa diferença e a data da evidência.

O diagrama destaca fronteiras, contratos SQL e schema privado.
O fallback depende da disponibilidade do banco compartilhado.
As views de contrato preservam a semântica original de vendas.
Seu acesso não é descrito como isolamento físico dos bancos.
Os exemplos não contêm URLs privadas, cookies ou tokens reais.
Não houve alteração de código, permissões ou ambientes operacionais.

Esta validação documental não reexecuta os testes históricos citados.
Nenhum commit ou push foi realizado nesta entrega.
