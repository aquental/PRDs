import { C } from "../../constants/designTokens";

export default function Section({ title, icon, children }) {
  return (
    <div
      style={{
        background: C.surface,
        border: `1px solid ${C.border}`,
        borderRadius: 12,
        overflow: "hidden",
        marginBottom: 16,
      }}
    >
      <div
        style={{
          padding: "14px 20px",
          borderBottom: `1px solid ${C.borderLight}`,
          display: "flex",
          alignItems: "center",
          gap: 10,
        }}
      >
        <span style={{ fontSize: 14, color: C.primary }}>{icon}</span>
        <h2 style={{ fontSize: 14, fontWeight: "500", color: C.text }}>{title}</h2>
      </div>
      <div style={{ padding: "20px 20px" }}>{children}</div>
    </div>
  );
}
