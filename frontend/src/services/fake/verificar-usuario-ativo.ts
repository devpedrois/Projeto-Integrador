import {
  normalizarEmail,
  type UsuarioRepository,
} from "@/fake-api/repositories/usuario.repository";
import type { VerificadorUsuarioAtivo } from "@/store/sessao.store";

export function criarVerificadorUsuarioAtivo(
  repositorio: UsuarioRepository
): VerificadorUsuarioAtivo {
  return async (sessao) => {
    await repositorio.seed();
    const usuarios = await repositorio.list();
    const usuario = usuarios.find((candidato) => candidato.id === sessao.id);
    return (
      usuario !== undefined &&
      usuario.ativo &&
      usuario.papel === sessao.papel &&
      normalizarEmail(usuario.email) === normalizarEmail(sessao.email)
    );
  };
}
