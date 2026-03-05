import { useState } from "react";
import { Check, X, Filter, Download, Eye } from "lucide-react";

const saques = [
  { id: "SAQ-001", nome: "Rafael Mendes", tipo: "Influencer", valor: 8500, origem: "Comissão afiliado", data: "05/03/2026", conta: "PIX •••4521", status: "Pendente", resp: "—" },
  { id: "SAQ-002", nome: "Ricardo Almeida", tipo: "Sócio", valor: 12000, origem: "Divisão societária", data: "04/03/2026", conta: "PIX •••8832", status: "Pendente", resp: "—" },
  { id: "SAQ-003", nome: "Ana Souza", tipo: "Influencer", valor: 2800, origem: "Comissão afiliado", data: "03/03/2026", conta: "PIX •••1199", status: "Aprovado", resp: "Admin" },
  { id: "SAQ-004", nome: "Fernanda Rocha", tipo: "Sócio", valor: 10500, origem: "Divisão societária", data: "02/03/2026", conta: "PIX •••7744", status: "Aprovado", resp: "Admin" },
  { id: "SAQ-005", nome: "Pedro Lima", tipo: "Influencer", valor: 6100, origem: "Comissão afiliado", data: "01/03/2026", conta: "PIX •••2266", status: "Recusado", resp: "Admin" },
  { id: "SAQ-006", nome: "Carlos Silva", tipo: "Influencer", valor: 3500, origem: "Comissão afiliado", data: "28/02/2026", conta: "PIX •••3388", status: "Aprovado", resp: "Admin" },
];

const [pendentes, aprovados, recusados] = [
  saques.filter((s) => s.status === "Pendente"),
  saques.filter((s) => s.status === "Aprovado"),
  saques.filter((s) => s.status === "Recusado"),
];

const stats = [
  { label: "Pendentes", value: pendentes.length, total: `R$ ${pendentes.reduce((a, b) => a + b.valor, 0).toLocaleString()}`, variant: "warning" },
  { label: "Aprovados", value: aprovados.length, total: `R$ ${aprovados.reduce((a, b) => a + b.valor, 0).toLocaleString()}`, variant: "success" },
  { label: "Recusados", value: recusados.length, total: `R$ ${recusados.reduce((a, b) => a + b.valor, 0).toLocaleString()}`, variant: "danger" },
];

const variants: Record<string, string> = { warning: "border-l-warning", success: "border-l-success", danger: "border-l-destructive" };

export default function Saques() {
  const [tab, setTab] = useState<"todos" | "pendentes" | "aprovados" | "recusados">("todos");
  const filtered = tab === "todos" ? saques : tab === "pendentes" ? pendentes : tab === "aprovados" ? aprovados : recusados;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="page-header">Central de Saques</h1>
          <p className="page-subtitle">Gerencie solicitações de saque de influencers e sócios</p>
        </div>
        <button className="btn-secondary"><Download size={14} /> Exportar</button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {stats.map((s) => (
          <div key={s.label} className={`stat-card border-l-2 ${variants[s.variant]}`}>
            <span className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide">{s.label}</span>
            <div className="text-xl font-bold">{s.value} solicitações</div>
            <span className="text-sm text-muted-foreground">{s.total}</span>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-3 items-center">
        <div className="flex gap-1 bg-secondary/50 p-1 rounded-xl">
          {(["todos", "pendentes", "aprovados", "recusados"] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)} className={tab === t ? "tab-btn-active" : "tab-btn"}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>
        <select className="select-field"><option>Tipo: Todos</option><option>Influencer</option><option>Sócio</option></select>
        <select className="select-field"><option>Período: Todos</option></select>
      </div>

      <div className="glass-card overflow-x-auto animate-fade-in">
        <table className="data-table">
          <thead>
            <tr><th>ID</th><th>Nome</th><th>Tipo</th><th>Valor</th><th>Origem</th><th>Data</th><th>Conta</th><th>Status</th><th>Resp.</th><th>Ações</th></tr>
          </thead>
          <tbody>
            {filtered.map((s) => (
              <tr key={s.id}>
                <td className="font-mono text-xs text-muted-foreground">{s.id}</td>
                <td className="font-medium">{s.nome}</td>
                <td><span className={s.tipo === "Influencer" ? "badge-info" : "badge-primary"}>{s.tipo}</span></td>
                <td className="font-semibold">R$ {s.valor.toLocaleString()}</td>
                <td className="text-xs text-muted-foreground">{s.origem}</td>
                <td className="whitespace-nowrap text-xs">{s.data}</td>
                <td className="font-mono text-xs">{s.conta}</td>
                <td><span className={s.status === "Aprovado" ? "badge-success" : s.status === "Pendente" ? "badge-warning" : "badge-danger"}>{s.status}</span></td>
                <td className="text-xs">{s.resp}</td>
                <td>
                  <div className="flex gap-1.5">
                    <button className="p-1.5 rounded-lg hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground"><Eye size={13} /></button>
                    {s.status === "Pendente" && (
                      <>
                        <button className="p-1.5 rounded-lg bg-success/15 text-success hover:bg-success/25 transition-colors"><Check size={13} /></button>
                        <button className="p-1.5 rounded-lg bg-destructive/15 text-destructive hover:bg-destructive/25 transition-colors"><X size={13} /></button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
