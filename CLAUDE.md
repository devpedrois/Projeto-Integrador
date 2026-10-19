# CLAUDE.md — Projeto Integrador "Origem"

Curso de ADS — CESAR School — 4º Semestre — 2026.2

> **Documento vivo.** As seções 1–5 vêm do planejamento oficial do PI e mudam
> pouco. As seções 6–9 são para o time manter atualizadas ao longo do semestre
> (decisões de arquitetura, modelo de dados, contratos de API, status). Sempre que
> uma decisão relevante for tomada, edite a seção correspondente e atualize a data
> em "Última atualização" no topo.

**Última atualização:** 2026-10-18

---

## 1. Ficha do projeto

**Nome:** Origem — marketplace da economia criativa e do artesanato de Pernambuco

**Descrição:** Aplicação web full stack que conecta artesãos e empreendedores
criativos de Pernambuco (âncora: Comunidade do Pilar, Recife; expansão possível
para Alto do Moura/Caruaru e Tracunhaém) a compradores de todo o país. A
plataforma dá vitrine e canal de venda a quem produz, valorizando técnica, origem
e história de cada peça, e oferece recomendação de produtos, busca por
técnica/região e indicadores de venda.

**Problema central:** Artesãos e produtores criativos têm pouca visibilidade
digital, dependem de intermediários e têm gestão precária de catálogo, pedidos e
estoque. Falta um canal que conecte essa produção a compradores destacando
origem, técnica e o impacto de comprar direto de quem faz.

**Produto/solução esperada:** Aplicação web full stack com vitrine do comprador
(busca, filtros, perfil do artesão, carrinho, avaliações), painel do artesão
(catálogo, estoque, pedidos) e painel administrativo, com um módulo de
recomendação de produtos e indicadores de venda.

**Nível de complexidade:** Média-alta (escopo controlado: poucas categorias,
dados representativos, recomendação simples antes de modelos sofisticados).

**Principais competências exercitadas:** Desenvolvimento web full stack
(frontend e backend); modelagem e otimização de banco de dados; engenharia de
requisitos, arquitetura (SOLID/GRASP/padrões) e testes; concorrência, paralelismo
e sistemas distribuídos; engenharia de software para módulos de IA
(recomendação, classificação, sentimento); trabalho em equipe e integração entre
áreas.

**Limites e cuidados de escopo:** Dados representativos/sintéticos (ou com
consentimento, se houver parceria real); pagamento simulado, sem gateways reais;
respeito à origem cultural e à autoria das peças; recomendação e classificação em
nível didático; escopo de categorias e de distribuição limitado para caber no
semestre.

---

## 2. Disciplinas e dependências

| Disciplina | Papel no PI | O que consome / de quem depende | O que entrega para as demais |
|---|---|---|---|
| **Desenvolvimento Web** | Constrói a aplicação full stack (núcleo do produto): frontend responsivo + backend (API, regras de negócio) | Modelo de dados e contratos de API (BD); requisitos e arquitetura (REQ); endpoints do módulo de IA; pontos assíncronos (FCCPD) | Produto executável que integra as demais contribuições |
| **Modelagem e Projeto de BD** | Projeta e implementa o banco (conceitual, lógico, físico), normalização, índices | Requisitos do domínio | Modelo de dados para Web e IA |
| **Requisitos, Projeto de Software e Validação** | Análise de domínio, requisitos, arquitetura (SOLID/GRASP/padrões), estratégia de testes | Domínio do projeto | Requisitos e arquitetura para Web e BD; critérios de aceitação |
| **Fund. de Computação Concorrente, Paralela e Distribuída (FCCPD)** | Desempenho, escalabilidade, tolerância a falhas (concorrência, paralelismo, arquitetura distribuída) | Aplicação da Web; pontos de carga e tarefas de IA; modelo de BD | Estrutura de microsserviços/filas/processamento paralelo para Web |
| **Engenharia de Software e IA (eletiva)** | Módulo inteligente (recomendação, classificação, sentimento, previsão), exposto como API | Dados/modelo de BD; APIs da Web; paralelismo do FCCPD | Módulo de IA consumido pela Web |
| **Projeto 4 (disciplina de Projeto)** | Acompanha processo, organização, planejamento e integração — **não avalia mérito técnico** | Calendário e critérios de cada disciplina (recebidos no kickoff) | Visão consolidada de andamento, riscos de integração, feedback de processo |

---

## 3. Entregas e critérios mínimos por unidade

O bloco do Projeto Integrador vale **no mínimo 40% da nota de cada unidade** em
cada disciplina técnica, com rubrica própria (níveis: Excelente 100% · Bom 75% ·
Suficiente 50% · Insuficiente 25% · Não entregue 0%, aplicados por critério).

### Unidade 1 (fecha nas semanas 8–9)

| Disciplina | Entrega | Critérios técnicos mínimos |
|---|---|---|
| Desenvolvimento Web | Frontend responsivo com **Fake API estruturada** (Avaliação 1 — corrigido 27/08/2026) | Telas principais responsivas; navegação e carrinho funcionando; recomendação visível por adapter local; Fake API estruturada com camada de services/hooks/store (integração HTTP real só na Avaliação 2, ver `docs/07-Especificacao-Disciplina-Web.md`); pesos oficiais: frontend/navegação 50%, Fake API 35%, integração/deploy 15% |
| Modelagem e Projeto de BD | Modelo conceitual e lógico + carga inicial | Entidades e relacionamentos coerentes; normalização adequada; DDL executável; dados de teste |
| Requisitos/Projeto de Software | Análise de domínio, requisitos e arquitetura | Histórias claras e priorizadas; arquitetura coerente (SOLID/GRASP); plano de testes definido |
| FCCPD | Concorrência no checkout/estoque + fila assíncrona | Rubrica oficial da plataforma (confirmada 01/09/2026, 6 critérios de 4 pts cada = 24 pts): Implementation of Concurrency Control; Inventory Consistency Under Simultaneous Access; Asynchronous Task Queue Setup; Decoupling and Message Integrity; Evidence of System Reliability; Statement of Artificial Intelligence Usage |
| Eng. de Software e IA | Planejamento e baseline de recomendação | Baseline funcional gerando recomendações a partir de dados reais; métrica definida |

> **Nota sobre a rubrica de FCCPD (01/09/2026):** os pesos percentuais citados em
> `docs/05-Concorrencia-e-IA-Baseline.md` (45%/35%/20% para estoque/fila/teste) vieram
> de uma leitura anterior da rubrica; a rubrica confirmada agora na plataforma usa 6
> critérios de 4 pts cada. Os dois primeiros critérios (Concurrency Control, Inventory
> Consistency) já estavam cobertos pelos pontos 1.1–1.3 do `docs/05`; **Asynchronous
> Task Queue Setup** e **Decoupling and Message Integrity** motivaram o aprofundamento
> do §1.5/§1.6 do mesmo documento (feito em 01/09/2026); **Evidence of System
> Reliability** é coberto pelo script de teste de concorrência (§4) mais os novos
> testes de falha/retry da fila; **Statement of Artificial Intelligence Usage**
> depende de `docs/uso-de-ia.md`, ainda não criado (pendência conhecida, não é
> desatualização).

