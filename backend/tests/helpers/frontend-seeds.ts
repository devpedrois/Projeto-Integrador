import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const frontendRoot = fileURLToPath(
  new URL("../../../frontend/src/", import.meta.url),
);
const cache = new Map<string, Record<string, unknown>>();

export function lerSeedFrontal(nome: string): Record<string, unknown> {
  return carregar(resolve(frontendRoot, `fake-api/seeds/${nome}.seed.ts`));
}

function carregar(arquivo: string): Record<string, unknown> {
  const existente = cache.get(arquivo);
  if (existente) return existente;
  const exports: Record<string, unknown> = {};
  cache.set(arquivo, exports);
  const code = ts.transpileModule(readFileSync(arquivo, "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  const executar = new Function("exports", "require", code);
  executar(exports, (name: string) => {
    if (!name.startsWith("@/"))
      throw new Error("Dependencia frontal inesperada");
    return carregar(resolve(frontendRoot, `${name.slice(2)}.ts`));
  });
  return exports;
}
