# BD-04: evidencia de indices por consulta

Branch Git: `codex/bd-04-indices-consultas`.
Coleta em 13/10/2026, horario de Sao Paulo.
PostgreSQL 18.6 real, na branch Neon configurada localmente.

## Massa e isolamento

A inspecao encontrou nove produtos no schema public.
Nenhum schema BD-05 existente continha volume persistido.
As evidencias do commit 04 registram cargas com rollback.
O responsavel autorizou recriar volume em schema isolado.

Cada comparacao recria as migrations anteriores e a carga BD-05.
Sao 1.000 produtos, 50 artesaos e 300 compradores.
Sao 1.500 pedidos, itens de pedido e pagamentos simulados.
Produtos, nomes, precos, estoque e datas preservam o gerador.
As datas dos produtos sao iguais na carga original.
Empates de criadoEm nao possuem desempate contratual definido.

BD-04 complementa somente as tabelas operacionais originalmente vazias:

- 1.500 intencoes, com cinco pendentes e cinco falhas.
- As 1.490 restantes representam intencoes processadas.
- 1.500 notificacoes, vinculadas aos artesaos dos pedidos.
- Cada terceira notificacao recebe lida=true.
- 300 itens de carrinho, um por comprador sintetico.

As comparacoes usam transacao unica e rollback integral.
O schema e os indices comparados nao ficam persistidos.
A extension criada nessa transacao tambem e revertida.
A aplicacao nao recebe nenhuma alteracao de repository ou rota.

## Arquivos e resultados

[Tabela principal: consulta, indice, plano e tempos](explain-volume/resumo.md).
[Tabela complementar: busca seletiva usando ambos os GIN](explain-trigrama-seletivo/resumo.md).

Cada pasta possui nove arquivos antes e nove depois.
Cada JSON guarda SQL, parametros, plano e buffers reais.
Tambem guarda contagens, distribuicoes, versao e catalogo de indices.
As fases usam o mesmo schema, massa e parametros.
`ANALYZE` atualiza estatisticas antes e depois da migration.
Uma execucao sem EXPLAIN aquece cada consulta antes da captura.
Os tempos medem uma execucao no servidor, sem rede.
Nao sao p95, resultados HTTP ou garantia de ganho.

## Interpretacao dos planos

Vitrine: Seq Scan e Sort viraram Index Scan parcial.
Tempo observado: 0,537 ms antes e 0,066 ms depois.

Busca principal usa `%vaso%`, presente em 34 produtos.
O planner estimou 63 correspondencias, acima das 34 reais.
Escolheu o parcial ordenado, encerrando no LIMIT 24.
Essa escolha filtrou 667 linhas antes de retornar 24.
Tempo observado piorou: 0,641 ms para 0,879 ms.
O plano e registrado integralmente, sem forcar outro indice.

Busca complementar usa `%977%`, presente num nome sintetico.
O sufixo pertence aos nomes produzidos pelo gerador BD-05.
O termo possui tres caracteres e corresponde a uma linha.
O plano passou de Seq Scan para BitmapOr dos GIN.
Tempo observado: 0,603 ms antes e 0,101 ms depois.
Buffers de leitura caem de 28 para sete hits.

Categoria selecionada: 204 dos 1.000 produtos, ou 20,4%.
Antes usa o indice preexistente com Bitmap Heap e Sort.
Depois prefere o parcial ordenado, lendo ate atingir 24.
Nao foi criado outro indice de categoria.

Tecnica selecionada: 66 produtos, ou 6,6% da massa.
O plano depois prefere o parcial pelo ORDER BY/LIMIT.
O indice de tecnica fica disponivel para filtros mais seletivos.
Nao se presume seu uso obrigatorio nesta carga pequena.

Regiao selecionada: 316 produtos e apenas 16 perfis.
Antes usa Hash Join e Seq Scan nos 50 perfis.
Depois usa parcial, Nested Loop, Memoize e PK do perfil.
O indice de regiao nao e escolhido nesta distribuicao.
Seu custo nao supera o acesso aos poucos perfis necessarios.

Meus pedidos seleciona 14 dos 1.500 pedidos.
O novo composto e usado por Bitmap Index Scan.
O planner mantem Sort, pois o bitmap perde a ordenacao.
O indice simples nao existe depois da migration.

O poller seleciona dez das 1.500 intencoes.
Seq Scan passa a Index Scan por status.