> **Atualização 14/09/2026 — prazo real descoberto:** a entrega dessa
> rubrica na plataforma tem data própria, **20/09/2026, 23:59**, e o
> professor mandou mensagem direta exigindo um **backend mínimo e
> funcional** (não precisa ser completo) com 1 a 3 funcionalidades
> demonstrando concorrência e assíncrono rodando de verdade — documentação
> sozinha não é suficiente. Isso é bem mais cedo do que o Sprint 4 do
> backlog SMART (Semanas 10–11), onde o "backend real" estava planejado.
> Escopo mínimo e cronograma de 6 dias definidos em
> `docs/05-Concorrencia-e-IA-Baseline.md` §4.8 e
> `sprints/semana-02-03/02-Historias-de-Usuario.md` §4.1.

### Unidade 2 (fecha nas semanas 15–16 no PI; **Web entrega a AV2 nas semanas 16–17**)

> **Correção 06/10/2026:** o roadmap oficial da disciplina de Web (Notion)
> põe a **Avaliação 2 de Web nas Semanas 16–17 (16/11 a 27/11/2026)**; as
> Semanas 10–15 são de construção. O backlog SMART assumia 13/11 (Semana
> 15). Rubrica completa da AV2 de Web (pesos 40/35/25, checklist,
> entregáveis, níveis) transcrita em `docs/07-Especificacao-Disciplina-Web.md`
> §5. As rubricas detalhadas da U2 de BD e de IA ainda não foram coladas —
> a tabela abaixo segue sendo o resumo do PDF de planejamento.

| Disciplina | Entrega | Critérios técnicos mínimos |
|---|---|---|
| Desenvolvimento Web | Aplicação full stack integrada | Fluxo end-to-end (buscar→carrinho→pedido) funcional; recomendação integrada; assíncrono operando; autenticação; cache; API documentada; deploy. Pesos oficiais: integração full stack 40%, fluxo end-to-end no ambiente publicado 35%, qualidade/cache/documentação da API 25% (`docs/07` §5) |
| Modelagem e Projeto de BD | Modelo físico otimizado | Índices pertinentes; integridade garantida; consultas eficientes (busca por técnica/região) |
| Requisitos/Projeto de Software | Validação, testes e refatoração | Testes executados (não só descritos); refatorações justificadas; aderência aos critérios de aceitação |
| FCCPD | Arquitetura distribuída e desempenho | Separação coerente de módulos/serviços; paralelismo com ganho comprovado; desempenho avaliado |
| Eng. de Software e IA | Módulo de IA integrado | Recomendação/classificação/sentimento consumidos via API pela Web (não em notebook isolado); métricas reportadas |

> Detalhamento completo dos pesos por critério (%) está no PDF oficial
> "Planejamento dos Projetos Integradores" (páginas 14–17). Consulte antes de
> fechar cada unidade.

---

## 4. Cronograma de sprints (Sprints.xlsx)

| Semana(s) | Período (2026) | Foco | Entregáveis |
|---|---|---|---|
| 1 | 03–07/ago | Kickoff do PI e organização das squads | Tema do PI; calendário único; critérios de avaliação |
| 2–3 | 10–21/ago | Apoio à análise de requisitos e modelagem de dados | Histórias priorizadas; modelo conceitual; contratos de API |
| 4–5 | 24/ago–04/set | Setup técnico e definição dos pontos de concorrência e de IA | Repositório; stack; pontos de concorrência; definição do problema de IA; features |
| 6–7 | 07–18/set | Primeira sprint (frontend + backend inicial) e convergência | ✅ **Concluída.** Build do app; modelo lógico; baseline de recomendação; **backend mínimo real de FCCPD (concorrência + fila, entregue 20/09/2026 — ver §3)** — auditoria de código em 20/09/2026 confirma as 28 subtarefas implementadas (`docs/08-Subtarefas-Jira-Sprint06-07.md`) |
| 8–9 | 21/set–02/out | Fechamento e checkpoint da Entrega U1 (AV1) | ✅ **Concluída** (Pedro confirmou em 26/09 que todas as entregas da AV1 foram cumpridas). Histórico: BD, IA e FCCPD já fechados antes do início — só **Desenvolvimento Web** tem entrega pendente: checkout, perfil do artesão, página de produto, avaliações (contrato) e painel admin, detalhadas em `docs/09-Subtarefas-Jira-Sprint08-09.md` |
| 10–11 | 05–16/out | Replanejamento da U2 e integração backend, BD e IA | ✅ **Concluída** (Sprint 4, confirmado pelo Pedro em 18/10/2026). Backend real integrado: autenticação JWT em cookie, autorização por papel e propriedade, persistência, checkout real com pagamento simulado, **modelo físico de BD**, índices, recomendação consumida pelo app — tickets PI4-27 (WEB), PI4-28 (BD), PI4-29 (IA), plano e subtarefas em `docs/10-Plano-Sprint4-Subtarefas-Jira-Semanas10-11.md` |
| 12–13 | 19–30/out | Concorrência/distribuição, desempenho e testes | 🔄 **Inicia 19/10/2026** (Sprint 5, "Week 12e13" no Jira). Diagrama distribuído; benchmark; resultados de testes e refatorações — tickets PI4-30 (FCCPD) e PI4-31 (REQ), mais 3 tickets-pai novos (BD, WEB, IA) propostos em `docs/10-Subtarefas-Jira-Sprint12-13.md` |
| 14–15 | 02–13/nov | Consolidação integrada e preparação da apresentação | Build final; documentação; roteiro de apresentação; divisão de falas |
| 16–18 | 16/nov–04/dez | Apresentação final e avaliação de processo/colaboração | Demonstração do produto; documentação; evidências de gestão. **AV2 de Web nas Semanas 16–17 (16–27/11)** |

**Checkpoints quinzenais oficiais:** semanas 3, 5, 7, 9, 11, 13, 15.

---

## 5. Riscos mapeados e mitigações

