import { z } from "zod";

const quantidade = z.number().int().min(1).max(2_147_483_647);
export const carrinhoQuerySchema = z.object({}).strict();
export const carrinhoItemParamsSchema = z
  .object({ produtoId: z.uuid().transform((id) => id.toLowerCase()) })
  .strict();
export const adicionarCarrinhoSchema = z
  .object({
    produtoId: z.uuid().transform((id) => id.toLowerCase()),
    quantidade,
  })
  .strict();
export const alterarCarrinhoSchema = z.object({ quantidade }).strict();
