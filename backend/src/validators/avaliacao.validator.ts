import { z } from "zod";

export const criarAvaliacaoSchema = z.strictObject({
  produtoId: z.uuid().transform((id) => id.toLowerCase()),
  nota: z.number().int().min(1).max(5),
  comentario: z.string().trim().max(500).optional(),
});

export type CriarAvaliacaoInput = z.infer<typeof criarAvaliacaoSchema>;
