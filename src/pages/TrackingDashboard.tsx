import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Breadcrumbs from "@/components/Breadcrumbs";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTrackingMetrics, usePlatformAccounts, useTrackingEvents } from "@/hooks/useTrackingData";
import { useInfluencers, useCampanhas, usePlatforms } from "@/hooks/useSupabaseQuery";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip as ReTooltip,
} from "recharts";
import {
  Settings2, CloudDownload, RefreshCcw, TrendingUp, ArrowUpRight, ArrowDownRight,
  Trophy, Sparkle, Eye, UserPlus, MousePointerClick, DollarSign, WalletCards, BadgeDollarSign,
} from "lucide-react";
import HistoricalImportDialog from "@/components/tracking/HistoricalImportDialog";
import { getMetricMoneyParts } from "@/lib/trackingMetrics";

function fmtBRL(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
}
function fmtNum(v: number) {
  if (!Number.isFinite(v)) return "0";
  if (v >= 1_000_000) return (v / 1_000_000).toFixed(1).replace(".", ",") + "M";
  if (v >= 1_000) return (v / 1_000).toFixed(1).replace(".", ",") + "k";
  return v.toLocaleString("pt-BR");
}
function pctStr(a: number, b: number) {
  if (!b) return "0,0%";
  return ((a / b) * 100).toFixed(1).replace(".", ",") + "%";
}

type Period = "hoje" | "7d" | "30d" | "mes";

function periodRange(p: Period): { from?: string; to?: string; label: string } {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  const d = now.getDate();
  const fmt = (dt: Date) => dt.toISOString().slice(0, 10);
  if (p === "hoje") {
    const today = fmt(new Date(y, m, d));
    return { from: today, to: today, label: "Hoje" };
  }
  if (p === "7d") {
    return { from: fmt(new Date(y, m, d - 6)), to: fmt(new Date(y, m, d)), label: "Últimos 7 dias" };
  }
  if (p === "30d") {
    return { from: fmt(new Date(y, m, d - 29)), to: fmt(new Date(y, m, d)), label: "Últimos 30 dias" };
  }
  return { from: fmt(new Date(y, m, 1)), to: fmt(new Date(y, m, d)), label: "Este mês" };
}

