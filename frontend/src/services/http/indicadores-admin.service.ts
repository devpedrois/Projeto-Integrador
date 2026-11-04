import type {
  IndicadoresAdminService,
  IndicadoresAdmin,
} from "@/services/contracts/indicadores-admin.contract";
import { lerIndicadoresAdmin } from "@/domain/indicadores-admin";
import { ApiClient } from "./api-client";

export class HttpIndicadoresAdminService implements IndicadoresAdminService {
  constructor(private readonly client = new ApiClient()) {}

  async obter(): Promise<IndicadoresAdmin> {
    return lerIndicadoresAdmin(
      await this.client.request<unknown>("/admin/indicadores"),
    );
  }
}
