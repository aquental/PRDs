import { describe, expect, it } from "bun:test";
import { fmt, getInitials, monthlyRevenue } from "./utils";

// Intl may emit a non-breaking space (U+00A0) or narrow no-break space (U+202F)
// between "R$" and the digits depending on the ICU version. Normalize for
// assertions so tests are stable across environments.
const normalize = (s: string) => s.replace(/[\u00A0\u202F]/g, " ");

describe("fmt", () => {
  it("formats integers as BRL currency", () => {
    expect(normalize(fmt(1000))).toBe("R$ 1.000,00");
  });

  it("formats decimals with two fraction digits", () => {
    expect(normalize(fmt(1234.5))).toBe("R$ 1.234,50");
  });

  it("formats zero", () => {
    expect(normalize(fmt(0))).toBe("R$ 0,00");
  });

  it("formats negative values", () => {
    expect(normalize(fmt(-42))).toBe("-R$ 42,00");
  });
});

describe("getInitials", () => {
  it("returns the uppercase first letters of the first two words", () => {
    expect(getInitials("Ana Paula Silva")).toBe("AP");
  });

  it("uppercases a single-word name", () => {
    expect(getInitials("renata")).toBe("R");
  });

  it("handles exactly two words", () => {
    expect(getInitials("João Mendes")).toBe("JM");
  });
});

describe("monthlyRevenue", () => {
  it("sums sessionsPerMonth * valuePerSession for active patients only", () => {
    const patients = [
      { status: "active", sessionsPerMonth: 4, valuePerSession: 200 }, // 800
      { status: "active", sessionsPerMonth: 2, valuePerSession: 180 }, // 360
      { status: "inactive", sessionsPerMonth: 3, valuePerSession: 200 }, // ignored
    ];
    expect(monthlyRevenue(patients)).toBe(1160);
  });

  it("returns 0 for an empty list", () => {
    expect(monthlyRevenue([])).toBe(0);
  });

  it("returns 0 when no patient is active", () => {
    const patients = [
      { status: "inactive", sessionsPerMonth: 4, valuePerSession: 200 },
      { status: "paused", sessionsPerMonth: 2, valuePerSession: 180 },
    ];
    expect(monthlyRevenue(patients)).toBe(0);
  });
});
