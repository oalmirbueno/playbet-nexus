import { CreditCard, CheckCircle, Clock, AlertCircle, XCircle } from "lucide-react";

const stats = [
  { label: "Saldo no Asaas", value: "R$ 38.200", icon: CreditCard, variant: "border-l-accent" },
  { label: "Pagamentos Realizados", value: "R$ 98.200", icon: CheckCircle, variant: "border-l-success" },
  { label: "Pagamentos Agendados", value: "R$ 23.400", icon: Clock, variant: "border-l-info" },
  { label: "Pagamentos Falhados", value: "R$ 1.200", icon: XCircle, variant: "border-l-destructive" },
];

const pagamentos = [
  { dest: "Rafael Mendes", tipo: "Influencer", valor: "R$ 6.200", data: "03/03/2026", status: "Realizado", metodo: "PIX" },
  { dest: "Ricardo Almeida", tipo: "Sócio", valor: "R$ 15.000", data: "01/03/2026", status: "Realizado", metodo: "TED" },
  { dest: "Ana Souza", tipo: "Influencer", valor: "R$ 1.800", data: "28/02/2026", status: "Realizado", metodo: "PIX" },
  { dest: "Carlos Silva", tipo: "Influencer", valor: "R$ 3.500", data: "25/02/2026", status: "Agendado", metodo: "PIX" },
  { dest: "Fernanda Rocha", tipo: "Sócio", valor: "R$ 10.500", data: "20/02/2026", status: "Falhado", metodo: "TED" },
];

export default function AsaasPagamentos() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-header">Asaas / Pagamentos</h1>
        <p className="page-subtitle">Integração financeira — pagamentos, saldos e histórico</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {stats.map((s) => (
          <div key={s.label} className={`stat-card border-l-2 ${s.variant}`}>
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide">{s.label}</span>
              <s.icon size={15} className="text-muted-foreground" />
            </div>
            <div className="text-xl font-bold">{s.value}</div>
          </div>
        ))}
      </div>

      <div className="glass-card p-5 border border-dashed border-primary/30">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center"><CreditCard size={18} className="text-primary" /></div>
          <div>
            <p className="font-medium text-sm">Integração com API Asaas</p>
            <p className="text-xs text-muted-foreground">Espaço reservado para conexão com a API de pagamentos Asaas — configuração futura</p>
          </div>
        </div>
      </div>

      <div className="glass-card overflow-x-auto">
        <table className="data-table">
          <thead><tr><th>Destinatário</th><th>Tipo</th><th>Valor</th><th>Data</th><th>Status</th><th>Método</th></tr></thead>
          <tbody>
            {pagamentos.map((p, i) => (
              <tr key={i}>
                <td className="font-medium">{p.dest}</td>
                <td><span className={p.tipo === "Influencer" ? "badge-info" : "badge-primary"}>{p.tipo}</span></td>
                <td className="font-semibold">{p.valor}</td>
                <td className="text-xs text-muted-foreground">{p.data}</td>
                <td><span className={p.status === "Realizado" ? "badge-success" : p.status === "Agendado" ? "badge-warning" : "badge-danger"}>{p.status}</span></td>
                <td>{p.metodo}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
