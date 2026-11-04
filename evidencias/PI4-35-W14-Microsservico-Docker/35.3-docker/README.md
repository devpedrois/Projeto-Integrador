# PI4-35.3: Docker Compose

Validação local em 04/11/2026, partindo de volume vazio.
Branch: `codex/35-3-docker-compose`.
Base: `f03999b94333b8bf81f26a1d57d2d427ab77ed37`.
Nenhum commit ou push foi realizado.

Atualização: [correção do alerta Docker DX](12-vscode-base-security.md).
As bases agora usam Alpine 3.24, com Node 22 oficial.

## Resultado

| Verificação | Resultado | Evidência |
| --- | --- | --- |
| Bootstrap completo, sem arquivos locais nas imagens | 6 verificações Docker passaram | [execução final](01-compose-up.txt) |
| Postgres, API, worker e recomendação | 4 serviços healthy | [estado real](02-compose-ps.txt), [imagem do estado](02-compose-ps.png) |
| Migrations e permissões | 2 preparações com exit 0 | [estado real](02-compose-ps.txt) |
| API `/health` | HTTP 200, PostgreSQL acessível | [resposta](02-health.txt) |
| Pedido sem consumidor | Publicado, zero tentativas e notificações | [teste de integração Docker](01-compose-up.txt) |
| Retorno do consumidor | Uma notificação e log exclusivo no worker | [log real](03-worker-processando.txt) |
| Recomendações | Mesmos IDs no microsserviço e na API | [teste Docker](01-compose-up.txt) |
| Vitrine, 1280px e 360px | HTTP real, oito recomendações, zero erros JS | [resultado](04-vitrine-compose.json), [desktop](04-vitrine-compose-1280.png), [mobile](04-vitrine-compose-360.png) |
| Runtime e permissões | Não root, sem compilador, testes ou tsx | [teste Docker](01-compose-up.txt) |
| Isolamento SQL | Recomendação não acessa tabelas da API | [teste Docker](01-compose-up.txt) |
| Isolamento SQL inverso | API não acessa schema privado da recomendação | [teste Docker](01-compose-up.txt) |
| Camadas sem credenciais da demonstração | Três imagens verificadas | [backend](05-docker-history-backend.txt), [migrate](05-docker-history-migrate.txt), [recomendação](05-docker-history-recomendacao.txt) |

A imagem do estado renderiza a saída CLI registrada.
As capturas da vitrine foram feitas pelo Chrome headless.
O script usa Playwright instalado no frontend.
Nenhuma resposta HTTP foi interceptada ou substituída.

## Verificações complementares

- Backend: 808 testes passaram com PostgreSQL 16 real.
- Microsserviço: 58 testes passaram com PostgreSQL 16 real.
- Frontend: 980 testes passaram, incluindo proxy HTTP local.
- Backend e microsserviço: build, lint e typecheck passaram.
- Frontend: lint e typecheck passaram.
- Prettier dos arquivos novos e alterações principais passou.
- `git diff --check` passou.

Logs completos: [backend](evidencias-backend-green.tmp.txt) e
[frontend](evidencias-frontend-tests.tmp.txt).
A suíte backend emite avisos herdados sobre `client.query` concorrente.
Esses avisos não produziram falhas.

Cinco testes pressupunham o SQLSTATE `23001` para exclusões RESTRICT.
PostgreSQL 16 retornou `23503`, mantendo a mesma restrição.
Os mesmos vinte testes passaram inicialmente no PostgreSQL 18.
As expectativas agora aceitam ambos, preservando nomes das constraints.
Nenhuma migration ou regra de domínio foi alterada.
O log anterior permanece em [comparação](evidencias-backend-full.tmp.txt).
Falhas iniciais de rede EACCES vieram do sandbox.
As verificações finais usaram acesso autorizado à rede local.

## Revisão equivalente de segurança

Revisão feita nesta conversa, conforme autorização explícita recebida.

- Contextos separados excluem `.env*`, inclusive arquivos aninhados.
- Builds não recebem URLs, senhas ou tokens administrativos.
- `docker history` não contém valores secretos da execução.
- Segredos ficam no ambiente dos containers, inspecionável localmente.
- `.env.compose` é ignorado; somente o exemplo será versionável.
- Comparação com cinco segredos locais encontrou zero ocorrências.
- A porta 3001 está limitada ao loopback.
- Postgres e recomendação não publicam portas no computador.
- Conexões administrativas ficam somente nas duas preparações.
- O runtime usa papéis SQL restritos e usuário Linux `node`.
- O bootstrap cria `pgboss`; runtime não exige CREATE no banco.
- Log do worker contém somente identificadores técnicos do job.

O audit identificou dependências herdadas, sem atualizar versões:

| Imagem | Alertas npm | Detalhes |
| --- | --- | --- |
| API e worker | 4: um crítico, dois altos, um moderado | [audit](07-audit-api.json) |
| Recomendação | 0 | [audit](07-audit-recomendacao.json) |
| Migrations, incluindo ferramentas de desenvolvimento | 23: um crítico, oito altos, quatorze moderados | [audit](07-audit-migrate.json) |

Os quatro alertas runtime são `proxy-addr`, `body-parser`, `qs` e `zod`.
Essas versões já estavam no lockfile anterior à subtarefa.
`trust proxy` não está habilitado na API.
O parser JSON existente limita o corpo a 16kb.
Essas observações não substituem correções das dependências.
Atualizar bibliotecas não integra o escopo da 35.3.
Não há diff em manifests ou lockfiles de dependências.

## Inspecionar o ambiente mantido ativo

```powershell
$env:COMPOSE_ENV_FILES = ".env.compose.example"
docker compose -p origem-35-3-final ps --all
docker compose -p origem-35-3-final logs worker
curl.exe http://127.0.0.1:3001/health
```

Os projetos de tentativa e bancos auxiliares ficaram parados.
Nenhum volume ou container persistente foi apagado.
A API da demonstração permanece ativa na porta 3001.
Para executar o projeto padrão, pare antes essa demonstração.

```powershell
docker compose -p origem-35-3-final stop
```

## Referências técnicas consultadas

- [Docker: dependências e ordem de inicialização](https://docs.docker.com/compose/how-tos/startup-order/).
- [Docker: COMPOSE_ENV_FILES](https://docs.docker.com/compose/how-tos/environment-variables/envvars/#compose_env_files).
- [Dockerfile: multi-stage, USER e HEALTHCHECK](https://docs.docker.com/reference/dockerfile/).
