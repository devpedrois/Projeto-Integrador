# IA-04: coleta e validação

Data: 14/10/2026, America/Sao_Paulo.
Branch: codex/ia04-metricas-recomendacao.
Sem commit ou push.

Comando validado no PowerShell, dentro de backend:

```powershell
npm.cmd run metricas:recomendacao -- --isolado
```

Pedro autorizou criar e descartar schemas temporários na conexão de testes.
Foram usados os seeds BD-05 versionados, sem alterar dados públicos.
A primeira tentativa de teste expôs perda de search_path.
A preparação foi separada do snapshot de medição.
O modo isolado agora cria, popula, mede em leitura e descarta schemas próprios.
As conexões existentes são medidas sem executar migrations ou seeds.

JSON final: backend/metricas/recomendacao-volume.json.
Tabela, data, tamanho das cargas e análise estão em RECOMMENDATION.md.
Demo: 30 produtos, dois compradores e três pedidos confirmados.
Volume: 1000 produtos, 300 compradores e 1500 pedidos confirmados.

HTTP real avaliou todos os contextos em ordem de UUID.
Cada fase possui 30 e dois tempos na demo.
Na carga de volume, cada fase possui 1000 e 300 tempos.
Categoria apresentou MISS frio e HIT quente.
Histórico apresentou BYPASS frio e quente.
Não foi criado cache pessoal para alterar o resultado.
Os tempos incluem recebimento completo e interpretação do JSON.
A suíte backend executava em paralelo nessa coleta.
O p95 demo do histórico possui apenas duas amostras.

Testes foram escritos antes da implementação.
RED inicial: módulos das novas métricas e benchmark ausentes.
GREEN IA-04: 15 testes em dois arquivos.
GREEN backend completo: 532 testes em 52 arquivos.
Comando completo: node node_modules/vitest/vitest.mjs run --testTimeout=15000.
Lint e typecheck passaram.
Formatação e diff consideram as terminações CRLF existentes.
Os testes de integração usam PostgreSQL e HTTP reais.
Não foram usados mocks de repository ou banco.
Também foi validado o modo de leitura de schemas existentes.

Revisão local equivalente registrada em revisao-seguranca.md.
O JSON não contém senhas, cookies, identidades ou conexão PostgreSQL.
Servidores e schemas temporários foram encerrados ao concluir.
