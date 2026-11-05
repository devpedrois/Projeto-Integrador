# Contratos de comunicacao

## Web.6: foto do perfil

`POST /artesao/perfil/foto` exige sessão e papel `artesao`.
Autenticação e autorização precedem o parser multipart.
O corpo contém somente um arquivo no campo `foto`.
Campos extras, segundo arquivo e campo diferente recebem 400.
Identidade vem da sessão, sem ID fornecido pelo cliente.
São aceitos MIME `image/jpeg` e `image/png`, com assinaturas correspondentes.
JPG exige `FF D8 FF`; PNG exige `89 50 4E 47 0D 0A 1A 0A`.
O limite é 2 MiB, exatamente 2.097.152 bytes inclusive.
O parser interrompe armazenamento ao exceder o limite.
O Multer aceita exatamente o limite e rejeita excedentes.
`express.json` continua limitado a `16kb`, sem base64 no JSON.

| Resultado | HTTP e código |
|---|---|
| Foto válida | 200, perfil público com `fotoUrl` atualizado |
| Formato, assinatura ou multipart inválido | 400 `FOTO_INVALIDA` |
| Sessão ausente, inválida ou inativa | 401 |
| Comprador ou administrador | 403 |
| Arquivo maior que 2 MiB | 413 `FOTO_MUITO_GRANDE` |
| Falha no armazenamento ou persistência | 503 `FOTO_INDISPONIVEL` |

Todas as respostas usam `Cache-Control: no-store`.
O backend envia ao Vercel Blob usando `@vercel/blob`.
`BLOB_READ_WRITE_TOKEN` existe exclusivamente no ambiente backend.
Configure um store público para a fotografia pública.
O nome é `perfis/<usuarioId>/<UUID>.jpg` ou `.png`.
UUID e extensão são definidos pelo servidor.
O nome do cliente nunca participa do caminho.
A URL fica em `PerfilArtesao.foto`, sem migration.
A atualização reaproveita o bloqueio transacional de `Usuario`.
Uploads concorrentes substituem a foto efetivamente anterior.
Após persistir, invalida catálogo e remove a foto anterior gerenciada.
A exclusão exige mesma origem e caminho do próprio artesão.
Fotos legadas externas não são excluídas de serviços alheios.
Falha no banco remove o arquivo recém-enviado como compensação.
Blob e PostgreSQL não compartilham transação distribuída.
Uma falha de exclusão após commit retorna 503; nova foto permanece.
Indisponibilidade persistente ou interrupção exige reconciliação de órfãos.

Frontend valida tamanho, MIME e assinatura antes da prévia local.
Envia `FormData` com cookie, sem `Content-Type` manual.
Prévia usa object URL revogada ao substituir, cancelar ou desmontar.
O formulário não reenvia a URL antiga pelo PATCH.
O upload está disponível no adapter HTTP.
A Fake API preserva fotos existentes, sem simular Vercel Blob.
Testes usam PostgreSQL real e implementação de storage em disco temporário.
Nenhum token real é necessário nos testes.

## Web.4: avaliações com compra verificada

`GET /avaliacoes/elegibilidade?produtoId=UUID` exige sessão de comprador.
A query é estrita e aceita somente um `produtoId`.
UUID inválido, repetido, ausente ou campos extras recebem 400 `VALIDACAO`.
A identidade do comprador vem exclusivamente do token revalidado.
Sem sessão recebe 401; artesão e admin recebem 403.
A resposta usa `Cache-Control: no-store`.

| Situação | Resposta 200 |
|---|---|
| Compra confirmada, sem avaliação | `{ "podeAvaliar": true, "motivo": null }` |
| Sem compra confirmada | `{ "podeAvaliar": false, "motivo": "nao_comprou" }` |
| Compra confirmada, avaliação existente | `{ "podeAvaliar": false, "motivo": "ja_avaliou" }` |

Compra exige pedido `confirmado` do comprador contendo o produto.
Pedidos pendentes, cancelados ou de outro comprador não contam.
Sem compra, `nao_comprou` prevalece sobre avaliações legadas existentes.
Produto inexistente também resulta em `nao_comprou`.
A consulta reúne os dois EXISTS em uma leitura parametrizada.

`POST /avaliacoes` repete a autorização dentro da transação de escrita.
Sem compra confirmada recebe 403 `COMPRA_NAO_VERIFICADA`.
Esse código também vale para produto inexistente com UUID válido.
A checagem bloqueia o pedido e item com `FOR SHARE`.
Os bloqueios permanecem até a conclusão do insert e commit.
A restrição UNIQUE preserva 409 `AVALIACAO_DUPLICADA` para repetição autorizada.
Após o commit, o service invalida produtos e recomendações.
A média continua calculada na leitura, sem AVG na transação.

Reutiliza `ItemPedido_pedidoId_idx`, `ItemPedido_produtoId_idx` e
o prefixo de comprador de `Pedido_compradorId_criadoEm_idx`.
A consulta de avaliação usa UNIQUE comprador/produto existente.
Não exige migration.

Frontend consulta elegibilidade antes de mostrar o formulário.
Somente `podeAvaliar: true` oferece o botão de envio.
403 após uma consulta positiva também remove o formulário.
409 mantém a mensagem de produto já avaliado.
O adapter HTTP envia somente `produtoId` na query.
A Fake API aplica a regra sobre pedidos locais persistidos.
A consulta orienta a interface; POST mantém a barreira real.

## Web.3: registrar avaliação de produto

`POST /avaliacoes` exige sessão ativa e papel `comprador`.
O corpo é estrito; `compradorId` vem exclusivamente do token.

```json
{
  "produtoId": "00000000-0000-4000-8000-000000000001",
  "nota": 5,
  "comentario": "Peça bem acabada."
}
```

`produtoId` deve ser UUID; a identidade é normalizada para lowercase.
`nota` é obrigatória, inteira, entre 1 e 5.
`comentario` é opcional, recebe trim e aceita até 500 caracteres.
Comentário vazio é persistido como nulo e omitido na resposta.
Campos extras, nota inválida ou comentário excessivo recebem 400 `VALIDACAO`.

Sucesso 201 retorna a avaliação criada:

```json
{
  "id": "00000000-0000-4000-8000-000000000002",
  "produtoId": "00000000-0000-4000-8000-000000000001",
  "compradorId": "00000000-0000-4000-8000-000000000003",
  "nota": 5,
  "comentario": "Peça bem acabada.",
  "criadoEm": "2026-10-22T12:00:00.000Z"
}
```

Sem sessão recebe 401; artesão e admin recebem 403.
Sem compra confirmada recebe 403 `COMPRA_NAO_VERIFICADA`, inclusive produto inexistente.
A restrição UNIQUE de comprador/produto impede duplicação concorrente.
Segunda tentativa recebe 409 `AVALIACAO_DUPLICADA`, preservando a primeira.
Respostas protegidas usam `Cache-Control: no-store`.

