import { spawnSync } from "node:child_process";
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  symlinkSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { expect, it } from "vitest";

const backendRoot = fileURLToPath(new URL("../../", import.meta.url));

it("compila API e worker sem instalar dependencias do frontend", () => {
  const isolatedRoot = mkdtempSync(join(tmpdir(), "origem-backend-build-"));
  try {
    const backend = join(isolatedRoot, "backend");
    mkdirSync(backend);
    cpSync(join(backendRoot, "../fixtures"), join(isolatedRoot, "fixtures"), {
      recursive: true,
    });
    for (const entry of [
      "src",
      "prisma",
      "scripts",
      "tests",
      "tsconfig.json",
      "package.json",
      "prisma.config.ts",
      "vitest.config.ts",
      "eslint.config.js",
    ]) {
      cpSync(join(backendRoot, entry), join(backend, entry), {
        recursive: true,
      });
    }
    symlinkSync(
      join(backendRoot, "node_modules"),
      join(backend, "node_modules"),
      "junction",
    );
    const compilation = spawnSync(
      process.execPath,
      [
        join(backendRoot, "node_modules/typescript/bin/tsc"),
        "--project",
        join(backend, "tsconfig.json"),
      ],
      { cwd: backend, encoding: "utf8", timeout: 45_000, windowsHide: true },
    );
    expect(compilation.error).toBeUndefined();
    expect(compilation.status, compilation.stdout + compilation.stderr).toBe(0);
    expect(existsSync(join(backend, "dist/src/server.js"))).toBe(true);
    expect(existsSync(join(backend, "dist/src/worker.js"))).toBe(true);
    expect(existsSync(join(backend, "dist/scripts/web6-evidencias.js"))).toBe(
      false,
    );
    expect(existsSync(join(isolatedRoot, "frontend"))).toBe(false);
  } finally {
    rmSync(isolatedRoot, { recursive: true, force: true });
  }
}, 60_000);
