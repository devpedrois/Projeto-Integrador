# Declaração de uso de IA

## WEB-15: documentação OpenAPI da Sprint 4

Em 15/10/2026, Codex implementou somente a WEB-15.
Leu AGENTS.md, WEB-15, contratos, CLAUDE.md §8, rotas e validators.
Utilizou as skills using-superpowers, test-driven-development,
systematic-debugging e verification-before-completion.
O responsável escolheu revisão equivalente nesta conversa, sem delegação.

O OpenAPI 3.1 deriva dos validators Zod existentes.
Schemas de resposta, exemplos e erros ficam no módulo OpenAPI.
Swagger UI usa assets locais e cookie HttpOnly como segurança.
Os contratos e CLAUDE.md §8 receberam as rotas vigentes.
Exceções restritas no gitignore permitem versionar os documentos solicitados.

TDD: cinco testes inicialmente falharam com HTTP 404.
Sete testes finais verificam cobertura, exemplos, metadados e segurança.
A comparação usa os métodos e paths registrados no Express.
Uma mutação controlada confirma detecção de rota e método ausentes.
O navegador abriu o Swagger com 36 operações, sem erros.
Lint, typecheck e 539 testes backend passaram em 53 arquivos.

Revisão equivalente verificou sessão, exposição de dados e CSP.
Nenhum achado novo bloqueante foi identificado na WEB-15.
npm audit apontou sete vulnerabilidades em dependências preexistentes.
Nenhuma versão preexistente foi alterada nesta subtarefa.
São um alerta moderado, cinco altos e um crítico.
Não houve migração no schema público, commit, push ou deploy.
A validação remota de `/docs` permanece pendente da publicação.
Evidências: `evidencias/PI4-27-W10-Documentacao-API/WEB-15/`.

## 1. Declaração geral

A equipe utilizou ferramentas de Inteligência Artificial durante o Projeto
Integrador Origem.

- [x] Sim
- [ ] Não

O uso ocorreu como apoio técnico orientado pela equipe. As ferramentas
auxiliaram pesquisas, organização, documentação, implementação, testes e
revisões. As decisões finais permaneceram sob responsabilidade humana.

Este registro reúne os usos principais e materialmente relevantes. Interações
pequenas, sem impacto no resultado, foram agrupadas. O conteúdo incorporado foi
revisto, adaptado e validado antes da entrega.

## 2. Ferramentas utilizadas

| Ferramenta  | Finalidade de uso                                                             | Integrantes que utilizaram |
| ----------- | ----------------------------------------------------------------------------- | -------------------------- |
| Codex       | Apoio em documentação, implementação, testes, revisão e evidências            | Luiz, Ricardo e Eduardo    |
| Claude Code | Apoio em documentação, análise arquitetural e correções orientadas por testes | Pedro, Sérgio e Luiza      |

## 3. Registro dos principais usos

Os membros produziram, integraram e validaram as entregas. A IA atuou como
apoio crítico. Ela revisou código escrito pelos integrantes, encontrou bugs e
sugeriu correções de arquitetura, separação de camadas e estrutura do código.
Cada alteração aproveitada permaneceu sujeita à decisão do autor responsável.

| Data ou período         | Etapa                                    | Participação dos membros                                                                                                                                                           | Apoio da IA                                                                                                                                            | Aproveitamento e validação                                                                                                                   |
| ----------------------- | ---------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------- |
| 20/08/2026 a 14/09/2026 | Entendimento, arquitetura e documentação | Pedro Monteiro, Sérgio, Luiza e Eliziane consolidaram materiais, definiu prioridades e aprovou decisões técnicas                                                                   | Claude Code comparou fontes, organizou documentos e apontou inconsistências arquiteturais                                                              | Pedro adaptou as sugestões. As decisões foram conferidas nos materiais oficiais e documentos vivos                                           |
| 14/09/2026              | Organização das subtarefas               | Pedro Monteiro definiu escopo, dependências e critérios. Os membros receberam tarefas delimitadas por área                                                                         | Codex transformou o backlog em roteiros executáveis e verificou consistência entre 28 subtarefas                                                       | A equipe utilizou os roteiros como apoio. Cada integrante permaneceu responsável pela própria implementação                                  |
| 14/09/2026 a 15/09/2026 | Backend mínimo, pedidos e fila           | Pedro Monteiro implementou e integrou o backend, checkout transacional, fila e evidência concorrente                                                                               | Codex apoiou TDD, revisou camadas e corrigiu bugs encontrados durante migration, seed, conexão e encerramento de recursos                              | Pedro, Luiza e Sérgio revisaram o código. Testes reais, lint, typecheck, build, health check e três rodadas concorrentes validaram a entrega |
| 15/09/2026              | Banco de dados                           | Eduardo Borges expandiu o schema Prisma. Ricardo Severiano criou o seed e os testes de integridade. Pedro Monteiro integrou a migration                                            | Codex revisou relacionamentos, constraints e compatibilidade. Também sugeriu correções na arquitetura e na estrutura do código produzido pelos membros | Eduardo, Ricardo e Pedro validaram schema, dados e constraints contra PostgreSQL real                                                        |
| 15/09/2026 a 16/09/2026 | Base do frontend e Fake API              | Pedro Monteiro implementou usuários, cadastro, sessão, guardas, formulário e gestão de produtos. Luiz Henrique Rocha implementou recomendações do catálogo                         | Codex revisou componentes, contratos, services e repositories. Corrigiu bugs de validação, separação de responsabilidades e persistência local         | Os autores ajustaram as sugestões. Testes unitários e de componentes verificaram papéis, erros e persistência                                |
| 16/09/2026 a 17/09/2026 | Busca, filtros e carrinho                | Andrews Queiroz implementou a busca textual. Sérgio Chousinho implementou o carrinho persistente. Pedro Monteiro integrou filtros, estados recuperáveis e visibilidade por estoque | Codex apoiou revisão dos hooks e stores. Também sugeriu correções nos fluxos de vazio, erro, URL e estoque                                             | Andrews, Sérgio e Pedro revisaram a integração. Testes cobriram busca, filtros, persistência e total do carrinho                             |
| 17/09/2026 a 18/09/2026 | Recomendação                             | Pedro Monteiro implementou Strategy, endpoint e métricas. Luiza Vieira implementou o fallback geral. Eliziane Mota implementou o reforço regional                                  | Codex revisou consultas e arquitetura Strategy. A IA ajudou a corrigir agregação SQL, ordenação determinística e integração entre camadas              | Pedro, Luiza e Eliziane validaram regras, desempates, fallback, região e métricas com dados reais                                            |
| 18/09/2026 a 19/09/2026 | Integração real da fila                  | Pedro Monteiro integrou o bootstrap, publicador periódico e encerramento limpo da fila                                                                                             | Claude Code identificou lacunas entre código isolado e servidor real. Também apoiou correções estruturais no bootstrap e ciclo de vida                 | Pedro avaliou e incorporou os ajustes. Testes verificaram reinício, idempotência, retry e publicação automática                              |
| 20/09/2026              | Declaração de uso de IA                  | Pedro Monteiro revisou os registros e relacionou cada entrega aos membros responsáveis                                                                                             | Codex consolidou o documento e comparou histórico, arquivos e requisitos                                                                               | Informações genéricas ou sem evidência foram descartadas antes da entrega                                                                    |
| 22/09/2026              | Checkout e confirmação simulada          | Pedro Monteiro implementou e integrou o fluxo. O trabalho reutilizou o carrinho persistente criado anteriormente por Sérgio Chousinho e as regras definidas pela equipe            | IA generativa auxiliou na transformação da subtarefa em prompt, criação inicial de testes, revisão do fluxo e identificação de casos de manipulação    | Pedro decidiu a estrutura final, revisou o código e validou pedido, estoque, confirmação, erros e limpeza do carrinho                        |
| 23/09/2026              | Limite de estoque no carrinho            | Pedro Monteiro corrigiu o comportamento sobre a implementação existente e integrou mensagens nas telas. O fluxo aproveitou vitrine, busca e carrinho construídos pela equipe       | IA generativa ajudou a localizar o bug, enumerar casos de borda e sugerir correções no store e nos pontos de chamada                                   | Pedro analisou as sugestões e manteve a regra centralizada. Testes comprovaram limites e preservação do estado após bloqueios                |
| 23/09/2026              | Formulário do perfil do artesão          | Pedro Monteiro implementou repository, service, validação, formulário e persistência. As opções de técnica e região vieram do domínio definido coletivamente                       | IA generativa apoiou o prompt, a estrutura inicial dos arquivos e a revisão de propriedade, validação e acessibilidade                                 | Pedro adaptou o conteúdo ao domínio, impediu alteração de outra conta e validou persistência, campos e navegação por teclado                 |
| 23/09/2026              | Regra de perfil completo                 | Pedro Monteiro definiu e implementou a função pura, o indicador visual e sua integração ao painel                                                                                  | IA generativa sugeriu combinações de teste e separação da regra fora dos componentes                                                                   | Pedro confirmou quais campos determinam completude e validou os estados completo e incompleto                                                |
| 23/09/2026              | Página pública do artesão                | Pedro Monteiro implementou rota, hook de composição e estados da página. Produtos, perfis e visibilidade reutilizaram serviços construídos pela equipe                             | IA generativa apoiou a composição inicial, revisão arquitetural e tratamento de loading, erro, vazio, inexistente e sucesso                            | Pedro revisou a integração e validou perfis completos, incompletos, produtos indisponíveis e responsividade                                  |
| 23/09/2026              | Cards ligados ao perfil do artesão       | Pedro Monteiro integrou a navegação e extraiu o componente compartilhado. A mudança preservou busca, vitrine, recomendação e carrinho desenvolvidos anteriormente                  | IA generativa identificou duplicação estrutural e sugeriu a correção arquitetural com `ProdutoCard`, hooks de nomes e testes de regressão              | Pedro aprovou a refatoração, descartou mudanças fora do escopo e conferiu links, filtros, estoque e comportamento existente                  |

