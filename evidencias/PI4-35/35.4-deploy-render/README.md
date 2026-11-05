# PI4-35.4: microsserviço publicado

Execução em 04 e 05/11/2026, horário de Brasília.

## Publicação

| Item | Resultado |
| --- | --- |
| Repositório | `devpedrois/Projeto-Integrador` |
| Branch publicada | `main` |
| Commit publicado nos dois serviços | `a967b8126a463dbe7a5312c7206e544fef1402ee` |
| Microsserviço | `origem-recomendacao`, Docker, Free |
| Serviço Render | `srv-dbluv1u1egvs73ap7cf0` |
| Deploy do microsserviço | `dep-dbluv2e1egvs73ap7dn0`, Live |
| API | `Projeto-Integrador`, Node, Free |
| Deploy da API | `dep-dblv1859fdbs73ba4lqg`, Live |
| Neon | Projeto `Integrador origem`, branch `pi4-21-tf1-1` |
| Banco | `neondb` |

O microsserviço já existia no commit remoto da main.
Nenhum push ou deploy de branch de trabalho foi realizado.
O fallback local `b4b718d` permanece somente na main local.
O deploy desta subtarefa não publicou esse commit.

- [Health público do microsserviço](https://origem-recomendacao.onrender.com/health).
- [API publicada](https://projeto-integrador-v1vf.onrender.com/health).
- [Produto publicado](https://origem-marketplace.vercel.app/produto/b0000000-0000-4000-8000-000000000001).

## Neon e isolamento

As views de contrato já estavam aplicadas pela API.
A branch produtiva foi identificada pela conexão do Render.
Ela não é a branch padrão chamada main.

Foi executado `npm run bootstrap:permissoes` com conexão administrativa direta.
A senha nova de `recomendacao_app` permaneceu no ambiente da sessão.
A senha existente de `origem_api_app` foi preservada.
Depois, foi executado `npm run migrate` como `recomendacao_app`.

A migration local tinha finais CRLF e checksum diferente.
O checksum aplicado correspondia ao arquivo LF do Git.
Foi utilizado esse conteúdo canônico, sem alterar o histórico produtivo.
Não houve alteração lógica na migration.

As verificações usaram conexões reais dos papéis de runtime:

1. `recomendacao_app` consultou as duas views de contrato.
2. A leitura de `public."Produto"` foi negada, código `42501`.
3. A leitura de `recomendacao.execucao_lote` pela API foi negada, código `42501`.
4. A escrita privada como `recomendacao_app` funcionou, com rollback.

Resultados: [permissoes-producao.json](permissoes-producao.json).

Inicialmente a API usava um papel administrativo.
A execução foi pausada ao detectar acesso ao schema privado.
O responsável autorizou explicitamente trocar a variável `DATABASE_URL`.
O runtime passou a utilizar `origem_api_app` com conexão pooled.
O schema existente `pgboss` já pertencia a esse papel.
Nenhuma transferência de fila ou mudança de `DIRECT_URL` ocorreu.

## Render

O novo serviço usa raiz `services/recomendacao`, Dockerfile `Dockerfile` e contexto `.`.
O health check usa `/health`, público e com consulta PostgreSQL.
O servidor utiliza `PORT` fornecida pelo Render e `HOST=0.0.0.0`.

Variáveis do microsserviço, somente nomes:

- `DATABASE_URL`
- `API_SCHEMA`
- `RECOMENDACAO_SCHEMA`
- `HOST`
- `NODE_ENV`
- `RECOMENDACAO_SERVICE_TOKEN`

Variáveis alteradas ou acrescentadas na API, somente nomes:

- `DATABASE_URL`, troca adicional autorizada.
- `RECOMENDACAO_URL`
- `RECOMENDACAO_SERVICE_TOKEN`
- `RECOMENDACAO_TIMEOUT_MS`

O timeout foi configurado em 800 ms.
Senha e token foram gerados com fonte criptográfica.
Os valores foram transferidos em memória para os painéis.
Nenhuma conexão administrativa foi configurada no microsserviço.

## Verificação HTTP e tela

| Verificação | Resultado |
| --- | --- |
| Microsserviço `/health` sem token | 200 |
| Microsserviço `/recomendacoes` sem token | 401 |
| Microsserviço com token | 200, `fallback-geral`, sete itens |
| API `/recomendacoes` | 200, `fallback-geral`, sete itens |
| Vitrine `/api/recomendacoes` | 200, `fallback-geral`, sete itens |
| Produto de contexto | 200, `categoria`, um item relacionado |
| IDs do módulo e da vitrine | Iguais, na mesma ordem |
| Produto atual na recomendação contextual | Ausente |

O catálogo produtivo disponível tinha sete produtos visíveis.
A categoria do produto observado tinha um candidato relacionado.
As estratégias observadas vieram do microsserviço, sem `fallback-local`.
O carrossel publicado mostrou a Jarra de Barro Fosca.

Resultados sanitizados: [http-producao.json](http-producao.json).

- [Microsserviço Live](microsservico-live.png).
- [API Live](api-live.png).
- [Vitrine preenchida](vitrine-recomendacoes.png).
- [Produto com carrossel](produto-carrossel.png).

O navegador controlado permitiu comprovar o carrossel visualmente.
A captura adicional com Network não foi obtida.
O controle nativo foi interrompido pela ferramenta.
Ela não conseguiu validar com segurança a URL atual.
As respostas HTTP foram comprovadas separadamente no JSON.

## Validação e revisão

- Microsserviço: lint e typecheck passaram.
- Microsserviço: 18 testes unitários passaram.
- Backend: 19 testes do cliente HTTP passaram.
- Frontend: 31 testes de contrato e adapter passaram.
- Build Docker no Render passou.
- Build da API e migrations no Render passaram.
- `git diff --check` passou.

Os testes HTTP locais inicialmente falharam no sandbox restrito.
Os mesmos 19 testes passaram fora dele, sem alterações.
Não foram executados testes de carga ou seeds em produção.
As verificações produtivas limitaram-se ao escopo autorizado.

Foi realizada revisão equivalente de segurança nesta conversa.
Foram conferidos isolamento, token obrigatório e ausência de segredos nos artefatos.
Os prints não contêm valores de credenciais.
Nenhum serviço, banco ou branch foi apagado, renomeado ou suspenso.

## Operação Free

As 750 horas mensais são compartilhadas no workspace.
Cada serviço pode levar aproximadamente um minuto para acordar.
Acorde API e microsserviço antes das demonstrações.
Confirme respostas do módulo após o aquecimento.
Referência: [Render Free](https://render.com/docs/free).
