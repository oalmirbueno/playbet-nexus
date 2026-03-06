import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, DollarSign, Wallet, TrendingUp, Clock } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { initialSocios, initialSaques } from "@/data/mockData";
import { toast } from "@/hooks/use-toast";
import Breadcrumbs from "@/components/Breadcrumbs";

const chartTooltip = { background: "hsl(0 0% 8%)", border: "1px solid hsl(0 0% 15%)", borderRadius: 8, color: "#fff", fontSize: 12 };

const historicoMock = [
  { data: "05/03/2026", ref: "FIN-001", receitaBase: 3240, status: "Confirmado", obs: "Bet365 + Betano" },
  { data: "04/03/2026", ref: "FIN-002", receitaBase: 2448, status: "Confirmado", obs: "Betano" },
  { data: "03/03/2026", ref: "FIN-003", receitaBase: 2218, status: "Pendente", obs: "Sportingbet" },
  { data: "02/03/2026", ref: "FIN-004", receitaBase: 3764, status: "Confirmado", obs: "Pixbet" },
  { data: "01/03/2026", ref: "FIN-005", receitaBase: 4464, status: "Pendente", obs: "Bet365" },
  { data: "28/02/2026", ref: "FIN-006", receitaBase: 1539, status: "Conciliado", obs: "KTO" },
  { data: "27/02/2026", ref: "FIN-007", receitaBase: 2804, status: "Conciliado", obs: "Bet365" },
];

const ganhosMensal = [
  { mes: "Jan", valor: 14000 },
  { mes: "Fev", valor: 19500 },
  { mes: "Mar", valor: 24000 },
];