Na Sprint 08-09, os commits 01 a 06 foram integrados por Pedro Monteiro. Eles
não partiram do zero. O trabalho reutilizou contribuições anteriores de Sérgio
Chousinho, Andrews Queiroz, Luiz Henrique Rocha e demais integrantes. Os prompts
organizaram a execução, mas não substituíram autoria, decisões ou validação.

## 4. Prompts ou descrições relevantes

### 4.1 Organização das subtarefas

**Resumo do pedido:** criar um roteiro por subtarefa Jira. Cada roteiro deveria
delimitar arquivos, dependências, testes, evidências e mensagem de commit.

**Como a resposta foi utilizada:** a equipe adotou os roteiros como guias de
execução. Antes do uso, conferiu os requisitos e ajustou divergências encontradas
no repositório.

### 4.2 Backend mínimo FCCPD

**Resumo do pedido:** criar um backend mínimo com Express, TypeScript, Prisma e
PostgreSQL. A solicitação incluiu migration, seed idempotente, health check,
validação de ambiente e testes contra banco real.

**Como a resposta foi utilizada:** a estrutura proposta foi implementada e
adaptada ao domínio reduzido. A equipe descartou ampliações prematuras, mantendo
autenticação, pagamento e funcionalidades completas fora dessa etapa.

### 4.3 Checkout concorrente e fila

**Resumo do pedido:** implementar criação atômica de pedidos com bloqueio
pessimista. Também criar uma fila persistente, recuperável e idempotente para
notificações sintéticas.

**Como a resposta foi utilizada:** foram aproveitados o fluxo transacional, a
intenção persistente e os testes concorrentes. A equipe ajustou integração,
encerramento de recursos e comportamento durante reinícios.

### 4.4 Correção da inicialização assíncrona

**Resumo do pedido:** iniciar fila e worker no bootstrap real. Depois, publicar
intenções pendentes periodicamente, sem enviar mensagens externas.

**Como a resposta foi utilizada:** a equipe incorporou a inicialização e a
publicação automática. Alterações em módulos não relacionados foram excluídas.

### 4.5 Frontend da Avaliação 1

**Resumo do pedido:** estruturar um frontend Next.js, React e TypeScript com
Fake API substituível. O escopo incluiu cadastro, login, sessão, rotas por
papel, catálogo, busca, filtros, carrinho e recomendação local.

**Como a resposta foi utilizada:** a equipe aproveitou componentes, hooks,
stores, contratos e services. Os dados sintéticos ficaram nos repositories e
seeds do navegador. Páginas não receberam listas fixas. Formulários, buscas e
leituras receberam validação, loading, sucesso, vazio e erro recuperável.

O login e a sessão atuais são simulações autorizadas para a Avaliação 1. Eles
não representam autenticação real. A recomendação visível usa um adapter local.
A Strategy oficial continua no backend, consultando PostgreSQL real.

### 4.6 Revisão do código produzido pelos membros

**Resumo do pedido:** revisar entregas criadas pelos integrantes. A revisão
deveria localizar bugs, incompatibilidades e problemas na arquitetura ou na
estrutura do código. Depois, deveria sugerir correções limitadas ao escopo.

**Como a resposta foi utilizada:** a IA apoiou correções em validações,
persistência local, estados do frontend, consultas SQL, separação entre
services e repositories, aplicação do padrão Strategy e inicialização da fila.

Os membros responsáveis analisaram cada sugestão. Eles adaptaram ou descartaram
as mudanças antes da integração. Os testes foram executados novamente após as
correções. Assim, a IA funcionou como revisora e ferramenta de apoio. A autoria,
a decisão técnica e a validação permaneceram com a equipe.

### 4.7 Sprint 08-09 até o commit 06

Os prompts generativos foram produzidos a partir do backlog, documentos do
projeto e código existente. Cada prompt delimitou uma subtarefa. Também indicou
testes, arquivos relevantes, riscos, evidências e itens fora do escopo.

| Commit | Tarefa delegada à IA                                      | Contribuição humana determinante                                                                                                       |
| -----: | --------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
|     01 | Apoiar checkout simulado, criação do pedido e confirmação | Pedro definiu a integração, revisou preços e identidade, executou testes e decidiu manter o carrinho visitante como limitação separada |
|     02 | Investigar e corrigir quantidades acima do estoque        | Pedro escolheu centralizar a regra no store, revisou mensagens e preservou estado e storage nas falhas                                 |
|     03 | Apoiar a estrutura do perfil do artesão                   | Pedro alinhou campos ao domínio, conectou opções existentes e validou propriedade, acessibilidade e persistência                       |
|     04 | Sugerir regra testável para perfil completo               | Pedro confirmou a regra de negócio, aprovou a função pura e integrou o indicador ao painel                                             |
|     05 | Apoiar a página pública do artesão                        | Pedro compôs serviços existentes, definiu estados da interface e validou visibilidade e responsividade                                 |
|     06 | Revisar duplicação dos cards e sugerir refatoração        | Pedro aprovou a extração de `ProdutoCard`, preservou comportamentos e validou os links aos perfis corretos                             |

Houve geração de código, testes e sugestões pelos assistentes. Porém, o código
gerado não foi incorporado automaticamente. Pedro e os demais responsáveis
leram, adaptaram, corrigiram ou descartaram as sugestões. A IA também foi usada
para corrigir bugs e problemas estruturais encontrados em código previamente
produzido pelos membros.

### 4.8 Sprint 10-11, BD-02

Pedro definiu o escopo e a ordem da migration `reconciliar_modelo_logico`.
O assistente inspecionou schema, migrations e dados do Neon de
desenvolvimento. Ele escreveu primeiro os testes que falhavam. Depois gerou a
migration com SQL manual para checks e o índice funcional `lower(email)`.
Também criou `UsuarioService` com normalização de email, sem rota nova, e
ajustou as fixtures de teste para os novos `NOT NULL`. O `security-auditor`
apontou riscos com dados legados. A pedido de Pedro, a migration ganhou
preflight, desativação dos produtos preenchidos pelo backfill e normalização
dos emails existentes. Os cenários foram testados em transação com rollback.
Lint, typecheck, a
suíte completa e o script de concorrência passaram. A revisão humana do diff
fica com Pedro antes do commit.

## 5. Partes apoiadas por IA

- [x] Entendimento do problema
- [x] Pesquisa técnica
- [ ] Prototipação de telas
- [x] Estruturação do frontend
- [x] Componentização
- [x] Tipagem TypeScript
- [x] Consumo de API
- [x] Fake API
- [x] Backend
- [x] Banco de dados
- [ ] Autenticação real
- [x] Carrinho
- [x] Pedidos
- [x] Recomendação
- [x] Processamento assíncrono
- [ ] Cache
- [x] Testes
- [x] Documentação
- [x] README
- [ ] Deploy
- [x] Correção de bugs
- [x] Outro: organização de subtarefas e evidências

As marcações indicam algum apoio relevante. Elas não significam geração
integral ou aceitação automática do conteúdo dessas partes.

## 6. Validação humana

A equipe declara que:

- [x] O conteúdo gerado ou sugerido foi revisado.
- [x] O código incorporado foi testado antes da entrega.
- [x] A equipe compreende as partes implementadas com apoio.
- [x] A equipe consegue explicar as decisões técnicas adotadas.
- [x] Nenhuma parte relevante foi incorporada sem análise.
- [x] Limitações e sugestões inadequadas foram avaliadas.

As validações incluíram testes automatizados, lint, typecheck e build. Testes
de persistência, fila e concorrência utilizaram PostgreSQL real. Evidências não
incluíram credenciais, URLs secretas ou dados pessoais.

## 7. Limitações e problemas encontrados

- Algumas sugestões ampliavam o escopo além da subtarefa atual.
- A primeira execução dos testes encontrou bloqueio de rede ao Neon.
- Comandos Prisma na raiz tentaram utilizar uma versão incorreta.
- A fila existia isoladamente, mas faltava inicialização no servidor real.
- A publicação das intenções precisava permanecer fora da transação.
- Respostas sugeridas exigiram ajustes aos contratos e nomes existentes.
- Saídas documentais precisaram de revisão textual e visual humana.
- A sessão do frontend permanece sintética nesta avaliação.
- O adapter local não comprova a baseline oficial do backend.
- O carrinho de visitante ainda não migra automaticamente após login.

Esses casos foram corrigidos ou descartados antes da incorporação.

## 8. Responsabilidade da equipe

A equipe assume responsabilidade pelo código, documentação e decisões
entregues. O uso das ferramentas não substituiu compreensão, revisão, testes ou
validação humana.

Este documento deve permanecer atualizado durante o semestre.

## Registro de apoio em 13/10/2026 — BD-03

O responsavel solicitou somente a normalizacao de tecnica e regiao.
Depois da consulta aos textos reais, autorizou definir mapeamentos
para valores legados sem correspondencia nos seeds. Codex apoiou os
testes contra PostgreSQL, a migration transacional, o schema Prisma,
os seeds, as fixtures e a consulta regional por FK.

As escolhas sinteticas estao registradas em `DATA_MODEL.md`.
A fixture contratual e o ranking esperado foram preservados.
A revisao de seguranca foi local por escolha explicita do responsavel.
Resultados constam em `backend/prisma/evidence/bd03-validacao.md`.
Backend: lint, typecheck e 148 testes passaram. Frontend: typecheck e
669 testes passaram; lint apontou erro preexistente no arquivo gerado
`next-env.d.ts`. A migration foi aplicada no Neon apos autorizacao explicita.
Este registro nao atribui revisao humana ainda nao realizada.

## Registro de apoio em 13/10/2026 — BD-06

O responsavel solicitou somente a tabela tecnica `Notificacao`, seu
repository e testes de idempotencia. Codex apoiou testes escritos antes
da implementacao, migration transacional, modelo Prisma e insercao com
`skipDuplicates`. O handler da fila nao foi alterado.

