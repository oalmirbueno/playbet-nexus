import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight } from "lucide-react";

const socios = [
  { id: 1, nome: "Ricardo Almeida", part: 40, ganhos: 68340, disponivel: 16200, ultimoSaque: "01/03/2026", status: "Ativo" },
  { id: 2, nome: "Fernanda Rocha", part: 35, ganhos: 59797, disponivel: 14175, ultimoSaque: "28/02/2026", status: "Ativo" },
  { id: 3, nome: "Lucas Martins", part: 25, ganhos: 42712, disponivel: 10125, ultimoSaque: "25/02/2026", status: "Ativo" },
];

const historico = [
  { data: "05/03/2026", receitaBase: 5200, valorRecebido: 2080, status: "Confirmado", obs: "Referente Bet365" },
  { data: "04/03/2026", receitaBase: 4100, valorRecebido: 1640, status: "Confirmado", obs: "Referente Betano" },
  { data: "03/03/2026", receitaBase: 3800, valorRecebido: 1520, status: "Pendente", obs: "Referente Pixbet" },
  { data: "02/03/2026", receitaBase: 6300, valorRecebido: 2520, status: "Confirmado", obs: "Referente múltiplas" },
];

export default function Socios() {
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-header">Sócios</h1>
        <p className="page-subtitle">Gestão societária — participação, ganhos e distribuição</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {socios.map((s) => (
          <div key={s.id} className="glass-card-hover p-5 cursor-pointer" onClick={() => navigate(`/socios/${s.id}`)}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-sm font-bold text-accent">{s.nome.charAt(0)}</div>
              <div>
                <p className="font-semibold">{s.nome}</p>
                <span className="badge-primary">{s.part}% participação</span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><p className="text-[10px] text-muted-foreground uppercase">Ganhos Acumulados</p><p className="font-bold">R$ {s.ganhos.toLocaleString()}</p></div>
              <div><p className="text-[10px] text-muted-foreground uppercase">Saldo Disponível</p><p className="font-bold text-success">R$ {s.disponivel.toLocaleString()}</p></div>
              <div><p className="text-[10px] text-muted-foreground uppercase">Último Saque</p><p className="text-xs">{s.ultimoSaque}</p></div>
              <div><p className="text-[10px] text-muted-foreground uppercase">Status</p><span className="badge-success">{s.status}</span></div>
            </div>
          </div>
        ))}
      </div>

      <div className="glass-card p-5">
        <h3 className="section-title">Histórico de Distribuição</h3>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead><tr><th>Data</th><th>Receita Base</th><th>Valor Recebido (40%)</th><th>Status</th><th>Obs</th></tr></thead>
            <tbody>
              {historico.map((h, i) => (
                <tr key={i}>
                  <td className="text-xs text-muted-foreground">{h.data}</td>
                  <td>R$ {h.receitaBase.toLocaleString()}</td>
                  <td className="font-medium text-success">R$ {h.valorRecebido.toLocaleString()}</td>
                  <td><span className={h.status === "Confirmado" ? "badge-success" : "badge-warning"}>{h.status}</span></td>
                  <td className="text-xs text-muted-foreground">{h.obs}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
