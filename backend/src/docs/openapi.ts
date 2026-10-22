import {
  extendZodWithOpenApi,
  OpenAPIRegistry,
  OpenApiGeneratorV31,
  type RouteConfig,
  type ResponseConfig,
} from "@asteasolutions/zod-to-openapi";
import { z } from "zod";
import { cadastroSchema, loginSchema } from "../validators/auth.validator.js";
import {
  adicionarCarrinhoSchema,
  alterarCarrinhoSchema,
  carrinhoItemParamsSchema,
  carrinhoQuerySchema,
} from "../validators/carrinho.validator.js";
import {
  avaliacoesQuerySchema,
  catalogoQuerySchema,
  produtoParamsSchema,
} from "../validators/catalogo.validator.js";
import {
  estoqueSchema,
  moderacaoSchema,
  produtoCreateSchema,
  produtoPatchSchema,
  produtoParamsSchema as gestaoParamsSchema,
} from "../validators/gestao-produtos.validator.js";
import { notificacaoParamsSchema } from "../validators/notificacao.validator.js";
import { indicadoresQuerySchema } from "../validators/indicadores.validator.js";
import {
  criarAvaliacaoSchema,
  elegibilidadeAvaliacaoQuerySchema,
} from "../validators/avaliacao.validator.js";
import {
  criarPedidoSchema,
  paginacaoPedidoSchema,
  paginacaoPedidosArtesaoSchema,
  pedidoParamsSchema,
} from "../validators/pedido.validator.js";
import {
  perfilArtesaoParamsSchema,
  perfilArtesaoPatchSchema,
} from "../validators/perfil-artesao.validator.js";
import {
  recomendacaoPessoalQuerySchema,
  recomendacaoQuerySchema,
} from "../validators/recomendacao.validator.js";
import { alterarPapelSchema } from "../validators/usuario.validator.js";

extendZodWithOpenApi(z);
export const registry = new OpenAPIRegistry();

const id = "00000000-0000-4000-8000-000000000001";
const data = "2026-10-15T12:00:00.000Z";
const uuid = z.uuid();
const dinheiro = z.number().nonnegative();
const inteiro = z.number().int().nonnegative();
const instante = z.iso.datetime();

function registrar<T extends z.ZodType>(
  nome: string,
  schema: T,
  example: z.input<T>,
): T {
  return registry.register(nome, schema.clone().openapi({ example }));
}