Não persiste nota média nem executa AVG na transação de escrita.
`GET /avaliacoes?produtoId=...` mantém `{ itens, resumo: { media, total } }`.
A média é calculada sobre avaliações persistidas, durante a leitura.
A leitura mantém as regras atuais de visibilidade do catálogo.
Após gravar, invalida `produtos:*` e `recomendacoes:*`.
Escritas rejeitadas preservam o cache válido.

Frontend: `AvaliacoesService.criar(input, compradorId)` e adapter HTTP.
O argumento compradorId atende à Fake API; não integra o corpo HTTP.
`create` permanece como compatibilidade com consumidores anteriores.
HTTP valida UUID, campos estritos, nota e comentário antes de enviar.
Os IDs sintéticos da Fake API permanecem aceitos somente naquele modo.
DTOs de leitura e escrita descartam propriedades não contratadas.

Minha conta oferece um formulário por item em pedidos confirmados.
Consulta elegibilidade autenticada antes de oferecer o formulário.
Contempla carregando, envio, sucesso, erro recuperável e já avaliado.
409 mostra “Você já avaliou este produto.” e bloqueia reenvio.
Erros recuperáveis preservam nota e comentário para nova tentativa.
Pedidos pendentes e cancelados não oferecem o formulário.

A Web.4 complementa esta criação com compra verificada transacional.
As duas subtarefas devem ser publicadas juntas.

## 32.2: avaliações públicas paginadas

`GET /avaliacoes?produtoId=UUID&limit=10&offset=0` é público.
O validator Zod aceita somente esses três parâmetros.
`produtoId` é obrigatório e deve ser UUID válido.
`limit` é inteiro entre 1–50; o padrão é 10.
`offset` é inteiro não negativo; o padrão é zero.
Aceita somente inteiros decimais representáveis com segurança em JavaScript.
Parâmetros desconhecidos, repetidos ou inválidos recebem 400 `VALIDACAO`.
Produtos invisíveis e inexistentes continuam recebendo 404.

Resposta 200 de uma página com `limit=1`:

```json
{
  "itens": [
    {
      "id": "00000000-0000-4000-8000-000000000002",
      "produtoId": "00000000-0000-4000-8000-000000000001",
      "nota": 5,
      "comentario": "Peça bem acabada.",
      "criadoEm": "2026-10-22T12:00:00.000Z"
    }
  ],
  "resumo": { "media": 4.4, "total": 35 }
}
```

`itens` contém somente a página, ordenada por `criadoEm DESC, id ASC`.
`resumo.media` e `resumo.total` consideram todas as avaliações do produto.
A média continua arredondada para uma casa decimal na leitura.
Agregado e página compartilham uma transação `RepeatableRead`.
Uma página fora do total retorna `itens: []`, preservando o resumo.
Sem avaliações retorna média e total zerados.

A resposta pública não expõe `compradorId`, nome ou email.
A interface mostra nota, comentário e data, sem autor identificado.
O retorno privado do POST continua incluindo a própria identidade.
Não existe cache compartilhado nessa leitura: `Cache-Control: no-store`.
O POST mantém a invalidação de catálogo e recomendações.

`AvaliacoesService.listarPagina(produtoId, { limit, offset })` atende à interface.
O DTO público é `AvaliacaoPublica`, sem identidade do comprador.
O adapter HTTP valida página e resumo global separadamente.
A Fake API pagina seus registros persistidos pelo mesmo contrato.
O detalhe oferece “Anterior”, “Próxima” e “Página X de Y”.
A média e a quantidade do produto independem da página exibida.
Comentários têm estados carregando, sucesso, vazio e erro recuperável.
O botão “Tentar novamente” repete a página que falhou.

O seed demo acrescenta 35 avaliações à “Boneca de Barro Pintada”.
Os 35 compradores são sintéticos e distintos.
Cada avaliação tem uma compra confirmada anterior, com pagamento simulado.
IDs determinísticos e upserts preservam a idempotência.
Essa carga tem média 3,0 e páginas de 10/10/10/5.

## Web.1: pedidos recebidos pelo artesão

### Web.2: envio dos próprios itens

`PATCH /artesao/itens-pedido/:id/enviar` exige sessão e papel `artesao`.
O UUID identifica `ItemPedido.id`, diferente de `produtoId`.
Não recebe corpo ou query; objeto vazio é permitido.
Responde 200 com `{ id, status: "enviado", enviadoEm }`.
`enviadoEm` é uma data ISO com timezone.
Item alheio ou inexistente recebe 404 `ITEM_PEDIDO_NAO_ENCONTRADO`.
Já enviado recebe 409 `ITEM_JA_ENVIADO`.
Pedido não confirmado recebe 409 `PEDIDO_NAO_CONFIRMADO`.
Sessão ausente recebe 401; outros papéis recebem 403.
Input inválido recebe 400 `VALIDACAO`.
A transação bloqueia o item para escrita.
Também protege produto e pedido contra alterações concorrentes.
Propriedade, estado e confirmação são verificados dentro dela.
Envios simultâneos produzem um sucesso e conflitos posteriores.

`GET /artesao/pedidos` e `GET /pedidos/:id` incluem por item:
`id`, `status` e `enviadoEm`, além dos campos anteriores.
Status permitido: `aguardando_envio` ou `enviado`.
O instante permanece nulo enquanto aguarda envio.
Leituras preservam isolamento e `Cache-Control: no-store`.
O POST do checkout mantém seu contrato anterior.

Frontend: `/painel-artesao/pedidos`, com confirmação por item.
Lista paginada, carregando, vazio e erro recuperável.
O menu do artesão fornece acesso à tela.
O detalhe do comprador mostra o status individual.
Atualiza ao retomar foco ou selecionar “Atualizar pedido”.
Também refaz a leitura ao reabrir o detalhe.
Não exige novo login ou cache de sessão renovado.
O fluxo do artesão funciona no modo HTTP.
A Fake API mantém itens locais como aguardando envio.
O modelo não contém endereço nem contato de entrega.
A tela apresenta os dados existentes: número, data, comprador e itens.

### Contrato da listagem

`GET /artesao/pedidos` exige autenticação e papel atual `artesao`.
A identidade vem exclusivamente da sessão revalidada no PostgreSQL.
Anônimo recebe 401; comprador e admin recebem 403.
`GET /pedidos` continua exclusivo do comprador.

Query estrita: `limit` e `offset`, como inteiros decimais.
Padrões: `limit=10`, `offset=0`.
Limites: `limit` entre 1 e 100; `offset` entre 0 e 10000.
Campos desconhecidos, repetidos ou inválidos recebem 400 `VALIDACAO`.
Não aceita `artesaoId`, `compradorId`, `escopo` ou `status` externos.

Resposta 200:

```json
{
  "itens": [{
    "id": "00000000-0000-4000-8000-000000000001",
    "numero": "ORG-2026-000001",
    "criadoEm": "2026-10-22T12:00:00.000Z",
    "nomeComprador": "Comprador sintetico",
    "itens": [{
      "id": "00000000-0000-4000-8000-000000000003",
      "status": "aguardando_envio",
      "enviadoEm": null,
      "produtoId": "00000000-0000-4000-8000-000000000002",
      "nome": "Peca sintetica",
      "quantidade": 3,
      "precoUnitario": 0.10,
      "subtotal": 0.30
    }],
    "subtotalArtesao": 0.30
  }],
  "limit": 10,
  "offset": 0,
  "total": 1
}
```

