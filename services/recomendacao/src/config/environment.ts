import { z } from "zod";

export const schemaName = z.string().regex(/^[a-z][a-z0-9_]{0,62}$/);
export const postgresUrl = z
  .url()
  .refine(
    (value) => value.startsWith("postgres:") || value.startsWith("postgresql:"),
  );

const environmentSchema = z
  .object({
    DATABASE_URL: postgresUrl,
    API_SCHEMA: schemaName.default("public"),
    RECOMENDACAO_SCHEMA: schemaName.default("recomendacao"),
    HOST: z.string().trim().min(1).default("127.0.0.1"),
    PORT: z.coerce.number().int().min(1).max(65535).default(3002),
    RECOMENDACAO_SERVICE_TOKEN: z
      .string()
      .min(32)
      .refine((v) => v.trim().length >= 32),
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),
  })
  .refine((env) => env.API_SCHEMA !== env.RECOMENDACAO_SCHEMA, {
    path: ["RECOMENDACAO_SCHEMA"],
  });

export type Environment = z.infer<typeof environmentSchema>;

export function parseEnvironment(input: NodeJS.ProcessEnv): Environment {
  const parsed = environmentSchema.safeParse(input);
  if (parsed.success) return parsed.data;
  const names = [
    ...new Set(parsed.error.issues.map((issue) => String(issue.path[0]))),
  ].sort();
  throw new Error(`Invalid environment variables: ${names.join(", ")}`);
}
