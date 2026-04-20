import { C } from "../../constants/designTokens";

export default function Badge({ type }) {
  const map = {
    active: { bg: C.successBg, color: C.success, label: "Ativo" },
    inactive: { bg: C.dangerBg, color: C.danger, label: "Inativo" },
  };
  const s = map[type] || map.active;

  return (
    <span
      style={{
        background: s.bg,
        color: s.color,
        fontSize: 11,
        fontWeight: "500",
        padding: "3px 9px",
        borderRadius: 20,
      }}
    >
      {s.label}
    </span>
  );
}