Retorna somente pedidos `confirmado` com pelo menos um item próprio.
Cada pedido contém somente itens de produtos do artesão autenticado.
O filtro ocorre no banco, antes da paginação.
Ordena por `criadoEm DESC`, depois `id DESC` como desempate.
Itens seguem `id ASC`; lista e contagem compartilham snapshot RepeatableRead.
`total` externo conta pedidos elegíveis, sem representar valor financeiro.
Não expõe total financeiro, pagamento ou itens de outros artesãos.
Comprador aparece somente por nome, sem email ou identificador.

`subtotalArtesao` soma valores persistidos usando Decimal antes da conversão.
Preços atuais e visibilidade dos produtos não alteram o histórico.
O nome do item vem do produto relacionado atual.
Valores legados nulos permanecem `null` em preço e subtotal.
Subtotais nulos não acrescentam valor à soma do artesão.
`numero` legado pode ser `null`; datas usam ISO 8601 UTC.
Sem pedidos elegíveis ou fora da página retorna `itens: []`.
Respostas privadas usam `Cache-Control: no-store`, sem cache compartilhado.

## BD.3: indicadores de vendas do artesão

`GET /artesao/indicadores` exige sessão e papel atual `artesao`.
A identidade vem exclusivamente do token revalidado no PostgreSQL.
A query deve ser vazia. Campos externos recebem 400 `VALIDACAO`.
Anônimo recebe 401; comprador e admin recebem 403.
Não aceita selecionar outro artesão pela URL.

Resposta 200:

```json
{
  "quantidadeVendida": 10,
  "receitaTotal": 51.83,
  "numeroPedidos": 2,
  "ultimaVenda": "2026-10-13T12:00:00.000Z",
  "atualizadoEm": "2026-10-22T19:00:00.000Z"
}
```

Quantidade soma `ItemPedido.quantidade`; receita soma `ItemPedido.subtotal`.
Considera somente itens próprios em pedidos `confirmado`.
Pedidos compartilhados contam uma vez por artesão participante.
Pendentes e cancelados não influenciam nenhum indicador.
A consulta agrega itens por produto/pedido antes do JOIN com Produto.
Fotos e avaliações não participam, evitando fanout.
Produtos ocultos ou sem estoque mantêm suas vendas históricas.
Preço atual, total do pedido e quantidadeVendida persistida não substituem itens.
Subtotais legados nulos não acrescentam receita, sem recomposição retroativa.

`numeroPedidos` conta IDs distintos, inclusive com vários produtos próprios.
`ultimaVenda` usa o maior `Pedido.criadoEm` confirmado do artesão.
O modelo não possui uma data separada de confirmação.
`atualizadoEm` usa o instante da consulta no PostgreSQL.
Datas usam ISO 8601 em UTC.
Receita usa `number`, arredondada para duas casas no SQL.
JSON numérico não preserva zeros decimais à direita.
Sem vendas confirmadas retorna zeros e `ultimaVenda: null`.
Também retorna zeros quando o artesão não possui produtos.
Não retorna 404 nesses casos.
Respostas privadas usam `Cache-Control: no-store`, sem cache compartilhado.

## 32.1: indicadores gerais do administrador

`GET /admin/indicadores` herda a proteção global de `/admin`.
Exige sessão ativa e papel `admin`, revalidado no PostgreSQL.
Anônimo recebe 401; comprador e artesão recebem 403.
A query deve ser vazia, com validação estrita.
Qualquer parâmetro recebe 400 `VALIDACAO`.
Todas essas respostas usam `Cache-Control: no-store`.

Resposta 200:

```json
{
  "artesaosAtivos": 3,
  "produtosAtivos": 3,
  "pedidosConfirmados": 4,
  "receitaTotal": "100000000.29",
  "atualizadoEm": "2026-11-04T12:00:00.000Z"
}
```

Reutiliza `PrismaIndicadoresPlataformaRepository`, entregue na subtarefa 33.3.
`artesaosAtivos` conta usuários ativos com papel `artesao`.
`produtosAtivos` conta produtos visíveis pelo catálogo público.
Exige produto ativo, sem moderação, estoque positivo e artesão ativo.
`pedidosConfirmados` conta pedidos com status `confirmado`.
`receitaTotal` soma `Pedido.total` somente dos pedidos confirmados.
Totais legados nulos não acrescentam receita.
Fotos, avaliações e itens não multiplicam os agregados.
As quatro consultas compartilham o snapshot do mesmo SELECT.
Sem registros elegíveis retorna zeros e receita `"0.00"`.
A receita permanece Decimal até `toFixed(2)` no service.
O JSON usa string decimal, preservando exatamente duas casas.
`atualizadoEm` usa o instante após a consulta, em ISO UTC.

`HttpIndicadoresAdminService.obter()` consome o endpoint pelo proxy `/api`.
O cliente envia cookie e usa `cache: no-store`.
Valida contadores, receita decimal e data antes da exibição.
O container oferece esse service somente no modo HTTP.
No modo fake retorna `null`, seguindo services exclusivos de HTTP.
Não existe adapter fake novo nem fallback de dados locais.

O card de `/admin` mostra quatro valores e a atualização.
Valores monetários usam BRL e formatação `pt-BR`.
A formatação preserva centavos, usando BigInt na parte inteira.
A data aparece no fuso `America/Recife`.
Vazio significa quatro agregados zerados, após resposta válida.
Cadastros sem vendas continuam no estado de sucesso.
Carregamento não antecipa números; erro oferece “Tentar novamente”.
Trocar a conta descarta respostas pendentes e dados anteriores.

## Web.5: consumo dos indicadores no painel

`IndicadoresArtesaoService.obter()` retorna o DTO de `GET /artesao/indicadores`.
Não recebe identificador externo do artesão.
O adapter HTTP usa cookie de sessão e `cache: no-store`.
Valida números, datas e coerência da resposta.
Erros HTTP são propagados, sem fallback para armazenamento local.

`obterIndicadoresArtesaoService()` seleciona HTTP ou fake explicitamente.
A versão fake consulta pedidos e produtos locais persistidos.
Usa somente itens próprios em pedidos confirmados.
Soma preços congelados em centavos e conta pedidos distintos.
Não usa o contador agregado nem preços atuais dos produtos.
O instante da consulta preenche `atualizadoEm` no modo fake.

`useIndicadoresArtesao` representa carregando, sucesso, vazio e erro.
Descarta respostas de consultas canceladas.
O card do painel mostra quantidade, receita BRL e pedidos.
A data exibida vem do `atualizadoEm` retornado pelo service.
Sem pedidos confirmados, mostra “Nenhuma venda ainda”.
Erros oferecem “Tentar novamente”, sem apresentar valores inventados.
A troca de conta remonta o card, eliminando dados anteriores.

