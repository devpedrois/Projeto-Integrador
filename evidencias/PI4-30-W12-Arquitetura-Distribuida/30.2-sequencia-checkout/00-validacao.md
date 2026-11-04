# 30.2: validação documental

Data: 26/10/2026. Responsável: Sergio. Revisor indicado: Pedro.
Branch: `codex/30-2-sequencia-checkout`. Base consultada: `8e78cdc`.

## Rastreabilidade e fidelidade

Lidos integralmente o AGENTS.md local e o módulo CONCURRENCY.md.
Consultados 30.2 e os parágrafos históricos §1.1 e §1.2.
O guia conceitual não existe mais, conforme confirmação recebida.
O arquivo não foi recriado nem substituído por conteúdo presumido.

Inspecionados repository do pedido, proxy, adapter, bordas HTTP e fila.
O diagrama usa códigos vinculados a arquivos e funções reais.
O mapa distingue os métodos homônimos `criar` por classe.
A sequência preserva a ordem observada no callback transacional.
`Pedido` precede a baixa; limpeza precede `IntencaoNotificacao`.
O comprador recebe lock antes dos produtos ordenados por ID.
409 significa estoque insuficiente, seguido por rollback integral.
404 por indisponibilidade é explicado separadamente no documento.

Publicação depende do commit, mas não da resposta HTTP.
A atualização `publicada` pode ocorrer depois do processamento.
Sua condição não regride uma intenção já `processada`.
Falhas e reentregas não significam execução única do handler.
O texto distingue retry de recuperação após expiração do job.
Também registra a ausência de recuperação automática após esgotamento.

## Evidência histórica reaproveitada

Commit 10 do roteiro corresponde à 30.1, commit `1dfce1b`.
Conferidos JSON, log SQL e consulta independente de 22/10/2026.
Cada rodada registra 50 compradores, um 201 e 49 conflitos.
Estoque final zero, um pedido, um pagamento, zero respostas inesperadas.
São três rodadas, com `exitCode=0` e limpeza registrada.
Os resultados não representam uma nova execução nesta subtarefa.
Também não comprovam proxy, consumo ou recuperação do worker.

## Exportação e A4

Mermaid CLI instalado e verificado: `11.17.0`.
Exportação realizada com `mmdc --scale 3 --width 1800`.
Chrome forneceu a renderização; não houve instalação de dependências.
A fonte `.mmd` corresponde ao bloco Mermaid do documento.

PNG final: **3945 × 5340 pixels**.
Conferência: A4 retrato, margens de 5 mm, proporção preservada.
Fonte efetiva do diagrama: aproximadamente **7,76 pontos**.
Resolução efetiva: aproximadamente **501 dpi**.
`conferencia-a4.pdf` tem uma página para o diagrama.
A justificativa ocupa mais duas páginas, em fonte 11 pontos.
O limite de duas páginas aplica-se à justificativa técnica.

Poppler renderizou as três páginas em PNG a 150 dpi.
As três prévias foram inspecionadas visualmente nesta conversa.
Sem cortes, sobreposições ou caracteres ilegíveis observados nas prévias.
Isso verifica renderização digital; não representa impressão física realizada.
Poppler emitiu avisos sobre fontes ausentes no ambiente.
As páginas foram geradas e sua aparência foi conferida.

## Revisão e limites

Revisão documental local, sem delegação ao agente security-auditor.
Esta entrega não implementa feature nem altera código executável.
Conferidos fontes, transações, identidade, SQL, rollback e idempotência.
Nenhum segredo foi copiado para documentos ou diagramas.
Pedro permanece como revisor humano indicado, sem aprovação presumida.

Prettier dos documentos e verificação de espaços passaram.
Verificações estruturais conferem links, funções e números históricos.
As exceções no `.gitignore` abrangem somente os três artefatos pedidos.
Nenhum teste de aplicação, acesso ao banco ou benchmark foi executado.
Nenhum commit, push ou deploy foi realizado.

## Arquivos

- `01-concorrencia-checkout-u2.md`: cópia do documento final.
- `02-commit.txt`: identificação da branch e commits consultados.
- `sequencia-checkout.png`: cópia do PNG final.
- `sequencia-checkout.svg`: intermediário para conferência das dimensões.
- `conferencia-a4.pdf`: prova de paginação e impressão digital.
- `03-previa-a4-1.png`: diagrama em A4.
- `03-previa-a4-2.png` e `03-previa-a4-3.png`: justificativa.
- `04-verificacoes.json`: medidas e verificações estruturais.
- `05-integridade.json`: hashes dos artefatos finais.
