import type { OpcoesFiltroService } from "@/services/contracts/opcoes-filtro.contract";
import { ApiClient } from "./api-client";
import { lerOpcoes } from "./catalogo-response";

export class HttpOpcoesFiltroService implements OpcoesFiltroService {
  constructor(private readonly client = new ApiClient()) {}
  async categorias() {
    return lerOpcoes(await this.client.request<unknown>("/categorias"));
  }
  async tecnicas() {
    return lerOpcoes(await this.client.request<unknown>("/tecnicas"));
  }
  async regioes() {
    return lerOpcoes(await this.client.request<unknown>("/regioes"));
  }
}
