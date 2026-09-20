# Declaração de uso de IA

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
- Detalhes do produto, avaliações e deploy continuam incompletos.

Esses casos foram corrigidos ou descartados antes da incorporação.

## 8. Responsabilidade da equipe

A equipe assume responsabilidade pelo código, documentação e decisões
entregues. O uso das ferramentas não substituiu compreensão, revisão, testes ou
validação humana.

Este documento deve permanecer atualizado durante o semestre.
