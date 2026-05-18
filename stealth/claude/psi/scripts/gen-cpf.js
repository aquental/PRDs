#!/usr/bin/env node
// Generates one or more valid CPFs for use in tests and fixtures.
// Usage: node scripts/gen-cpf.js [count=1]

const count = Math.max(1, parseInt(process.argv[2] ?? "1", 10) || 1);

for (let i = 0; i < count; i++) {
  console.log(generateValidCPF());
}

function generateValidCPF() {
  while (true) {
    const base = Array.from({ length: 9 }, () =>
      Math.floor(Math.random() * 10),
    );

    let sum = base.reduce((acc, d, idx) => acc + d * (10 - idx), 0);
    let d1 = (sum * 10) % 11;
    if (d1 === 10) d1 = 0;

    sum = [...base, d1].reduce((acc, d, idx) => acc + d * (11 - idx), 0);
    let d2 = (sum * 10) % 11;
    if (d2 === 10) d2 = 0;

    const digits = [...base, d1, d2].join("");
    if (!/^(\d)\1{10}$/.test(digits)) {
      return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
    }
  }
}
