import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { defineConfig } from "@playwright/test";

const executablePath = process.env.E2E_CHROMIUM_EXECUTABLE_PATH;
if (!executablePath || !existsSync(executablePath))
  throw new Error(
    "Configure E2E_CHROMIUM_EXECUTABLE_PATH com o Chromium instalado.",
  );
const artifacts = process.env.E2E_ARTIFACT_DIR ?? "test-results";
const apiPort = Number(process.env.E2E_API_PORT ?? "3313");
const frontendPort = Number(process.env.E2E_FRONTEND_PORT ?? "3113");
for (const port of [apiPort, frontendPort])
  if (!Number.isInteger(port) || port < 1 || port > 65535)
    throw new Error("Porta E2E invalida.");
const baseURL = `http://127.0.0.1:${frontendPort}`;

export default defineConfig({
  testDir: "./e2e",
  testMatch: "**/*.spec.ts",
  fullyParallel: false,
  workers: 1,
  forbidOnly: true,
  timeout: 90000,
  expect: { timeout: 15000 },
  retries: 1,
  outputDir: resolve(artifacts, "results"),
  reporter: [
    ["list"],
    ["html", { outputFolder: resolve(artifacts, "html"), open: "never" }],
    ["json", { outputFile: resolve(artifacts, "resultado.json") }],
  ],
  use: {
    browserName: "chromium",
    baseURL,
    locale: "pt-BR",
    timezoneId: "America/Sao_Paulo",
    launchOptions: { executablePath },
    trace: "on-first-retry",
    video: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "360px", use: { viewport: { width: 360, height: 900 } } },
    { name: "1280px", use: { viewport: { width: 1280, height: 900 } } },
  ],
  webServer: [
    {
      command: "node --import tsx scripts/e2e-server.ts",
      cwd: "../backend",
      url: `http://127.0.0.1:${apiPort}/health`,
      reuseExistingServer: false,
      timeout: 120000,
      env: { NODE_ENV: "test", E2E_API_PORT: String(apiPort) },
    },
    {
      command: `node node_modules/next/dist/bin/next dev --hostname 127.0.0.1 --port ${frontendPort}`,
      url: baseURL,
      reuseExistingServer: false,
      timeout: 120000,
      env: {
        NODE_ENV: "development",
        NEXT_PUBLIC_DATA_SOURCE: "http",
        BACKEND_URL: `http://127.0.0.1:${apiPort}`,
      },
    },
  ],
});
