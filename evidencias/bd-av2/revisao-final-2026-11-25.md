# Revisão final da AV2 de Banco de Dados

**Veredito geral. Scripts aprovados em R1–R7 e no critério 2. Falta comprovar o vídeo do critério 3.**

Em 25/11/2026, o responsável aprovou em C1 os três módulos do validador e os dois arquivos de teste. A revisão inicial examinou `bb71341..45d442d`. A revalidação desta correção manteve os 71 registros e confirmou o bloqueio de `NaN` nas seis colunas monetárias e de nomes em branco nas cinco tabelas com `nome`.

## Parte A. Rubrica

A referência é a [seção 0 do plano](../../docs/PROMPTS_EXECUCAO_BD_AV2.md#L22). A coluna de provas aponta o início de cada definição. As linhas exatas das 15 tabelas aparecem logo abaixo.

| Exigência | Situação | Resultado e prova |
|---|---|---|
| R1. Fidelidade | atende | O catálogo e o dicionário v2 coincidem nos dois sentidos. O ER de 20/08 tem nove entidades e 49 atributos. Todos aparecem na rastreabilidade. Um deles foi retirado explicitamente. As relações 1:1, 1:N, N:M, a entidade fraca e as especializações estão mapeadas. [Relações, v2:600](../../sprints/semana-16-18/01-Modelo-Logico-BD-v2.md#L600) · [Rastreabilidade, v2:659](../../sprints/semana-16-18/01-Modelo-Logico-BD-v2.md#L659) |
| R2. Tipos | atende | Valores monetários usam `NUMERIC(10,2)`. Datas usam `TIMESTAMPTZ`. Nomes, emails e slugs têm limites explícitos. Histórias, descrições, URLs e hashes usam `TEXT`. Sete enums têm os mesmos valores e ordem do v2. [Tipos, plano:101](../../docs/PROMPTS_EXECUCAO_BD_AV2.md#L101) · [Convenções, v2:32](../../sprints/semana-16-18/01-Modelo-Logico-BD-v2.md#L32) · [Enums, ddl.sql:16](../../database/av2/ddl.sql#L16) · [Produtos, ddl.sql:106](../../database/av2/ddl.sql#L106) |
| R3. Chaves primárias | atende | As 15 tabelas têm PK explícita e nomeada. As compostas são `(carrinho_id, produto_id)` e `(pedido_id, numero_item)`. A segunda preserva produtos repetidos em posições distintas. [ddl.sql:152](../../database/av2/ddl.sql#L152) · [ddl.sql:191](../../database/av2/ddl.sql#L191) · [Decisão C16, v2:743](../../sprints/semana-16-18/01-Modelo-Logico-BD-v2.md#L743) |
| R4. Chaves estrangeiras | atende | As 19 FKs são nomeadas e internas ao respectivo `CREATE TABLE`. Cada uma declara exclusão e atualização. Todas têm índice cobrindo o prefixo completo, inclusive as compostas. O v2 justifica exclusões por relação e atualizações por tipo de chave. [Ações, v2:38](../../sprints/semana-16-18/01-Modelo-Logico-BD-v2.md#L38) · [Relações, v2:604](../../sprints/semana-16-18/01-Modelo-Logico-BD-v2.md#L604) · [FKs compostas, ddl.sql:86](../../database/av2/ddl.sql#L86) · [Índices, ddl.sql:277](../../database/av2/ddl.sql#L277) |
| R5. Domínio e defaults | atende | Há 75 colunas obrigatórias, 11 restrições UNIQUE e 35 defaults de coluna. Conferidos os nomes no SQL, a nulabilidade no catálogo e a composição das chaves candidatas. [Usuários, ddl.sql:58](../../database/av2/ddl.sql#L58) · [Pedidos, ddl.sql:161](../../database/av2/ddl.sql#L161) · [Pagamentos, ddl.sql:205](../../database/av2/ddl.sql#L205) |
| R6. Regras semânticas | atende | Os 32 CHECKs do DDL coincidem com o dicionário v2 e cobrem D7. Cada regressão confirmou SQLSTATE `23514` e a restrição esperada. Zero passou para o total, e um centavo passou para preços e pagamentos. Nomes com texto e tabulação interna também passaram. [Catálogo D7](../../docs/PROMPTS_EXECUCAO_BD_AV2.md#L156) · [Valores monetários](../../database/av2/testes_restricoes.sql#L509) · [Nomes](../../database/av2/testes_restricoes.sql#L548) · [Valores válidos](../../database/av2/testes_restricoes.sql#L587) |
| R7. Organização e execução | atende | Tipos, sequência, tabelas e índices seguem a ordem de dependência. Cada tabela referenciada já existe. A única atribuição posterior de propriedade é da sequência. O DDL rodou duas vezes e o seed carregou todas as tabelas. A checagem D11 passou. [Ordem, ddl.sql:16](../../database/av2/ddl.sql#L16) · [Sequência, ddl.sql:179](../../database/av2/ddl.sql#L179) · [Carga, seed_dml.sql:20](../../database/av2/seed_dml.sql#L20) · [Contagem, seed_dml.sql:217](../../database/av2/seed_dml.sql#L217) |
| Critério 2. Estrutura DDL, tipagem e restrições | atende | Estrutura idêntica ao v2. PK, FK, UNIQUE, NOT NULL e CHECK possuem nomes no DDL. O PostgreSQL 13 e o 16 executaram os scripts sem erro de sintaxe ou dependência. [Rubrica, plano:44](../../docs/PROMPTS_EXECUCAO_BD_AV2.md#L44) · [Nomes, ddl.sql:58](../../database/av2/ddl.sql#L58) · [Especialização, ddl.sql:76](../../database/av2/ddl.sql#L76) |
| Critério 3. Demonstração prática | atende parcialmente | Massa consistente e seis falhas controladas reproduzidas. A primeira usa INSERT com FK inexistente. A segunda viola o CHECK da nota. A gravação individual exigida pela rubrica não foi apresentada nesta revisão. [Rubrica, plano:49](../../docs/PROMPTS_EXECUCAO_BD_AV2.md#L49) · [demo_erros.sql:9](../../database/av2/demo_erros.sql#L9) · [demo_erros.sql:17](../../database/av2/demo_erros.sql#L17) · [Situação do vídeo, auditoria:470](../../docs/bd-av2/01-auditoria-modelo-fisico.md#L470) |

### Conferência física e conceitual

Comparei cada entrada do dicionário com o catálogo criado pelo DDL. A comparação incluiu ordem das colunas, tipos, parâmetros, nulabilidade, defaults, chaves, expressões dos CHECKs e ações das FKs. Conferi também os 13 índices explícitos, o predicado da vitrine, os sete enums e a sequência pertencente a `pedidos.numero`. Comparei os nomes de NOT NULL diretamente no SQL. A diferença estrutural encontrada foi zero.

| Tabela | Linha no v2 | Linha no ddl.sql | Linha no seed_dml.sql | Colunas | Registros |
|---|---:|---:|---:|---:|---:|
| `regioes` | 194 | 29 | 20 | 2 | 3 |
| `tecnicas` | 214 | 39 | 27 | 2 | 6 |
| `categorias` | 234 | 49 | 37 | 2 | 6 |
| `usuarios` | 253 | 58 | 48 | 7 | 7 |
| `perfis_artesao` | 281 | 76 | 66 | 7 | 3 |
| `carrinhos` | 313 | 95 | 77 | 3 | 3 |
| `produtos` | 337 | 106 | 85 | 12 | 6 |
| `produto_fotos` | 378 | 133 | 108 | 4 | 7 |
| `itens_carrinho` | 400 | 146 | 120 | 4 | 3 |
| `pedidos` | 427 | 161 | 128 | 6 | 4 |
| `itens_pedido` | 456 | 181 | 144 | 8 | 7 |
| `pagamentos` | 490 | 205 | 162 | 6 | 4 |
| `avaliacoes` | 514 | 220 | 174 | 6 | 3 |
| `intencoes_notificacao` | 544 | 238 | 188 | 7 | 3 |
| `notificacoes` | 572 | 260 | 198 | 6 | 6 |
| **Total** | | | | **82** | **71** |

Comparei as páginas 1 e 2 do PDF de 20/08 com a tabela de rastreabilidade. As nove entidades têm destino. Dos 49 atributos, 48 têm uma correspondência física ou uma transformação. `Categoria.descricao` consta como “Sem coluna”, com justificativa em C4. Exigir uma coluna física para cada atributo original deixaria essa exceção. O arquivo 00 registra ausência de correções formais do professor. As 22 divergências identificadas pelo grupo têm decisões individuais. [PDF avaliado, p. 2](../../sprints/semana-02-03/Origem_PI4-13_Modelo-Conceitual.pdf#page=2) · [Arquivo 00:21](../../docs/bd-av2/00-correcoes-professor-av1.md#L21) · [Atributo, v2:681](../../sprints/semana-16-18/01-Modelo-Logico-BD-v2.md#L681) · [Decisões C1 a C22, v2:724](../../sprints/semana-16-18/01-Modelo-Logico-BD-v2.md#L724)

## Parte B. Execução independente

Foram usados servidores Docker descartáveis com acesso local. Cada cliente recebeu um banco novo. O cliente gráfico foi reproduzido pela biblioteca `pg`, enviando cada arquivo inteiro numa única consulta simples. Os dois contêineres foram encerrados após os testes.

| Passo | Resultado | Saída observada |
|---|---|---|
| B1. Seed antes do DDL | Passou | Em banco vazio, ambos os clientes devolveram `P0001` e a mensagem `Execute ddl.sql antes de seed_dml.sql (schema origem nao encontrado)`. [Guarda, seed_dml.sql:7](../../database/av2/seed_dml.sql#L7) |
| B2. PostgreSQL 16.15, psql | Passou | DDL duas vezes, seed, 71 registros e 24 avisos `OK`. O arquivo integral de demonstração, executado sem `ON_ERROR_STOP`, apresentou os seis diagnósticos abaixo. |
| B3. PostgreSQL 16.15, cliente gráfico | Parcial para a demonstração em lote | DDL duas vezes, seed, 71 registros e 24 avisos `OK`. A consulta única com toda a demonstração terminou no primeiro `23503`. Os comandos 2 a 6 não foram executados nesse lote. Em seis seleções individuais com autocommit, todos produziram seus erros previstos. [Modo de execução, README:29](../../database/av2/README.md#L29) |
| B4. PostgreSQL 13.23 | Passou | Tanto no psql quanto no cliente `pg`, o DDL rodou duas vezes. O seed carregou as mesmas 71 linhas. A guarda e os 24 testes de restrição também passaram em ambos. |
| B5. Validador oficial | Passou nas duas versões, saída 0 | `npm run bd:av2:validar` no 16 e `npm run bd:av2:validar -- --postgres13` no 13. D11 passou nos quatro arquivos SQL. Em cada uma das quatro execuções, a guarda, o DDL repetido, os 24 avisos, o catálogo e as dez consultas de coerência passaram. [Evidência do PostgreSQL 16](./validacao-2026-11-25T20-38-22.744Z-189c7e7e.txt) · [Evidência do PostgreSQL 13](./validacao-2026-11-25T20-38-41.899Z-8ffc0017.txt) |

**Coerência do seed.** As consultas confirmaram o total de cada pedido, o pagamento correspondente e as vendas confirmadas por produto. Conferiram os papéis de artesãos e compradores, a compra confirmada de cada avaliação, os preços dos carrinhos, as intenções e os destinatários das notificações. Todas retornaram zero divergências nos dois modos. [Consultas de coerência](../../backend/scripts/lib/bd-av2-coerencia.ts#L1)

| Linha em demo_erros.sql | Tentativa | SQLSTATE | Diagnóstico do PostgreSQL |
|---:|---|---|---|
| 9 | Inserir item com produto inexistente | `23503` | `fk_itens_pedido_produto_id` |
| 17 | Atribuir nota 6 | `23514` | `ck_avaliacoes_nota_valida` |
| 21 | Repetir email normalizado | `23505` | `uq_usuarios_email` |
| 26 | Gravar total nulo | `23502` | NOT NULL em `pedidos.total` |
| 30 | Excluir categoria referenciada | `23503` | `fk_produtos_categoria_id` |
| 34 | Marcar envio sem data | `23514` | `ck_itens_pedido_data_envio_status` |

## Parte C. Histórico e regressão

Os seis commits da revisão inicial são `82f334a`, `8faba14`, `ad47b0f`, `4964933`, `f381881` e `45d442d`, em ordem cronológica. A Parte C preserva os resultados de regressão da aplicação nessa revisão. A correção subsequente alterou apenas o modelo acadêmico, seus testes, documentação e evidências.

| Passo ou comando | Resultado |
|---|---|
| C1. Histórico e diff desde `bb71341` | Atende com a aprovação explícita dos cinco arquivos identificados abaixo. Os 26 caminhos da revisão inicial e os três novos arquivos desta correção estão contabilizados. |
| C2. Histórico e diff dos caminhos protegidos | Zero mudanças em `backend/prisma/schema.prisma`, `backend/prisma/migrations/`, `backend/src/`, `services/`, `frontend/` ou qualquer `package-lock.json`. A única linha adicionada ao manifesto registra `bd:av2:validar`. O intervalo não acrescentou dependências. [backend/package.json:26](../../backend/package.json#L26) |
| C3. Backend · `npm run typecheck` | Passou, saída 0. |
| C3. Backend · `npm run lint` | Passou, saída 0. |
| C3. Backend · `npx --no-install prisma validate` | Schema válido, saída 0. Configuração apontada para loopback. |
| C3. Backend · `npm test -- tests/unit` | Revisão atual com **323/323** testes aprovados em 24 arquivos. Base `bb71341` com **300/300** em 23 arquivos. Ambos usaram PostgreSQL local. |
| C3. Frontend · `npm run typecheck -- --incremental false` | Passou, saída 0. A opção evita escrever cache incremental. |
| C3. Frontend · `npm run lint` | Passou, saída 0. |
| C3. Serviço de recomendação · `npm run typecheck` | Passou, saída 0. |
| C3. Serviço de recomendação · `npm run lint` | Passou, saída 0. |
| C4. `git log -p bb71341..HEAD`, nomes de arquivos e linhas adicionadas | Nenhum arquivo de ambiente, credencial real ou conexão de produção identificado. A busca encontrou 44 linhas para triagem. Oito URLs PostgreSQL literais estão em testes sintéticos. Duas incluem senha fictícia. Nenhuma URL de conexão foi identificada nas evidências. A proibição literal encontra a ressalva do achado 5. |
| C5. `git ls-files --error-unmatch -- database/av2/ddl.sql database/av2/seed_dml.sql` | Saída 0. Ambos estão versionados com os nomes exatos. |

A primeira tentativa dos unitários atuais encontrou bloqueio de portas locais e conexão indisponível. A extração inicial de `bb71341` também carecia do cliente Prisma gerado. Após disponibilizar loopback, banco descartável e cliente gerado na cópia temporária, ambas as suítes passaram. Esses resultados não indicam regressão nos testes da aplicação.

### Todos os arquivos do intervalo

`A` indica adição. `M` indica modificação. A lista acumulada inclui este relatório e os dois novos registros de validação.

| Git | Caminho | Escopo de C1 |
|---|---|---|
| M | `backend/package.json` | Permitido |
| A | `backend/scripts/bd-av2-validar.ts` | Permitido |
| A | `backend/scripts/lib/bd-av2-catalogo.ts` | Aprovado pelo responsável em C1 |
| A | `backend/scripts/lib/bd-av2-coerencia.ts` | Aprovado pelo responsável em C1 |
| A | `backend/scripts/lib/bd-av2-d11.ts` | Aprovado pelo responsável em C1 |
| A | `backend/tests/fixtures/bd-av2-d11-invalido.sql` | Aprovado pelo responsável em C1 |
| A | `backend/tests/unit/bd-av2-validar.test.ts` | Aprovado pelo responsável em C1 |
| A | `database/av2/README.md` | Permitido |
| A | `database/av2/ddl.sql` | Permitido |
| A | `database/av2/demo_erros.sql` | Permitido |
| A | `database/av2/seed_dml.sql` | Permitido |
| A | `database/av2/testes_restricoes.sql` | Permitido |
| A | `docs/bd-av2/01-auditoria-modelo-fisico.md` | Permitido |
| A | `docs/docs auxiliares/DATA_MODEL.md` | Permitido |
| M | `docs/docs auxiliares/TESTING_AND_EVIDENCE.md` | Permitido |
| M | `docs/uso-de-ia.md` | Permitido |
| A | `evidencias/bd-av2/03-aceite-vermelho.txt` | Permitido |
| A | `evidencias/bd-av2/04-descricao-tabelas.txt` | Permitido |
| A | `evidencias/bd-av2/04-revisao-ddl.txt` | Permitido |
| A | `evidencias/bd-av2/demo-erros-insert-2026-11-25.txt` | Permitido |
| A | `evidencias/bd-av2/validacao-2026-11-25T18-00-10.798Z-57114d7f.txt` | Permitido |
| A | `evidencias/bd-av2/validacao-2026-11-25T18-00-10.799Z-93375abc.txt` | Permitido |
| A | `evidencias/bd-av2/validacao-2026-11-25T18-00-16.970Z-2db48b13.txt` | Permitido |
| A | `evidencias/bd-av2/validacao-2026-11-25T19-40-35.123Z-0a26cf49.txt` | Permitido |
| A | `evidencias/bd-av2/validacao-final-2026-11-25.txt` | Permitido |
| A | `evidencias/bd-av2/revisao-final-2026-11-25.md` | Permitido |
| A | `evidencias/bd-av2/validacao-2026-11-25T20-38-22.744Z-189c7e7e.txt` | Permitido |
| A | `evidencias/bd-av2/validacao-2026-11-25T20-38-41.899Z-8ffc0017.txt` | Permitido |
| A | `sprints/semana-16-18/01-Modelo-Logico-BD-v2.md` | Permitido |

## Achados e sugestões

1. **C1 resolvido por aprovação.** O responsável autorizou expressamente os cinco arquivos do validador e dos testes nesta revisão. Os caminhos aparecem individualmente na tabela da Parte C.
2. **Valores monetários corrigidos.** Com o DDL anterior, o novo teste demonstrou que `produtos.preco` aceitava `NaN`. O DDL revisado rejeita o valor nos preços do produto, carrinho e item de pedido, no subtotal, no total e no pagamento. O caso do item grava preço e subtotal `NaN` juntos para testar a antiga brecha na igualdade do subtotal. [Tipos e domínios no v2](../../sprints/semana-16-18/01-Modelo-Logico-BD-v2.md#L20) · [Teste monetário](../../database/av2/testes_restricoes.sql#L509)
3. **Nomes em branco corrigidos.** Com o DDL anterior, `regioes.nome` aceitou uma tabulação. A regressão cobre regiões, técnicas, categorias, usuários e produtos. Em cada tabela, verifica string vazia, somente espaços, somente tabulação e a combinação dos dois. Também confirma a aceitação de um nome acentuado com espaços e tabulação. [CHECK de nome](../../database/av2/ddl.sql#L35) · [Teste de nomes](../../database/av2/testes_restricoes.sql#L548)
4. **Importante. O vídeo individual ainda precisa de comprovação.** Os dois exemplos mínimos e os outros quatro foram reproduzidos. Uma consulta gráfica única retorna apenas o primeiro erro. **Sugestão:** registrar a execução limpa e selecionar cada comando da demonstração separadamente, conforme o README. [Rubrica:49](../../docs/PROMPTS_EXECUCAO_BD_AV2.md#L49) · [demo_erros.sql:6](../../database/av2/demo_erros.sql#L6) · [README:29](../../database/av2/README.md#L29) · [Auditoria:470](../../docs/bd-av2/01-auditoria-modelo-fisico.md#L470)
5. **Menor. C4 encontra oito URLs sintéticas versionadas.** Todas pertencem a casos para analisar destinos, rejeitar hosts e ocultar parâmetros. Duas contêm senha fictícia. A varredura não identificou segredo operacional. **Sugestão:** registrar a exceção para dados sintéticos de teste se a regra pretendida proíbe credenciais reais. Se a proibição abranger todo literal, ajustar as fixtures em outra tarefa. [Teste:9](../../backend/tests/unit/bd-av2-validar.test.ts#L9) · [Teste:22](../../backend/tests/unit/bd-av2-validar.test.ts#L22) · [Teste:35](../../backend/tests/unit/bd-av2-validar.test.ts#L35)
6. **Menor. Três referências desta revisão são locais.** O plano, o arquivo 00 e o PDF conceitual estavam disponíveis nesta máquina. `git ls-files` e `git check-ignore -v` confirmaram que esses três arquivos estão fora do Git. Em um clone limpo, os links correspondentes do v2 e da auditoria ficam sem destino. **Sugestão:** disponibilizar essas fontes junto da avaliação, caso o professor precise conferir a rastreabilidade. Os dois entregáveis SQL são independentes. [Auditoria:5](../../docs/bd-av2/01-auditoria-modelo-fisico.md#L5) · [Modelo v2:661](../../sprints/semana-16-18/01-Modelo-Logico-BD-v2.md#L661)
