import { spawn } from "node:child_process";
import { once } from "node:events";
import { createServer } from "node:net";
import { describe, expect, it } from "vitest";

function runServerProcess(port: number, script?: string) {
  const argumentsList = script === undefined
    ? ["--import", "tsx", "src/server.ts"]
    : ["--import", "tsx", "--input-type=module", "--eval", script];

  return new Promise<{ code: number | null; stdout: string; stderr: string }>(
    (resolve, reject) => {
      const child = spawn(process.execPath, argumentsList, {
        cwd: process.cwd(),
        env: {
          ...process.env,
          DATABASE_URL: "postgresql://user:secret@127.0.0.1:5432/origem",
          DIRECT_URL: "postgresql://user:secret@127.0.0.1:5432/origem",
          NODE_ENV: "test",
          PORT: String(port),
        },
        stdio: ["ignore", "pipe", "pipe"],
      });
      let stdout = "";
      let stderr = "";
      const timeout = setTimeout(() => {
        child.kill();
        reject(new Error("Server process did not finish"));
      }, 15_000);
      child.stdout.setEncoding("utf8").on("data", (chunk: string) => {
        stdout += chunk;
      });
      child.stderr.setEncoding("utf8").on("data", (chunk: string) => {
        stderr += chunk;
      });
      child.once("error", () => {
        clearTimeout(timeout);
        reject(new Error("Server process could not start"));
      });
      child.once("close", (code) => {
        clearTimeout(timeout);
        resolve({ code, stdout, stderr });
      });
    },
  );
}

describe("server startup", () => {
  it("sanitizes asynchronous listen failure on an occupied loopback port", async () => {
    const occupied = createServer();
    occupied.listen(0, "127.0.0.1");
    await once(occupied, "listening");
    try {
      const address = occupied.address();
      if (address === null || typeof address === "string") {
        throw new Error("Expected a TCP address");
      }
      const result = await runServerProcess(address.port);

      expect(result.code).toBe(1);
      expect(result.stdout).toBe("");
      expect(result.stderr === "Backend startup failed\n").toBe(true);
    } finally {
      await new Promise<void>((resolve) => occupied.close(() => resolve()));
    }
  }, 20_000);

  it("imports without starting a listener or writing output", async () => {
    const result = await runServerProcess(3109, 'await import("./src/server.ts");');

    expect(result.code).toBe(0);
    expect(result.stdout).toBe("");
    expect(result.stderr === "").toBe(true);
  }, 20_000);

  it("binds startup explicitly to IPv4 loopback", async () => {
    const result = await runServerProcess(3109, `
      import { startServer } from "./src/server.ts";
      const { server, prisma } = await startServer();
      try {
        process.stdout.write(server.address().address);
      } finally {
        await new Promise((resolve) => server.close(resolve));
        await prisma.$disconnect();
      }
    `);

    expect(result.code).toBe(0);
    expect(result.stdout).toBe("127.0.0.1");
    expect(result.stderr === "").toBe(true);
  }, 20_000);
});