const usuarioExample = {
  id,
  nome: "Pessoa Exemplo",
  email: "pessoa@example.com",
  papel: "comprador" as const,
};
const usuario = registrar(
  "Usuario",
  z.object({
    id: uuid,
    nome: z.string(),
    email: z.email(),
    papel: z.enum(["comprador", "artesao", "admin"]),
  }),
  usuarioExample,
);
const artesaoExample = {
  ...usuarioExample,
  papel: "artesao" as const,
  ativo: true,
};
const artesao = registrar(
  "ArtesaoModeracao",
  usuario.extend({ ativo: z.boolean() }),
  artesaoExample,
);
const perfilExample = {
  artesaoId: id,
  nome: "Pessoa Exemplo",
  historia: "Artesanato pernambucano.",
  tecnicaId: "ceramica",
  regiaoId: "agreste",
  fotoUrl: "https://example.com/perfil.jpg",
  completo: true,
};
const perfil = registrar(
  "PerfilArtesao",
  z.object({
    artesaoId: uuid,
    nome: z.string(),
    historia: z.string(),
    tecnicaId: z.string(),
    regiaoId: z.string(),
    fotoUrl: z.string().optional(),
    completo: z.boolean(),
  }),
  perfilExample,
);
const produtoExample = {
  id,
  nome: "Vaso de barro",
  descricao: "Peça artesanal de barro.",
  preco: 89.9,
  categoriaId: id,
  tecnicaId: "ceramica",
  regiaoId: "agreste",
  artesaoId: id,
  fotos: [{ url: "https://example.com/vaso.jpg", ordem: 0 }],
  quantidadeEstoque: 4,
  quantidadeVendida: 2,
  notaMedia: 4.5,
  ativo: true,
  desativadoPorAdmin: false,
  criadoEm: data,
};
const produto = registrar(
  "ProdutoDTO",
  z.object({
    id: uuid,
    nome: z.string(),
    descricao: z.string(),
    preco: dinheiro,
    categoriaId: uuid,
    tecnicaId: z.string(),
    regiaoId: z.string(),
    artesaoId: uuid,
    fotos: z.array(z.object({ url: z.string(), ordem: inteiro })),
    quantidadeEstoque: inteiro,
    quantidadeVendida: inteiro,
    notaMedia: z.number().min(0).max(5),
    ativo: z.boolean(),
    desativadoPorAdmin: z.boolean(),
    criadoEm: instante,
  }),
  produtoExample,
);
const produtos = registrar("ListaProdutos", z.array(produto), [produtoExample]);
const categoria = registrar(
  "Categoria",
  z.object({ id: uuid, nome: z.string() }),
  { id, nome: "Cerâmica" },
);
const referencia = registrar(
  "Referencia",
  z.object({ id: z.string(), nome: z.string() }),
  { id: "ceramica", nome: "Cerâmica" },
);
const avaliacoesExample = {
  itens: [
    {
      id,
      produtoId: id,
      compradorId: id,
      nota: 5,
      comentario: "Peça bonita.",
      criadoEm: data,
    },
  ],
  resumo: { media: 5, total: 1 },
};
const avaliacoes = registrar(
  "Avaliacoes",
  z.object({
    itens: z.array(
      z.object({
        id: uuid,
        produtoId: uuid,
        compradorId: uuid,
        nota: z.number().int().min(1).max(5),
        comentario: z.string().optional(),
        criadoEm: instante,
      }),
    ),
    resumo: z.object({ media: z.number().min(0).max(5), total: inteiro }),
  }),
  avaliacoesExample,
);
const avaliacaoCriadaExample = {
  id,
  produtoId: id,
  compradorId: id,
  nota: 5,
  comentario: "Peça bonita.",
  criadoEm: data,
};
const avaliacaoCriada = registrar(
  "AvaliacaoCriada",
  z.strictObject({
    id: uuid,
    produtoId: uuid,
    compradorId: uuid,
    nota: z.number().int().min(1).max(5),
    comentario: z.string().max(500).optional(),
    criadoEm: instante,
  }),
  avaliacaoCriadaExample,
);
const elegibilidadeExample = { podeAvaliar: true as const, motivo: null };
const elegibilidadeAvaliacao = registrar(
  "ElegibilidadeAvaliacao",
  z.discriminatedUnion("podeAvaliar", [
    z.strictObject({ podeAvaliar: z.literal(true), motivo: z.null() }),
    z.strictObject({
      podeAvaliar: z.literal(false),
      motivo: z.enum(["nao_comprou", "ja_avaliou"]),
    }),
  ]),
  elegibilidadeExample,
);
const carrinhoExample = {
  itens: [
    {
      produtoId: id,
      nome: "Vaso de barro",
      precoUnitario: 89.9,
      quantidade: 1,
      estoqueDisponivel: 4,
    },
  ],
  total: 89.9,
  atualizadoEm: data,
};
const carrinho = registrar(
  "Carrinho",
  z.object({
    itens: z.array(
      z.object({
        produtoId: uuid,
        nome: z.string(),
        precoUnitario: dinheiro,
        quantidade: inteiro,
        estoqueDisponivel: inteiro,
      }),
    ),
    total: dinheiro,
    atualizadoEm: instante,
  }),
  carrinhoExample,
);
const pagamentoExample = {
  id,
  metodo: "pix_simulado" as const,
  valor: 89.9,
  status: "aprovado" as const,
  dataPagamento: data,
};
const pagamento = registrar(
  "Pagamento",
  z.object({
    id: uuid,
    metodo: z.literal("pix_simulado"),
    valor: dinheiro,
    status: z.enum(["aprovado", "recusado"]),
    dataPagamento: instante,
  }),
  pagamentoExample,
);
const resumoExample = {
  id,
  numero: "ORI-EXEMPLO",
  total: 89.9,
  status: "confirmado" as const,
  criadoEm: data,
  pagamento: pagamentoExample,
};
const resumo = registrar(
  "ResumoPedido",
  z.object({
    id: uuid,
    numero: z.string().nullable(),
    total: dinheiro.nullable(),
    status: z.enum(["pendente", "confirmado", "cancelado"]),
    criadoEm: instante,
    pagamento: pagamento.nullable(),
  }),
  resumoExample,
);
const itemPedidoExample = {
  produtoId: id,
  nome: "Vaso de barro",
  quantidade: 1,
  precoUnitario: 89.9,
  subtotal: 89.9,
};
const itemPedido = registrar(
  "ItemPedido",
  z.object({
    produtoId: uuid,
    nome: z.string(),
    quantidade: inteiro,
    precoUnitario: dinheiro.nullable(),
    subtotal: dinheiro.nullable(),
  }),
  itemPedidoExample,
);
const pedidoExample = {
  pedido: {
    id,
    compradorId: id,
    numero: "ORI-EXEMPLO",
    total: 89.9,
    status: "confirmado" as const,
    criadoEm: data,
  },
  itens: [itemPedidoExample],
};
const pedidoCriado = registrar(
  "PedidoCriado",
  z.object({
    pedido: resumo.omit({ pagamento: true }).extend({
      compradorId: uuid,
      numero: z.string(),
      total: dinheiro,
      status: z.literal("confirmado"),
    }),
    itens: z.array(
      itemPedido.extend({ precoUnitario: dinheiro, subtotal: dinheiro }),
    ),
  }),
  pedidoExample,
);
const detalheExample = { ...pedidoExample, pagamento: pagamentoExample };
const detalhe = registrar(
  "DetalhePedido",
  z.object({
    pedido: resumo.omit({ pagamento: true }).extend({ compradorId: uuid }),
    itens: z.array(itemPedido),
    pagamento: pagamento.nullable(),
  }),
  detalheExample,
);
const paginaExample = {
  itens: [resumoExample],
  pagina: 1,
  limite: 10,
  total: 1,
};
const pagina = registrar(
  "PaginaPedidos",
  z.object({
    itens: z.array(resumo),
    pagina: inteiro,
    limite: inteiro,
    total: inteiro,
  }),
  paginaExample,
);
const pedidoRecebidoExample = {
  id,
  numero: "ORI-EXEMPLO",
  criadoEm: data,
  nomeComprador: "Pessoa Exemplo",
  itens: [itemPedidoExample],
  subtotalArtesao: 89.9,
};
const pedidoRecebido = registrar(
  "PedidoRecebido",
  z.strictObject({
    id: uuid,
    numero: z.string().nullable(),
    criadoEm: instante,
    nomeComprador: z.string(),
    itens: z.array(itemPedido.strict()),
    subtotalArtesao: dinheiro,
  }),
  pedidoRecebidoExample,
);
const paginaRecebidosExample = {
  itens: [pedidoRecebidoExample],
  limit: 10,
  offset: 0,
  total: 1,
};
const paginaRecebidos = registrar(
  "PaginaPedidosRecebidos",
  z.strictObject({
    itens: z.array(pedidoRecebido),
    limit: inteiro,
    offset: inteiro,
    total: inteiro,
  }),
  paginaRecebidosExample,
);
const notificacaoExample = {
  id,
  pedidoId: id,
  tipo: "novo_pedido" as const,
  lida: false,
  criadoEm: data,
};
const notificacao = registrar(
  "Notificacao",
  z.object({
    id: uuid,
    pedidoId: uuid,
    tipo: z.literal("novo_pedido"),
    lida: z.boolean(),
    criadoEm: instante,
  }),
  notificacaoExample,
);
const recomendacaoExample = {
  estrategia: "categoria",
  itens: [produtoExample],
};
const indicadoresExample = {
  quantidadeVendida: 10,
  receitaTotal: 51.83,
  numeroPedidos: 2,
  ultimaVenda: "2026-10-13T12:00:00.000Z",
  atualizadoEm: data,
};
const indicadores = registrar(
  "IndicadoresArtesao",
  z.object({
    quantidadeVendida: inteiro,
    receitaTotal: dinheiro.multipleOf(0.01),
    numeroPedidos: inteiro,
    ultimaVenda: instante.nullable(),
    atualizadoEm: instante,
  }),
  indicadoresExample,
);
const recomendacao = registrar(
  "Recomendacao",
  z.object({ estrategia: z.string(), itens: z.array(produto) }),
  recomendacaoExample,
);
const erro = registry.register(
  "Erro",
  z.object({
    error: z.object({
      code: z.string(),
      message: z.string(),
      details: z.unknown().optional(),
    }),
  }),
);
const indisponivel = registrar(
  "Indisponivel",
  z.object({ status: z.literal("error"), message: z.string() }),
  { status: "error", message: "Service unavailable" },
);
const erroServico = registry.register(
  "ErroServico",
  z.union([indisponivel, erro]),
);
const categorias = registry.register("ListaCategorias", z.array(categoria));
const referencias = registry.register("ListaReferencias", z.array(referencia));
const notificacoes = registry.register(
  "ListaNotificacoes",
  z.array(notificacao),
);
const artesaos = registry.register("ListaArtesaos", z.array(artesao));
const documento = registry.register(
  "DocumentoOpenApi",
  z
    .object({
      openapi: z.string(),
      info: z.object({ title: z.string(), version: z.string() }),
      paths: z.record(z.string(), z.unknown()),
    })
    .passthrough(),
);

