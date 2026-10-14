import { z } from "zod";

export const notificacaoParamsSchema = z.object({ id: z.uuid() }).strict();
