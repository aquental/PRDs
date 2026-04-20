import { useState } from "react";
import { usePatientsStore } from "../../store/usePatientsStore";
import { useNavigate } from "react-router-dom";
import { C } from "../../constants/designTokens";
import { fmt } from "../../lib/utils";
import Avatar from "../../components/common/Avatar";
import Badge from "../../components/common/Badge";

export default function PatientsView() {
  const { patients, addPatient } = usePatientsStore();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    cpf: "",
    address: "",
    sessionsPerMonth: 2,
    valuePerSession: 200,
  });

  const filtered = patients.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.phone.includes(search) ||
      p.email.toLowerCase().includes(search.toLowerCase()),
  );

  const handleAdd = () => {
    if (!form.name.trim()) return;
    addPatient({
      ...form,
      since: new Date().toISOString().slice(0, 7),
      status: "active",
      family: [],
      notes: "",
    });
    setShowModal(false);
    setForm({
      name: "",
      phone: "",
      email: "",
      cpf: "",
      address: "",
      sessionsPerMonth: 2,
      valuePerSession: 200,
    });
  };

  return (
    <div style={{ padding: "32px 40px", maxWidth: 1060 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 22,
        }}
      >
        <h1 style={{ fontFamily: "Lora, serif", fontSize: 26, color: C.text }}>
          Pacientes
        </h1>
        <button
          onClick={() => setShowModal(true)}
          style={{
            background: C.primary,
            color: "#fff",
            border: "none",
            borderRadius: 8,
            padding: "10px 18px",
            cursor: "pointer",
            fontSize: 14,
            fontFamily: "inherit",
          }}
        >
          + Novo Paciente
        </button>
      </div>

      <div style={{ position: "relative", marginBottom: 18 }}>
        <span
          style={{
            position: "absolute",
            left: 14,
            top: "50%",
            transform: "translateY(-50%)",
            color: C.muted,
            fontSize: 15,
          }}
        >
          🔍
        </span>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nome, telefone ou e-mail..."
          style={{
            width: "100%",
            padding: "10px 14px 10px 40px",
            border: `1px solid ${C.border}`,
            borderRadius: 8,
            fontSize: 14,
            fontFamily: "inherit",
            outline: "none",
            background: C.surface,
          }}
        />
      </div>

      <div
        style={{
          background: C.surface,
          border: `1px solid ${C.border}`,
          borderRadius: 12,
          overflow: "hidden",
        }}
      >
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: C.bg }}>
              {[
                "Paciente",
                "Contato",
                "Sessões/Mês",
                "Valor",
                "Receita Mensal",
                "Status",
                "",
              ].map((h) => (
                <th
                  key={h}
                  style={{
                    padding: "9px 16px",
                    textAlign: "left",
                    fontSize: 11,
                    color: C.muted,
                    fontWeight: "500",
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((p) => (
              <tr
                key={p.id}
                style={{ borderTop: `1px solid ${C.borderLight}` }}
                onMouseOver={(e) => (e.currentTarget.style.background = C.bg)}
                onMouseOut={(e) =>
                  (e.currentTarget.style.background = "transparent")
                }
              >
                <td style={{ padding: "11px 16px" }}>
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 10 }}
                  >
                    <Avatar name={p.name} size={34} />
                    <div>
                      <div
                        style={{
                          fontSize: 14,
                          fontWeight: "500",
                          color: C.text,
                        }}
                      >
                        {p.name}
                      </div>
                      <div style={{ fontSize: 11, color: C.muted }}>
                        desde {p.since}
                      </div>
                    </div>
                  </div>
                </td>
                <td style={{ padding: "11px 16px" }}>
                  <div style={{ fontSize: 13, color: C.text }}>{p.phone}</div>
                  <div style={{ fontSize: 11, color: C.muted }}>{p.email}</div>
                </td>
                <td
                  style={{ padding: "11px 16px", fontSize: 14, color: C.text }}
                >
                  {p.sessionsPerMonth}×
                </td>
                <td
                  style={{ padding: "11px 16px", fontSize: 14, color: C.text }}
                >
                  {fmt(p.valuePerSession)}
                </td>
                <td
                  style={{
                    padding: "11px 16px",
                    fontSize: 14,
                    fontWeight: "500",
                    color: C.primary,
                  }}
                >
                  {fmt(p.sessionsPerMonth * p.valuePerSession)}
                </td>
                <td style={{ padding: "11px 16px" }}>
                  <Badge type={p.status} />
                </td>
                <td style={{ padding: "11px 16px" }}>
                  <button
                    onClick={() => navigate(`/patients/${p.id}`)}
                    style={{
                      background: "none",
                      border: `1px solid ${C.border}`,
                      borderRadius: 6,
                      padding: "4px 12px",
                      cursor: "pointer",
                      fontSize: 12,
                      color: C.muted,
                      fontFamily: "inherit",
                    }}
                  >
                    Abrir →
                  </button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td
                  colSpan={7}
                  style={{ padding: 40, textAlign: "center", color: C.muted }}
                >
                  Nenhum paciente encontrado
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Add modal */}
      {showModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.4)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 200,
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowModal(false);
          }}
        >
          <div
            style={{
              background: C.surface,
              borderRadius: 16,
              padding: 32,
              width: 540,
              maxHeight: "85vh",
              overflowY: "auto",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 24,
              }}
            >
              <h2 style={{ fontFamily: "Lora, serif", fontSize: 20 }}>
                Novo Paciente
              </h2>
              <button
                onClick={() => setShowModal(false)}
                style={{
                  background: "none",
                  border: "none",
                  fontSize: 22,
                  cursor: "pointer",
                  color: C.muted,
                }}
              >
                ×
              </button>
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 16,
              }}
            >
              {[
                { label: "Nome completo", key: "name", full: true },
                { label: "Telefone", key: "phone" },
                { label: "Email", key: "email" },
                { label: "CPF", key: "cpf" },
                { label: "Endereço", key: "address", full: true },
                {
                  label: "Sessões por mês",
                  key: "sessionsPerMonth",
                  type: "number",
                },
                {
                  label: "Valor por sessão (R$)",
                  key: "valuePerSession",
                  type: "number",
                },
              ].map((f) => (
                <div
                  key={f.key}
                  style={{ gridColumn: f.full ? "1 / -1" : "auto" }}
                >
                  <label
                    style={{
                      fontSize: 12,
                      color: C.muted,
                      display: "block",
                      marginBottom: 5,
                    }}
                  >
                    {f.label}
                  </label>
                  <input
                    type={f.type || "text"}
                    value={form[f.key]}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, [f.key]: e.target.value }))
                    }
                    style={{
                      width: "100%",
                      padding: "9px 12px",
                      border: `1px solid ${C.border}`,
                      borderRadius: 8,
                      fontSize: 14,
                      fontFamily: "inherit",
                      outline: "none",
                    }}
                  />
                </div>
              ))}
            </div>
            <div
              style={{
                display: "flex",
                gap: 12,
                marginTop: 24,
                justifyContent: "flex-end",
              }}
            >
              <button
                onClick={() => setShowModal(false)}
                style={{
                  padding: "9px 20px",
                  border: `1px solid ${C.border}`,
                  borderRadius: 8,
                  background: "none",
                  cursor: "pointer",
                  fontSize: 14,
                  fontFamily: "inherit",
                  color: C.muted,
                }}
              >
                Cancelar
              </button>
              <button
                onClick={handleAdd}
                style={{
                  padding: "9px 20px",
                  background: C.primary,
                  border: "none",
                  borderRadius: 8,
                  color: "#fff",
                  cursor: "pointer",
                  fontSize: 14,
                  fontFamily: "inherit",
                }}
              >
                Adicionar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
