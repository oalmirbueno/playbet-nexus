// DashboardExecutivo — visão real e enxuta da operação
import { useMemo } from "react";
import { DollarSign, Users, Wallet, Target, MousePointerClick, Megaphone, ArrowRight, Landmark, TrendingUp, BarChart3 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useInfluencers, usePlatforms, useCampanhas, useSaques, useSocios } from "@/hooks/useSupabaseQuery";
import { useAutoConsolidation } from "@/hooks/useAutoConsolidation";
import EmptyState from "@/components/EmptyState";

const formatBRL = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const fmtCurrency = (v: number, c: string) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: c === "BRL" ? "BRL" : "USD" });

const COLORS = ["hsl(var(--primary))", "hsl(var(--accent))", "hsl(var(--info, 200 80% 60%))"];

export default function DashboardExecutivo() {
  const navigate = useNavigate();
  const { data: influencers } = useInfluencers();
  const { data: platforms } = usePlatforms();
  const { data: campanhas } = useCampanhas();
  const { data: saques } = useSaques();
  const { data: socios } = useSocios();
  const { consolidated, hasData: hasTrackingData } = useAutoConsolidation();

  const totalPagosAsaas = useMemo(
    () => saques.filter((s: any) => s.status === "Pago via Asaas").reduce((a: number, s: any) => a + Number(s.valor || 0), 0),
    [saques]
  );

  const mediaComissaoInfluencer = useMemo(
    () => (influencers.length ? influencers.reduce((a: number, i: any) => a + Number(i.commission_percent || 0), 0) / influencers.length : 0),
    [influencers]
  );

  const distribuicao = useMemo(() => {
    const baseCaixa = totalPagosAsaas;
    const basePlataforma = consolidated.latestWithdrawableBrl || consolidated.latestWithdrawableOriginal || 0;
    const base = baseCaixa > 0 ? baseCaixa : basePlataforma;
    if (base <= 0 || socios.length === 0) return null;
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
  }, [totalPagosAsaas, consolidated, socios, mediaComissaoInfluencer]);

  // Only real, settled numbers — nothing else
  const hasAnyReal =
    hasTrackingData ||
    totalPagosAsaas > 0 ||
    influencers.length > 0 ||
    platforms.length > 0 ||
    campanhas.length > 0 ||
    socios.length > 0;

  const revCurrency = consolidated.revenueOriginalCurrency || "BRL";
  const revenueDisplay =
    consolidated.revenueBrl > 0
      ? revCurrency !== "BRL"
        ? fmtCurrency(consolidated.revenueOriginal, revCurrency)
        : formatBRL(consolidated.revenueBrl)
      : null;

  const availableDisplay =
    (consolidated.latestWithdrawableOriginal ?? 0) > 0 || (consolidated.latestWithdrawableBrl ?? 0) > 0
      ? consolidated.latestWithdrawableCurrency && consolidated.latestWithdrawableCurrency !== "BRL"
        ? fmtCurrency(consolidated.latestWithdrawableOriginal || 0, consolidated.latestWithdrawableCurrency)
        : formatBRL(consolidated.latestWithdrawableBrl || consolidated.latestWithdrawableOriginal || 0)
      : null;

  // Build KPIs only with real data
  const realKpis = [
    revenueDisplay && {
      label: "Receita Real",
      value: revenueDisplay,
      sub: revCurrency !== "BRL" ? `≈ ${formatBRL(consolidated.revenueBrl)}` : "Postbacks validados",
      icon: DollarSign, path: "/tracking",
    },
    totalPagosAsaas > 0 && {
      label: "Caixa Realizado",
      value: formatBRL(totalPagosAsaas),
      sub: "Pago via Asaas",
      icon: Landmark, path: "/financeiro",
    },
    availableDisplay && {
      label: "Saldo Plataforma",
      value: availableDisplay,
      sub: "Sacável agora",
      icon: Wallet, path: "/tracking",
    },
    consolidated.totalFtd > 0 && {
      label: "FTDs",
      value: String(consolidated.totalFtd),
      sub: `${consolidated.totalRegistrations} registros`,
      icon: Target, path: "/tracking",
    },
    consolidated.realClicksCount > 0 && {
      label: "Cliques Reais",
      value: String(consolidated.realClicksCount),
      sub: "LP validados",
      icon: MousePointerClick, path: "/conversoes",
    },
    consolidated.eventCount > 0 && {
      label: "Eventos",
      value: String(consolidated.eventCount),
      sub: "Tracking validado",
      icon: TrendingUp, path: "/tracking",
    },
    campanhas.length > 0 && {
      label: "Campanhas",
      value: String(campanhas.length),
      sub: `${campanhas.filter((c: any) => c.status === "Ativa").length} ativas`,
      icon: Megaphone, path: "/campanhas",
    },
    influencers.length > 0 && {
      label: "Influencers",
      value: String(influencers.filter((i: any) => i.is_active).length),
      sub: `${influencers.length} no total`,
      icon: Users, path: "/pessoas",
    },
  ].filter(Boolean) as Array<{ label: string; value: string; sub: string; icon: any; path: string }>;

  return (
    <div className="space-y-8 max-w-[1400px]">
      {/* Header */}
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1.5">Visão real da operação — apenas dados validados.</p>
        </div>
        {hasAnyReal && (
          <button
            onClick={() => navigate("/financeiro")}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5"
          >
            Ir para Financeiro <ArrowRight size={12} />
          </button>
        )}
      </div>

      {!hasAnyReal ? (
        <div className="glass-card">
          <EmptyState
            icon={BarChart3}
            title="Sem dados reais ainda"
            description="Conecte uma plataforma e configure o tracking para ver os números reais aqui."
            actionLabel="Configurar Tracking"
            onAction={() => navigate("/tracking")}
            secondaryLabel="Cadastrar Plataforma"
            onSecondary={() => navigate("/plataformas")}
          />
        </div>
      ) : (
        <>
          {/* KPIs reais — só o que existe */}
          {realKpis.length > 0 && (
            <section>
              <h2 className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium mb-3">Números reais</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {realKpis.map((k) => (
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
          )}

          {/* Distribuição Societária */}
          {distribuicao && (
            <section className="glass-card p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-sm font-semibold flex items-center gap-2">
                    <Users size={14} className="text-accent" />
                    Distribuição Societária
                  </h2>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {distribuicao.fonte === "caixa" ? "Calculada sobre caixa realizado (Asaas)" : "Projeção sobre saldo da plataforma"}
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
                    <span className="tabular-nums">{formatBRL(distribuicao.baseSocietaria)}</span>
                  </div>
                </div>

                <div className="space-y-2">
                  {distribuicao.porSocio.map((s, i) => (
                    <div key={s.nome} className="flex items-center gap-3 bg-secondary/20 rounded-lg p-3 border border-border/50">
                      <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{s.nome}</p>
                        <p className="text-[10px] text-muted-foreground">{s.participacao}% de participação</p>
                      </div>
                      <p className="text-base font-bold tabular-nums">{formatBRL(s.valor)}</p>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          )}

          {/* Atalhos */}
          <section className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { label: "Tracking", desc: "Eventos e revenue real", path: "/tracking", icon: BarChart3 },
              { label: "Financeiro", desc: "Distribuição e saques", path: "/financeiro", icon: DollarSign },
              { label: "Pessoas", desc: "Influencers e gerentes", path: "/pessoas", icon: Users },
            ].map((item) => (
              <button
                key={item.label}
                onClick={() => navigate(item.path)}
                className="glass-card p-4 text-left hover:bg-secondary/30 transition-colors flex items-center gap-3"
              >
                <div className="w-9 h-9 rounded-md bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <item.icon size={16} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{item.label}</p>
                  <p className="text-[11px] text-muted-foreground truncate">{item.desc}</p>
                </div>
                <ArrowRight size={13} className="text-muted-foreground shrink-0" />
              </button>
            ))}
          </section>
        </>
      )}
    </div>
  );
}
