import {
  TrendingUp, TrendingDown, DollarSign, Wallet, Users, ArrowUpRight, ArrowDownRight,
  AlertTriangle, Zap, Target, MousePointerClick, UserPlus, CreditCard, BarChart3, Trophy
} from "lucide-react";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from "recharts";

const kpis = [
  { label: "Receita Bruta Total", value: "R$ 284.750", trend: "+18.3%", up: true, icon: DollarSign, variant: "accent" as const },
  { label: "Receita Líquida", value: "R$ 142.890", trend: "+15.1%", up: true, icon: TrendingUp, variant: "primary" as const },
  { label: "Valor Operacional (10%)", value: "R$ 28.475", trend: "+18.3%", up: true, icon: BarChart3, variant: "info" as const },
  { label: "Total Influencers", value: "R$ 85.425", trend: "+22.4%", up: true, icon: Users, variant: "success" as const },
  { label: "Total Sócios", value: "R$ 170.850", trend: "+14.7%", up: true, icon: Wallet, variant: "primary" as const },
  { label: "Saques Pendentes", value: "R$ 23.400", trend: "6 pedidos", up: false, icon: AlertTriangle, variant: "warning" as const },
  { label: "Saques Aprovados", value: "R$ 98.200", trend: "+8.2%", up: true, icon: CreditCard, variant: "success" as const },
  { label: "Saldo Disponível", value: "R$ 44.615", trend: "atualizado", up: true, icon: Wallet, variant: "accent" as const },
];

const receitaDia = [
  { dia: "01/03", receita: 8200, liquida: 4100 },
  { dia: "02/03", receita: 9500, liquida: 4750 },
  { dia: "03/03", receita: 7800, liquida: 3900 },
  { dia: "04/03", receita: 12300, liquida: 6150 },
  { dia: "05/03", receita: 14500, liquida: 7250 },
  { dia: "06/03", receita: 11200, liquida: 5600 },
  { dia: "07/03", receita: 15800, liquida: 7900 },
];

const receitaPlat = [
  { name: "Bet365", value: 45200 },
  { name: "Betano", value: 38600 },
  { name: "Sportingbet", value: 22100 },
  { name: "Pixbet", value: 18400 },
  { name: "KTO", value: 12300 },
];

const receitaJogo = [
  { name: "Fortune Tiger", value: 32500 },
  { name: "Aviator", value: 28100 },
  { name: "Gates of Olympus", value: 19800 },
  { name: "Mines", value: 15200 },
  { name: "Spaceman", value: 11400 },
];

const receitaInfluencer = [
  { name: "Rafael M.", value: 42100 },
  { name: "Pedro L.", value: 35700 },
  { name: "Carlos S.", value: 28500 },
  { name: "Ana S.", value: 18200 },
  { name: "Julia C.", value: 8400 },
];

const cadastrosPeriodo = [
  { periodo: "Sem 1", cadastros: 320, depositos: 145 },
  { periodo: "Sem 2", cadastros: 480, depositos: 210 },
  { periodo: "Sem 3", cadastros: 420, depositos: 185 },
  { periodo: "Sem 4", cadastros: 610, depositos: 290 },
];

const alertas = [
  { tipo: "warning", titulo: "3 influencers com saque pendente", desc: "Rafael, Pedro e Carlos aguardam aprovação há 2+ dias", icon: AlertTriangle },
  { tipo: "danger", titulo: "Bet365 com queda de 12% em conversão", desc: "Taxa caiu de 8.4% para 7.3% na última semana", icon: TrendingDown },
  { tipo: "success", titulo: "Fortune Tiger com alta performance", desc: "CTR de 14.2% e 320 cadastros na semana", icon: Zap },
  { tipo: "warning", titulo: "2 Landing Pages com CTR abaixo de 3%", desc: "LP Mines Special e LP Spaceman precisam revisão", icon: Target },
  { tipo: "danger", titulo: "5 links inativos detectados", desc: "Links de Spaceman e Crash precisam atualização", icon: AlertTriangle },
  { tipo: "info", titulo: "Campanha 'Março Turbo' sem atualização", desc: "Última modificação há 5 dias", icon: AlertTriangle },
];

const resumoRapido = [
  { label: "Melhor jogo da semana", value: "Fortune Tiger", sub: "R$ 12.400 | CTR 14.2%", icon: Trophy },
  { label: "Melhor plataforma", value: "Bet365", sub: "R$ 18.200 em receita", icon: Target },
  { label: "Melhor influencer", value: "Rafael Mendes", sub: "R$ 8.500 gerados", icon: Users },
  { label: "Maior fonte de receita", value: "Links Diretos + Telegram", sub: "62% do tráfego qualificado", icon: Zap },
  { label: "Maior gargalo atual", value: "Aprovação de saques", sub: "6 pedidos pendentes há 2+ dias", icon: AlertTriangle },
];