Notificacoes usam o novo composto por usuario e leitura.
Bitmap Heap Scan ainda exige Sort por criadoEm.
O LIMIT retorna 24 das 41 notificacoes desse usuario.

Carrinho mantem Seq Scan nas 300 linhas, quatro paginas.
O custo estimado total e 7,75, com uma linha retornada.
Nesta tabela pequena, varrer quatro paginas e barato.
O unique composto permanece disponivel, sem indice redundante.

Seq Scan tambem aparece no controle sem resultados `%vaqueiro%`.
Esse termo nao existe na carga atual, contrariando a suposicao inicial.
Os arquivos exploratorios foram preservados em `explain-antes-depois/`.
Esse controle nao sustenta a medicao representativa da busca.

Nenhuma captura altera enable_seqscan ou outros custos do planner.
Nao ha promessa de uso de todos os indices simultaneamente.
GIN suporta ILIKE sem prefixo fixo, conforme
[documentacao PostgreSQL](https://www.postgresql.org/docs/18/pgtrgm.html).

## Reproducao

Na pasta backend, leitura da base atual:

```powershell
npm run db:explain
```

A execucao usa transacao READ ONLY e pasta nova automaticamente.
Ela nao cria schema, extension, indice, estatistica ou registro.
Tabelas vazias usam parametro UUID nulo, sem inventar registros.

Comparacao isolada, somente na branch de teste autorizada:

```powershell
$env:EXPLAIN_ISOLATED = '1'
npm run db:explain -- --compare --output ../evidencias/PI4-28-W10-Modelo-Fisico/BD-04-indices/nova-coleta
npm run db:explain -- --compare --termo 977 --output ../evidencias/PI4-28-W10-Modelo-Fisico/BD-04-indices/nova-busca-seletiva
```

DIRECT_URL e DATABASE_URL devem identificar a mesma branch.
O modo compare exige EXPLAIN_ISOLATED=1 e recusa producao.
DATABASE_URL_DEPLOY, quando configurada, bloqueia aquele endpoint.
O diretorio de saida deve estar vazio.
Nenhum arquivo existente pode ser sobrescrito pelo script.
Falhas da CLI retornam codigo um e mensagem sanitizada.

Para o commit 18, medir o schema ja migrado:

```powershell
npm run db:explain -- --schema public --phase depois --termo 977 --output ../evidencias/PI4-28-W10-Modelo-Fisico/BD-04-indices/commit18
```

O parametro phase apenas identifica a captura no arquivo.
Sem compare, nunca se aplica ou remove migration automaticamente.
Deploy permanente segue o comando existente `npm run db:migrate`.
Essa aplicacao permanente nao foi executada nesta entrega.

## Isolamento do teste da fila

A primeira suite passou 300 testes e falhou num.
O retry esperava duas tentativas, mas observou zero.
Executado sozinho, o mesmo teste observou uma tentativa.
Havia sessoes pg-boss ativas fora dessas execucoes.
O responsavel autorizou isolar exclusivamente esse teste.
Seu pg-boss agora usa schema aleatorio compartilhado no restart.
O teardown encerra os clientes e remove somente esse schema.
As assercoes de retry e o codigo produtivo permanecem iguais.
A execucao isolada passou nos sete cenarios da fila.
As duas falhas iniciais permanecem nos logs originais.

A suite completa instala pg_trgm pelo preparo das migrations.
Essa extension compartilha o schema public do banco de teste.
Isso nao aplica os indices novos nas tabelas publicas.
As comparacoes BD-04 continuam totalmente revertidas ao encerrar.

## Validacao final

- Migration e consultas: dez testes PostgreSQL passaram.
- Suite completa: 302 testes passaram em 35 arquivos.
- Lint, typecheck, build e formatacao passaram.
- CLI padrao executou as nove consultas em leitura somente.
- Pastas antes/depois possuem nove pares completos por coleta.
- Cada par preserva SQL, parametros, massa e schema.
- Revisao equivalente de seguranca concluida nesta conversa.
- Nenhum commit, push ou deploy dos indices foi realizado.

Logs: [suite completa](testes-final.txt), [lint](lint.txt),
[typecheck](typecheck.txt), [build](build.txt) e [CLI](cli-atual.txt).
[Revisao de seguranca](revisao-seguranca.md).
[Inspecao final do banco](inspecao-final.json).

As evidencias foram centralizadas nesta pasta por solicitacao direta.
O destino padrao de db:explain tambem aponta para esta pasta.
Os logs originais preservam os caminhos usados durante a coleta.
