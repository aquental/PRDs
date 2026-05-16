/**
 * Tests for patient validation and normalization logic.
 */
import { describe, it, expect } from "vitest";
import {
  normalizeCPF,
  formatCPF,
  normalizePhone,
  validateRelative,
  ageFromBirthDate,
  searchPatients,
} from "./patients";
import type { Patient } from "./types";

// ── normalizeCPF ─────────────────────────────────────────────────────────────

describe("normalizeCPF", () => {
  it("returns digit string for a valid CPF", () => {
    // 111.444.777-35 is a mathematically valid CPF
    expect(normalizeCPF("111.444.777-35")).toBe("11144477735");
  });

  it("accepts unformatted digit string", () => {
    expect(normalizeCPF("11144477735")).toBe("11144477735");
  });

  it("returns null when length is wrong after stripping non-digits", () => {
    expect(normalizeCPF("123.456")).toBeNull();
  });

  it("returns null for all-same-digit CPF", () => {
    expect(normalizeCPF("111.111.111-11")).toBeNull();
    expect(normalizeCPF("00000000000")).toBeNull();
  });

  it("returns null when first check digit is wrong", () => {
    // Flip digit 9 of the valid CPF
    expect(normalizeCPF("11144477705")).toBeNull();
  });

  it("returns null when second check digit is wrong", () => {
    // Flip digit 10 of the valid CPF
    expect(normalizeCPF("11144477730")).toBeNull();
  });
});

// ── formatCPF ────────────────────────────────────────────────────────────────

describe("formatCPF", () => {
  it("formats 11 digits into NNN.NNN.NNN-NN", () => {
    expect(formatCPF("11144477735")).toBe("111.444.777-35");
  });

  it("strips existing punctuation before formatting", () => {
    expect(formatCPF("111.444.777-35")).toBe("111.444.777-35");
  });

  it("pads short inputs with leading zeros", () => {
    expect(formatCPF("123")).toBe("000.000.001-23");
  });

  // EC-04: was silently truncating to first 11 digits
  it("throws RangeError when input has more than 11 digits", () => {
    expect(() => formatCPF("123456789012")).toThrow(RangeError);
    expect(() => formatCPF("12345678901234567890")).toThrow(RangeError);
  });

  it("EC-04 error message includes the actual digit count", () => {
    expect(() => formatCPF("123456789012")).toThrow(/12/);
  });

  it("does NOT throw for exactly 11 digits", () => {
    expect(() => formatCPF("11144477735")).not.toThrow();
  });
});

// ── normalizePhone ───────────────────────────────────────────────────────────

describe("normalizePhone", () => {
  it("strips all non-digit characters", () => {
    expect(normalizePhone("(11) 99999-9999")).toBe("11999999999");
  });

  it("returns digit-only input unchanged", () => {
    expect(normalizePhone("11999999999")).toBe("11999999999");
  });

  it("returns empty string for empty input", () => {
    expect(normalizePhone("")).toBe("");
  });
});

// ── validateRelative ─────────────────────────────────────────────────────────

describe("validateRelative", () => {
  it("returns true for a complete valid relative", () => {
    expect(validateRelative({ name: "John", relation: "father" })).toBe(true);
  });

  it("returns true with optional phone/email present", () => {
    expect(
      validateRelative({
        name: "Jane",
        relation: "mother",
        phone: "11999990000",
        email: "j@ex.com",
      }),
    ).toBe(true);
  });

  it("returns false when name is missing", () => {
    expect(validateRelative({ relation: "father" })).toBe(false);
  });

  it("returns false when name is blank", () => {
    expect(validateRelative({ name: "   ", relation: "father" })).toBe(false);
  });

  it("returns false when relation is missing", () => {
    expect(validateRelative({ name: "John" })).toBe(false);
  });

  it("returns false when relation is blank", () => {
    expect(validateRelative({ name: "John", relation: "  " })).toBe(false);
  });

  it("returns false for an empty object", () => {
    expect(validateRelative({})).toBe(false);
  });
});

// ── ageFromBirthDate ─────────────────────────────────────────────────────────

