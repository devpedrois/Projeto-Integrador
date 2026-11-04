# BD.1: massa sintética ampliada

Data: 22/10/2026. Branch Git: `codex/bd1-volume-multi-artesao`.

O gerador BD-05 foi estendido, preservando a semente `20261013`.
A categoria Arte Reciclada não possuía modelos no demo.
Um modelo exclusivo de volume preenche agora essa categoria.
Os primeiros 50 pedidos recebem produtos de dois artesãos distintos.
Totais e pagamentos incluem todos os itens desses pedidos.

## Validação inicial em schemas temporários

`DATABASE_URL_VOLUME` estava ausente na inspeção inicial.
Pedro autorizou schemas temporários em `DIRECT_URL`, com rollback.
Não foi populada uma branch permanente de volume.
O seed demo e as guardas de volume permaneceram intactos.
Nenhuma migration foi aplicada à base permanente.

A inspeção inicial em `public` encontrou nove produtos.
Havia três pedidos, seis itens e três pagamentos.
Dois pedidos confirmados e aprovados já eram multiartesão.

## Contagens medidas

Resultados PostgreSQL reais, sem mocks.
Cada schema limpo recebeu duas execuções do seed.
Dois schemas independentes comprovaram contagens e IDs iguais.
O teste compara produtos, usuários, perfis, carrinhos, pedidos, itens e pagamentos.
Senhas e hashes não integram os snapshots comparados.

| Entidade            | Antes em public | Volume inicial | Volume repetido |
| ------------------- | --------------: | -------------: | --------------: |
| Usuario             |               7 |            350 |             350 |
| PerfilArtesao       |               2 |             50 |              50 |
| Carrinho            |               3 |            300 |             300 |
| ItemCarrinho        |               1 |              0 |               0 |
| Categoria           |               6 |              6 |               6 |
| Tecnica             |              10 |             10 |              10 |
| Regiao              |               3 |              3 |               3 |
| Produto             |               9 |           1000 |            1000 |
| ProdutoFoto         |              10 |              0 |               0 |
| Pedido              |               3 |           1500 |            1500 |
| ItemPedido          |               6 |           1550 |            1550 |
| Pagamento           |               3 |           1500 |            1500 |
| Avaliacao           |               4 |              0 |               0 |
| IntencaoNotificacao |               0 |              0 |               0 |
| Notificacao         |               0 |              0 |               0 |

Os 350 usuários compreendem 50 artesãos e 300 compradores.
A consulta multiartesão retornou exatamente **50 pedidos confirmados e aprovados**.
O valor pago coincide com a soma dos subtotais.

## Cobertura dos produtos

| Categoria                                | Produtos |
| ---------------------------------------- | -------: |
| Arte Reciclada e Sustentável             |       32 |
| Bijuteria e Acessórios Artesanais        |      192 |
| Cerâmica e Barro                         |      198 |
| Madeira Entalhada e Marcenaria Artesanal |      192 |
| Renda e Bordado                          |      194 |
| Têxtil e Costura Autoral                 |      192 |

| Técnica                        | Produtos |
| ------------------------------ | -------: |
| Bijuteria em Sementes Naturais |       64 |
| Bordado à Mão                  |       97 |
| Costura Autoral                |      128 |
| Entalhe em Madeira             |      128 |
| Marcenaria Artesanal           |       64 |
| Modelagem em Argila            |       99 |
| Renda Irlandesa                |       97 |
| Tecelagem Manual               |       64 |
| Torno Cerâmico                 |       99 |
| Trançado em Fibra Natural      |      160 |

| Região do artesão            | Produtos |
| ---------------------------- | -------: |
| Alto do Moura - Caruaru      |      325 |
| Comunidade do Pilar - Recife |      359 |
| Tracunhaém                   |      316 |

Nenhuma categoria, técnica ou região ficou sem produtos.
As consultas reproduzíveis estão em `consultas.sql`.
Elas devem usar o schema de volume na conexão autorizada.

## TDD

