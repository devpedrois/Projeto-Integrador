# 31.5: evidências documentais

Data: 26/10/2026. Responsável: Luiza. Revisor indicado: Pedro.
Branch: `codex/31-5-refatoracoes-documentadas`.
Base local: `d489b0b`.

## Conferência histórica

Lidos AGENTS.md, ARCHITECTURE.md e a definição da subtarefa 31.5.
Inspecionados commits 03, 06 e integração HTTP da Sprint 4.
Também conferido `bd585e0`, refatoração anterior do payload de recomendação.
Selecionados bootstrap e composição/reaproveitamento da interface.
Os commits mistos não foram descritos como mudanças puramente estruturais.
A agregação da BD.3 foi excluída por constituir funcionalidade nova.

## Antes e depois

`ci-39856854893.json` identifica a revisão anterior à separação do worker.
Seu log filtrado registra 5 testes de servidor aprovados.
Também registra 2 testes de bootstrap aprovados.
O run completo falhou; os resultados individuais foram preservados.

`antes-1529f71/` contém snapshot extraído com `git archive`.
Referência: pai de `1529f71`, commit completo `bd585e0244f6c41a8e37422a88b91197eeb3ce6f`.
O snapshot não altera a árvore produtiva de frontend/backend.
Seu `node_modules` é uma junction para as dependências instaladas.
Não houve instalação ou alteração dos manifests.

`01-antes-composicao.log` registra tentativa sem dependências disponíveis.
Essa tentativa não executou testes e não conta como resultado.
Após disponibilizar as dependências, a reexecução passou.
`01-antes-composicao-validado.log`: 19 testes, três arquivos, exit 0.
`02-depois-composicao.log`: 69 testes, cinco arquivos, exit 0.
O snapshot anterior foi executado localmente em 26/10/2026.
Isso não é apresentado como execução histórica do CI.

## CI consultado

- `ci-40232946842.json`: ambos os jobs aprovados em `376c5f9`.
- `ci-40232946842-testes.log`: resultados individuais dos testes citados.
- `ci-40239567812.json`: frontend aprovado; backend reprovado no typecheck.
- `ci-40239567812-testes.log`: testes frontend e erros TypeScript específicos.

Os testes backend foram pulados nesse último run.
O documento não afirma que o CI atual esteja verde.
A falha em `scripts/web6-evidencias.ts` permanece fora do escopo documental.
Os logs guardam somente linhas filtradas, sem credenciais.

## Revisão

Revisão documental local, sem delegação ao security-auditor.
Verificados hashes, ancestralidade, nomes, contagens e links.
Os testes de integração citados usam PostgreSQL real.
Nesta tarefa, somente os testes frontend foram executados localmente.
Nenhuma refatoração nova foi realizada.
Pedro permanece como revisor humano indicado.
Nenhum commit ou push foi realizado.
