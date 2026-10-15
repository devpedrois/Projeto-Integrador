# Origem — Contratos de API
**Sprint:** Semanas 2–3 · **Disciplinas de referência:** Desenvolvimento Web + Modelagem/BD (consumidor: futuramente Eng. de IA)
**Status:** contrato vivo; implementação sincronizada pela WEB-15 em 15/10/2026.

## Implementação vigente na Sprint 4

Swagger UI disponível em `GET /docs`, incluindo exemplos e erros.
`GET /docs/openapi.json` entrega o documento gerado por `@asteasolutions/zod-to-openapi`.
Fonte: `backend/src/docs/openapi.ts`, reutilizando os validators Zod reais.
Schemas de resposta são registrados nesse mesmo módulo.
Toda mudança de rota atualiza o OpenAPI no mesmo trabalho.
O teste `backend/tests/unit/openapi.test.ts` compara métodos e paths reais.
Rotas novas sem documentação fazem esse teste falhar.

| Método | Rota | Contrato vigente e acesso |
|---|---|---|
| POST | `/auth/logout` | Público; idempotente; limpa cookie e retorna 204 |
| GET | `/tecnicas` | Público; lista `{ id, nome }`, com ID textual |
| GET | `/regioes` | Público; lista `{ id, nome }`, com ID textual |
| GET | `/usuarios/:id/perfil-artesao` | Público; perfil do artesão ativo |
| PATCH | `/usuarios/:id/perfil-artesao` | Próprio artesão; `historia`, `tecnicaId`, `regiaoId`, `fotoUrl` |
| GET | `/carrinho` | Comprador; itens, total e `atualizadoEm` |
| POST | `/carrinho/itens` | Comprador; `{ produtoId, quantidade }`; soma ao item existente |
| PATCH | `/carrinho/itens/:produtoId` | Comprador; `{ quantidade }`; substitui quantidade |
| DELETE | `/carrinho/itens/:produtoId` | Comprador; remoção idempotente; retorna carrinho atualizado |
| GET | `/artesao/produtos` | Artesão; próprios produtos, inclusive ocultos ou sem estoque |
| GET | `/artesao/notificacoes` | Artesão; próprias notificações, não lidas primeiro |
| PATCH | `/artesao/notificacoes/:id/lida` | Artesão; própria notificação; 204 idempotente |
| GET | `/admin/artesaos` | Admin; listagem para moderação |
| GET | `/admin/produtos` | Admin; listagem para moderação |
| GET | `/recomendacoes/para-mim` | Comprador; identidade vem da sessão; query vazia |

Autenticação vigente: JWT somente no cookie HttpOnly `origem_sessao`.
O cookie usa `SameSite=Lax`, `Path=/` e duração de 24h.
Em produção, também usa `Secure`. Faça login pelo mesmo domínio.
Swagger envia o cookie automaticamente após `POST /auth/login`.
Cadastro não inicia sessão e aceita somente comprador ou artesão.

Consulta pública de produtos usa `termo`, `categoriaId`, `tecnicaId`,
`regiaoId`, `artesaoId`, `limit` e `offset`.
Retorna uma lista de `ProdutoDTO`, com fotos ordenadas e métricas.
`GET /avaliacoes` recebe somente `produtoId` e retorna `{ itens, resumo }`.
`GET /recomendacoes` aceita `produtoId` opcional, sem `usuarioId` externo.
Ambas as recomendações retornam `{ estrategia, itens: ProdutoDTO[] }`.

Checkout vigente recebe apenas `{ itens: [{ produtoId, quantidade }] }`.
Identidade do comprador vem do cookie, nunca do payload.
`POST /pedidos` retorna 201 com `{ pedido, itens }`.
`GET /pedidos` recebe `pagina` e `limite`, somente para comprador.
`GET /pedidos/:id` retorna `{ pedido, itens, pagamento }`.
Pagamento simulado é criado dentro da transação do checkout.
Estoque pode ser editado pelo próprio artesão ou admin.

Erros usam `{ error: { code, message, details? } }`.
Falhas inesperadas retornam 503 com `{ status, message }`.
O OpenAPI descreve 400, 401, 403, 404 e 409 aplicáveis.
Notificações alheias e inexistentes recebem o mesmo 404.

