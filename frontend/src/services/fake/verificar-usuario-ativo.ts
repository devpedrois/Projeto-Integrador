import type { UsuarioRepository } from "@/fake-api/repositories/usuario.repository";
import type { VerificadorUsuarioAtivo } from "@/store/sessao.store";

export function criarVerificadorUsuarioAtivo(
  repositorio: UsuarioRepository
): VerificadorUsuarioAtivo {
  return async (usuarioId) => {
    await repositorio.seed();
    const usuarios = await repositorio.list();
    return usuarios.some((usuario) => usuario.id === usuarioId && usuario.ativo);
  };
}