registry.registerComponent("securitySchemes", "sessao", {
  type: "apiKey",
  in: "cookie",
  name: "origem_sessao",
  description:
    "JWT em cookie HttpOnly. Faça POST /auth/login no mesmo domínio. O navegador envia o cookie automaticamente. SameSite=Lax; Secure em produção; duração de 24h. Swagger não permite preencher cookies HttpOnly manualmente.",
});

const errors = {
  400: ["VALIDACAO", "Dados invalidos."],
  401: ["NAO_AUTENTICADO", "Sessao invalida ou ausente."],
  403: ["ACESSO_NEGADO", "Acesso negado."],
  404: ["PRODUTO_NAO_ENCONTRADO", "Produto nao encontrado."],
  409: ["ESTOQUE_INSUFICIENTE", "Estoque insuficiente."],
} as const;
function json(schema: z.ZodType, example: unknown): ResponseConfig {
  return {
    description: "Sucesso",
    content: { "application/json": { schema, example } },
  };
}
function body(
  schema: z.ZodType,
  example: unknown,
): NonNullable<NonNullable<RouteConfig["request"]>["body"]> {
  return {
    required: true,
    content: { "application/json": { schema, example } },
  };
}
type Endpoint = {
  method: RouteConfig["method"];
  path: string;
  operationId: string;
  summary: string;
  tag: string;
  papel?:
    "comprador" | "artesao" | "admin" | "artesao ou admin" | "autenticado";
  request?: RouteConfig["request"];
  response: ResponseConfig;
  status?: number;
  errors?: (keyof typeof errors)[];
  description?: string;
  errorExamples?: Partial<
    Record<keyof typeof errors, readonly [string, string]>
  >;
};
function endpoint(config: Endpoint) {
  const responses: RouteConfig["responses"] = {
    [config.status ?? 200]: config.response,
    503: {
      description: "Serviço indisponível. Pode incluir AUTH_NAO_CONFIGURADA.",
      content: {
        "application/json": {
          schema: erroServico,
          example: { status: "error", message: "Service unavailable" },
        },
      },
    },
  };
  for (const status of config.errors ?? []) {
    const [code, message] = config.errorExamples?.[status] ?? errors[status];
    responses[status] = {
      description: message,
      content: {
        "application/json": {
          schema: erro,
          example: { error: { code, message } },
        },
      },
    };
  }
  registry.registerPath({
    method: config.method,
    path: config.path,
    operationId: config.operationId,
    summary: config.summary,
    tags: [config.tag],
    security: config.papel ? [{ sessao: [] }] : [],
    description: [
      config.papel ? `Acesso: ${config.papel}.` : "Acesso público.",
      config.description,
    ]
      .filter(Boolean)
      .join(" "),
    ...(config.request ? { request: config.request } : {}),
    responses,
  });
}