As seções abaixo preservam o contrato histórico e propostas.
Quando houver divergência, prevalece esta seção e o OpenAPI.
Ainda não existem rotas de perfil genérico, indicadores, avaliação
por POST, alteração de status ou pagamento isolado.

## Contrato histórico e propostas

> Mitigação direta do maior risco listado nos documentos oficiais:
> "integração deixada para o fim do semestre". Contratos definidos agora,
> mesmo que troquem depois.

Convenção: REST, JSON, **sem prefixo de base** (rotas diretas, ex.:
`/produtos`, `/pedidos`) — atualizado em 27/08/2026 conforme orientação da
disciplina de Web (Notion, ver `docs/07-Especificacao-Disciplina-Web.md`).
Autenticação via JWT emitido pelo backend Express
(`Authorization: Bearer <token>` ou cookie httpOnly) + bcrypt para senha —
confirmado em 27/08/2026, substitui a ideia inicial de NextAuth/Auth.js
(que fazia sentido só com Next.js unificado). Todos os endpoints de escrita
exigem autenticação, exceto cadastro/login.

## Autenticação

| Método | Rota | Descrição | Papel |
|---|---|---|---|
| POST | `/auth/register` | Cria usuário (`nome`, `email`, `senha`, `papel`) | público |
| POST | `/auth/login` | Autentica (`email`, `senha`) | público |
| GET | `/auth/me` | Retorna usuário logado | autenticado |

> **US01/US02:** `POST /auth/login` sempre responde `401` com mensagem
> genérica em caso de credenciais inválidas — nunca revela se o e-mail
> existe ou não na base. `papel` é definido só no cadastro e é imutável pelo
> próprio usuário: não existe campo `papel` em `PATCH /usuarios/:id`; a
> única forma de mudar o papel de alguém é `PATCH /admin/usuarios/:id/papel`
> (ver Administração).

## Usuários / Perfil do Artesão

| Método | Rota | Descrição | Papel |
|---|---|---|---|
| GET | `/usuarios/:id` | Perfil público (dados básicos + `PerfilArtesao` se aplicável) | público |
| PATCH | `/usuarios/:id` | Atualiza próprio perfil (`historia`, `tecnica_principal`, `regiao`, `foto_url`) | dono do recurso |

## Categorias

| Método | Rota | Descrição | Papel |
|---|---|---|---|
| GET | `/categorias` | Lista as categorias cadastradas | público |

## Produtos

| Método | Rota | Descrição | Papel |
|---|---|---|---|
| GET | `/produtos?busca=&categoriaId=&regiao=&artesaoId=` | Busca/filtra produtos ativos (US08) | público |
| GET | `/produtos/:id` | Detalhe do produto (com fotos e artesão) | público |
| POST | `/produtos` | Cria produto (US04) | artesão |
| PATCH | `/produtos/:id` | Edita produto próprio (US05) | dono do recurso ou admin |
| DELETE | `/produtos/:id` | Soft delete (`ativo=false`) — pedidos antigos mantêm a referência ao produto (US05) | dono do recurso ou admin |
| PATCH | `/produtos/:id/estoque` | Atualiza quantidade em estoque; rejeita com `400` qualquer operação que resultaria em estoque negativo (US06) | dono do recurso |
| GET | `/artesao/indicadores` | Retorna quantidade vendida e receita total dos produtos do artesão logado (US07) | artesão |

> `/artesao/indicadores` foi adicionado em 2026-08-20 — faltava no
> rascunho original e foi identificado ao cruzar telas × histórias × API
> (ver documento 06): sem ele, a US07 (painel de indicadores do artesão) não
> tinha endpoint que a sustentasse.

> **US04:** produto com `estoque = 0` não aparece em `GET /produtos` para o
> público (vitrine só lista produtos ativos e com estoque disponível). O
> próprio artesão continua enxergando esses produtos ao consultar
> `?artesaoId=<próprio id>` autenticado, para poder repor estoque ou editar.

> **Concorrência — decisão definitiva (31/08/2026):** `PATCH
> /produtos/:id/estoque` disputa o mesmo `SELECT ... FOR UPDATE` sobre a
> linha de `produto` que `POST /pedidos` já usa (ver seção Pedidos abaixo).
> Isso cobre o cenário de o artesão editar o estoque manualmente enquanto um
> checkout está em andamento sobre o mesmo produto — a segunda transação a
> chegar espera o lock e enxerga o valor já atualizado, nunca sobrescreve
> "às cegas". Detalhamento em `docs/05-Concorrencia-e-IA-Baseline.md` §1.2.

