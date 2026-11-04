# 30.5: revisão equivalente de segurança

Responsável e revisor indicado: Pedro. Data: 25/10/2026.
Revisão local pelo Codex, conforme autorização nesta conversa.
Não representa revisão independente executada por Pedro.
Não houve delegação ao agente security-auditor.

## Verificações

- `production` recusa a simulação explícita, inclusive valor zero.
- Fora de produção, a latência aceita somente inteiros entre 0 e 2000.
- O comportamento padrão mantém latência zero.
- A API não aceita latência controlada pelo comprador.
- O handler apenas aguarda antes da gravação existente.
- Os repositories e suas atualizações condicionais permanecem intactos.
- Reentregas preservam IDs, leitura e timestamps, conforme teste real.
- A configuração do benchmark fixa concorrência interna igual a um.
- A execução principal exige `DATABASE_URL_VOLUME` separada.
- A comparação também impede coincidência por alias pooler.
- IDs, números e compradores são conferidos contra o seed sintético.
- A limpeza de notificações filtra somente os mil pedidos selecionados.
- As atualizações de intenções ficam nesse mesmo conjunto de pedidos.
- A preparação usa transação e confere pedidos antes de limpar avisos.
- SQL parametriza valores externos.
- Identificadores interpolados têm allowlist de schema gerado internamente.
- Um lock impede duas execuções concorrentes do benchmark na base.
- Os workers usam processos reais com IPC, sem shell intermediário.
- A prontidão é confirmada antes do início da medição.
- O encerramento usa o método `stop` real do worker.
- A perda do processo pai solicita encerramento dos consumidores.
- O schema removido é exclusivo da execução atual.
- A ausência do schema é consultada independentemente ao final.
- O resultado registra IDs sintéticos e métricas, sem URLs secretas.
- As bordas suprimem detalhes de erros de conexão.
- Diretórios existentes de resultados são recusados.
- A latência simulada fica explícita no CSV, terminal e gráfico.
- Aquecimentos aparecem nos dados, excluídos somente da análise.

## Evidência automatizada

Os testes usam PostgreSQL real, sem mocks de banco/repositories.
O cenário de processos executa W=1 e W=2 em schema isolado.
Verifica reinicialização, oito avisos para quatro pedidos multiartesão.
Uma intenção e uma notificação externas permanecem iguais.
Há contraprova com pedido ausente, antes de qualquer limpeza.
As guardas recusam banco padrão, deploy e alias pooler coincidentes.
Os cálculos são conferidos contra medianas e speedups conhecidos.
Uma segunda execução real foi recusada pelo advisory lock.
A recusa ocorreu antes da preparação dos dados.
O registro está em `contraprova-lock-real.log`.

Nenhum achado bloqueante no código inspecionado até esta revisão.
Os resultados finais do benchmark são registrados separadamente.
