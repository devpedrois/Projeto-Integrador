import type { NextFunction, Request, Response } from "express";
import type { Environment } from "../config/environment.js";
import type { AuthService } from "../services/auth.service.js";
import { encerrarSessao, iniciarSessao, lerSessao } from "../utils/token.js";
import type {
  CadastroInput,
  LoginInput,
} from "../validators/auth.validator.js";

export class AuthController {
  public constructor(
    private readonly service: AuthService,
    private readonly environment: Pick<
      Environment,
      "JWT_SECRET" | "COOKIE_SECURE"
    >,
  ) {}

  public register = async (
    request: Request,
    response: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      response
        .status(201)
        .json(await this.service.register(request.body as CadastroInput));
    } catch (error: unknown) {
      next(error);
    }
  };

  public login = async (
    request: Request,
    response: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const usuario = await this.service.login(request.body as LoginInput);
      iniciarSessao(
        response,
        usuario,
        this.environment.JWT_SECRET,
        this.environment.COOKIE_SECURE,
      );
      response.status(200).json(usuario);
    } catch (error: unknown) {
      next(error);
    }
  };

  public logout = (_request: Request, response: Response): void => {
    encerrarSessao(response, this.environment.COOKIE_SECURE);
    response.status(204).end();
  };

  public me = async (
    request: Request,
    response: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const sessao = lerSessao(request, this.environment.JWT_SECRET);
      response.status(200).json(await this.service.me(sessao.sub));
    } catch (error: unknown) {
      next(error);
    }
  };
}
