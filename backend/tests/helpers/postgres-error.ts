import { expect } from "vitest";

export async function expectPostgresError(
  operation: Promise<unknown>,
  expectedCode: string | readonly string[],
): Promise<void> {
  try {
    await operation;
    throw new Error("Expected PostgreSQL operation to fail");
  } catch (error: unknown) {
    const codes =
      typeof expectedCode === "string" ? [expectedCode] : expectedCode;
    expect(error).toHaveProperty("code");
    expect(codes).toContain((error as { code: string }).code);
  }
}
