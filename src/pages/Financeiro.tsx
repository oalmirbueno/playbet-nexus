import { useState } from "react";
import { DollarSign, TrendingUp, Wallet, CreditCard, AlertTriangle, ArrowRight, Eye, Edit, CheckCircle, Search, Filter } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from "recharts";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import Breadcrumbs from "@/components/Breadcrumbs";
import ExportDropdown from "@/components/ExportDropdown";
import { toast } from "@/hooks/use-toast";

// Financial records — prepared for Supabase migration
interface FinanceiroRecord {
  id: number;
  data: string;
  origem: string;
  plataforma: string;
  jogo: string;
  influencer: string;
  bruto: number;
  percInf: number;
  valorInf: number;
  operacao: number;
  baseSocios: number;
  socio1: number;
  socio2: number;
  socio3: number;
  status: "Confirmado" | "Pendente" | "Conciliado";
  referencia: string;
}

const initialRecords: FinanceiroRecord[] = [
  { id: 1, data: "05/03/2026", origem: "Afiliado", plataforma: "Bet365", jogo: "Fortune Tiger", influencer: "Rafael Mendes", bruto: 4500, percInf: 20, valorInf: 900, operacao: 360, baseSocios: 3240, socio1: 1080, socio2: 1080, socio3: 1080, status: "Confirmado", referencia: "FIN-001" },
  { id: 2, data: "04/03/2026", origem: "Link Direto", plataforma: "Betano", jogo: "Aviator", influencer: "Carlos Silva", bruto: 3200, percInf: 15, valorInf: 480, operacao: 272, baseSocios: 2448, socio1: 816, socio2: 816, socio3: 816, status: "Confirmado", referencia: "FIN-002" },
  { id: 3, data: "03/03/2026", origem: "LP", plataforma: "Sportingbet", jogo: "Mines", influencer: "Ana Souza", bruto: 2800, percInf: 12, valorInf: 336, operacao: 246, baseSocios: 2218, socio1: 739, socio2: 739, socio3: 740, status: "Pendente", referencia: "FIN-003" },
  { id: 4, data: "02/03/2026", origem: "Afiliado", plataforma: "Pixbet", jogo: "Gates of Olympus", influencer: "Pedro Lima", bruto: 5100, percInf: 18, valorInf: 918, operacao: 418, baseSocios: 3764, socio1: 1255, socio2: 1255, socio3: 1254, status: "Confirmado", referencia: "FIN-004" },
  { id: 5, data: "01/03/2026", origem: "Telegram", plataforma: "Bet365", jogo: "Fortune Tiger", influencer: "Rafael Mendes", bruto: 6200, percInf: 20, valorInf: 1240, operacao: 496, baseSocios: 4464, socio1: 1488, socio2: 1488, socio3: 1488, status: "Pendente", referencia: "FIN-005" },
  { id: 6, data: "28/02/2026", origem: "LP", plataforma: "KTO", jogo: "Aviator", influencer: "Julia Costa", bruto: 1900, percInf: 10, valorInf: 190, operacao: 171, baseSocios: 1539, socio1: 513, socio2: 513, socio3: 513, status: "Conciliado", referencia: "FIN-006" },
  { id: 7, data: "27/02/2026", origem: "Afiliado", plataforma: "Bet365", jogo: "Fortune Tiger", influencer: "Pedro Lima", bruto: 3800, percInf: 18, valorInf: 684, operacao: 312, baseSocios: 2804, socio1: 935, socio2: 935, socio3: 934, status: "Conciliado", referencia: "FIN-007" },
  { id: 8, data: "26/02/2026", origem: "Instagram", plataforma: "Betano", jogo: "Mines", influencer: "Carlos Silva", bruto: 2100, percInf: 15, valorInf: 315, operacao: 179, baseSocios: 1606, socio1: 535, socio2: 535, socio3: 536, status: "Confirmado", referencia: "FIN-008" },
  { id: 9, data: "25/02/2026", origem: "LP", plataforma: "Sportingbet", jogo: "Gates of Olympus", influencer: "", bruto: 1500, percInf: 0, valorInf: 0, operacao: 150, baseSocios: 1350, socio1: 450, socio2: 450, socio3: 450, status: "Pendente", referencia: "FIN-009" },
  { id: 10, data: "24/02/2026", origem: "Afiliado", plataforma: "", jogo: "Spaceman", influencer: "Julia Costa", bruto: 800, percInf: 10, valorInf: 80, operacao: 72, baseSocios: 648, socio1: 216, socio2: 216, socio3: 216, status: "Pendente", referencia: "FIN-010" },
];

