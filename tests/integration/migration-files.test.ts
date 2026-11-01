import { describe, it, expect } from "vitest";
import fs from "node:fs/promises";
import path from "node:path";

describe("Database: Migration Files Integrity", () => {
  it("garante que todas as migrações .sql existem, são legíveis e não estão vazias", async () => {
    const migrationsDir = path.resolve(process.cwd(), "database/migrations");
    const files = await fs.readdir(migrationsDir);
    const sqlFiles = files.filter((f) => f.endsWith(".sql"));

    expect(sqlFiles.length).toBeGreaterThan(0);

    for (const file of sqlFiles) {
      const content = await fs.readFile(path.join(migrationsDir, file), "utf-8");
      expect(content.trim().length).toBeGreaterThan(20);
      expect(content).toMatch(/CREATE TABLE|ALTER TABLE|REVOKE|DROP POLICY|CREATE INDEX/);
    }
  });
});