O teste de categoria falhou inicialmente: cinco categorias recebiam produtos.
O teste PostgreSQL falhou: havia 1500 itens, faltando 50.
Após a alteração, os 13 testes unitários passaram.
O teste de integração passou nos dois schemas limpos.
As guardas continuam recusando ausência de opt-in e endpoint do deploy.
Isso inclui a variante pooler com parâmetros diferentes.

## Revisão de segurança

Pedro escolheu revisão equivalente nesta conversa, sem delegação.
A revisão conferiu guardas, isolamento, SQL e dados sintéticos.
As consultas usam SQL estático e nenhuma entrada externa.
UUIDs permanecem determinísticos, com conflitos ignorados na persistência.
Nenhuma credencial foi adicionada às evidências.
Não houve achados bloqueantes no diff da subtarefa.

## Validação final

Comandos executados em `backend/`:

- `npm.cmd test`: 551 testes passaram, em 54 arquivos.
- `npm.cmd test -- tests/unit/seed-volume.test.ts tests/integration/seed-volume.integration.test.ts`: 14 testes passaram.
- `npm.cmd run lint`: passou.
- `npm.cmd run typecheck`: passou.
- Prettier nos quatro arquivos TypeScript alterados: passou.
- `git diff --check`: passou.

A CLI também recusou execução sem opt-in, com código 1.
Recusou igualmente quando o endpoint coincidiu com o deploy.
Ambos os cenários recusaram antes de abrir uma conexão.
Os avisos existentes de SSL do driver pg permaneceram.
A suíte também emitiu avisos existentes sobre consultas concorrentes.

Uma conexão observadora confirmou o isolamento de um schema próprio.
A transação permaneceu igual antes e depois do seed.
O schema não ficou visível fora dela, nem após rollback.
As contagens permanentes foram conferidas separadamente, somente por leitura.
Após a suíte completa, todas as 16 contagens permaneceram iguais.

Não houve commit nem push.

## Aplicação autorizada na branch permanente

Em 22/10/2026, Pedro configurou `DATABASE_URL_VOLUME`.
Depois autorizou explicitamente as nove migrations e o seed.
As escritas ficaram restritas à conexão dessa variável.
O destino foi comparado às conexões existentes antes das operações.
A branch de volume não possuía tabelas em `public`.

As nove migrations existentes foram aplicadas com Prisma.
Nenhuma migration nova foi criada ou alterada.
O histórico confirmou nove aplicações concluídas, sem rollback marcado.
O seed de volume foi executado duas vezes.
As variáveis de destino e opt-in valeram somente nesses processos.
O arquivo `.env` não foi alterado pelos comandos.

| Entidade            | Primeiro seed | Segundo seed |
| ------------------- | ------------: | -----------: |
| Usuario             |           350 |          350 |
| PerfilArtesao       |            50 |           50 |
| Carrinho            |           300 |          300 |
| ItemCarrinho        |             0 |            0 |
| Categoria           |             6 |            6 |
| Tecnica             |            10 |           10 |
| Regiao              |             3 |            3 |
| Produto             |          1000 |         1000 |
| ProdutoFoto         |             0 |            0 |
| Pedido              |          1500 |         1500 |
| ItemPedido          |          1550 |         1550 |
| Pagamento           |          1500 |         1500 |
| Avaliacao           |             0 |            0 |
| IntencaoNotificacao |             0 |            0 |
| Notificacao         |             0 |            0 |
| _prisma_migrations  |             9 |            9 |

A consulta retornou exatamente 50 pedidos multiartesão confirmados e aprovados.
Todas as seis categorias, dez técnicas e três regiões possuem produtos.
Nenhum pedido apresentou divergência entre total, itens e pagamento.
A segunda execução preservou todos os registros e IDs.
A comparação verificou conteúdo completo, além das contagens.
Nenhuma senha ou hash foi incluído na evidência salva.

O demo foi consultado somente por leitura antes e depois.
Seus registros, contagens e sequence permaneceram idênticos.
Não houve escrita no demo nem no deploy.
A revisão equivalente conferiu destino, guardas e saída sanitizada.
Não houve achados bloqueantes nesta aplicação autorizada.

Resultados agregados: [branch-volume.json](branch-volume.json).
O arquivo também lista as nove migrations aplicadas.
Não houve commit nem push.
