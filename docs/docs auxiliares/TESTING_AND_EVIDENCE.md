# Testes e evidencias das subtarefas

## Ciclo obrigatorio

1. Escreva um teste que represente o criterio Jira.
2. Execute-o e confirme a falha esperada.
3. Implemente apenas o comportamento da subtarefa.
4. Execute testes focados ate ficarem verdes.
5. Execute lint, typecheck e suite relacionada.
6. Revise seguranca e escopo.
7. Capture a evidencia sugerida.
8. Crie exatamente o commit indicado.

## Banco de dados

Testes de persistencia, constraints, migrations, fila e concorrencia usam
PostgreSQL real. Use uma branch ou database de teste do Neon. Nao use banco
em memoria, repositories falsos ou mocks do Prisma.

Cada teste cria dados exclusivos. Limpe somente seus dados. Nunca rode testes
destrutivos contra producao.

## Frontend e Fake API

Testes unitarios podem usar o repositorio de navegador real com um storage
isolado por teste. Nao simule o banco real dessa forma.

Valide 360px, 768px e 1280px quando a subtarefa envolver interface.
Verifique loading, sucesso, vazio e erro nos fluxos de leitura.

## Evidencias Jira

Cada subtarefa deve produzir evidencias diretamente relacionadas ao criterio:

- terminal mostrando o comando e resultado;
- screenshot do comportamento final;
- GIF curto para fluxos interativos;
- resposta HTTP sanitizada;
- diagrama ou documento quando solicitado.

Nunca capture `.env`, tokens, senhas, connection strings ou dados pessoais.
Nomeie evidencias pelo identificador Jira, quando forem versionadas.

## Portoes por tipo

| Tipo                 | Validacoes minimas                                      |
| -------------------- | ------------------------------------------------------- |
| Documentacao         | links, consistencia, ausencia de placeholders           |
| Frontend             | testes focados, lint, typecheck, breakpoints aplicaveis |
| Backend              | testes focados, lint, typecheck, erro seguro            |
| Banco                | validate, migration real, constraints reais             |
| Concorrencia         | tres rodadas, estado final consultado no banco          |
| Fila                 | retry, idempotencia persistente e reinicio simulado     |
| Recomendacao frontal | contrato, loading, erro, vazio e faixa visivel          |
| Baseline de IA       | PostgreSQL real, ranking e metricas reproduziveis       |

## Revisao final de cada commit

- [ ] Apenas uma subtarefa foi implementada.
- [ ] O teste falhou antes da implementacao.
- [ ] Todos os testes relacionados estao verdes.
- [ ] Nenhuma credencial entrou no diff.
- [ ] A evidencia comprova o criterio mensuravel.
- [ ] O commit usa a mensagem exata do prompt.
- [ ] O adapter falso nao e apresentado como baseline do banco.
- [ ] Frontend e backend respeitam o mesmo contrato de recomendacao.

## Smoke test em produção — checkpoint semana 11