## Convencoes

Services da Fake API e rotas reais compartilham DTOs equivalentes. O sucesso
retorna dados do recurso. Erros seguem esta forma:

```json
{
  "error": {
    "code": "CODIGO_ESTAVEL",
    "message": "Mensagem segura e compreensivel.",
    "details": {}
  }
}
```

Use 400 para entrada invalida, 401 para ausencia de sessao, 403 para papel
incorreto, 404 para recurso ausente e 409 para conflitos de dominio.

## Contratos da Fake API

As funcoes abaixo sao assincronas. Nomes exatos podem seguir a convencao do
repositorio, mantendo os mesmos comportamentos:

```ts
interface UsuariosService {
  list(): Promise<UsuarioPublico[]>;
  register(input: CadastroInput): Promise<UsuarioSessao>;
  login(input: LoginInput): Promise<UsuarioSessao>;
}

interface ProdutosService {
  list(query: ProdutoQuery): Promise<Produto[]>;
  create(input: NovoProdutoInput): Promise<Produto>;
  update(id: string, input: ProdutoPatch): Promise<Produto>;
  remove(id: string): Promise<void>;
  obterPublico(id: string): Promise<Produto | null>;
}

interface CarrinhoService {
  get(): Promise<Carrinho>;
  add(produtoId: string, quantidade: number): Promise<Carrinho>;
  change(produtoId: string, quantidade: number): Promise<Carrinho>;
  remove(produtoId: string): Promise<Carrinho>;
}

interface Avaliacao {
  id: string;
  produtoId: string;
  compradorId: string;
  nota: number;
  comentario?: string;
  criadoEm: string;
}

type AvaliacaoPublica = Omit<Avaliacao, "compradorId">;

interface ResumoAvaliacoes {
  produtoId: string;
  media: number;
  quantidade: number;
}

interface AvaliacoesService {
  listByProduto(produtoId: string): Promise<AvaliacaoPublica[]>;
  listarPagina(produtoId: string, paginacao?: { limit?: number; offset?: number }): Promise<{
    itens: AvaliacaoPublica[];
    resumo: { media: number; total: number };
  }>;
  resumo(produtoId: string): Promise<ResumoAvaliacoes>;
  create(input: NovaAvaliacaoInput, compradorId: string): Promise<Avaliacao>;
}

type RecomendacaoContexto =
  | { produtoId: string; usuarioId?: never }
  | { usuarioId: string; produtoId?: never };

interface RecomendacaoResultado {
  estrategia: string;
  itens: Produto[];
}

interface RecomendacoesService {
  obter(contexto: RecomendacaoContexto): Promise<RecomendacaoResultado>;
}

interface ModeracaoService {
  listarArtesaos(adminId: string): Promise<UsuarioPublico[]>;
  listarProdutos(adminId: string): Promise<Produto[]>;
  ativarArtesao(artesaoId: string, adminId: string): Promise<UsuarioPublico>;
  desativarArtesao(artesaoId: string, adminId: string): Promise<UsuarioPublico>;
  ativarProduto(produtoId: string, adminId: string): Promise<Produto>;
  desativarProduto(produtoId: string, adminId: string): Promise<Produto>;
}
```

`ModeracaoService` atende a US17 no painel `/admin`. Cada operacao consulta
o repositorio pelo `adminId` da sessao. Usuario inexistente, inativo ou sem
papel `admin` recebe `ACESSO_NEGADO`, equivalente a 403. O papel gravado na
sessao do navegador nao e confiado. Alvo que nao seja artesao retorna
`ARTESAO_NAO_ENCONTRADO`. Produto ausente retorna `PRODUTO_NAO_ENCONTRADO`.
Ambos equivalem a 404. O admin moderando a propria conta recebe
`OPERACAO_NAO_PERMITIDA`, equivalente a 409.

Moderar artesao altera somente `Usuario.ativo`. Moderar produto altera
somente `Produto.desativadoPorAdmin`, separado do `ativo` que o dono usa ao
remover. Por isso reativar pelo admin nunca restaura produto removido pelo
artesao. `UsuarioRepository.update` preserva id, email, senha e papel mesmo
diante de alteracoes manipuladas. Nada e apagado. Pedidos existentes mantem
nome e preco copiados no momento da compra.

Produto desativado some de `list`, `search`, `obterPublico`, perfil publico
e recomendacoes. Artesao desativado nao inicia sessao. Seus produtos somem
dos mesmos pontos publicos. Em ambos os casos, `listByArtesao` continua
mostrando o produto ao dono, sinalizado quando moderado. O checkout rejeita
com `PRODUTO_INDISPONIVEL` item desativado pelo admin ou de artesao
desativado, mesmo que ja estivesse no carrinho, sem baixar estoque.
Reativar restaura a visibilidade e a venda.

`PedidosService.confirmar` valida os itens na borda antes de ler ou gravar
estoque. Quantidade que nao seja inteiro positivo retorna
`QUANTIDADE_INVALIDA`. O mesmo `produtoId` repetido retorna `ITEM_DUPLICADO`.
Ambos equivalem a 400 e nao gravam pedido. Na AV2, o contrato mapeia para
`PATCH /admin/artesaos/:id/moderar` e `PATCH /admin/produtos/:id/moderar`.

`obterPublico` alimenta a pagina `/produto/[id]`. Retorna `null` para id
vazio, produto inexistente, inativo ou sem estoque, aplicando a mesma regra
de visibilidade publica da vitrine. A pagina trata `null` como indisponivel
ou nao encontrado. Na AV2, mapeia para `GET /produtos/:id` com 404.

Respostas publicas de usuario nunca incluem senha. A verificacao interna de
login permanece encapsulada no repositorio falso.

`listByProduto` retorna da avaliacao mais recente para a mais antiga.
`resumo` arredonda a media para uma casa e retorna zero sem avaliacoes.
`create` exige nota inteira de 1 a 5 e comentario opcional de ate 500
caracteres. Violacoes retornam `AVALIACAO_INVALIDA`, equivalente a 400. Uma
segunda avaliacao do mesmo comprador no mesmo produto retorna
`AVALIACAO_DUPLICADA`, equivalente a 409. Comprador vazio retorna
`NAO_AUTENTICADO`, equivalente a 401. Produto ausente, inativo, desativado
pelo admin ou de artesao desativado retorna `PRODUTO_NAO_ENCONTRADO`,
equivalente a 404. A exigencia de compra confirmada
(`COMPRA_NAO_CONFIRMADA`) entra com a US15. Na AV2, o contrato mapeia para
`GET /avaliacoes?produtoId=` e `POST /avaliacoes`.

Na AV1, `RecomendacoesService` usa `FakeRecommendationAdapter`. Ele consulta
o repositorio local e nunca chama o backend. Na AV2, a composicao usa
`HttpRecommendationAdapter`, preservando interface, DTOs e componentes.

O adapter falso devolve o mesmo formato do endpoint real. Para `produtoId`,
aplica categoria, regiao, vendas, avaliacao e desempate estavel. Para
`usuarioId`, usa popularidade geral durante a U1.