A migration foi validada em schema isolado, com PostgreSQL real.
O responsavel autorizou sua aplicacao no Neon de desenvolvimento.
Os testes verificam reentrega, preservacao de dados e FKs inexistentes.
A revisao de seguranca segue local, conforme escolha do responsavel.
Evidencias desta subtarefa ficam em `evidencias/BD-06/`.
Lint, typecheck e 154 testes do backend passaram. A revisao local de
seguranca foi concluida. O schema aplicado esta alinhado ao Prisma.

## Registro de apoio em 13/10/2026 — BD-05

Codex apoiou somente a carga demo, a carga de volume e o util de senha.
Testes precederam a implementacao. O bcrypt nativo usa custo 10.
O catalogo demo preserva os seeds frontais por snapshot verificavel.
IDs textuais recebem UUIDs determinísticos; UUIDs validos sao preservados.
O campo vazio de regiao da Maria permanece nulo, sem dado inventado.
O gerador de volume usa seed fixa e insercoes em lote.
As guardas impedem execucao sem opt-in e no endpoint do deploy.
O responsavel confirmou a branch Neon de teste para schemas isolados.
A revisao de seguranca foi local, conforme escolha explicita.
Resultados e limites constam em `evidencias/BD-05/bd05-validacao.md`.

## Registro de apoio em 13/10/2026: WEB-01

O responsável delimitou a preparação do backend para produção.
Codex apoiou testes escritos antes da implementação e validação zod.
Também ajustou HOST, Helmet, build, start:prod e documentação.
O diretório `src/utils/` existente foi preservado.
O bootstrap pg-boss e as rotas existentes foram mantidos.
As novas variáveis preparam subtarefas posteriores, sem antecipá-las.

Build, lint e typecheck passaram.
A suíte passou com 198 testes em 29 arquivos.
Integrações utilizaram PostgreSQL real, sem mocks de repositories.
O binário compilado respondeu HTTP 200 via curl em produção.
Segredos JWT curtos ou ausentes impediram o boot.
As mensagens informaram somente nomes das variáveis inválidas.
O exemplo e as evidências não contêm credenciais reais.

O responsável escolheu revisão local equivalente ao security-auditor.
A revisão verificou diff, headers, boot e exposição de segredos.
O npm audit identificou seis vulnerabilidades preexistentes.
As versões afetadas foram comparadas com o lockfile original.
Correções dessas dependências ficaram fora da WEB-01.
Evidências constam em
`evidencias/PI4-27-W10-Integracao-Camadas/WEB-01-backend-producao/`.
Não houve deploy remoto, commit ou push nesta subtarefa.
Este registro não atribui revisão humana ainda não realizada.

O responsável também solicitou evidência visual da WEB-01.
Codex gerou um PNG usando saídas reais capturadas.
Build, lint, typecheck e testes de ambiente foram reexecutados.
O curl confirmou novamente health em produção com PostgreSQL.
A imagem foi inspecionada visualmente, sem credenciais reais.
Ela é uma transcrição identificada, sem simular captura de terminal.
O gerador e os registros ficam na pasta WEB-01.

## Registro de apoio em 13/10/2026: WEB-02

O responsável solicitou somente código e instruções manuais de deploy.
Codex escreveu testes antes do rewrite e do probe temporário.
BACKEND_URL permanece exclusiva do servidor, com ausência permitida.
Destinos inválidos recebem erro sanitizado, sem valores do ambiente.
ENABLE_COOKIE_PROBE exige boolean textual estrito e inicia desativado.
O cookie sintético usa HttpOnly, SameSite=Lax e Secure configurável.
Ele não define Domain e expira em cinco minutos.
O bootstrap pg-boss foi preservado.

O README frontal foi criado, incluindo variáveis e plano B.
O exemplo frontal permite desenvolvimento sem proxy configurado.
O contrato temporário foi registrado no módulo API.
O lint apontou somente erro preexistente em next-env.d.ts gerado.
O arquivo gerado passou a ser ignorado pelo ESLint.
Nenhuma regra de lint para código de produção foi desativada.

Frontend: build, lint, typecheck e 683 testes passaram.
Backend: build, lint, typecheck e 44 testes aplicáveis passaram.
O proxy Next.js real preservou Set-Cookie, com resposta local 200.
Essa verificação usou Express e Prisma reais, sem mocks.
O probe não consulta banco; nenhum banco remoto foi acessado.
Nenhum seed, deployment, commit ou push foi executado.
A revisão de segurança permaneceu local, conforme escolha anterior.
O plano B não foi aplicado.
A validação pública e a persistência na Vercel permanecem pendentes.
Evidências locais constam em
`evidencias/PI4-27-W10-Integracao-Camadas/WEB-02-deploy-proxy/`.

## Registro de apoio em 13/10/2026: WEB-03

O responsável delimitou cadastro, login, logout e consulta da sessão.
Codex leu AGENTS.md, D1, D6, WEB-03 e US01/US02.
Também consultou os contratos, SECURITY e o código existente.
As skills TDD, PostgreSQL e verificação orientaram a execução.
Documentação primária confirmou as APIs de JWT e transações.

Os testes supertest foram escritos antes da implementação.
Inicialmente, 33 cenários falharam pelas rotas ainda ausentes.
Dois testes do probe falharam por receberem HTTP 200.
Outros testes detectaram configuração legada e JSON malformado.
As correções passaram pelos respectivos testes de regressão.

Cadastro normaliza email, usa bcrypt custo 10 e restringe papel.
Usuário e especialização nascem na mesma transação PostgreSQL.
Triggers temporários forçam falha no segundo insert dos dois papéis.
Os testes confirmam rollback e permitem repetir o cadastro.
As fixtures usam schema isolado, removido após os testes.
Nenhum banco ou repository foi mockado.

Login emite JWT HS256 de 24h no cookie origem_sessao.
As três falhas exigidas possuem resposta idêntica byte a byte.
Email inexistente executa bcrypt real contra hash fixo sintético.
Sessão inválida, expirada ou de usuário desativado recebe 401.
Logout expira o cookie; consulta posterior recebe 401.
Nenhuma resposta contém senhaHash.
O cadastro não inicia sessão automaticamente.
O probe e ENABLE_COOKIE_PROBE foram retirados.
As instruções de proxy agora utilizam o login real.

Prettier, lint, typecheck e build passaram usando Node.js 24.
A suíte completa passou: 242 testes em 31 arquivos.
A nova suíte de autenticação cobre 36 cenários.
O PostgreSQL emitiu aviso preexistente sobre sslmode=require.
As credenciais locais não foram modificadas nem registradas.

O responsável recusou delegação e escolheu revisão nesta conversa.
A revisão equivalente verificou JWT, cookies, inputs e transações.
Também conferiu respostas públicas e o diff da subtarefa.
O npm audit identificou sete alertas em dependências preexistentes.
As versões afetadas coincidem com o lockfile anterior.
Nenhuma dependência de autenticação nova apareceu nos alertas.
Os metadados libc existentes foram preservados no lockfile.

JWT_SECRET é necessário para emitir sessão também em desenvolvimento.
Sem segredo válido, a autenticação falha de forma segura.
Logout descarta o cookie, sem revogação central de tokens copiados.
A proteção de pedidos permanece na WEB-04, conforme escopo.
Não houve commit, push ou deploy nesta entrega.
Evidências constam em
`evidencias/PI4-27-W10-Integracao-Camadas/WEB-03-autenticacao/`.
Este registro não atribui revisão humana ainda não realizada.

## Registro de apoio em 13/10/2026: WEB-04

O responsável delimitou middlewares e duas rotas protegidas.
Codex leu AGENTS.md, D6, WEB-04 e US01 cenário quatro.
Também leu SECURITY, CONCURRENCY e os componentes envolvidos.
TDD e regras PostgreSQL orientaram a implementação.
A branch codex/web-04-authorization isola a subtarefa.

A matriz supertest foi escrita antes do código.
Sua primeira execução apresentou 26 falhas e quatro sucessos.
Checkout concorrente com cookie recebeu 400 e 400 inicialmente.
Após implementar, 38 testes direcionados passaram.
A suíte completa passou: 273 testes em 32 arquivos.
Os testes usaram PostgreSQL real, sem mocks de repositories.

Autenticar valida JWT e popula res.locals.usuario com dados públicos.
Usuario ativo e papel atual são reconsultados no banco.
Sessão ausente, inválida, expirada ou desativada recebe 401.
ExigirPapel restringe checkout a comprador e alteração a admin.
O checkout aceita somente itens; compradorId vem da sessão.
A rota administrativa valida UUID e body estrito.
O alvo pode mudar entre comprador e artesao.
Admin não altera o próprio papel, inclusive UUID maiúsculo.
Nenhuma resposta inclui senhaHash.

Checkout e publicação automática foram adaptados para login real.
O teste concorrente preserva 201, 409 e estoque final zero.
Locks ordenados, transação e intenção persistente foram mantidos.
O script de concorrência não foi alterado nem executado.
Sua adaptação permanece no commit 17, conforme pedido direto.

Lint, typecheck, build e formatação aplicável passaram.
Nenhuma migration ou nova dependência foi introduzida.
Contratos e documentação registram a nova proteção.
A revisão de segurança permaneceu nesta conversa, conforme preferência.
Ela verificou identidade, papéis, JWT, schemas e exposição de dados.
A saída real e matriz estão na pasta WEB-04-autorizacao.
Não houve commit, push ou merge nesta subtarefa.

### Evidências adicionais da WEB-04

