import type { HealthRepository } from "../repositories/health.repository.js";

export interface HealthResult {
  status: "ok";
  database: "reachable";
}

export class HealthService {
  public constructor(private readonly repository: HealthRepository) {}

  public async check(): Promise<HealthResult> {
    await this.repository.ping();
    return { status: "ok", database: "reachable" };
  }
}
