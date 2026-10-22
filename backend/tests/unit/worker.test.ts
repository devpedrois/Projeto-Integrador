import { spawn } from "node:child_process";
import { describe, expect, it } from "vitest";

function execute(
  script: string | undefined,
  environment: NodeJS.ProcessEnv = {},
) {
  return new Promise<{ code: number | null; stdout: string; stderr: string }>(
    (resolve, reject) => {
      const args =
        script === undefined
          ? ["--import", "tsx", "src/worker.ts"]
          : ["--import", "tsx", "--input-type=module", "--eval", script];
      const child = spawn(process.execPath, args, {
        env: {
          ...process.env,
          NODE_ENV: "test",
          NODE_NO_WARNINGS: "1",
          ...environment,
        },
        stdio: ["ignore", "pipe", "pipe"],
      });
      let stdout = "";
      let stderr = "";
      const timeout = setTimeout(() => {
        child.kill();
        reject(new Error("Worker did not exit"));
      }, 10_000);
      child.stdout.on("data", (chunk: Buffer) => {
        stdout += chunk.toString();
      });
      child.stderr.on("data", (chunk: Buffer) => {
        stderr += chunk.toString();
      });
      child.once("error", reject);
      child.once("close", (code) => {
        clearTimeout(timeout);
        resolve({ code, stdout, stderr });
      });
    },
  );
}

describe("worker entrypoint", () => {
  it("imports without starting resources or writing output", async () => {
    expect(await execute('await import("./src/worker.ts");')).toEqual({
      code: 0,
      stdout: "",
      stderr: "",
    });
  });

  it("sanitizes invalid environment at the entrypoint", async () => {
    const result = await execute(undefined, { WORKER_CONCURRENCY: "9" });
    expect(result).toEqual({
      code: 1,
      stdout: "",
      stderr: "Invalid environment variables: WORKER_CONCURRENCY\n",
    });
  });

  it("sanitizes queue startup failures and releases resources", async () => {
    const result = await execute(undefined, {
      DATABASE_URL: "postgresql://user:synthetic-secret@127.0.0.1:1/origem",
      DIRECT_URL: "postgresql://user:synthetic-secret@127.0.0.1:1/origem",
    });
    expect(result).toEqual({
      code: 1,
      stdout: "",
      stderr: "Worker startup failed\n",
    });
  });
});