const chartTooltip = { background: "hsl(0 0% 8%)", border: "1px solid hsl(0 0% 15%)", borderRadius: 8, color: "#fff", fontSize: 12 };

const variantColors: Record<string, string> = {
  accent: "border-l-accent",
  primary: "border-l-primary",
  info: "border-l-info",
  success: "border-l-success",
  warning: "border-l-warning",
};

export default function DashboardExecutivo() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-header">Dashboard Executivo</h1>
        <p className="page-subtitle">Visão consolidada da operação PlayBet — atualizado em tempo real</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {kpis.map((k) => (
          <div key={k.label} className={`stat-card border-l-2 ${variantColors[k.variant]}`}>
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide">{k.label}</span>
              <k.icon size={15} className="text-muted-foreground" />
            </div>
            <div className="text-xl font-bold tracking-tight">{k.value}</div>
            <div className="flex items-center gap-1">
              {k.up ? <ArrowUpRight size={12} className="text-success" /> : <ArrowDownRight size={12} className="text-warning" />}
              <span className={`text-[11px] font-medium ${k.up ? "text-success" : "text-warning"}`}>{k.trend}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="glass-card p-5">
          <h3 className="section-title">Receita por Dia (Bruta vs Líquida)</h3>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={receitaDia}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(0 0% 15%)" />
              <XAxis dataKey="dia" stroke="hsl(0 0% 40%)" fontSize={11} />
              <YAxis stroke="hsl(0 0% 40%)" fontSize={11} />
              <Tooltip contentStyle={chartTooltip} />
              <Area type="monotone" dataKey="receita" stroke="hsl(45 100% 50%)" fill="hsl(45 100% 50% / 0.1)" strokeWidth={2} />
              <Area type="monotone" dataKey="liquida" stroke="hsl(217 85% 40%)" fill="hsl(217 85% 40% / 0.1)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="glass-card p-5">
          <h3 className="section-title">Cadastros vs Depósitos Estimados</h3>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={cadastrosPeriodo}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(0 0% 15%)" />
              <XAxis dataKey="periodo" stroke="hsl(0 0% 40%)" fontSize={11} />
              <YAxis stroke="hsl(0 0% 40%)" fontSize={11} />
              <Tooltip contentStyle={chartTooltip} />
              <Bar dataKey="cadastros" fill="hsl(217 85% 35%)" radius={[3, 3, 0, 0]} />
              <Bar dataKey="depositos" fill="hsl(45 100% 50%)" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { title: "Receita por Plataforma", data: receitaPlat, color: "hsl(45 100% 50%)" },
          { title: "Receita por Jogo", data: receitaJogo, color: "hsl(217 85% 40%)" },
          { title: "Receita por Influencer", data: receitaInfluencer, color: "hsl(152 69% 41%)" },
        ].map((chart) => (
          <div key={chart.title} className="glass-card p-5">
            <h3 className="section-title">{chart.title}</h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={chart.data} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(0 0% 15%)" />
                <XAxis type="number" stroke="hsl(0 0% 40%)" fontSize={10} />
                <YAxis dataKey="name" type="category" stroke="hsl(0 0% 40%)" fontSize={10} width={80} />
                <Tooltip contentStyle={chartTooltip} />
                <Bar dataKey="value" fill={chart.color} radius={[0, 3, 3, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ))}
      </div>

      {/* Alerts + Quick Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 glass-card p-5">
          <h3 className="section-title">Alertas Operacionais</h3>
          <div className="space-y-2">
            {alertas.map((a, i) => (
              <div key={i} className={`alert-card ${a.tipo === "danger" ? "border-l-destructive" : a.tipo === "success" ? "border-l-success" : a.tipo === "info" ? "border-l-info" : "border-l-warning"}`}>
                <a.icon size={16} className={a.tipo === "danger" ? "text-destructive" : a.tipo === "success" ? "text-success" : a.tipo === "info" ? "text-info" : "text-warning"} />
                <div>
                  <p className="text-sm font-medium">{a.titulo}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{a.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="glass-card p-5">
          <h3 className="section-title">Resumo Rápido da Semana</h3>
          <div className="space-y-3">
            {resumoRapido.map((r, i) => (
              <div key={i} className="glass-card-elevated p-3 rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <r.icon size={13} className="text-accent" />
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">{r.label}</span>
                </div>
                <p className="text-sm font-semibold">{r.value}</p>
                <p className="text-[11px] text-muted-foreground">{r.sub}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
