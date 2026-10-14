import { z } from "zod";

const idReferencia = z
  .string()
  .min(1)
  .max(100)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
const inteiroQuery = (minimo: number, maximo: number, padrao: number) =>
  z
    .string()
    .regex(/^\d+$/)
    .transform(Number)
    .pipe(z.number().int().min(minimo).max(maximo))
    .default(padrao);

export const catalogoQuerySchema = z
  .object({
    termo: z.string().trim().max(200).optional(),
    categoriaId: z.uuid().optional(),
    tecnicaId: idReferencia.optional(),
    regiaoId: idReferencia.optional(),
    artesaoId: z.uuid().optional(),
    limit: inteiroQuery(1, 100, 24),
    offset: inteiroQuery(0, 10_000, 0),
  })
  .strict();

export const produtoParamsSchema = z.object({ id: z.uuid() }).strict();
export const avaliacoesQuerySchema = z.object({ produtoId: z.uuid() }).strict();
export type CatalogoQuery = z.infer<typeof catalogoQuerySchema>;
