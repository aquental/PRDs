import { useState, useRef, useEffect } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

// ── Inject fonts & global styles ──────────────────────────────────────────────
const _style = document.createElement("style");
_style.textContent = `
  @import url('https://fonts.googleapis.com/css2?family=Lora:wght@500;600&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'DM Sans', sans-serif; background: #F4F2ED; }
  @keyframes blink { 0%,80%,100%{opacity:0.2;transform:scale(0.8)} 40%{opacity:1;transform:scale(1)} }
  ::-webkit-scrollbar { width: 5px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: #ccc8c0; border-radius: 4px; }
  input:focus, textarea:focus { box-shadow: 0 0 0 2px rgba(27,107,87,0.15) !important; }
`;
document.head.appendChild(_style);

// ── Design tokens ─────────────────────────────────────────────────────────────
const C = {
    sidebar: "#12433A",
    sidebarActive: "rgba(255,255,255,0.15)",
    sidebarHover: "rgba(255,255,255,0.08)",
    primary: "#1B6B57",
    primaryHover: "#155044",
    primaryLight: "#E6F4F0",
    accent: "#CF7A52",
    accentLight: "#FBF0E8",
    bg: "#F4F2ED",
    surface: "#FFFFFF",
    text: "#1A1917",
    muted: "#706C66",
    mutedLight: "#A59F99",
    border: "#E4E0D8",
    borderLight: "#EEEBE5",
    successBg: "#F0FDF5",
    success: "#16A34A",
    dangerBg: "#FEF2F2",
    danger: "#DC2626",
};

// ── Sample data ───────────────────────────────────────────────────────────────
const INITIAL_PATIENTS = [
    { id: 1, name: "Ana Paula Silva", phone: "(11) 98765-4321", email: "ana.silva@email.com", cpf: "123.456.789-00", address: "Rua das Flores, 123, São Paulo - SP", sessionsPerMonth: 4, valuePerSession: 200, since: "2023-03", status: "active", notes: "Ansiedade e síndrome do pânico.", family: [{ id: 1, name: "Carlos Silva", relation: "Cônjuge", phone: "(11) 91234-5678", email: "" }] },
    { id: 2, name: "João Mendes", phone: "(11) 99887-6543", email: "joao.mendes@email.com", cpf: "987.654.321-00", address: "Av. Paulista, 456, São Paulo - SP", sessionsPerMonth: 2, valuePerSession: 180, since: "2024-01", status: "active", notes: "", family: [] },
    { id: 3, name: "Maria Fernanda Costa", phone: "(21) 98765-0000", email: "mf.costa@email.com", cpf: "456.789.123-00", address: "Rua do Sol, 789, Rio de Janeiro - RJ", sessionsPerMonth: 4, valuePerSession: 220, since: "2023-11", status: "active", notes: "Acompanhamento pós-divórcio.", family: [{ id: 1, name: "Roberto Costa", relation: "Pai", phone: "(21) 97654-3210", email: "r.costa@email.com" }] },
    { id: 4, name: "Pedro Alves", phone: "(11) 94567-8901", email: "pedro.alves@email.com", cpf: "789.123.456-00", address: "Rua Nova, 321, São Paulo - SP", sessionsPerMonth: 2, valuePerSession: 150, since: "2024-04", status: "active", notes: "", family: [] },
    { id: 5, name: "Juliana Rocha", phone: "(11) 95432-1098", email: "j.rocha@email.com", cpf: "321.654.987-00", address: "Alameda das Rosas, 55, SP", sessionsPerMonth: 3, valuePerSession: 200, since: "2023-08", status: "inactive", notes: "Em pausa temporária.", family: [{ id: 1, name: "Lucia Rocha", relation: "Mãe", phone: "(11) 93210-9876", email: "" }] },
    { id: 6, name: "Carlos Eduardo Lima", phone: "(11) 96789-0123", email: "ce.lima@email.com", cpf: "654.321.098-77", address: "Rua do Ipê, 88, São Paulo - SP", sessionsPerMonth: 2, valuePerSession: 200, since: "2024-02", status: "active", notes: "", family: [] },
    { id: 7, name: "Beatriz Santos", phone: "(11) 97654-3210", email: "bia.santos@email.com", cpf: "111.222.333-44", address: "Rua das Palmeiras, 200, SP", sessionsPerMonth: 4, valuePerSession: 250, since: "2022-09", status: "active", notes: "Paciente de longa data.", family: [] },
    { id: 8, name: "Rafael Torres", phone: "(11) 92345-6789", email: "rafael.torres@email.com", cpf: "555.666.777-88", address: "Av. Brasil, 1000, São Paulo - SP", sessionsPerMonth: 1, valuePerSession: 180, since: "2024-03", status: "active", notes: "", family: [{ id: 1, name: "Sandra Torres", relation: "Cônjuge", phone: "(11) 91111-2222", email: "s.torres@email.com" }] },
];

const HISTORY = {};
const MONTHS = ["Out 2023", "Nov 2023", "Dez 2023", "Jan 2024", "Fev 2024", "Mar 2024", "Abr 2024"];
INITIAL_PATIENTS.forEach(p => {
    HISTORY[p.id] = MONTHS.slice(-5).map(m => ({
        month: m,
        sessions: Math.max(1, p.sessionsPerMonth + Math.floor(Math.random() * 3) - 1),
        value: p.valuePerSession,
    }));
});

const MONTHLY_DATA = [
    { month: "Out", receita: 6800, custos: 2200 },
    { month: "Nov", receita: 7200, custos: 2200 },
    { month: "Dez", receita: 6400, custos: 2200 },
    { month: "Jan", receita: 7600, custos: 2400 },
    { month: "Fev", receita: 7800, custos: 2400 },
    { month: "Mar", receita: 8200, custos: 2400 },
    { month: "Abr", receita: 8600, custos: 2600 },
];

const INITIAL_PSYCHOLOGIST = {
    name: "Renata Oliveira",
    crp: "06/00000",
    cpf: "",
    cnpj: "",
    address: "",
    email: "",
    phone: "",
    specialty: "Psicologia Clínica",
};

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmt = v => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
const getInitials = n => n.split(" ").slice(0, 2).map(w => w[0]).join("").toUpperCase();
const monthlyRevenue = ps => ps.filter(p => p.status === "active").reduce((s, p) => s + p.sessionsPerMonth * p.valuePerSession, 0);

