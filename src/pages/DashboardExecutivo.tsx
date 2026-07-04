// DashboardExecutivo - KPI grid always visible (zeros when empty)
import { useMemo } from "react";
import { DollarSign, Users, Wallet, Target, MousePointerClick, Megaphone, ArrowRight, Landmark, TrendingUp, BarChart3, UserCheck, Radio } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useInfluencers, usePlatforms, useCampanhas, useSaques, useSocios, useManagers } from "@/hooks/useSupabaseQuery";
import { useAutoConsolidation } from "@/hooks/useAutoConsolidation";
import { useTrackingMetricsSummary } from "@/hooks/useTrackingMetricsSummary";
import { useFinanceiroData } from "@/hooks/useFinanceiroData";
import { useRealtimeMetrics } from "@/hooks/useRealtimeMetrics";
import { calculateSocioDistribution, readDistributionParams } from "@/lib/financialDistribution";

const formatBRL = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const formatKpiBRL = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2, maximumFractionDigits: 2 });

const COLORS = ["hsl(var(--primary))", "hsl(var(--accent))", "hsl(var(--info, 200 80% 60%))"];

export default function DashboardExecutivo() {
  const navigate = useNavigate();
  useRealtimeMetrics(); // atualiza tudo em tempo real (metrics/events/links/clicks)
  const { data: influencers } = useInfluencers();
  const { data: managers } = useManagers();
  const { data: platforms } = usePlatforms();
  const { data: campanhas } = useCampanhas();
  const { data: saques } = useSaques();
  const { data: socios } = useSocios();
  const { consolidated } = useAutoConsolidation();
  const { summary: metricsSummary, isLoading: loadingMetrics } = useTrackingMetricsSummary("30d");
  const { distribution: officialDistribution, trackingTotals } = useFinanceiroData({ period: "30d" });

  const liveMetrics = useMemo(() => ({
    profitBase: trackingTotals.profitBase || metricsSummary.profitBase || 0,
    revenue: trackingTotals.revShare || metricsSummary.revenue || 0,
    cpa: trackingTotals.cpa || metricsSummary.cpa || 0,
    clicks: metricsSummary.clicks || 0,
    registrations: trackingTotals.registrations || metricsSummary.registrations || 0,
    ftd: trackingTotals.ftd || metricsSummary.ftd || 0,
  }), [metricsSummary, trackingTotals]);

  const totalPagosAsaas = useMemo(
    () => saques.filter((s: any) => s.status === "Pago via Asaas").reduce((a: number, s: any) => a + Number(s.valor || 0), 0),
    [saques],
  );

  const streamers = useMemo(
    () => influencers.filter((i: any) => i.category === "streamer"),
    [influencers],
  );
  const influencersOnly = useMemo(
    () => influencers.filter((i: any) => i.category !== "streamer"),
    [influencers],
  );

  const distribuicao = useMemo(() => {
    const params = readDistributionParams();
    const calculated = calculateSocioDistribution(officialDistribution, params, socios as any);
    return {
      base: officialDistribution.profitBase,
      comissao: officialDistribution.influencerCommissionsOwed + officialDistribution.managerCommissionsOwed,
      tax: calculated.tax,
      reserve: calculated.reserve,
      partnersPool: calculated.partnersPool,
      porSocio: calculated.partnerRows,
    };
  }, [officialDistribution, socios]);

  // KPIs sempre visíveis - começam em zero e enchem conforme tracking + Asaas chegam
  const kpis = [
    { label: "Caixa Asaas", value: formatBRL(totalPagosAsaas), sub: "Pago no período", icon: Landmark, path: "/financeiro" },
    { label: "Lucro Real", value: loadingMetrics ? "…" : formatKpiBRL(liveMetrics.profitBase), sub: "Base de distribuição", icon: DollarSign, path: "/tracking" },
    { label: "RevShare", value: loadingMetrics ? "…" : formatKpiBRL(liveMetrics.revenue), sub: "Comissão Rev importada", icon: TrendingUp, path: "/tracking" },
    { label: "CPA", value: loadingMetrics ? "…" : formatKpiBRL(liveMetrics.cpa), sub: "Comissão CPA importada", icon: Wallet, path: "/tracking" },
    { label: "Cliques", value: String(liveMetrics.clicks || consolidated.outboundClickCount || 0), sub: "Painel oficial / LP", icon: MousePointerClick, path: "/tracking/events" },
    { label: "Registros", value: String(liveMetrics.registrations || consolidated.totalRegistrations || 0), sub: "Cadastros confirmados", icon: UserCheck, path: "/tracking" },
    { label: "FTDs", value: String(liveMetrics.ftd || consolidated.totalFtd || 0), sub: "First-time deposits", icon: Target, path: "/tracking" },
    { label: "Visitas LP", value: String(consolidated.lpViewCount || 0), sub: "Aberturas reais da LP", icon: TrendingUp, path: "/tracking/events" },
    { label: "Campanhas", value: String(campanhas.length || 0), sub: `${campanhas.filter((c: any) => c.status === "Ativa").length} ativas`, icon: Megaphone, path: "/campanhas" },
  ];

  const elenco = [
    { label: "Influencers", value: influencersOnly.length, icon: Users, path: "/pessoas" },
    { label: "Streamers", value: streamers.length, icon: Radio, path: "/pessoas" },
    { label: "Gerentes", value: managers.length, icon: UserCheck, path: "/pessoas" },
    { label: "Plataformas", value: platforms.length, icon: BarChart3, path: "/plataformas" },
  ];

  return (
    <div className="space-y-8 max-w-[1400px]">
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1.5">
            Base zerada - os números aumentam à medida que cliques, depósitos e o caixa do Asaas chegam.
          </p>
        </div>
        <button
          onClick={() => navigate("/financeiro")}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5"
        >
          Ir para Financeiro <ArrowRight size={12} />
        </button>
      </div>

      {/* KPIs sempre visíveis */}
      <section>
        <h2 className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium mb-3">Operação</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {kpis.map((k) => (
            <button
              key={k.label}
              onClick={() => navigate(k.path)}
              className="glass-card p-5 text-left hover:bg-secondary/30 transition-all"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">{k.label}</span>
                <k.icon size={13} className="text-muted-foreground" />
              </div>
              <div className="text-2xl font-bold tracking-tight tabular-nums">{k.value}</div>
              <p className="text-[10px] text-muted-foreground mt-0.5">{k.sub}</p>
            </button>
          ))}
        </div>
      </section>

      {/* Elenco */}
      <section>
        <h2 className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium mb-3">Elenco</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {elenco.map((e) => (
            <button
              key={e.label}
              onClick={() => navigate(e.path)}
              className="glass-card p-4 text-left hover:bg-secondary/30 transition-all flex items-center gap-3"
            >
              <div className="w-9 h-9 rounded-md bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <e.icon size={16} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground">{e.label}</p>
                <p className="text-xl font-bold tabular-nums">{e.value}</p>
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* Distribuição Societária */}
      <section className="glass-card p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-semibold flex items-center gap-2">
              <Users size={14} className="text-accent" />
              Distribuição Societária
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {distribuicao.base > 0
                ? "Calculada sobre lucro real importado (RevShare + CPA), descontando só links atribuídos"
                : "Aguardando primeiro fechamento (caixa Asaas ou lucro real importado)."}
            </p>
          </div>
          <button onClick={() => navigate("/financeiro")} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
            Detalhes <ArrowRight size={11} />
          </button>
        </div>

        <div className="grid lg:grid-cols-2 gap-5">
          <div className="bg-secondary/30 rounded-lg p-4 font-mono text-xs space-y-1.5">
            <div className="flex justify-between">
              <span className="text-accent">Lucro real importado</span>
              <span className="font-semibold tabular-nums">{formatBRL(distribuicao.base)}</span>
            </div>
            <div className="flex justify-between text-success">
              <span>− Comissões atribuídas (influencer/gerente)</span>
              <span className="tabular-nums">- {formatBRL(distribuicao.comissao)}</span>
            </div>
            <div className="flex justify-between text-primary">
              <span>− Imposto/provisão (15%)</span>
              <span className="tabular-nums">- {formatBRL(distribuicao.tax)}</span>
            </div>
            <div className="flex justify-between text-primary">
              <span>− Reserva PlayBet (10%)</span>
              <span className="tabular-nums">- {formatBRL(distribuicao.reserve)}</span>
            </div>
            <div className="h-px bg-border my-1.5" />
            <div className="flex justify-between font-bold text-primary">
              <span>= Saldo dos sócios</span>
              <span className="tabular-nums">{formatBRL(Math.max(0, distribuicao.partnersPool))}</span>
            </div>
          </div>

          <div className="space-y-2">
            {distribuicao.porSocio.length === 0 ? (
              <p className="text-xs text-muted-foreground p-3">Nenhum sócio cadastrado.</p>
            ) : (
              distribuicao.porSocio.map((s, i) => (
                <div key={s.nome} className="flex items-center gap-3 bg-secondary/20 rounded-lg p-3 border border-border/50">
                  <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{s.nome}</p>
                    <p className="text-[10px] text-muted-foreground">{s.normalizedPct.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}% de participação</p>
                  </div>
                  <p className="text-base font-bold tabular-nums">{formatBRL(Math.max(0, s.amount))}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