export default function SocioDetalhe() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [tab, setTab] = useState<"resumo" | "ganhos" | "saques" | "historico" | "obs">("resumo");
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
  const mesAtual = ganhosMensal[ganhosMensal.length - 1]?.valor || 0;
  const saquesSocio = initialSaques.filter(s => s.nome === socio.nome);

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: "Sócios", path: "/socios" }, { label: socio.nome }]} />
      <button onClick={() => navigate("/socios")} className="btn-ghost"><ArrowLeft size={14} /> Voltar para Sócios</button>

      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="w-14 h-14 rounded-full bg-primary/20 flex items-center justify-center text-xl font-bold text-accent">{socio.nome.charAt(0)}</div>
        <div>
          <h1 className="page-header">{socio.nome}</h1>
          <p className="text-sm text-muted-foreground"><span className="badge-primary">{socio.part}%</span> participação societária · <span className="badge-success">{socio.status}</span></p>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="stat-card border-l-2 border-l-accent"><div className="flex items-center justify-between"><span className="text-[10px] text-muted-foreground uppercase">Ganhos Acumulados</span><TrendingUp size={14} className="text-muted-foreground" /></div><p className="text-xl font-bold">R$ {socio.ganhos.toLocaleString()}</p></div>
        <div className="stat-card border-l-2 border-l-success"><div className="flex items-center justify-between"><span className="text-[10px] text-muted-foreground uppercase">Saldo Disponível</span><Wallet size={14} className="text-muted-foreground" /></div><p className="text-xl font-bold text-success">R$ {socio.disponivel.toLocaleString()}</p></div>
        <div className="stat-card border-l-2 border-l-primary"><div className="flex items-center justify-between"><span className="text-[10px] text-muted-foreground uppercase">Total Sacado</span><DollarSign size={14} className="text-muted-foreground" /></div><p className="text-xl font-bold">R$ {sacado.toLocaleString()}</p></div>
        <div className="stat-card border-l-2 border-l-info"><div className="flex items-center justify-between"><span className="text-[10px] text-muted-foreground uppercase">Projeção Mensal</span><Clock size={14} className="text-muted-foreground" /></div><p className="text-xl font-bold">R$ {projecao.toLocaleString()}</p></div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-secondary/50 p-1 rounded-xl w-fit flex-wrap">
        {(["resumo", "ganhos", "saques", "historico", "obs"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} className={tab === t ? "tab-btn-active" : "tab-btn"}>
            {t === "resumo" ? "Resumo" : t === "ganhos" ? "Ganhos" : t === "saques" ? "Saques" : t === "historico" ? "Histórico" : "Observações"}
          </button>
        ))}
      </div>

      {tab === "resumo" && (
        <div className="animate-fade-in space-y-4">
          <div className="glass-card p-5">
            <h3 className="section-title">Visão Geral</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div><span className="text-[10px] text-muted-foreground uppercase">Participação</span><p className="font-bold text-lg">{socio.part}%</p></div>
              <div><span className="text-[10px] text-muted-foreground uppercase">Ganho Mensal Atual</span><p className="font-bold text-lg text-accent">R$ {mesAtual.toLocaleString()}</p></div>
              <div><span className="text-[10px] text-muted-foreground uppercase">Último Saque</span><p className="font-medium">{socio.ultimoSaque}</p></div>
              <div><span className="text-[10px] text-muted-foreground uppercase">Status</span><span className="badge-success">{socio.status}</span></div>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => navigate("/saques")} className="btn-ghost text-sm">Ver Saques</button>
            <button onClick={() => navigate("/comissoes")} className="btn-ghost text-sm">Ver Comissões</button>
            <button onClick={() => navigate("/financeiro")} className="btn-ghost text-sm">Ver Financeiro</button>
          </div>
        </div>
      )}

      {tab === "ganhos" && (
        <div className="animate-fade-in space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="stat-card"><span className="text-[10px] text-muted-foreground uppercase">Total Acumulado</span><p className="text-lg font-bold">R$ {socio.ganhos.toLocaleString()}</p></div>
            <div className="stat-card"><span className="text-[10px] text-muted-foreground uppercase">Total do Mês</span><p className="text-lg font-bold text-accent">R$ {mesAtual.toLocaleString()}</p></div>
            <div className="stat-card"><span className="text-[10px] text-muted-foreground uppercase">Total Disponível</span><p className="text-lg font-bold text-success">R$ {socio.disponivel.toLocaleString()}</p></div>
            <div className="stat-card"><span className="text-[10px] text-muted-foreground uppercase">Projeção</span><p className="text-lg font-bold text-info">R$ {projecao.toLocaleString()}</p></div>
          </div>
          <div className="glass-card p-5">
            <h3 className="section-title">Evolução de Ganhos</h3>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={ganhosMensal}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(0 0% 15%)" />
                <XAxis dataKey="mes" stroke="hsl(0 0% 40%)" fontSize={11} />
                <YAxis stroke="hsl(0 0% 40%)" fontSize={11} />
                <Tooltip contentStyle={chartTooltip} formatter={(v: number) => `R$ ${v.toLocaleString()}`} />
                <Bar dataKey="valor" fill="hsl(45 100% 50%)" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {tab === "saques" && (
        <div className="animate-fade-in space-y-4">
          {saquesSocio.length === 0 ? (
            <div className="glass-card p-12 text-center text-muted-foreground">
              <p className="font-medium">Nenhum saque registrado</p>
              <button onClick={() => navigate("/saques")} className="btn-primary mt-4">Solicitar Saque</button>
            </div>
          ) : (
            <div className="glass-card overflow-x-auto">
              <table className="data-table">
                <thead><tr><th>ID</th><th>Valor</th><th>Data</th><th>Conta</th><th>Status</th></tr></thead>
                <tbody>
                  {saquesSocio.map(s => (
                    <tr key={s.id}>
                      <td className="font-mono text-xs">{s.id}</td>
                      <td className="font-semibold">R$ {s.valor.toLocaleString()}</td>
                      <td className="text-xs">{s.data}</td>
                      <td className="font-mono text-xs">{s.conta}</td>
                      <td><span className={s.status === "Aprovado" ? "badge-success" : s.status === "Pendente" ? "badge-warning" : "badge-danger"}>{s.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <button onClick={() => navigate("/saques")} className="btn-ghost text-sm">Ir para Central de Saques</button>
        </div>
      )}

      {tab === "historico" && (
        <div className="animate-fade-in glass-card p-5">
          <h3 className="section-title">Histórico Financeiro</h3>
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead><tr><th>Data</th><th>Referência</th><th>Base Societária</th><th>Recebido ({socio.part}%)</th><th>Status</th><th>Obs</th></tr></thead>
              <tbody>{historicoMock.map((h, i) => (
                <tr key={i}>
                  <td className="text-xs">{h.data}</td>
                  <td className="font-mono text-xs text-muted-foreground">{h.ref}</td>
                  <td>R$ {h.receitaBase.toLocaleString()}</td>
                  <td className="text-success font-medium">R$ {Math.round(h.receitaBase * socio.part / 100).toLocaleString()}</td>
                  <td><span className={h.status === "Confirmado" ? "badge-success" : h.status === "Conciliado" ? "badge-primary" : "badge-warning"}>{h.status}</span></td>
                  <td className="text-xs text-muted-foreground">{h.obs}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        </div>
      )}

      {tab === "obs" && (
        <div className="animate-fade-in glass-card p-5 space-y-3">
          <h3 className="section-title">Observações</h3>
          <textarea className="input-field min-h-[120px]" placeholder="Observações sobre o sócio..." value={obs} onChange={e => setObs(e.target.value)} />
          <button className="btn-primary" onClick={() => toast({ title: "Observação salva" })}>Salvar</button>
        </div>
      )}
    </div>
  );
}