const receitaPeriodo = [
  { periodo: "Jan", receita: 42000, liquida: 21000 },
  { periodo: "Fev", receita: 58000, liquida: 29000 },
  { periodo: "Mar", receita: 72000, liquida: 36000 },
];

const pieData = [
  { name: "Influencers", value: 85425, color: "hsl(152 69% 41%)" },
  { name: "Operacional 10%", value: 28475, color: "hsl(217 85% 55%)" },
  { name: "Sócios", value: 170850, color: "hsl(45 100% 50%)" },
];

const alerts = [
  { msg: "Receita sem influencer vinculado", count: 1, path: "/financeiro", type: "warning" as const },
  { msg: "Registro sem plataforma definida", count: 1, path: "/financeiro", type: "warning" as const },
  { msg: "4 registros pendentes de conciliação", count: 4, path: "/financeiro", type: "info" as const },
  { msg: "2 saques pendentes acima de R$ 8.000", count: 2, path: "/saques", type: "danger" as const },
  { msg: "Divergência entre bruto e líquido no FIN-009", count: 1, path: "/financeiro", type: "danger" as const },
];

const chartTooltip = { background: "hsl(0 0% 8%)", border: "1px solid hsl(0 0% 15%)", borderRadius: 8, color: "#fff", fontSize: 12 };
const variants: Record<string, string> = { accent: "border-l-accent", primary: "border-l-primary", info: "border-l-info", success: "border-l-success", warning: "border-l-warning" };