Execute na [URL publicada da Vercel](https://origem-marketplace.vercel.app/).
Responsável pela execução e pelo vídeo: Pedro.
Status inicial: roteiro preparado; execução manual pendente.
Use `NEXT_PUBLIC_DATA_SOURCE=http` no deploy e dados sintéticos.
Abra Network e mantenha o registro durante a navegação.
Grave um vídeo de 2–3 minutos mostrando chamadas reais.
Oculte senhas, cookies e dados pessoais nas evidências.
Não exporte HAR com credenciais.

Registre a revisão publicada, o executor e o vídeo:

- Revisão publicada: a preencher durante a execução.
- Executor: Pedro.
- Vídeo: a vincular após a gravação.
- Evidências: `evidencias/PI4-27-W10-Integracao-Camadas/WEB-16-smoke-producao/`.

Preencha **Obtido**, **Data** e **Bug aberto** após executar.
Use data e hora de Brasília, com `DD/MM/AAAA HH:mm`.
Em Obtido, registre aprovado/reprovado, status HTTP e observação.
Em Bug aberto, registre o ticket ou “nenhum”.
Falhas exigem ticket, correção e nova execução registrada.

| Passo                                   | Resultado esperado                                                                                                                                            | Obtido        | Data                    | Bug aberto  |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------- | ----------------------- | ----------- |
| 0. Acordar o Render                     | Abrir `https://origem-marketplace.vercel.app/api/health`; aguardar HTTP 200 antes de iniciar. O proxy encaminha `/api/health` para `/health` no Render.       | Não executado | A preencher na execução | A verificar |
| 1. Cadastrar comprador novo             | Conta sintética inédita, papel comprador; `POST /api/auth/register` com sucesso.                                                                              | Não executado | A preencher na execução | A verificar |
| 2. Login                                | Autenticar a conta criada; `POST /api/auth/login` com sucesso. Recarregar: `GET /api/auth/me` mantém a sessão.                                                | Não executado | A preencher na execução | A verificar |
| 3. Busca + filtro                       | Buscar termo e combinar dois filtros. Resultados correspondem à seleção; `GET /api/produtos?...` real. Copiar a URL reproduz a seleção.                       | Não executado | A preencher na execução | A verificar |
| 4. Produto com recomendações            | Abrir produto com estoque; detalhes por `GET /api/produtos/:id`. Recomendações reais por `GET /api/recomendacoes?produtoId=...`, sem repetir o produto atual. | Não executado | A preencher na execução | A verificar |
| 5. Perfil do artesão                    | Abrir o autor do produto; `GET /api/usuarios/:id/perfil-artesao` e produtos reais do mesmo artesão.                                                           | Não executado | A preencher na execução | A verificar |
| 6. Carrinho                             | Adicionar item e ajustar quantidade. `/api/carrinho/itens` e `/api/carrinho` persistem itens; total corresponde às quantidades.                               | Não executado | A preencher na execução | A verificar |
| 7. Logout/login com carrinho preservado | Sair e entrar na mesma conta. `POST /api/auth/logout`, novo login e `GET /api/carrinho`; mesmos itens e quantidades.                                          | Não executado | A preencher na execução | A verificar |
| 8. Pedido confirmado                    | Confirmar uma única vez; `POST /api/pedidos` com sucesso. Confirmação mostra número, status confirmado, itens e total. Pagamento permanece simulado.          | Não executado | A preencher na execução | A verificar |
| 9. Pedido em Minha conta                | Abrir Minha conta e localizar o pedido confirmado. Se o commit 20 ainda não existir no deploy, registrar “pendente WEB-11”.                                   | Não executado | A preencher na execução | A verificar |
| 10. Proteções da API                    | `GET /api/pedidos` sem cookie retorna **401**. Comprador acessando a rota admin abaixo recebe **403**. Ambos obrigatórios.                                    | Não executado | A preencher na execução | A verificar |

Para o passo 10, execute no console da Vercel.
Mantenha o comprador autenticado após o passo 9.
O UUID abaixo é sintético e não identifica usuários.
A rota admin valida o papel antes do body.

```javascript
const semCookie = await fetch("/api/pedidos", { credentials: "omit" });
const compradorAdmin = await fetch(
  "/api/admin/usuarios/00000000-0000-4000-8000-000000000000/papel",
  {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ papel: "comprador" }),
  },
);
console.table({
  pedidosSemCookie: semCookie.status,
  adminComComprador: compradorAdmin.status,
});
```

Registre os dois códigos na linha 10.
HTTP 404 reprova esse passo, mesmo sem autenticação.
No checkout de preparação, `GET /pedidos` ainda não existe.
Se faltar no deploy, registre a dependência de WEB-11.
A exceção “pendente WEB-11” vale somente para o passo 9.
WEB-16 não implementa essa rota nem antecipa WEB-11.

O teste `frontend/tests/services/container-http.test.ts` verifica o container.
Com HTTP, todos os services do roteiro usam adapters HTTP.
O carrinho autenticado persiste no servidor; visitante usa storage local.
`PENDENTES_HTTP` registra as pendências de artesão/admin deste checkpoint.
São permitidas escrita do catálogo e listagens/moderação administrativas.
Pedidos do artesão ainda não possuem service neste checkout.
Criação de avaliações permanece indisponível, fora deste roteiro.
Ela continua rejeitando explicitamente com `HTTP_NAO_IMPLEMENTADO`.
Não há fallback fake para essa escrita.
Leitura de avaliações usa HTTP e permanece coberta pelo teste.

Antes do commit, Pedro deve preencher e revisar o checklist.
O aceite exige os passos **1–8 e 10 aprovados**.
Todos precisam de data real e evidência no ambiente publicado.
O passo 9 admite somente a pendência documentada de WEB-11.
Testes locais verdes não aprovam o smoke em produção.

## 31.3: E2E local com Playwright

Responsável: Sergio. Revisor indicado: Pedro.
Execute a partir de `frontend/`, após `npm ci` nos dois projetos.
Gere o Prisma em `backend/` com `npm run prisma:generate`.
Use Node.js 22 ou superior e Chromium já instalado.
Não execute `playwright install`.
Vídeos de retry requerem o FFmpeg já disponível ao Playwright.

Configure as variáveis apenas no ambiente local:

```powershell
$env:E2E_DATABASE_URL = '<conexao da branch sintetica de teste Neon>'
$env:E2E_CHROMIUM_EXECUTABLE_PATH = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
npm run test:e2e
```

`E2E_DATABASE_URL` deve apontar para uma branch separada.
O entrypoint recusa produção e conexões padrão ou deploy conhecidas.
Mantenha `DATABASE_URL`, `DIRECT_URL` e `DATABASE_URL_DEPLOY` corretamente configuradas.
Elas permitem identificar e recusar esses destinos protegidos.
O hostname pooled é convertido para conexão direta.
Nenhuma connection string entra no relatório.

O comando inicia Express e Next.js reais em loopback.
Portas padrão: API `3313` e frontend `3113`.
Sobrescreva com `E2E_API_PORT` e `E2E_FRONTEND_PORT`, se necessário.
Servidores existentes nessas portas são recusados.
O frontend recebe `NEXT_PUBLIC_DATA_SOURCE=http` e `BACKEND_URL` local.
O proxy existente encaminha `/api/*` ao Express.

Cada execução cria um schema exclusivo `e2e31_<uuid>`.
Todas as migrations existentes são aplicadas nesse schema.
O seed demo real roda antes dos testes.
Os testes criam compradores com e-mails exclusivos por tentativa.
O fluxo do artesão usa João, do seed demo.
As sessões do comprador e artesão permanecem em contextos separados.
Ao terminar, inclusive após falhas, o runner remove seu schema.
A limpeza valida UUID, nome e identidade do banco.
`cleanup.json` confirma sua ausência no PostgreSQL.
Interrupção forçada do processo inteiro pode impedir essa limpeza.
Nesse caso, preserve `runtime.json` para recuperar o schema identificado.

Os dois projetos usam viewports `360x900` e `1280x900`.
O fluxo a cobre cadastro, login, busca filtrada e produto.
Depois valida carrinho, checkout e número em Meus pedidos.
O fluxo b cria outro pedido pelo mesmo caminho.
João confirma o envio; o comprador consulta o status Enviado.
Seletores usam roles e labels, com esperas por condições.
As respostas HTTP também comprovam filtro, criação e envio reais.
Pagamento permanece simulado pelo backend existente.
Workers de notificações não integram este teste.

O padrão habilita um retry, trace e vídeo `on-first-retry`.
O relatório HTML não abre automaticamente.
O runner imprime seu caminho ao terminar.
Artefatos ficam em `frontend/test-results/<uuid>/`, fora do Git.
`E2E_ARTIFACT_DIR` muda o diretório base das evidências.
Traces ZIP são sanitizados, incluindo cópias do relatório.
Senhas, cookies e tokens são removidos dos registros textuais.
Fontes embutidas também são removidas; ações e imagens permanecem.

Para comprovar estabilidade, execute três vezes consecutivas:

```powershell
npm run test:e2e -- --retries=0 --fail-on-flaky-tests --trace=on
npm run test:e2e -- --retries=0 --fail-on-flaky-tests
npm run test:e2e -- --retries=0 --fail-on-flaky-tests
```

O override da primeira rodada salva traces mesmo sem falhas.
O padrão `on-first-retry` permanece na configuração.
Esta suíte não entra no CI nesta sprint.
Ela depende dos dois servidores locais e do Neon.
Evidências: `evidencias/PI4-31-W12-Testes-Executados/31.3-e2e/`.

- [x] Teste do container verde na preparação de 14/10/2026.
- [ ] Checklist preenchido com data real de execução.
- [ ] Passos 1–8 e 10 aprovados na Vercel.
- [ ] Passo 9 aprovado ou registrado como “pendente WEB-11”.
- [ ] Vídeo vinculado, com Network aberto e evidências sanitizadas.
- [ ] Bugs registrados e passos reprovados reexecutados.
