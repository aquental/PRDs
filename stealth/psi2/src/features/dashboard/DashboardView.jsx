import { usePatientsStore } from "../../store/usePatientsStore";
import { useNavigate } from "react-router-dom";
import { C } from "../../constants/designTokens";
import { monthlyRevenue, fmt } from "../../lib/utils";
import Avatar from "../../components/common/Avatar";
import Badge from "../../components/common/Badge";

export default function DashboardView() {
    const { patients } = usePatientsStore();
    const navigate = useNavigate();

    const active = patients.filter(p => p.status === "active");
    const rev = monthlyRevenue(patients);
    const sessions = active.reduce((s, p) => s + p.sessionsPerMonth, 0);

    const metrics = [
        { label: "Pacientes Ativos", value: active.length, color: "#1B6B57", bg: C.primaryLight },
        { label: "Receita Mensal", value: fmt(rev), color: C.accent, bg: C.accentLight },
        { label: "Sessões / Mês", value: sessions, color: "#2563EB", bg: "#EFF6FF" },
        { label: "Ticket Médio", value: fmt(rev / (active.length || 1)), color: "#7C3AED", bg: "#F5F3FF" },
    ];

    return (
        <div style={{ padding: "32px 40px", maxWidth: 1060 }}>
            <div style={{ marginBottom: 28 }}>
                <h1 style={{ fontFamily: "Lora, serif", fontSize: 26, color: C.text, marginBottom: 4 }}>Bom dia, Dra. Renata 👋</h1>
                <p style={{ color: C.muted, fontSize: 14 }}>{new Date().toLocaleDateString("pt-BR", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</p>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14, marginBottom: 28 }}>
                {metrics.map((m, i) => (
                    <div key={i} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: "18px 20px" }}>
                        <div style={{ fontSize: 12, color: C.muted, marginBottom: 8 }}>{m.label}</div>
                        <div style={{ fontSize: 22, fontWeight: "600", color: m.color }}>{m.value}</div>
                    </div>
                ))}
            </div>

            <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, overflow: "hidden" }}>
                <div style={{ padding: "14px 20px", borderBottom: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <h2 style={{ fontSize: 15, fontWeight: "500", color: C.text }}>Pacientes recentes</h2>
                    <button onClick={() => navigate("/patients")} style={{ background: "none", border: "none", color: C.primary, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>Ver todos →</button>
                </div>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                        <tr style={{ background: C.bg }}>
                            {["Paciente", "Sessões/Mês", "Valor Sessão", "Receita Mensal", "Status", ""].map(h => <th key={h} style={{ padding: "9px 20px", textAlign: "left", fontSize: 11, color: C.muted, fontWeight: "500" }}>{h}</th>)}
                        </tr>
                    </thead>
                    <tbody>
                        {patients.slice(0, 6).map(p => (
                            <tr key={p.id} style={{ borderTop: `1px solid ${C.borderLight}` }}>
                                <td style={{ padding: "11px 20px" }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                        <Avatar name={p.name} size={32} />
                                        <div>
                                            <div style={{ fontSize: 14, fontWeight: "500", color: C.text }}>{p.name}</div>
                                            <div style={{ fontSize: 11, color: C.muted }}>{p.phone}</div>
                                        </div>
                                    </div>
                                </td>
                                <td style={{ padding: "11px 20px", fontSize: 14, color: C.text }}>{p.sessionsPerMonth}×</td>
                                <td style={{ padding: "11px 20px", fontSize: 14, color: C.text }}>{fmt(p.valuePerSession)}</td>
                                <td style={{ padding: "11px 20px", fontSize: 14, fontWeight: "500", color: C.primary }}>{fmt(p.sessionsPerMonth * p.valuePerSession)}</td>
                                <td style={{ padding: "11px 20px" }}><Badge type={p.status} /></td>
                                <td style={{ padding: "11px 20px" }}>
                                    <button onClick={() => navigate(`/patients/${p.id}`)} style={{ background: "none", border: `1px solid ${C.border}`, borderRadius: 6, padding: "4px 12px", cursor: "pointer", fontSize: 12, color: C.muted, fontFamily: "inherit" }}>Abrir</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
