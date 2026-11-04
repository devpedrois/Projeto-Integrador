import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath, URL } from "node:url";
import { test } from "node:test";

const root = fileURLToPath(new URL("../../../", import.meta.url));

function docker(...args) {
  const result = spawnSync("docker", args, {
    cwd: root,
    encoding: "utf8",
    timeout: 600_000,
    maxBuffer: 2 * 1024 * 1024,
    windowsHide: true,
  });
  assert.equal(result.status, 0, result.stdout + result.stderr);
  return result.stdout;
}

for (const { context, name } of [
  { context: "backend", name: "backend" },
  { context: "services/recomendacao", name: "recomendacao" },
])
  test(
    `${name}: base Node 22 sem vulnerabilidades altas ou críticas`,
    { timeout: 900_000 },
    () => {
      const from = readFileSync(
        new URL(`../../../${context}/Dockerfile`, import.meta.url),
        "utf8",
      ).split(/\r?\n/)[0];
      const base = from.split(/\s+/)[1];
      docker(
        "scout",
        "cves",
        `registry://${base}`,
        "--only-severity",
        "critical,high",
        "--exit-code",
      );
      docker(
        "build",
        "--target",
        "base",
        "--tag",
        `origem-${name}-base:security`,
        context,
      );
      docker(
        "run",
        "--rm",
        `origem-${name}-base:security`,
        "node",
        "-e",
        "if(process.versions.node.split('.')[0]!=='22')process.exit(1)",
      );
      docker(
        "scout",
        "cves",
        `local://origem-${name}-base:security`,
        "--only-severity",
        "critical,high",
        "--exit-code",
      );
    },
  );
