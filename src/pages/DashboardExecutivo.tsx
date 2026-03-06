import {
  TrendingUp, TrendingDown, DollarSign, Wallet, Users, ArrowUpRight, ArrowDownRight,
  AlertTriangle, Zap, Target, MousePointerClick, UserPlus, CreditCard, BarChart3, Trophy, ExternalLink
} from "lucide-react";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from "recharts";
import { useNavigate } from "react-router-dom";

const data = [
  { periodo: "Sem 1", cliques: 12400, ctr: 8.2, cadastros: 620, depositos: 280, receita: 28500, liquida: 14250 },
  { periodo: "Sem 2", cliques: 15800, ctr: 9.1, cadastros: 810, depositos: 365, receita: 36200, liquida: 18100 },
  { periodo: "Sem 3", cliques: 14200, ctr: 8.8, cadastros: 720, depositos: 310, receita: 32800, liquida: 16400 },
  { periodo: "Sem 4", cliques: 18600, ctr: 10.4, cadastros: 980, depositos: 440, receita: 45200, liquida: 22600 },
];

const receitaJogo = [
  { name: "Fortune Tiger", value: 32500 }, { name: "Aviator", value: 28100 }, { name: "Gates of Olympus", value: 19800 }, { name: "Mines", value: 15200 },
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

const kpis = [
  { label: "Receita Bruta Total", value: "R$ 284.750", trend: "+18.3%", up: true, icon: DollarSign, variant: "accent" as const, path: "/financeiro" },
  { label: "Receita Líquida", value: "R$ 142.890", trend: "+15.1%", up: true, icon: TrendingUp, variant: "primary" as const, path: "/financeiro" },
  { label: "Valor Operacional (10%)", value: "R$ 28.475", trend: "+18.3%", up: true, icon: BarChart3, variant: "info" as const, path: "/comissoes" },
  { label: "Total Influencers", value: "R$ 85.425", trend: "+22.4%", up: true, icon: Users, variant: "success" as const, path: "/influencers" },
  { label: "Total Sócios", value: "R$ 170.850", trend: "+14.7%", up: true, icon: Wallet, variant: "primary" as const, path: "/socios" },
  { label: "Saques Pendentes", value: "R$ 23.400", trend: "6 pedidos", up: false, icon: AlertTriangle, variant: "warning" as const, path: "/saques" },
  { label: "Saques Aprovados", value: "R$ 98.200", trend: "+8.2%", up: true, icon: CreditCard, variant: "success" as const, path: "/saques" },
  { label: "Saldo Disponível", value: "R$ 44.615", trend: "atualizado", up: true, icon: Wallet, variant: "accent" as const, path: "/financeiro" },
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
  { tipo: "warning", titulo: "3 influencers com saque pendente", desc: "Rafael, Pedro e Carlos aguardam aprovação há 2+ dias", icon: AlertTriangle, path: "/saques", cta: "Ver saques pendentes" },
  { tipo: "danger", titulo: "Bet365 com queda de 12% em conversão", desc: "Taxa caiu de 8.4% para 7.3% na última semana", icon: TrendingDown, path: "/conversoes", cta: "Ver conversões" },
  { tipo: "success", titulo: "Fortune Tiger com alta performance", desc: "CTR de 14.2% e 320 cadastros na semana", icon: Zap, path: "/jogos", cta: "Ver jogos" },
  { tipo: "warning", titulo: "2 Landing Pages com CTR abaixo de 3%", desc: "LP Mines Special e LP Spaceman precisam revisão", icon: Target, path: "/landing-pages", cta: "Ver landing pages" },
  { tipo: "danger", titulo: "5 links inativos detectados", desc: "Links de Spaceman e Crash precisam atualização", icon: AlertTriangle, path: "/link-engine", cta: "Ver engine de links" },
  { tipo: "info", titulo: "Campanha 'Março Turbo' sem atualização", desc: "Última modificação há 5 dias", icon: AlertTriangle, path: "/campanhas", cta: "Ver campanhas" },
];

const resumoRapido = [
  { label: "Melhor jogo da semana", value: "Fortune Tiger", sub: "R$ 12.400 | CTR 14.2%", icon: Trophy, path: "/jogos" },
  { label: "Melhor plataforma", value: "Bet365", sub: "R$ 18.200 em receita", icon: Target, path: "/plataformas" },
  { label: "Melhor influencer", value: "Rafael Mendes", sub: "R$ 8.500 gerados", icon: Users, path: "/influencers" },
  { label: "Maior fonte de receita", value: "Links Diretos + Telegram", sub: "62% do tráfego qualificado", icon: Zap, path: "/analytics" },
  { label: "Maior gargalo atual", value: "Aprovação de saques", sub: "6 pedidos pendentes há 2+ dias", icon: AlertTriangle, path: "/saques" },
];

const ct = { background: "hsl(0 0% 8%)", border: "1px solid hsl(0 0% 15%)", borderRadius: 8, color: "#fff", fontSize: 12 };

const variantColors: Record<string, string> = {
  accent: "border-l-accent",
  primary: "border-l-primary",
  info: "border-l-info",
  success: "border-l-success",
  warning: "border-l-warning",
};

export default function DashboardExecutivo() {
  const navigate = useNavigate();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard Executivo</h1>
        <p className="text-sm text-muted-foreground mt-1">Visão consolidada da operação — atualizado em tempo real</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((k) => (
          <div
            key={k.label}
            onClick={() => navigate(k.path)}
            className={`glass-card p-6 border-l-2 ${variantColors[k.variant]} cursor-pointer hover:bg-secondary/30 transition-all duration-200 group`}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">{k.label}</span>
              <k.icon size={15} className="text-muted-foreground" />
            </div>
            <div className="text-2xl font-bold tracking-tight">{k.value}</div>
            <div className="flex items-center gap-1.5 mt-2">
              {k.up ? <ArrowUpRight size={13} className="text-success" /> : <ArrowDownRight size={13} className="text-warning" />}
              <span className={`text-xs font-medium ${k.up ? "text-success" : "text-warning"}`}>{k.trend}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-card p-6 cursor-pointer hover:bg-secondary/20 transition-all" onClick={() => navigate("/financeiro")}>
          <h3 className="text-sm font-semibold text-foreground mb-5">Receita por Dia (Bruta vs Líquida)</h3>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={receitaDia}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(0 0% 15%)" />
              <XAxis dataKey="dia" stroke="hsl(0 0% 40%)" fontSize={11} />
              <YAxis stroke="hsl(0 0% 40%)" fontSize={11} />
              <Tooltip contentStyle={ct} />
              <Area type="monotone" dataKey="receita" stroke="hsl(0 0% 50%)" fill="hsl(0 0% 50% / 0.08)" strokeWidth={2} />
              <Area type="monotone" dataKey="liquida" stroke="hsl(220 78% 35%)" fill="hsl(220 78% 35% / 0.08)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="glass-card p-6 cursor-pointer hover:bg-secondary/20 transition-all" onClick={() => navigate("/conversoes")}>
          <h3 className="text-sm font-semibold text-foreground mb-5">Cadastros vs Depósitos Estimados</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={cadastrosPeriodo}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(0 0% 15%)" />
              <XAxis dataKey="periodo" stroke="hsl(0 0% 40%)" fontSize={11} />
              <YAxis stroke="hsl(0 0% 40%)" fontSize={11} />
              <Tooltip contentStyle={ct} />
              <Bar dataKey="cadastros" fill="hsl(220 78% 30%)" radius={[3, 3, 0, 0]} />
              <Bar dataKey="depositos" fill="hsl(0 0% 40%)" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {[
          { title: "Receita por Plataforma", data: receitaPlat, color: "hsl(0 0% 40%)", path: "/plataformas" },
          { title: "Receita por Jogo", data: receitaJogo, color: "hsl(220 78% 30%)", path: "/jogos" },
          { title: "Receita por Influencer", data: receitaInfluencer, color: "hsl(152 55% 35%)", path: "/influencers" },
        ].map((chart) => (
          <div key={chart.title} className="glass-card p-6 cursor-pointer hover:bg-secondary/20 transition-all" onClick={() => navigate(chart.path)}>
            <h3 className="text-sm font-semibold text-foreground mb-5">{chart.title}</h3>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={chart.data} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(0 0% 15%)" />
                <XAxis type="number" stroke="hsl(0 0% 40%)" fontSize={10} />
                <YAxis dataKey="name" type="category" stroke="hsl(0 0% 40%)" fontSize={10} width={80} />
                <Tooltip contentStyle={ct} />
                <Bar dataKey="value" fill={chart.color} radius={[0, 3, 3, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ))}
      </div>

      {/* Alerts + Quick Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 glass-card p-6">
          <h3 className="text-sm font-semibold text-foreground mb-5">Alertas Operacionais</h3>
          <div className="space-y-2">
            {alertas.map((a, i) => (
              <div
                key={i}
                onClick={() => navigate(a.path)}
                className={`flex items-start gap-3 p-4 rounded-lg border cursor-pointer hover:bg-secondary/30 transition-all duration-200 group ${a.tipo === "danger" ? "border-destructive/20" : a.tipo === "success" ? "border-success/20" : a.tipo === "info" ? "border-info/20" : "border-warning/20"}`}
              >
                <a.icon size={15} className={`mt-0.5 shrink-0 ${a.tipo === "danger" ? "text-destructive" : a.tipo === "success" ? "text-success" : a.tipo === "info" ? "text-info" : "text-warning"}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{a.titulo}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{a.desc}</p>
                </div>
                <span className="text-[10px] text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 shrink-0 mt-0.5">
                  {a.cta} <ExternalLink size={10} />
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="glass-card p-6">
          <h3 className="text-sm font-semibold text-foreground mb-5">Resumo Rápido da Semana</h3>
          <div className="space-y-3">
            {resumoRapido.map((r, i) => (
              <div
                key={i}
                onClick={() => navigate(r.path)}
                className="p-4 rounded-lg border border-border cursor-pointer hover:bg-secondary/30 transition-all duration-200 group"
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <r.icon size={13} className="text-muted-foreground" />
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">{r.label}</span>
                </div>
                <p className="text-sm font-semibold">{r.value}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{r.sub}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
