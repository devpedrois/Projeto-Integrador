import type { Request, Response } from "express";
import { AppError } from "../errors/app-error.js";
import type { GestaoProdutosService } from "../services/gestao-produtos.service.js";
import {
  estoqueSchema,
  moderacaoSchema,
  produtoCreateSchema,
  produtoParamsSchema,
  produtoPatchSchema,
} from "../validators/gestao-produtos.validator.js";
import type { UsuarioCriado } from "../repositories/usuario.repository.js";

function usuario(response: Response): UsuarioCriado {
  const atual = response.locals.usuario;
  if (!atual) throw new AppError(401, "NAO_AUTENTICADO", "Sessao invalida.");
  return atual;
}
function id(request: Request) {
  const params = produtoParamsSchema.safeParse(request.params);
  if (!params.success)
    throw new AppError(400, "VALIDACAO", "Identificador invalido.");
  return params.data.id;
}
function validar<T>(
  schema: {
    safeParse: (
      input: unknown,
    ) => { success: true; data: T } | { success: false };
  },
  input: unknown,
): T {
  const result = schema.safeParse(input);
  if (!result.success) throw new AppError(400, "VALIDACAO", "Dados invalidos.");
  return result.data;
}
export class GestaoProdutosController {
  constructor(private readonly service: GestaoProdutosService) {}
  listarMeus = async (_request: Request, response: Response) => {
    response.json(await this.service.listarMeus(usuario(response)));
  };
  listarProdutos = async (_request: Request, response: Response) => {
    response.json(await this.service.listarProdutos());
  };
  listarArtesaos = async (_request: Request, response: Response) => {
    response.json(await this.service.listarArtesaos());
  };
  criar = async (request: Request, response: Response) => {
    const atual = usuario(response);
    const body: unknown = request.body;
    if (
      typeof body === "object" &&
      body !== null &&
      "artesaoId" in body &&
      body.artesaoId !== atual.id
    )
      throw new AppError(
        403,
        "ACESSO_NEGADO",
        "Artesao externo nao permitido.",
      );
    response
      .status(201)
      .json(
        await this.service.criar(validar(produtoCreateSchema, body), atual),
      );
  };
  atualizar = async (request: Request, response: Response) => {
    response.json(
      await this.service.atualizar(
        id(request),
        validar(produtoPatchSchema, request.body),
        usuario(response),
      ),
    );
  };
  estoque = async (request: Request, response: Response) => {
    response.json(
      await this.service.atualizar(
        id(request),
        validar(estoqueSchema, request.body),
        usuario(response),
      ),
    );
  };
  remover = async (request: Request, response: Response) => {
    response.json(await this.service.remover(id(request), usuario(response)));
  };
  moderarProduto = async (request: Request, response: Response) => {
    response.json(
      await this.service.moderarProduto(
        id(request),
        validar(moderacaoSchema, request.body).ativo,
      ),
    );
  };
  moderarArtesao = async (request: Request, response: Response) => {
    response.json(
      await this.service.moderarArtesao(
        id(request),
        validar(moderacaoSchema, request.body).ativo,
        usuario(response),
      ),
    );
  };
}
