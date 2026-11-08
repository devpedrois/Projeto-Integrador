# 35.8: custo do salto HTTP

Medição realizada em 07/11/2026, na máquina local.
Escopo: somente a subtarefa 35.8, conforme rubrica FCCPD.
O critério 3 exige interpretar onde não houve ganho.

## Resultado para o relatório do commit 19

[Tabela pronta](execucao-02/tabela.md), [CSV bruto](execucao-02/bruto.csv)
e [ambiente completo](execucao-02/resultado.json).

| Configuração           | Medições válidas |  p50 ms |   p95 ms | Máximo ms |
| ---------------------- | ---------------: | ------: | -------: | --------: |
| A: in-process          |               30 | 171,942 |  499,963 |   784,693 |
| B: API + microsserviço |               30 | 223,078 |  787,686 | 1.012,345 |
| Diferença B − A        |                — | +51,136 | +287,723 |  +227,652 |

O salto HTTP adiciona latência de rede e serialização.
O ganho da separação está no isolamento de falha.
Também permite deploy independente e escala do lote.
Nesta coleta, a distribuição aumentou a latência individual.

A diferença compara duas implementações completas em versões diferentes.
Ela inclui Prisma versus views SQL e observabilidade.
Não estima exclusivamente o custo do transporte HTTP.
A variabilidade do Neon também influencia os tempos observados.
Não houve medição de escalabilidade ou disponibilidade nesta subtarefa.

## Versões inspecionadas antes da implementação

- Commit 04, correspondente à 35.2: `8e17cab`.
- A, pai imediato: `df92c704a3cd3bcb6800b103d4ddcafb596e2b09`.
- B, HEAD inspecionado: `1fd856b2acdef56598ca8eb31e54811d1a67a09d`.
- Branch da implementação: `codex/35-8-custo-salto-http`.
- Referência metodológica: `backend/scripts/busca-p95.ts`.

A usa o código histórico, sem alterações versionadas.
Seu cliente Prisma foi gerado pelo schema histórico.
As dependências instaladas têm o mesmo lockfile do backend.
B usa os fontes atuais da API e microsserviço.

## Método

API A, API B e microsserviço usam processos separados.
A executa primeiro; B executa depois, na mesma máquina.
O microsserviço já está disponível durante o aquecimento B.
Cada configuração recebe cinco aquecimentos e trinta medições sequenciais.
São dez produtos visíveis, ordenados por UUID, repetidos triplicadamente.
Os cinco aquecimentos usam os primeiros cinco produtos.

O cache usa `CACHE_TTL_SECONDS=1`, mínimo permitido pela configuração.
Também há invalidação explícita antes de cada requisição.
O processo coordenador aguarda a confirmação via IPC.
Toda resposta precisa trazer `X-Cache: MISS` e `no-store`.
O microsserviço não possui cache de recomendações.
Um parâmetro aleatório seria recusado pelo validator estrito.

O tempo abrange preparo do URL, HTTP e decodificação JSON.
Invalidação, validação e persistência ficam fora da cronometragem.
O método nearest-rank usa posições 15, 29 e 30.
Nenhum outlier é removido ou substituído por nova tentativa.
Falhas encerram a execução e preservam as tentativas registradas.

Todas as conexões leem a mesma branch de volume.
Usam pool máximo um e snapshot PostgreSQL compartilhado.
Cada processo importa o snapshot em transação somente leitura.
O benchmark não cria dados, migrations, roles ou índices.
Os caches do PostgreSQL e sistema operacional permanecem ativos.
O banco é remoto; os saltos HTTP são locais.

Fixture observada: 1.000 produtos, 350 usuários e 1.500 pedidos.
Também contém 1.550 itens, sem avaliações ou fotos.
O hash de cada resposta coincide entre A e B.
Foram confirmadas 35 chamadas internas reais na configuração B.
Não houve fallback local ou resposta mista nesta coleta.

O benchmark usa o papel administrativo da fixture de volume.
As transações impedem escrita durante as medições.
O serviço mantém consultas exclusivamente às views de contrato.
O ensaio não representa uma auditoria dos papéis de produção.

`bancoInalterado` na execução 02 refere-se ao snapshot observado.
Não afirma ausência de alterações por sessões externas concorrentes.
O script atual explicita esse campo como `snapshotInalterado`.

## Reprodução

Configure `DATABASE_URL_VOLUME` no ambiente local do backend.
Ela precisa apontar para uma base separada do desenvolvimento.
As views de contrato devem existir nessa fixture.
O script recusa desenvolvimento, deploy identificado e `NODE_ENV=production`.
Não execute seed ou migrations durante a coleta.

Prepare um worktree destacado no pai do commit 04:

```powershell
git worktree add --detach <worktree-a> df92c704a3cd3bcb6800b103d4ddcafb596e2b09
```

Instale suas dependências usando o lockfile histórico do backend.
Gere o cliente Prisma nesse backend antes da medição.
Uma URL sintética em `DIRECT_URL` basta para gerar.
Essa etapa não abre conexão com PostgreSQL.

Neste checkout, execute a partir de `backend/`:

```powershell
node node_modules/tsx/dist/cli.mjs scripts/custo-salto-http.ts --baseline '<worktree-a>' --output '../evidencias/PI4-35/35.8-custo-http/nova-execucao'
```

O diretório final precisa ser novo, evitando sobrescritas.
Tokens são gerados em memória e nunca persistidos.
Os workers encerram servidores, transações e conexões ao terminar.
O worktree histórico permanece disponível para reprodução.

## Tentativas e validações

- `execucao-01`: interrompida antes da primeira requisição HTTP.
- Causa: opções de startup recusadas pelo pool Neon.
- `execucao-02`: completa, 70 registros incluindo dez aquecimentos.
- Ambas permanecem disponíveis; nenhuma medição foi descartada.
- TDD inicial: oito testes falharam por implementação ausente.
- Oito testes específicos passaram após a implementação.
- Lint, typecheck e verificação de formatação passaram.
- Suíte completa: 821 testes passaram; um atingiu timeout.
- Arquivos: 79 passaram; `db-explain.integration.test.ts` registrou falha.
- Caso: `BD.4 compara candidatos reais sem persistir indices ou mudar resultados`.
- Limite explícito do caso existente: 60 segundos.
- O caso não importa o script da 35.8.
- Nenhum fonte desse teste foi alterado nesta entrega.
- Revisão equivalente de segurança autorizada nesta conversa.

Os resultados específicos aparecem em [conferência](conferencia-independente.json).
As verificações adicionais aparecem em [segurança](revisao-seguranca.md).