Na vitrine anonima, a pagina escolhe o primeiro produto destacado ja carregado
e envia seu `produtoId`. Ela nunca inventa identificadores nem chama o service
sem contexto. Com sessao restaurada, pode enviar o `usuarioId` real.

## Backend minimo FCCPD

### Autenticação real WEB-03

Todas as respostas usam `Cache-Control: no-store`.
O usuário público contém somente `{ id, nome, email, papel }`.
Senha e senhaHash nunca aparecem em respostas.

| Método | Rota | Entrada | Sucesso | Erros |
|---|---|---|---|---|
| POST | `/auth/register` | `{ nome, email, senha, papel }` | 201, usuário público e cookie de sessão | 400, 409, 503 |
| POST | `/auth/login` | `{ email, senha }` | 200, usuário público e cookie | 400, 401, 503 |
| POST | `/auth/logout` | Sem corpo obrigatório | 204, cookie expirado | |
| GET | `/auth/me` | Cookie de sessão | 200, usuário público | 401, 503 |

Cadastro aceita somente comprador ou artesao; admin retorna 400.
Nome tem 3–120 caracteres após trim; email válido até 254.
Email recebe trim e conversão para minúsculas.
Senha exige oito caracteres, limitada a 72 bytes UTF-8.
Login exige senha não vazia com o mesmo limite.
Campos extras e JSON malformado retornam 400 sanitizado.
Email duplicado retorna 409 e `EMAIL_JA_CADASTRADO`.
O banco arbitra conflitos inclusive entre cadastros simultâneos.
Carrinho do comprador ou PerfilArtesao incompleto nasce atomicamente.
Falha na especialização também reverte o usuário.
Cadastro inicia sessão após o commit, conforme US01.C1.
Reutiliza a emissão de JWT/cookie do login.
O papel do token vem do usuário persistido.
Erros 400/409 e falhas na criação não emitem cookie.
Falha na emissão após commit preserva a conta criada.
O erro mantém o formato seguro do error.middleware.
Frontend autentica o SessionStore pelo DTO público retornado.
Não chama login novamente nem usa fallback HTTP para fake.
Comprador segue para `/`, mesmo destino padrão do login.
Artesão segue para a rota canônica `/painel-artesao`.
No modo fake, o mesmo formulário persiste a sessão local.

Os três cenários inválidos retornam exatamente este HTTP 401:

```json
{"error":{"code":"CREDENCIAIS_INVALIDAS","message":"Email ou senha invalidos."}}
```

Isso cobre email inexistente, senha incorreta e usuário inativo.
Email inexistente executa bcrypt.compare contra hash fixo custo 10.

Cookie `origem_sessao`: HttpOnly, SameSite=Lax, Path=/, Max-Age=86400.
Secure segue COOKIE_SECURE; nenhum Domain é definido.
O JWT HS256 contém sub, papel, nome, iat e exp.
A sessão expira em 24h, com assinatura e claims validados.
JWT_SECRET ausente ou inadequado impede emissão de sessão.
Nesse caso, login ou cadastro retorna 503 e `AUTH_NAO_CONFIGURADA`.
`/auth/me` reconsulta o usuário ativo pelo sub.
Sessão ausente, inválida, expirada ou usuário indisponível recebe 401:

```json
{"error":{"code":"NAO_AUTENTICADO","message":"Sessao invalida ou ausente."}}
```

Logout expira o cookie, preservando suas opções de segurança.
Tokens copiados não possuem revogação central nesta subtarefa.
O probe `/health/cookie` e sua configuração foram retirados.
Validação pelo proxy utiliza `/api/auth/login` e `/api/auth/me`.
Na WEB-04, pedidos e alteração administrativa utilizam sessão validada.

### `POST /pedidos`

Request autenticado WEB-04, somente para comprador:

```json
{
  "itens": [{ "produtoId": "uuid", "quantidade": 1 }]
}
```

`compradorId` vem do sub validado e do usuário ativo no banco.
O body é estrito: aceita somente itens, com produtoId e quantidade.
Enviar compradorId, compradorRef ou qualquer chave extra retorna 400.
`compradorRef` permanece nullable no banco; pedidos novos deixam-no nulo.
Sessão ausente, inválida, expirada ou usuário inativo recebe 401.
Artesão ou admin recebe 403 neste endpoint de comprador.

Response `201`:

```json
{
  "pedido": {
    "id": "uuid", "compradorId": "uuid", "numero": "ORG-2026-000123",
    "status": "confirmado", "total": 13.37,
    "criadoEm": "2026-10-14T12:00:00.000Z"
  },
  "itens": [{ "produtoId": "uuid", "nome": "Vaso", "quantidade": 1,
    "precoUnitario": 13.37, "subtotal": 13.37 }]
}
```

WEB-09 usa os itens do body, preservando o contrato anterior.
Nao exige equivalencia com os itens salvos no carrinho.
Preco e nome sao lidos do banco sob locks ordenados.
Nao aceita preco, nome, total, numero ou comprador do cliente.
Produto oculto ou artesao indisponivel retorna 404.
Sem estoque, retorna `409 ESTOQUE_INSUFICIENTE` com
`error.details = { produtoId, nome }`.
Quantidade supera 2147483647 ou total supera 99999999.99: 400 VALIDACAO.

Pedido confirmado, itens, pagamento pix_simulado aprovado, estoque,
quantidadeVendida, limpeza integral do carrinho do comprador e outbox
compartilham a mesma transacao. Falhas revertem todas essas gravacoes.
O pagamento possui valor igual ao total, sem gateway real.
O numero nasce do default PostgreSQL usando Pedido_numero_seq.
HttpPedidosService.confirmar serializa somente produtoId e quantidade.
Mapeia numero para numeroConfirmacao, preservando o contrato frontend.
O compradorId do argumento frontal nao e enviado nem concede identidade.
Depois do sucesso, CartStore limpa somente seu estado local.

### `PATCH /admin/usuarios/:id/papel`

Exige sessão ativa de admin e UUID válido no parâmetro id.
O UUID é normalizado para minúsculas antes da comparação de identidade.

```json
{ "papel": "artesao" }
```

O body é estrito e aceita somente comprador ou artesao.
Sucesso retorna 200 com `{ id, nome, email, papel }` atualizado.
Senhas e hashes nunca são devolvidos.
A operação altera somente o papel, preservando outros dados.
Sessão ausente, inválida, expirada ou usuário inativo recebe 401.
Comprador ou artesão recebe 403 e `ACESSO_NEGADO`.
Admin não altera o próprio papel: 403 e `ACESSO_NEGADO`.
UUID, papel ou campos extras inválidos recebem 400 e `VALIDACAO`.
Alvo inexistente recebe 404 e `USUARIO_NAO_ENCONTRADO`.

As duas rotas protegidas usam o papel atual do banco.
Um JWT antigo não preserva permissões retiradas por alteração de papel.
Respostas protegidas usam `Cache-Control: no-store`.
O script legado de concorrência será adaptado no commit 17.

