import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  usePatientsStore,
  RELATIVE_RELATIONSHIPS,
  type Patient,
  type PatientAddress,
  type PatientRelative,
  type RelativeRelationship,
} from "../../store/usePatientsStore";
import { C } from "../../constants/designTokens";
import { fmt } from "../../lib/utils";
import Avatar from "../../components/common/Avatar";
import Badge from "../../components/common/Badge";
import Field from "../../components/common/Field";

const MONTHS = ["Out 2023", "Nov 2023", "Dez 2023", "Jan 2024", "Fev 2024", "Mar 2024", "Abr 2024"];

type RelativeForm = {
  name: string;
  relationship: RelativeRelationship;
  phone: string;
  email: string;
  notes: string;
};

const EMPTY_RELATIVE: RelativeForm = {
  name: "",
  relationship: "outro",
  phone: "",
  email: "",
  notes: "",
};

const formatAddress = (a?: PatientAddress): string => {
  if (!a) return "";
  const line1 = [a.street, a.number].filter(Boolean).join(", ");
  const line2 = [a.complement].filter(Boolean).join("");
  const line3 = [a.city, a.state].filter(Boolean).join(" - ");
  return [line1, line2, line3, a.zip].filter(Boolean).join(" • ");
};

export default function PatientDetailView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { patients, updatePatient } = usePatientsStore();
  const patient = patients.find((p) => p.id === Number(id));

  const [tab, setTab] = useState("info");
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<Partial<Patient>>(patient || {});
  const [showRelativeModal, setShowRelativeModal] = useState(false);
  const [editingRelativeId, setEditingRelativeId] = useState<number | null>(null);
  const [relForm, setRelForm] = useState<RelativeForm>(EMPTY_RELATIVE);

  useEffect(() => {
    if (patient) setForm({ ...patient });
  }, [patient]);

  if (!patient)
    return (
      <div style={{ padding: 40, color: C.muted }}>
        Paciente não encontrado.{" "}
        <button onClick={() => navigate("/patients")} style={{ color: C.primary }}>
          Voltar
        </button>
      </div>
    );

  const history = MONTHS.slice(-5).map((m) => ({
    month: m,
    sessions: Math.max(1, patient.sessionsPerMonth + Math.floor(Math.random() * 3) - 1),
    value: patient.valuePerSession,
  }));

  const save = () => {
    updatePatient({
      ...patient,
      ...form,
      sessionsPerMonth: Number(form.sessionsPerMonth ?? patient.sessionsPerMonth),
      valuePerSession: Number(form.valuePerSession ?? patient.valuePerSession),
      address: form.address ?? patient.address ?? {},
    } as Patient);
    setEditing(false);
  };

  const setAddr = (key: keyof PatientAddress, value: string) =>
    setForm((prev) => ({
      ...prev,
      address: { ...(prev.address || patient.address || {}), [key]: value },
    }));

  const openAddRelative = () => {
    setEditingRelativeId(null);
    setRelForm(EMPTY_RELATIVE);
    setShowRelativeModal(true);
  };

  const openEditRelative = (r: PatientRelative) => {
    setEditingRelativeId(r.id);
    setRelForm({
      name: r.name,
      relationship: r.relationship,
      phone: r.phone || "",
      email: r.email || "",
      notes: r.notes || "",
    });
    setShowRelativeModal(true);
  };

  const saveRelative = () => {
    if (!relForm.name.trim()) return;
    const existing = patient.relatives || [];
    let next: PatientRelative[];
    if (editingRelativeId != null) {
      next = existing.map((r) =>
        r.id === editingRelativeId ? { ...r, ...relForm } : r,
      );
    } else {
      next = [...existing, { ...relForm, id: Date.now() }];
    }
    updatePatient({ ...patient, relatives: next });
    setShowRelativeModal(false);
    setEditingRelativeId(null);
    setRelForm(EMPTY_RELATIVE);
  };

  const deleteRelative = (relId: number) => {
    updatePatient({
      ...patient,
      relatives: (patient.relatives || []).filter((r) => r.id !== relId),
    });
  };

  const tabs = [
    { id: "info", label: "Contato" },
    { id: "family", label: "Família" },
    { id: "nf", label: "Dados NF" },
    { id: "history", label: "Histórico" },
  ];

  const currentAddress = (editing ? form.address : patient.address) || {};

  return (
    <div style={{ padding: "32px 40px", maxWidth: 820 }}>
      <button
        onClick={() => navigate("/patients")}
        style={{
          background: "none",
          border: "none",
          cursor: "pointer",
          color: C.muted,
          fontSize: 14,
          marginBottom: 18,
          display: "flex",
          alignItems: "center",
          gap: 6,
          fontFamily: "inherit",
        }}
      >
        ← Voltar
      </button>

      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 24 }}>
        <Avatar name={patient.name} size={52} />
        <div style={{ flex: 1 }}>
          <h1 style={{ fontFamily: "Lora, serif", fontSize: 24, color: C.text }}>
            {patient.name}
          </h1>
          <div
            style={{
              display: "flex",
              gap: 10,
              marginTop: 5,
              alignItems: "center",
              flexWrap: "wrap",
            }}
          >
            <Badge type={patient.status} />
            <span style={{ fontSize: 12, color: C.muted }}>
              Paciente desde {patient.since}
            </span>
            <span style={{ fontSize: 13, color: C.primary, fontWeight: "500" }}>
              {fmt(patient.sessionsPerMonth * patient.valuePerSession)}/mês
            </span>
          </div>
        </div>
        {editing ? (
          <>
            <button
              onClick={() => {
                setEditing(false);
                setForm({ ...patient });
              }}
              style={{
                padding: "8px 16px",
                border: `1px solid ${C.border}`,
                borderRadius: 8,
                background: "none",
                cursor: "pointer",
                fontSize: 13,
                color: C.muted,
              }}
            >
              Cancelar
            </button>
            <button
              onClick={save}
              style={{
                padding: "8px 16px",
                background: C.primary,
                border: "none",
                borderRadius: 8,
                color: "#fff",
                cursor: "pointer",
                fontSize: 13,
              }}
            >
              Salvar
            </button>
          </>
        ) : (
          <button
            onClick={() => setEditing(true)}
            style={{
              padding: "8px 16px",
              border: `1px solid ${C.border}`,
              borderRadius: 8,
              background: "none",
              cursor: "pointer",
              fontSize: 13,
              color: C.muted,
            }}
          >
            Editar
          </button>
        )}
      </div>

      {/* Tabs */}
      <div
        style={{
          display: "flex",
          gap: 2,
          marginBottom: 24,
          borderBottom: `1px solid ${C.border}`,
        }}
      >
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              padding: "8px 16px",
              background: "none",
              border: "none",
              cursor: "pointer",
              fontSize: 14,
              fontFamily: "inherit",
              color: tab === t.id ? C.primary : C.muted,
              borderBottom:
                tab === t.id ? `2px solid ${C.primary}` : "2px solid transparent",
              fontWeight: tab === t.id ? "500" : "400",
              marginBottom: -1,
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Contato */}
      {tab === "info" && (
        <>
          <div
            style={{
              background: C.surface,
              border: `1px solid ${C.border}`,
              borderRadius: 12,
              padding: 24,
            }}
          >
            <div
              style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}
            >
              <Field
                label="Nome completo"
                value={editing ? form.name : patient.name}
                editing={editing}
                onChange={(v) => setForm((p) => ({ ...p, name: v }))}
                full
              />
              <Field
                label="Telefone"
                value={editing ? form.phone : patient.phone}
                editing={editing}
                onChange={(v) => setForm((p) => ({ ...p, phone: v }))}
              />
              <Field
                label="Email"
                value={editing ? form.email : patient.email}
                editing={editing}
                onChange={(v) => setForm((p) => ({ ...p, email: v }))}
              />
              <Field
                label="Sessões por mês"
                value={
                  editing ? form.sessionsPerMonth : patient.sessionsPerMonth
                }
                editing={editing}
                onChange={(v) =>
                  setForm((p) => ({ ...p, sessionsPerMonth: Number(v) }))
                }
                type="number"
              />
              <Field
                label="Valor por sessão (R$)"
                value={editing ? form.valuePerSession : patient.valuePerSession}
                editing={editing}
                onChange={(v) =>
                  setForm((p) => ({ ...p, valuePerSession: Number(v) }))
                }
                type="number"
              />
            </div>

            <div style={{ marginTop: 24 }}>
              <Field
                label="Observações clínicas"
                value={editing ? form.notes : patient.notes}
                editing={editing}
                onChange={(v) => setForm((p) => ({ ...p, notes: v }))}
                full
                rows={3}
              />
            </div>
          </div>

          {/* Endereço e Parentes — patient_addresses (1:1) + patient_relatives (1:N) */}
          <div
            style={{
              background: C.surface,
              border: `1px solid ${C.border}`,
              borderRadius: 12,
              padding: 24,
              marginTop: 18,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 16,
              }}
            >
              <h3 style={{ fontSize: 15, color: C.text, fontWeight: 500 }}>
                Endereço e Parentes
              </h3>
              {editing && (
                <span
                  style={{
                    fontSize: 11,
                    color: C.primary,
                    background: C.primaryLight,
                    padding: "2px 10px",
                    borderRadius: 999,
                  }}
                >
                  Modo de edição
                </span>
              )}
            </div>

            {/* Endereço (1:1 patient_addresses) */}
            <h4
              style={{
                fontSize: 12,
                color: C.muted,
                textTransform: "uppercase",
                letterSpacing: 0.5,
                marginBottom: 12,
                fontWeight: 500,
              }}
            >
              Endereço
            </h4>
            <div
              style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 18 }}
            >
              <Field
                label="Rua"
                value={currentAddress.street}
                editing={editing}
                onChange={(v) => setAddr("street", v)}
              />
              <Field
                label="Número"
                value={currentAddress.number}
                editing={editing}
                onChange={(v) => setAddr("number", v)}
              />
              <Field
                label="Complemento"
                value={currentAddress.complement}
                editing={editing}
                onChange={(v) => setAddr("complement", v)}
                full
              />
              <Field
                label="CEP"
                value={currentAddress.zip}
                editing={editing}
                onChange={(v) => setAddr("zip", v)}
              />
              <Field
                label="Cidade"
                value={currentAddress.city}
                editing={editing}
                onChange={(v) => setAddr("city", v)}
              />
              <Field
                label="Estado"
                value={currentAddress.state}
                editing={editing}
                onChange={(v) => setAddr("state", v)}
              />
            </div>
            {!editing && formatAddress(patient.address) && (
              <div style={{ marginTop: 14, fontSize: 13, color: C.muted }}>
                {formatAddress(patient.address)}
              </div>
            )}

            {/* Parentes (1:N patient_relatives) */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginTop: 28,
                marginBottom: 12,
              }}
            >
              <h4
                style={{
                  fontSize: 12,
                  color: C.muted,
                  textTransform: "uppercase",
                  letterSpacing: 0.5,
                  fontWeight: 500,
                  margin: 0,
                }}
              >
                Parentes
              </h4>
              <button
                onClick={openAddRelative}
                style={{
                  padding: "5px 12px",
                  background: C.primary,
                  border: "none",
                  borderRadius: 8,
                  color: "#fff",
                  cursor: "pointer",
                  fontSize: 12,
                  fontFamily: "inherit",
                }}
              >
                + Adicionar
              </button>
            </div>

            {(!patient.relatives || patient.relatives.length === 0) && (
              <div
                style={{
                  padding: 20,
                  textAlign: "center",
                  color: C.muted,
                  fontSize: 13,
                  border: `1px dashed ${C.border}`,
                  borderRadius: 10,
                }}
              >
                Nenhum parente cadastrado.
              </div>
            )}

            {patient.relatives && patient.relatives.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {patient.relatives.map((r) => (
                  <div
                    key={r.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      padding: 12,
                      border: `1px solid ${C.borderLight}`,
                      borderRadius: 10,
                      background: C.bg,
                    }}
                  >
                    <Avatar name={r.name} size={32} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          flexWrap: "wrap",
                        }}
                      >
                        <span
                          style={{
                            fontSize: 13,
                            fontWeight: 500,
                            color: C.text,
                          }}
                        >
                          {r.name}
                        </span>
                        <span
                          style={{
                            fontSize: 11,
                            color: C.primary,
                            background: C.primaryLight,
                            padding: "2px 8px",
                            borderRadius: 999,
                            textTransform: "capitalize",
                          }}
                        >
                          {r.relationship}
                        </span>
                      </div>
                      <div
                        style={{ fontSize: 12, color: C.muted, marginTop: 2 }}
                      >
                        {r.phone || "—"}
                        {r.email ? ` • ${r.email}` : ""}
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button
                        onClick={() => openEditRelative(r)}
                        style={{
                          padding: "4px 10px",
                          border: `1px solid ${C.border}`,
                          borderRadius: 6,
                          background: C.surface,
                          cursor: "pointer",
                          fontSize: 12,
                          color: C.muted,
                          fontFamily: "inherit",
                        }}
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => deleteRelative(r.id)}
                        style={{
                          padding: "4px 10px",
                          border: `1px solid ${C.border}`,
                          borderRadius: 6,
                          background: C.surface,
                          cursor: "pointer",
                          fontSize: 12,
                          color: C.danger,
                          fontFamily: "inherit",
                        }}
                      >
                        Remover
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* Família */}
      {tab === "family" && (
        <div
          style={{
            background: C.surface,
            border: `1px solid ${C.border}`,
            borderRadius: 12,
            padding: 24,
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 16,
            }}
          >
            <h3 style={{ fontSize: 15, color: C.text, fontWeight: 500 }}>
              Parentes / Responsáveis
            </h3>
            <button
              onClick={openAddRelative}
              style={{
                padding: "6px 14px",
                background: C.primary,
                border: "none",
                borderRadius: 8,
                color: "#fff",
                cursor: "pointer",
                fontSize: 13,
                fontFamily: "inherit",
              }}
            >
              + Adicionar
            </button>
          </div>

          {(!patient.relatives || patient.relatives.length === 0) && (
            <div
              style={{
                padding: 28,
                textAlign: "center",
                color: C.muted,
                fontSize: 13,
                border: `1px dashed ${C.border}`,
                borderRadius: 10,
              }}
            >
              Nenhum parente cadastrado.
            </div>
          )}

          {patient.relatives && patient.relatives.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {patient.relatives.map((r) => (
                <div
                  key={r.id}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 12,
                    padding: 14,
                    border: `1px solid ${C.borderLight}`,
                    borderRadius: 10,
                    background: C.bg,
                  }}
                >
                  <Avatar name={r.name} size={36} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        flexWrap: "wrap",
                      }}
                    >
                      <span
                        style={{ fontSize: 14, fontWeight: 500, color: C.text }}
                      >
                        {r.name}
                      </span>
                      <span
                        style={{
                          fontSize: 11,
                          color: C.primary,
                          background: C.primaryLight,
                          padding: "2px 8px",
                          borderRadius: 999,
                          textTransform: "capitalize",
                        }}
                      >
                        {r.relationship}
                      </span>
                    </div>
                    <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>
                      {r.phone || "—"}
                      {r.email ? ` • ${r.email}` : ""}
                    </div>
                    {r.notes && (
                      <div
                        style={{ fontSize: 12, color: C.muted, marginTop: 6 }}
                      >
                        {r.notes}
                      </div>
                    )}
                  </div>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button
                      onClick={() => openEditRelative(r)}
                      style={{
                        padding: "4px 10px",
                        border: `1px solid ${C.border}`,
                        borderRadius: 6,
                        background: C.surface,
                        cursor: "pointer",
                        fontSize: 12,
                        color: C.muted,
                        fontFamily: "inherit",
                      }}
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => deleteRelative(r.id)}
                      style={{
                        padding: "4px 10px",
                        border: `1px solid ${C.border}`,
                        borderRadius: 6,
                        background: C.surface,
                        cursor: "pointer",
                        fontSize: 12,
                        color: C.danger,
                        fontFamily: "inherit",
                      }}
                    >
                      Remover
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === "nf" && (
        <div
          style={{
            background: C.surface,
            border: `1px solid ${C.border}`,
            borderRadius: 12,
            padding: 24,
            color: C.muted,
            fontSize: 13,
          }}
        >
          Dados de NF em breve.
        </div>
      )}

      {tab === "history" && (
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
                {["Mês", "Sessões", "Valor/sessão", "Total"].map((h) => (
                  <th
                    key={h}
                    style={{
                      padding: "9px 16px",
                      textAlign: "left",
                      fontSize: 11,
                      color: C.muted,
                      fontWeight: 500,
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {history.map((h) => (
                <tr
                  key={h.month}
                  style={{ borderTop: `1px solid ${C.borderLight}` }}
                >
                  <td style={{ padding: "11px 16px", fontSize: 13, color: C.text }}>
                    {h.month}
                  </td>
                  <td style={{ padding: "11px 16px", fontSize: 13, color: C.text }}>
                    {h.sessions}×
                  </td>
                  <td style={{ padding: "11px 16px", fontSize: 13, color: C.text }}>
                    {fmt(h.value)}
                  </td>
                  <td
                    style={{
                      padding: "11px 16px",
                      fontSize: 13,
                      color: C.primary,
                      fontWeight: 500,
                    }}
                  >
                    {fmt(h.sessions * h.value)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Relative modal */}
      {showRelativeModal && (
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
            if (e.target === e.currentTarget) setShowRelativeModal(false);
          }}
        >
          <div
            style={{
              background: C.surface,
              borderRadius: 16,
              padding: 32,
              width: 520,
              maxHeight: "85vh",
              overflowY: "auto",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 20,
              }}
            >
              <h2 style={{ fontFamily: "Lora, serif", fontSize: 20 }}>
                {editingRelativeId != null ? "Editar parente" : "Novo parente"}
              </h2>
              <button
                onClick={() => setShowRelativeModal(false)}
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
                gap: 14,
              }}
            >
              <div style={{ gridColumn: "1 / -1" }}>
                <label
                  style={{
                    fontSize: 12,
                    color: C.muted,
                    display: "block",
                    marginBottom: 5,
                  }}
                >
                  Nome
                </label>
                <input
                  value={relForm.name}
                  onChange={(e) =>
                    setRelForm((p) => ({ ...p, name: e.target.value }))
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
              <div>
                <label
                  style={{
                    fontSize: 12,
                    color: C.muted,
                    display: "block",
                    marginBottom: 5,
                  }}
                >
                  Relação
                </label>
                <select
                  value={relForm.relationship}
                  onChange={(e) =>
                    setRelForm((p) => ({
                      ...p,
                      relationship: e.target.value as RelativeRelationship,
                    }))
                  }
                  style={{
                    width: "100%",
                    padding: "9px 12px",
                    border: `1px solid ${C.border}`,
                    borderRadius: 8,
                    fontSize: 14,
                    fontFamily: "inherit",
                    outline: "none",
                    background: C.surface,
                    textTransform: "capitalize",
                  }}
                >
                  {RELATIVE_RELATIONSHIPS.map((r) => (
                    <option key={r} value={r} style={{ textTransform: "capitalize" }}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label
                  style={{
                    fontSize: 12,
                    color: C.muted,
                    display: "block",
                    marginBottom: 5,
                  }}
                >
                  Telefone
                </label>
                <input
                  value={relForm.phone}
                  onChange={(e) =>
                    setRelForm((p) => ({ ...p, phone: e.target.value }))
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
              <div style={{ gridColumn: "1 / -1" }}>
                <label
                  style={{
                    fontSize: 12,
                    color: C.muted,
                    display: "block",
                    marginBottom: 5,
                  }}
                >
                  Email
                </label>
                <input
                  value={relForm.email}
                  onChange={(e) =>
                    setRelForm((p) => ({ ...p, email: e.target.value }))
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
              <div style={{ gridColumn: "1 / -1" }}>
                <label
                  style={{
                    fontSize: 12,
                    color: C.muted,
                    display: "block",
                    marginBottom: 5,
                  }}
                >
                  Observações
                </label>
                <textarea
                  rows={2}
                  value={relForm.notes}
                  onChange={(e) =>
                    setRelForm((p) => ({ ...p, notes: e.target.value }))
                  }
                  style={{
                    width: "100%",
                    padding: "9px 12px",
                    border: `1px solid ${C.border}`,
                    borderRadius: 8,
                    fontSize: 14,
                    fontFamily: "inherit",
                    outline: "none",
                    resize: "vertical",
                  }}
                />
              </div>
            </div>
            <div
              style={{
                display: "flex",
                gap: 12,
                marginTop: 20,
                justifyContent: "flex-end",
              }}
            >
              <button
                onClick={() => setShowRelativeModal(false)}
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
                onClick={saveRelative}
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
                {editingRelativeId != null ? "Salvar" : "Adicionar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
