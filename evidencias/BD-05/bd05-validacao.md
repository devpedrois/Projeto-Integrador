# BD-05 — Validacao em 13/10/2026

Branch Git: `codex/bd05-seeds`.
Escopo: util bcrypt, demo e volume. Sem commit ou push.

## Implementacao

- bcrypt nativo 6.0.0 com custo 10; tipos 6.0.0.
- Build local e operacoes bcrypt reais passaram.
- Nao houve problema nativo que justificasse bcryptjs.
- Build do Render nao executado nesta subtarefa.
- Demo preserva o catalogo frontal por snapshot com teste de paridade.
- UUIDs validos sao preservados; IDs textuais recebem UUID deterministico.
- Maria conserva regiao nula e perfil incompleto, conforme a Fake API.
- Produtos preservam fotos, datas, precos, tecnica, autoria e categoria.
- Tres pedidos confirmados possuem item e pagamento pix_simulado aprovado.
- CLI grava cada carga em transacao atomica e informa erro generico.
- Volume usa seed fixa 20261013 e insercoes em lote.
- Hashes usam salt aleatorio e nao entram na comparacao deterministica.
- Seeds nao apagam registros preexistentes.

## PostgreSQL real

O responsavel confirmou que DATABASE_URL e DIRECT_URL apontam para
uma branch de teste. Testes usaram conexao direta e schemas isolados
criados dentro de transacao, com rollback ao encerrar. Nenhuma carga
de volume foi gravada no schema publico ou na base do deploy.

As contagens abaixo foram verificadas pelos testes de integracao.
Prisma count executa agregacao no banco. A consulta equivalente para
inspecao manual consta em `bd05-contagens.sql`.

| Tabela | Demo primeira carga | Demo repetida | Volume primeira carga | Volume repetida e segundo schema limpo |
|---|---:|---:|---:|---:|
| Usuario | 5 | 5 | 350 | 350 |
| PerfilArtesao | 2 | 2 | 50 | 50 |
| Carrinho | 2 | 2 | 300 | 300 |
| Categoria | 6 | 6 | 6 | 6 |
| Tecnica | 10 | 10 | 10 | 10 |
| Regiao | 3 | 3 | 3 | 3 |
| Produto | 30 | 30 | 1000 | 1000 |
| ProdutoFoto | 30 | 30 | 0 | 0 |
| Pedido | 3 | 3 | 1500 | 1500 |
| ItemPedido | 3 | 3 | 1500 | 1500 |
| Pagamento | 3 | 3 | 1500 | 1500 |
| Avaliacao | 10 | 10 | 0 | 0 |

Demo: duas cargas consecutivas mantiveram todas as contagens.
Cada conta documentada foi autenticada por compararSenha.
Volume: duas cargas limpas produziram os mesmos produtos, pedidos,
itens, pagamentos, valores e datas. Cada schema tambem recebeu uma
repeticao, preservando contagens. Sao 50 artesaos e 300 compradores.

## Guardas e erros

Os testes unitarios verificaram ausencia de opt-in, valor diferente de 1,
URL invalida, deploy igual e equivalente com pooler e parametros distintos.
Tres invocacoes reais da CLI recusaram antes de conectar: sem opt-in,
deploy igual e mesmo endpoint com pooler. Saida generica, codigo 1.
`npm run db:seed:volume` tambem recusou sem ALLOW_VOLUME_SEED=1.

## Validacoes

- npm run lint: passou.
- npm run typecheck: passou.
- npm run build: passou.
- npm test: 29 arquivos, 164 testes passaram, PostgreSQL real.
- Testes unitarios BD-05: 13 testes passaram em repeticao final.
- Testes de integracao BD-05: 5 testes passaram.
- Prettier com end-of-line auto: passou.
- git -c core.whitespace=cr-at-eol diff --check: passou.

Uma repeticao unitária no sandbox falhou ao ler cache temporario do
Vitest. A mesma suite fora do sandbox passou sem alteracao de codigo.
O pg emitiu aviso preexistente sobre semantica futura de sslmode.
Nenhuma variavel local ou connection string foi alterada.

## Revisao local de seguranca

Executada localmente por escolha explicita do responsavel, sem delegacao.

- Senhas sinteticas somente nos seeds e no documento de logins.
- Evidencias nao incluem senhas, hashes ou URLs de conexao.
- Guardas de volume executam antes da criacao do cliente PostgreSQL.
- Comparacao de endpoint ignora credenciais e parametros de conexao.
- Consultas de producao usam Prisma com parametros.
- Seeds nao oferecem endpoints publicos nem mudam autenticacao.
- Nenhum gateway financeiro foi integrado.
- Nenhuma alteracao de estoque concorrente ou worker nesta subtarefa.
- Entradas externas da CLI sao validadas; erros nao exibem detalhes internos.
- .env continua ignorado. Nenhuma credencial adicionada ao diff.

npm audit reportou sete alertas em dependencias preexistentes: um moderado,
cinco altos e um critico. Pacotes afetados: @prisma/config, deepmerge-ts,
fast-uri, mysql2, prisma, proxy-addr e source-map-js. Nenhum pacote novo
do bcrypt aparece entre os afetados. Correcoes dessas dependencias
permanecem fora de BD-05, pois podem alterar outras subtarefas.

LOGINS_TESTE.md foi atualizado localmente. O diretorio docs auxiliares
permanece ignorado pela configuracao Git preexistente.