const cadastro = registrar("CadastroInput", cadastroSchema, {
  nome: "Pessoa Exemplo",
  email: "pessoa@example.com",
  senha: "Exemplo123!",
  papel: "comprador",
});
const login = registrar("LoginInput", loginSchema, {
  email: "pessoa@example.com",
  senha: "Exemplo123!",
});
endpoint({
  method: "post",
  path: "/auth/register",
  operationId: "cadastrar",
  summary: "Cadastrar comprador ou artesão",
  tag: "Autenticação",
  request: {
    body: body(cadastro, {
      nome: "Pessoa Exemplo",
      email: "pessoa@example.com",
      senha: "Exemplo123!",
      papel: "comprador",
    }),
  },
  response: json(usuario, usuarioExample),
  status: 201,
  errors: [400, 409],
  errorExamples: { 409: ["EMAIL_JA_CADASTRADO", "Email ja cadastrado."] },
  description:
    "Senha sintética nos exemplos. Senha entre 8 e 72 caracteres, até 72 bytes UTF-8. Conflito: EMAIL_JA_CADASTRADO. Não inicia sessão.",
});
endpoint({
  method: "post",
  path: "/auth/login",
  operationId: "login",
  summary: "Iniciar sessão",
  tag: "Autenticação",
  request: {
    body: body(login, { email: "pessoa@example.com", senha: "Exemplo123!" }),
  },
  response: {
    ...json(usuario, usuarioExample),
    headers: {
      "Set-Cookie": {
        schema: { type: "string" },
        description:
          "Emite origem_sessao HttpOnly, Path=/, SameSite=Lax e Secure em produção.",
      },
    },
  },
  errors: [400, 401],
  errorExamples: {
    401: ["CREDENCIAIS_INVALIDAS", "Email ou senha invalidos."],
  },
  description:
    "Credenciais inválidas recebem erro genérico. Senha de até 72 bytes UTF-8.",
});
endpoint({
  method: "post",
  path: "/auth/logout",
  operationId: "logout",
  summary: "Encerrar sessão",
  tag: "Autenticação",
  status: 204,
  response: {
    description: "Sem conteúdo; remove origem_sessao pelo Set-Cookie.",
  },
  description: "Idempotente, funciona mesmo sem sessão.",
});
endpoint({
  method: "get",
  path: "/auth/me",
  operationId: "sessaoAtual",
  summary: "Consultar usuário autenticado",
  tag: "Autenticação",
  papel: "autenticado",
  response: json(usuario, usuarioExample),
  errors: [401],
});
endpoint({
  method: "get",
  path: "/health",
  operationId: "health",
  summary: "Consultar saúde e PostgreSQL",
  tag: "Saúde",
  response: json(
    registry.register(
      "Health",
      z.object({ status: z.literal("ok"), database: z.literal("reachable") }),
    ),
    { status: "ok", database: "reachable" },
  ),
});

