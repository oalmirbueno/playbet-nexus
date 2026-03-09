import { useEffect, useState, useMemo } from "react";
import { DollarSign, Users, Wallet, BarChart3, Target, Zap, ArrowRight, MousePointerClick, Megaphone } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useInfluencers, useGames, usePlatforms, useCampanhas, useSaques, useSocios, useConteudo } from "@/hooks/useSupabaseQuery";
import { clickService } from "@/services/supabaseService";
import type { ClickRow } from "@/services/supabaseService";
import EmptyState from "@/components/EmptyState";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from "recharts";

function groupByMonth(items: any[], dateField: string) {
  const months: Record<string, number> = {};
  items.forEach(item => {
    const val = item[dateField];
    if (!val) return;
    const d = new Date(val);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    months[key] = (months[key] || 0) + 1;
  });
  return Object.entries(months)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, count]) => {
      const [y, m] = month.split("-");
      return { month: `${m}/${y.slice(2)}`, count };
    });
}

function groupByWeek(items: any[], dateField: string) {
  const weeks: Record<string, number> = {};
  items.forEach(item => {
    const val = item[dateField];
    if (!val) return;
    const d = new Date(val);
    const weekStart = new Date(d);
    weekStart.setDate(d.getDate() - d.getDay());
    const key = weekStart.toISOString().split("T")[0];
    weeks[key] = (weeks[key] || 0) + 1;
  });
  return Object.entries(weeks)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-12)
    .map(([date, count]) => {
      const d = new Date(date);
      return { week: `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`, count };
    });
}

const COLORS = ["hsl(var(--primary))", "hsl(var(--accent))", "hsl(var(--info, 200 80% 60%))", "hsl(var(--success, 140 60% 50%))", "hsl(var(--warning, 40 90% 60%))"];

