# 30.3: worker da fila como processo separado

Data: 22/10/2026.
Branch: `codex/30-3-worker-separado`.
Responsavel: Luiza. Revisor: Pedro.
Nenhum commit ou push foi realizado.

## Entrega

- Bootstrap extraido para `backend/src/queues/bootstrap.ts`.
- API inicia publicador e respeita RUN_WORKER_IN_API.
- O padrao true preserva o modo integrado.
- Worker independente inicia somente pg-boss e consumidor.
- SIGINT e SIGTERM encerram o worker graciosamente.
- Sinais repetidos compartilham a mesma operacao de encerramento.
- WORKER_CONCURRENCY aceita inteiros entre 1 e 8.
- O padrao 1 permanece reservado para 30.5.
- Scripts API e worker existem para desenvolvimento e execucao compilada.
- `start` e `start:prod` preservam seus comandos anteriores.
- README, exemplo de ambiente e CONCURRENCY.md foram atualizados.
- A declaracao de IA identifica Luiza e Pedro.

## Validacao final

| Verificacao | Resultado |
| --- | --- |
| Backend completo | 573 testes passaram em 56 arquivos |
| Frontend completo | 842 testes passaram em 89 arquivos |
| Integracoes finais da fila | 12 testes passaram em 4 arquivos |
| Backend lint e typecheck | Aprovados |
| Frontend lint e typecheck | Aprovados |
| Build backend | Aprovado, sem aplicar migrations no banco publico |
| Prettier dos arquivos de codigo alterados | Aprovado |
| Diff, reconhecendo CRLF | Aprovado |
| Revisao equivalente de seguranca | Nenhum achado bloqueante |

Comando backend, dentro de backend:

```powershell
npm.cmd test -- --testTimeout=60000 --hookTimeout=120000
```

Comandos frontend, dentro de frontend:

```powershell
npm.cmd run lint
npm.cmd run typecheck
npm.cmd test
```

## Aceites observados

Sem consumidor na API, os pedidos permanecem sem processamento.
As intencoes chegam a publicada com zero tentativas.
Iniciar outro processo worker conclui o processamento.
Dois PIDs worker consumiram seis pedidos distintos.
Cada intencao registrou uma tentativa e uma notificacao unica.
Um lock real bloqueou a gravacao da notificacao.
O worker recebeu SIGINT seguido de SIGTERM.
Permaneceu ativo ate liberar o lock e concluir.
Os testes usam PostgreSQL e repositories reais, sem mocks.

No Windows, IPC encaminha sinais aos handlers reais.
Em Unix, os testes enviam sinais nativos.

## Historico e limites

Os testes de ambiente falharam antes da implementacao.
O bootstrap anterior ignorava RUN_WORKER_IN_API=false.
Consumidores externos exigiram isolamento dos dados e filas.
A primeira suite ampla encontrou uma corrida de limpeza.
Notificacao foi recriada durante a exclusao do pedido sintetico.
O teste legado passou a isolar dados e fila.
Tambem encerra consumidores antes de remover suas fixtures.
A suite completa final passou depois dessa correcao.
O log anterior foi preservado em `07-suite-backend.txt`.

Avisos existentes de pg e React apareceram nas suites.
Nenhum aviso foi tratado como teste reprovado.
O painel Render nao foi consultado ou alterado.
Nao houve captura de terminais nativos nem deploy remoto.
CONCURRENCY.md e evidencias permanecem ignorados pelo Git existente.

## Arquivos de prova

- `09-correlacao-pedidos-final.txt`: IDs, PIDs e unicidade observados.
- `10-regressao-final.txt`: regressao das quatro integracoes de fila.
- `11-suite-backend-final.txt`: suite backend completa, verde.
- `08-revisao-seguranca.md`: revisao local autorizada.
- `04-decisao-render.md`: decisao aplicada e limites da verificacao.