const AVATAR_COLORS = ["#1B6B57", "#2563EB", "#7C3AED", "#DC2626", "#D97706", "#0891B2", "#DB2777", "#059669"];
function Avatar({ name, size = 36 }) {
    const bg = AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length];
    return (
        <div style={{
            width: size, height: size, borderRadius: "50%", background: bg, color: "#fff",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: size * 0.35, fontWeight: "500", flexShrink: 0
        }}>
            {getInitials(name)}
        </div>
    );
}

function Badge({ type }) {
    const map = { active: { bg: C.successBg, color: C.success, label: "Ativo" }, inactive: { bg: C.dangerBg, color: C.danger, label: "Inativo" } };
    const s = map[type] || map.active;
    return <span style={{ background: s.bg, color: s.color, fontSize: 11, fontWeight: "500", padding: "3px 9px", borderRadius: 20 }}>{s.label}</span>;
}

function Field({ label, value, editing, onChange, full, type = "text", rows }) {
    return (
        <div style={{ gridColumn: full ? "1 / -1" : "auto" }}>
            <label style={{ fontSize: 12, color: C.muted, display: "block", marginBottom: 5 }}>{label}</label>
            {editing
                ? rows
                    ? <textarea rows={rows} value={value} onChange={e => onChange(e.target.value)}
                        style={{ width: "100%", padding: "8px 12px", border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 14, fontFamily: "inherit", resize: "vertical", outline: "none" }} />
                    : <input type={type} value={value} onChange={e => onChange(e.target.value)}
                        style={{ width: "100%", padding: "8px 12px", border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 14, fontFamily: "inherit", outline: "none" }} />
                : <div style={{ fontSize: 14, color: value ? C.text : C.mutedLight, padding: "8px 0", borderBottom: `1px solid ${C.borderLight}` }}>{value || "—"}</div>
            }
        </div>
    );
}

// ── Login ─────────────────────────────────────────────────────────────────────
function LoginView({ onLogin }) {
    return (
        <div style={{ minHeight: "100vh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ maxWidth: 380, width: "100%", padding: "0 24px", textAlign: "center" }}>
                <div style={{
                    width: 70, height: 70, background: C.primary, borderRadius: 20,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    margin: "0 auto 20px", fontSize: 38, color: "#fff", fontFamily: "Lora, serif"
                }}>ψ</div>
                <h1 style={{ fontFamily: "Lora, serif", fontSize: 34, color: C.text, marginBottom: 6 }}>Psi</h1>
                <p style={{ color: C.muted, fontSize: 14, marginBottom: 40, lineHeight: 1.7 }}>
                    Plataforma de gestão para clínicas de psicologia
                </p>
                <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: "28px 24px" }}>
                    <p style={{ fontSize: 13, color: C.muted, marginBottom: 20 }}>Entre com sua conta profissional</p>
                    <button onClick={onLogin}
                        style={{
                            width: "100%", padding: "12px 16px", border: `1px solid ${C.border}`, borderRadius: 10,
                            background: C.surface, cursor: "pointer", display: "flex", alignItems: "center",
                            justifyContent: "center", gap: 12, fontSize: 15, fontFamily: "inherit",
                            color: C.text, fontWeight: "500"
                        }}
                        onMouseOver={e => e.currentTarget.style.background = C.bg}
                        onMouseOut={e => e.currentTarget.style.background = C.surface}>
                        <svg width="18" height="18" viewBox="0 0 24 24">
                            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                        </svg>
                        Entrar com Google
                    </button>
                </div>
                <p style={{ marginTop: 24, fontSize: 11, color: C.mutedLight }}>© 2024 Psi · Todos os direitos reservados</p>
            </div>
        </div>
    );
}

