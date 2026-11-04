import "dotenv/config";
import { Pool } from "pg";
import { createApp } from "./app.js";
import { parseEnvironment } from "./config/environment.js";

async function main() {
  const env = parseEnvironment(process.env);
  const pool = new Pool({
    connectionString: env.DATABASE_URL,
    connectionTimeoutMillis: 5000,
    query_timeout: 5000,
  });
  const server = createApp(pool, env).listen(env.PORT, env.HOST);
  server.on("error", () => {
    process.stderr.write("Failed to start recommendation service.\n");
    void pool.end();
    process.exitCode = 1;
  });
  const close = () => {
    server.close(() => {
      void pool.end();
    });
  };
  process.once("SIGTERM", close);
  process.once("SIGINT", close);
}

main().catch((error: unknown) => {
  process.stderr.write(
    error instanceof Error &&
      error.message.startsWith("Invalid environment variables:")
      ? `${error.message}\n`
      : "Failed to start recommendation service.\n",
  );
  process.exitCode = 1;
});
