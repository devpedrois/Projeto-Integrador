import { z } from "zod";

function fotoSegura(value: string): boolean {
  if (value === "") return true;
  try {
    const decoded = decodeURIComponent(value);
    if (
      [value, decoded].some(
        (url) =>
          url.includes("\\") ||
          [...url].some(
            (char) => char.charCodeAt(0) <= 31 || char.charCodeAt(0) === 127,
          ),
      )
    )
      return false;
    if (value.startsWith("/"))
      return !decoded.startsWith("//") && !decoded.includes("://");
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

const referencia = z
  .string()
  .trim()
  .max(100)
  .regex(/^(?:[a-z0-9]+(?:-[a-z0-9]+)*)?$/);
export const perfilArtesaoParamsSchema = z
  .object({ id: z.uuid().transform((id) => id.toLowerCase()) })
  .strict();
export const perfilArtesaoPatchSchema = z
  .object({
    historia: z.string().max(1000).trim().optional(),
    tecnicaId: referencia.optional(),
    regiaoId: referencia.optional(),
    fotoUrl: z.string().trim().max(2048).refine(fotoSegura).optional(),
  })
  .strict()
  .refine((input) => Object.keys(input).length > 0);
export type PerfilArtesaoPatch = z.infer<typeof perfilArtesaoPatchSchema>;
