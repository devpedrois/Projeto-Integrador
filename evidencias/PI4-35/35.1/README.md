# PI4-35.1: microsserviço de recomendação

Data: 04/11/2026.
Branch: `codex/35-1-microsservico-recomendacao`.
Nenhum commit ou push foi realizado.

## Entrega

- [Serviço e instruções](../../../services/recomendacao/README.md).
- [Migration das views](../../../backend/prisma/migrations/20261104160116_views_contrato_recomendacao/migration.sql).
- [Contrato de seleção](../../../fixtures/recomendacao-selecao.fixture.json).
- [Job recomendacao](../../../.github/workflows/ci.yml).
- [Revisão equivalente de segurança](revisao-seguranca.md).

O serviço tem processo, configuração, build e testes próprios.
As Strategies consultam PostgreSQL real exclusivamente pelas duas views.
Os testes comparam IDs e ordem com as implementações originais.
O backend continua usando suas próprias Strategies.
Seus scripts de métricas e benchmark permanecem intactos.
Não foram implementados cliente HTTP, Docker ou operação de lote.

## Validação final

| Verificação | Resultado |
|---|---|
| Microsserviço: suíte completa | 54/54 |
| Backend: suíte completa | 763/763 |
| Backend: integridade, incluindo views | 10/10 |
| Frontend: suíte completa | 980/980 |
| Lint e typecheck dos três projetos | aprovados |
| Build do serviço e backend | aprovados |
| Instalação reproduzível do serviço com npm ci | aprovada |
| Prisma migrate status | 11 migrations; schema atualizado |
| Prisma migrate dev em modo create-only | sem diagnóstico de drift ou pedido de reset |
| Servidor compilado: health, seleção, histórico e autenticação | aprovado |
| Configuração malformada | saída 1; mensagem sem valores |
| Consultas de runtime citando tabelas da API | nenhuma |
| Busca de credenciais reais nos arquivos versionáveis | nenhuma ocorrência |
| npm audit das dependências de runtime | zero vulnerabilidades |

Relatórios e verificações:

- [Suíte final do microsserviço](testes-microsservico-final.json).
- [Suíte final do backend](testes-backend.json).
- [Smoke do build](smoke-build.json).
- [Permissões das conexões locais reais](permissoes-runtime-local.json).
- [Emulação local dos passos do CI](ci-emulacao-local.json).

A suíte backend utiliza DATABASE_URL administrativa somente no processo de testes.
Isso permite provisionar seus schemas temporários já existentes.
A configuração persistida da API permanece restrita.
As falhas iniciais do frontend eram bloqueios locais do sandbox.
A execução completa fora desse bloqueio aprovou os 980 testes.

## Isolamento autorizado

A API local foi configurada como `origem_api_app`.
O serviço foi configurado como `recomendacao_app`.
As senhas ficaram somente nos arquivos `.env` ignorados.
`DIRECT_URL` foi preservada para administração e migrations.

Na conexão do microsserviço, ambas as views permitem SELECT.
SELECT, INSERT e UPDATE em Produto, Pedido e Usuario retornam 42501.
INSERT em execucao_lote foi aprovado no schema isolado dos testes.
Na conexão da API, SELECT no schema privado retorna 42501.
A tentativa de assumir o papel do microsserviço também retorna 42501.

A fila pg-boss recebeu propriedade de `origem_api_app`.
A transferência teve autorização específica do responsável.
Os dados foram preservados e a inicialização real foi verificada.
Health e recomendações da API também responderam 200 nesse papel.
Os objetos temporários das tentativas iniciais foram removidos.

O diagnóstico anterior permanece em [auditoria inicial](auditoria-permissoes-2026-11-04.md).
O impedimento foi resolvido após autorização explícita nesta conversa.
Papéis administrativos continuam separados dos dois runtimes.
A configuração local não altera variáveis do Render.

## Compatibilidade e ajustes de verificação

A view de produtos expõe somente sete colunas necessárias.
`elegivel` preserva o filtro atual da Strategy por categoria.
`visivel` preserva os filtros atuais do fallback e histórico.
As linhas dos contextos ocultos continuam consultáveis.
Isso preserva o histórico de compras de produtos posteriormente ocultados.

O ranking anterior soma itens de todos os pedidos.
Por isso a coluna foi chamada `vendas`, evitando `vendasConfirmadas`.
Somente a view de histórico filtra pedidos confirmados.
Datas não foram incluídas, pois nenhuma consulta as utiliza.

A suíte completa revelou uma comparação documental incompatível com views.
O teste ddl-fisico passou a comparar apenas tabelas físicas.
O novo teste de integridade verifica separadamente nomes e colunas das views.
Nenhum arquivo de backend/src ou backend/scripts foi alterado.

O Prisma gerou automaticamente uma normalização adicional dos índices e default.
A correção do histórico teve autorização específica do responsável.
Os índices foram comprovados equivalentes; o default original foi restaurado.
A migration automática foi marcada como revertida e preservada nesta pasta.
Somente a migration das views permanece como mudança de produção no backend.
Prova: [equivalência Prisma](equivalencia-prisma.json).
O diff posterior em modo create-only também foi preservado nesta pasta.
Nenhum reset ou exclusão de dados de domínio foi executado.

O Node local é 22.12.0 e gerou avisos de engine do ESLint 10.
Lint, typecheck, build e testes passaram nesse ambiente.
O README recomenda Node 22.13 ou superior na linha 22.
O job usa a versão atual dessa linha.
O npm audit completo informou 11 ocorrências moderadas de desenvolvimento.
A análise somente de runtime informou zero ocorrências.

## CI remoto

O job reutiliza `DIRECT_URL_TEST` e `DATABASE_URL_TEST` existentes.
Nenhum secret novo precisa ser criado.
Senhas e token são efêmeros e mascarados.
Os scripts exatos de geração, bootstrap, migration e limpeza passaram localmente.
A execução remota depende da publicação autorizada da branch.
Ainda não existe resultado remoto para esta alteração.

## Integração local autorizada

Commit: `5771ac3`, sem coautoria, com a mensagem solicitada.
A branch foi integrada à `main` local por fast-forward.
O diretório de trabalho ficou limpo após a integração.
Nenhum push foi realizado; o responsável fará a publicação.