## Recomendacoes

`GET /recomendacoes` aceita somente `produtoId` opcional:

- `produtoId`: recomendacoes relacionadas ao produto.
- Sem contexto: fallback geral para visitantes.

Retorne ate oito produtos. Rejeite `usuarioId` e chaves desconhecidas.
Nao repita o produto de contexto.

Na IA-01, a resposta e `{ estrategia: string, itens: Produto[] }`.
Valores públicos: `categoria`, `historico-compra`, `fallback-geral`,
`fallback-local` e `misto`.
Com oito itens visíveis, preserva a estratégia do microsserviço.
Seleção insuficiente recebe complemento local e estratégia `misto`.
Falha HTTP, timeout ou resposta inválida retorna `fallback-local`.
A API prioriza vendas confirmadas na categoria do contexto.
Completa pelas vendas gerais, usando nota e UUID como desempates.
Exclui contexto, duplicados, produtos indisponíveis e artesãos indisponíveis.
O fallback pessoal também exclui compras confirmadas do comprador.
Respostas degradadas nunca entram no cache e mantêm `X-Cache: MISS`.
A rota pessoal continua sem cache compartilhado ou `X-Cache`.
Recuperado o microsserviço, a próxima consulta volta ao módulo.
Os itens usam o mesmo ProdutoDTO de `GET /produtos`.
Incluem preco numerico, fotos ordenadas, tecnicaId, regiaoId, notaMedia,
quantidadeVendida, ativo, desativadoPorAdmin e criadoEm em ISO 8601.
Aplicam a mesma visibilidade publica do catalogo.
A Strategy retorna internamente `{ estrategia, produtoIds: string[] }`.
O service preserva essa ordem ao carregar e mapear produtos visiveis.
Ranking da fixture e regras do fallback permanecem iguais.

`GET /recomendacoes/para-mim` exige `autenticar` e `exigirPapel('comprador')`.
Recebe identidade exclusivamente do token validado e reconsulta usuario ativo.
Nao aceita parametros de query, incluindo `usuarioId` e `produtoId`.
Responde `401` sem sessao valida, `403` para outros papeis e `400` para query.
Usa categorias dos pedidos confirmados e exclui produtos ja comprados.
Mantem vendas desc, nota media desc, UUID asc e limite oito.
Retorna `historico-compra` ou `fallback-geral` quando faltam candidatos.
Fallback pessoal tambem exclui compras confirmadas.
Resposta usa o mesmo ProdutoDTO, `Cache-Control: no-store`, sem cache compartilhado.

Este endpoint representa a baseline oficial de IA. Durante a AV1, o frontend
usa o adapter falso equivalente. A integracao HTTP ocorre na AV2.

## Catalogo publico HTTP WEB-06

Rotas Express sem prefixo. O proxy Next.js acrescenta `/api`.
Todas estas leituras respondem com `Cache-Control: no-store`.

| Metodo | Rota | Resposta |
|---|---|---|
| GET | `/produtos` | `Produto[]` |
| GET | `/produtos/:id` | `Produto` |
| GET | `/categorias`, `/tecnicas`, `/regioes` | `{ id, nome }[]` |
| GET | `/artesaos` | `{ id, nome, papel: "artesao", ativo: true }[]` |
| GET | `/avaliacoes?produtoId=` | `{ itens: Avaliacao[], resumo: { media, total } }` |

`GET /artesaos` não exige sessão. Retorna somente artesãos ativos.
Ordena por nome e ID, sem e-mail ou credenciais.
`UsuariosService.list()` usa esse resumo público no modo HTTP.
`GET /admin/artesaos` permanece protegido e exclusivo da moderação.

Swagger usa redirecionamento relativo de `/docs` para `./docs/`.
Assets e documento permanecem relativos ao caminho externo.
O OpenAPI usa `servers: [{ url: "../" }]`.
Assim, funciona diretamente no backend e pelo prefixo `/api`.
O Next preserva `/api/docs/`, evitando remover sua barra final.
O middleware canonicaliza `/api/docs` antes do rewrite, preservando a query.

Filtros combinados por AND: termo, categoriaId, tecnicaId, regiaoId, artesaoId.
Termo busca nome e descricao com ILIKE, recebendo trim.
Percentuais, underscores e barras invertidas recebem escape literal.
Valores seguem separados do SQL como parametros posicionais.
Campos extras, parametros repetidos e IDs malformados retornam 400.
Produto, categoria e artesao usam UUIDs. Tecnica e regiao
usam IDs textuais de ate 100 caracteres alfanumericos e hifens.
ID valido inexistente retorna lista vazia nos filtros.
Termo permite ate 200 caracteres; vazio equivale a nenhuma busca.
`limit`: inteiro de 1 a 100, padrao 24.
`offset`: inteiro de 0 a 10000, padrao zero.
Fora desses limites: 400 e `VALIDACAO`.
Ordenacao: criadoEm DESC, depois id ASC para desempate.

Publico exige produto ativo, sem moderacao e estoque positivo.
O usuario artesao precisa estar ativo e possuir papel artesao.
Essas regras tambem valem com filtro artesaoId autenticado.
Listagem privada e escritas continuam fora da WEB-06.
Detalhe oculto e inexistente retornam exatamente o mesmo 404:

```json
{"error":{"code":"PRODUTO_NAO_ENCONTRADO","message":"Produto nao encontrado."}}
```

`backend/src/utils/produto-dto.ts` centraliza o mapper ProdutoDTO.
Preco converte Decimal para number. Fotos incluem url e ordem.
Tecnica vem do produto. Regiao vem do perfil do artesao.
Perfil sem regiao retorna regiaoId vazio.
Nota media usa todas as avaliacoes, arredondada para uma casa.
Quantidade vendida soma itens exclusivamente de pedidos confirmados.
Agregados sem registros retornam zero; criadoEm retorna ISO 8601.

Avaliacoes possuem ordem criadoEm DESC, depois id ASC.
Comentario ausente fica omitido. Credenciais nunca sao retornadas.
Produto oculto ou inexistente tambem retorna 404 nas avaliacoes.
Produto visivel sem avaliacoes retorna itens vazios e resumo zero.
O adapter converte resumo.total para ResumoAvaliacoes.quantidade.
404 vira leitura vazia para permitir o detalhe indisponivel.
Falhas de rede, validacao e servidor continuam recuperaveis.

O container HTTP registra produtos, opcoes e leitura de avaliacoes.
Os adapters validam respostas antes de entregar dados aos hooks.
PENDENTES_HTTP conserva apenas os metodos ainda nao implementados.
Nenhum desses adapters consulta a Fake API ou localStorage.
URLs da tela preservam categoria, tecnica, regiao, artesao.
O adapter envia os nomes com sufixo Id ao backend.

## Perfil do artesao HTTP WEB-07

