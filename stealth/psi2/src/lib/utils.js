export const fmt = (v) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
    v,
  );

export const getInitials = (n) =>
  n
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

export const monthlyRevenue = (ps) =>
  ps
    .filter((p) => p.status === "active")
    .reduce((s, p) => s + p.sessionsPerMonth * p.valuePerSession, 0);
