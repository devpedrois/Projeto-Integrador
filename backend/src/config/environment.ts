import { z } from "zod";

const postgresUrl = z.string().url().refine(
  (value) => value.startsWith("postgresql:") || value.startsWith("postgres:"),
  "must be a PostgreSQL URL",
);

const environmentSchema = z.object({
  DATABASE_URL: postgresUrl,
  DIRECT_URL: postgresUrl,
  NODE_ENV: z.enum(["development", "test"]).default("development"),
  PORT: z.coerce.number().int().min(1).max(65_535).default(3001),
  NOTIFICATION_PUBLISHER_INTERVAL_MS: z.coerce.number().int().min(1_000).max(60_000).default(3_000),
});

export type Environment = z.infer<typeof environmentSchema>;

export function parseEnvironment(input: NodeJS.ProcessEnv): Environment {
  const result = environmentSchema.safeParse(input);
  if (result.success) {
    return result.data;
  }

  const invalidNames = [...new Set(
    result.error.issues.map((issue) => String(issue.path[0])),
  )].sort();
  throw new Error(`Invalid environment variables: ${invalidNames.join(", ")}`);
}