`GET /usuarios/:id/perfil-artesao` e publico, sem prefixo Express.
O proxy Next.js expoe `/api/usuarios/:id/perfil-artesao`.
Retorna somente `{ artesaoId, nome, historia, tecnicaId, regiaoId,
fotoUrl?, completo }`. Email e credenciais ficam excluidos.
Campos ainda nao preenchidos retornam strings vazias.
Foto ausente fica omitida; perfil incompleto permanece publico.
Usuario inexistente, inativo ou sem papel artesao retorna:

```json
{"error":{"code":"ARTESAO_NAO_ENCONTRADO","message":"Artesao nao encontrado."}}
```

`PATCH /usuarios/:id/perfil-artesao` exige sessao e papel artesao.
O ID da rota deve corresponder ao usuario autenticado.
Terceiros, compradores e administradores recebem 403.
Sessao ausente ou invalida recebe 401.
UUIDs sao normalizados antes da comparacao de propriedade.

Entrada estrita e parcial: `historia`, `tecnicaId`, `regiaoId`, `fotoUrl`.
Pelo menos um campo deve existir. Campos extras retornam 400.
Historia aceita ate 1000 caracteres e recebe trim.
Tecnica e regiao devem existir no PostgreSQL.
String vazia limpa historia, referencia ou foto.
Campos omitidos preservam os valores anteriores.
Foto aceita HTTPS ou caminho local seguro, ate 2048 caracteres.
Protocolos inseguros, controles e caminhos externos sao rejeitados.

O service recalcula completo com historia, tecnica e regiao.
Foto permanece opcional. O cliente nunca informa completo.
A transacao bloqueia o usuario antes de ler e atualizar.
Isso preserva campos omitidos em edicoes concorrentes.
Sucesso retorna 200 e o mesmo DTO da leitura publica.
Ambas as rotas usam `Cache-Control: no-store`.

`HttpPerfilArtesaoService` substitui a fake no container HTTP.
`UsuariosService.obterNomeArtesao` resolve nomes pela mesma rota publica.
O hook publico usa o nome recebido junto ao perfil.
`listByArtesao` reutiliza `GET /produtos?artesaoId=`.
Essa listagem aplica a visibilidade publica e paginacao WEB-06.
O painel relê o perfil ao retornar, atualizando a pendencia.
PerfilArtesaoService e listByArtesao saem de PENDENTES_HTTP.
UsuariosService.list permanece pendente para listagem geral de usuarios.
use-artesaos-ativos continua dependente dessa listagem na vitrine.
Listagem privada e moderacao permanecem no escopo WEB-12.

## Carrinho persistido HTTP WEB-08

Todas as rotas exigem autenticar e papel comprador.
O usuario vem exclusivamente da sessao, nunca do payload.
As respostas usam `Cache-Control: no-store`.
O proxy Next.js acrescenta `/api` nas chamadas frontend.

| Metodo | Rota | Entrada |
|---|---|---|
| GET | `/carrinho` | Sem query |
| POST | `/carrinho/itens` | `{ produtoId, quantidade }` |
| PATCH | `/carrinho/itens/:produtoId` | `{ quantidade }` |
| DELETE | `/carrinho/itens/:produtoId` | Sem entrada |

Sucesso retorna 200 e o carrinho inteiro:
`{ itens, total, atualizadoEm }`. Cada item possui
`{ produtoId, nome, precoUnitario, quantidade, estoqueDisponivel }`.
Carrinho vazio retorna itens vazios e total zero.
Decimal vira number; atualizadoEm usa ISO 8601.

POST soma a quantidade existente. PATCH substitui a quantidade.
Quantidade deve ser inteira entre 1 e 2147483647.
No frontend, quantidade zero e convertida em DELETE.
Schemas estritos rejeitam identidade, preco e campos extras.
ProdutoId deve ser UUID; queries extras recebem 400.
PATCH e DELETE de item ausente retornam 404.
Produto oculto, sem estoque ou de artesao inativo
retorna 404 ao adicionar ou alterar.
DELETE permite remover um item posteriormente ocultado.

Quantidade acima do estoque atual recebe 409:

```json
{"error":{"code":"ESTOQUE_INSUFICIENTE","message":"Estoque insuficiente.","details":{"produtoId":"UUID","nome":"Nome do produto"}}}
```

PrecoUnitario e lido do produto e gravado no PostgreSQL.
Cada POST ou PATCH valido atualiza esse preco capturado.
GET preserva o preco gravado e informa estoque atual.
Itens posteriormente ocultados aparecem com estoqueDisponivel zero.
O carrinho nao reserva nem desconta estoque dos produtos.
As operacoes usam transacao e consultas parametrizadas.
O lock do usuario serializa escritas do mesmo carrinho.
O lock do produto protege a leitura do estoque atual.

HttpCarrinhoService valida os DTOs recebidos.
CartStore conserva o modo local para visitantes.
Com sessao HTTP de comprador, sincroniza pelo servidor.
LocalStorage nao guarda o carrinho privado do comprador.
Login e hidratacao da sessao iniciam a mesclagem local.
Quantidades somam ate o limite atual, incluindo itens existentes.
Produtos invalidos ou ocultos sao descartados com aviso.
Somente itens confirmados ou descartados saem do local.
Falhas recuperaveis preservam os itens ainda nao processados.
Uma nova tentativa nao repete itens ja confirmados.
Logout invalida respostas pendentes sem esvaziar o servidor.
CarrinhoStore sai de PENDENTES_HTTP.

O frontend preserva carregando, sucesso, vazio e erro recuperavel.
Avisos de mesclagem aparecem na vitrine e no carrinho.
O erro 409 preserva apenas produtoId e nome permitidos.
O modo fake conserva as stores locais da AV1.
Checkout real permanece fora deste escopo, na WEB-09.

## Meus pedidos HTTP WEB-11

As leituras exigem sessão ativa e papel comprador.
O comprador vem exclusivamente do token validado.
Respostas privadas utilizam `Cache-Control: no-store`.
O backend não recebe o prefixo `/api`.
Esse prefixo pertence ao proxy Next.js.

### `GET /pedidos`

Query estrita: `pagina` e `limite`.
Ambos precisam ser inteiros positivos em representação decimal.
Página padrão: 1; limite padrão: 10.
Máximos: página 10000 e limite 100.
Parâmetros desconhecidos ou repetidos recebem 400 `VALIDACAO`.
Não aceita compradorId para selecionar outra conta.
Ordena por criadoEm DESC, depois id DESC.
Reutiliza o índice compradorId, criadoEm de BD-04.
Itens e contagem compartilham snapshot RepeatableRead.

Resposta `200`:

```json
{
  "itens": [{
    "id": "uuid", "numero": "ORG-2026-000001",
    "status": "confirmado", "total": 26.74,
    "criadoEm": "2026-10-14T12:00:00.000Z",
    "pagamento": {
      "id": "uuid", "metodo": "pix_simulado", "status": "aprovado",
      "valor": 26.74, "dataPagamento": "2026-10-14T12:00:00.000Z"
    }
  }],
  "pagina": 1, "limite": 10, "total": 1
}
```

`total` externo conta pedidos; o interno representa valor.
Página sem resultados retorna `itens: []`.
A listagem não carrega itens detalhados de cada pedido.

