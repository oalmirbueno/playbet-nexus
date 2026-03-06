// Prepared for Supabase migration
import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { initialSocios } from "@/data/mockData";
import { toast } from "@/hooks/use-toast";

const historicoMock = [
  { data: "05/03/2026", receitaBase: 5200, recebido: 2080, status: "Confirmado", obs: "Bet365 + Betano" },
  { data: "04/03/2026", receitaBase: 4100, recebido: 1640, status: "Confirmado", obs: "Betano" },
  { data: "03/03/2026", receitaBase: 3800, recebido: 1520, status: "Pendente", obs: "Pixbet" },
  { data: "02/03/2026", receitaBase: 6200, recebido: 2480, status: "Confirmado", obs: "Bet365" },
  { data: "01/03/2026", receitaBase: 3500, recebido: 1400, status: "Confirmado", obs: "Sportingbet" },
];

export default function SocioDetalhe() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [obs, setObs] = useState("");

  const socio = initialSocios.find(s => s.id === Number(id));

  if (!socio) {
    return (
      <div className="space-y-6">
        <button onClick={() => navigate("/socios")} className="btn-ghost"><ArrowLeft size={14} /> Voltar</button>
        <div className="glass-card p-12 text-center text-muted-foreground">
          <p className="text-lg font-medium">Sócio não encontrado</p>
        </div>
      </div>
    );
  }

  const sacado = socio.ganhos - socio.disponivel;
  const projecao = Math.round(socio.ganhos / 3);

  return (
    <div className="space-y-6">
      <button onClick={() => navigate("/socios")} className="btn-ghost"><ArrowLeft size={14} /> Voltar</button>
      <div className="flex items-center gap-4">
        <div className="w-14 h-14 rounded-full bg-primary/20 flex items-center justify-center text-xl font-bold text-accent">{socio.nome.charAt(0)}</div>
        <div>
          <h1 className="page-header">{socio.nome}</h1>
          <p className="text-sm text-muted-foreground"><span className="badge-primary">{socio.part}%</span> participação societária · <span className="badge-success">{socio.status}</span></p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <div className="stat-card border-l-2 border-l-accent"><span className="text-[10px] text-muted-foreground uppercase">Ganhos Acumulados</span><p className="text-xl font-bold">R$ {socio.ganhos.toLocaleString()}</p></div>
        <div className="stat-card border-l-2 border-l-success"><span className="text-[10px] text-muted-foreground uppercase">Saldo Disponível</span><p className="text-xl font-bold text-success">R$ {socio.disponivel.toLocaleString()}</p></div>
        <div className="stat-card border-l-2 border-l-primary"><span className="text-[10px] text-muted-foreground uppercase">Total Sacado</span><p className="text-xl font-bold">R$ {sacado.toLocaleString()}</p></div>
        <div className="stat-card border-l-2 border-l-info"><span className="text-[10px] text-muted-foreground uppercase">Projeção Mensal</span><p className="text-xl font-bold">R$ {projecao.toLocaleString()}</p></div>
      </div>

      <div className="glass-card p-5">
        <h3 className="section-title">Histórico Financeiro</h3>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead><tr><th>Data</th><th>Receita Base</th><th>Recebido ({socio.part}%)</th><th>Status</th><th>Obs</th></tr></thead>
            <tbody>{historicoMock.map((h, i) => (
              <tr key={i}>
                <td className="text-xs">{h.data}</td>
                <td>R$ {h.receitaBase.toLocaleString()}</td>
                <td className="text-success font-medium">R$ {Math.round(h.receitaBase * socio.part / 100).toLocaleString()}</td>
                <td><span className={h.status === "Confirmado" ? "badge-success" : "badge-warning"}>{h.status}</span></td>
                <td className="text-xs text-muted-foreground">{h.obs}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      </div>

      <div className="glass-card p-5 space-y-3">
        <h3 className="section-title">Observações</h3>
        <textarea className="input-field min-h-[100px]" placeholder="Observações sobre o sócio..." value={obs} onChange={e => setObs(e.target.value)} />
        <button className="btn-primary" onClick={() => toast({ title: "Observação salva" })}>Salvar</button>
      </div>
    </div>
  );
}