describe("ageFromBirthDate", () => {
  it("returns correct age when birthday already passed this year", () => {
    const now = new Date("2024-06-20");
    expect(ageFromBirthDate("1990-06-15", now)).toBe(34);
  });

  it("returns correct age on the exact birthday", () => {
    const now = new Date("2024-06-15");
    expect(ageFromBirthDate("1990-06-15", now)).toBe(34);
  });

  it("subtracts 1 when birthday has not yet occurred this year", () => {
    const now = new Date("2024-06-14");
    expect(ageFromBirthDate("1990-06-15", now)).toBe(33);
  });

  it("returns null for an invalid date string", () => {
    expect(ageFromBirthDate("not-a-date")).toBeNull();
  });

  it("returns null for a birth date in the future", () => {
    const now = new Date("2024-01-01");
    expect(ageFromBirthDate("2025-06-01", now)).toBeNull();
  });

  it("returns 0 for a newborn (born today)", () => {
    const now = new Date("2024-06-15");
    expect(ageFromBirthDate("2024-06-15", now)).toBe(0);
  });

  // EC-07: Feb 29 birthday in non-leap year was returning 0 instead of 1
  it("EC-07: Feb-29 birthday — returns 1 on Feb 28 of the following (non-leap) year", () => {
    const now = new Date("2001-02-28"); // 2001 is not a leap year
    expect(ageFromBirthDate("2000-02-29", now)).toBe(1);
  });

  it("EC-07: Feb-29 birthday — returns 0 on Feb 27 of the following year (birthday not yet reached)", () => {
    const now = new Date("2001-02-27");
    expect(ageFromBirthDate("2000-02-29", now)).toBe(0);
  });

  it("EC-07: Feb-29 birthday — still works correctly in a leap year (birthday exists)", () => {
    const now = new Date("2004-02-29"); // 2004 is a leap year
    expect(ageFromBirthDate("2000-02-29", now)).toBe(4);
  });

  it("EC-07: Feb-29 birthday — 1 day after the normalized birthday in a non-leap year", () => {
    const now = new Date("2001-03-01");
    expect(ageFromBirthDate("2000-02-29", now)).toBe(1);
  });
});

// ── searchPatients ───────────────────────────────────────────────────────────

const makeSearchPatient = (overrides: Partial<Patient>): Patient => ({
  id: "p1",
  clinic_id: "c1",
  therapist_id: "t1",
  name: "Default Name",
  email: "default@example.com",
  active: true,
  created_at: "2024-01-01T00:00:00Z",
  updated_at: "2024-01-01T00:00:00Z",
  ...overrides,
});

const PATIENTS: Patient[] = [
  makeSearchPatient({
    id: "p1",
    name: "Alice Smith",
    email: "alice@example.com",
    phone: "11999990001",
  }),
  makeSearchPatient({
    id: "p2",
    name: "Bob Jones",
    email: "bob@example.com",
    phone: "11999990002",
  }),
  makeSearchPatient({
    id: "p3",
    name: "Carlos Souza",
    email: "carlos@example.com",
    phone: null,
  }),
];

describe("searchPatients", () => {
  it("returns all patients for an empty query", () => {
    expect(searchPatients(PATIENTS, "")).toHaveLength(3);
  });

  it("returns all patients for a whitespace-only query", () => {
    expect(searchPatients(PATIENTS, "   ")).toHaveLength(3);
  });

  it("filters by name (case-insensitive)", () => {
    const result = searchPatients(PATIENTS, "alice");
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("p1");
  });

  it("filters by email", () => {
    const result = searchPatients(PATIENTS, "bob@example");
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("p2");
  });

  it("filters by phone substring", () => {
    const result = searchPatients(PATIENTS, "0001");
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("p1");
  });

  it("returns empty array when nothing matches", () => {
    expect(searchPatients(PATIENTS, "zzznomatch")).toHaveLength(0);
  });

  it("handles patients with null phone gracefully", () => {
    const result = searchPatients(PATIENTS, "carlos");
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("p3");
  });
});
