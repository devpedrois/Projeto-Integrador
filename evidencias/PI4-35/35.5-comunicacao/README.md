# 35.5: comunicação real entre serviços

Captura realizada em 07/11/2026, às 17h33, horário brasileiro.
Ambiente isolado: Docker Compose `origem-35-5` e dados sintéticos.
API, PostgreSQL, recomendação e worker estavam saudáveis.
O frontend local consumiu a API desses containers.
O pagamento permaneceu simulado.

## REST: vitrine, API e microsserviço

A navegação abriu o produto pela vitrine real.
O carrossel exibiu oito recomendações, com `X-Cache: MISS`.
API e microsserviço responderam 200, compartilhando o identificador:

`b2bea06a-1350-43e2-9b3b-cc080f59b6a6`

O seed acionou a estratégia existente `misto`.
A API complementou os candidatos retornados pelo microsserviço.
O log interno confirma a chamada REST concluída.

- [Interface do produto](01-vitrine-rest.png).
- [Logs reais lado a lado](03-logs-rest.png).
- [Log completo da API](logs-api.txt).
- [Log completo do microsserviço](logs-recomendacao.txt).

## Mensageria: checkout, intenção, fila e worker

O checkout criou o pedido com HTTP 201:

`a9761b3e-d00f-4823-855c-477cf7567f5b`

O worker ficou temporariamente parado durante a publicação.
Nesse momento, havia intenção publicada, job criado e nenhuma notificação.
Após reiniciá-lo, a intenção mudou para `processada`.
O job mudou para `completed`, criando exatamente uma notificação.
O worker registrou `tentativa: 1` e `resultado: sucesso`.
Consultas parametrizadas comprovaram os estados antes e depois.
Os prints distinguem logs de consultas ao banco.

- [Pedido confirmado pela interface](02-checkout-confirmado.png).
- [Logs e estados lado a lado](04-logs-mensageria.png).
- [Log completo do worker](logs-worker.txt).
- [Identificadores e estados capturados](fluxos.json).

## Testes e revisão de segurança

O ciclo TDD falhou antes da implementação correspondente.
Faltavam header, correlação HTTP e registros estruturados do worker.
Os testes utilizam PostgreSQL real, sem mocks de repositories.
Cobrem UUID ausente, inválido e válido, além de concorrência.
Cobrem logs de erros e repetição real do job.
As saídas consolidadas estão em [validacoes.txt](validacoes.txt).
Backend completo: 814 testes aprovados em 79 arquivos.
Microsserviço completo: 116 testes aprovados em 12 arquivos.
Lint, typecheck e formatação passaram nos dois projetos.

A revisão equivalente ocorreu neste chat, por escolha expressa.
Foi conferido o diff completo desta subtarefa.
UUIDs passam por validação antes de entrar nos logs.
Rotas usam padrões registrados, evitando identificadores e caminhos sensíveis.
O cliente interno não encaminha cookies nem JWTs.
O worker registra resultados sem mensagens internas de exceção.
A varredura dos logs não encontrou e-mails nem credenciais.
Também não encontrou cookies, queries completas ou tokens.
Os segredos locais do Compose ficaram ausentes dos registros.
Entradas com e-mail e JSON inválido receberam logs seguros.
UUIDs duplicados também foram substituídos por outro identificador.
Resultados: [revisão equivalente](revisao-seguranca.json).
Saídas operacionais privadas ficam em `.audit-private/`, ignorada pelo Git.

## Reprodução

Execute na raiz, usando os valores sintéticos locais:

```powershell
docker compose -p origem-35-5 --env-file .env.compose.example up --build --detach --wait --wait-timeout 240
```

Inicie o frontend em outro terminal:

```powershell
Set-Location frontend
$env:BACKEND_URL = 'http://127.0.0.1:3001'
$env:NEXT_PUBLIC_DATA_SOURCE = 'http'
node node_modules/next/dist/bin/next dev --hostname 127.0.0.1 --port 3119
```

Na raiz, capture os dois fluxos novamente:

```powershell
node backend/tests/docker/communication.evidence.mjs
```

O capturador utiliza Playwright instalado no frontend e Chrome local.
Ele cria um pedido sintético a cada execução.
Os prints reorganizam registros reais, sem alterar seus valores.
Os HTMLs intermediários são gerados e ignorados pelo Git.
