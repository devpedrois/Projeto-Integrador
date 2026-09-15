import { expect } from "vitest";

export async function expectPostgresError(
  operation: Promise<unknown>,
  expectedCode: string,
): Promise<void> {
  try {
    await operation;
    throw new Error("Expected PostgreSQL operation to fail");
  } catch (error: unknown) {
    expect(error).toMatchObject({ code: expectedCode });
  }
}
