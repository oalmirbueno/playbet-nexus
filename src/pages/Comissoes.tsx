import { useState } from "react";
import { DollarSign, ArrowRight, Eye, TrendingUp } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import Breadcrumbs from "@/components/Breadcrumbs";
import ExportDropdown from "@/components/ExportDropdown";

const chartTooltip = { background: "hsl(0 0% 8%)", border: "1px solid hsl(0 0% 15%)", borderRadius: 8, color: "#fff", fontSize: 12 };

interface ComissaoInfluencer {
  id: number;
  nome: string;
  perc: number;
  bruto: number;
  devido: number;
  pago: number;
  pendente: number;
  disponivel: number;
  ultimoPgto: string;
  status: "Em dia" | "Pendente" | "Atrasado";
  historico: { mes: string; bruto: number; comissao: number; pago: number }[];
  origemPlat: { plat: string; valor: number }[];
}

const influencers: ComissaoInfluencer[] = [
  { id: 1, nome: "Rafael Mendes", perc: 20, bruto: 42100, devido: 8420, pago: 6200, pendente: 2220, disponivel: 2220, ultimoPgto: "01/03/2026", status: "Pendente",
    historico: [{ mes: "Jan", bruto: 12000, comissao: 2400, pago: 2400 }, { mes: "Fev", bruto: 18000, comissao: 3600, pago: 3800 }, { mes: "Mar", bruto: 12100, comissao: 2420, pago: 0 }],
    origemPlat: [{ plat: "Bet365", valor: 5200 }, { plat: "Betano", valor: 2100 }, { plat: "Sportingbet", valor: 1120 }] },
  { id: 2, nome: "Pedro Lima", perc: 18, bruto: 35700, devido: 6426, pago: 4800, pendente: 1626, disponivel: 1626, ultimoPgto: "28/02/2026", status: "Em dia",
    historico: [{ mes: "Jan", bruto: 10000, comissao: 1800, pago: 1800 }, { mes: "Fev", bruto: 14000, comissao: 2520, pago: 3000 }, { mes: "Mar", bruto: 11700, comissao: 2106, pago: 0 }],
    origemPlat: [{ plat: "Pixbet", valor: 3200 }, { plat: "Bet365", valor: 2100 }, { plat: "KTO", valor: 1126 }] },
  { id: 3, nome: "Carlos Silva", perc: 15, bruto: 28500, devido: 4275, pago: 3500, pendente: 775, disponivel: 775, ultimoPgto: "25/02/2026", status: "Em dia",
    historico: [{ mes: "Jan", bruto: 8500, comissao: 1275, pago: 1275 }, { mes: "Fev", bruto: 11000, comissao: 1650, pago: 2225 }, { mes: "Mar", bruto: 9000, comissao: 1350, pago: 0 }],
    origemPlat: [{ plat: "Betano", valor: 2100 }, { plat: "Sportingbet", valor: 1200 }, { plat: "Bet365", valor: 975 }] },
  { id: 4, nome: "Ana Souza", perc: 12, bruto: 18200, devido: 2184, pago: 1800, pendente: 384, disponivel: 384, ultimoPgto: "20/02/2026", status: "Em dia",
    historico: [{ mes: "Jan", bruto: 5000, comissao: 600, pago: 600 }, { mes: "Fev", bruto: 7200, comissao: 864, pago: 1200 }, { mes: "Mar", bruto: 6000, comissao: 720, pago: 0 }],
    origemPlat: [{ plat: "Bet365", valor: 1400 }, { plat: "Betano", valor: 784 }] },
  { id: 5, nome: "Julia Costa", perc: 10, bruto: 8400, devido: 840, pago: 700, pendente: 140, disponivel: 140, ultimoPgto: "15/02/2026", status: "Atrasado",
    historico: [{ mes: "Jan", bruto: 2400, comissao: 240, pago: 240 }, { mes: "Fev", bruto: 3500, comissao: 350, pago: 460 }, { mes: "Mar", bruto: 2500, comissao: 250, pago: 0 }],
    origemPlat: [{ plat: "Pixbet", valor: 500 }, { plat: "KTO", valor: 340 }] },
];

const totalBruto = 284750;
const totalInf = influencers.reduce((a, b) => a + b.devido, 0);
const totalOp = Math.round((totalBruto - totalInf) * 0.1);
const totalBase = totalBruto - totalInf - totalOp;

const distPie = [
  { name: "Influencers", value: totalInf, color: "hsl(152 69% 41%)" },
  { name: "Operacional", value: totalOp, color: "hsl(217 85% 55%)" },
  { name: "Sócios", value: totalBase, color: "hsl(45 100% 50%)" },
];

const distBar = [
  { label: "Retido Operacional", valor: totalOp },
  { label: "Base Societária", valor: totalBase },
  { label: "Distribuído Sócios", valor: Math.round(totalBase * 0.85) },
  { label: "Pendente Distribuição", valor: Math.round(totalBase * 0.15) },
];

