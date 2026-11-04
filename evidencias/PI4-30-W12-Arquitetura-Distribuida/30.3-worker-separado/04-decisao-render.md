# Decisao 3: preservacao do deploy

Fonte: `docs/PROMPTS_EXECUCAO_SPRINT12-13.md`, decisao 3.
`RUN_WORKER_IN_API` permanece `true` por padrao.
`start` e `start:prod` preservam os comandos anteriores.
Nenhuma configuracao remota foi alterada nesta tarefa.
O painel Render nao foi consultado nesta execucao.
Nenhuma disponibilidade atual de plano foi verificada.

A separacao foi comprovada localmente com PostgreSQL real.
API e workers compartilharam schemas isolados de teste.
Cada processo worker recebeu seu proprio cliente pg-boss e Prisma.
Dois workers consumiram seis pedidos sem notificacoes duplicadas.
Um worker encerrou somente depois do job ativo concluir.

No Windows, o teste encaminha sinais por IPC.
O filho emite SIGINT e SIGTERM nos handlers reais.
Em sistemas Unix, o teste envia sinais nativos.
Isso evita confundir encerramento forcado com graceful stop.

Nao houve captura de terminais nativos nem deploy remoto.
Os logs representam testes automatizados locais, sem screenshots simulados.
