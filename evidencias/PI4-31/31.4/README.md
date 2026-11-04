# 31.4: validação da matriz de aceitação

Data: 26/10/2026. Responsável: Luiza. Revisor indicado: Pedro.
Branch: `codex/31-4-matriz-aceitacao`. Base local: `8cf8c88`.

## Extração e completude

AGENTS.md foi lido integralmente antes da tarefa.
Consultados o backlog Dado/Quando/Então e a definição da 31.4.
Cada cenário Must e Should foi extraído do backlog indicado.
O inventário contém dez histórias Must e seis Should implementadas.
São 27 cenários Must e dez cenários Should.
A matriz possui exatamente uma linha por cenário original.
Os passos Dado/Quando/Então foram preservados, incluindo conjunções.
US07, US16 e US18 são Could, fora do recorte.
US19 é Won't e não define cenários nesta fase.

## Testes e provas

Inspecionados nomes e assertions pertinentes em backend, frontend e E2E.
Sessenta referências únicas apontam para 32 arquivos reais de teste.
Cada nome foi conferido literalmente por `rg -n -F`.
As declarações correspondentes e revisões executadas também foram verificadas.
Os templates parametrizados foram preservados, sem inventar títulos expandidos.
O resultado remoto por arquivo consta nos logs filtrados.

O último CI integralmente verde consultado é `40232946842`, commit `376c5f9`.
O último job frontend verde é `40239567812`, commit `8e78cdc`.
Nesse run recente, o backend falhou no typecheck.
Seus testes foram pulados, sem comprovação de regressão ou aprovação.
As provas backend vêm expressamente do último run verde anterior.
Nenhum resultado remoto foi apresentado como execução do HEAD local.

A última rodada Playwright preservada é a terceira da 31.3.
Ela começou em 25/10/2026, às 18:38:43 de Brasília.
Terminou com quatro aprovações, sem falhas, skips ou flaky.
Os dois fluxos passaram em 360px e 1280px.
O README original registra `3d77bb3` com alterações locais da tarefa.
Essas alterações foram incorporadas posteriormente em `5090add`.
O arquivo `fluxos.spec.ts` não mudou desde esse commit.
Não se afirma execução anterior sobre checkout limpo de `5090add`.

## Lacunas preservadas

Trinta e cinco cenários possuem aceite classificado como aprovado.
US01.C1 registra não implementado para seu requisito integral.
O cadastro existente redireciona para login, contrariando aquele cenário.
US08.C3 permanece parcial por ausência de medição da apresentação visual.
O benchmark existente mede HTTP e decodificação do JSON.
Seu p95 máximo histórico foi 49,1024 ms, com mil produtos.
Isso não comprova tempo de renderização no navegador.

Nenhum cenário depende exclusivamente de execução manual sem prova.
Todos possuem teste automatizado aplicável ou diagnóstico da divergência.
Não foi inventado roteiro executado, print, aprovação ou funcionalidade.
Não houve nova execução de CI, Playwright ou testes de aplicação.

## Arquivos

- `01-cenarios-origem.json`: inventário e textos da fonte.
- `02-mapeamento-cenarios.json`: linhas, estados e testes vinculados.
- `03-grep-nomes.log`: provas literais dos nomes citados.
- `04-playwright-ultima-verde.json`: resumo dos quatro resultados reais.
- `05-validacao.json`: totais, completude e referências verificadas.
- `06-integridade.json`: hashes dos artefatos documentais.
- `ci-40232946842.json`: metadados do CI integralmente verde.
- `ci-40232946842-testes.log`: resultados por arquivo nesse CI.
- `ci-40239567812.json`: metadados da execução recente.
- `ci-40239567812-testes.log`: aprovações frontend e erros backend.

## Revisão documental

Revisão equivalente local, sem delegação ao security-auditor.
Conferidos escopo, nomes, conjunções, estados, resultados e credenciais.
A revisão humana indicada para Pedro não foi presumida.
Somente documentação e sua inclusão no Git foram alteradas.
Não houve refatoração, alteração de testes, commit, push ou deploy.
