import { useMemo } from "react";
import { DollarSign, Users, Wallet, BarChart3, Target, MousePointerClick, Megaphone, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useInfluencers, useGames, usePlatforms, useCampanhas, useSaques, useSocios } from "@/hooks/useSupabaseQuery";
import { useAutoConsolidation } from "@/hooks/useAutoConsolidation";
import EmptyState from "@/components/EmptyState";
import TrackingOverviewCard from "@/components/TrackingOverviewCard";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line, PieChart, Pie, Cell } from "recharts";

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

const COLORS = ["hsl(var(--primary))", "hsl(var(--accent))", "hsl(var(--info, 200 80% 60%))", "hsl(var(--success, 140 60% 50%))", "hsl(var(--warning, 40 90% 60%))"];

export default function DashboardExecutivo() {
  const navigate = useNavigate();
  const { data: influencers } = useInfluencers();
  const { data: games } = useGames();
  const { data: platforms } = usePlatforms();
  const { data: campanhas } = useCampanhas();
  const { data: saques } = useSaques();
  const { data: socios } = useSocios();
  const { consolidated, hasData: hasTrackingData } = useAutoConsolidation();

  const hasData = influencers.length > 0 || games.length > 0 || platforms.length > 0 || campanhas.length > 0;

  const saquesByMonth = useMemo(() => groupByMonth(saques, "data"), [saques]);
  const campanhasByMonth = useMemo(() => groupByMonth(campanhas, "created_at"), [campanhas]);

  const statusDist = useMemo(() => {
    const map: Record<string, number> = {};
    campanhas.forEach((c: any) => { const s = c.status || "Sem status"; map[s] = (map[s] || 0) + 1; });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [campanhas]);

  const totalSaquesValor = useMemo(() => saques.reduce((a: number, s: any) => a + Number(s.valor || 0), 0), [saques]);

  const formatBRL = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  // Revenue: only from tracking with verified conversion
  const hasVerifiedRevenue = hasTrackingData && consolidated.revenueBrl > 0;

  const kpis = [
    ...(hasVerifiedRevenue
      ? [{ label: "Revenue Tracking", value: formatBRL(consolidated.revenueBrl), icon: DollarSign, path: "/tracking" }]
      : []),
    { label: "Cliques Reais (LP)", value: String(consolidated.realClicksCount), icon: MousePointerClick, path: "/conversoes" },
    { label: "Saques Solicitados", value: formatBRL(totalSaquesValor), icon: Wallet, path: "/saques" },
    { label: "Influencers Ativos", value: String(influencers.filter((i: any) => i.is_active).length), icon: Users, path: "/influencers" },
    { label: "Campanhas", value: String(campanhas.length), icon: Megaphone, path: "/campanhas" },
    { label: "Eventos Tracking", value: String(consolidated.eventCount), icon: Target, path: "/tracking" },
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
          <div className={`grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-${kpis.length > 5 ? 6 : kpis.length} gap-4`}>
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

          {/* Tracking Revenue Detail - only with verified data */}
          {hasVerifiedRevenue && (
            <div className="glass-card p-6">
              <h3 className="text-sm font-semibold mb-1">Revenue do Tracking</h3>
              <p className="text-xs text-muted-foreground mb-3">Consolidado automático — apenas eventos com conversão rastreável</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {Object.entries(consolidated.byCurrency).map(([currency, data]) => (
                  <div key={currency} className="bg-secondary/30 rounded-lg p-3 border border-border/50">
                    <p className="text-[10px] text-muted-foreground uppercase">Revenue ({currency})</p>
                    <p className="text-lg font-bold">{data.total.toLocaleString("pt-BR", { style: "currency", currency: currency === "BRL" ? "BRL" : "USD" })}</p>
                    {currency !== "BRL" && data.rate && (
                      <p className="text-[10px] text-muted-foreground mt-0.5">≈ {formatBRL(data.convertedBrl)} · 1 {currency} = R$ {data.rate.toFixed(4)}</p>
                    )}
                  </div>
                ))}
                <div className="bg-secondary/30 rounded-lg p-3 border border-border/50">
                  <p className="text-[10px] text-muted-foreground uppercase">Total em BRL</p>
                  <p className="text-lg font-bold text-primary">{formatBRL(consolidated.revenueBrl)}</p>
                </div>
                <div className="bg-secondary/30 rounded-lg p-3 border border-border/50">
                  <p className="text-[10px] text-muted-foreground uppercase">FTD / Registros</p>
                  <p className="text-lg font-bold">{consolidated.totalFtd} / {consolidated.totalRegistrations}</p>
                </div>
              </div>
            </div>
          )}

          {/* Tracking Overview Card */}
          <TrackingOverviewCard />

          {/* Charts Row 1 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
                { label: "Ver Tracking Hub", path: "/tracking" },
                { label: "Gestão Financeira", path: "/financeiro" },
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