export default function DashboardExecutivo() {
  const navigate = useNavigate();
  const { data: influencers } = useInfluencers();
  const { data: games } = useGames();
  const { data: platforms } = usePlatforms();
  const { data: campanhas } = useCampanhas();
  const { data: saques } = useSaques();
  const { data: socios } = useSocios();
  const { data: conteudos } = useConteudo();
  const [clicks, setClicks] = useState<ClickRow[]>([]);

  useEffect(() => {
    clickService.getAll().then(setClicks).catch(() => {});
  }, []);

  const hasData = influencers.length > 0 || games.length > 0 || platforms.length > 0 || campanhas.length > 0;

  const clicksByWeek = useMemo(() => groupByWeek(clicks, "clicked_at"), [clicks]);
  const saquesByMonth = useMemo(() => groupByMonth(saques, "data"), [saques]);
  const campanhasByMonth = useMemo(() => groupByMonth(campanhas, "created_at"), [campanhas]);

  const statusDist = useMemo(() => {
    const map: Record<string, number> = {};
    campanhas.forEach((c: any) => { const s = c.status || "Sem status"; map[s] = (map[s] || 0) + 1; });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [campanhas]);

  const kpis = [
    { label: "Influencers Ativos", value: String(influencers.filter((i: any) => i.is_active).length), icon: Users, path: "/influencers" },
    { label: "Jogos Ativos", value: String(games.filter((g: any) => g.is_active).length), icon: Zap, path: "/jogos" },
    { label: "Plataformas Ativas", value: String(platforms.filter((p: any) => p.is_active).length), icon: Target, path: "/plataformas" },
    { label: "Campanhas", value: String(campanhas.length), icon: Megaphone, path: "/campanhas" },
    { label: "Cliques Totais", value: String(clicks.length), icon: MousePointerClick, path: "/analytics" },
    { label: "Sócios", value: String(socios.length), icon: Wallet, path: "/socios" },
  ];

  const chartConfig = {
    count: { label: "Quantidade", color: "hsl(var(--primary))" },
    valor: { label: "Valor", color: "hsl(var(--accent))" },
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard Executivo</h1>
        <p className="text-sm text-muted-foreground mt-1">Visão consolidada da operação — dados em tempo real</p>
      </div>

      {!hasData ? (
        <div className="glass-card">
          <EmptyState
            icon={BarChart3}
            title="Sem dados para exibir ainda"
            description="Cadastre plataformas, jogos e influencers para visualizar métricas e indicadores consolidados da operação."
            actionLabel="Cadastrar Plataforma"
            onAction={() => navigate("/plataformas")}
            secondaryLabel="Cadastrar Influencer"
            onSecondary={() => navigate("/influencers")}
          />
        </div>
      ) : (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {kpis.map((k) => (
              <div
                key={k.label}
                onClick={() => navigate(k.path)}
                className="glass-card p-5 cursor-pointer hover:bg-secondary/30 transition-all duration-200"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">{k.label}</span>
                  <k.icon size={13} className="text-muted-foreground" />
                </div>
                <div className="text-2xl font-bold tracking-tight">{k.value}</div>
              </div>
            ))}
          </div>

          {/* Charts Row 1 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Clicks over time */}
            <div className="glass-card p-6">
              <h3 className="text-sm font-semibold mb-1">Evolução de Cliques</h3>
              <p className="text-xs text-muted-foreground mb-4">Últimas 12 semanas</p>
              {clicksByWeek.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-12">Sem dados de cliques</p>
              ) : (
                <ChartContainer config={chartConfig} className="h-[250px] w-full">
                  <AreaChart data={clicksByWeek}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="week" tick={{ fontSize: 11 }} className="text-muted-foreground" />
                    <YAxis tick={{ fontSize: 11 }} className="text-muted-foreground" />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <defs>
                      <linearGradient id="fillClicks" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <Area type="monotone" dataKey="count" stroke="hsl(var(--primary))" fill="url(#fillClicks)" strokeWidth={2} />
                  </AreaChart>
                </ChartContainer>
              )}
            </div>

            {/* Saques over time */}
            <div className="glass-card p-6">
              <h3 className="text-sm font-semibold mb-1">Saques por Mês</h3>
              <p className="text-xs text-muted-foreground mb-4">Distribuição mensal</p>
              {saquesByMonth.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-12">Sem dados de saques</p>
              ) : (
                <ChartContainer config={chartConfig} className="h-[250px] w-full">
                  <BarChart data={saquesByMonth}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ChartContainer>
              )}
            </div>
          </div>

          {/* Charts Row 2 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Campanhas over time */}
            <div className="glass-card p-6">
              <h3 className="text-sm font-semibold mb-1">Campanhas Criadas</h3>
              <p className="text-xs text-muted-foreground mb-4">Evolução mensal</p>
              {campanhasByMonth.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-12">Sem dados de campanhas</p>
              ) : (
                <ChartContainer config={chartConfig} className="h-[250px] w-full">
                  <LineChart data={campanhasByMonth}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Line type="monotone" dataKey="count" stroke="hsl(var(--accent))" strokeWidth={2} dot={{ fill: "hsl(var(--accent))", r: 4 }} />
                  </LineChart>
                </ChartContainer>
              )}
            </div>

            {/* Campanhas by status */}
            <div className="glass-card p-6">
              <h3 className="text-sm font-semibold mb-1">Status das Campanhas</h3>
              <p className="text-xs text-muted-foreground mb-4">Distribuição atual</p>
              {statusDist.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-12">Sem campanhas</p>
              ) : (
                <div className="flex items-center gap-6">
                  <ChartContainer config={chartConfig} className="h-[220px] w-[220px] mx-auto shrink-0">
                    <PieChart>
                      <Pie data={statusDist} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} innerRadius={45} paddingAngle={3}>
                        {statusDist.map((_, i) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Pie>
                      <ChartTooltip content={<ChartTooltipContent />} />
                    </PieChart>
                  </ChartContainer>
                  <div className="space-y-2 flex-1">
                    {statusDist.map((s, i) => (
                      <div key={s.name} className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                        <span className="text-sm flex-1">{s.name}</span>
                        <span className="text-sm font-semibold">{s.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Quick links */}
          <div className="glass-card p-6">
            <h3 className="text-sm font-semibold text-foreground mb-4">Próximos passos</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {[
                { label: "Configurar links e UTMs", path: "/utms" },
                { label: "Criar landing pages", path: "/landing-pages" },
                { label: "Monitorar conversões", path: "/conversoes" },
              ].map((item) => (
                <div
                  key={item.label}
                  onClick={() => navigate(item.path)}
                  className="flex items-center gap-3 p-3.5 rounded-lg bg-secondary/30 border border-border cursor-pointer hover:bg-secondary/50 transition-colors"
                >
                  <span className="text-sm flex-1">{item.label}</span>
                  <ArrowRight size={14} className="text-muted-foreground" />
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
