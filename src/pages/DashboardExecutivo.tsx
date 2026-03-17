// DashboardExecutivo - consolidated view
import { useMemo } from "react";
import { DollarSign, Users, Wallet, BarChart3, Target, MousePointerClick, Megaphone, ArrowRight, Landmark, Clock, TrendingUp } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useInfluencers, useGames, usePlatforms, useCampanhas, useSaques, useSocios } from "@/hooks/useSupabaseQuery";
import { useAutoConsolidation } from "@/hooks/useAutoConsolidation";
import EmptyState from "@/components/EmptyState";
import TrackingOverviewCard from "@/components/TrackingOverviewCard";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, PieChart, Pie, Cell, AreaChart, Area } from "recharts";

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

const formatBRL = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const fmtCurrency = (v: number, c: string) => v.toLocaleString("pt-BR", { style: "currency", currency: c === "BRL" ? "BRL" : "USD" });

export default function DashboardExecutivo() {
  const navigate = useNavigate();
  const { data: influencers } = useInfluencers();
  const { data: games } = useGames();
  const { data: platforms } = usePlatforms();
  const { data: campanhas } = useCampanhas();
  const { data: saques } = useSaques();
  const { data: socios } = useSocios();
  const { consolidated, hasData: hasTrackingData, isLoading: isTrackingLoading } = useAutoConsolidation();

  const hasData = isTrackingLoading || influencers.length > 0 || games.length > 0 || platforms.length > 0 || campanhas.length > 0 || hasTrackingData || socios.length > 0;

  const saquesByMonth = useMemo(() => groupByMonth(saques, "data"), [saques]);

  const statusDist = useMemo(() => {
    const map: Record<string, number> = {};
    campanhas.forEach((c: any) => { const s = c.status || "Sem status"; map[s] = (map[s] || 0) + 1; });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [campanhas]);

  const totalPagosAsaas = useMemo(() =>
    saques.filter((s: any) => s.status === "Pago via Asaas").reduce((a: number, s: any) => a + Number(s.valor || 0), 0),
    [saques]
  );

  const totalDisponivelSocios = useMemo(() =>
    socios.reduce((a: number, s: any) => a + Number(s.disponivel || 0), 0),
    [socios]
  );

  const hasVerifiedRevenue = hasTrackingData && (consolidated.revenueOriginal > 0 || consolidated.revenueBrl > 0);
  const hasAvailableBalance = hasVerifiedRevenue;
  const hasCaixaRealizado = totalPagosAsaas > 0;
  const showOriginalRevenueAsPrimary =
    hasVerifiedRevenue && !consolidated.hasMultipleCurrencies && consolidated.revenueOriginalCurrency !== "BRL";
  const revenueValue = hasVerifiedRevenue
    ? showOriginalRevenueAsPrimary
      ? fmtCurrency(consolidated.revenueOriginal, consolidated.revenueOriginalCurrency)
      : formatBRL(consolidated.revenueBrl)
    : "—";
  const revenueSub = hasVerifiedRevenue
    ? showOriginalRevenueAsPrimary
      ? `≈ ${formatBRL(consolidated.revenueBrl)} · revenue reportado`
      : "Não é caixa — apenas revenue reportado"
    : "Aguardando postbacks";
  const availableBalanceValue = hasVerifiedRevenue
    ? showOriginalRevenueAsPrimary
      ? fmtCurrency(consolidated.revenueOriginal, consolidated.revenueOriginalCurrency)
      : formatBRL(consolidated.revenueBrl)
    : "—";
  const availableBalanceSub = hasVerifiedRevenue
    ? showOriginalRevenueAsPrimary
      ? `≈ ${formatBRL(consolidated.revenueBrl)} · saldo = revenue acumulado`
      : "Saldo = revenue acumulado"
    : "Aguardando postbacks";

  // 8 KPIs — always visible
  const kpis = [
    {
      label: "Revenue Plataforma",
      value: revenueValue,
      icon: DollarSign,
      path: "/tracking",
      sub: revenueSub,
      pending: !hasVerifiedRevenue,
    },
    {
      label: "Cliques Reais (LP)",
      value: String(consolidated.realClicksCount),
      icon: MousePointerClick,
      path: "/conversoes",
      sub: consolidated.realClicksCount > 0 ? `${consolidated.realClicksCount} cliques reais da LP` : "Aguardando cliques",
      pending: !hasTrackingData && consolidated.realClicksCount === 0,
    },
    {
      label: "Registros",
      value: String(consolidated.totalRegistrations),
      icon: Users,
      path: "/tracking",
      sub: hasTrackingData ? `${consolidated.totalRegistrations} registrations reais` : "Aguardando postbacks",
      pending: !hasTrackingData,
    },
    {
      label: "FTD",
      value: String(consolidated.totalFtd),
      icon: Target,
      path: "/tracking",
      sub: hasTrackingData ? `${consolidated.totalFtd} first-time deposits` : "Aguardando postbacks",
      pending: !hasTrackingData,
    },
    {
      label: "Caixa Realizado",
      value: hasCaixaRealizado ? formatBRL(totalPagosAsaas) : "—",
      icon: Landmark,
      path: "/financeiro",
      sub: hasCaixaRealizado ? "Pago via Asaas" : "Aguardando saques pagos",
      pending: !hasCaixaRealizado,
    },
    {
      label: "Saldo Disponível",
      value: availableBalanceValue,
      icon: Wallet,
      path: "/tracking",
      sub: availableBalanceSub,
      pending: !hasAvailableBalance,
    },
    {
      label: "Campanhas",
      value: String(campanhas.length),
      icon: Megaphone,
      path: "/campanhas",
      sub: campanhas.length > 0 ? `${campanhas.filter((c: any) => c.status === "Ativa").length} ativa(s)` : "Sem campanhas",
      pending: campanhas.length === 0,
    },
    {
      label: "Eventos Tracking",
      value: String(consolidated.eventCount),
      icon: TrendingUp,
      path: "/tracking",
      sub: hasTrackingData ? `${consolidated.eventCount} validados` : "Aguardando eventos",
      pending: !hasTrackingData,
    },
  ];

  const chartConfig = {
    count: { label: "Quantidade", color: "hsl(var(--primary))" },
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
            description="Cadastre plataformas, jogos e influencers para visualizar métricas."
            actionLabel="Cadastrar Plataforma"
            onAction={() => navigate("/plataformas")}
            secondaryLabel="Cadastrar Influencer"
            onSecondary={() => navigate("/influencers")}
          />
        </div>
      ) : (
        <>
          {/* KPIs - always all 8 visible */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {kpis.map((k) => (
              <div
                key={k.label}
                onClick={() => navigate(k.path)}
                className={`glass-card p-5 cursor-pointer hover:bg-secondary/30 transition-all duration-200 ${k.pending ? "opacity-70" : ""}`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">{k.label}</span>
                  {k.pending ? (
                    <Clock size={13} className="text-muted-foreground/50" />
                  ) : (
                    <k.icon size={13} className="text-muted-foreground" />
                  )}
                </div>
                <div className={`text-2xl font-bold tracking-tight ${k.pending ? "text-muted-foreground" : ""}`}>{k.value}</div>
                {k.sub && (
                  <p className={`text-[10px] mt-0.5 ${k.pending ? "text-warning" : "text-muted-foreground"}`}>
                    {k.sub}
                  </p>
                )}
              </div>
            ))}
          </div>

          {/* Revenue Detail */}
          {(hasVerifiedRevenue || hasAvailableBalance) && (
            <div className="glass-card p-6 border-l-4 border-l-primary">
              <div className="flex items-center gap-2 mb-1">
                <DollarSign size={14} className="text-primary" />
                <h3 className="text-sm font-semibold">Plataforma em tempo real</h3>
              </div>
              <p className="text-xs text-muted-foreground mb-3">Receita recebida por postback e saldo sacável atual da plataforma.</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {Object.entries(consolidated.byCurrency).map(([currency, data]) => (
                  <div key={currency} className="bg-secondary/30 rounded-lg p-3 border border-border/50">
                    <p className="text-[10px] text-muted-foreground uppercase">Revenue ({currency})</p>
                    <p className="text-lg font-bold">{fmtCurrency(data.total, currency)}</p>
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
                  <p className="text-[10px] text-muted-foreground uppercase">Saldo disponível</p>
                  <p className="text-lg font-bold text-primary">{availableBalanceValue}</p>
                  {hasVerifiedRevenue && showOriginalRevenueAsPrimary && (
                    <p className="text-[10px] text-muted-foreground mt-0.5">≈ {formatBRL(consolidated.revenueBrl)}</p>
                  )}
                </div>
                <div className="bg-secondary/30 rounded-lg p-3 border border-border/50">
                  <p className="text-[10px] text-muted-foreground uppercase">Funil</p>
                  <p className="text-sm font-bold">{consolidated.realClicksCount} cliques → {consolidated.totalRegistrations} reg → {consolidated.totalFtd} FTD</p>
                </div>
              </div>
            </div>
          )}

          {/* Bloco Societário — ALWAYS visible */}
          <div className="glass-card p-6 border-l-4 border-l-accent">
            <div className="flex items-center gap-2 mb-1">
              <Users size={14} className="text-accent" />
              <h3 className="text-sm font-semibold">Status Societário</h3>
            </div>
            <p className="text-xs text-muted-foreground mb-3">
              {hasCaixaRealizado
                ? "Distribuição calculada sobre caixa realizado."
                : "Aguardando caixa realizado (saque + Asaas) para cálculo de distribuição."}
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-secondary/30 rounded-lg p-3 border border-border/50">
                <p className="text-[10px] text-muted-foreground uppercase">Sócios</p>
                <p className="text-lg font-bold">{socios.length > 0 ? socios.length : "—"}</p>
                {socios.length === 0 && <p className="text-[10px] text-warning">Nenhum sócio cadastrado</p>}
                {socios.length > 0 && (
                  <div className="mt-1 space-y-0.5">
                    {socios.slice(0, 3).map((s: any) => (
                      <p key={s.id} className="text-[10px] text-muted-foreground">{s.nome} · {s.participacao}%</p>
                    ))}
                  </div>
                )}
              </div>
              <div className="bg-secondary/30 rounded-lg p-3 border border-border/50">
                <p className="text-[10px] text-muted-foreground uppercase">Saldo Sócios (declarado)</p>
                <p className="text-lg font-bold">{totalDisponivelSocios > 0 ? formatBRL(totalDisponivelSocios) : "—"}</p>
                <p className="text-[10px] text-muted-foreground">Origem: cadastro manual</p>
              </div>
              <div className="bg-secondary/30 rounded-lg p-3 border border-border/50">
                <p className="text-[10px] text-muted-foreground uppercase">Caixa Realizado</p>
                <p className={`text-lg font-bold ${hasCaixaRealizado ? "text-success" : "text-muted-foreground"}`}>
                  {hasCaixaRealizado ? formatBRL(totalPagosAsaas) : "—"}
                </p>
                <p className="text-[10px] text-muted-foreground">{hasCaixaRealizado ? "Pago via Asaas" : "Aguardando integração Asaas"}</p>
              </div>
              <div className="bg-secondary/30 rounded-lg p-3 border border-border/50">
                <p className="text-[10px] text-muted-foreground uppercase">Influencers Ativos</p>
                <p className="text-lg font-bold">{influencers.filter((i: any) => i.is_active).length}</p>
              </div>
            </div>
          </div>

          {/* Tracking Overview */}
          <TrackingOverviewCard />

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
                <div key={item.label} onClick={() => navigate(item.path)} className="flex items-center gap-3 p-3.5 rounded-lg bg-secondary/30 border border-border cursor-pointer hover:bg-secondary/50 transition-colors">
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
