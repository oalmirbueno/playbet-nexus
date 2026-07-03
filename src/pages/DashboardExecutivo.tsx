// DashboardExecutivo - KPI grid always visible (zeros when empty)
import { useMemo } from "react";
import { DollarSign, Users, Wallet, Target, MousePointerClick, Megaphone, ArrowRight, Landmark, TrendingUp, BarChart3, UserCheck, Radio } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useInfluencers, usePlatforms, useCampanhas, useSaques, useSocios, useManagers } from "@/hooks/useSupabaseQuery";
import { useAutoConsolidation } from "@/hooks/useAutoConsolidation";
import { useTrackingMetricsSummary } from "@/hooks/useTrackingMetricsSummary";

const formatBRL = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const COLORS = ["hsl(var(--primary))", "hsl(var(--accent))", "hsl(var(--info, 200 80% 60%))"];

export default function DashboardExecutivo() {
  const navigate = useNavigate();
  const { data: influencers } = useInfluencers();
  const { data: managers } = useManagers();
  const { data: platforms } = usePlatforms();
  const { data: campanhas } = useCampanhas();
  const { data: saques } = useSaques();
  const { data: socios } = useSocios();
  const { consolidated } = useAutoConsolidation();
  const { summary: metricsSummary } = useTrackingMetricsSummary("30d");

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

  const mediaComissaoInfluencer = useMemo(
    () => (influencersOnly.length
      ? influencersOnly.reduce((a: number, i: any) => a + Number(i.commission_percent || 0), 0) / influencersOnly.length
      : 0),
    [influencersOnly],
  );

  const distribuicao = useMemo(() => {
    const baseCaixa = totalPagosAsaas;
    const basePlataforma = metricsSummary.profitBase;
    const base = baseCaixa > 0 ? baseCaixa : basePlataforma;
    const fonte = baseCaixa > 0 ? ("caixa" as const) : ("plataforma" as const);
    const comissao = base * (mediaComissaoInfluencer / 100);
    const operacional = base * 0.10;
    const baseSocietaria = base - comissao - operacional;
    return {
      base, fonte, comissao, operacional, baseSocietaria,
      porSocio: socios.map((s: any) => ({
        nome: s.nome,
        participacao: Number(s.participacao || 0),
        valor: baseSocietaria * (Number(s.participacao || 0) / 100),
      })),
    };
  }, [totalPagosAsaas, metricsSummary.profitBase, socios, mediaComissaoInfluencer]);

  // KPIs sempre visíveis - começam em zero e enchem conforme tracking + Asaas chegam
  const kpis = [
    { label: "Caixa Asaas", value: formatBRL(totalPagosAsaas), sub: "Pago no período", icon: Landmark, path: "/financeiro" },
    { label: "Lucro Real", value: formatBRL(metricsSummary.profitBase || 0), sub: "RevShare + CPA importado", icon: DollarSign, path: "/tracking" },
    { label: "Depósitos", value: formatBRL(metricsSummary.depositsTotal || 0), sub: `${metricsSummary.depositsCount || 0} transações`, icon: Wallet, path: "/tracking" },
    { label: "Cliques saída", value: String(consolidated.outboundClickCount || 0), sub: "Botão da LP / afiliado", icon: MousePointerClick, path: "/tracking/events" },
    { label: "Registros", value: String(metricsSummary.registrations || consolidated.totalRegistrations || 0), sub: "Cadastros confirmados", icon: UserCheck, path: "/tracking" },
    { label: "FTDs", value: String(metricsSummary.ftd || consolidated.totalFtd || 0), sub: "First-time deposits", icon: Target, path: "/tracking" },
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
                ? distribuicao.fonte === "caixa"
                  ? "Calculada sobre caixa realizado (Asaas)"
                  : "Projeção sobre saldo da plataforma"
                : "Aguardando primeiro fechamento (caixa Asaas ou saldo da plataforma)."}
            </p>
          </div>
          <button onClick={() => navigate("/financeiro")} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
            Detalhes <ArrowRight size={11} />
          </button>
        </div>

        <div className="grid lg:grid-cols-2 gap-5">
          <div className="bg-secondary/30 rounded-lg p-4 font-mono text-xs space-y-1.5">
            <div className="flex justify-between">
              <span className="text-accent">{distribuicao.fonte === "caixa" ? "Caixa Realizado" : "Saldo Plataforma"}</span>
              <span className="font-semibold tabular-nums">{formatBRL(distribuicao.base)}</span>
            </div>
            <div className="flex justify-between text-success">
              <span>− Comissão Influencers ({mediaComissaoInfluencer.toFixed(1)}%)</span>
              <span className="tabular-nums">- {formatBRL(distribuicao.comissao)}</span>
            </div>
            <div className="flex justify-between text-primary">
              <span>− Retenção Operacional (10%)</span>
              <span className="tabular-nums">- {formatBRL(distribuicao.operacional)}</span>
            </div>
            <div className="h-px bg-border my-1.5" />
            <div className="flex justify-between font-bold text-primary">
              <span>= Base Societária</span>
              <span className="tabular-nums">{formatBRL(Math.max(0, distribuicao.baseSocietaria))}</span>
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
                    <p className="text-[10px] text-muted-foreground">{s.participacao}% de participação</p>
                  </div>
                  <p className="text-base font-bold tabular-nums">{formatBRL(Math.max(0, s.valor))}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