Codex coletou respostas reais com curl e PostgreSQL.
A coleta usou fixtures em schema temporário isolado.
O schema foi removido após as verificações.
A matriz confirmou oito respostas esperadas das rotas.
Sessões desativadas, inválidas e expiradas receberam 401.
Entradas extras e autoalteração administrativa foram rejeitadas.
Checkout concorrente confirmou 201, 409 e estoque zero.
TXT e JSON preservam resultados com cookies redigidos.
Cinco PNGs renderizam esses resultados, identificados como renderizações.
As imagens não representam capturas do site ou Neon.
Scripts e evidências adicionais estão na pasta WEB-04-autorizacao.
Esta coleta não alterou código produtivo nem o script legado.

## Registro de apoio em 13/10/2026: BD-04

O responsavel delimitou indices, consultas e evidencias PostgreSQL.
Codex leu AGENTS.md, BD-04, WEB-06 e os contratos indicados.
Tambem inspecionou schema, repositories e a branch Neon configurada.
As skills PostgreSQL, TDD e verificacao orientaram a implementacao.
A documentacao primaria confirmou pg_trgm e EXPLAIN com buffers.

O Neon publico tinha nove produtos, sem volume persistido.
As evidencias BD-05 registravam cargas em testes com rollback.
O responsavel autorizou recriar volume em schema isolado.
O script reaproveita a carga BD-05 sem alterar seus produtos.
Complementa intencoes, notificacoes e carrinhos originalmente vazios.
As medicoes criam e aplicam indices dentro da transacao.
Todas as comparacoes encerram com rollback integral.

Dez testes falharam inicialmente pelas consultas e indices ausentes.
Outros 17 falharam antes da implementacao do coletor.
Um teste adicional detectou termo inexistente na carga sintetica.
Outro detectou recusa indevida de tabelas operacionais vazias.
As correcoes passaram pelos respectivos testes de regressao.
Nenhum banco ou repository foi mockado.

Nove consultas SQL parametrizadas justificam os indices.
Categoria e carrinho preservam os indices preexistentes.
O indice simples de compradorId foi substituido pelo composto.
O parcial da vitrine permanece definido em migration SQL.
Os demais novos indices tambem constam no schema Prisma.
O script db:explain grava planos, buffers, parametros e tempos.
Ele recusa pasta ocupada e nao sobrescreve evidencias.
O modo padrao usa somente leitura e erros sanitizados.

A busca seletiva observou BitmapOr com ambos os GIN.
A busca por vaso preferiu o parcial e apresentou regressao.
Essa regressao e as escolhas naturais foram registradas integralmente.
Nenhuma medicao forca enable_seqscan=off.
Esses tempos isolados nao representam p95 ou latencia HTTP.

A primeira suite completa passou 300 testes e falhou num.
O retry da fila compartilhada observou tentativas insuficientes.
Sessoes pg-boss externas estavam ativas na mesma base.
O responsavel autorizou isolar somente esse teste.
O schema proprio preserva retry, restart e codigo produtivo.
A execucao isolada passou nos sete cenarios existentes.

A revisao de seguranca foi local, conforme escolha explicita.
Verificou inputs, parametros, isolamento, erros e ausencia de segredos.
Evidencias constam em evidencias/PI4-28-W10-Modelo-Fisico/BD-04-indices/.
Nao houve commit, push ou deploy permanente dos indices.

Lint, typecheck, build e formatacao passaram.
A suite final passou: 302 testes em 35 arquivos.
A CLI padrao executou as nove consultas em leitura somente.
Os schemas BD-04 e fila_test foram removidos ao terminar.
Nenhum indice BD-04 foi aplicado nas tabelas publicas.
pg_trgm permanece instalado pelo preparo dos testes de migrations.

O responsavel solicitou centralizar as evidencias junto das demais.
Codex moveu os arquivos para BD-04-indices, preservando os conteudos.
Atualizou links, comandos documentados e destino padrao do coletor.

O responsavel restringiu a entrega a tres itens.
A pasta BD-04-indices agora contem 18 TXT antes/depois.
Tambem contem 01-resumo-indices.md e 02-migration-indices.sql.
Os TXT preservam a saida PostgreSQL original em FORMAT JSON.
Todos os pares usam a mesma coleta seletiva existente.
Os arquivos adicionais foram preservados em evidencias/.historico/.
Nao houve nova medicao, alteracao de tempos ou acesso ao Neon.

## Registro de apoio em 14/10/2026: WEB-05

O responsavel delimitou cliente HTTP, container e sessao real.
Codex leu AGENTS.md, D1, D2, WEB-05 e documentos indicados.
Inspecionou contratos, armazenamento, guardas e formularios antes de escrever.
TDD, diretrizes React/Next.js e webapp-testing orientaram a implementacao.
Documentacao primaria confirmou middleware Next.js e AbortController.
A branch codex/web-05-http-session isola esta subtarefa.

Os primeiros 32 testes falharam antes da implementacao.
Quatro testes adicionais detectaram guarda antecipada e logout prematuro.
Tambem detectaram perda do destino de retorno apos login.
A revisao detectou mutacao local no carrinho HTTP pendente.
Um teste confirmou essa falha antes da correcao.
Outro teste detectou papel recebido como array indevidamente aceito.
Ambas as correcoes passaram pelos respectivos testes de regressao.

O cliente usa /api, cookies, JSON, timeout e erros sanitizados.
HttpUsuariosService implementa cadastro, login, logout e consulta da sessao.
O contrato anterior preserva compatibilidade por metodos adicionais opcionais.
O container respeita NEXT_PUBLIC_DATA_SOURCE e expoe PENDENTES_HTTP.
Adapters ausentes rejeitam explicitamente, sem fallback para fake.
O carrinho HTTP preserva somente estado vazio e bloqueia mutacoes.
SessionStore hidrata em /auth/me, sem consultar localStorage no HTTP.
Respostas atrasadas nao sobrescrevem login ou logout posteriores.
As guardas aguardam hidratacao e oferecem recuperacao de falhas.
Logout aguarda o backend e conserva sessao quando falha.
Middleware redireciona areas protegidas sem cookie no modo HTTP.
A checagem real de identidade e papel permanece na API.
Nenhuma assinatura publica de hook, componente ou pagina mudou.

O Chromium executou o fluxo com Next.js e Express reais.
O PostgreSQL real recebeu o cadastro em schema isolado.
Cadastro 201, login 200, me 200 e logout 204 foram capturados.
Reload restaurou o comprador mesmo com admin falso no localStorage.
O comprador recebeu acesso negado no painel administrativo.
Acesso sem cookie recebeu redirect 307 antes da pagina.
Apos logout, me recebeu 401 e admin voltou a redirecionar.
Cookie HttpOnly foi verificado sem registrar seu valor.
Servidores locais e schema de teste foram encerrados ao terminar.
Nenhum banco ou repository foi mockado nessa validacao.

O runtime Python nao incluia a biblioteca Playwright.
A validacao usou Playwright Node.js ja disponivel no runtime.
ffmpeg foi instalado somente para gravacao da evidencia visual.
Uma falha inicial de seletor foi corrigida sem alterar produto.
Os logs do sandbox registraram restricao de cache do Vitest.
Os testes rodaram com sucesso fora dessa restricao.

Lint, typecheck, formatacao e build passaram.
O build tambem passou com NEXT_PUBLIC_DATA_SOURCE=http.
A suite final passou: 720 testes em 75 arquivos.
A revisao equivalente de seguranca ocorreu nesta conversa.
Verificou inputs, DTOs, cookies, papéis, redirects e falhas recuperaveis.
Nao houve commit, push, deploy ou mudanca de backend.
Evidencias ficam em evidencias/PI4-27-W10-Integracao-Camadas/WEB-05-http-sessao/.

### 14/10/2026: WEB-06, catalogo publico HTTP

Codex implementou somente WEB-06, com TDD nas duas camadas.
Leu AGENTS.md, D3, WEB-06, US08, contratos, consultas BD-04,
types, services, hooks e regras de visibilidade/resumo existentes.
Usou skills de TDD, PostgreSQL, verificacao e testes web.
As consultas BD-04 foram consolidadas em SQL estatico parametrizado.
Implementou filtros, paginacao, detalhe, opcoes e leitura de avaliacoes.
ProdutoDTO centraliza Decimal, fotos, regiao, notas e vendas confirmadas.
O container registra os tres adapters HTTP de leitura.
PENDENTES_HTTP preserva escritas e listagem privada ainda nao implementadas.
Assinaturas dos hooks e componentes permaneceram iguais.

Testes de integracao usaram PostgreSQL real em schema isolado.
O helper configurou search_path para isolar tambem SQL parametrizado.
Nenhum banco ou repository foi mockado.
No frontend, fetch foi substituido apenas nos testes unitarios.
Um teste adicional comprovou no-store antes da correcao.
O contrato de tipos confirma compatibilidade ProdutoDTO/Produto.

Playwright Node.js validou Next.js, Express e PostgreSQL reais.
Comprovou busca com dois filtros e igualdade API/tela.
A URL copiada reproduziu o resultado em outra aba.
Verificou mobile, detalhe, estado vazio, moderacao e estoque zero.
A primeira tentativa parou na escolha de visitante.
O diagnostico ajustou somente a automacao ao fluxo existente.
Servidores locais e schema temporario foram encerrados no finally.

Pedro escolheu revisao equivalente de seguranca nesta conversa.
Foram revisados inputs, SQL, visibilidade, DTOs, cache e adapters.
Evidencias: evidencias/PI4-27-W10-Integracao-Camadas/WEB-06-catalogo/.
Validacao final: 329 testes backend e 734 testes frontend.
Lint, typecheck e Prettier passaram nos dois projetos.
O GIF foi extraido do video real via ffmpeg bundled.
Pillow apenas converteu seus quadros em animacao GIF.
Nao houve commit, push ou deploy.

### WEB-07: perfil do artesao integrado em HTTP

Codex implementou WEB-07 com testes escritos antes das rotas.
Leu AGENTS.md, WEB-07, US03 e US09.
Inspecionou contratos, fake, dominio, hooks e paginas existentes.
A branch codex/web-07-perfil-artesao isola a subtarefa.

