# 30.5: benchmark B1 da fila

Responsável e revisor indicado: Pedro. Data: 25/10/2026.
Branch de código: `codex/30-5-benchmark-fila`.

## Estado da execução

O código passou em 705 testes backend, lint e typecheck.
O benchmark foi encerrado a pedido do usuário.
Não restaram processos Node desse benchmark em execução.
O schema temporário da fila foi removido e conferido.
O resultado atual fica em `execucao-2026-10-25T19-34-45.068Z/`.
Consulte `estado` e `rodadas` em `resultado.json`.
A tabela final e o PNG não foram gerados.
O processo usa o polling existente, com um segundo.
Isso exige aproximadamente três horas para as dezoito execuções.
Os arquivos preservam duas medições válidas e um aquecimento.
Uma terceira medição foi interrompida e não foi contabilizada.
Nenhum resultado parcial comprova as quinze medições exigidas.

O primeiro aquecimento concluiu mil jobs e 1.050 avisos.
Houve zero duplicatas, com uma tentativa por intenção.
Durou 1.004,654 segundos e foi excluído da análise.
A primeira medição válida durou 1.008,631 segundos.
Também passou nas verificações de unicidade e tentativas.
A segunda medição válida durou 1.005,532 segundos.
Também apresentou zero duplicatas e uma tentativa por intenção.
`interrupcao.json` registra o estado parcial no encerramento.
`limpeza.json` confirma a ausência do schema temporário.
Os dados da aplicação não foram apagados no encerramento.

## Reprodução

Instale as dependências Node do backend normalmente.
O gráfico requer Python e o pacote Matplotlib.
Preparação desse pacote, uma única vez:

```powershell
python -m pip install -r backend/scripts/requirements-bench-fila.txt
```

Configure `DATABASE_URL_VOLUME` no ambiente local do backend.
Ela deve identificar a branch Neon sintética separada.
Os bancos padrão e deploy não podem coincidir com volume.
O script também compara o alias pooler da mesma branch.
`NODE_ENV=production` é recusado antes de conectar.
`BENCH_FILA_PYTHON` permite selecionar outro executável Python.

Um comando executa dados, workers, medições, verificações e gráfico:

```powershell
npm --prefix backend run bench:fila
```

O destino padrão usa uma pasta nova por execução.
Para selecionar outra pasta nova, dentro de backend:

```powershell
npm.cmd run bench:fila -- --saida ../evidencias/PI4-30/benchmark-fila/minha-execucao
```

Não sobrescreve diretórios de resultados existentes.
No PowerShell desta máquina, `npm.cmd` preserva argumentos adicionais.
Resultados parciais ficam identificados no JSON.
Nenhuma rodada lenta é descartada das medições.

## Protocolo

- Reutiliza mil pedidos determinísticos do seed de volume.
- Limpa avisos somente desses pedidos antes de cada rodada.
- Reinicia suas intenções como pendentes, com zero tentativas.
- Usa W igual a um, dois e quatro processos reais.
- Cada processo reutiliza `startWorker`, da subtarefa 30.3.
- A infraestrutura injeta somente o schema temporário da fila.
- Todos recebem `WORKER_CONCURRENCY=1` e latência de 200 ms.
- O polling existente permanece em um segundo.
- A latência simula um canal externo, sem envios reais.
- Há um aquecimento completo, descartado e registrado, por W.
- Há cinco medições válidas por W, totalizando quinze.
- As dezoito execuções ocorrem sequencialmente.

Um advisory lock impede benchmarks simultâneos na mesma base.
A conexão de controle usa o endpoint direto dessa branch.
Workers preservam a URL de volume originalmente configurada.
O schema da fila pertence exclusivamente à execução atual.
Filas anteriores ou da aplicação não recebem limpeza.
Não há mudanças em repositories ou regras de idempotência.

O relógio monotônico começa imediatamente antes do primeiro publish.
Inclui a publicação e termina ao observar a última intenção processada.
A inicialização dos workers fica fora do intervalo medido.
A observação ocorre em intervalos de 250 ms, acrescidos da consulta.
O tempo de publicação também aparece separadamente no JSON/CSV.
Cada rodada tem os PIDs distintos registrados.

## Métricas e integridade

Throughput equivale a mil jobs divididos pela mediana em segundos.
Speedup equivale a T1/TW; eficiência equivale a speedup/W.
As medianas excluem somente o aquecimento explicitamente marcado.
CSV e JSON preservam valores brutos, sem arredondamento analítico.
O terminal arredonda somente a apresentação da tabela.
O PNG calcula novamente as medianas lendo exclusivamente o CSV.

Cada rodada verifica:

- Todas as intenções selecionadas estão processadas.
- Cada intenção apresenta exatamente uma tentativa.
- O conjunto de avisos coincide com os artesãos esperados.
- Não há chave duplicada em usuário, pedido e tipo.
- Todos os jobs pg-boss estão concluídos, sem retries ou falhas.

Pedidos multiartesão podem gerar mais avisos que jobs.
O JSON preserva as tentativas individuais e timestamps finais.
Também contém a mediana da duração de execução dos jobs.
Registra a mediana do intervalo entre seus inícios.
Amostras após a publicação registram conexões e esperas por locks.
Essas amostras identificam backends por `application_name`.
Elas não equivalem a uma medição do pool interno do PgBouncer.

## Arquivos

Cada `execucao-<data>/` contém:

- `rodadas.csv`: dezoito amostras e declaração da simulação.
- `resultado.json`: protocolo, rodadas, integridade, ambiente e resumo.
- `throughput.png`: gráfico derivado diretamente do CSV.
- `limpeza.json`: ausência conferida do schema temporário da fila.

`execucao.log` registra a execução desta conversa.
Os arquivos `*-red.log` registram falhas TDD esperadas.
`latencia-green.log` verifica atraso e idempotência com PostgreSQL real.
`metricas-green.log` verifica guardas e cálculos determinísticos.
`direcionados.log` contém 83 testes direcionados aprovados.
`backend-testes.log` registra a suíte completa backend.
Foram aprovados 705 testes em 66 arquivos.
`lint.log` e `typecheck.log` registram as verificações correspondentes.
`formatacao.log` registra a conferência Prettier dos arquivos alterados.
`contraprova-lock-real.log` comprova a recusa de outro benchmark.
`contraprova-lock.log` preserva a tentativa inicial com argumentos incorretamente repassados pelo wrapper PowerShell.
`consulta-unicidade.sql` fornece uma consulta parametrizada de conferência.
Seu parâmetro é o array dos mil IDs de pedidos.
Esses IDs constam nas intenções registradas no JSON.

Esta pasta é ignorada pelo Git, conforme configuração existente.
O documento `CONCURRENCY.md` atualizado também permanece ignorado.
Não houve commit, push ou deploy nesta subtarefa.