export default function Comissoes() {
  const navigate = useNavigate();
  const [detailOpen, setDetailOpen] = useState<ComissaoInfluencer | null>(null);
  const [detailTab, setDetailTab] = useState<"historico" | "plataformas">("historico");

  const exportData = influencers.map(({ historico, origemPlat, ...rest }) => rest);

  return (
    <div className="space-y-8">
      <Breadcrumbs items={[{ label: "Gestão de Receita", path: "/financeiro" }, { label: "Comissões" }]} />
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Comissões</h1>
          <p className="text-sm text-muted-foreground mt-1">Regras de cálculo e distribuição de comissões entre influencers e sócios</p>
        </div>
        <ExportDropdown data={exportData} filename="comissoes-playbet" />
      </div>

      {/* Formula */}
      <div className="glass-card p-6">
        <h3 className="section-title">Fórmula de Comissão</h3>
        <div className="bg-secondary/30 rounded-lg p-4 font-mono text-sm space-y-1 mb-4">
          <p><span className="text-accent">Receita Bruta</span></p>
          <p>  <span className="text-muted-foreground">−</span> <span className="text-success">Comissão do Influencer (%)</span></p>
          <p>  <span className="text-muted-foreground">−</span> <span className="text-info">10% Retenção Operacional</span></p>
          <p>  <span className="text-muted-foreground">=</span> <span className="text-primary">Base Societária</span></p>
          <p>  <span className="text-muted-foreground">÷</span> <span className="text-accent">3 sócios</span> (divisão igualitária)</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {[
            { label: "Receita Bruta", value: `R$ ${totalBruto.toLocaleString()}`, color: "text-accent" },
            { label: "– % Influencer", value: `R$ ${totalInf.toLocaleString()}`, color: "text-success" },
            { label: "– 10% Operacional", value: `R$ ${totalOp.toLocaleString()}`, color: "text-info" },
            { label: "= Base Societária", value: `R$ ${totalBase.toLocaleString()}`, color: "text-primary" },
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
      </div>

      {/* Influencer Commissions */}
      <div className="glass-card p-5">
        <h3 className="section-title">Comissões por Influencer</h3>
        <div className="overflow-x-auto invisible-scroll">
          <table className="data-table">
            <thead><tr><th>Nome</th><th>%</th><th>Bruto Gerado</th><th>Valor Devido</th><th>Já Pago</th><th>Saldo Pendente</th><th>Disponível p/ Saque</th><th>Último Pgto</th><th>Status</th><th>Ações</th></tr></thead>
            <tbody>
              {influencers.map((inf) => (
                <tr key={inf.id} className="group">
                  <td className="font-medium cursor-pointer hover:text-accent transition-colors" onClick={() => navigate(`/influencers/${inf.id}`)}>{inf.nome}</td>
                  <td><span className="badge-accent">{inf.perc}%</span></td>
                  <td>R$ {inf.bruto.toLocaleString()}</td>
                  <td className="text-success">R$ {inf.devido.toLocaleString()}</td>
                  <td>R$ {inf.pago.toLocaleString()}</td>
                  <td className="font-semibold text-warning">R$ {inf.pendente.toLocaleString()}</td>
                  <td className="text-success font-medium">R$ {inf.disponivel.toLocaleString()}</td>
                  <td className="text-xs text-muted-foreground">{inf.ultimoPgto}</td>
                  <td><span className={inf.status === "Em dia" ? "badge-success" : inf.status === "Pendente" ? "badge-warning" : "badge-danger"}>{inf.status}</span></td>
                  <td>
                    <div className="flex gap-1">
                      <button onClick={() => { setDetailOpen(inf); setDetailTab("historico"); }} className="p-1.5 rounded-lg hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground"><Eye size={13} /></button>
                      <button onClick={() => navigate("/saques")} className="btn-ghost text-xs py-1 px-2">Saques</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Distribution */}
      <div className="glass-card p-5">
        <h3 className="section-title">Distribuição Operacional e Societária</h3>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 mb-6">
          <div className="stat-card border-l-2 border-l-info"><span className="text-[10px] text-muted-foreground uppercase">Retido Operacional</span><p className="text-xl font-bold text-info">R$ {totalOp.toLocaleString()}</p></div>
          <div className="stat-card border-l-2 border-l-primary"><span className="text-[10px] text-muted-foreground uppercase">Base Societária</span><p className="text-xl font-bold text-primary">R$ {totalBase.toLocaleString()}</p></div>
          <div className="stat-card border-l-2 border-l-success"><span className="text-[10px] text-muted-foreground uppercase">Distribuído</span><p className="text-xl font-bold text-success">R$ {Math.round(totalBase * 0.85).toLocaleString()}</p></div>
          <div className="stat-card border-l-2 border-l-warning"><span className="text-[10px] text-muted-foreground uppercase">Pendente Distrib.</span><p className="text-xl font-bold text-warning">R$ {Math.round(totalBase * 0.15).toLocaleString()}</p></div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div>
            <h4 className="text-xs font-medium text-muted-foreground uppercase mb-3">Divisão da Receita</h4>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={distPie} dataKey="value" cx="50%" cy="50%" outerRadius={75} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                  {distPie.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip contentStyle={chartTooltip} formatter={(v: number) => `R$ ${v.toLocaleString()}`} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div>
            <h4 className="text-xs font-medium text-muted-foreground uppercase mb-3">Distribuição Detalhada</h4>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={distBar} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(0 0% 15%)" />
                <XAxis type="number" stroke="hsl(0 0% 40%)" fontSize={10} tickFormatter={(v: number) => `R$ ${(v / 1000).toFixed(0)}k`} />
                <YAxis type="category" dataKey="label" stroke="hsl(0 0% 40%)" fontSize={10} width={120} />
                <Tooltip contentStyle={chartTooltip} formatter={(v: number) => `R$ ${v.toLocaleString()}`} />
                <Bar dataKey="valor" fill="hsl(45 100% 50%)" radius={[0, 3, 3, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Sociedade */}
      <div className="glass-card p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="section-title mb-0">Distribuição Societária</h3>
          <button onClick={() => navigate("/socios")} className="btn-ghost text-xs">Ver todos os sócios <ArrowRight size={12} /></button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {[
            { nome: "Ricardo Almeida", part: "33.3%", valor: Math.floor(totalBase / 3) },
            { nome: "Fernanda Rocha", part: "33.3%", valor: Math.floor(totalBase / 3) },
            { nome: "Lucas Martins", part: "33.3%", valor: totalBase - Math.floor(totalBase / 3) * 2 },
          ].map((s, i) => (
            <div key={i} onClick={() => navigate(`/socios/${i + 1}`)} className="glass-card-elevated p-4 rounded-lg cursor-pointer hover:border-primary/30 transition-colors">
              <p className="font-semibold">{s.nome}</p>
              <p className="text-xs text-muted-foreground">{s.part} participação</p>
              <p className="text-lg font-bold text-accent mt-2">R$ {s.valor.toLocaleString()}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Influencer Detail Modal */}
      <Dialog open={!!detailOpen} onOpenChange={() => setDetailOpen(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Comissões — {detailOpen?.nome}</DialogTitle></DialogHeader>
          {detailOpen && (
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-4 gap-3">
                <div className="p-2 bg-secondary/50 rounded text-center"><span className="text-[10px] text-muted-foreground">%</span><p className="font-bold text-lg">{detailOpen.perc}%</p></div>
                <div className="p-2 bg-secondary/50 rounded text-center"><span className="text-[10px] text-muted-foreground">Devido</span><p className="font-bold text-success">R$ {detailOpen.devido.toLocaleString()}</p></div>
                <div className="p-2 bg-secondary/50 rounded text-center"><span className="text-[10px] text-muted-foreground">Pago</span><p className="font-bold">R$ {detailOpen.pago.toLocaleString()}</p></div>
                <div className="p-2 bg-secondary/50 rounded text-center"><span className="text-[10px] text-muted-foreground">Pendente</span><p className="font-bold text-warning">R$ {detailOpen.pendente.toLocaleString()}</p></div>
              </div>
              <div className="flex gap-1 bg-secondary/50 p-1 rounded-xl w-fit">
                <button onClick={() => setDetailTab("historico")} className={detailTab === "historico" ? "tab-btn-active" : "tab-btn"}>Histórico</button>
                <button onClick={() => setDetailTab("plataformas")} className={detailTab === "plataformas" ? "tab-btn-active" : "tab-btn"}>Por Plataforma</button>
              </div>
              {detailTab === "historico" && (
                <table className="data-table">
                  <thead><tr><th>Mês</th><th>Bruto</th><th>Comissão</th><th>Pago</th><th>Saldo</th></tr></thead>
                  <tbody>
                    {detailOpen.historico.map((h, i) => (
                      <tr key={i}>
                        <td>{h.mes}</td>
                        <td>R$ {h.bruto.toLocaleString()}</td>
                        <td className="text-success">R$ {h.comissao.toLocaleString()}</td>
                        <td>R$ {h.pago.toLocaleString()}</td>
                        <td className={h.comissao - h.pago > 0 ? "text-warning font-medium" : "text-success"}>R$ {(h.comissao - h.pago).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              {detailTab === "plataformas" && (
                <div className="space-y-3">
                  {detailOpen.origemPlat.map((o, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <span className="text-sm w-28">{o.plat}</span>
                      <div className="flex-1 h-2 bg-secondary rounded-full overflow-hidden">
                        <div className="h-full bg-accent rounded-full" style={{ width: `${(o.valor / detailOpen.devido * 100)}%` }} />
                      </div>
                      <span className="text-xs font-medium w-20 text-right">R$ {o.valor.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <button className="btn-ghost" onClick={() => navigate(`/influencers/${detailOpen?.id}`)}>Ver perfil completo</button>
            <button className="btn-ghost" onClick={() => setDetailOpen(null)}>Fechar</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