A rodada inicial confirmou 21 falhas nas rotas ausentes.
Nove testes de adapters e tres de hooks falharam.
Restricoes locais exigiram permissao para Git e testes reais.
O PostgreSQL usou schema temporario com migrations existentes.
Nao houve mocks de banco nem de repositories.

GET publico projeta somente nome e campos do perfil.
PATCH autentica, exige artesao e confere propriedade pelo token.
Admin e terceiro recebem 403 nesta rota.
Schemas estritos limitam historia e validam IDs e foto.
O service porta a regra de completude do frontend.
Uma transacao preserva campos omitidos durante edicoes concorrentes.

O adapter HTTP entrou no container e saiu das pendencias.
Nomes usam a rota publica, evitando listar usuarios no perfil.
Produtos reutilizam o filtro artesaoId do catalogo existente.
A listagem geral da vitrine permanece fora desta subtarefa.

Playwright validou Next.js, Express e PostgreSQL reais.
Confirmou produto, perfil, produtos dele e exclusao de terceiros.
O formulario salvou e a pendencia desapareceu ao retornar.
PATCH de outro perfil retornou 403, preservando o banco.
As larguras 360, 768 e 1280 nao tiveram overflow.
O painel Network das capturas foi inserido pela automacao.
Ele apresenta chamadas reais, sem representar DevTools nativo.

O usuario escolheu revisao equivalente nesta conversa, sem delegacao.
A revisao conferiu projecao publica, propriedade, inputs e transacao.
Nao encontrou vazamento de credenciais nem elevacao de privilegios.
Suite completa: 367 testes backend e 773 frontend passaram.
Avisos preexistentes: SSL do pg e act no hook de artesaos.
Evidencias: evidencias/PI4-27-W10-Integracao-Camadas/WEB-07-perfil-artesao/.
Nao houve commit, push ou deploy.

### 14/10/2026: IA-01, contrato publico de recomendacoes

Codex implementou somente IA-01 usando TDD e regras PostgreSQL.
Leu AGENTS.md, secao quatro, IA-01 e RECOMMENDATION.md.
Inspecionou Strategy, fallback, repository, service, controller e ProdutoDTO.
Tambem leu tipos frontais e a fixture contratual compartilhada.
A branch codex/ia-01-recommendation-payload isola esta subtarefa.

Antes da implementacao, 12 testes falharam e cinco passaram.
O typecheck frontal comprovou incompatibilidade com RecomendacaoResultado.
Strategy agora retorna somente IDs ordenados e nome da estrategia.
O service hidrata produtos visiveis pela consulta publica existente.
Reconstroi a ordem e aplica exclusivamente mapearProdutoDTO.
Remove IDs repetidos e o proprio produto de contexto.
Resposta publica continua contendo estrategia e itens Produto completos.
Ranking da fixture, fallback e regras regionais foram preservados.
Metricas existentes foram adaptadas ao retorno de IDs.
Nenhuma metrica nova ou adapter HTTP foi implementado.

Testes novos usam PostgreSQL real em schema temporario isolado.
Nenhum banco ou repository foi mockado.
Contrato de tipos frontal e schema estrito validam o payload.
Testes comparam cada item ao detalhe publico do catalogo.
Cobrem fotos, Decimal, regiao, notas e vendas confirmadas.
Tambem verificam visibilidade, ordem e ausencia de autorrecomendacao.

Pedro escolheu revisao equivalente de seguranca nesta conversa.
A revisao conferiu inputs, SQL parametrizado, visibilidade e DTOs.
Nao houve achados de seguranca no diff revisado.
Evidencias ficam em evidencias/PI4-29-W10-Recomendacao-Integrada/IA-01-payload/.
Validacao final: 340 testes backend e 735 testes frontend.
Lint, typecheck e Prettier passaram nos dois projetos.
PostgreSQL emitiu aviso preexistente sobre sslmode=require.
Nao houve commit, push ou deploy.

### 14/10/2026: IA-02, recomendacoes HTTP e carrossel

Codex implementou somente IA-02 com TDD e diretrizes React.
Leu AGENTS.md, IA-02, T10.3, RECOMMENDATION e FAKE_API.
Inspecionou contratos, adapter local, hook, faixa, cards e detalhe.
A branch codex/ia-02-http-recommendations isola a subtarefa.

Antes da implementacao, 26 testes falharam e 18 passaram.
HttpRecommendationAdapter entrou no container e saiu de PENDENTES_HTTP.
O adapter valida contexto e reutiliza ApiClient e parser Produto.
Preserva estrategia e ranking recebidos, inclusive fallback-geral.
Exclui contexto, duplicados e invisiveis antes do limite oito.
Falhas HTTP continuam como erro visivel do hook existente.
O modo fake conserva o adapter local da AV1.

Peças relacionadas reutiliza ProdutoCard, links e acao existente.
FaixaRecomendacoes compartilha estados por renderer opcional.
Os links da faixa compacta agora abrem o produto.
Nenhuma regra nova de ranking ou historico foi implementada.
O backend produtivo permaneceu inalterado.

Playwright Node.js validou Next.js, Express e PostgreSQL reais.
O runtime Python nao possuia Playwright; Node.js ja estava disponivel.
Fixtures sinteticas ficaram em schema temporario isolado.
As chamadas /api/recomendacoes foram capturadas em Network JSON.
O painel visual foi adicionado somente pela automacao.
Ele identifica chamadas reais e nao representa DevTools nativo.
O GIF agrupa PNGs reais sem redesenhar o conteudo.
A resposta JSON tambem foi aberta e capturada no navegador.

A primeira coleta revelou cards encolhidos pelo minmax.
Medidas CSS comprovaram 27px por card na largura 360px.
Colunas fixas de 260px corrigiram as tres larguras.
Validacao final confirmou 360, 768 e 1280px sem overflow.
Tela e API exibiram os mesmos oito IDs ordenados.
Categoria e fallback excluiram o proprio produto.
HTTP 503 controlado mostrou alertas na vitrine e detalhe.
Servidores e schema temporario foram encerrados ao terminar.
Nenhum banco ou repository foi mockado na integracao.

A escolha anterior manteve a revisao equivalente nesta conversa.
Ela conferiu inputs, URLs, payloads, fotos e ausencia de fallback fake.
Nao houve achados de seguranca no diff revisado.
Suite final: 761 testes frontend em 78 arquivos.
Lint, typecheck, Prettier e build HTTP passaram.
Evidencias ficam em evidencias/PI4-29-W10-Recomendacao-Integrada/IA-02-http-carrossel/.
Nao houve commit, push ou deploy.

### WEB-08: carrinho persistido e mesclagem de visitante

Codex implementou somente WEB-08 na branch codex/web-08-carrinho-servidor.
Leu AGENTS.md, WEB-08, US11 e a limitacao Sprint 08-09.
Inspecionou store, storage, hooks, tipos, container e schema existentes.
Aplicou TDD, diretrizes React e transacoes PostgreSQL.

Testes Supertest foram escritos antes das rotas.
A primeira rodada confirmou 15 falhas funcionais esperadas.
Os testes de visitante confirmaram o redirecionamento impeditivo.
O adapter novo permitiu executar testes da store remota.
Todos os testes de banco usaram PostgreSQL real isolado.
Nao houve mocks de banco nem de repositories.

GET, POST, PATCH e DELETE do carrinho exigem comprador.
O carrinho vem da sessao; schemas rejeitam identidade externa.
POST soma; PATCH substitui; DELETE remove somente o item proprio.
Estoque atual e preco do banco orientam a escrita atomica.
Erro 409 informa somente produtoId e nome permitidos.
O middleware preserva esses detalhes sem expor erros internos.

CartStore aceita transporte remoto mantendo comportamento local.
Operacoes assincronas sao serializadas e aguardadas nas telas.
O container acompanha login, hidratacao, logout e troca de conta.
Visitantes agora adicionam produtos antes de autenticar.
Mesclagem limita soma ao estoque e descarta ocultos com aviso.
Itens confirmados saem do local antes do proximo item.
Falhas parciais preservam somente itens ainda nao processados.
Logout invalida respostas atrasadas, preservando persistencia no servidor.

Uma falha inicial do navegador mostrou seletor duplicado.
A automacao restringiu o clique ao produto principal.
Playwright confirmou visitante, mesclagem limitada e descarte com aviso.
Validou 409 com nome na tela e tres logins consecutivos.
Consultou ItemCarrinho real, preco capturado e remocao persistida.
Confirmou ausencia de overflow em 360, 768 e 1280px.
Capturas mostram chamadas HTTP reais em painel da automacao.
O painel nao representa DevTools nativo nem modifica o produto.

A revisao equivalente permanece nesta conversa conforme escolha anterior.
Conferiu autenticacao, propriedade, inputs, DTOs, locks e sessao.
Identificou erro de sincronizacao oculto fora da pagina do carrinho.
Um teste falhou antes da correcao do aviso recuperavel.
A retomada parcial passou sem duplicar itens ja confirmados.
Outro teste detectou IDs antigos rejeitados na leitura publica.
Agora sao descartados com aviso, preservando falhas de rede.
Nao foram encontrados achados restantes no escopo revisado.

Evidencias: evidencias/PI4-27-W10-Integracao-Camadas/WEB-08-carrinho/.
Suite final: 383 testes backend e 789 frontend passaram.
Lint, typecheck, Prettier e verificacao do diff passaram.
Avisos preexistentes: SSL do pg e act em use-artesaos-ativos.
Checkout real e demais pendencias HTTP ficaram fora do escopo.
Nao houve commit, push ou deploy.

## 2026-10-14 — WEB-09: checkout HTTP e pagamento simulado

Codex implementou somente WEB-09 com testes de integracao primeiro.
Leu regras, D6, WEB-09, concorrencia, seguranca, US12 e US20.
Usou TDD, praticas PostgreSQL, React e verificacao antes da conclusao.
Dez testes novos falharam antes da implementacao no PostgreSQL real.
Schemas isolados receberam migrations sem alterar dados do dominio existente.
O usuario autorizou depois aplicar a migration no banco DIRECT_URL.

