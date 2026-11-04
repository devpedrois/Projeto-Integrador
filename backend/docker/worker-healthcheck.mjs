import { readdir, readFile } from "node:fs/promises";
import process from "node:process";
import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  connectionTimeoutMillis: 3000,
  query_timeout: 3000,
  max: 1,
});

try {
  let running = false;
  for (const pid of (await readdir("/proc")).filter((name) =>
    /^\d+$/.test(name),
  )) {
    const command = await readFile(`/proc/${pid}/cmdline`, "utf8").catch(
      () => "",
    );
    const args = command.split("\0");
    if (args[0]?.endsWith("node") && args[1] === "dist/src/worker.js") {
      running = true;
      break;
    }
  }
  if (!running) throw new Error("Worker process unavailable");
  const result = await pool.query(
    "SELECT 1 FROM pgboss.queue WHERE name = $1",
    ["notificar-artesao"],
  );
  if (result.rowCount !== 1) throw new Error("Notification queue unavailable");
} catch {
  process.exitCode = 1;
} finally {
  await pool.end();
}
