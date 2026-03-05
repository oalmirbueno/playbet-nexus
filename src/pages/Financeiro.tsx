import { DollarSign, Clock, CheckCircle, AlertCircle } from "lucide-react";

const resumo = [
  { label: "Receita Total", value: "R$ 127.500", icon: DollarSign },
  { label: "Valor Disponível", value: "R$ 45.200", icon: CheckCircle },
  { label: "Valor Pendente", value: "R$ 18.300", icon: Clock },
  { label: "Saques Realizados", value: "R$ 64.000", icon: AlertCircle },
];

const transacoes = [
  { data: "05/03/2026", plataforma: "Bet365", receita: "R$ 4.500", comissao: "R$ 1.350", status: "Pago" },
  { data: "04/03/2026", plataforma: "Betano", receita: "R$ 3.200", comissao: "R$ 960", status: "Pago" },
  { data: "03/03/2026", plataforma: "Sportingbet", receita: "R$ 2.800", comissao: "R$ 840", status: "Pendente" },
  { data: "02/03/2026", plataforma: "Pixbet", receita: "R$ 1.900", comissao: "R$ 570", status: "Pago" },
  { data: "01/03/2026", plataforma: "Bet365", receita: "R$ 5.100", comissao: "R$ 1.530", status: "Pendente" },
  { data: "28/02/2026", plataforma: "Betano", receita: "R$ 2.400", comissao: "R$ 720", status: "Pago" },
];

export default function Financeiro() {
  return (
    <div>
      <h1 className="page-header">Financeiro</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {resumo.map((r) => (
          <div key={r.label} className="stat-card">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground text-sm">{r.label}</span>
              <r.icon size={18} className="text-accent" />
            </div>
            <div className="text-2xl font-bold">{r.value}</div>
          </div>
        ))}
      </div>

      <div className="glass-card overflow-hidden">
        <table className="data-table">
          <thead>
            <tr>
              <th>Data</th>
              <th>Plataforma</th>
              <th>Receita</th>
              <th>Comissão</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {transacoes.map((t, i) => (
              <tr key={i}>
                <td>{t.data}</td>
                <td>{t.plataforma}</td>
                <td>{t.receita}</td>
                <td>{t.comissao}</td>
                <td><span className={t.status === "Pago" ? "status-active" : "status-pending"}>{t.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
