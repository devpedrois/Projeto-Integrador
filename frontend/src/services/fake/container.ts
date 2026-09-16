import { BrowserUsuarioRepository } from "@/fake-api/repositories/usuario.repository";
import { BrowserSessaoStorage } from "@/fake-api/storage/sessao.storage";
import { FakeUsuariosService } from "@/services/fake/usuarios.service";
import { SessionStore } from "@/store/sessao.store";
import type { UsuariosService } from "@/services/contracts/usuarios.contract";

const LATENCIA_PADRAO_MS = 300;

let instancia: UsuariosService | null = null;
let sessionStoreInstancia: SessionStore | null = null;

export function obterUsuariosService(): UsuariosService {
  if (!instancia) {
    const repositorio = new BrowserUsuarioRepository(window.localStorage);
    instancia = new FakeUsuariosService(repositorio, {
      latenciaMs: LATENCIA_PADRAO_MS,
    });
  }
  return instancia;
}

export function obterSessionStore(): SessionStore {
  if (!sessionStoreInstancia) {
    sessionStoreInstancia = new SessionStore(
      new BrowserSessaoStorage(window.localStorage)
    );
  }
  return sessionStoreInstancia;
}