Os itens continuam vindo do body. Identidade vem da sessao.
Locks do comprador precedem locks dos produtos ordenados por UUID.
Valores usam Decimal. Pedido, itens, pagamento, estoque, vendas,
limpeza do carrinho e outbox compartilham a transacao.
O numero vem de sequence do PostgreSQL e aparece no frontend.
Erro 409 identifica produtoId e nome. Nao existe gateway real.
O adapter HTTP descarta campos extras e valida o DTO recebido.
A confirmacao limpa estado local sem DELETE posterior ao pedido.

Um teste adicional detectou falha de hidratacao escondida como carrinho vazio.
O checkout passou a exibir carregamento e erro com recuperacao.
O usuario escolheu revisao equivalente de seguranca nesta conversa.
Nao houve delegacao para security-auditor.

Suite final: 394 testes backend e 792 frontend passaram.
Lint, typecheck, Prettier e validacao Prisma passaram.
Diff conferido com reconhecimento de finais CRLF do Windows.
db:explain exigiu compatibilidade com a nova coluna quantidadeVendida.
Retry da fila falhou uma vez e passou isolado.
A reexecucao completa backend passou sem alterar codigo da fila.
Avisos preexistentes: SSL do pg e act em use-artesaos-ativos.
Evidencias: evidencias/PI4-27-W10-Integracao-Camadas/WEB-09-checkout/.
Nao houve commit, push ou deploy.

### WEB-09: evidencias visuais adicionais

O usuario solicitou evidencias como WEB-08 e WEB-07.
Codex coletou o fluxo real com Playwright e Edge headless.
Next.js e Express consumiram PostgreSQL real em schema temporario.
Registrou carrinho, checkout, numero, pagamento e erro 409 visivel.
Conferiu SELECTs de itens, valores, estoque, vendas e intencao.
Comparou contagens e carrinho antes e depois do conflito.
Confirmou dez numeros sequenciais em chamadas HTTP autenticadas.
Capturou responsividade em 360, 768 e 1280px sem overflow.
Oito PNGs reais formaram o GIF; Playwright produziu video WebM.
Os paineis da coleta mostram HTTP e SELECT reais.
Nao representam DevTools nativo nem alteram o produto.
Um erro de serializacao Decimal foi corrigido somente no coletor.
Capturas finais foram inspecionadas visualmente antes da entrega.
Schema, navegador e servidores temporarios foram encerrados.
Pasta: WEB-09-checkout/fluxo-real-2026-10-14T15-38-55-750Z/.
Nenhum codigo da aplicacao foi alterado nesta coleta.
Nao houve commit, push ou deploy.

## 2026-10-14 — WEB-10: concorrencia autenticada em comando unico

Codex leu AGENTS.md, WEB-10, CONCURRENCY.md e o script existente.
O roteiro FCCPD solicitado nao existia neste checkout.
Criou o caminho indicado com o procedimento executavel validado.
Usou TDD e PostgreSQL real, sem mocks de banco ou repositories.
Nove testes falharam antes da implementacao, incluindo respostas 401 antigas.

O script cria schema temporario com as migrations existentes.
Sobe a aplicacao Express real em loopback, com segredo efemero.
Cria N compradores via cadastro publico e autentica cada conta.
Os emails seguem concorrencia+N@origem.test; cookies ficam em memoria.
Tres rodadas disputam estoque um com Promise.all.
SELECTs conferem estoque final e pedidos por produto.
O padrao com 50 compradores confirmou 1 sucesso e 49 conflitos por rodada.
O encerramento limpa somente o schema e o servidor da propria execucao.

Uma verificacao inicial de limpeza observou outra execucao simultanea.
O teste passou a conferir somente o schema registrado pelo proprio CLI.
Outro teste confere limpeza quando a porta ja esta ocupada.
O script recusa production, base de deploy e configuracao invalida.
Nao imprime senhas, cookies, hashes ou URLs de conexao.
Revisao equivalente de seguranca mantida nesta conversa, conforme escolha previa.
Nao houve delegacao, commit, push ou deploy.

Suite final: 412 testes backend em 43 arquivos passaram.
Lint, typecheck, Prettier e verificacao do diff passaram.
O comando unico foi executado com 50 compradores e tres rodadas.
Cada rodada confirmou 1 sucesso, 49 conflitos, estoque zero e 1 pedido.
Uma consulta adicional confirmou ausencia do schema depois do comando.
A saida e o exit code ficaram salvos na pasta WEB-10-concorrencia.
Um resumo PNG usa somente metricas dessa saida verificada.
Ele nao representa captura nativa do terminal.
Nao houve alteracao de frontend ou antecipacao de outras subtarefas.

## 2026-10-14: BD-01, documento do modelo físico

Codex gerou somente os artefatos de BD-01.
Leu AGENTS.md, BD-01, modelo lógico e evidências BD-04.
Inspecionou schema, migrations, consultas e repositórios das agregações.
Executou os nove EXPLAIN atuais em transação somente leitura.
As comparações antes/depois vieram dos JSONs históricos de BD-04.

O teste inicial falhou pela ausência de ddl-fisico.sql.
Prisma 7.10 removeu --to-schema-datamodel; foi utilizado --to-schema.
O DDL consolidado acrescenta doze CHECKs e dois índices manuais.
Também inclui pg_trgm e a sequence de Pedido.numero.
Os dois GIN já representados no Prisma não foram duplicados.
Nenhuma alteração foi feita no schema ou nas migrations.

O teste usa PostgreSQL real e dois schemas temporários.
Compara colunas, defaults, constraints, índices, ENUMs e sequence.
Também confere cobertura documental e geração do número do pedido.
A transação termina com rollback, preservando o domínio existente.
A comparação ignora a ordem ordinal das colunas.
Essa ordem difere naturalmente entre criação integral e ALTERs históricos.

O documento cobre quinze tabelas e todos os índices físicos.
Registra restrições ausentes e divergências com o modelo lógico.
QuantidadeVendida já existe desde WEB-09, contrariando a decisão original.
O catálogo segue calculando vendas confirmadas e notas por agregação.
Essa divergência ficou explícita no dicionário e na reconciliação.

O PDF utiliza WeasyPrint 70.0 e Mermaid convertido em PNG.
Foram conferidas visualmente as vinte e quatro páginas finais.
A verificação confirma quarenta e uma tabelas inteiras.
Também confere duas imagens, texto completo e margens respeitadas.

O usuário escolheu revisão equivalente nesta conversa.
Não houve delegação ao agente security-auditor.
A revisão examinou SQL, isolamento, artefatos e dados expostos.
Não foram encontrados achados de segurança no escopo.
Não foram registrados credenciais, URLs de conexão ou hashes reais.

Passaram 36 testes em quatro arquivos relacionados.
Lint, typecheck, Prettier e validação Prisma passaram.
Evidências: evidencias/PI4-28-W10-Modelo-Fisico/BD-01-documento/.
Branch: codex/bd01-modelo-fisico.
Não houve commit, push ou deploy.

## 2026-10-14: WEB-16, preparação do smoke em produção

Codex leu AGENTS.md e os documentos solicitados.
Inspecionou o container, os adapters e as rotas existentes.
Adicionou uma allowlist de pendências no teste do container.
Também verificou a seleção HTTP dos services do comprador.
O teste inicial falhou por `AvaliacoesService.create`.
Essa escrita permanece explicitamente indisponível, fora do checkpoint.
Sua retirada da lista não implementa avaliações nem fallback fake.
O teste focado passou após o ajuste mínimo da lista.

Preparou o checklist dos passos 0–10 na Vercel.
Resultados e datas permanecem pendentes da execução manual de Pedro.
A gravação do vídeo também cabe a Pedro.
Documentou a ausência atual de `GET /pedidos` neste checkout.
HTTP 404 reprova o passo 10; a exceção vale apenas para 9.
Não antecipou a implementação de WEB-11.
Liberou somente TESTING_AND_EVIDENCE.md na regra de documentação ignorada.

Pedro escolheu revisão equivalente de segurança nesta conversa.
A revisão verificou escopo, ausência de credenciais e chamadas documentadas.
O exemplo admin utiliza UUID sintético e retorna apenas status.
Nenhum teste automatizado acessou o ambiente publicado.
Não houve delegação, commit, push ou deploy.

Passaram 794 testes de frontend em 83 arquivos.
Lint e typecheck passaram.
Prettier e verificação do diff passaram.
A suíte emitiu aviso de act em use-artesaos-ativos.test.tsx.
O checklist ainda não comprova aceite em produção.

## 2026-10-14: WEB-11, histórico e detalhe dos pedidos

Codex implementou somente a leitura dos pedidos do comprador.
Leu AGENTS.md, WEB-11, US13, US20 e os arquivos indicados.
Usou TDD, PostgreSQL real e schema isolado.
Dezoito testes iniciais falharam pelas rotas ainda ausentes.
Vinte e cinco testes frontais detectaram métodos e estados ausentes.
Cinco testes da Fake API falharam antes da extensão.

Criou GET /pedidos e GET /pedidos/:id nas camadas existentes.
O comprador vem somente da sessão autenticada.
A listagem usa data decrescente e paginação simples validada.
Pedido de terceiro e inexistente retornam exatamente o mesmo 404.
O contrato ganhou listarMeus e obter, com pagamento persistido.
Minha conta mostra lista, detalhe, loading, vazio e erro recuperável.
Status pendente, confirmado e cancelado possuem estilos distintos.
Pagamento mostra aprovado, recusado ou ausência de registro.
A Fake API preserva o contrato e filtra a sessão atual.
Pedidos legados não recebem pagamentos inventados.
API.md documenta os novos endpoints e DTOs.

