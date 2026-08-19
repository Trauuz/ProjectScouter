import { z } from "zod";

const databaseEnvironmentSchema = z.object({
  DATABASE_URL: z
    .string({ error: "DATABASE_URL is required." })
    .trim()
    .url("DATABASE_URL must be a valid URL.")
    .refine(
      (value) => ["postgres:", "postgresql:"].includes(new URL(value).protocol),
      "DATABASE_URL must use the postgres protocol.",
    ),
});

export type DatabaseEnvironment = {
  databaseUrl: string;
};

export function readDatabaseEnvironment(
  source: Readonly<Record<string, string | undefined>> = process.env,
): DatabaseEnvironment {
  const result = databaseEnvironmentSchema.safeParse(source);

  if (!result.success) {
    throw new Error("DATABASE_URL is missing or invalid.", {
      cause: result.error,
    });
  }

  return { databaseUrl: result.data.DATABASE_URL };
}