## Carrinho

| Método | Rota | Descrição | Papel |
|---|---|---|---|
| GET | `/carrinho` | Retorna carrinho atual do usuário | comprador |
| POST | `/carrinho/itens` | Adiciona item (`produtoId`, `quantidade`); rejeita com `409` se `quantidade` exceder o estoque disponível (US11) | comprador |
| DELETE | `/carrinho/itens/:produtoId` | Remove item do carrinho | comprador |

## Pedidos — **endpoint crítico de concorrência (ver documento 05)**

> **Concorrência — decisão definitiva (confirmada 27/08/2026):** `POST
> /pedidos` roda dentro de uma transação com `SELECT ... FOR UPDATE` (lock
> pessimista) sobre a linha de estoque de cada produto envolvido — não usa
> `UPDATE ... WHERE estoque >= $2` condicional. Isso cobre diretamente o
> cenário de concorrência da US12 ("dois compradores finalizando pedido do
> mesmo produto ao mesmo tempo, estoque só para um"): o segundo comprador a
> chegar na transação espera o lock, vê o estoque já atualizado e recebe
> `409 ESTOQUE_INSUFICIENTE` se não sobrar quantidade — nunca há venda
> duplicada do mesmo estoque. Detalhamento e justificativa (por que lock
> pessimista e não a alternativa otimista) em
> `docs/05-Concorrencia-e-IA-Baseline.md`.

| Método | Rota | Descrição | Papel |
|---|---|---|---|
| POST | `/pedidos` | Cria pedido a partir do carrinho (US12) — transação atômica: `SELECT ... FOR UPDATE` bloqueia a linha de estoque de cada produto do pedido antes de validar/debitar; se algum item não tiver estoque suficiente, a transação inteira é revertida (`ROLLBACK`) e nada é confirmado | comprador |
| GET | `/pedidos` | Lista pedidos do usuário logado. Comprador vê os próprios pedidos completos; artesão vê apenas os **itens de pedido** referentes aos próprios produtos (nunca o pedido inteiro de outros artesãos, US14) (US13/US14) | autenticado |
| GET | `/pedidos/:id` | Detalhe do pedido — mesma regra de escopo por papel de `GET /pedidos` | dono/participante |
| PATCH | `/pedidos/:id/status` | Atualiza status (ex. artesão confirma envio) | artesão/admin |

## Pagamento (simulado) — *adicionado em 2026-08-20*

| Método | Rota | Descrição | Papel |
|---|---|---|---|
| GET | `/pedidos/:id/pagamento` | Retorna o pagamento vinculado ao pedido (método, valor, status) | dono/participante do pedido |

> Não existe endpoint de "criar pagamento" separado: o registro de `Pagamento`
> é gerado **dentro da mesma transação** de `POST /pedidos` (US20), já que
> é simulado e sempre aprovado automaticamente — não há fluxo assíncrono de
> confirmação de gateway externo neste escopo.

## Avaliações

| Método | Rota | Descrição | Papel |
|---|---|---|---|
| POST | `/avaliacoes` | Cria avaliação (`produtoId`, `nota`, `comentario`) — só se houver compra confirmada do produto (US15) | comprador |
| GET | `/avaliacoes?produtoId=&page=&pageSize=` | Lista paginada das avaliações de um produto (US16) | público |

> **US16:** a nota média do produto (`notaMedia`) é recalculada a cada nova
> avaliação e devolvida no detalhe do produto (`GET /produtos/:id`), não no
> endpoint de listagem — evita recalcular em toda paginação de comentários.

> **Concorrência — decisão definitiva (31/08/2026):** o recálculo de
> `notaMedia` roda via agregação SQL (`AVG(nota)` sobre todas as avaliações
> do produto) na mesma transação do `INSERT` de `POST /avaliacoes` — nunca
> por leitura-modificação-escrita em memória na aplicação. Isso evita lost
> update quando duas avaliações do mesmo produto chegam ao mesmo tempo, sem
> precisar de lock explícito (a leitura via `AVG` já é sempre fresca).
> Detalhamento em `docs/05-Concorrencia-e-IA-Baseline.md` §1.4.

## Recomendações (módulo de IA — consumido pela Web via API)

| Método | Rota | Descrição | Papel |
|---|---|---|---|
| GET | `/recomendacoes?produtoId=` | Produtos relacionados ao produto visto (US10) | público |
| GET | `/recomendacoes?usuarioId=` | Recomendações para o comprador logado (evolui na U2) | público/autenticado |

> Este contrato é o que garante que o módulo de IA nunca fique "isolado em
> notebook" — desde já ele é pensado como uma API que a Web consome, não como
> um script à parte (risco alto já mapeado pelos professores).

## Administração

| Método | Rota | Descrição | Papel |
|---|---|---|---|
| GET | `/admin/indicadores` | Números agregados (US18) | admin |
| PATCH | `/admin/produtos/:id/moderar` | Ativa/desativa produto — reversível, dados não são apagados (US17) | admin |
| PATCH | `/admin/artesaos/:id/moderar` | Ativa/desativa artesão — reversível, dados não são apagados (US17) | admin |
| PATCH | `/admin/usuarios/:id/papel` | Altera o papel de um usuário (comprador ↔ artesão) — única forma de mudar papel; usuário não pode alterar o próprio papel (US01) | admin |

> **Concorrência — decisão definitiva (31/08/2026):** `PATCH
> /admin/produtos/:id/moderar` e `PATCH /admin/artesaos/:id/moderar`
> também disputam o `SELECT ... FOR UPDATE` da linha do recurso moderado.
> Se a moderação chegar primeiro, o checkout/edição em andamento espera o
> lock e, ao adquiri-lo, revalida `ativo` dentro da própria transação —
> abortando com `409` se o recurso não estiver mais disponível. Se o
> checkout/edição chegar primeiro, a moderação espera e só se aplica depois
> que a operação em andamento termina. Detalhamento em
> `docs/05-Concorrencia-e-IA-Baseline.md` §1.3.

## Formato padrão de resposta e erro *(adicionado em 2026-08-20)*

**Sucesso** — retorna o recurso (ou lista) diretamente no corpo, sem envelope extra:
```json
// GET /produtos/12 → 200 OK
{
  "id": 12,
  "nome": "Boneco de barro — Vaqueiro",
  "descricao": "Peça em cerâmica, técnica de Alto do Moura...",
  "preco": 89.90,
  "estoque": 4,
  "categoria": { "id": 1, "nome": "Cerâmica e Barro" },
  "artesao": { "id": 7, "nome": "Maria das Neves", "regiao": "Alto do Moura" },
  "fotos": ["https://.../foto1.jpg"]
}
```

**Erro** — sempre HTTP status code semântico (400 validação, 401 não
autenticado, 403 sem permissão, 404 não encontrado, 409 conflito de negócio,
500 erro interno) + corpo padronizado:
```json
// POST /pedidos → 409 Conflict (estoque insuficiente no meio da transação)
{
  "error": {
    "code": "ESTOQUE_INSUFICIENTE",
    "message": "O produto 'Boneco de barro — Vaqueiro' não tem estoque suficiente.",
    "detalhes": { "produtoId": 12, "solicitado": 3, "disponivel": 1 }
  }
}
```

## Exemplos de payload — endpoints críticos

**`POST /pedidos`** (US12 + US20 — cria pedido e pagamento na mesma transação)
```json
// Request
{ "itens": [{ "produtoId": 12, "quantidade": 1 }], "metodoPagamento": "pix_simulado" }

// Response 201 Created
{
  "pedido": { "id": 55, "status": "confirmado", "total": 89.90, "criadoEm": "2026-08-20T14:00:00Z" },
  "itens": [{ "produtoId": 12, "quantidade": 1, "precoUnitario": 89.90 }],
  "pagamento": { "id": 33, "metodo": "pix_simulado", "valor": 89.90, "status": "aprovado" }
}
```

**`POST /avaliacoes`** (US15 — regra: só permite avaliar produto comprado)
```json
// Request
{ "produtoId": 12, "nota": 5, "comentario": "Peça linda, chegou bem embalada." }

// Response 403 Forbidden (regra de negócio violada)
{ "error": { "code": "COMPRA_NAO_CONFIRMADA", "message": "Você só pode avaliar produtos que já comprou." } }
```

**`GET /recomendacoes?produtoId=12`** (US10 — baseline por categoria/popularidade, ver documento 05)
```json
// Response 200 OK
{
  "produtoId": 12,
  "estrategia": "mesma_categoria_mais_vendidos",
  "recomendados": [
    { "id": 18, "nome": "Vaso de barro decorado", "preco": 65.00 },
    { "id": 9,  "nome": "Boneca de barro — Feira", "preco": 72.00 }
  ]
}
```

## Pendências para o setup técnico (semanas 4–5) — atualizado 27/08/2026

- ~~Definir mecanismo exato de autenticação~~ **Resolvido:** JWT emitido pelo
  backend Express + bcrypt + cookie httpOnly (não NextAuth — ver
  `docs/07-Especificacao-Disciplina-Web.md` §12).
- ~~Definir onde ficam as imagens de produto~~ **Resolvido:** mantido
  **Vercel Blob**, chamado via SDK/token a partir do backend Express —
  funciona independente de o backend estar hospedado na Vercel ou não.
- ~~Onde o backend roda~~ **Resolvido: Render** (free tier real sem cartão,
  processo Node persistente — melhor encaixe pra filas/cache/jobs do que
  funções serverless da Vercel; Railway não tem mais free tier viável 24/7 e
  Fly.io exige cartão). Ver `sprints/semana-04-05/01-Arquitetura-e-Stack-Setup.md`.
- ~~Mecanismo de controle de concorrência no checkout~~ **Resolvido:**
  `SELECT ... FOR UPDATE` (lock pessimista) dentro da transação de
  `POST /pedidos` — ver nota na seção Pedidos acima e
  `docs/05-Concorrencia-e-IA-Baseline.md`.
- Documentação formal implementada na WEB-15 em `backend/src/docs/openapi.ts`.
  A especificação acompanha as rotas disponíveis na Sprint 4.

> **Revisão 31/08/2026:** contrato cruzado linha a linha com o backlog
> definitivo de histórias de usuário (`Origem _ PI412 _ Modelagem Conceitual
> _ Historias De Usuario.pdf`, revisado 26/08/2026) e com
> `02-Historias-de-Usuario.md`. Ajustes feitos: nota de erro genérico no
> login e imutabilidade de `papel` pelo próprio usuário (US01/US02); edição
> de produto liberada também para admin, além do dono (US05); estoque nunca
> negativo explícito em `PATCH /produtos/:id/estoque` (US06); produto com
> estoque zero não aparece na vitrine pública, mas o artesão continua vendo
> o próprio (US04); bloqueio de quantidade acima do estoque em
> `POST /carrinho/itens` (US11); escopo de `GET /pedidos`/`GET /pedidos/:id`
> deixado explícito para o papel artesão (só itens dos próprios produtos,
> US14); paginação e nota média em avaliações (US16); e novo endpoint
> `PATCH /admin/usuarios/:id/papel`, que faltava para cobrir o cenário de
> troca de papel da US01 (só admin pode alterar). Nenhuma entidade nova foi
> encontrada no PDF de histórias/casos de uso — o modelo de dados já
> documentado em `03-Modelo-Conceitual-BD.md` continua válido.

> **Revisão 31/08/2026 (2) — pontos de concorrência expandidos:** a pedido
> do Pedro, três novos pontos de concorrência foram formalizados em
> `docs/05-Concorrencia-e-IA-Baseline.md` (§1.2–§1.4) e refletidos aqui como
> notas nas rotas correspondentes: `PATCH /produtos/:id/estoque` (edição
> manual de estoque disputando o mesmo lock do checkout), `PATCH
> /admin/produtos/:id/moderar` e `PATCH /admin/artesaos/:id/moderar`
> (moderação do admin disputando o lock com checkout/edição em andamento) e
> `POST /avaliacoes` (recálculo de `notaMedia` via agregação SQL, sem lost
> update). Nenhuma rota nova foi criada — os quatro endpoints já existiam
> neste contrato; só ficou explícito o comportamento de cada um sob
> concorrência.

> ⚠️ **Ponto de atenção:** este contrato ainda é rascunho — normal que mude
> quando a implementação começar. O que importa é que ele existe e está
> escrito antes de codar, não depois.
