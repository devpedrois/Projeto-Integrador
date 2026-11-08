import { execFile } from "node:child_process";
import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { iniciarPostgresIndicadores } from "../tests/helpers/postgres-indicadores-local.js";

const executar = promisify(execFile);
const backend = fileURLToPath(new URL("../", import.meta.url));
const evidencias = fileURLToPath(
  new URL("../../evidencias/PI4-32/32.4-cache-indicadores/", import.meta.url),
);
await mkdir(evidencias, { recursive: true });
const postgres = await iniciarPostgresIndicadores();
try {
  const mounts = [
    "src",
    "prisma",
    "tests",
    "scripts",
    "vitest.config.ts",
    "tsconfig.json",
    "package.json",
  ].flatMap((path) => [
    "--mount",
    `type=bind,source=${backend}${path},target=/app/${path},readonly`,
  ]);
  const { stdout, stderr } = await executar(
    "docker",
    [
      "run",
      "--rm",
      "--pull=never",
      "--network",
      `container:${postgres.nome}`,
      ...mounts,
      "--mount",
      `type=bind,source=${evidencias},target=/evidencias/PI4-32/32.4-cache-indicadores`,
      "--env",
      "CACHE_BENCH_DATABASE_URL",
      "--env",
      "EVIDENCIA_INDICADORES=1",
      "--entrypoint",
      "node",
      "origem-backend-migrate:local",
      "node_modules/vitest/vitest.mjs",
      "run",
      "--configLoader",
      "runner",
      "tests/integration/indicadores-cache-desempenho.integration.test.ts",
    ],
    {
      windowsHide: true,
      timeout: 180000,
      maxBuffer: 1024 * 1024,
      env: {
        ...process.env,
        CACHE_BENCH_DATABASE_URL: postgres.databaseUrlInterna,
      },
    },
  );
  process.stdout.write(stdout);
  process.stderr.write(stderr);
} catch (error: unknown) {
  if (typeof error === "object" && error !== null) {
    if ("stdout" in error && typeof error.stdout === "string")
      process.stdout.write(error.stdout);
    if ("stderr" in error && typeof error.stderr === "string")
      process.stderr.write(error.stderr);
  }
  process.exitCode = 1;
} finally {
  await postgres.fechar();
}