endpoint({
  method: "get",
  path: "/produtos",
  operationId: "listarProdutos",
  summary: "Buscar produtos públicos disponíveis",
  tag: "Catálogo",
  request: { query: catalogoQuerySchema },
  response: json(produtos, [produtoExample]),
  errors: [400],
  description:
    "Somente produtos ativos, sem moderação, com estoque e artesão ativo. Cache TTL: X-Cache HIT/MISS e Server-Timing. Filtros combináveis. limit de 1 a 100; offset de 0 a 10000.",
});
endpoint({
  method: "get",
  path: "/produtos/{id}",
  operationId: "obterProduto",
  summary: "Consultar produto público",
  tag: "Catálogo",
  request: { params: produtoParamsSchema },
  response: json(produto, produtoExample),
  errors: [400, 404],
  description:
    "Produto oculto e inexistente recebem o mesmo 404. Cache TTL: X-Cache HIT/MISS e Server-Timing.",
});
endpoint({
  method: "get",
  path: "/categorias",
  operationId: "listarCategorias",
  summary: "Listar categorias",
  tag: "Catálogo",
  response: json(categorias, [{ id, nome: "Cerâmica" }]),
});
endpoint({
  method: "get",
  path: "/tecnicas",
  operationId: "listarTecnicas",
  summary: "Listar técnicas",
  tag: "Catálogo",
  response: json(referencias, [{ id: "ceramica", nome: "Cerâmica" }]),
});
endpoint({
  method: "get",
  path: "/regioes",
  operationId: "listarRegioes",
  summary: "Listar regiões",
  tag: "Catálogo",
  response: json(referencias, [{ id: "agreste", nome: "Agreste" }]),
});
endpoint({
  method: "get",
  path: "/avaliacoes",
  operationId: "listarAvaliacoes",
  summary: "Listar avaliações e resumo do produto",
  tag: "Catálogo",
  request: { query: avaliacoesQuerySchema },
  response: json(avaliacoes, avaliacoesExample),
  errors: [400, 404],
});
endpoint({
  method: "post",
  path: "/avaliacoes",
  operationId: "criarAvaliacao",
  summary: "Registrar avaliação do comprador autenticado",
  tag: "Catálogo",
  papel: "comprador",
  request: {
    body: body(
      registry.register("CriarAvaliacao", criarAvaliacaoSchema.clone()),
      {
        produtoId: id,
        nota: 5,
        comentario: "Peça bonita.",
      },
    ),
  },
  response: json(avaliacaoCriada, avaliacaoCriadaExample),
  status: 201,
  errors: [400, 401, 403, 409],
  errorExamples: {
    403: [
      "COMPRA_NAO_VERIFICADA",
      "Compra confirmada necessaria para avaliar.",
    ],
    409: ["AVALIACAO_DUPLICADA", "Voce ja avaliou este produto."],
  },
  description:
    "Corpo estrito; compradorId vem da sessão. Exige pedido confirmado desse comprador contendo o produto. Checagem com FOR SHARE em Pedido e ItemPedido e insert na mesma transação. Sem compra confirmada retorna 403 COMPRA_NAO_VERIFICADA, inclusive para UUID inexistente. Nota inteira de 1 a 5; comentário opcional com trim e até 500 caracteres. Comentário vazio é omitido. Uma avaliação por comprador/produto, inclusive sob concorrência. Invalida produtos e recomendações após commit. Média calculada somente na leitura.",
});
endpoint({
  method: "get",
  path: "/avaliacoes/elegibilidade",
  operationId: "obterElegibilidadeAvaliacao",
  summary: "Consultar elegibilidade do comprador para avaliar",
  tag: "Catálogo",
  papel: "comprador",
  request: { query: elegibilidadeAvaliacaoQuerySchema },
  response: json(elegibilidadeAvaliacao, elegibilidadeExample),
  errors: [400, 401, 403],
  description:
    "Query estrita com produtoId UUID obrigatório; identidade vem da sessão. podeAvaliar true tem motivo null. Sem compra confirmada retorna false/nao_comprou, inclusive para UUID inexistente. Havendo compra e avaliação anterior retorna false/ja_avaliou. Pedido pendente, cancelado, alheio ou sem o produto não conta. Resposta consultiva: POST revalida na própria transação. Cache-Control: no-store.",
});
endpoint({
  method: "get",
  path: "/usuarios/{id}/perfil-artesao",
  operationId: "obterPerfilArtesao",
  summary: "Consultar perfil público do artesão",
  tag: "Perfil",
  request: { params: perfilArtesaoParamsSchema },
  response: json(perfil, perfilExample),
  errors: [400, 404],
  errorExamples: { 404: ["ARTESAO_NAO_ENCONTRADO", "Artesao nao encontrado."] },
});
endpoint({
  method: "patch",
  path: "/usuarios/{id}/perfil-artesao",
  operationId: "salvarPerfilArtesao",
  summary: "Editar próprio perfil de artesão",
  tag: "Perfil",
  papel: "artesao",
  request: {
    params: perfilArtesaoParamsSchema,
    body: body(
      registry.register("PerfilArtesaoPatch", perfilArtesaoPatchSchema.clone()),
      {
        historia: "Artesanato pernambucano.",
        tecnicaId: "ceramica",
        regiaoId: "agreste",
      },
    ),
  },
  response: json(perfil, perfilExample),
  errors: [400, 401, 403, 404],
  errorExamples: { 404: ["ARTESAO_NAO_ENCONTRADO", "Artesao nao encontrado."] },
  description:
    "Pelo menos um campo. Foto relativa segura ou HTTPS. Identidade diferente recebe 403.",
});

