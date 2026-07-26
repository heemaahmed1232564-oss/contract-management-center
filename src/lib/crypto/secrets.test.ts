import { afterEach, describe, expect, it } from "vitest";
import { decryptSecret, encryptSecret } from "@/lib/crypto/secrets";

const previousSecret = process.env.AUTH_SECRET;

afterEach(() => {
  process.env.AUTH_SECRET = previousSecret;
});

describe("encrypted Google credentials", () => {
  it("round trips a refresh token without storing plaintext", () => {
    process.env.AUTH_SECRET = "a-local-test-secret-that-is-longer-than-32-characters";
    const token = "refresh-token-sensitive-value";
    const encrypted = encryptSecret(token);
    expect(encrypted).not.toContain(token);
    expect(decryptSecret(encrypted)).toBe(token);
  });

  it("rejects a modified encrypted token", () => {
    process.env.AUTH_SECRET = "a-local-test-secret-that-is-longer-than-32-characters";
    const encrypted = encryptSecret("refresh-token");
    expect(() => decryptSecret(`${encrypted}changed`)).toThrow();
  });
});
