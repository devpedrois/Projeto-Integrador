import { AppError } from "../errors/app-error.js";
import type {
  AuthUsuarioRepository,
  UsuarioCriado,
} from "../repositories/usuario.repository.js";
import type {
  CadastroInput,
  LoginInput,
} from "../validators/auth.validator.js";
import { compararSenha, gerarHash } from "../utils/senha.js";
import { normalizarEmail } from "./usuario.service.js";

const HASH_INEXISTENTE =
  "$2b$10$6O1wuWGl5g0wLDOrmA7dm.E027WglLRUghFNaZ8aaJWVU1u1.AGl2";

export class AuthService {
  public constructor(private readonly repository: AuthUsuarioRepository) {}

  public async register(input: CadastroInput): Promise<UsuarioCriado> {
    const senhaHash = await gerarHash(input.senha);
    return this.repository.criarComEspecializacao({
      nome: input.nome,
      email: normalizarEmail(input.email),
      papel: input.papel,
      senhaHash,
    });
  }

  public async login(input: LoginInput): Promise<UsuarioCriado> {
    const usuario = await this.repository.buscarPorEmail(
      normalizarEmail(input.email),
    );
    const senhaValida = await compararSenha(
      input.senha,
      usuario?.senhaHash ?? HASH_INEXISTENTE,
    );
    if (usuario === null || !senhaValida || !usuario.ativo) {
      throw new AppError(
        401,
        "CREDENCIAIS_INVALIDAS",
        "Email ou senha invalidos.",
      );
    }
    return {
      id: usuario.id,
      nome: usuario.nome,
      email: usuario.email,
      papel: usuario.papel,
    };
  }

  public async me(id: string): Promise<UsuarioCriado> {
    const usuario = await this.repository.buscarAtivoPorId(id);
    if (usuario === null) {
      throw new AppError(401, "NAO_AUTENTICADO", "Sessao invalida ou ausente.");
    }
    return usuario;
  }
}
