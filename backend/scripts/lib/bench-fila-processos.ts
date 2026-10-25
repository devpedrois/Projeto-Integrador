import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { BenchFilaError } from "./bench-fila.js";

export async function iniciarWorkerBench(env: NodeJS.ProcessEnv) {
  const child = spawn(
    process.execPath,
    [
      "--import",
      "tsx",
      fileURLToPath(new URL("bench-fila-worker.ts", import.meta.url)),
    ],
    {
      env,
      windowsHide: true,
      stdio: ["ignore", "pipe", "pipe", "ipc"],
    },
  );
  let stderr = "";
  child.stderr?.on("data", (chunk: Buffer) => {
    stderr = (stderr + chunk.toString()).slice(-4000);
  });
  child.stdout?.resume();
  const fechado = new Promise<number | null>((resolve) =>
    child.once("close", resolve),
  );
  try {
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(
        () => reject(new BenchFilaError("worker nao iniciou em 30s.")),
        30_000,
      );
      child.once("error", () => {
        clearTimeout(timeout);
        reject(new BenchFilaError("falha ao criar processo worker."));
      });
      child.once("close", () => {
        clearTimeout(timeout);
        reject(new BenchFilaError("worker encerrou antes da prontidao."));
      });
      child.once("message", (message: unknown) => {
        clearTimeout(timeout);
        if (
          typeof message === "object" &&
          message !== null &&
          "ready" in message &&
          message.ready === true
        )
          resolve();
        else reject(new BenchFilaError("worker nao confirmou prontidao."));
      });
    });
  } catch (error) {
    child.kill();
    await fechado;
    throw error;
  }
  const pid = child.pid;
  if (pid === undefined) throw new BenchFilaError("PID do worker ausente.");
  return {
    pid,
    isRunning: () => child.exitCode === null && child.signalCode === null,
    async stop() {
      const timeout = setTimeout(() => child.kill(), 35_000);
      try {
        if (child.connected) child.send("stop");
        const code = await fechado;
        if (
          code !== 0 ||
          stderr.includes("failed") ||
          stderr.includes("queue error")
        )
          throw new BenchFilaError("worker terminou com falha.");
      } finally {
        clearTimeout(timeout);
      }
    },
  };
}
