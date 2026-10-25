import type {
  IndicadoresArtesaoService,
  IndicadoresArtesao,
} from "@/services/contracts/indicadores-artesao.contract";
import { ApiClient } from "./api-client";
import { lerIndicadoresArtesao } from "@/domain/indicadores-artesao";

export class HttpIndicadoresArtesaoService implements IndicadoresArtesaoService {
  constructor(private readonly client = new ApiClient()) {}

  async obter(): Promise<IndicadoresArtesao> {
    return lerIndicadoresArtesao(
      await this.client.request<unknown>("/artesao/indicadores"),
    );
  }
}
