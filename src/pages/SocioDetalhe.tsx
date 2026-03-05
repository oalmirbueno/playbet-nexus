import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

const socio = { nome: "Ricardo Almeida", part: 40, ganhos: 68340, disponivel: 16200, sacado: 52140 };

const historico = [
  { data: "05/03/2026", receitaBase: 5200, recebido: 2080, status: "Confirmado", obs: "Bet365 + Betano" },
  { data: "04/03/2026", receitaBase: 4100, recebido: 1640, status: "Confirmado", obs: "Betano" },
  { data: "03/03/2026", receitaBase: 3800, recebido: 1520, status: "Pendente", obs: "Pixbet" },
];

export default function SocioDetalhe() {
  const navigate = useNavigate();
  return (
    <div className="space-y-6">
      <button onClick={() => navigate("/socios")} className="btn-ghost"><ArrowLeft size={14} /> Voltar</button>
      <div className="flex items-center gap-4">
        <div className="w-14 h-14 rounded-full bg-primary/20 flex items-center justify-center text-xl font-bold text-accent">R</div>
        <div><h1 className="page-header">{socio.nome}</h1><p className="text-sm text-muted-foreground"><span className="badge-primary">{socio.part}%</span> participação societária</p></div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <div className="stat-card border-l-2 border-l-accent"><span className="text-[10px] text-muted-foreground uppercase">Ganhos Acumulados</span><p className="text-xl font-bold">R$ {socio.ganhos.toLocaleString()}</p></div>
        <div className="stat-card border-l-2 border-l-success"><span className="text-[10px] text-muted-foreground uppercase">Saldo Disponível</span><p className="text-xl font-bold text-success">R$ {socio.disponivel.toLocaleString()}</p></div>
        <div className="stat-card border-l-2 border-l-primary"><span className="text-[10px] text-muted-foreground uppercase">Total Sacado</span><p className="text-xl font-bold">R$ {socio.sacado.toLocaleString()}</p></div>
        <div className="stat-card border-l-2 border-l-info"><span className="text-[10px] text-muted-foreground uppercase">Projeção Mensal</span><p className="text-xl font-bold">R$ 22.800</p></div>
      </div>
      <div className="glass-card p-5">
        <h3 className="section-title">Histórico Financeiro</h3>
        <table className="data-table"><thead><tr><th>Data</th><th>Base</th><th>Recebido</th><th>Status</th><th>Obs</th></tr></thead>
          <tbody>{historico.map((h, i) => (<tr key={i}><td className="text-xs">{h.data}</td><td>R$ {h.receitaBase.toLocaleString()}</td><td className="text-success font-medium">R$ {h.recebido.toLocaleString()}</td><td><span className={h.status === "Confirmado" ? "badge-success" : "badge-warning"}>{h.status}</span></td><td className="text-xs text-muted-foreground">{h.obs}</td></tr>))}</tbody>
        </table>
      </div>
      <div className="glass-card p-5"><h3 className="section-title">Observações</h3><textarea className="input-field min-h-[100px]" placeholder="Observações sobre o sócio..." /></div>
    </div>
  );
}