Conferiu três pedidos e seis itens contra PostgreSQL.
As evidências usam Next.js, Express e banco reais.
Lista e detalhe passaram em 360, 768 e 1280px.
Capturou PNGs, vídeo, chamadas HTTP e SELECT sanitizado.
Um seletor ambíguo de preço foi corrigido no roteiro.
O mock antigo de proteção de rotas recebeu o novo contrato.

Revisão equivalente de segurança realizada nesta conversa.
Verificou autenticação, papel atual, propriedade, paginação e campos retornados.
Nenhum achado de segurança permaneceu no escopo.
Não expôs credenciais, cookies, hashes ou URLs de conexão.
Não houve delegação, commit, push ou deploy.

Passaram 436 testes backend e 824 testes frontend.
Também passaram lint, typecheck, Prettier e build Next.js.
O diff foi validado preservando CRLF com core.whitespace=cr-at-eol.
Permaneceram avisos existentes de SSL, act e plugin ESLint Next.js.
Evidências: evidencias/PI4-27-W10-Integracao-Camadas/WEB-11-meus-pedidos/.
Branch: codex/web11-meus-pedidos.

## 2026-10-14: correção do build frontend na Vercel

Codex investigou a falha de tipos relatada no deploy.
Aguardou a conclusão de WEB-11 antes de alterar arquivos.
Criou a branch codex/fix-vercel-build-isolation a partir da main limpa.

O tsconfig original incluía testes e configuração Vitest.
Dois testes importavam tipos de services e DTOs backend.
Esses imports alcançavam repositories e o cliente Prisma gerado.
O cliente existe localmente, mas não integra o checkout versionado.

O teste de regressão detectou essa dependência antes da correção.
Um checkout extraído do Git reproduziu exatamente o erro informado.
Ele não possuía o cliente Prisma gerado nem arquivos .env.

Foi criado tsconfig.build.json para a aplicação Next.js.
NextConfig.typescript.tsconfigPath seleciona essa configuração no build.
Páginas, middleware, tipos Next e configuração permanecem verificados.
Testes e Vitest ficam fora da compilação de produção.
Strict e as verificações TypeScript continuam habilitados.
Não foi utilizado ignoreBuildErrors.

O comando typecheck mantém o tsconfig original e verifica os testes.
Os contratos entre as camadas permanecem preservados.
README documenta a configuração e a geração local do Prisma.
Nenhum schema, migration ou dependência foi alterado.

O build corrigido passou no checkout sem Prisma gerado.
Gerou treze páginas estáticas em modo HTTP.
Também passaram 826 testes frontend, lint, typecheck e Prettier.
O aviso preexistente do plugin ESLint Next.js não bloqueia o build.

Revisão equivalente de segurança mantida conforme autorização nesta conversa.
Verificou checagem estrita, imports, proxy e ausência de credenciais.
Não houve delegação ou achados de segurança no escopo.

Evidências: evidencias/correcao-vercel-build-2026-10-14/.
Não houve commit, push ou publicação na Vercel.

### WEB-12: catálogo do artesão e moderação HTTP

Codex implementou rotas Express, validação Zod e repositories Prisma.
Testes Supertest precederam a implementação e usam PostgreSQL real.
O schema de testes é isolado e descartado pelo helper existente.
Foram implementadas propriedade, exclusão lógica e moderação reversível.
Escritas de produto e estoque usam FOR UPDATE como checkout.
As rotas administrativas exigem admin por proteção global e local.
Adapters HTTP completam os contratos atuais dos painéis.
Categorias dos formulários passaram a vir dos services.
O perfil público preserva a busca pública após criar catálogo privado.
O teste do checkpoint agora exige PENDENTES_HTTP vazio.

Revisão local equivalente de segurança autorizada por Pedro.
security-auditor não foi delegado conforme sua escolha explícita.
Não houve commit ou push nesta subtarefa.

Validação final: 462 testes backend e 833 frontend passaram.
Lint, typecheck, Prettier e git diff --check passaram.
Revisão local equivalente não encontrou achados bloqueantes.
O navegador confirmou cadastro, edição, estoque zero e exclusão lógica.
Também confirmou moderação e reativação de artesão e produto.
Servidores temporários encerrados; schema sintético do smoke descartado.
GIF e capturas não incluem a aba Network.
As chamadas HTTP possuem cobertura automatizada.
Evidências: evidencias/PI4-27-W10-Integracao-Camadas/WEB-12-catalogo-moderacao/.

### WEB-13: cache público com TTL e invalidação

Codex inspecionou os endpoints públicos e todos os escritores atuais.
Testes precederam o cache em memória e a integração HTTP.
CacheStore define armazenamento assíncrono substituível por Redis.
A implementação em memória possui TTL e limite de entradas.
Chaves vêm de filtros validados, normalizados e ordenados.
Catálogo, detalhe público e recomendações por produto recebem cache.
Recomendações por usuário e rotas privadas permanecem sem armazenamento compartilhado.
Todas as escritas relevantes invalidam após confirmar os dados.
Papel e perfil também invalidam visibilidade e região do catálogo.
Leituras antigas não repovoam o cache após invalidação.
X-Cache, Server-Timing e log seguro permitem medir o resultado.
O README backend explica aplicação, motivo e limite de instância única.

Revisão local equivalente mantida conforme escolha anterior de Pedro.
Não houve delegação, commit ou push nesta subtarefa.

Validação final: 494 testes backend e 833 frontend passaram.
Lint, typecheck, Prettier e git diff --check passaram.
Revisão local equivalente não encontrou bloqueios no escopo.
HTTP real mediu catálogo MISS 41,017 ms e HIT 0,088 ms.
Detalhe e recomendações também tiveram HIT mais rápido.
Após editar estoque, as três leituras retornaram MISS.
O servidor temporário e o schema isolado foram encerrados.
Evidências: evidencias/PI4-27-W10-Integracao-Camadas/WEB-13-cache/.

### WEB-14: notificações assíncronas visíveis

Codex integrou handler, repository, rotas e painel HTTP.
Testes precederam a implementação e usam PostgreSQL real.
O handler grava avisos por artesão distinto antes de processar.
Retry após falha parcial não duplica notificações existentes.
Rotas exigem artesão ativo e identidade exclusiva da sessão.
Leitura alheia retorna o mesmo 404 de registro inexistente.
O painel mostra badge, estados recuperáveis e leitura individual.
Polling de 15s suspende na aba oculta e retoma imediatamente.
O worker consulta a fila a cada segundo.

Pedro autorizou revisão local equivalente, sem delegação.
Não houve commit, push ou migration na base publicada.
Evidências: evidencias/PI4-27-W10-Integracao-Camadas/WEB-14-notificacoes/.

Validação final: 501 testes backend e 838 frontend passaram.
Backend completo utilizou npm test -- --testTimeout=15000.
A primeira execução encontrou dois timeouts em testes anteriores.
Esses testes de catálogo permaneceram sem alteração.
Lint, typecheck, Prettier e revisão equivalente passaram.
O diff foi validado considerando as terminações CRLF existentes.
No navegador real, o badge apareceu em 14,394 segundos.
A marcação individual retornou 204 e zerou o badge.
O painel mobile não apresentou transbordamento horizontal.
GIF, capturas, chamadas HTTP e estado processado foram salvos.
Schemas temporários, navegador e servidores foram encerrados.

### IA-03: recomendações pelo histórico autenticado

Codex inspecionou Strategy, contratos e identidade recebida por query.
Testes precederam implementação backend e mudanças na vitrine HTTP.
A nova Strategy consulta categorias dos pedidos confirmados.
Exclui compras próprias e preserva vendas, nota e UUID.
Sem histórico ou candidatos, identifica fallback geral.
Fallback pessoal também exclui produtos já comprados.
SQL parametrizado filtra produtos ocultos e artesãos desativados.
Agregações separadas preservam ranking sem multiplicar vendas e avaliações.
A rota para-mim exige sessão válida e papel comprador atual.
A identidade vem exclusivamente do token validado.
Query pública rejeita usuarioId; query pessoal deve permanecer vazia.
A rota pessoal não acessa armazenamento compartilhado de cache.
Compradores usam para-mim; visitantes e outros papéis usam fallback geral.
O detalhe mantém recomendações por produto.

Pedro escolheu revisão local equivalente, sem delegação.
Não houve commit, push ou migration na base publicada.
Validação completa: 517 testes backend e 842 frontend passaram.
Backend usou node node_modules/vitest/vitest.mjs run --testTimeout=15000.
Lint, typecheck, Prettier e revisão local passaram.
Os testes da Strategy usam PostgreSQL real, sem mocks.
O navegador confirmou cerâmica e exclusão do vaso comprado.
Confirmou também fallback para comprador sem compras confirmadas.
Capturas e respostas HTTP sanitizadas foram salvas.
Evidências: evidencias/PI4-29-W10-Recomendacao/IA-03/.
Servidores temporários, navegador e schema sintético foram encerrados.

### IA-04: métricas HTTP em demo e volume

Codex inspecionou métricas v0, seeds BD-05 e cache existente.
Testes precederam as fórmulas novas, CLI e benchmark HTTP.
Pedro autorizou demo e volume em schemas temporários de testes.
O modo existente seleciona conexões por nomes de variáveis.
Esse modo usa schemas existentes e transações somente leitura.
O modo isolado aplica migrations e seeds somente nos schemas próprios.
A preparação dos dados precede o snapshot REPEATABLE READ.
As métricas distinguem cobertura do catálogo e cobertura v0.
Também incluem fallback, diversidade média/global e acerto por categoria.
HTTP real mede média e p95 com cache frio e quente.
Categoria valida MISS seguido de HIT em cada par.
Histórico permanece BYPASS nas duas fases, preservando IA-03.
Tokens efêmeros autenticam apenas a API local em loopback.
Saída contém agregados, sem identidades, senhas ou conexões.

