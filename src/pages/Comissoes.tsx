import { DollarSign, ArrowRight } from "lucide-react";

const influencers = [
  { nome: "Rafael Mendes", perc: 20, bruto: 42100, devido: 8420, pago: 6200, pendente: 2220 },
  { nome: "Pedro Lima", perc: 18, bruto: 35700, devido: 6426, pago: 4800, pendente: 1626 },
  { nome: "Carlos Silva", perc: 15, bruto: 28500, devido: 4275, pago: 3500, pendente: 775 },
  { nome: "Ana Souza", perc: 12, bruto: 18200, devido: 2184, pago: 1800, pendente: 384 },
  { nome: "Julia Costa", perc: 10, bruto: 8400, devido: 840, pago: 700, pendente: 140 },
];

const socios = [
  { nome: "Ricardo Almeida", part: "40%", acumulado: 68340, disponivel: 16200, sacado: 52140, saldo: 16200 },
  { nome: "Fernanda Rocha", part: "35%", acumulado: 59797, disponivel: 14175, sacado: 45622, saldo: 14175 },
  { nome: "Lucas Martins", part: "25%", acumulado: 42712, disponivel: 10125, sacado: 32587, saldo: 10125 },
];

export default function Comissoes() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-header">Comissões</h1>
        <p className="page-subtitle">Regras de cálculo e distribuição de comissões entre influencers e sócios</p>
      </div>

      <div className="glass-card p-6">
        <h3 className="section-title">Regra de Cálculo</h3>
        <div className="flex flex-wrap items-center gap-3">
          {[
            { label: "Receita Bruta", value: "R$ 284.750", color: "text-accent" },
            { label: "- % Influencer", value: "R$ 85.425", color: "text-success" },
            { label: "- 10% Operacional", value: "R$ 28.475", color: "text-info" },
            { label: "= Base Societária", value: "R$ 170.850", color: "text-primary" },
          ].map((item, i) => (
            <div key={i} className="flex items-center gap-3">
              {i > 0 && <ArrowRight size={14} className="text-muted-foreground" />}
              <div className="glass-card-elevated px-4 py-3 rounded-lg text-center min-w-[140px]">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{item.label}</p>
                <p className={`font-bold text-lg ${item.color}`}>{item.value}</p>
              </div>
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground mt-4">A base societária é dividida igualmente entre os sócios conforme participação definida.</p>
      </div>

      <div className="glass-card p-5">
        <h3 className="section-title">Comissões por Influencer</h3>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead><tr><th>Nome</th><th>%</th><th>Bruto Gerado</th><th>Valor Devido</th><th>Já Pago</th><th>Saldo Pendente</th></tr></thead>
            <tbody>
              {influencers.map((inf, i) => (
                <tr key={i}>
                  <td className="font-medium">{inf.nome}</td>
                  <td><span className="badge-accent">{inf.perc}%</span></td>
                  <td>R$ {inf.bruto.toLocaleString()}</td>
                  <td className="text-success">R$ {inf.devido.toLocaleString()}</td>
                  <td>R$ {inf.pago.toLocaleString()}</td>
                  <td className="font-semibold text-warning">R$ {inf.pendente.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="glass-card p-5">
        <h3 className="section-title">Distribuição Societária</h3>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead><tr><th>Nome</th><th>Participação</th><th>Acumulado</th><th>Disponível</th><th>Sacado</th><th>Saldo Atual</th></tr></thead>
            <tbody>
              {socios.map((s, i) => (
                <tr key={i}>
                  <td className="font-medium">{s.nome}</td>
                  <td><span className="badge-primary">{s.part}</span></td>
                  <td>R$ {s.acumulado.toLocaleString()}</td>
                  <td className="text-success">R$ {s.disponivel.toLocaleString()}</td>
                  <td>R$ {s.sacado.toLocaleString()}</td>
                  <td className="font-semibold">R$ {s.saldo.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
