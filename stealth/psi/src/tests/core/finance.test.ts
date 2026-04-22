import { describe, it, expect } from "vitest";
import {
  calculateMonthlyRevenue,
  projectAnnualRevenue,
} from "$lib/core/finance";

describe("Finance Logic", () => {
  const sessions = [
    { rate: 250, date: new Date("2026-04-05") },
    { rate: 280, date: new Date("2026-04-15") },
    { rate: 200, date: new Date("2026-03-10") }, // fora do mês
  ];

  it("calcula receita mensal corretamente", () => {
    const result = calculateMonthlyRevenue(sessions, new Date("2026-04-01"));
    expect(result).toBe(530);
  });

  it("retorna 0 quando não há sessões no mês", () => {
    const result = calculateMonthlyRevenue(sessions, new Date("2026-05-01"));
    expect(result).toBe(0);
  });

  it("projeta receita anual com crescimento", () => {
    const projection = projectAnnualRevenue(530);
    expect(projection.length).toBe(12);
    expect(projection[0]).toBe(530);
    expect(projection[11]).toBeCloseTo(530 * Math.pow(1.05, 11), 0);
  });

  it("lida com array vazio (caso extremo)", () => {
    expect(calculateMonthlyRevenue([], new Date())).toBe(0);
  });
});
