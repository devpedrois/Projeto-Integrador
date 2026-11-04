import { defineConfig } from "vitest/config";
import { randomBytes } from "node:crypto";

process.env.RECOMENDACAO_URL ??= "http://127.0.0.1:3002";
process.env.RECOMENDACAO_SERVICE_TOKEN ??= randomBytes(32).toString("hex");

export default defineConfig({
  test: {
    environment: "node",
    fileParallelism: false,
    include: ["tests/**/*.test.ts"],
  },
});