endpoint({
  method: "get",
  path: "/carrinho",
  operationId: "obterCarrinho",
  summary: "Consultar próprio carrinho",
  tag: "Carrinho",
  papel: "comprador",
  request: { query: carrinhoQuerySchema },
  response: json(carrinho, carrinhoExample),
  errors: [400, 401, 403],
});
endpoint({
  method: "post",
  path: "/carrinho/itens",
  operationId: "adicionarItem",
  summary: "Adicionar quantidade ao carrinho",
  tag: "Carrinho",
  papel: "comprador",
  request: {
    query: carrinhoQuerySchema,
    body: body(
      registry.register("AdicionarItem", adicionarCarrinhoSchema.clone()),
      { produtoId: id, quantidade: 1 },
    ),
  },
  response: json(carrinho, carrinhoExample),
  errors: [400, 401, 403, 404, 409],
});
endpoint({
  method: "patch",
  path: "/carrinho/itens/{produtoId}",
  operationId: "alterarItem",
  summary: "Definir quantidade do item",
  tag: "Carrinho",
  papel: "comprador",
  request: {
    params: carrinhoItemParamsSchema,
    query: carrinhoQuerySchema,
    body: body(
      registry.register("AlterarItem", alterarCarrinhoSchema.clone()),
      { quantidade: 2 },
    ),
  },
  response: json(carrinho, carrinhoExample),
  errors: [400, 401, 403, 404, 409],
});
endpoint({
  method: "delete",
  path: "/carrinho/itens/{produtoId}",
  operationId: "removerItem",
  summary: "Remover item do carrinho",
  tag: "Carrinho",
  papel: "comprador",
  request: { params: carrinhoItemParamsSchema, query: carrinhoQuerySchema },
  response: json(carrinho, { itens: [], total: 0, atualizadoEm: data }),
  errors: [400, 401, 403],
});
endpoint({
  method: "post",
  path: "/pedidos",
  operationId: "criarPedido",
  summary: "Confirmar pedido e pagamento simulado",
  tag: "Pedidos",
  papel: "comprador",
  request: {
    body: body(registry.register("CriarPedido", criarPedidoSchema.clone()), {
      itens: [{ produtoId: id, quantidade: 1 }],
    }),
  },
  response: json(pedidoCriado, pedidoExample),
  status: 201,
  errors: [400, 401, 403, 404, 409],
  description:
    "Identidade vem da sessão. Até 20 itens. Transação bloqueia estoque, cria pagamento e intenção de notificação, limpa carrinho. Pagamento não integra a resposta de criação.",
});
endpoint({
  method: "get",
  path: "/pedidos",
  operationId: "listarPedidos",
  summary: "Listar pedidos do comprador autenticado",
  tag: "Pedidos",
  papel: "comprador",
  request: { query: paginacaoPedidoSchema },
  response: json(pagina, paginaExample),
  errors: [400, 401, 403],
  description: "pagina de 1 a 10000, limite de 1 a 100.",
});
endpoint({
  method: "get",
  path: "/pedidos/{id}",
  operationId: "obterPedido",
  summary: "Consultar próprio pedido e pagamento",
  tag: "Pedidos",
  papel: "comprador",
  request: { params: pedidoParamsSchema },
  response: json(detalhe, detalheExample),
  errors: [400, 401, 403, 404],
  errorExamples: { 404: ["PEDIDO_NAO_ENCONTRADO", "Pedido nao encontrado."] },
  description: "Pedido alheio e inexistente recebem o mesmo 404.",
});

