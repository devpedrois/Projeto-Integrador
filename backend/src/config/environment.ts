import { z } from "zod";

const postgresUrl = z
  .string()
  .url()
  .refine(
    (value) => value.startsWith("postgresql:") || value.startsWith("postgres:"),
    "must be a PostgreSQL URL",
  );

const environmentSchema = z
  .object({
    DATABASE_URL: postgresUrl,
    DIRECT_URL: postgresUrl,
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),
    HOST: z.string().trim().min(1).default("127.0.0.1"),
    PORT: z.coerce.number().int().min(1).max(65_535).default(3001),
    JWT_SECRET: z
      .string()
      .min(32)
      .refine((value) => value.trim().length >= 32)
      .optional(),
    FRONTEND_ORIGIN: z
      .string()
      .url()
      .pipe(
        z.string().refine((value) => {
          const url = new URL(value);
          return (
            ["http:", "https:"].includes(url.protocol) && url.origin === value
          );
        }),
      )
      .default("http://localhost:3000"),
    COOKIE_SECURE: z
      .enum(["true", "false"])
      .transform((value) => value === "true"),
    CACHE_TTL_SECONDS: z.coerce.number().int().positive().default(60),
    RUN_WORKER_IN_API: z
      .enum(["true", "false"])
      .default("true")
      .transform((value) => value === "true"),
    WORKER_CONCURRENCY: z.coerce.number().int().min(1).max(8).default(1),
    NOTIFICATION_PUBLISHER_INTERVAL_MS: z.coerce
      .number()
      .int()
      .min(1_000)
      .max(60_000)
      .default(3_000),
  })
  .superRefine((environment, context) => {
    if (
      environment.NODE_ENV === "production" &&
      environment.JWT_SECRET === undefined
    ) {
      context.addIssue({
        code: "custom",
        path: ["JWT_SECRET"],
        message: "Required in production",
      });
    }
  });

export type Environment = z.infer<typeof environmentSchema>;

export class EnvironmentValidationError extends Error {
  public constructor(invalidNames: string[]) {
    super(`Invalid environment variables: ${invalidNames.join(", ")}`);
    this.name = "EnvironmentValidationError";
  }
}

export function parseEnvironment(input: NodeJS.ProcessEnv): Environment {
  const result = environmentSchema.safeParse({
    ...input,
    COOKIE_SECURE:
      input.COOKIE_SECURE ??
      (input.NODE_ENV === "production" ? "true" : "false"),
  });
  if (result.success) {
    return result.data;
  }

  const invalidNames = [
    ...new Set(result.error.issues.map((issue) => String(issue.path[0]))),
  ].sort();
  throw new EnvironmentValidationError(invalidNames);
}