export default function TrackingDashboard() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [period, setPeriod] = useState<Period>("30d");
  const [syncing, setSyncing] = useState(false);
  const [showImport, setShowImport] = useState(false);

  const range = useMemo(() => periodRange(period), [period]);
  const filters = useMemo(
    () => ({ date_from: range.from, date_to: range.to }),
    [range.from, range.to],
  );

  const { data: metrics } = useTrackingMetrics(filters);
  const { data: accounts } = usePlatformAccounts();
  const { data: influencers } = useInfluencers();
  const { data: campanhas } = useCampanhas();
  const { data: platforms } = usePlatforms();
  const { data: periodEvents } = useTrackingEvents(filters);

  // Realtime: refresh the dashboard the second a new row lands in
  // tracking_metrics or tracking_events, so the panel scraper cron and the
  // "Atualizar agora" button show up without a manual refresh.
  useEffect(() => {
    const channel = supabase
      .channel("tracking-dashboard-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "tracking_metrics" }, () => {
        qc.invalidateQueries({ queryKey: ["tracking_metrics"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "tracking_events" }, () => {
        qc.invalidateQueries({ queryKey: ["tracking_events"] });
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [qc]);

  const handleSync = async () => {
    setSyncing(true);
    try {
      // Fan out to every configured puller so this button covers ALL
      // platforms (Estrela Bet, VUPI, 1win, …). Panel scraper is the source
      // of truth for Stellar brands; Smartico puller covers other tenants.
      const [panel, smartico] = await Promise.allSettled([
        supabase.functions.invoke("stellar-panel-scraper", { body: { days: 30 } }),
        supabase.functions.invoke("tracking-puller-smartico", { body: { source: "manual", mode: "recent" } }),
      ]);
      const parts: string[] = [];
      if (panel.status === "fulfilled" && !panel.value.error) {
        const d = panel.value.data as { rows?: number; per_brand?: Record<string, number> };
        const brands = d?.per_brand ? Object.entries(d.per_brand).map(([b, n]) => `${b}:${n}`).join(" · ") : "";
        parts.push(`Painel ${d?.rows ?? 0} linhas${brands ? ` (${brands})` : ""}`);
      } else if (panel.status === "fulfilled" && panel.value.error) {
        parts.push(`Painel falhou: ${panel.value.error.message}`);
      }
      if (smartico.status === "fulfilled" && !smartico.value.error) {
        const r = smartico.value.data as { rows_received?: number; upserts?: number };
        parts.push(`Smartico ${r?.rows_received ?? 0}/${r?.upserts ?? 0}`);
      }
      // Force React Query to refetch immediately.
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["tracking_metrics"] }),
        qc.invalidateQueries({ queryKey: ["tracking_events"] }),
        qc.invalidateQueries({ queryKey: ["platform_accounts"] }),
      ]);
      toast.success(`Atualizado em tempo real · ${parts.join(" · ") || "sem novidades"}`);
    } catch (e) {
      toast.error(`Falha ao sincronizar: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setSyncing(false);
    }
  };

  const periodKpis = useMemo(() => {
    return metrics.reduce(
      (acc, m) => {
        const money = getMetricMoneyParts(m);
        return {
          visitas: acc.visitas + (m.cliques || 0),
          cadastros: acc.cadastros + (m.registros || 0),
          ftd: acc.ftd + (m.ftd || 0),
          depositos: acc.depositos + (m.deposits_count || 0),
          volumeDepositos: acc.volumeDepositos + (m.depositos_total || 0),
          receita: acc.receita + money.total,
          cpa: acc.cpa + money.cpa,
          revshare: acc.revshare + money.revShare,
          comissaoTotal: acc.comissaoTotal + money.total,
        };
      },
      { visitas: 0, cadastros: 0, ftd: 0, depositos: 0, volumeDepositos: 0, receita: 0, cpa: 0, revshare: 0, comissaoTotal: 0 },
    );
  }, [metrics]);

  const periodEventKpis = useMemo(() => {
    const visits = periodEvents.filter((e) => e.canonical_event_name === "lp_view").length;
    const outboundClicks = periodEvents.filter((e) => e.canonical_event_name === "click").length;
    const conversions = periodEvents.filter((e) => !["lp_view", "click"].includes(e.canonical_event_name)).length;
    return { visits, outboundClicks, conversions, total: periodEvents.length };
  }, [periodEvents]);

  const kpiVisitas = periodEventKpis.visits;
  const kpiOutboundClicks = periodEventKpis.outboundClicks;
  const kpiCadastros = periodKpis.cadastros;
  const kpiReceita = periodKpis.receita;
  const kpiCpa = periodKpis.cpa;
  const kpiComissaoTotal = periodKpis.comissaoTotal || periodKpis.cpa + periodKpis.revshare;

  const trend = useMemo(() => {
    const map = new Map<string, number>();
    metrics.forEach((m) => {
      map.set(m.data_ref, (map.get(m.data_ref) || 0) + getMetricMoneyParts(m).total);
    });
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, receita]) => ({
        date: date.slice(5),
        receita: Math.round(receita),
      }));
  }, [metrics]);

  const topInfluencers = useMemo(() => {
    const map = new Map<string, { id: string; nome: string; visitas: number; receita: number; cadastros: number }>();
    metrics.forEach((m) => {
      const id = m.influencer_id;
      if (!id) return;
      const inf = (influencers as any[]).find((i: any) => i.id === id);
      const entry = map.get(id) ?? { id, nome: inf?.name || "Sem nome", visitas: 0, receita: 0, cadastros: 0 };
      entry.visitas += m.cliques || 0;
      entry.cadastros += m.registros || 0;
      entry.receita += getMetricMoneyParts(m).total;
      map.set(id, entry);
    });
    return Array.from(map.values()).sort((a, b) => b.receita - a.receita).slice(0, 5);
  }, [metrics, influencers]);

  const topCasas = useMemo(() => {
    const map = new Map<string, { id: string; nome: string; visitas: number; receita: number; cadastros: number }>();
    metrics.forEach((m) => {
      const id = m.platform_id;
      if (!id) return;
      const p = (platforms as any[]).find((x: any) => x.id === id);
      const entry = map.get(id) ?? { id, nome: p?.name || "-", visitas: 0, receita: 0, cadastros: 0 };
      entry.visitas += m.cliques || 0;
      entry.cadastros += m.registros || 0;
      entry.receita += getMetricMoneyParts(m).total;
      map.set(id, entry);
    });
    return Array.from(map.values()).sort((a, b) => b.receita - a.receita).slice(0, 5);
  }, [metrics, platforms]);

  const totalReceitaRanking = Math.max(
    topInfluencers.reduce((s, r) => s + r.receita, 0),
    topCasas.reduce((s, r) => s + r.receita, 0),
    1,
  );

  const lastSyncSource = metrics[0]?.updated_at || metrics[0]?.created_at || periodEvents[0]?.event_timestamp;
  const lastSync = lastSyncSource ? new Date(lastSyncSource) : null;

  const insight = useMemo(() => {
    if (topInfluencers.length === 0 && topCasas.length === 0) {
      return "Conecte ou sincronize uma casa para ver insights de performance aqui.";
    }
    if (topInfluencers[0] && topInfluencers[0].receita > 0) {
      return `${topInfluencers[0].nome} está liderando as conversões neste período. Vale priorizar conteúdo com esse perfil.`;
    }
    if (topCasas[0] && topCasas[0].receita > 0) {
      return `${topCasas[0].nome} é a casa com melhor performance no momento - concentre tráfego nela.`;
    }
    return "Seus links estão ativos. Assim que as primeiras conversões caírem, os insights aparecem aqui.";
  }, [topInfluencers, topCasas]);

  const trendMax = Math.max(...trend.map((t) => t.receita), 1);

  return (
    <div className="space-y-6 animate-fade-in">
      <Breadcrumbs items={[{ label: "Desempenho" }]} />

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="page-header">Desempenho</h1>
          <p className="page-subtitle">
            {range.label} · atualizado{" "}
            {lastSync
              ? lastSync.toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })
              : "-"}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Select value={period} onValueChange={(v) => setPeriod(v as Period)}>
            <SelectTrigger className="h-9 w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="hoje">Hoje</SelectItem>
              <SelectItem value="7d">Últimos 7 dias</SelectItem>
              <SelectItem value="30d">Últimos 30 dias</SelectItem>
              <SelectItem value="mes">Este mês</SelectItem>
            </SelectContent>
          </Select>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-9 gap-2">
                <Settings2 size={14} />
                Avançado
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="text-xs">Operação</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => navigate("/tracking/links")}>Links de rastreio</DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate("/tracking/accounts")}>Contas por casa</DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate("/tracking/events")}>Eventos recebidos</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuLabel className="text-xs">Configuração</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => navigate("/tracking/mappings")}>Mapeamentos</DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate("/tracking/snapshots")}>Snapshots</DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate("/tracking/metrics")}>Registrar métrica manual</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setShowImport(true)}>Importar histórico</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button onClick={handleSync} disabled={syncing} size="sm" className="h-9 gap-2">
            {syncing ? (
              <><RefreshCcw size={14} className="animate-spin" /> Sincronizando…</>
            ) : (
              <><CloudDownload size={14} /> Sincronizar agora</>
            )}
          </Button>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-6 gap-4">
        <KpiCard
          variant="primary"
          icon={<Eye size={16} />}
          label="Visitas"
          value={fmtNum(kpiVisitas)}
          hint="Aberturas da LP · lp_view"
        />
        <KpiCard
          variant="info"
          icon={<MousePointerClick size={16} />}
          label="Cliques saída"
          value={fmtNum(kpiOutboundClicks)}
          hint={kpiVisitas ? `${pctStr(kpiOutboundClicks, kpiVisitas)} CTR` : "Botão da LP / afiliado"}
        />
        <KpiCard
          variant="warning"
          icon={<UserPlus size={16} />}
          label="Cadastros"
          value={fmtNum(kpiCadastros)}
          hint={`${fmtNum(periodKpis.ftd)} FTD/QFTD`}
        />
        <KpiCard
          variant="info"
          icon={<WalletCards size={16} />}
          label="Depósitos"
          value={fmtNum(periodKpis.depositos)}
          hint={fmtBRL(periodKpis.volumeDepositos)}
        />
        <KpiCard
          variant="success"
          icon={<DollarSign size={16} />}
          label="Lucro real"
          value={fmtBRL(kpiReceita)}
          hint={periodKpis.revshare > 0 ? `${fmtBRL(periodKpis.revshare)} RevShare` : "RevShare + CPA importado"}
        />
        <KpiCard
          variant="primary"
          icon={<BadgeDollarSign size={16} />}
          label="CPA"
          value={fmtBRL(kpiCpa)}
          hint={`Comissão total: ${fmtBRL(kpiComissaoTotal)}`}
        />
      </div>

      {/* Trend + insight */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 glass-card p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-sm font-semibold text-foreground">Lucro real ao longo do período</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Em reais (R$)</p>
            </div>
            <TrendingUp size={16} className="text-accent" />
          </div>
          <div className="h-[240px]">
            {trend.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trend} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="rev-grad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.5} />
                      <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                  <YAxis hide domain={[0, trendMax * 1.2]} />
                  <ReTooltip
                    contentStyle={{
                      background: "hsl(var(--popover))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: 8,
                      fontSize: 12,
                      color: "hsl(var(--foreground))",
                    }}
                    formatter={(v: number) => [fmtBRL(v), "Lucro real"]}
                  />
                  <Area
                    type="monotone"
                    dataKey="receita"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    fill="url(#rev-grad)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                Sem receita registrada no período
              </div>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div className="glass-card p-5 border-l-2 border-l-accent">
            <div className="flex items-center gap-2 text-accent text-[11px] font-semibold uppercase tracking-[0.08em] mb-2">
              <Sparkle size={12} /> Insight
            </div>
            <p className="text-sm text-foreground/85 leading-relaxed">{insight}</p>
          </div>

          <div className="glass-card p-5">
            <h3 className="text-sm font-semibold text-foreground mb-4">Status</h3>
            <dl className="space-y-3">
              <StatusRow label="Casas conectadas" value={String(accounts.length)} />
              <StatusRow label="Eventos no período" value={fmtNum(periodEventKpis.total)} />
              <StatusRow
                label="Última atividade"
                value={lastSync ? lastSync.toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) : "-"}
              />
            </dl>
          </div>
        </div>
      </div>

      {/* Rankings */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <RankingCard
          title="Top Influenciadores"
          icon={<Trophy size={14} className="text-accent" />}
          rows={topInfluencers}
          totalReceita={totalReceitaRanking}
          onSeeAll={() => navigate("/influencers")}
          emptyMsg="Nenhum influenciador com receita no período."
        />
        <RankingCard
          title="Top Casas"
          icon={<Trophy size={14} className="text-success" />}
          rows={topCasas}
          totalReceita={totalReceitaRanking}
          onSeeAll={() => navigate("/plataformas")}
          emptyMsg="Nenhuma casa com receita no período."
        />
      </div>

      <HistoricalImportDialog
        open={showImport}
        onOpenChange={setShowImport}
        accounts={accounts}
        platforms={platforms as any[]}
        onSaveMetric={async (data) => {
          const { trackingMetricService } = await import("@/services/trackingService");
          return trackingMetricService.create(data);
        }}
      />
    </div>
  );
}

/* ---------- Subcomponents ---------- */

function KpiCard({
  variant,
  icon,
  label,
  value,
  hint,
  trendUp,
}: {
  variant: "primary" | "info" | "warning" | "success";
  icon: React.ReactNode;
  label: string;
  value: string;
  hint?: string;
  trendUp?: boolean | null;
}) {
  const cls =
    variant === "primary" ? "stat-card-primary" :
    variant === "info" ? "stat-card-info" :
    variant === "warning" ? "stat-card-warning" :
    "stat-card-success";
  const iconColor =
    variant === "primary" ? "text-primary" :
    variant === "info" ? "text-info" :
    variant === "warning" ? "text-warning" :
    "text-success";

  return (
    <div className={cls}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={`${iconColor}`}>{icon}</span>
          <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">{label}</span>
        </div>
        {trendUp != null && (
          trendUp
            ? <ArrowUpRight size={14} className="text-success" />
            : <ArrowDownRight size={14} className="text-destructive" />
        )}
      </div>
      <div className="text-3xl font-bold text-foreground tracking-tight">{value}</div>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

function StatusRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-sm font-semibold text-foreground">{value}</dd>
    </div>
  );
}

function RankingCard({
  title,
  icon,
  rows,
  totalReceita,
  onSeeAll,
  emptyMsg,
}: {
  title: string;
  icon: React.ReactNode;
  rows: { id: string; nome: string; visitas: number; cadastros: number; receita: number }[];
  totalReceita: number;
  onSeeAll: () => void;
  emptyMsg: string;
}) {
  return (
    <div className="glass-card overflow-hidden">
      <div className="px-5 py-4 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          {icon}
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        </div>
        <button
          onClick={onSeeAll}
          className="text-xs font-semibold text-primary-glow hover:text-accent transition-colors"
        >
          Ver todos
        </button>
      </div>

      {rows.length === 0 ? (
        <div className="px-6 py-12 text-center text-muted-foreground text-sm">{emptyMsg}</div>
      ) : (
        <div className="divide-y divide-border-subtle">
          {rows.map((r, i) => {
            const share = totalReceita > 0 ? (r.receita / totalReceita) * 100 : 0;
            return (
              <div
                key={r.id}
                className="px-5 py-4 flex items-center gap-4 hover:bg-secondary/30 transition-colors"
              >
                <div
                  className={`w-7 h-7 rounded-md flex items-center justify-center text-xs font-bold ${
                    i === 0 ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
                  }`}
                >
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">{r.nome}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {fmtNum(r.visitas)} visitas · {fmtNum(r.cadastros)} cadastros
                  </p>
                </div>
                <div className="text-right min-w-[90px]">
                  <p className="text-sm font-bold text-foreground">{fmtBRL(r.receita)}</p>
                  <div className="w-20 h-1 rounded-full mt-1.5 ml-auto overflow-hidden bg-secondary">
                    <div
                      className="h-full rounded-full bg-accent"
                      style={{ width: `${share}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