### `GET /pedidos/:id`

O ID deve ser UUID e recebe normalização lowercase.
Consulta sempre combina ID e comprador autenticado.
Terceiro e inexistente recebem exatamente a mesma resposta:

```json
{"error":{"code":"PEDIDO_NAO_ENCONTRADO","message":"Pedido nao encontrado."}}
```

Sucesso `200`: `{ pedido, itens, pagamento }`.
`pedido` contém id, compradorId, numero, status, total, criadoEm.
`itens` contém produtoId, nome, quantidade, precoUnitario e subtotal.
`pagamento` usa o formato da listagem ou `null`.
Valores monetários vêm do registro persistido da compra.
O nome do item vem do produto relacionado atual.
Decimal converte para number; datas usam ISO 8601.
Valores legados ausentes permanecem `null`, sem recomposição pelo catálogo.
Pagamento ausente permanece `null`, sem comprovante inventado.
Credenciais, email e compradorRef nunca integram essas respostas.

Ambas as rotas retornam 401 sem sessão válida.
Artesão e admin recebem 403; UUID inválido recebe 400.
Não existe leitura administrativa nesta subtarefa.

### Contrato frontal e interface

```ts
listarMeus(paginacao?: { pagina?: number; limite?: number }): Promise<PaginaPedidos>;
obter(id: string): Promise<DetalhePedido>;
```

O adapter converte numero para numeroConfirmacao.
Valida paginação, status, datas, totais, itens e pagamento.
HTTP 404 é propagado, sem consulta ao storage local.
Minha conta consulta pedidos somente para o papel comprador.
Mostra pendente, confirmado e cancelado com estilos distintos.
Expõe pagamento aprovado, recusado ou ausência de registro.
Lista e detalhe possuem carregando e erro recuperável.
Lista vazia tem mensagem própria após concluir a consulta.
A troca de conta desmonta o histórico anterior.
Respostas tardias são descartadas pelos hooks.
Datas aparecem no horário local de Pernambuco.

A Fake API implementa os mesmos métodos de leitura.
Obtém a identidade pelo fornecedor de sessão do container.
Filtra a conta atual e preserva paginação e ordenação.
Novas confirmações locais registram pagamento simulado aprovado.
Pedidos locais antigos não ganham pagamentos retroativos.

## WEB-12: catálogo privado e moderação HTTP

Todas as escritas exigem sessão válida. Identidades vêm do cookie.
`GET /artesao/produtos` exige artesão e lista somente seus produtos.
A resposta inclui produtos inativos, moderados e sem estoque.
O perfil público usa `GET /produtos?artesaoId=...`.

| Rota | Papel | Corpo | Sucesso |
|---|---|---|---|
| `POST /produtos` | artesão | NovoProdutoInput e tecnicaId opcional | 201, ProdutoDTO |
| `PATCH /produtos/:id` | dono ou admin | Campos parciais do produto e ativo opcional | 200, ProdutoDTO |
| `DELETE /produtos/:id` | dono ou admin | Sem corpo | 200, ProdutoDTO com ativo=false |
| `PATCH /produtos/:id/estoque` | dono ou admin | quantidadeEstoque | 200, ProdutoDTO |
| `GET /admin/artesaos` | admin | Sem corpo | 200, lista de artesãos |
| `GET /admin/produtos` | admin | Sem corpo | 200, lista completa de ProdutoDTO |
| `PATCH /admin/artesaos/:id/moderar` | admin | ativo booleano | 200, artesão |
| `PATCH /admin/produtos/:id/moderar` | admin | ativo booleano | 200, ProdutoDTO |

NovoProdutoInput contém nome, descrição, preço, categoria, fotos e estoque.
Sem tecnicaId, o cadastro usa a técnica principal do perfil.
Perfil sem técnica exige informar tecnicaId ou completar o perfil.
Fotos recebem ordem pelo índice. As categorias vêm de `/categorias`.
Preço aceita até duas casas decimais. Estoque aceita inteiro não negativo.
Referências inexistentes, extras e entradas inválidas retornam 400.
artesaoId externo no cadastro retorna 403 e nunca altera autoria.

Escritas e moderação de produto travam sua linha com FOR UPDATE.
O checkout disputa exatamente a mesma linha de Produto.
Propriedade e bloqueio administrativo são revalidados após adquirir o lock.
Produto moderado permanece com desativadoPorAdmin=true.
O dono não consegue reativá-lo nem alterar esse campo.
Reativação administrativa remove apenas esse bloqueio, preservando soft delete.
Moderação de artesão altera somente Usuario.ativo e trava sua linha.
Inativos somem da vitrine, não autenticam e perdem sessões existentes.
Admin não modera a própria conta, inclusive com UUID maiúsculo.

Todo caminho `/admin/*` aplica autenticação e exigirPapel('admin').
Comprador e artesão recebem 403 antes dos validadores dessas rotas.
Anônimo recebe 401. Registros inexistentes retornam 404.
Artesãos administrativos expõem somente id, nome, email, papel e ativo.
Hashes e credenciais nunca integram respostas.

HttpProdutosService implementa create, update, remove e listByArtesao.
Também oferece atualizarEstoque pelo endpoint dedicado.
HttpModeracaoService implementa as seis operações do contrato existente.
UsuariosService.list consulta a listagem administrativa de artesãos.
PENDENTES_HTTP está vazio. O teste do checkpoint exige esse resultado.

## WEB-14: notificações do artesão

As rotas exigem sessão válida e papel artesão.
O destinatário vem exclusivamente do token revalidado.
Respostas privadas utilizam `Cache-Control: no-store`.

| Método | Rota | Sucesso |
|---|---|---|
| GET | `/artesao/notificacoes` | 200, lista de notificações |
| PATCH | `/artesao/notificacoes/:id/lida` | 204, sem corpo |

GET retorna `{ id, pedidoId, tipo, lida, criadoEm }[]`.
Tipo é `novo_pedido`; criadoEm utiliza ISO 8601.
Lista vazia retorna `[]`; não inclui identidade do destinatário.
Ordenação: lida ASC, criadoEm DESC e id ASC.
Parâmetros externos não alteram o destinatário autenticado.
PATCH recebe UUID e marca somente uma notificação própria.
Repetir PATCH mantém sucesso; UUID inválido recebe 400.
Notificação alheia ou inexistente recebe o mesmo 404:

```json
{"error":{"code":"NAO_ENCONTRADO","message":"Notificacao nao encontrada."}}
```

Sem sessão recebe 401; comprador e admin recebem 403.
HttpNotificacoesService implementa listar e marcarComoLida.
Valida DTOs e propaga erros sem fallback local.
O container disponibiliza esse service somente em modo HTTP.
O painel mostra carregando, vazio, sucesso e erro recuperável.
Badge conta somente notificações não lidas.
Polling ocorre a cada 15s, sem consultas sobrepostas.
A aba oculta suspende o intervalo; desmontagem remove-o.
Voltar à aba dispara consulta imediata e reinicia polling.
