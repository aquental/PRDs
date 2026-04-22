export function calculateMonthlyRevenue(sessions: { rate: number; date: Date }[], month: Date) {
  const start = new Date(month.getFullYear(), month.getMonth(), 1);
  const end = new Date(month.getFullYear(), month.getMonth() + 1, 0);
  return sessions
    .filter(s => s.date >= start && s.date <= end)
    .reduce((sum, s) => sum + s.rate, 0);
}

export function projectAnnualRevenue(monthlyRevenue: number, growthRate = 0.05) {
  return Array.from({ length: 12 }, (_, i) => monthlyRevenue * Math.pow(1 + growthRate, i));
}
