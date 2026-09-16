import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  test: {
    environment: "jsdom",
    globals: true,
    include: ["tests/**/*.test.ts"],
  },
  resolve: {
    alias: {
      "@": path.resolve(dirname, "./src"),
    },
  },
});
