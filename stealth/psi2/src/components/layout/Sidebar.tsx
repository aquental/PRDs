import { useNavigate, useLocation } from "react-router-dom";
import { C } from "../../constants/designTokens";
import { getInitials } from "../../lib/utils";
import { usePsychologistStore } from "../../store/usePsychologistStore";

export default function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { psychologist } = usePsychologistStore();

  const items = [
    { id: "dashboard", path: "/", emoji: "⊞", label: "Dashboard" },
    { id: "patients", path: "/patients", emoji: "◎", label: "Pacientes" },
    { id: "finances", path: "/finances", emoji: "◈", label: "Finanças" },
    { id: "chat", path: "/chat", emoji: "◉", label: "Assistente IA" },
  ];

  const currentPath = location.pathname;
  const initials = getInitials(psychologist.name);

  return (
    <div
      style={{
        width: 220,
        minHeight: "100vh",
        background: C.sidebar,
        display: "flex",
        flexDirection: "column",
        flexShrink: 0,
        position: "sticky",
        top: 0,
      }}
    >
      {/* logo */}
      <div
        style={{
          padding: "22px 20px 18px",
          borderBottom: "1px solid rgba(255,255,255,0.08)",
          display: "flex",
          alignItems: "center",
          gap: 10,
        }}
      >
        <div
          style={{
            width: 36,
            height: 36,
            background: "rgba(255,255,255,0.15)",
            borderRadius: 10,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 20,
            color: "#fff",
            fontFamily: "Lora, serif",
          }}
        >
          ψ
        </div>
        <span
          style={{
            color: "#fff",
            fontSize: 20,
            fontFamily: "Lora, serif",
            fontWeight: 600,
          }}
        >
          Psi
        </span>
      </div>

      {/* nav */}
      <nav style={{ flex: 1, padding: "14px 10px" }}>
        {items.map((item) => {
          const isActive =
            currentPath === item.path ||
            (item.id === "patients" && currentPath.startsWith("/patients"));
          return (
            <button
              key={item.id}
              onClick={() => navigate(item.path)}
              style={{
                width: "100%",
                padding: "10px 12px",
                marginBottom: 3,
                borderRadius: 8,
                border: "none",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 10,
                background: isActive ? C.sidebarActive : "transparent",
                color: isActive ? "#fff" : "rgba(255,255,255,0.58)",
                fontSize: 14,
                fontFamily: "inherit",
                textAlign: "left",
                fontWeight: isActive ? "500" : "400",
              }}
              onMouseOver={(e) => {
                if (!isActive)
                  e.currentTarget.style.background = C.sidebarHover;
              }}
              onMouseOut={(e) => {
                if (!isActive) e.currentTarget.style.background = "transparent";
              }}
            >
              <span style={{ fontSize: 15, opacity: 0.9 }}>{item.emoji}</span>
              {item.label}
            </button>
          );
        })}
      </nav>

      {/* user */}
      <div
        style={{
          padding: "14px 10px",
          borderTop: "1px solid rgba(255,255,255,0.08)",
        }}
      >
        <button
          onClick={() => navigate("/settings")}
          style={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "8px 12px",
            marginBottom: 4,
            background:
              currentPath === "/settings" ? C.sidebarActive : "transparent",
            border: "none",
            borderRadius: 8,
            cursor: "pointer",
            textAlign: "left",
          }}
          onMouseOver={(e) => {
            if (currentPath !== "/settings")
              e.currentTarget.style.background = C.sidebarHover;
          }}
          onMouseOut={(e) => {
            if (currentPath !== "/settings")
              e.currentTarget.style.background = "transparent";
          }}
        >
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: "50%",
              background: "rgba(255,255,255,0.2)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 12,
              color: "#fff",
              fontWeight: "500",
              flexShrink: 0,
            }}
          >
            {initials}
          </div>
          <div style={{ overflow: "hidden" }}>
            <div
              style={{
                color: "#fff",
                fontSize: 13,
                fontWeight: "500",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {psychologist.name}
            </div>
            <div style={{ color: "rgba(255,255,255,0.45)", fontSize: 11 }}>
              CRP {psychologist.crp || "—"}
            </div>
          </div>
        </button>

        <button
          onClick={() => window.location.reload()} // ← replace with real logout later
          style={{
            width: "100%",
            padding: "7px 12px",
            border: "none",
            borderRadius: 8,
            background: "transparent",
            cursor: "pointer",
            color: "rgba(255,255,255,0.45)",
            fontSize: 13,
            fontFamily: "inherit",
            textAlign: "left",
          }}
        >
          ← Sair
        </button>
      </div>
    </div>
  );
}
