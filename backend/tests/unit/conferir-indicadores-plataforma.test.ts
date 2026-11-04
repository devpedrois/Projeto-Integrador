import { describe, expect, it } from "vitest";

describe("entrada da conferencia 33.3", () => {
  it("aceita apenas schema e destino dos artefatos", async () => {
    const { parseConferenceOptions } =
      await import("../../scripts/conferir-indicadores-plataforma.js");
    expect(
      parseConferenceOptions(["--schema", "volume", "--output", "artefatos"]),
    ).toEqual({ schema: "volume", output: "artefatos" });
    for (const args of [
      ["--schema", "public; DROP TABLE"],
      ["--sql", "SELECT 1"],
      ["--output", ""],
    ])
      expect(() => parseConferenceOptions(args)).toThrow(
        "Argumentos da conferencia invalidos",
      );
  });
});
