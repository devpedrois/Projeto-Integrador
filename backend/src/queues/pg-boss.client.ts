import { PgBoss } from "pg-boss";
import type { ConstructorOptions } from "pg-boss";

export const NOTIFICAR_ARTESAO_QUEUE = "notificar-artesao";
export const NOTIFICAR_ARTESAO_RETRY_LIMIT = 3;

export function createPgBossClient(
  connectionString: string,
  options: Omit<ConstructorOptions, "connectionString"> = {},
): PgBoss {
  return new PgBoss({ connectionString, ...options });
}

export async function ensureNotificarArtesaoQueue(boss: PgBoss): Promise<void> {
  await boss.createQueue(NOTIFICAR_ARTESAO_QUEUE, {
    retryLimit: NOTIFICAR_ARTESAO_RETRY_LIMIT,
    retryBackoff: true,
  });
}