| Risco | Impacto | Probab. | Mitigação |
|---|---|---|---|
| Frontend de fachada, sem backend e integração reais | Alto | Média | Rubrica de Web U2 exige integração full stack; integrar já na U1 com contratos de API definidos cedo |
| Módulo de IA descolado do produto (notebook isolado) | Alto | Alta | IA exposta por API e consumida pela Web; baseline já na U1; rubrica de IA U2 pontua a integração |
| Modelo de dados desalinhado das telas/consultas | Médio | Média | BD modela a partir das histórias e consultas reais; revisão conjunta com Web e Requisitos antes da U2 |
| Concorrência/distribuição forçada ou complexa demais | Médio | Média | Amarrar a necessidades reais (estoque/checkout); justificar cada serviço; limitar o escopo da distribuição |
| Integração deixada para o fim do semestre | Alto | Média | Marcos de integração já na U1; contratos de API e pontos assíncronos definidos cedo |
| Sobreposição Requisitos × Web sobre arquitetura | Médio | Média | Requisitos define arquitetura/testes, Web implementa; decisões revisadas em conjunto |
| Dados e autoria cultural (privacidade/respeito) | Médio | Baixa | Dados representativos/sintéticos ou com consentimento; respeito à autoria das peças |

---

## 6. Decisões de arquitetura *(vivo — manter atualizado)*

> Registre aqui cada decisão relevante, com data. Não apague decisões antigas que
> foram substituídas — marque como "revogada em [data], substituída por [nova]".

- **Stack de frontend:** Next.js (App Router) + React + TypeScript + Tailwind
  CSS — **só frontend** (consome a API do backend via `services`/`fetch`, sem
  Route Handlers/Server Actions para regra de negócio).
- **Stack de backend:** **Node.js + TypeScript (Express)**, projeto separado
  do frontend (pasta `backend/`, ver `docs/07-Especificacao-Disciplina-Web.md`
  seções 6 e 8) — camadas `routes/controllers/services/repositories/
  middlewares`, seguindo a stack de referência oficial da disciplina de Web
  (Express + Prisma + JWT). **Decisão confirmada pelo Pedro em 27/08/2026**,
  resolvendo o conflito identificado entre a stack antiga (Next.js API Routes
  unificado) e a stack de referência do Notion da disciplina.
- **Banco de dados:** **PostgreSQL**, hospedado no **Neon** (serverless, free
  tier, branching de banco, integração nativa com Vercel).
- **ORM:** **Prisma** (`schema.prisma` com `url` = conexão pooled do Neon e
  `directUrl` = conexão direta, usada pelo Prisma CLI para migrations) — vive
  dentro do projeto `backend/` (`backend/src/database/prisma/schema.prisma`),
  não mais compartilhado num Next.js unificado.
- **Ambiente de deploy/hospedagem:** **Vercel** para o frontend Next.js
  (integração via Marketplace Vercel + Neon, deploy automático a cada push na
  branch principal); **Render** (free tier) para o backend Express — decisão
  confirmada em 27/08/2026: Render tem free tier real sem cartão de crédito
  (750h/mês, processo Node persistente, ideal pra filas/cache/jobs), enquanto
  Railway não tem mais free tier viável pra rodar 24/7 (só crédito de teste) e
  Fly.io exige cartão desde o cadastro. Ponto de atenção: o free tier do Render
  "dorme" após 15min sem tráfego e demora ~1min pra acordar — vale religar o
  serviço um pouco antes de checkpoints/demos.
- **Fluxo de migrations:** `npx prisma migrate dev` localmente para gerar as
  migrations versionadas no repositório (dentro de `backend/src/database/prisma/`).
  **Atualizado 31/08/2026** — como o Prisma passou a viver no `backend/`
  (Express/Render) e não mais num Next.js unificado, quem roda
  `prisma migrate deploy` em produção é o build do **backend no Render**
  (script `build` do `backend/package.json`, ex.:
  `prisma migrate deploy && tsc`), antes de iniciar o servidor Express. O
  build do **frontend na Vercel** não mexe em banco/Prisma — só compila o
  Next.js. `postinstall` do `backend/` roda `prisma generate`.
- **Variáveis de ambiente necessárias (local e no Render, não na Vercel):**
  `DATABASE_URL` (connection string com `-pooler`, usada em runtime) e
  `DIRECT_URL` (connection string direta, sem `-pooler`, usada só pelo Prisma
  CLI) — vivem no ambiente do **backend** (Express/Render), já que é lá que
  o Prisma roda. **Atualizado 31/08/2026** (antes descrito como "local e na
  Vercel", desatualizado desde que o backend virou projeto Express
  separado). A Vercel (frontend) só precisa da URL pública do backend
  (ex.: `NEXT_PUBLIC_API_URL`) para o `services/api/client.ts` chamar.
- **Padrões arquiteturais adotados (SOLID/GRASP/GoF) — OFICIALIZADO em
  31/08/2026** (aprovação final do Pedro no `01-Arquitetura-e-Stack-Setup.md`):
  **Repository** (`backend/src/repositories/`, um por entidade — isola o
  Prisma da regra de negócio); **Service layer** (`backend/src/services/`,
  regra de negócio orquestrando repositories, mantém controllers finos);
  **Strategy** (`backend/src/integrations/recommendation.client.ts` — troca
  de estratégia de recomendação sem mudar quem consome); **Middleware chain**
  do Express (`backend/src/middlewares/`: auth, role, validation, error);
  **DTO/validação na borda** (`backend/src/validators/`, aplicados via
  `validation.middleware.ts`). Deliberadamente sem Clean Architecture
  completa, CQRS ou DI framework — não necessários para o tamanho do
  projeto. PDF do setup técnico:
  `sprints/semana-04-05/Origem_PI4-15_Arquitetura-e-Stack-Setup.pdf`.
- **Estratégia de testes — OFICIALIZADO em 31/08/2026:** unitário
  (Vitest/Jest, services e regras de negócio com repositories mockados,
  em `backend/`); integração (Vitest/Jest + branch de teste do Neon com
  Prisma real, rotas Express ponta a ponta); E2E (Playwright, fluxos
  críticos de UI: cadastro/login, busca→carrinho→checkout, avaliação,
  painel do artesão); **concorrência** (script dedicado em Node,
  `Promise.all` disparando N requisições simultâneas contra `POST /pedidos`
  com estoque baixo — evidência de que o estoque nunca fica negativo).
  Escopo focado nos fluxos críticos, não em perseguir cobertura % geral alta.
- **Repositório:** https://github.com/devpedrois/Projeto-Integrador.git
  (mono-repo). **Importante:** o Claude não é colaborador do repositório e não
  tem acesso de push — qualquer conteúdo gerado (código, docs) é entregue por
  arquivo/chat e o Pedro sobe manualmente.
- **Time:** **grupo de 8 integrantes** (correção de 14/09/2026 — este registro
  dizia "projeto solo", desatualizado/incorreto). Por organização interna do
  grupo, **Pedro está à frente/responsável pela execução técnica nesta fase
  inicial**, com o Claude atuando como copiloto de Pedro especificamente — não
  há indicação de que os demais 7 integrantes estejam usando o Claude nesse
  fluxo. **Risco de atenção:** enquanto a divisão de trabalho entre os 8 não
  estiver formalizada, a carga de execução recai sobre Pedro sozinho —
  priorizar entregas Must/rubrica antes de polimento, usar o quadro do Jira
  (ver seção 9) para não perder o fio dos prazos, e reavaliar essa divisão à
  medida que o grupo se organiza.
