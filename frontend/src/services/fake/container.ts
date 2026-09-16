import { BrowserUsuarioRepository } from "@/fake-api/repositories/usuario.repository";
import { FakeUsuariosService } from "@/services/fake/usuarios.service";
import type { UsuariosService } from "@/services/contracts/usuarios.contract";

const LATENCIA_PADRAO_MS = 300;

let instancia: UsuariosService | null = null;

export function obterUsuariosService(): UsuariosService {
  if (!instancia) {
    const repositorio = new BrowserUsuarioRepository(window.localStorage);
    instancia = new FakeUsuariosService(repositorio, {
      latenciaMs: LATENCIA_PADRAO_MS,
    });
  }
  return instancia;
}