endpoint({
  method: "get",
  path: "/artesao/pedidos",
  operationId: "listarPedidosRecebidos",
  summary: "Listar pedidos confirmados com os próprios itens",
  tag: "Pedidos",
  papel: "artesao",
  request: { query: paginacaoPedidosArtesaoSchema },
  response: json(paginaRecebidos, paginaRecebidosExample),
  errors: [400, 401, 403],
  description:
    "Identidade vem da sessão. Filtra pedidos confirmados e seus itens pelo dono do produto. Expõe somente nome do comprador e subtotal do artesão, sem email, total financeiro ou pagamento do pedido. total externo conta pedidos do artesão. limit de 1 a 100, padrão 10; offset de 0 a 10000, padrão 0. Query estrita. Ordena por criadoEm DESC e id DESC. Lista e contagem usam RepeatableRead. Valores legados nulos permanecem null nos itens e não acrescentam subtotal. Produtos ocultos continuam no histórico. Cache-Control: no-store.",
});

endpoint({
  method: "get",
  path: "/artesao/produtos",
  operationId: "listarMeusProdutos",
  summary: "Listar próprios produtos, inclusive ocultos",
  tag: "Gestão",
  papel: "artesao",
  response: json(produtos, [produtoExample]),
  errors: [401, 403],
});
endpoint({
  method: "post",
  path: "/produtos",
  operationId: "criarProduto",
  summary: "Criar produto próprio",
  tag: "Gestão",
  papel: "artesao",
  request: {
    body: body(
      registry.register("ProdutoCreate", produtoCreateSchema.clone()),
      {
        nome: "Vaso de barro",
        descricao: "Peça artesanal de barro.",
        preco: 89.9,
        categoriaId: id,
        fotos: [{ url: "https://example.com/vaso.jpg" }],
        quantidadeEstoque: 4,
        tecnicaId: "ceramica",
      },
    ),
  },
  response: json(produto, produtoExample),
  status: 201,
  errors: [400, 401, 403],
  description:
    "Preço tem no máximo duas casas decimais. De 1 a 10 fotos seguras. Técnica omitida usa perfil. artesaoId é derivado da sessão.",
});
endpoint({
  method: "patch",
  path: "/produtos/{id}",
  operationId: "editarProduto",
  summary: "Editar produto próprio ou como admin",
  tag: "Gestão",
  papel: "artesao ou admin",
  request: {
    params: gestaoParamsSchema,
    body: body(registry.register("ProdutoPatch", produtoPatchSchema.clone()), {
      nome: "Vaso decorado",
    }),
  },
  response: json(produto, produtoExample),
  errors: [400, 401, 403, 404],
  description: "Pelo menos um campo. Artesão não reativa produto moderado.",
});
endpoint({
  method: "delete",
  path: "/produtos/{id}",
  operationId: "removerProduto",
  summary: "Desativar produto sem apagar histórico",
  tag: "Gestão",
  papel: "artesao ou admin",
  request: { params: gestaoParamsSchema },
  response: json(produto, { ...produtoExample, ativo: false }),
  errors: [400, 401, 403, 404],
});
endpoint({
  method: "patch",
  path: "/produtos/{id}/estoque",
  operationId: "alterarEstoque",
  summary: "Definir estoque com bloqueio transacional",
  tag: "Gestão",
  papel: "artesao ou admin",
  request: {
    params: gestaoParamsSchema,
    body: body(registry.register("EstoqueInput", estoqueSchema.clone()), {
      quantidadeEstoque: 4,
    }),
  },
  response: json(produto, produtoExample),
  errors: [400, 401, 403, 404],
});
endpoint({
  method: "get",
  path: "/artesao/notificacoes",
  operationId: "listarNotificacoes",
  summary: "Listar próprias notificações de pedidos",
  tag: "Notificações",
  papel: "artesao",
  response: json(notificacoes, [notificacaoExample]),
  errors: [401, 403],
});
endpoint({
  method: "get",
  path: "/artesao/indicadores",
  operationId: "obterIndicadoresArtesao",
  summary: "Consultar próprias vendas confirmadas",
  tag: "Indicadores",
  papel: "artesao",
  request: { query: indicadoresQuerySchema },
  response: json(indicadores, indicadoresExample),
  errors: [400, 401, 403],
  description:
    "Identidade vem da sessão. Soma quantidade e subtotal somente dos próprios itens em pedidos confirmados. Conta pedidos distintos. ultimaVenda usa criadoEm do pedido; atualizadoEm é o momento da consulta. Sem vendas retorna zeros e ultimaVenda null. Receita em number com precisão de duas casas. Sem cache compartilhado.",
});
endpoint({
  method: "patch",
  path: "/artesao/notificacoes/{id}/lida",
  operationId: "lerNotificacao",
  summary: "Marcar própria notificação como lida",
  tag: "Notificações",
  papel: "artesao",
  request: { params: notificacaoParamsSchema },
  status: 204,
  response: { description: "Sem conteúdo. Operação idempotente." },
  errors: [400, 401, 403, 404],
  errorExamples: { 404: ["NAO_ENCONTRADO", "Notificacao nao encontrada."] },
  description: "Notificação alheia e inexistente recebem o mesmo 404.",
});
endpoint({
  method: "get",
  path: "/admin/artesaos",
  operationId: "listarArtesaos",
  summary: "Listar artesãos para moderação",
  tag: "Administração",
  papel: "admin",
  response: json(artesaos, [artesaoExample]),
  errors: [401, 403],
});
endpoint({
  method: "get",
  path: "/admin/produtos",
  operationId: "listarProdutosAdmin",
  summary: "Listar produtos para moderação",
  tag: "Administração",
  papel: "admin",
  response: json(produtos, [produtoExample]),
  errors: [401, 403],
});
endpoint({
  method: "patch",
  path: "/admin/artesaos/{id}/moderar",
  operationId: "moderarArtesao",
  summary: "Ativar ou desativar artesão",
  tag: "Administração",
  papel: "admin",
  request: {
    params: gestaoParamsSchema,
    body: body(registry.register("ModeracaoInput", moderacaoSchema.clone()), {
      ativo: false,
    }),
  },
  response: json(artesao, { ...artesaoExample, ativo: false }),
  errors: [400, 401, 403, 404],
  errorExamples: { 404: ["ARTESAO_NAO_ENCONTRADO", "Artesao nao encontrado."] },
});
endpoint({
  method: "patch",
  path: "/admin/produtos/{id}/moderar",
  operationId: "moderarProduto",
  summary: "Alterar moderação do produto",
  tag: "Administração",
  papel: "admin",
  request: {
    params: gestaoParamsSchema,
    body: body(moderacaoSchema, { ativo: false }),
  },
  response: json(produto, { ...produtoExample, desativadoPorAdmin: true }),
  errors: [400, 401, 403, 404],
  description:
    "Moderação altera desativadoPorAdmin separadamente do soft delete.",
});
endpoint({
  method: "patch",
  path: "/admin/usuarios/{id}/papel",
  operationId: "alterarPapel",
  summary: "Alterar papel entre comprador e artesão",
  tag: "Administração",
  papel: "admin",
  request: {
    params: alterarPapelSchema.pick({ id: true }),
    body: body(
      registry.register(
        "AlterarPapelInput",
        alterarPapelSchema.shape.body.clone(),
      ),
      { papel: "artesao" },
    ),
  },
  response: json(usuario, { ...usuarioExample, papel: "artesao" }),
  errors: [400, 401, 403, 404],
  errorExamples: { 404: ["USUARIO_NAO_ENCONTRADO", "Usuario nao encontrado."] },
  description: "Não permite alterar o próprio papel.",
});
endpoint({
  method: "get",
  path: "/recomendacoes",
  operationId: "recomendar",
  summary: "Recomendar produtos por contexto público",
  tag: "Recomendações",
  request: { query: recomendacaoQuerySchema },
  response: json(recomendacao, recomendacaoExample),
  errors: [400, 404],
  description:
    "produtoId opcional. Sem contexto ou produto oculto usa fallback geral. Cache TTL: X-Cache HIT/MISS e Server-Timing.",
});
endpoint({
  method: "get",
  path: "/recomendacoes/para-mim",
  operationId: "recomendarParaMim",
  summary: "Recomendar pelo próprio histórico",
  tag: "Recomendações",
  papel: "comprador",
  request: { query: recomendacaoPessoalQuerySchema },
  response: json(recomendacao, {
    ...recomendacaoExample,
    estrategia: "historico-compra",
  }),
  errors: [400, 401, 403],
  description:
    "Identidade vem da sessão, sem usuarioId externo. Sem cache compartilhado.",
});