- **Log de decisões:**
  - `2026-08-20` — Setup inicial do projeto e deste arquivo de contexto.
  - `2026-08-20` — Stack de frontend/backend confirmada: TypeScript + React +
    Next.js + Tailwind CSS, full stack no mesmo projeto Next.js. Discussão de
    banco de dados iniciada; recomendação: PostgreSQL (Neon ou Supabase).
  - `2026-08-20` — Banco de dados e hospedagem confirmados: **Neon
    (PostgreSQL)** para o banco + **Vercel** para hospedagem da aplicação,
    com **Prisma** como ORM. Fluxo de migrations definido (`migrate dev` local
    / `migrate deploy` no build de produção).
  - `2026-08-20` — Repositório criado (devpedrois/Projeto-Integrador). Escopo
    travado (personas, 6 categorias, decisão de expansão regional), análise de
    domínio, backlog de histórias (MoSCoW), modelo conceitual de dados,
    contratos de API v0 e mapeamento de concorrência/baseline de IA
    produzidos — ver seção 10.
  - `2026-08-20` — Revisão contra a pauta oficial do checkpoint
    Requisitos/BD/Web: adicionada a entidade `Pagamento` (faltava no modelo),
    a história US20 (pagamento simulado), o endpoint
    `/pedidos/:id/pagamento`, o endpoint `/artesao/indicadores`
    (lacuna encontrada ao cruzar telas × histórias × API), exemplos de
    payload/erro nos contratos de API e o documento 06 de rastreabilidade.
  - `2026-08-20` — Pasta reorganizada: `CLAUDE.md` e o guia de setup do
    workspace ficam na raiz; entregáveis oficiais da sprint 2–3 movidos para
    `sprints/semana-02-03/`; documentos de reforço movidos para `docs/`. Ver
    seção 10 para a convenção a seguir nas próximas sprints.
  - `2026-08-27` — **Confirmado com o Pedro (orientação do professor):
    código de implementação só começa na sprint semanas 6–7, não nesta
    sprint 4–5.** Semanas 4–5 é só setup técnico/definição/documentação
    (padrões de arquitetura, plano de testes, decisões de auth/storage,
    refinamento dos pontos de concorrência e do problema de IA). Corrigidas
    as notas da seção 7 (que sugeriam derivar modelo lógico/DDL já em 4–5) e
    da seção 9 (datas de "implementação começa" do FCCPD/IA), além do
    documento `docs/05-Concorrencia-e-IA-Baseline.md`, que tinham ficado
    desalinhadas com a tabela oficial de sprints (seção 4).
  - `2026-08-27` (2) — Importado o conteúdo do Notion oficial da disciplina
    de Desenvolvimento Web (o Pedro colou prints, já que a página exige
    JavaScript e não é acessível por fetch direto) — ver
    `docs/07-Especificacao-Disciplina-Web.md`. Duas correções feitas: (a) a
    Avaliação 1 de Web é **Fake API estruturada**, não "integração
    frontend-backend real" como constava aqui (corrigido acima); (b) pesos
    oficiais da rubrica da Avaliação 1 (50% frontend/navegação, 35% Fake
    API, 15% integração/deploy). **Pendência crítica não resolvida:** o
    Notion cita Node.js + Express como "stack de referência da disciplina"
    (pastas `frontend/`/`backend/` separadas), o que conflita com a decisão
    já tomada de backend em Next.js API Routes — aguardando confirmação do
    Pedro antes de mudar qualquer coisa (ver `docs/07` seção 7).
  - `2026-08-27` (3) — **Resolvida a pendência crítica de stack de backend:**
    Pedro confirmou que Next.js é usado só para o frontend (com React); o
    backend passa a ser um projeto separado em Node.js + TypeScript
    (Express), seguindo a estrutura de camadas
    routes/controllers/services/repositories/middlewares descrita no Notion
    oficial da disciplina (`docs/07-Especificacao-Disciplina-Web.md` seções
    6 e 8). Prisma passa a viver dentro de `backend/`. Nova pendência aberta:
    onde o backend Express vai rodar (Vercel serverless functions vs.
    Render/Railway/Fly.io) — ainda não decidido.
  - `2026-08-27` (4) — Fechadas as pendências técnicas restantes da sprint
    4–5: (a) **hospedagem do backend → Render** (free tier real, ver seção 6
    acima); (b) **storage de imagens → mantido Vercel Blob**, chamado via
    SDK/token a partir do Express (funciona independente de onde o backend
    está hospedado, não precisa estar na Vercel); (c) **rotas da API sem
    prefixo `/api`** (orientação da disciplina — todas as tabelas de
    contrato atualizadas); (d) **concorrência no checkout definida:
    `SELECT ... FOR UPDATE` (lock pessimista em transação)** escolhido como
    abordagem definitiva em vez do update condicional — mais alinhado
    didaticamente com o que a disciplina de FCCPD avalia (demonstra controle
    de concorrência explícito), ver `docs/05` atualizado. Padrões de
    arquitetura e estratégia de testes continuam `[a definir]` por pedido do
    Pedro — só oficializar depois que a arquitetura estiver 100% fechada.
  - `2026-08-31` — Gerado PDF atualizado de
    `sprints/semana-02-03/04-Contratos-de-API.md`, cruzando o documento
    linha a linha com o backlog definitivo de histórias de usuário (PDF
    `Origem _ PI412 _ Modelagem Conceitual _ Historias De Usuario.pdf`,
    revisado 26/08/2026, e `02-Historias-de-Usuario.md`). Nenhuma entidade
    nova encontrada — modelo de dados continua válido. Ajustes de contrato
    feitos por essa revisão: erro genérico de login e imutabilidade de
    `papel` pelo usuário (US01/US02); edição de produto liberada também
    para admin (US05); estoque nunca negativo explícito (US06); produto
    sem estoque some da vitrine pública mas não do próprio artesão (US04);
    bloqueio de quantidade acima do estoque no carrinho (US11); escopo por
    papel explícito em `GET /pedidos` (US14); paginação + nota média em
    avaliações (US16); novo endpoint `PATCH /admin/usuarios/:id/papel`
    (única forma de trocar o papel de um usuário, US01); e detalhamento
    explícito do mecanismo de concorrência (`SELECT ... FOR UPDATE`) na
    seção de Pedidos do contrato, respondendo à dúvida do Pedro sobre se a
    decisão de concorrência já estava refletida no documento.

  - `2026-08-31` (2) — Auditoria geral pedida pelo Pedro sobre coisas
    desatualizadas na stack/Notion de Web: corrigidas menções órfãs ao fluxo
    de deploy/env vars antigo (Vercel rodando `prisma migrate deploy`, em vez
    do backend no Render), pendências já resolvidas de auth/storage ainda
    listadas como abertas, e prefixo `/api` esquecido em
    `docs/05-Concorrencia-e-IA-Baseline.md` e `docs/06-Telas-e-Rastreabilidade.md`
    (a tabela inteira deste último). Confirmado também que um novo lote de
    prints do Notion (estrutura detalhada de frontend/backend) bate 100% com
    `docs/07` — sem divergência. Apagado, a pedido do Pedro,
    `sprints/semana-02-03/Roteiro-Apresentacao-Checkpoint-Semana03.md`
    (artefato de uma apresentação já dada).

  - `2026-08-31` (3) — **Aprovação final do Pedro no
    `01-Arquitetura-e-Stack-Setup.md`.** Padrões de arquitetura (Repository +
    Service Layer + Strategy + Middleware chain + validação na borda) e
    estratégia de testes (Vitest/Jest + Playwright + script de concorrência)
    saem do standby `[a definir]` e ficam oficializados na seção 6. Gerado o
    PDF limpo `sprints/semana-04-05/Origem_PI4-15_Arquitetura-e-Stack-Setup.pdf`
    para anexar ao ticket do Jira (W04-Repositório/stack). Com isso, a sprint
    4-5 de Web está com todas as decisões técnicas fechadas e aprovadas.

  - `2026-08-31` (4) — **Pontos de concorrência expandidos, a pedido do
    Pedro.** `docs/05-Concorrencia-e-IA-Baseline.md` ganhou três pontos
    novos além do checkout (§1.1): edição manual de estoque vs. checkout
    (§1.2), moderação do admin vs. ação do artesão/comprador (§1.3) e nota
    média de avaliações/US16 (§1.4) — todos reaproveitando a mesma primitiva
    de lock pessimista (`SELECT ... FOR UPDATE`) já aprovada pro checkout,
    sem estratégia nova. `sprints/semana-02-03/04-Contratos-de-API.md` ganhou
    notas de concorrência nas rotas correspondentes (`PATCH
    /produtos/:id/estoque`, `PATCH /admin/produtos/:id/moderar`, `PATCH
    /admin/artesaos/:id/moderar`, `POST /avaliacoes`), sem criar rota nova.

  - `2026-09-14` — **Backlog de Histórias de Usuário evoluído para v2.**
    Pedro enviou o PDF definitivo novo
    (`Origem_PI412_Modelagem_Conceitual_Historias_Tarefas_SMART.pdf`, 20
    páginas), que substituiu o PDF de 26/08 no mesmo caminho
    (`Origem _ PI412 _ Modelagem Conceitual _ Historias De Usuario.pdf`).
    Critérios de aceite das 20 histórias e Diagrama de Casos de Uso
    conferidos cenário a cenário contra o v1 — idênticos, sem mudança de
    escopo. Diagrama de Classes do PDF também bate 100% com
    `03-Modelo-Conceitual-BD.md` — sem alteração nesse arquivo. Adicionadas
    ao `02-Historias-de-Usuario.md`: Tarefas SMART de implementação por
    história (57 tarefas · 284h), cronograma de 6 sprints quinzenais
    (01/09–20/11/2026) e seção de rastreabilidade; US19 passou a dizer
    também "sem tarefas nesta fase". Documentada (não resolvida) a
    inconsistência pré-existente de prioridade da US10 (Should no corpo,
    Could no quadro MoSCoW). **Correção de time:** o parágrafo de esforço do
    PDF citava "equipe de cinco integrantes" — perguntado ao Pedro, ele
    confirmou que o grupo real é de **8 integrantes**, com ele à frente da
    execução nesta fase (não é projeto solo, como este arquivo registrava
    até então — seção "Time" acima, corrigida). **Achado ainda em aberto:**
    o cronograma de sprints do backlog SMART começa tarefas de código em
    01/09/2026 (T01.1 até 04/09/2026), dentro da janela oficial de
    setup/sem-código das semanas 4–5 — não resolvido, ver ⚠️ na seção 10.

  - `2026-09-14` (2) — **Achado crítico: prazo real de FCCPD é 20/09/2026,
    não Semanas 8–9.** Pedro colou o print da rubrica da plataforma (100
    pontos, entrega 20/set 23:59) e a mensagem literal do professor exigindo
    backend mínimo funcional com 1–3 funcionalidades reais de concorrência e
    assíncrono — documentação não basta. Definido escopo mínimo (1 endpoint
    `POST /pedidos` cobrindo os 6 critérios da rubrica) e cronograma de 6 dias
    em `docs/05-Concorrencia-e-IA-Baseline.md` §4.8 e
    `sprints/semana-02-03/02-Historias-de-Usuario.md` §4.1 (tarefas
    TF.1–TF.5, 17h). Ainda não implementado — Pedro decidiu primeiro
    atualizar a documentação, código vem em seguida.

  - `2026-09-14` (3) — **Divisão do quadro Jira em subtarefas.** A pedido do
    Pedro, quebrados os 4 tickets-pai da Sprint 6-7 (W06-Frontend e API
    inicial/WEB, W06-Modelo lógico/BD, W06-Baseline de IA, W06-Concorrência
    inicial/FCCPD) em 28 subtarefas com nome, descrição e evidência sugerida,
    documentadas em `docs/08-Subtarefas-Jira-Sprint06-07.md`. WEB reaproveita
    as 13 tarefas T01-T11 já existentes no backlog SMART (69h); BD (5) e IA
    (5) foram derivadas agora, pois o backlog SMART não as detalhava; FCCPD
    (5) reaproveita as tarefas TF1.1-TF2.1/TD.1 da entrega urgente (§4.1).
    Nada foi implementado ainda — é só a quebra organizacional para o Jira.

  - `2026-09-14` (4) — **Recomendação visível na AV1 sem integração HTTP.**
    T04.1 passa a incluir `FakeRecommendationAdapter` e uma faixa na vitrine.
    A baseline oficial de IA permanece no backend com PostgreSQL real. Os
    dois lados compartilham contrato; a AV2 troca para o adapter HTTP.

  - `2026-09-20` (5) — **Fechamento da Sprint 1 e 2 e da entrega mínima de
    FCCPD; abertura da Sprint 3.** Auditoria do código real (frontend,
    backend, schema Prisma, migrations) confirma as 28 subtarefas da Sprint
    1 e 2 implementadas (`docs/08-Subtarefas-Jira-Sprint06-07.md`) e a
    entrega mínima de FCCPD enviada dentro do prazo (20/09, 23:59) — gap do
    bootstrap da fila em `server.ts` (achado 18/09) corrigido antes do
    envio. BD e IA já excedem o mínimo da U1 (Strategy real + endpoint HTTP
    de recomendação, além do adapter falso da AV1). Das 5 disciplinas, só
    **Desenvolvimento Web** tem entrega pendente na Sprint 3 (Semanas 8-9,
    21/09–02/10): checkout, perfil do artesão, página de detalhes do
    produto, contrato/massa sintética de avaliações e painel administrativo
    — 9 subtarefas detalhadas e ordenadas em
    `docs/09-Subtarefas-Jira-Sprint08-09.md`. Revisão também encontrou 2
    gaps que o backlog SMART não cobria (página de produto e avaliações),
    já documentados em `docs/07-Especificacao-Disciplina-Web.md` §4 mas sem
    subtarefa formal até então — corrigido. Itens puramente operacionais
    (deploy, README, vídeo, distribuição de commits entre os 8 integrantes)
    seguem sem responsável/prazo definido.

  - `2026-10-06` (6) — **Abertura da Sprint 4 (Semanas 10–11) e rubrica da
    AV2 de Web.** Pedro colou os prints do Notion com a rubrica completa da
    Avaliação 2 de Web (integração 40%, fluxo end-to-end no ambiente
    publicado 35%, qualidade/cache/documentação 25%; vídeo com network
    aberto, Swagger, `.env.example` e evidências de BD/recomendação/
    assíncrono/cache obrigatórios) — transcrita em `docs/07` §5. AV2 de Web
    corrigida para Semanas 16–17. Auditoria do backend em 06/10: só
    `/health`, `POST /pedidos` e `GET /recomendacoes` existem; sem auth,
    CORS/cookies, cache nem Swagger; `server.ts` escuta só em `127.0.0.1` e
    rejeita `NODE_ENV=production`; `.env.example` vazio. Decisão do Pedro:
    trazer a evolução do backend para esta sprint mesmo acima das 67h
    originais do backlog, sem preocupação com divisão entre os 8 nesta
    etapa. Plano com descrições dos tickets-pai PI4-27/28/29 e subtarefas
    com evidência em `docs/10-Plano-Sprint4-Subtarefas-Jira-Semanas10-11.md`.
    O modelo físico de BD (PI4-28) é entregável desta sprint.

  - `2026-10-18` (7) — **Fechamento da Sprint 4 (Semanas 10–11).** Pedro
    confirmou a conclusão da sprint: backend real com autenticação
    (`/auth/register|login|logout|me`, JWT em cookie `httpOnly` servido pelo
    proxy `/api` do Next), autorização por papel e propriedade, persistência
    via HTTP no frontend (`NEXT_PUBLIC_DATA_SOURCE=http`), carrinho no
    servidor, checkout real com pagamento simulado na mesma transação do
    `FOR UPDATE`, notificação assíncrona visível ao artesão, cache em memória
    e Swagger em `GET /docs` (rotas vigentes na §8). Tickets PI4-27 (WEB),
    PI4-28 (BD) e PI4-29 (IA) encerrados. Itens que o plano da Sprint 4
    (`docs/10-Plano-Sprint4-Subtarefas-Jira-Semanas10-11.md` §8) já empurrava
    para a Sprint 5 seguem para lá: avaliação com compra verificada
    (T15.1/T15.2), pedidos recebidos pelo artesão (T14.1/T14.2), indicadores
    (T07.x), foto de perfil (T03.3), p95 da busca (T08.4), documentação da
    concorrência (T12.4) e T20.4 no CI. Pendências de segurança anotadas em
    `docs/seguranca-pendencias-av2.md`. Planejamento da Sprint 5 ("Week
    12e13", 19–30/10) em `docs/10-Subtarefas-Jira-Sprint12-13.md`.

---

## 7. Dicionário de dados / Modelo atual *(vivo — manter atualizado)*

> Atualize esta seção conforme o modelo conceitual/lógico evoluir (semanas 2–3
> em diante). Mantenha nomes de entidades e atributos consistentes com o que a
> disciplina de BD está modelando oficialmente.

### Entidades (modelo conceitual v1, revisado 26/08/2026 — ver `sprints/semana-02-03/03-Modelo-Conceitual-BD.md`)
> A partir da v1, o modelo é expresso como Diagrama de Classes UML
> conceitual (não mais ER), com um Diagrama de Casos de Uso associado no
> documento de histórias. Ver os dois documentos para os diagramas Mermaid
> completos.
- **Usuario** — id, nome, email (único), senhaHash, papel {comprador, artesao, admin}, **ativo**, criadoEm
- **PerfilArtesao** — historia, tecnicaPrincipal, regiao, foto [0..1], **completo** (calculado) — especialização de Usuario (papel=artesao)
- **Categoria** — id, nome (6 categorias definidas em `docs/01-Escopo-e-Analise-de-Dominio.md`)
- **Produto** — id, nome, descricao, preco, quantidadeEstoque, ativo, criadoEm
- **ProdutoFoto** — id, url, ordem — composição de Produto (1:N), suporta múltiplas fotos (US04)
- **Carrinho** *(nova na v1)* — id, atualizadoEm — especialização de Usuario (papel=comprador)
- **ItemCarrinho** *(nova na v1)* — id, quantidade, precoUnitario — composição de Carrinho
- **Pedido** — id, numero, status {pendente, confirmado, cancelado}, total, criadoEm
- **ItemPedido** — id, quantidade, precoUnitario, subtotal — composição de Pedido
- **Pagamento** — id, metodo {pix_simulado}, valor, status {aprovado, recusado}, dataPagamento — 1:0..1 com Pedido *(status/metodo simplificados na v1 — sem `pendente` nem `cartao_simulado`)*
- **Avaliacao** — id, nota {1..5}, comentario [0..1], criadoEm
- **ServicoRecomendacao** *(serviço externo, não persistido)* — módulo de IA consumido via API

### Relacionamentos
Usuario 1:0..1 PerfilArtesao (se papel=artesao) · Usuario 1:0..1 Carrinho (se
papel=comprador) · Usuario(artesao) 1:N Produto · Categoria 1:N Produto ·
Produto 1:N ProdutoFoto (composição) · Carrinho 1:N ItemCarrinho (composição)
· ItemCarrinho N:1 Produto · Usuario(comprador) 1:N Pedido · Pedido 1:N
ItemPedido (composição) · ItemPedido N:1 Produto · Pedido 1:0..1 Pagamento ·
Usuario(comprador) 1:N Avaliacao · Produto 1:N Avaliacao · Produto ···>
ServicoRecomendacao (dependência/uso via API). Diagrama de Classes completo
(Mermaid) no arquivo `sprints/semana-02-03/03-Modelo-Conceitual-BD.md`.

### Próximo passo (implementação na sprint semanas 6–7)
Confirmado em 27/08/2026 com o Pedro (orientação do professor): código de
implementação só começa na sprint semanas 6–7, não na sprint 4–5 atual.
Modelo lógico + script DDL executável + dados sintéticos serão derivados
deste conceitual **na sprint 6–7**. Nesta sprint 4–5 o trabalho de BD fica
restrito a eventual refinamento conceitual, se necessário — sem gerar
schema/DDL ainda.

---

## 8. Contratos de API *(vivo — manter atualizado)*

OpenAPI gerado dos validators Zod em `backend/src/docs/openapi.ts`.
Swagger UI: `GET /docs`. Documento: `GET /docs/openapi.json`.
Toda alteração de rota atualiza o OpenAPI neste mesmo trabalho.
O teste `backend/tests/unit/openapi.test.ts` compara métodos e paths registrados.

Rotas implementadas e documentadas na WEB-15, em 15/10/2026:

| Endpoint | Método | Acesso e descrição |
|---|---|---|
| `/health` | GET | Público; saúde do PostgreSQL |
| `/auth/register`, `/auth/login`, `/auth/logout` | POST | Cadastro, sessão e encerramento idempotente |
| `/auth/me` | GET | Autenticado; sessão atual |
| `/categorias`, `/tecnicas`, `/regioes` | GET | Público; referências do catálogo |
| `/produtos`, `/produtos/:id` | GET | Público; catálogo filtrado e detalhe visível |
| `/usuarios/:id/perfil-artesao` | GET/PATCH | Público para leitura; próprio artesão para edição |
| `/carrinho` | GET | Comprador; próprio carrinho |
| `/carrinho/itens` | POST | Comprador; soma quantidade ao item |
| `/carrinho/itens/:produtoId` | PATCH/DELETE | Comprador; define quantidade ou remove item |
| `/pedidos` | GET/POST | Comprador; próprios pedidos ou checkout transacional |
| `/pedidos/:id` | GET | Comprador; próprio pedido, itens e pagamento simulado |
| `/artesao/produtos` | GET | Artesão; próprios produtos, inclusive ocultos |
| `/produtos` | POST | Artesão; cria próprio produto |
| `/produtos/:id` | PATCH/DELETE | Próprio artesão ou admin; edição e soft delete |
| `/produtos/:id/estoque` | PATCH | Próprio artesão ou admin; estoque transacional |
| `/artesao/notificacoes` | GET | Artesão; próprias notificações |
| `/artesao/notificacoes/:id/lida` | PATCH | Artesão; marca própria notificação como lida |
| `/admin/artesaos`, `/admin/produtos` | GET | Admin; listagens para moderação |
| `/admin/artesaos/:id/moderar`, `/admin/produtos/:id/moderar` | PATCH | Admin; moderação reversível |
| `/admin/usuarios/:id/papel` | PATCH | Admin; troca entre comprador e artesão |
| `/recomendacoes` | GET | Público; produto opcional e fallback geral |
| `/recomendacoes/para-mim` | GET | Comprador; próprio histórico, sem `usuarioId` externo |

A sessão usa exclusivamente o cookie HttpOnly `origem_sessao`.
Faça login pelo mesmo domínio utilizado pelo Swagger.
O backend não usa prefixo `/api`; o proxy frontend usa.
Respostas, exemplos e erros vigentes constam no OpenAPI.

O contrato detalhado permanece em `sprints/semana-02-03/04-Contratos-de-API.md`.
Rotas propostas naquele documento não representam implementação disponível.
Permanecem propostas: `/usuarios/:id`, indicadores, escrita de avaliações,
status de pedidos e consulta isolada de pagamento.
Pagamento vigente integra `GET /pedidos/:id`.

---
## 9. Status atual do squad *(vivo — quadro completo será mantido no Jira; aqui fica só um resumo)*

| Disciplina | Entrega em foco | Semana prevista | Status | Dependências pendentes |
|---|---|---|---|---|
| Requisitos | Histórias (MoSCoW) + Diagrama de Casos de Uso + Tarefas SMART | 2–3 | ✅ v2 (revisada 26/08/2026; Tarefas SMART de implementação + cronograma de 6 sprints acrescentados 01/09/2026, aplicados ao `.md` em 14/09/2026 — 57 tarefas · 284h) | — |
| BD | U1: conceitual → lógico → migrations · Sprint 4: modelo físico · **Sprint 5: consultas otimizadas** | 2–3 até 6–7 · 10–11 · **12–13** | ✅ **Fechado para U1** — ver `docs/docs auxiliares/DATA_MODEL.md`. ✅ **Sprint 4 concluída** (PI4-28): modelo físico, reconciliação com o lógico, `Tecnica`/`Regiao`, índices, seeds de demo e de volume, `Notificacao`. 🔄 **Sprint 5:** p95 da busca, agregação de vendas por artesão, índices de suporte (`docs/10-Subtarefas-Jira-Sprint12-13.md` §3) | — |
| Web | AV1 (Fake API) · Sprint 4 (integração das camadas) · **Sprint 5: fluxos do artesão e avaliações** | 6–7 até 10–11 · **12–13** | ✅ **AV1 entregue** (26/09). ✅ **Sprint 4 concluída** (18/10): auth, autorização, carrinho e checkout reais, notificação assíncrona, cache e Swagger (PI4-27). 🔄 **Sprint 5:** pedidos recebidos, avaliação com compra verificada, painel de vendas, foto de perfil (`docs/10-Subtarefas-Jira-Sprint12-13.md` §4) | Distribuição de commits entre os 8 integrantes (`docs/07` §4) |
| FCCPD | U1: backend mínimo (concorrência + fila) · **U2: arquitetura distribuída e paralelismo** | 6–7 · **12–13** | ✅ **U1 entregue em 20/09/2026.** Evidência de concorrência regravada após a auth na Sprint 4 (WEB-10). 🔄 **U2:** PI4-30 — concorrência no checkout integrado, worker separado, diagrama distribuído e 2 benchmarks (`docs/10-Subtarefas-Jira-Sprint12-13.md` §1) | Rubrica oficial da U2 ainda não colada no contexto |
| IA | U1: baseline + Strategy + endpoint · **U2: módulo integrado via API** | 2–3 até 6–7 · 10–11 · **12–13** | ✅ **Fechado para U1.** ✅ **Sprint 4 concluída** (PI4-29): recomendação consumida pelo app via HTTP e `GET /recomendacoes/para-mim`. 🔄 **Sprint 5:** métricas na massa ampliada e o que restar da integração (`docs/10-Subtarefas-Jira-Sprint12-13.md` §5) | — |

> Documentos de apoio desta sprint: ver seção 10.

---

## 10. Estrutura de pastas e documentos de apoio

*(Reorganizado em 2026-08-20 — mantenha essa convenção nas próximas sprints.)*

```
Projeto integrador/
├── CLAUDE.md                              ← este arquivo (base/contexto vivo)
├── PI_Origem_Setup_Workspace_Claude.md    ← guia de setup do workspace Claude (base)
├── sprints/
│   └── semana-02-03/                      ← entregáveis OFICIAIS desta sprint
│       ├── 02-Historias-de-Usuario.md
│       ├── 03-Modelo-Conceitual-BD.md
│       └── 04-Contratos-de-API.md
│   └── semana-04-05/                      ← (próxima sprint — criar quando chegar lá)
└── docs/                                  ← reforços além do mínimo, contexto/norte reutilizável
    ├── 01-Escopo-e-Analise-de-Dominio.md
    ├── 05-Concorrencia-e-IA-Baseline.md
    ├── 06-Telas-e-Rastreabilidade.md
    ├── 07-Especificacao-Disciplina-Web.md
    ├── 08-Subtarefas-Jira-Sprint06-07.md
    ├── 09-Subtarefas-Jira-Sprint08-09.md
    ├── 10-Plano-Sprint4-Subtarefas-Jira-Semanas10-11.md   ← Sprint 4 (concluída)
    └── 10-Subtarefas-Jira-Sprint12-13.md                  ← Sprint 5 (19–30/10)
```

**Por que essa divisão:** `CLAUDE.md` e o guia de setup ficam na raiz porque
são a base que não muda de sprint pra sprint. `sprints/semana-XX-YY/` guarda
exatamente os entregáveis formais que a planilha de sprints pede em cada
período (só isso — o que a rubrica/roadmap cobra literalmente). `docs/` junta
material de apoio que vai além do mínimo pedido, mas que serve de contexto e
norte para qualquer sprint futura (escopo/domínio, concorrência/IA,
rastreabilidade) — não é "entregável de uma semana", é referência permanente.
**Convenção para as próximas sprints:** entregável formal → `sprints/semana-XX-YY/`;
material de apoio/reforço → `docs/` (se for algo novo) ou atualização de um
arquivo já existente em `docs/`.

### Conteúdo de cada documento

1. **`sprints/semana-02-03/02-Historias-de-Usuario.md`** — backlog completo (20
   histórias, 19 ativas), formato Como/Quero/Para com critérios de aceitação
   orientados a cenário (Dado/Quando/Então), priorização MoSCoW, Tarefas SMART
   de implementação por história (57 tarefas · 284h) e cronograma de 6 sprints
   quinzenais (01/09–20/11/2026), acrescentados em 14/09/2026.
2. **`sprints/semana-02-03/03-Modelo-Conceitual-BD.md`** — entidades,
   atributos, relacionamentos e diagrama ER (Mermaid).
3. **`sprints/semana-02-03/04-Contratos-de-API.md`** — contrato de todos os
   endpoints REST, com payloads, papéis de acesso e formato de erro.
   `sprints/semana-02-03/Origem_Sprint_Semana02-03.pdf` é um **snapshot em PDF**
   consolidando os 3 documentos acima (capa, sumário, 3 partes), gerado em
   2026-08-20 pra levar ao checkpoint da semana 3. Os `.md` continuam sendo a
   fonte viva/editável e mantêm notas de processo/atenção pro Pedro — o PDF é
   uma versão limpa (sem essas notas internas), pronta pra apresentar ao
   professor.
4. **`docs/01-Escopo-e-Analise-de-Dominio.md`** — personas, categorias, decisão
   de expansão regional, atores e casos de uso.
5. **`docs/05-Concorrencia-e-IA-Baseline.md`** — quatro pontos de
   concorrência definidos (checkout, edição manual de estoque, moderação do
   admin, nota média de avaliações — add. 31/08/2026), candidatos a fila
   assíncrona, baseline do módulo de recomendação e, na seção 4, o
   desenho (conceitual) do script de teste de concorrência com
   `Promise.all` que cobre os quatro pontos, pronto pra plugar nos
   endpoints reais na semana 6–7.
6. **`docs/06-Telas-e-Rastreabilidade.md`** — cruza telas previstas × histórias
   × entidades × endpoints, para comprovar que o modelo e a API cobrem todos
   os fluxos. Foi assim que apareceu a lacuna do endpoint de indicadores do
   artesão (US07), já corrigida no contrato de API.
7. **`docs/08-Subtarefas-Jira-Sprint06-07.md`** — material de apoio (não é
   entregável formal) quebrando os 4 tickets-pai do quadro Jira da Sprint
   6-7 (Web, BD, Baseline de IA, Concorrência/FCCPD) em 28 subtarefas, com
   nome, descrição e tipo de evidência a anexar em cada uma — gerado em
   14/09/2026 a partir do backlog SMART e do mapeamento de concorrência/IA.

> A partir da sprint 4-5, a documentação de setup técnico vive em
> `docs/07-Especificacao-Disciplina-Web.md` (especificação oficial da
> disciplina de Web) e `sprints/semana-04-05/01-Arquitetura-e-Stack-Setup.md`
> (arquitetura, padrões, testes, storage e hospedagem) — ver seção 6 para o
> resumo das decisões.

**Status geral (atualizado 14/09/2026):** as histórias de usuário foram
revisadas para v1 definitiva em 26/08/2026 (formato de cenário Dado/Quando/
Então, com diagrama de casos de uso, a partir do PDF definitivo enviado pelo
Pedro) e evoluíram para v2 em 14/09/2026, com Tarefas SMART de implementação
e cronograma de 6 sprints quinzenais (01/09–20/11/2026) — ver seção 9 e
`02-Historias-de-Usuario.md`; o contrato de API já passou por duas revisões
reais (27/08 e 31/08, esta última cruzada linha a linha contra o backlog
definitivo); e a arquitetura/stack de setup técnico foi aprovada pelo Pedro em
31/08/2026 (ver seção 6). Nada disso é código ainda — é definição/
documentação, conforme o roadmap oficial pede para as semanas 2–5 — mas não
está mais "esperando validação inicial": já foi revisado, cruzado contra os
requisitos e aprovado nos pontos que precisavam de decisão do Pedro. A
implementação de código começa nas semanas 6–7.

> ⚠️ **Ponto de atenção (14/09/2026, não resolvido):** o cronograma de 6
> sprints quinzenais das Tarefas SMART (`02-Historias-de-Usuario.md` seção 4)
> começa em 01/09/2026, com a primeira tarefa de código (T01.1) datada até
> 04/09/2026 — dentro da janela oficial de semanas 4–5 (24/ago–04/set), que é
> só setup/documentação, sem código, conforme confirmado com o Pedro em
> 27/08/2026 (ver log de decisões, seção 6). Vale confirmar com o Pedro se
> esse cronograma interno de sprints (Sprint 1–6) é só um planejamento de
> esforço em paralelo ao roadmap oficial de semanas, ou se muda a data real
> de início do código.

**O que ficou de fora de propósito (não é escopo desta sprint):** modelo
lógico/DDL executável, decisões formais de arquitetura (SOLID/GRASP/padrões),
plano de testes completo — tudo isso é setup técnico (semanas 4–5) ou
fechamento de U1 (semanas 8–9), conforme o roadmap oficial.

**Nota:** o Claude não tem acesso de push ao repositório GitHub — se você
quiser levar `docs/` e/ou o conteúdo de `sprints/` para dentro do repositório
de código (ex. em `/docs`), isso é manual, por sua conta.