export default function Financeiro() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<"resumo" | "fluxo" | "centro" | "alertas">("resumo");
  const [data, setData] = useState(initialRecords);
  const [search, setSearch] = useState("");
  const [filterPlat, setFilterPlat] = useState("Todas");
  const [filterStatus, setFilterStatus] = useState("Todos");
  const [filterInfluencer, setFilterInfluencer] = useState("Todos");
  const [editOpen, setEditOpen] = useState<FinanceiroRecord | null>(null);
  const [detailOpen, setDetailOpen] = useState<FinanceiroRecord | null>(null);

  const totalBruto = data.reduce((a, b) => a + b.bruto, 0);
  const totalInf = data.reduce((a, b) => a + b.valorInf, 0);
  const totalOp = data.reduce((a, b) => a + b.operacao, 0);
  const totalBase = data.reduce((a, b) => a + b.baseSocios, 0);
  const totalSocios = totalBase;
  const pendentes = data.filter(d => d.status === "Pendente");

  const resumo = [
    { label: "Receita Bruta Total", value: `R$ ${totalBruto.toLocaleString()}`, icon: DollarSign, variant: "accent", path: "/financeiro" },
    { label: "Total Influencers", value: `R$ ${totalInf.toLocaleString()}`, icon: Wallet, variant: "success", path: "/comissoes" },
    { label: "Operacional Retido (10%)", value: `R$ ${totalOp.toLocaleString()}`, icon: TrendingUp, variant: "info", path: "/financeiro" },
    { label: "Base Societária", value: `R$ ${totalBase.toLocaleString()}`, icon: CreditCard, variant: "primary", path: "/socios" },
    { label: "Total Sócios", value: `R$ ${totalSocios.toLocaleString()}`, icon: DollarSign, variant: "accent", path: "/socios" },
    { label: "Saldo em Asaas", value: "R$ 38.200", icon: Wallet, variant: "info", path: "/asaas-pagamentos" },
    { label: "Saldo Comprometido", value: "R$ 23.400", icon: Wallet, variant: "warning", path: "/saques" },
    { label: "Pagamentos Pendentes", value: `${pendentes.length} registros`, icon: AlertTriangle, variant: "warning", path: "/saques" },
    { label: "Pagamentos Concluídos", value: `${data.filter(d => d.status === "Conciliado").length}`, icon: CheckCircle, variant: "success", path: "/asaas-pagamentos" },
  ];

  const plataformas = [...new Set(data.map(d => d.plataforma).filter(Boolean))];
  const influencers = [...new Set(data.map(d => d.influencer).filter(Boolean))];

  const filtered = data.filter(d => {
    if (search && !Object.values(d).some(v => String(v).toLowerCase().includes(search.toLowerCase()))) return false;
    if (filterPlat !== "Todas" && d.plataforma !== filterPlat) return false;
    if (filterStatus !== "Todos" && d.status !== filterStatus) return false;
    if (filterInfluencer !== "Todos" && d.influencer !== filterInfluencer) return false;
    return true;
  });

  const handleConciliar = (id: number) => {
    setData(prev => prev.map(r => r.id === id ? { ...r, status: "Conciliado" as const } : r));
    toast({ title: "Registro conciliado", description: `Registro #${id} marcado como conciliado.` });
  };

  const handleEditSave = () => {
    if (!editOpen) return;
    // Recalculate
    const valorInf = Math.round(editOpen.bruto * editOpen.percInf / 100);
    const operacao = Math.round((editOpen.bruto - valorInf) * 0.1);
    const baseSocios = editOpen.bruto - valorInf - operacao;
    const perSocio = Math.floor(baseSocios / 3);
    const updated = { ...editOpen, valorInf, operacao, baseSocios, socio1: perSocio, socio2: perSocio, socio3: baseSocios - perSocio * 2 };
    setData(prev => prev.map(r => r.id === updated.id ? updated : r));
    toast({ title: "Registro atualizado" });
    setEditOpen(null);
  };

  const exportData = filtered.map(({ id, ...rest }) => ({ ...rest }));

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: "Financeiro" }]} />
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="page-header">Financeiro</h1>
          <p className="page-subtitle">Controle financeiro completo — receitas, comissões, fluxo de caixa e alertas</p>
        </div>
        <ExportDropdown data={exportData} filename="financeiro-playbet" />
      </div>

      <div className="flex gap-1 bg-secondary/50 p-1 rounded-xl w-fit flex-wrap">
        {(["resumo", "fluxo", "centro", "alertas"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={tab === t ? "tab-btn-active" : "tab-btn"}>
            {t === "resumo" ? "Resumo" : t === "fluxo" ? "Fluxo Financeiro" : t === "centro" ? "Centro de Custos" : "Alertas Financeiros"}
          </button>
        ))}
      </div>

      {tab === "resumo" && (
        <div className="space-y-6 animate-fade-in">
          {/* KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {resumo.map((r) => (
              <div key={r.label} onClick={() => navigate(r.path)} className={`stat-card border-l-2 ${variants[r.variant]} cursor-pointer hover:bg-secondary/40 transition-colors group`}>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide">{r.label}</span>
                  <r.icon size={15} className="text-muted-foreground group-hover:text-accent transition-colors" />
                </div>
                <div className="text-xl font-bold">{r.value}</div>
              </div>
            ))}
          </div>

          {/* Visual Flow */}
          <div className="glass-card p-6">
            <h3 className="section-title">Fluxo de Cálculo da Operação</h3>
            <div className="flex flex-col md:flex-row items-stretch gap-0">
              {[
                { label: "Receita Bruta", value: `R$ ${totalBruto.toLocaleString()}`, color: "text-accent", desc: "Total gerado por plataformas" },
                { label: "– Comissão Influencer", value: `R$ ${totalInf.toLocaleString()}`, color: "text-success", desc: `Média ${data.length > 0 ? Math.round(totalInf / totalBruto * 100) : 0}% da receita` },
                { label: "– Retenção Operacional", value: `R$ ${totalOp.toLocaleString()}`, color: "text-info", desc: "10% sobre o saldo pós-influencer" },
                { label: "= Base Societária", value: `R$ ${totalBase.toLocaleString()}`, color: "text-primary", desc: "Dividida entre 3 sócios" },
                { label: "Valor por Sócio", value: `R$ ${Math.floor(totalBase / 3).toLocaleString()}`, color: "text-accent", desc: "1/3 da base societária" },
              ].map((item, i) => (
                <div key={i} className="flex items-center">
                  {i > 0 && <div className="hidden md:flex items-center px-2"><ArrowRight size={16} className="text-muted-foreground" /></div>}
                  {i > 0 && <div className="flex md:hidden justify-center py-1"><div className="w-px h-4 bg-border" /></div>}
                  <div className="glass-card-elevated px-4 py-4 rounded-lg text-center flex-1 min-w-[140px]">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">{item.label}</p>
                    <p className={`font-bold text-lg ${item.color}`}>{item.value}</p>
                    <p className="text-[9px] text-muted-foreground mt-1">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Distribution Chart */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="glass-card p-5">
              <h3 className="section-title">Distribuição da Receita</h3>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={pieData} dataKey="value" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                    {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                  <Tooltip contentStyle={chartTooltip} formatter={(v: number) => `R$ ${v.toLocaleString()}`} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="glass-card p-5">
              <h3 className="section-title">Receita por Período</h3>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={receitaPeriodo}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(0 0% 15%)" />
                  <XAxis dataKey="periodo" stroke="hsl(0 0% 40%)" fontSize={11} />
                  <YAxis stroke="hsl(0 0% 40%)" fontSize={11} />
                  <Tooltip contentStyle={chartTooltip} formatter={(v: number) => `R$ ${v.toLocaleString()}`} />
                  <Bar dataKey="receita" fill="hsl(45 100% 50%)" radius={[3, 3, 0, 0]} name="Bruta" />
                  <Bar dataKey="liquida" fill="hsl(217 85% 40%)" radius={[3, 3, 0, 0]} name="Líquida" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {tab === "fluxo" && (
        <div className="animate-fade-in space-y-4">
          {/* Filters */}
          <div className="flex flex-wrap gap-3 items-center">
            <div className="relative flex-1 min-w-[200px] max-w-xs">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input className="input-field pl-9 w-full" placeholder="Buscar registros..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <select className="select-field" value={filterPlat} onChange={e => setFilterPlat(e.target.value)}>
              <option value="Todas">Todas Plataformas</option>
              {plataformas.map(p => <option key={p}>{p}</option>)}
            </select>
            <select className="select-field" value={filterInfluencer} onChange={e => setFilterInfluencer(e.target.value)}>
              <option value="Todos">Todos Influencers</option>
              {influencers.map(p => <option key={p}>{p}</option>)}
            </select>
            <select className="select-field" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
              <option value="Todos">Todos Status</option>
              <option>Confirmado</option><option>Pendente</option><option>Conciliado</option>
            </select>
          </div>

          {/* Table */}
          <div className="glass-card overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Ref</th><th>Data</th><th>Origem</th><th>Plataforma</th><th>Jogo</th><th>Influencer</th>
                  <th>Bruto</th><th>% Inf</th><th>Valor Inf</th><th>10% Op</th><th>Base Sócios</th>
                  <th>Sócio 1</th><th>Sócio 2</th><th>Sócio 3</th><th>Status</th><th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={16} className="text-center text-muted-foreground py-8">Nenhum registro encontrado</td></tr>
                ) : filtered.map((f) => {
                  const hasAlert = !f.influencer || !f.plataforma;
                  return (
                    <tr key={f.id} className={hasAlert ? "bg-destructive/5" : ""}>
                      <td className="font-mono text-xs text-muted-foreground">{f.referencia}</td>
                      <td className="whitespace-nowrap text-xs">{f.data}</td>
                      <td><span className="badge-neutral">{f.origem}</span></td>
                      <td>{f.plataforma || <span className="text-destructive text-xs">⚠ Sem plataforma</span>}</td>
                      <td>{f.jogo}</td>
                      <td>{f.influencer || <span className="text-destructive text-xs">⚠ Sem influencer</span>}</td>
                      <td className="font-medium">R$ {f.bruto.toLocaleString()}</td>
                      <td>{f.percInf}%</td>
                      <td className="text-success">R$ {f.valorInf.toLocaleString()}</td>
                      <td className="text-info">R$ {f.operacao.toLocaleString()}</td>
                      <td className="font-semibold">R$ {f.baseSocios.toLocaleString()}</td>
                      <td className="text-xs">R$ {f.socio1.toLocaleString()}</td>
                      <td className="text-xs">R$ {f.socio2.toLocaleString()}</td>
                      <td className="text-xs">R$ {f.socio3.toLocaleString()}</td>
                      <td><span className={f.status === "Confirmado" ? "badge-success" : f.status === "Conciliado" ? "badge-primary" : "badge-warning"}>{f.status}</span></td>
                      <td>
                        <div className="flex gap-1">
                          <button onClick={() => setDetailOpen(f)} className="p-1.5 rounded-lg hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground"><Eye size={13} /></button>
                          <button onClick={() => setEditOpen({ ...f })} className="p-1.5 rounded-lg hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground"><Edit size={13} /></button>
                          {f.status === "Pendente" && (
                            <button onClick={() => handleConciliar(f.id)} className="p-1.5 rounded-lg bg-success/15 text-success hover:bg-success/25 transition-colors"><CheckCircle size={13} /></button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === "centro" && (
        <div className="animate-fade-in space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="glass-card p-5">
              <h3 className="section-title">Evolução da Receita</h3>
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={receitaPeriodo}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(0 0% 15%)" />
                  <XAxis dataKey="periodo" stroke="hsl(0 0% 40%)" fontSize={11} />
                  <YAxis stroke="hsl(0 0% 40%)" fontSize={11} />
                  <Tooltip contentStyle={chartTooltip} formatter={(v: number) => `R$ ${v.toLocaleString()}`} />
                  <Line type="monotone" dataKey="receita" stroke="hsl(45 100% 50%)" strokeWidth={2} name="Bruta" />
                  <Line type="monotone" dataKey="liquida" stroke="hsl(152 69% 41%)" strokeWidth={2} name="Líquida" />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="glass-card p-5">
              <h3 className="section-title">Custo por Plataforma</h3>
              <div className="space-y-3 mt-4">
                {plataformas.map(p => {
                  const total = data.filter(d => d.plataforma === p).reduce((a, b) => a + b.bruto, 0);
                  const pct = totalBruto > 0 ? (total / totalBruto * 100).toFixed(0) : 0;
                  return (
                    <div key={p} className="flex items-center gap-3">
                      <span className="text-sm w-24 truncate">{p}</span>
                      <div className="flex-1 h-2 bg-secondary rounded-full overflow-hidden">
                        <div className="h-full bg-accent rounded-full transition-all" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-xs text-muted-foreground w-20 text-right">R$ {total.toLocaleString()}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === "alertas" && (
        <div className="animate-fade-in space-y-4">
          <div className="glass-card p-5">
            <h3 className="section-title flex items-center gap-2"><AlertTriangle size={15} className="text-warning" /> Alertas Financeiros</h3>
            <div className="space-y-2 mt-4">
              {alerts.map((a, i) => (
                <div key={i} onClick={() => navigate(a.path)} className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors hover:bg-secondary/60 border ${a.type === "danger" ? "border-destructive/30 bg-destructive/5" : a.type === "warning" ? "border-warning/30 bg-warning/5" : "border-info/30 bg-info/5"}`}>
                  <div className="flex items-center gap-3">
                    <AlertTriangle size={14} className={a.type === "danger" ? "text-destructive" : a.type === "warning" ? "text-warning" : "text-info"} />
                    <span className="text-sm">{a.msg}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-medium ${a.type === "danger" ? "text-destructive" : a.type === "warning" ? "text-warning" : "text-info"}`}>{a.count}</span>
                    <ArrowRight size={13} className="text-muted-foreground" />
                  </div>
                </div>
              ))}
            </div>
          </div>
          {/* Flagged records */}
          <div className="glass-card p-5">
            <h3 className="section-title">Registros com Problemas</h3>
            <div className="space-y-2 mt-3">
              {data.filter(d => !d.influencer || !d.plataforma).map(d => (
                <div key={d.id} className="flex items-center justify-between p-3 rounded-lg border border-destructive/20 bg-destructive/5">
                  <div>
                    <span className="font-mono text-xs text-muted-foreground">{d.referencia}</span>
                    <span className="mx-2 text-sm">{d.jogo} — R$ {d.bruto.toLocaleString()}</span>
                    {!d.influencer && <span className="badge-danger text-[10px]">Sem influencer</span>}
                    {!d.plataforma && <span className="badge-danger text-[10px] ml-1">Sem plataforma</span>}
                  </div>
                  <button onClick={() => setEditOpen({ ...d })} className="btn-ghost text-xs py-1 px-2">Corrigir</button>
                </div>
              ))}
              {data.filter(d => !d.influencer || !d.plataforma).length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">Nenhum registro com problema</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      <Dialog open={!!detailOpen} onOpenChange={() => setDetailOpen(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Detalhe — {detailOpen?.referencia}</DialogTitle></DialogHeader>
          {detailOpen && (
            <div className="space-y-4 py-2 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div><span className="text-xs text-muted-foreground">Data</span><p>{detailOpen.data}</p></div>
                <div><span className="text-xs text-muted-foreground">Origem</span><p>{detailOpen.origem}</p></div>
                <div><span className="text-xs text-muted-foreground">Plataforma</span><p>{detailOpen.plataforma || "—"}</p></div>
                <div><span className="text-xs text-muted-foreground">Jogo</span><p>{detailOpen.jogo}</p></div>
                <div><span className="text-xs text-muted-foreground">Influencer</span><p>{detailOpen.influencer || "—"}</p></div>
                <div><span className="text-xs text-muted-foreground">Status</span><p><span className={detailOpen.status === "Confirmado" ? "badge-success" : detailOpen.status === "Conciliado" ? "badge-primary" : "badge-warning"}>{detailOpen.status}</span></p></div>
              </div>
              <div className="border-t border-border pt-3">
                <h4 className="text-xs font-medium text-muted-foreground uppercase mb-2">Composição Financeira</h4>
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-2 bg-secondary/50 rounded"><span className="text-[10px] text-muted-foreground">Receita Bruta</span><p className="font-bold">R$ {detailOpen.bruto.toLocaleString()}</p></div>
                  <div className="p-2 bg-secondary/50 rounded"><span className="text-[10px] text-muted-foreground">Comissão Inf ({detailOpen.percInf}%)</span><p className="font-bold text-success">R$ {detailOpen.valorInf.toLocaleString()}</p></div>
                  <div className="p-2 bg-secondary/50 rounded"><span className="text-[10px] text-muted-foreground">Operacional 10%</span><p className="font-bold text-info">R$ {detailOpen.operacao.toLocaleString()}</p></div>
                  <div className="p-2 bg-secondary/50 rounded"><span className="text-[10px] text-muted-foreground">Base Societária</span><p className="font-bold text-primary">R$ {detailOpen.baseSocios.toLocaleString()}</p></div>
                  <div className="p-2 bg-secondary/50 rounded"><span className="text-[10px] text-muted-foreground">Sócio 1</span><p className="font-bold">R$ {detailOpen.socio1.toLocaleString()}</p></div>
                  <div className="p-2 bg-secondary/50 rounded"><span className="text-[10px] text-muted-foreground">Sócio 2</span><p className="font-bold">R$ {detailOpen.socio2.toLocaleString()}</p></div>
                  <div className="p-2 bg-secondary/50 rounded col-span-2"><span className="text-[10px] text-muted-foreground">Sócio 3</span><p className="font-bold">R$ {detailOpen.socio3.toLocaleString()}</p></div>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            {detailOpen?.status === "Pendente" && <button className="btn-primary" onClick={() => { handleConciliar(detailOpen.id); setDetailOpen(null); }}>Conciliar</button>}
            <button className="btn-ghost" onClick={() => setDetailOpen(null)}>Fechar</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Modal */}
      <Dialog open={!!editOpen} onOpenChange={() => setEditOpen(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Editar Registro — {editOpen?.referencia}</DialogTitle></DialogHeader>
          {editOpen && (
            <div className="space-y-3 py-2">
              <div><label className="text-xs font-medium text-muted-foreground">Plataforma</label><input className="input-field mt-1" value={editOpen.plataforma} onChange={e => setEditOpen({ ...editOpen, plataforma: e.target.value })} /></div>
              <div><label className="text-xs font-medium text-muted-foreground">Influencer</label><input className="input-field mt-1" value={editOpen.influencer} onChange={e => setEditOpen({ ...editOpen, influencer: e.target.value })} /></div>
              <div><label className="text-xs font-medium text-muted-foreground">Receita Bruta</label><input type="number" className="input-field mt-1" value={editOpen.bruto} onChange={e => setEditOpen({ ...editOpen, bruto: Number(e.target.value) })} /></div>
              <div><label className="text-xs font-medium text-muted-foreground">% Influencer</label><input type="number" className="input-field mt-1" value={editOpen.percInf} onChange={e => setEditOpen({ ...editOpen, percInf: Number(e.target.value) })} /></div>
              <div><label className="text-xs font-medium text-muted-foreground">Status</label>
                <select className="select-field mt-1 w-full" value={editOpen.status} onChange={e => setEditOpen({ ...editOpen, status: e.target.value as FinanceiroRecord["status"] })}>
                  <option>Confirmado</option><option>Pendente</option><option>Conciliado</option>
                </select>
              </div>
              <p className="text-[10px] text-muted-foreground">Os valores de comissão, operacional e base societária serão recalculados automaticamente.</p>
            </div>
          )}
          <DialogFooter>
            <button className="btn-ghost" onClick={() => setEditOpen(null)}>Cancelar</button>
            <button className="btn-primary" onClick={handleEditSave}>Salvar</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