Comando Windows validado: npm.cmd run metricas:recomendacao -- --isolado.
Demo mediu 30 produtos, dois compradores e três pedidos confirmados.
Volume mediu 1000 produtos, 300 compradores e 1500 pedidos confirmados.
No volume, cobertura do catálogo foi 4,50% para categoria.
Histórico cobriu 4,30%, com diversidade média de 2,83 categorias.
Um comprador de volume recebeu fallback geral.
Latências foram coletadas enquanto a suíte backend executava em paralelo.
RECOMMENDATION.md registra data, método, tabelas e limites da interpretação.
JSON: backend/metricas/recomendacao-volume.json.

Validação: 532 testes backend passaram em 52 arquivos.
Os 15 testes IA-04 também passaram na execução direcionada final.
Lint e typecheck passaram; revisão local equivalente sem achados bloqueantes.
Não houve alteração de frontend, commit ou push.
Schemas e servidores temporários foram descartados ao concluir.
Evidências: evidencias/PI4-29-W10-Recomendacao/IA-04/.

### IA-04: pacote de evidências para Jira

Pedro pediu logs, arquivos de código, GIF e capturas.
IA-03 e WEB-07 serviram somente como referências de apresentação.
Codex registrou nova execução completa do benchmark IA-04.
A reexecução usa JSON próprio, preservando a medição anterior.
Os 15 testes IA-04, lint e typecheck foram registrados novamente.
Seis arquivos de código foram copiados com hashes SHA-256.
Um relatório HTML apresenta os resultados reais da coleta.
O navegador gerou seis capturas JPG, revisadas visualmente.
O GIF reúne essas capturas com pausas para leitura.
Ele não representa gravação contínua ou interface do marketplace.
Logs integrais e JSON permitem conferir os resultados exibidos.
O ZIP contém 25 arquivos, com integridade e hashes verificados.
Também inclui comentário pronto para colar no Jira.
Nenhum código da aplicação recebeu alteração nesta preparação.
Pacote: evidencias/PI4-29-W10-Recomendacao/IA-04/IA-04-evidencias-jira.zip.

### BD-07: testes de integridade do modelo físico

Codex leu AGENTS.md, BD-07 e o modelo físico vigente.
Inspecionou helpers PostgreSQL, fixtures, migrations e configuração Vitest.
A branch de trabalho é codex/bd-07-integridade.
Pedro confirmou o endpoint Neon atual como branch de teste.
A suíte usa SQL parametrizado diretamente, sem mocks.
São nove casos, incluindo preço zero e negativo separadamente.
Cada caso cria fixtures válidas numa única transação.
O teardown executa rollback e verifica zero IDs residuais.
Pedidos recebem números explícitos, preservando a sequence existente.
As asserções verificam SQLSTATE e a constraint responsável.

O teste inicial revelou SQLSTATE 23001 nas exclusões RESTRICT.
Pedro autorizou validar esse retorno de Produto e Tecnica.
As constraints e migrations da aplicação permaneceram intactas.
Nove testes passaram após esse ajuste autorizado.
A contraprova removeu constraints somente do DDL de schemas temporários.
Os nove casos falharam corretamente com operações aceitas pelo banco.
Esses schemas também foram revertidos por rollback.

Pedro escolheu revisão de segurança equivalente nesta conversa.
Não houve delegação para security-auditor, conforme essa escolha.
Não houve commit nem push.
Comando: npm.cmd run test:integridade, dentro de backend/.
Evidências: evidencias/PI4-28-W10-Modelo-Fisico/BD-07/.

Validação final: 548 testes backend passaram em 54 arquivos.
Os nove casos BD-07 também passaram na execução direcionada.
As contagens das nove tabelas permaneceram idênticas antes/depois.
A sequence permaneceu inalterada; nenhum schema temporário BD-07 restou.
Lint, typecheck, Prettier e revisão local passaram.

### BD.1: massa sintética ampliada

Tarefa realizada por Eduardo e revisada por Pedro.
O Codex auxiliou nos ajustes e na validação.

A massa cobre 1.000 produtos e todas as referências.
Inclui 50 pedidos multiartesão confirmados, com pagamentos aprovados.
Determinismo, idempotência e testes foram verificados.
Demo e deploy foram preservados.

Evidências: `evidencias/BD.1/`.

### 31.1: integração contínua

Tarefa realizada por Sérgio e revisada por Pedro.
O Codex auxiliou no workflow e nos testes.
A CI verifica frontend e backend com banco de teste separado.
A execução considera a latência do banco remoto.
Evidências: `evidencias/PI4-31/31.1/`.

### 30.3: worker da fila como processo separado

Luiza é responsável pela tarefa; Pedro é o revisor.
O Codex auxiliou na separação do publicador e consumidor.
Também apoiou testes com PostgreSQL e processos worker independentes.
O modo integrado permanece padrão, conforme decisão 3.
Evidências: `evidencias/PI4-30-W12-Arquitetura-Distribuida/30.3-worker-separado/`.

### BD.2: benchmark HTTP da busca

Eduardo é responsável pela tarefa; Pedro é o revisor.
O Codex auxiliou no benchmark HTTP e nos testes.
A execução validou seis cenários com PostgreSQL real.
As medições não justificaram novos índices nesta massa.
Evidências: `evidencias/PI4-BD-W12-Indices-Consultas/BD.2-busca-p95/`.

### IA.1: contrato do adapter HTTP de recomendações

Eliziane realizou a tarefa; Pedro revisou.
O Codex auxiliou nos testes de paridade contratual.
A fixture compartilhada compara resultados completos dos dois adapters.
Os testes verificam erros HTTP e seleção pelo container.
O OpenAPI recebeu a resposta 404 solicitada.

Evidências: `evidencias/IA.1/`.

### BD.3: indicadores de vendas por artesão

Eliziane é responsável; Pedro é o revisor.
O Codex auxiliou na consulta agregada e nos testes.
A implementação considera somente itens próprios em pedidos confirmados.
Também apoiou a documentação e a conferência SQL independente.

Evidências: `evidencias/PI4-BD-W12-Indices-Consultas/BD.3-indicadores/`.

### Web.1: pedidos recebidos pelo artesão

Andrews é responsável; Pedro é o revisor.
O Codex auxiliou na implementação e nos testes de integração.
A consulta filtra pedidos confirmados e itens próprios no PostgreSQL.
Também apoiou OpenAPI, documentação e revisão equivalente nesta conversa.

Evidências: `evidencias/PI4-WEB-W12-Fluxos-Artesao-Avaliacoes/Web.1-itens-por-artesao/`.

### Web.3: formulário e criação de avaliações

Luiz Rocha é responsável; Pedro é o revisor.
O Codex auxiliou na API, no adapter HTTP e no formulário.
Também apoiou testes com PostgreSQL real e validações no frontend.
A implementação mantém a média na leitura e invalida caches após gravar.
Compra verificada permanece reservada à Web.4, sem deploy intermediário.

Evidências: `evidencias/PI4-WEB-W12-Fluxos-Artesao-Avaliacoes/Web.3-avaliacoes/`.

### Web.4: avaliações com compra verificada

Luiz Rocha é responsável; Pedro é o revisor.
O Codex auxiliou na autorização transacional e consulta de elegibilidade.
Também apoiou testes com PostgreSQL real e bloqueio do formulário.
A implementação exige compra confirmada e preserva a média na leitura.
A documentação e revisão equivalente foram realizadas nesta conversa.

Evidências: `evidencias/PI4-WEB-W12-Fluxos-Artesao-Avaliacoes/Web.4-compra-verificada/`.

### 30.1: concorrência no checkout integrado

Sergio é responsável; Pedro é o revisor.
O Codex auxiliou nos testes e ajustes do script existente.
A validação passou a conferir pagamentos e respostas inesperadas.
Também apoiou a conferência SQL e exportação das rodadas.

Evidências: `evidencias/PI4-30-W12-Arquitetura-Distribuida/30.1-concorrencia-checkout/`.

### 30.4: diagrama de arquitetura distribuída

Sergio é responsável; Pedro é o revisor indicado.
O Codex auxiliou na documentação e exportação do diagrama.
Os componentes foram conferidos contra os arquivos existentes.
A consulta pública confirmou limites do plano gratuito Render.
O painel exigiu login; a configuração remota permanece pendente.

Evidências: `evidencias/PI4-30-W12-Arquitetura-Distribuida/30.4-diagrama-distribuido/`.

### 31.2: checkout, pedido e pagamento da US20

Sergio é responsável; Pedro é o revisor indicado.
O Codex reorganizou casos existentes, evitando testes duplicados.
A suíte passou a conferir o pagamento pela API autenticada.
Também apoiou contraprovas e revisão equivalente nesta conversa.
A suíte backend passou com 671 testes.

Evidências: `evidencias/PI4-31-W12-Testes-Executados/31.2-pagamento-us20/`.

### Web.2: pedidos recebidos e envio por item

Andrews é responsável; Pedro é o revisor indicado.
O Codex auxiliou nos testes e na implementação transacional.
Também apoiou as telas, contratos e documentação do envio.
O smoke confirmou cinco envios, refletidos na sessão do comprador.
A revisão equivalente incluiu isolamento e troca de contas.

Evidências: `evidencias/PI4-WEB-W12-Fluxos-Artesao-Avaliacoes/Web.2-pedidos-recebidos/`.

### Web.5: indicadores de vendas do artesão

Pedro é responsável e revisor indicado.
O Codex auxiliou no card, adapters e testes.
O painel consulta vendas confirmadas, com erro recuperável.
A medição registra requisição e renderização com PostgreSQL real.

Evidências: `evidencias/PI4-WEB-W12-Fluxos-Artesao-Avaliacoes/Web.5-indicadores-artesao/`.

### IA.2: carrossel de peças relacionadas

Eliziane é responsável; Pedro é o revisor indicado.
O Codex auxiliou nos testes e ajustes do carrossel existente.
Os testes cobrem limite, exclusão, loading, vazio e recuperação.
Também apoiou capturas HTTP e revisão equivalente nesta conversa.

Evidências: `evidencias/IA.2/`.
