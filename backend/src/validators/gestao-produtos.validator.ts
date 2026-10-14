import { z } from "zod";
import { perfilArtesaoPatchSchema } from "./perfil-artesao.validator.js";

const estoque = z.number().int().min(0).max(2147483647);
const campos = {
  nome: z.string().trim().min(3).max(120),
  descricao: z.string().trim().min(10).max(5000),
  preco: z
    .number()
    .positive()
    .max(99999999.99)
    .refine((n) => Math.abs(n * 100 - Math.round(n * 100)) < 0.000001),
  categoriaId: z.uuid(),
  fotos: z
    .array(
      z
        .object({
          url: perfilArtesaoPatchSchema.shape.fotoUrl
            .unwrap()
            .refine((url) => url.length > 0),
        })
        .strict(),
    )
    .min(1)
    .max(10),
  quantidadeEstoque: estoque,
  tecnicaId: z.string().trim().min(1).max(100).optional(),
};
export const produtoCreateSchema = z.object(campos).strict();
export const produtoPatchSchema = z
  .object({ ...campos, ativo: z.boolean() })
  .partial()
  .strict()
  .refine((value) => Object.keys(value).length > 0);
export const estoqueSchema = z.object({ quantidadeEstoque: estoque }).strict();
export const moderacaoSchema = z.object({ ativo: z.boolean() }).strict();
export const produtoParamsSchema = z
  .object({ id: z.uuid().transform((id) => id.toLowerCase()) })
  .strict();
export type ProdutoCreate = z.infer<typeof produtoCreateSchema>;
export type ProdutoPatch = z.infer<typeof produtoPatchSchema>;
