// @vitest-environment node
import path from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";
import { describe, expect, it } from "vitest";
import nextConfig from "../../next.config";

const frontendRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);

function project(configFile: string) {
  const configPath = path.resolve(frontendRoot, configFile);
  const config = ts.readConfigFile(configPath, ts.sys.readFile);
  if (config.error) {
    throw new Error(
      ts.flattenDiagnosticMessageText(config.error.messageText, "\n"),
    );
  }
  const parsed = ts.parseJsonConfigFileContent(
    config.config,
    ts.sys,
    frontendRoot,
    { incremental: false },
    configPath,
  );
  return ts.createProgram(parsed.fileNames, parsed.options);
}

function relativeSources(program: ts.Program) {
  return program
    .getSourceFiles()
    .filter((source) => !program.isSourceFileFromExternalLibrary(source))
    .map((source) =>
      path.relative(frontendRoot, source.fileName).replaceAll("\\", "/"),
    );
}

describe("TypeScript do build de produção", () => {
  it("verifica a aplicação sem importar testes ou código do backend", () => {
    const program = project(
      nextConfig.typescript?.tsconfigPath ?? "tsconfig.json",
    );
    const sources = relativeSources(program);

    expect(sources).toContain("src/app/layout.tsx");
    expect(sources).toContain("src/middleware.ts");
    expect(sources).toContain("next.config.ts");
    expect(sources.filter((file) => file.startsWith("../backend/"))).toEqual(
      [],
    );
    expect(sources.filter((file) => file.startsWith("tests/"))).toEqual([]);
    expect(sources).not.toContain("vitest.config.ts");
    expect(program.getCompilerOptions().strict).toBe(true);
    expect(nextConfig.typescript?.ignoreBuildErrors).not.toBe(true);
  });

  it("preserva a checagem dos testes e contratos entre as camadas", () => {
    const sources = relativeSources(project("tsconfig.json"));

    expect(sources).toContain("tests/services/recomendacao-contrato.test.ts");
    expect(sources).toContain("tests/services/http/catalogo.service.test.ts");
    expect(sources).toContain("vitest.config.ts");
    expect(sources).toContain(
      "../backend/src/repositories/catalogo.repository.ts",
    );
  });
});
