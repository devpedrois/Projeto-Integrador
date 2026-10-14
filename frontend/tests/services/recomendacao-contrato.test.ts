import { expectTypeOf, it } from "vitest";
import type { RecomendacaoResultado } from "@/types/recomendacao";
import type { RecomendacaoService } from "../../../backend/src/services/recomendacao.service";

it("resposta backend implementa RecomendacaoResultado do frontend", () => {
  type ResultadoBackend = Awaited<ReturnType<RecomendacaoService["obter"]>>;
  expectTypeOf<ResultadoBackend>().toMatchTypeOf<RecomendacaoResultado>();
  expectTypeOf<keyof ResultadoBackend>().toEqualTypeOf<
    keyof RecomendacaoResultado
  >();
  expectTypeOf<keyof ResultadoBackend["itens"][number]>().toEqualTypeOf<
    keyof RecomendacaoResultado["itens"][number]
  >();
});
