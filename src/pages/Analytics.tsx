import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from "recharts";
import { TrendingUp, MousePointerClick, UserPlus, DollarSign, ArrowUpRight, Users, FileText, Gamepad2, Monitor, ExternalLink, ArrowRightLeft } from "lucide-react";
import Breadcrumbs from "@/components/Breadcrumbs";
import ExportDropdown from "@/components/ExportDropdown";

const weeklyData = [
  { periodo: "Sem 1", cliques: 12400, ctr: 8.2, cadastros: 620, depositos: 280, receita: 28500, liquida: 14250 },
  { periodo: "Sem 2", cliques: 15800, ctr: 9.1, cadastros: 810, depositos: 365, receita: 36200, liquida: 18100 },
  { periodo: "Sem 3", cliques: 14200, ctr: 8.8, cadastros: 720, depositos: 310, receita: 32800, liquida: 16400 },
  { periodo: "Sem 4", cliques: 18600, ctr: 10.4, cadastros: 980, depositos: 440, receita: 45200, liquida: 22600 },
];

const receitaJogo = [
  { name: "Fortune Tiger", value: 32500 }, { name: "Aviator", value: 28100 }, { name: "Gates", value: 19800 }, { name: "Mines", value: 15200 },
];
const receitaLP = [
  { name: "Fortune Tiger LP", value: 18400 }, { name: "Aviator Promo", value: 12300 }, { name: "Cadastro Geral", value: 9800 }, { name: "Mines Special", value: 4200 },
];
const receitaInfluencer = [
  { name: "Rafael M.", value: 42100 }, { name: "Pedro L.", value: 35700 }, { name: "Carlos S.", value: 28500 }, { name: "Ana S.", value: 18200 },
];
const receitaPlat = [
  { name: "Bet365", value: 45200 }, { name: "Betano", value: 38600 }, { name: "Sportingbet", value: 22100 }, { name: "Pixbet", value: 18400 },
];

const campanhaComp = [
  { name: "Março Turbo", cliques: 8400, conversoes: 620, receita: 32500 },
  { name: "Aviator Week", cliques: 5200, conversoes: 380, receita: 18200 },
  { name: "Bônus Fev", cliques: 4100, conversoes: 420, receita: 15800 },
  { name: "VIP Mines", cliques: 3200, conversoes: 180, receita: 9600 },
];

const drillTable = [
  { influencer: "Rafael M.", lp: "Fortune Tiger LP", jogo: "Fortune Tiger", plat: "Bet365", campanha: "Março Turbo", cliques: 4520, cadastros: 452, depositos: 180, receita: 18200, ctr: "14.2%" },
  { influencer: "Pedro L.", lp: "Aviator Promo", jogo: "Aviator", plat: "Pixbet", campanha: "Aviator Week", cliques: 3200, cadastros: 320, depositos: 128, receita: 12800, ctr: "11.8%" },
  { influencer: "Carlos S.", lp: "Fortune Tiger LP", jogo: "Mines", plat: "Betano", campanha: "VIP Mines", cliques: 2100, cadastros: 168, depositos: 84, receita: 8400, ctr: "9.4%" },
  { influencer: "Ana S.", lp: "Cadastro Geral", jogo: "Gates of Olympus", plat: "Bet365", campanha: "—", cliques: 1800, cadastros: 126, depositos: 54, receita: 5400, ctr: "8.1%" },
  { influencer: "Julia C.", lp: "Aviator Promo", jogo: "Spaceman", plat: "Pixbet", campanha: "—", cliques: 450, cadastros: 27, depositos: 9, receita: 900, ctr: "4.2%" },
];

const ct = { background: "hsl(0 0% 8%)", border: "1px solid hsl(0 0% 14%)", borderRadius: 6, color: "#fff", fontSize: 12 };

const kpis = [
  { label: "Cliques Totais", value: "61.000", icon: MousePointerClick, change: "+12.4%" },
  { label: "CTR Médio", value: "9.1%", icon: TrendingUp, change: "+0.8pp" },
  { label: "Cadastros Est.", value: "3.130", icon: UserPlus, change: "+18.2%" },
  { label: "Conversões Est.", value: "1.395", icon: ArrowRightLeft, change: "+15.6%" },
  { label: "Receita Bruta Est.", value: "R$ 142.700", icon: DollarSign, change: "+22.1%" },
  { label: "Receita Líquida Est.", value: "R$ 71.350", icon: DollarSign, change: "+19.8%" },
  { label: "Top Influencer", value: "Rafael M.", icon: Users, sub: "R$ 42.100" },
  { label: "Top LP", value: "Fortune Tiger LP", icon: FileText, sub: "12.450 cliques" },
  { label: "Top Jogo", value: "Fortune Tiger", icon: Gamepad2, sub: "R$ 32.500" },
  { label: "Top Plataforma", value: "Bet365", icon: Monitor, sub: "R$ 45.200" },
];

