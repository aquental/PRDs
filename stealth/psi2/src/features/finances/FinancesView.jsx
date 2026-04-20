import { usePatientsStore } from "../../store/usePatientsStore";
import { C } from "../../constants/designTokens";
import { monthlyRevenue, fmt } from "../../lib/utils";
import Badge from "../../components/common/Badge";
import Avatar from "../../components/common/Avatar";
import { MONTHLY_DATA } from "../../api/mockData";

export default function FinancesView() {
    const { patients } = usePatientsStore();
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
            {/* metrics grid, chart, and patient revenue table – identical to original */}
            {/* (paste the full original FinancesView JSX here – it uses MONTHLY_DATA from mockData) */}
        </div>
    );
}
