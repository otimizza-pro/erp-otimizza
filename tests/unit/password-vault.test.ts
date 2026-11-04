import { afterEach, describe, expect, it, vi } from "vitest";
import { encryptPassword, decryptPassword } from "@/modules/passwords/crypto";

afterEach(() => vi.unstubAllEnvs());
describe("Password vault encryption", () => {
  it("requires a dedicated key", () => {
    vi.stubEnv("PASSWORD_VAULT_KEY", "");
    expect(() => encryptPassword("secret", "owner:entry")).toThrow("VAULT_NOT_CONFIGURED");
  });
  it("randomizes ciphertext and binds secrets to their owner and entry", () => {
    vi.stubEnv("PASSWORD_VAULT_KEY", "ab".repeat(32));
    const encrypted = encryptPassword("senha secreta 🔐", "owner:entry");
    expect(encrypted).not.toContain("senha secreta");
    expect(encryptPassword("senha secreta 🔐", "owner:entry")).not.toBe(encrypted);
    expect(decryptPassword(encrypted, "owner:entry")).toBe("senha secreta 🔐");
    expect(() => decryptPassword(encrypted, "other:entry")).toThrow();
    expect(() => decryptPassword(encrypted.slice(0, -4) + "AAAA", "owner:entry")).toThrow();
    vi.stubEnv("PASSWORD_VAULT_KEY", "cd".repeat(32));
    expect(() => decryptPassword(encrypted, "owner:entry")).toThrow();
  });
});