registry.registerPath({
  method: "get",
  path: "/docs",
  operationId: "swagger",
  summary: "Abrir Swagger UI",
  tags: ["Documentação"],
  security: [],
  responses: {
    308: {
      description: "Redireciona /docs para /docs/.",
      headers: { Location: { schema: { type: "string" }, example: "/docs/" } },
    },
    200: {
      description: "Interface interativa",
      content: {
        "text/html": { schema: { type: "string" }, example: "<!DOCTYPE html>" },
      },
    },
  },
});
registry.registerPath({
  method: "get",
  path: "/docs/openapi.json",
  operationId: "openapi",
  summary: "Baixar especificação OpenAPI",
  tags: ["Documentação"],
  security: [],
  responses: {
    200: json(documento, {
      openapi: "3.1.0",
      info: { title: "Origem API", version: "1.0.0" },
      paths: {},
    }),
  },
});

export const openapi = new OpenApiGeneratorV31(
  registry.definitions,
).generateDocument({
  openapi: "3.1.0",
  info: {
    title: "Origem API",
    version: "1.0.0",
    description:
      "Marketplace da economia criativa pernambucana. Rotas implementadas, sem prefixo /api. Exemplos sintéticos. Pagamento exclusivamente simulado. Toda mudança de rota deve atualizar esta especificação e o teste de cobertura.",
  },
  servers: [{ url: "/" }],
});
