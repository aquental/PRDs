/**
 * Migration validation: 20260516165347_widen_monetary_columns.sql
 *
 * Reads the SQL file and asserts structural correctness without a live DB.
 * Guards against accidental edits that could break the migration.
 */
import { describe, it, expect, beforeAll } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";

const MIGRATION_FILE = join(
  process.cwd(),
  "supabase/migrations/20260516165347_widen_monetary_columns.sql",
);

let sql: string;

beforeAll(() => {
  sql = readFileSync(MIGRATION_FILE, "utf-8");
});

describe("20260516165347_widen_monetary_columns.sql — structure", () => {
  it("is wrapped in a BEGIN / COMMIT transaction", () => {
    expect(sql).toMatch(/^\s*BEGIN\s*;/im);
    expect(sql).toMatch(/COMMIT\s*;/im);
  });

  it("uses numeric(15,2) as the target type", () => {
    const matches = sql.match(/numeric\(15,2\)/gi) ?? [];
    expect(matches.length).toBeGreaterThanOrEqual(6);
  });

  it("does not reference numeric(10,2) (old type must not appear in up migration)", () => {
    // The old type should only appear in comments, never in ALTER statements
    const alterLines = sql.split("\n").filter((l) => /ALTER COLUMN/i.test(l));
    for (const line of alterLines) {
      expect(line).not.toMatch(/numeric\(10,2\)/i);
    }
  });
});

describe("20260516165347_widen_monetary_columns.sql — target tables", () => {
  const targets: [table: string, column: string][] = [
    ["patients", "session_fee"],
    ["sessions", "fee"],
    ["schedules", "fee"],
    ["finance_entries", "amount"],
    ["expenses", "amount"],
    ["therapists", "default_session_fee"],
  ];

  for (const [table, column] of targets) {
    it(`widens ${table}.${column}`, () => {
      expect(sql).toMatch(
        new RegExp(
          `ALTER TABLE public\\.${table}[\\s\\S]*?ALTER COLUMN ${column} TYPE numeric\\(15,2\\)`,
          "i",
        ),
      );
    });
  }

  it("does NOT alter ai_usage_logs.cost_usd (intentional numeric(12,6))", () => {
    // The table name may appear in comments; assert no ALTER TABLE targets it.
    const alterLines = sql.split("\n").filter((l) => /ALTER TABLE/i.test(l));
    for (const line of alterLines) {
      expect(line).not.toMatch(/ai_usage_logs/i);
      expect(line).not.toMatch(/cost_usd/i);
    }
  });
});