export default function Analytics() {
  const navigate = useNavigate();
  const [filterPeriodo] = useState("Março 2026");
  const [filterInfluencer, setFilterInfluencer] = useState("Todos");
  const [filterJogo, setFilterJogo] = useState("Todos");
  const [filterPlat, setFilterPlat] = useState("Todas");
  const [filterCampanha, setFilterCampanha] = useState("Todas");
  const [filterLP, setFilterLP] = useState("Todas");

  const filtered = drillTable.filter(r => {
    if (filterInfluencer !== "Todos" && r.influencer !== filterInfluencer) return false;
    if (filterJogo !== "Todos" && r.jogo !== filterJogo) return false;
    if (filterPlat !== "Todas" && r.plat !== filterPlat) return false;
    if (filterCampanha !== "Todas" && r.campanha !== filterCampanha) return false;
    if (filterLP !== "Todas" && r.lp !== filterLP) return false;
    return true;
  });

  return (
    <div className="space-y-8">
      <Breadcrumbs items={[{ label: "Analytics" }]} />
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Analytics</h1>
          <p className="text-sm text-muted-foreground mt-1">Centro analítico completo — métricas profundas, drill-down e filtros avançados</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => navigate("/conversoes")} className="btn-ghost text-xs gap-1.5"><ArrowRightLeft size={13} />Conversões</button>
          <ExportDropdown data={drillTable} filename="analytics" />
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <select className="select-field text-xs w-auto"><option>Período: {filterPeriodo}</option></select>
        <select className="select-field text-xs w-auto" value={filterInfluencer} onChange={e => setFilterInfluencer(e.target.value)}>
          <option value="Todos">Influencer: Todos</option>
          {["Rafael M.", "Pedro L.", "Carlos S.", "Ana S.", "Julia C."].map(n => <option key={n} value={n}>{n}</option>)}
        </select>
        <select className="select-field text-xs w-auto" value={filterLP} onChange={e => setFilterLP(e.target.value)}>
          <option value="Todas">LP: Todas</option>
          {["Fortune Tiger LP", "Aviator Promo", "Cadastro Geral", "Mines Special"].map(n => <option key={n} value={n}>{n}</option>)}
        </select>
        <select className="select-field text-xs w-auto" value={filterJogo} onChange={e => setFilterJogo(e.target.value)}>
          <option value="Todos">Jogo: Todos</option>
          {["Fortune Tiger", "Aviator", "Mines", "Gates of Olympus", "Spaceman"].map(n => <option key={n} value={n}>{n}</option>)}
        </select>
        <select className="select-field text-xs w-auto" value={filterPlat} onChange={e => setFilterPlat(e.target.value)}>
          <option value="Todas">Plataforma: Todas</option>
          {["Bet365", "Betano", "Sportingbet", "Pixbet"].map(n => <option key={n} value={n}>{n}</option>)}
        </select>
        <select className="select-field text-xs w-auto" value={filterCampanha} onChange={e => setFilterCampanha(e.target.value)}>
          <option value="Todas">Campanha: Todas</option>
          {["Março Turbo", "Aviator Week", "Bônus Fev", "VIP Mines"].map(n => <option key={n} value={n}>{n}</option>)}
        </select>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {kpis.map(k => (
          <div key={k.label} className="glass-card p-5">
            <div className="flex items-center gap-2 mb-2">
              <k.icon size={13} className="text-muted-foreground" />
              <span className="text-[10.5px] uppercase tracking-wider text-muted-foreground font-medium">{k.label}</span>
            </div>
            <p className="text-lg font-semibold tracking-tight">{k.value}</p>
            {k.change && <span className="text-[11px] text-success font-medium flex items-center gap-0.5 mt-1"><ArrowUpRight size={10} />{k.change}</span>}
            {k.sub && <span className="text-[11px] text-muted-foreground mt-1">{k.sub}</span>}
          </div>
        ))}
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-card p-6">
          <h3 className="text-sm font-semibold text-foreground mb-5">Cliques por Período</h3>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={weeklyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(0 0% 13%)" />
              <XAxis dataKey="periodo" stroke="hsl(0 0% 35%)" fontSize={11} />
              <YAxis stroke="hsl(0 0% 35%)" fontSize={11} />
              <Tooltip contentStyle={ct} />
              <Area type="monotone" dataKey="cliques" stroke="hsl(220 72% 30%)" fill="hsl(220 72% 30% / 0.06)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="glass-card p-6">
          <h3 className="text-sm font-semibold text-foreground mb-5">Cadastros & Depósitos Estimados</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={weeklyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(0 0% 13%)" />
              <XAxis dataKey="periodo" stroke="hsl(0 0% 35%)" fontSize={11} />
              <YAxis stroke="hsl(0 0% 35%)" fontSize={11} />
              <Tooltip contentStyle={ct} />
              <Bar dataKey="cadastros" fill="hsl(220 72% 28%)" radius={[3, 3, 0, 0]} />
              <Bar dataKey="depositos" fill="hsl(0 0% 35%)" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="glass-card p-6">
          <h3 className="text-sm font-semibold text-foreground mb-5">Receita Bruta vs Líquida</h3>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={weeklyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(0 0% 13%)" />
              <XAxis dataKey="periodo" stroke="hsl(0 0% 35%)" fontSize={11} />
              <YAxis stroke="hsl(0 0% 35%)" fontSize={11} />
              <Tooltip contentStyle={ct} />
              <Line type="monotone" dataKey="receita" stroke="hsl(0 0% 45%)" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="liquida" stroke="hsl(152 45% 36%)" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="glass-card p-6">
          <h3 className="text-sm font-semibold text-foreground mb-5">Comparação entre Campanhas</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={campanhaComp}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(0 0% 13%)" />
              <XAxis dataKey="name" stroke="hsl(0 0% 35%)" fontSize={10} />
              <YAxis stroke="hsl(0 0% 35%)" fontSize={10} />
              <Tooltip contentStyle={ct} />
              <Bar dataKey="cliques" fill="hsl(0 0% 30%)" radius={[3, 3, 0, 0]} />
              <Bar dataKey="conversoes" fill="hsl(220 72% 28%)" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Breakdown charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {[
          { title: "Receita por Jogo", data: receitaJogo, color: "hsl(0 0% 38%)" },
          { title: "Receita por LP", data: receitaLP, color: "hsl(205 55% 38%)" },
          { title: "Receita por Influencer", data: receitaInfluencer, color: "hsl(152 45% 33%)" },
          { title: "Receita por Plataforma", data: receitaPlat, color: "hsl(220 72% 28%)" },
        ].map((c) => (
          <div key={c.title} className="glass-card p-6">
            <h3 className="text-sm font-semibold text-foreground mb-5">{c.title}</h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={c.data} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(0 0% 13%)" />
                <XAxis type="number" stroke="hsl(0 0% 35%)" fontSize={10} />
                <YAxis dataKey="name" type="category" stroke="hsl(0 0% 35%)" fontSize={10} width={90} />
                <Tooltip contentStyle={ct} />
                <Bar dataKey="value" fill={c.color} radius={[0, 3, 3, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ))}
      </div>

      {/* Drill-down Table */}
      <div className="glass-card overflow-x-auto">
        <div className="px-6 py-4 border-b border-border">
          <h3 className="text-sm font-semibold">Tabela Analítica — Drill-down</h3>
          <p className="text-[11px] text-muted-foreground mt-0.5">Clique em uma linha para navegar ao módulo relacionado</p>
        </div>
        <table className="data-table">
          <thead>
            <tr><th>Influencer</th><th>LP</th><th>Jogo</th><th>Plataforma</th><th>Campanha</th><th>Cliques</th><th>Cadastros</th><th>Depósitos</th><th>CTR</th><th>Receita Est.</th><th></th></tr>
          </thead>
          <tbody>
            {filtered.map((r, i) => (
              <tr key={i} className="cursor-pointer" onClick={() => navigate("/conversoes")}>
                <td className="font-medium">{r.influencer}</td>
                <td className="text-xs">{r.lp}</td>
                <td className="text-xs">{r.jogo}</td>
                <td className="text-xs">{r.plat}</td>
                <td className="text-xs">{r.campanha}</td>
                <td className="font-medium">{r.cliques.toLocaleString()}</td>
                <td>{r.cadastros.toLocaleString()}</td>
                <td>{r.depositos.toLocaleString()}</td>
                <td className="font-medium">{r.ctr}</td>
                <td className="font-medium">R$ {r.receita.toLocaleString()}</td>
                <td><ExternalLink size={12} className="text-muted-foreground" /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