// ── Sidebar ───────────────────────────────────────────────────────────────────
function Sidebar({ view, onNav, onLogout, psychologist }) {
    const items = [
        { id: "dashboard", emoji: "⊞", label: "Dashboard" },
        { id: "patients", emoji: "◎", label: "Pacientes" },
        { id: "finances", emoji: "◈", label: "Finanças" },
        { id: "chat", emoji: "◉", label: "Assistente IA" },
    ];
    const initials = psychologist.name.split(" ").slice(0, 2).map(w => w[0]).join("").toUpperCase();
    return (
        <div style={{ width: 220, minHeight: "100vh", background: C.sidebar, display: "flex", flexDirection: "column", flexShrink: 0, position: "sticky", top: 0 }}>
            {/* logo */}
            <div style={{ padding: "22px 20px 18px", borderBottom: "1px solid rgba(255,255,255,0.08)", display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{
                    width: 36, height: 36, background: "rgba(255,255,255,0.15)", borderRadius: 10,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 20, color: "#fff", fontFamily: "Lora, serif"
                }}>ψ</div>
                <span style={{ color: "#fff", fontSize: 20, fontFamily: "Lora, serif", fontWeight: 600 }}>Psi</span>
            </div>
            {/* nav */}
            <nav style={{ flex: 1, padding: "14px 10px" }}>
                {items.map(item => (
                    <button key={item.id} onClick={() => onNav(item.id)}
                        style={{
                            width: "100%", padding: "10px 12px", marginBottom: 3, borderRadius: 8, border: "none",
                            cursor: "pointer", display: "flex", alignItems: "center", gap: 10,
                            background: view === item.id ? C.sidebarActive : "transparent",
                            color: view === item.id ? "#fff" : "rgba(255,255,255,0.58)",
                            fontSize: 14, fontFamily: "inherit", textAlign: "left",
                            fontWeight: view === item.id ? "500" : "400"
                        }}
                        onMouseOver={e => { if (view !== item.id) e.currentTarget.style.background = C.sidebarHover; }}
                        onMouseOut={e => { if (view !== item.id) e.currentTarget.style.background = "transparent"; }}>
                        <span style={{ fontSize: 15, opacity: 0.9 }}>{item.emoji}</span>{item.label}
                    </button>
                ))}
            </nav>
            {/* user */}
            <div style={{ padding: "14px 10px", borderTop: "1px solid rgba(255,255,255,0.08)" }}>
                <button onClick={() => onNav("settings")}
                    style={{
                        width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "8px 12px",
                        marginBottom: 4, background: view === "settings" ? C.sidebarActive : "transparent",
                        border: "none", borderRadius: 8, cursor: "pointer", textAlign: "left"
                    }}
                    onMouseOver={e => { if (view !== "settings") e.currentTarget.style.background = C.sidebarHover; }}
                    onMouseOut={e => { if (view !== "settings") e.currentTarget.style.background = "transparent"; }}>
                    <div style={{
                        width: 32, height: 32, borderRadius: "50%", background: "rgba(255,255,255,0.2)",
                        display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, color: "#fff", fontWeight: "500", flexShrink: 0
                    }}>{initials}</div>
                    <div style={{ overflow: "hidden" }}>
                        <div style={{ color: "#fff", fontSize: 13, fontWeight: "500", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{psychologist.name}</div>
                        <div style={{ color: "rgba(255,255,255,0.45)", fontSize: 11 }}>CRP {psychologist.crp || "—"}</div>
                    </div>
                </button>
                <button onClick={onLogout}
                    style={{
                        width: "100%", padding: "7px 12px", border: "none", borderRadius: 8, background: "transparent",
                        cursor: "pointer", color: "rgba(255,255,255,0.45)", fontSize: 13, fontFamily: "inherit",
                        textAlign: "left"
                    }}
                    onMouseOver={e => e.currentTarget.style.color = "rgba(255,255,255,0.8)"}
                    onMouseOut={e => e.currentTarget.style.color = "rgba(255,255,255,0.45)"}>
                    ← Sair
                </button>
            </div>
        </div>
    );
}

// ── Dashboard ─────────────────────────────────────────────────────────────────
function DashboardView({ patients, onNav, onSelectPatient }) {
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
            {/* recent */}
            <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, overflow: "hidden" }}>
                <div style={{ padding: "14px 20px", borderBottom: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <h2 style={{ fontSize: 15, fontWeight: "500", color: C.text }}>Pacientes recentes</h2>
                    <button onClick={() => onNav("patients")} style={{ background: "none", border: "none", color: C.primary, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>Ver todos →</button>
                </div>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                        <tr style={{ background: C.bg }}>
                            {["Paciente", "Sessões/Mês", "Valor Sessão", "Receita Mensal", "Status", ""].map(h => (
                                <th key={h} style={{ padding: "9px 20px", textAlign: "left", fontSize: 11, color: C.muted, fontWeight: "500" }}>{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {patients.slice(0, 6).map(p => (
                            <tr key={p.id} style={{ borderTop: `1px solid ${C.borderLight}` }}>
                                <td style={{ padding: "11px 20px" }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                        <Avatar name={p.name} size={32} />
                                        <div><div style={{ fontSize: 14, fontWeight: "500", color: C.text }}>{p.name}</div>
                                            <div style={{ fontSize: 11, color: C.muted }}>{p.phone}</div></div>
                                    </div>
                                </td>
                                <td style={{ padding: "11px 20px", fontSize: 14, color: C.text }}>{p.sessionsPerMonth}×</td>
                                <td style={{ padding: "11px 20px", fontSize: 14, color: C.text }}>{fmt(p.valuePerSession)}</td>
                                <td style={{ padding: "11px 20px", fontSize: 14, fontWeight: "500", color: C.primary }}>{fmt(p.sessionsPerMonth * p.valuePerSession)}</td>
                                <td style={{ padding: "11px 20px" }}><Badge type={p.status} /></td>
                                <td style={{ padding: "11px 20px" }}>
                                    <button onClick={() => { onSelectPatient(p.id); onNav("patient"); }}
                                        style={{
                                            background: "none", border: `1px solid ${C.border}`, borderRadius: 6, padding: "4px 12px",
                                            cursor: "pointer", fontSize: 12, color: C.muted, fontFamily: "inherit"
                                        }}>Abrir</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

// ── Patients List ─────────────────────────────────────────────────────────────
function PatientsView({ patients, setPatients, onNav, onSelectPatient }) {
    const [search, setSearch] = useState("");
    const [showModal, setShowModal] = useState(false);
    const blank = { name: "", phone: "", email: "", cpf: "", address: "", sessionsPerMonth: 2, valuePerSession: 200 };
    const [form, setForm] = useState(blank);

    const filtered = patients.filter(p =>
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.phone.includes(search) || p.email.toLowerCase().includes(search.toLowerCase())
    );

    const handleAdd = () => {
        if (!form.name.trim()) return;
        setPatients(prev => [...prev, { ...form, id: Date.now(), since: new Date().toISOString().slice(0, 7), status: "active", family: [], notes: "", sessionsPerMonth: +form.sessionsPerMonth, valuePerSession: +form.valuePerSession }]);
        setShowModal(false); setForm(blank);
    };

    const fields = [
        { label: "Nome completo", key: "name", full: true },
        { label: "Telefone", key: "phone" }, { label: "Email", key: "email" },
        { label: "CPF", key: "cpf" }, { label: "Endereço", key: "address", full: true },
        { label: "Sessões por mês", key: "sessionsPerMonth", type: "number" },
        { label: "Valor por sessão (R$)", key: "valuePerSession", type: "number" },
    ];

    return (
        <div style={{ padding: "32px 40px", maxWidth: 1060 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 22 }}>
                <h1 style={{ fontFamily: "Lora, serif", fontSize: 26, color: C.text }}>Pacientes</h1>
                <button onClick={() => setShowModal(true)}
                    style={{
                        background: C.primary, color: "#fff", border: "none", borderRadius: 8, padding: "10px 18px",
                        cursor: "pointer", fontSize: 14, fontFamily: "inherit"
                    }}>+ Novo Paciente</button>
            </div>
            <div style={{ position: "relative", marginBottom: 18 }}>
                <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: C.muted, fontSize: 15 }}>🔍</span>
                <input value={search} onChange={e => setSearch(e.target.value)}
                    placeholder="Buscar por nome, telefone ou e-mail..."
                    style={{
                        width: "100%", padding: "10px 14px 10px 40px", border: `1px solid ${C.border}`,
                        borderRadius: 8, fontSize: 14, fontFamily: "inherit", outline: "none", background: C.surface
                    }} />
            </div>
            <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, overflow: "hidden" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                        <tr style={{ background: C.bg }}>
                            {["Paciente", "Contato", "Sessões/Mês", "Valor", "Receita Mensal", "Status", ""].map(h => (
                                <th key={h} style={{ padding: "9px 16px", textAlign: "left", fontSize: 11, color: C.muted, fontWeight: "500" }}>{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {filtered.map(p => (
                            <tr key={p.id} style={{ borderTop: `1px solid ${C.borderLight}`, cursor: "default" }}
                                onMouseOver={e => e.currentTarget.style.background = C.bg}
                                onMouseOut={e => e.currentTarget.style.background = "transparent"}>
                                <td style={{ padding: "11px 16px" }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                        <Avatar name={p.name} size={34} />
                                        <div><div style={{ fontSize: 14, fontWeight: "500", color: C.text }}>{p.name}</div>
                                            <div style={{ fontSize: 11, color: C.muted }}>desde {p.since}</div></div>
                                    </div>
                                </td>
                                <td style={{ padding: "11px 16px" }}>
                                    <div style={{ fontSize: 13, color: C.text }}>{p.phone}</div>
                                    <div style={{ fontSize: 11, color: C.muted }}>{p.email}</div>
                                </td>
                                <td style={{ padding: "11px 16px", fontSize: 14, color: C.text }}>{p.sessionsPerMonth}×</td>
                                <td style={{ padding: "11px 16px", fontSize: 14, color: C.text }}>{fmt(p.valuePerSession)}</td>
                                <td style={{ padding: "11px 16px", fontSize: 14, fontWeight: "500", color: C.primary }}>{fmt(p.sessionsPerMonth * p.valuePerSession)}</td>
                                <td style={{ padding: "11px 16px" }}><Badge type={p.status} /></td>
                                <td style={{ padding: "11px 16px" }}>
                                    <button onClick={() => { onSelectPatient(p.id); onNav("patient"); }}
                                        style={{
                                            background: "none", border: `1px solid ${C.border}`, borderRadius: 6, padding: "4px 12px",
                                            cursor: "pointer", fontSize: 12, color: C.muted, fontFamily: "inherit"
                                        }}>Abrir →</button>
                                </td>
                            </tr>
                        ))}
                        {filtered.length === 0 && (
                            <tr><td colSpan={7} style={{ padding: 40, textAlign: "center", color: C.muted }}>Nenhum paciente encontrado</td></tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Modal */}
            {showModal && (
                <div style={{
                    position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex",
                    alignItems: "center", justifyContent: "center", zIndex: 200
                }}
                    onClick={e => { if (e.target === e.currentTarget) setShowModal(false); }}>
                    <div style={{ background: C.surface, borderRadius: 16, padding: 32, width: 540, maxHeight: "85vh", overflowY: "auto" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
                            <h2 style={{ fontFamily: "Lora, serif", fontSize: 20 }}>Novo Paciente</h2>
                            <button onClick={() => setShowModal(false)} style={{ background: "none", border: "none", fontSize: 22, cursor: "pointer", color: C.muted, lineHeight: 1 }}>×</button>
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                            {fields.map(f => (
                                <div key={f.key} style={{ gridColumn: f.full ? "1 / -1" : "auto" }}>
                                    <label style={{ fontSize: 12, color: C.muted, display: "block", marginBottom: 5 }}>{f.label}</label>
                                    <input type={f.type || "text"} value={form[f.key]} onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                                        style={{ width: "100%", padding: "9px 12px", border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 14, fontFamily: "inherit", outline: "none" }} />
                                </div>
                            ))}
                        </div>
                        <div style={{ display: "flex", gap: 12, marginTop: 24, justifyContent: "flex-end" }}>
                            <button onClick={() => setShowModal(false)}
                                style={{ padding: "9px 20px", border: `1px solid ${C.border}`, borderRadius: 8, background: "none", cursor: "pointer", fontSize: 14, fontFamily: "inherit", color: C.muted }}>Cancelar</button>
                            <button onClick={handleAdd}
                                style={{ padding: "9px 20px", background: C.primary, border: "none", borderRadius: 8, color: "#fff", cursor: "pointer", fontSize: 14, fontFamily: "inherit" }}>Adicionar</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// ── Patient Detail ────────────────────────────────────────────────────────────
function PatientDetailView({ patient, onBack, onUpdate }) {
    const [tab, setTab] = useState("info");
    const [editing, setEditing] = useState(false);
    const [form, setForm] = useState({ ...patient });
    const [showFamilyModal, setShowFamilyModal] = useState(false);
    const [famForm, setFamForm] = useState({ name: "", relation: "", phone: "", email: "" });

    useEffect(() => { setForm({ ...patient }); }, [patient]);

    const history = HISTORY[patient.id] || [];

    const save = () => { onUpdate({ ...form, sessionsPerMonth: +form.sessionsPerMonth, valuePerSession: +form.valuePerSession }); setEditing(false); };
    const addFamily = () => {
        if (!famForm.name.trim()) return;
        onUpdate({ ...patient, family: [...(patient.family || []), { ...famForm, id: Date.now() }] });
        setShowFamilyModal(false); setFamForm({ name: "", relation: "", phone: "", email: "" });
    };

    const tabs = [{ id: "info", label: "Contato" }, { id: "family", label: "Família" }, { id: "nf", label: "Dados NF" }, { id: "history", label: "Histórico" }];

    return (
        <div style={{ padding: "32px 40px", maxWidth: 820 }}>
            <button onClick={onBack}
                style={{ background: "none", border: "none", cursor: "pointer", color: C.muted, fontSize: 14, marginBottom: 18, display: "flex", alignItems: "center", gap: 6, fontFamily: "inherit" }}>← Voltar</button>

            <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 24 }}>
                <Avatar name={patient.name} size={52} />
                <div style={{ flex: 1 }}>
                    <h1 style={{ fontFamily: "Lora, serif", fontSize: 24, color: C.text }}>{patient.name}</h1>
                    <div style={{ display: "flex", gap: 10, marginTop: 5, alignItems: "center", flexWrap: "wrap" }}>
                        <Badge type={patient.status} />
                        <span style={{ fontSize: 12, color: C.muted }}>Paciente desde {patient.since}</span>
                        <span style={{ fontSize: 13, color: C.primary, fontWeight: "500" }}>{fmt(patient.sessionsPerMonth * patient.valuePerSession)}/mês</span>
                    </div>
                </div>
                {editing
                    ? <>
                        <button onClick={() => { setEditing(false); setForm({ ...patient }); }}
                            style={{ padding: "8px 16px", border: `1px solid ${C.border}`, borderRadius: 8, background: "none", cursor: "pointer", fontSize: 13, color: C.muted, fontFamily: "inherit" }}>Cancelar</button>
                        <button onClick={save}
                            style={{ padding: "8px 16px", background: C.primary, border: "none", borderRadius: 8, color: "#fff", cursor: "pointer", fontSize: 13, fontFamily: "inherit" }}>Salvar</button>
                    </>
                    : <button onClick={() => setEditing(true)}
                        style={{ padding: "8px 16px", border: `1px solid ${C.border}`, borderRadius: 8, background: "none", cursor: "pointer", fontSize: 13, color: C.muted, fontFamily: "inherit" }}>Editar</button>
                }
            </div>

            {/* Tabs */}
            <div style={{ display: "flex", gap: 2, marginBottom: 24, borderBottom: `1px solid ${C.border}` }}>
                {tabs.map(t => (
                    <button key={t.id} onClick={() => setTab(t.id)}
                        style={{
                            padding: "8px 16px", background: "none", border: "none", cursor: "pointer",
                            fontSize: 14, fontFamily: "inherit",
                            color: tab === t.id ? C.primary : C.muted,
                            borderBottom: tab === t.id ? `2px solid ${C.primary}` : "2px solid transparent",
                            fontWeight: tab === t.id ? "500" : "400", marginBottom: -1
                        }}>{t.label}</button>
                ))}
            </div>

            {/* Info */}
            {tab === "info" && (
                <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 24 }}>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
                        <Field label="Nome completo" value={editing ? form.name : patient.name} editing={editing} onChange={v => setForm(p => ({ ...p, name: v }))} full />
                        <Field label="Telefone" value={editing ? form.phone : patient.phone} editing={editing} onChange={v => setForm(p => ({ ...p, phone: v }))} />
                        <Field label="Email" value={editing ? form.email : patient.email} editing={editing} onChange={v => setForm(p => ({ ...p, email: v }))} />
                        <Field label="Endereço" value={editing ? form.address : patient.address} editing={editing} onChange={v => setForm(p => ({ ...p, address: v }))} full />
                        <Field label="Sessões por mês" value={editing ? form.sessionsPerMonth : patient.sessionsPerMonth} editing={editing} onChange={v => setForm(p => ({ ...p, sessionsPerMonth: v }))} type="number" />
                        <Field label="Valor por sessão (R$)" value={editing ? form.valuePerSession : patient.valuePerSession} editing={editing} onChange={v => setForm(p => ({ ...p, valuePerSession: v }))} type="number" />
                    </div>
                    <div style={{ marginTop: 18 }}>
                        <Field label="Observações clínicas" value={editing ? form.notes : patient.notes} editing={editing} onChange={v => setForm(p => ({ ...p, notes: v }))} full rows={3} />
                    </div>
                </div>
            )}

            {/* Family */}
            {tab === "family" && (
                <div>
                    <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 14 }}>
                        <button onClick={() => setShowFamilyModal(true)}
                            style={{ background: C.primary, color: "#fff", border: "none", borderRadius: 8, padding: "8px 16px", cursor: "pointer", fontSize: 13, fontFamily: "inherit" }}>+ Adicionar contato</button>
                    </div>
                    {!(patient.family?.length) && (
                        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 40, textAlign: "center", color: C.muted }}>Nenhum contato familiar cadastrado</div>
                    )}
                    {(patient.family || []).map(f => (
                        <div key={f.id} style={{
                            background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: "16px 20px", marginBottom: 10,
                            display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12
                        }}>
                            {[["Nome", f.name], ["Relação", f.relation], ["Telefone", f.phone || "—"], ["Email", f.email || "—"]].map(([l, v]) => (
                                <div key={l}><div style={{ fontSize: 11, color: C.muted, marginBottom: 3 }}>{l}</div><div style={{ fontSize: 14, color: C.text }}>{v}</div></div>
                            ))}
                        </div>
                    ))}
                    {showFamilyModal && (
                        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200 }}
                            onClick={e => { if (e.target === e.currentTarget) setShowFamilyModal(false); }}>
                            <div style={{ background: C.surface, borderRadius: 16, padding: 28, width: 440 }}>
                                <h3 style={{ fontFamily: "Lora, serif", fontSize: 18, marginBottom: 20 }}>Novo contato familiar</h3>
                                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                                    {[{ l: "Nome completo", k: "name", full: true }, { l: "Relação", k: "relation" }, { l: "Telefone", k: "phone" }, { l: "Email", k: "email", full: true }].map(f => (
                                        <div key={f.k} style={{ gridColumn: f.full ? "1 / -1" : "auto" }}>
                                            <label style={{ fontSize: 12, color: C.muted, display: "block", marginBottom: 5 }}>{f.l}</label>
                                            <input value={famForm[f.k]} onChange={e => setFamForm(p => ({ ...p, [f.k]: e.target.value }))}
                                                style={{ width: "100%", padding: "8px 12px", border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 14, fontFamily: "inherit", outline: "none" }} />
                                        </div>
                                    ))}
                                </div>
                                <div style={{ display: "flex", gap: 10, marginTop: 20, justifyContent: "flex-end" }}>
                                    <button onClick={() => setShowFamilyModal(false)} style={{ padding: "8px 16px", border: `1px solid ${C.border}`, borderRadius: 8, background: "none", cursor: "pointer", fontSize: 13, fontFamily: "inherit", color: C.muted }}>Cancelar</button>
                                    <button onClick={addFamily} style={{ padding: "8px 16px", background: C.primary, border: "none", borderRadius: 8, color: "#fff", cursor: "pointer", fontSize: 13, fontFamily: "inherit" }}>Adicionar</button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* NF */}
            {tab === "nf" && (
                <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 24 }}>
                    <p style={{ fontSize: 13, color: C.muted, marginBottom: 20, padding: "10px 14px", background: C.bg, borderRadius: 8 }}>
                        Dados utilizados para emissão de nota fiscal de serviços
                    </p>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
                        <Field label="Nome / Razão Social" value={editing ? form.name : patient.name} editing={editing} onChange={v => setForm(p => ({ ...p, name: v }))} full />
                        <Field label="CPF / CNPJ" value={editing ? form.cpf : patient.cpf} editing={editing} onChange={v => setForm(p => ({ ...p, cpf: v }))} />
                        <Field label="Email para NF" value={editing ? form.email : patient.email} editing={editing} onChange={v => setForm(p => ({ ...p, email: v }))} />
                        <Field label="Telefone" value={editing ? form.phone : patient.phone} editing={editing} onChange={v => setForm(p => ({ ...p, phone: v }))} full />
                        <Field label="Endereço completo" value={editing ? form.address : patient.address} editing={editing} onChange={v => setForm(p => ({ ...p, address: v }))} full />
                    </div>
                </div>
            )}

            {/* History */}
            {tab === "history" && (
                <div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14, marginBottom: 18 }}>
                        {[
                            { label: "Total de sessões", value: history.reduce((s, h) => s + h.sessions, 0) },
                            { label: "Receita acumulada", value: fmt(history.reduce((s, h) => s + h.sessions * h.value, 0)) },
                            { label: "Frequência média", value: `${(history.reduce((s, h) => s + h.sessions, 0) / (history.length || 1)).toFixed(1)}×/mês` },
                        ].map((c, i) => (
                            <div key={i} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: "16px 18px" }}>
                                <div style={{ fontSize: 12, color: C.muted, marginBottom: 6 }}>{c.label}</div>
                                <div style={{ fontSize: 20, fontWeight: "600", color: C.primary }}>{c.value}</div>
                            </div>
                        ))}
                    </div>
                    <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, overflow: "hidden" }}>
                        <table style={{ width: "100%", borderCollapse: "collapse" }}>
                            <thead>
                                <tr style={{ background: C.bg }}>
                                    {["Mês", "Sessões", "Valor/Sessão", "Total do Mês"].map(h => (
                                        <th key={h} style={{ padding: "9px 20px", textAlign: "left", fontSize: 11, color: C.muted, fontWeight: "500" }}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {history.map((h, i) => (
                                    <tr key={i} style={{ borderTop: `1px solid ${C.borderLight}` }}>
                                        <td style={{ padding: "11px 20px", fontSize: 14, fontWeight: "500", color: C.text }}>{h.month}</td>
                                        <td style={{ padding: "11px 20px", fontSize: 14, color: C.text }}>{h.sessions}×</td>
                                        <td style={{ padding: "11px 20px", fontSize: 14, color: C.text }}>{fmt(h.value)}</td>
                                        <td style={{ padding: "11px 20px", fontSize: 14, fontWeight: "500", color: C.primary }}>{fmt(h.sessions * h.value)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}

// ── Finances ──────────────────────────────────────────────────────────────────
function FinancesView({ patients }) {
    const rev = monthlyRevenue(patients);
    const cost = 3200;
    const profit = rev - cost;
    const metrics = [
        { label: "Receita Mensal", value: fmt(rev), color: C.primary },
        { label: "Custos Mensais", value: fmt(cost), color: C.danger },
        { label: "Lucro Líquido", value: fmt(profit), color: "#16A34A" },
        { label: "Projeção Anual", value: fmt(rev * 12), color: C.accent },
    ];
    return (
        <div style={{ padding: "32px 40px", maxWidth: 1060 }}>
            <h1 style={{ fontFamily: "Lora, serif", fontSize: 26, color: C.text, marginBottom: 26 }}>Finanças</h1>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14, marginBottom: 28 }}>
                {metrics.map((m, i) => (
                    <div key={i} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: "18px 20px" }}>
                        <div style={{ fontSize: 12, color: C.muted, marginBottom: 7 }}>{m.label}</div>
                        <div style={{ fontSize: 20, fontWeight: "600", color: m.color }}>{m.value}</div>
                    </div>
                ))}
            </div>

            <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 24, marginBottom: 24 }}>
                <h2 style={{ fontSize: 15, fontWeight: "500", color: C.text, marginBottom: 18 }}>Evolução financeira (7 meses)</h2>
                <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={MONTHLY_DATA} barGap={4}>
                        <CartesianGrid strokeDasharray="3 3" stroke={C.borderLight} vertical={false} />
                        <XAxis dataKey="month" tick={{ fontSize: 12, fill: C.muted }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 12, fill: C.muted }} axisLine={false} tickLine={false} tickFormatter={v => `R$${(v / 1000).toFixed(0)}k`} />
                        <Tooltip formatter={v => fmt(v)} contentStyle={{ borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 13, fontFamily: "DM Sans, sans-serif" }} />
                        <Bar dataKey="receita" name="Receita" fill={C.primary} radius={[4, 4, 0, 0]} />
                        <Bar dataKey="custos" name="Custos" fill={C.accent} radius={[4, 4, 0, 0]} />
                    </BarChart>
                </ResponsiveContainer>
                <div style={{ display: "flex", gap: 20, marginTop: 8, justifyContent: "center" }}>
                    {[["Receita", C.primary], ["Custos", C.accent]].map(([l, c]) => (
                        <div key={l} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: C.muted }}>
                            <div style={{ width: 10, height: 10, borderRadius: 2, background: c }} />{l}
                        </div>
                    ))}
                </div>
            </div>

            <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, overflow: "hidden" }}>
                <div style={{ padding: "14px 20px", borderBottom: `1px solid ${C.border}` }}>
                    <h2 style={{ fontSize: 15, fontWeight: "500", color: C.text }}>Receita por paciente</h2>
                </div>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                        <tr style={{ background: C.bg }}>
                            {["Paciente", "Status", "Sessões/Mês", "Valor/Sessão", "Receita Mensal", "% do Total"].map(h => (
                                <th key={h} style={{ padding: "9px 16px", textAlign: "left", fontSize: 11, color: C.muted, fontWeight: "500" }}>{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {[...patients].sort((a, b) => (b.sessionsPerMonth * b.valuePerSession) - (a.sessionsPerMonth * a.valuePerSession)).map(p => {
                            const r = p.sessionsPerMonth * p.valuePerSession;
                            const pct = ((r / rev) * 100).toFixed(1);
                            return (
                                <tr key={p.id} style={{ borderTop: `1px solid ${C.borderLight}` }}>
                                    <td style={{ padding: "11px 16px" }}>
                                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                            <Avatar name={p.name} size={28} /><span style={{ fontSize: 14, color: C.text }}>{p.name}</span>
                                        </div>
                                    </td>
                                    <td style={{ padding: "11px 16px" }}><Badge type={p.status} /></td>
                                    <td style={{ padding: "11px 16px", fontSize: 14, color: C.text }}>{p.sessionsPerMonth}×</td>
                                    <td style={{ padding: "11px 16px", fontSize: 14, color: C.text }}>{fmt(p.valuePerSession)}</td>
                                    <td style={{ padding: "11px 16px", fontSize: 14, fontWeight: "500", color: p.status === "active" ? C.primary : C.mutedLight }}>{fmt(r)}</td>
                                    <td style={{ padding: "11px 16px" }}>
                                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                            <div style={{ height: 5, width: 80, background: C.bg, borderRadius: 3, overflow: "hidden" }}>
                                                <div style={{ height: "100%", width: `${pct}%`, background: p.status === "active" ? C.primary : C.mutedLight, borderRadius: 3 }} />
                                            </div>
                                            <span style={{ fontSize: 12, color: C.muted, minWidth: 32 }}>{pct}%</span>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

// ── Settings ──────────────────────────────────────────────────────────────────
function SettingsView({ psychologist, onUpdate }) {
    const [editing, setEditing] = useState(false);
    const [form, setForm] = useState({ ...psychologist });
    const [saved, setSaved] = useState(false);

    const save = () => {
        onUpdate(form);
        setEditing(false);
        setSaved(true);
        setTimeout(() => setSaved(false), 2500);
    };

    const cancel = () => { setForm({ ...psychologist }); setEditing(false); };

    const F = (label, key, opts = {}) => (
        <Field
            label={label}
            value={editing ? form[key] : psychologist[key]}
            editing={editing}
            onChange={v => setForm(p => ({ ...p, [key]: v }))}
            {...opts}
        />
    );

    return (
        <div style={{ padding: "32px 40px", maxWidth: 720 }}>
            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28 }}>
                <div>
                    <h1 style={{ fontFamily: "Lora, serif", fontSize: 26, color: C.text, marginBottom: 4 }}>Configurações</h1>
                    <p style={{ fontSize: 14, color: C.muted }}>Dados profissionais e da clínica</p>
                </div>
                <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                    {saved && (
                        <span style={{
                            fontSize: 13, color: C.success, background: C.successBg,
                            padding: "6px 12px", borderRadius: 8
                        }}>✓ Salvo com sucesso</span>
                    )}
                    {editing
                        ? <>
                            <button onClick={cancel}
                                style={{
                                    padding: "8px 18px", border: `1px solid ${C.border}`, borderRadius: 8,
                                    background: "none", cursor: "pointer", fontSize: 13, color: C.muted, fontFamily: "inherit"
                                }}>
                                Cancelar
                            </button>
                            <button onClick={save}
                                style={{
                                    padding: "8px 18px", background: C.primary, border: "none", borderRadius: 8,
                                    color: "#fff", cursor: "pointer", fontSize: 13, fontFamily: "inherit"
                                }}>
                                Salvar alterações
                            </button>
                        </>
                        : <button onClick={() => setEditing(true)}
                            style={{
                                padding: "8px 18px", border: `1px solid ${C.border}`, borderRadius: 8,
                                background: "none", cursor: "pointer", fontSize: 13, color: C.muted, fontFamily: "inherit"
                            }}>
                            Editar
                        </button>
                    }
                </div>
            </div>

            {/* Avatar + nome */}
            <div style={{
                background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12,
                padding: "24px 28px", marginBottom: 16, display: "flex", alignItems: "center", gap: 20
            }}>
                <div style={{
                    width: 72, height: 72, borderRadius: "50%", background: C.primary,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 26, color: "#fff", fontWeight: "500", flexShrink: 0
                }}>
                    {psychologist.name.split(" ").slice(0, 2).map(w => w[0]).join("").toUpperCase()}
                </div>
                <div>
                    <div style={{ fontSize: 20, fontWeight: "500", color: C.text, fontFamily: "Lora, serif" }}>
                        {psychologist.name || "—"}
                    </div>
                    <div style={{ fontSize: 14, color: C.muted, marginTop: 3 }}>
                        {psychologist.specialty || "Psicóloga"} · CRP {psychologist.crp || "—"}
                    </div>
                    {psychologist.cnpj && (
                        <div style={{ fontSize: 12, color: C.mutedLight, marginTop: 2 }}>CNPJ {psychologist.cnpj}</div>
                    )}
                </div>
            </div>

            {/* Section: Dados pessoais */}
            <Section title="Dados pessoais" icon="◎">
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
                    {F("Nome completo", "name", { full: true })}
                    {F("Especialidade", "specialty")}
                    {F("Email profissional", "email")}
                    {F("Telefone", "phone")}
                </div>
            </Section>

            {/* Section: Dados profissionais */}
            <Section title="Dados profissionais" icon="◈">
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
                    {F("CRP (Conselho Regional de Psicologia)", "crp", { full: true })}
                    {F("CPF", "cpf")}
                    {F("CNPJ (caso possua)", "cnpj")}
                </div>
            </Section>

            {/* Section: Endereço */}
            <Section title="Endereço da clínica" icon="⊞">
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
                    {F("Endereço completo", "address", { full: true })}
                </div>
            </Section>

            {/* Nota */}
            <div style={{
                marginTop: 16, padding: "12px 16px", background: C.accentLight,
                border: `1px solid #F0C4A8`, borderRadius: 10, fontSize: 13, color: "#8B4A28"
            }}>
                Esses dados são utilizados no preenchimento automático de notas fiscais e documentos da clínica.
            </div>
        </div>
    );
}

function Section({ title, icon, children }) {
    return (
        <div style={{
            background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12,
            overflow: "hidden", marginBottom: 16
        }}>
            <div style={{
                padding: "14px 20px", borderBottom: `1px solid ${C.borderLight}`,
                display: "flex", alignItems: "center", gap: 10
            }}>
                <span style={{ fontSize: 14, color: C.primary }}>{icon}</span>
                <h2 style={{ fontSize: 14, fontWeight: "500", color: C.text }}>{title}</h2>
            </div>
            <div style={{ padding: "20px 20px" }}>{children}</div>
        </div>
    );
}

// ── Chat ──────────────────────────────────────────────────────────────────────
function ChatView({ patients }) {
    const [messages, setMessages] = useState([{
        role: "assistant",
        content: "Olá! Sou o assistente Psi 👋\n\nPosso te ajudar com análises dos seus pacientes, projeções financeiras, ou responder qualquer dúvida sobre a clínica. Como posso ajudar hoje?"
    }]);
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);
    const endRef = useRef(null);

    useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, loading]);

    const systemPrompt = `Você é o assistente inteligente da plataforma Psi, um sistema de gestão para clínicas de psicologia.
Você tem acesso aos dados em tempo real da clínica:

PACIENTES CADASTRADOS:
${patients.map(p => `• ${p.name} | ${p.status === "active" ? "Ativo" : "Inativo"} | ${p.sessionsPerMonth} sessões/mês | R$${p.valuePerSession}/sessão | Mensal: R$${p.sessionsPerMonth * p.valuePerSession} | Desde: ${p.since}`).join("\n")}

RESUMO FINANCEIRO ATUAL:
• Receita mensal total: R$${monthlyRevenue(patients).toFixed(2)}
• Pacientes ativos: ${patients.filter(p => p.status === "active").length}
• Total de pacientes: ${patients.length}
• Projeção anual: R$${(monthlyRevenue(patients) * 12).toFixed(2)}
• Total de sessões/mês: ${patients.filter(p => p.status === "active").reduce((s, p) => s + p.sessionsPerMonth, 0)}

Responda sempre em português brasileiro. Seja objetivo, profissional e útil. Use dados reais da clínica nas respostas quando relevante. Formate os valores em Reais (R$).`;

    const send = async () => {
        if (!input.trim() || loading) return;
        const userMsg = { role: "user", content: input.trim() };
        const next = [...messages, userMsg];
        setMessages(next);
        setInput("");
        setLoading(true);
        try {
            const res = await fetch("https://api.anthropic.com/v1/messages", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    model: "claude-sonnet-4-20250514",
                    max_tokens: 1000,
                    system: systemPrompt,
                    messages: next.map(m => ({ role: m.role, content: m.content })),
                }),
            });
            const data = await res.json();
            const reply = data.content?.[0]?.text || "Desculpe, não consegui processar sua mensagem.";
            setMessages(p => [...p, { role: "assistant", content: reply }]);
        } catch {
            setMessages(p => [...p, { role: "assistant", content: "Erro ao conectar. Verifique sua conexão e tente novamente." }]);
        } finally { setLoading(false); }
    };

    const suggestions = ["Qual é minha receita mensal atual?", "Quem são os pacientes com mais sessões?", "Faça uma projeção de receita para o próximo ano", "Liste os pacientes ativos com seus valores"];

    return (
        <div style={{ display: "flex", flexDirection: "column", height: "100vh", maxWidth: 720, margin: "0 auto" }}>
            <div style={{ padding: "24px 32px 16px", borderBottom: `1px solid ${C.border}` }}>
                <h1 style={{ fontFamily: "Lora, serif", fontSize: 22, color: C.text }}>Assistente IA</h1>
                <p style={{ fontSize: 13, color: C.muted, marginTop: 3 }}>Converse com IA sobre pacientes, finanças e gestão da clínica</p>
            </div>

            <div style={{ flex: 1, overflowY: "auto", padding: "20px 32px" }}>
                {messages.map((msg, i) => (
                    <div key={i} style={{ display: "flex", justifyContent: msg.role === "user" ? "flex-end" : "flex-start", marginBottom: 16, gap: 10 }}>
                        {msg.role === "assistant" && (
                            <div style={{
                                width: 32, height: 32, borderRadius: "50%", background: C.primary,
                                display: "flex", alignItems: "center", justifyContent: "center",
                                fontSize: 16, color: "#fff", flexShrink: 0, fontFamily: "Lora, serif"
                            }}>ψ</div>
                        )}
                        <div style={{
                            maxWidth: "72%", padding: "12px 16px",
                            borderRadius: msg.role === "user" ? "14px 14px 4px 14px" : "14px 14px 14px 4px",
                            background: msg.role === "user" ? C.primary : C.surface,
                            border: msg.role === "user" ? "none" : `1px solid ${C.border}`,
                            color: msg.role === "user" ? "#fff" : C.text,
                            fontSize: 14, lineHeight: 1.65, whiteSpace: "pre-wrap",
                        }}>{msg.content}</div>
                    </div>
                ))}
                {loading && (
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                        <div style={{
                            width: 32, height: 32, borderRadius: "50%", background: C.primary,
                            display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, color: "#fff", fontFamily: "Lora, serif"
                        }}>ψ</div>
                        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: "14px 14px 14px 4px", padding: "14px 18px", display: "flex", gap: 5, alignItems: "center" }}>
                            {[0, 1, 2].map(i => (
                                <div key={i} style={{
                                    width: 7, height: 7, borderRadius: "50%", background: C.muted,
                                    animation: `blink 1.2s ${i * 0.2}s ease-in-out infinite`
                                }} />
                            ))}
                        </div>
                    </div>
                )}
                <div ref={endRef} />
            </div>

            {messages.length <= 1 && !loading && (
                <div style={{ padding: "0 32px 14px", display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {suggestions.map((s, i) => (
                        <button key={i} onClick={() => setInput(s)}
                            style={{
                                padding: "6px 14px", background: C.surface, border: `1px solid ${C.border}`,
                                borderRadius: 20, fontSize: 12, cursor: "pointer", color: C.muted, fontFamily: "inherit"
                            }}>{s}</button>
                    ))}
                </div>
            )}

            <div style={{ padding: "14px 32px 24px", borderTop: `1px solid ${C.border}` }}>
                <div style={{ display: "flex", gap: 10, alignItems: "flex-end" }}>
                    <textarea value={input} onChange={e => setInput(e.target.value)}
                        onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
                        placeholder="Escreva uma mensagem... (Enter para enviar, Shift+Enter para nova linha)"
                        rows={2}
                        style={{
                            flex: 1, padding: "10px 14px", border: `1px solid ${C.border}`, borderRadius: 10,
                            fontSize: 14, fontFamily: "inherit", resize: "none", outline: "none", color: C.text,
                            lineHeight: 1.5, maxHeight: 120, overflowY: "auto"
                        }} />
                    <button onClick={send} disabled={!input.trim() || loading}
                        style={{
                            width: 44, height: 44, background: input.trim() && !loading ? C.primary : C.border,
                            border: "none", borderRadius: 10, cursor: input.trim() && !loading ? "pointer" : "default",
                            display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 20, flexShrink: 0
                        }}>→</button>
                </div>
            </div>
        </div>
    );
}

// ── Root App ──────────────────────────────────────────────────────────────────
export default function App() {
    const [loggedIn, setLoggedIn] = useState(false);
    const [view, setView] = useState("dashboard");
    const [selectedId, setSelectedId] = useState(null);
    const [patients, setPatients] = useState(INITIAL_PATIENTS);
    const [psychologist, setPsychologist] = useState(INITIAL_PSYCHOLOGIST);

    const patient = patients.find(p => p.id === selectedId);
    const updatePatient = updated => setPatients(prev => prev.map(p => p.id === updated.id ? updated : p));

    if (!loggedIn) return <LoginView onLogin={() => setLoggedIn(true)} />;

    return (
        <div style={{ display: "flex", minHeight: "100vh", background: C.bg, fontFamily: "'DM Sans', sans-serif" }}>
            <Sidebar view={view} onNav={v => setView(v)} onLogout={() => setLoggedIn(false)} psychologist={psychologist} />
            <main style={{ flex: 1, overflowY: "auto" }}>
                {view === "dashboard" && <DashboardView patients={patients} onNav={setView} onSelectPatient={setSelectedId} />}
                {view === "patients" && <PatientsView patients={patients} setPatients={setPatients} onNav={setView} onSelectPatient={setSelectedId} />}
                {view === "patient" && patient && <PatientDetailView patient={patient} onBack={() => setView("patients")} onUpdate={updatePatient} />}
                {view === "patient" && !patient && <div style={{ padding: 40, color: C.muted }}>Paciente não encontrado. <button onClick={() => setView("patients")} style={{ color: C.primary, background: "none", border: "none", cursor: "pointer", fontFamily: "inherit" }}>Voltar</button></div>}
                {view === "finances" && <FinancesView patients={patients} />}
                {view === "chat" && <ChatView patients={patients} />}
                {view === "settings" && <SettingsView psychologist={psychologist} onUpdate={setPsychologist} />}
            </main>
        </div>
    );
}
