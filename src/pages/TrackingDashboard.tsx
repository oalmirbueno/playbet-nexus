import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import Breadcrumbs from "@/components/Breadcrumbs";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTrackingMetrics, usePlatformAccounts, useTrackingEvents } from "@/hooks/useTrackingData";
import { useAutoConsolidation } from "@/hooks/useAutoConsolidation";
import { useInfluencers, useCampanhas, usePlatforms } from "@/hooks/useSupabaseQuery";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip as ReTooltip,
} from "recharts";
import {
  Settings2, CloudDownload, RefreshCcw, TrendingUp, ArrowUpRight, ArrowDownRight,
  Trophy, Sparkle,
} from "lucide-react";
import HistoricalImportDialog from "@/components/tracking/HistoricalImportDialog";

// Locked design tokens for the "Immersive glass dashboard" direction.
// Kept inline (not promoted to design system) so the rest of the app stays untouched.
const TOKENS = {
  bg: "#0a0a1a",
  panel: "#141432",
  raised: "#1e1e5a",
  primary: "#4f46e5",
};

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
  const { data: recentEvents } = useTrackingEvents();
  const { consolidated } = useAutoConsolidation();

  const handleSync = async () => {
    setSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke("tracking-puller-smartico", {
        body: { source: "manual", mode: "recent" },
      });
      if (error) throw error;
      const r = data as { ok?: boolean; rows_received?: number; upserts?: number; error?: string };
      if (r?.ok === false) throw new Error(r.error || "Falha");
      toast.success(`Sincronizado · ${r.upserts ?? 0} atualizações`);
    } catch (e) {
      toast.error(`Falha ao sincronizar: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setSyncing(false);
    }
  };

  // KPIs — período selecionado vs. todo o dataset (deltas)
  const periodKpis = useMemo(() => {
    return metrics.reduce(
      (acc, m) => ({
        visitas: acc.visitas + (m.cliques || 0),
        cadastros: acc.cadastros + (m.registros || 0),
        ftd: acc.ftd + (m.ftd || 0),
        receita: acc.receita + (m.revenue || 0),
      }),
      { visitas: 0, cadastros: 0, ftd: 0, receita: 0 },
    );
  }, [metrics]);

  // Fallback ao consolidado em tempo real quando o período não tem métricas ainda
  const liveVisitas = consolidated.totalClicks || 0;
  const liveCadastros = consolidated.totalRegistrations || 0;
  const liveFtd = consolidated.totalFtd || 0;
  const liveReceita = consolidated.revenueBrl || 0;

  const kpiVisitas = periodKpis.visitas || liveVisitas;
  const kpiCadastros = periodKpis.cadastros || liveCadastros;
  const kpiFtd = periodKpis.ftd || liveFtd;
  const kpiReceita = periodKpis.receita || liveReceita;

  // Goal bars são qualitativos — mostram densidade relativa à melhor KPI
  const maxKpi = Math.max(kpiVisitas, kpiCadastros * 50, kpiFtd * 200, kpiReceita / 100, 1);
  const barVisitas = Math.min(100, (kpiVisitas / maxKpi) * 100);
  const barCadastros = Math.min(100, ((kpiCadastros * 50) / maxKpi) * 100);
  const barFtd = Math.min(100, ((kpiFtd * 200) / maxKpi) * 100);

  // Daily trend
  const trend = useMemo(() => {
    const map = new Map<string, number>();
    metrics.forEach((m) => {
      map.set(m.data_ref, (map.get(m.data_ref) || 0) + (m.revenue || 0));
    });
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, receita]) => ({
        date: date.slice(5),
        receita: Math.round(receita),
      }));
  }, [metrics]);

  // Top influencers
  const topInfluencers = useMemo(() => {
    const map = new Map<string, { id: string; nome: string; visitas: number; receita: number; cadastros: number }>();
    metrics.forEach((m) => {
      const id = m.influencer_id;
      if (!id) return;
      const inf = (influencers as any[]).find((i: any) => i.id === id);
      const entry = map.get(id) ?? { id, nome: inf?.name || "Sem nome", visitas: 0, receita: 0, cadastros: 0 };
      entry.visitas += m.cliques || 0;
      entry.cadastros += m.registros || 0;
      entry.receita += m.revenue || 0;
      map.set(id, entry);
    });
    return Array.from(map.values()).sort((a, b) => b.receita - a.receita).slice(0, 5);
  }, [metrics, influencers]);

  // Top casas
  const topCasas = useMemo(() => {
    const map = new Map<string, { id: string; nome: string; visitas: number; receita: number; cadastros: number }>();
    metrics.forEach((m) => {
      const id = m.platform_id;
      if (!id) return;
      const p = (platforms as any[]).find((x: any) => x.id === id);
      const entry = map.get(id) ?? { id, nome: p?.name || "—", visitas: 0, receita: 0, cadastros: 0 };
      entry.visitas += m.cliques || 0;
      entry.cadastros += m.registros || 0;
      entry.receita += m.revenue || 0;
      map.set(id, entry);
    });
    return Array.from(map.values()).sort((a, b) => b.receita - a.receita).slice(0, 5);
  }, [metrics, platforms]);

  const totalReceitaRanking = Math.max(
    topInfluencers.reduce((s, r) => s + r.receita, 0),
    topCasas.reduce((s, r) => s + r.receita, 0),
    1,
  );

  const lastSync = consolidated.lastEventTimestamp
    ? new Date(consolidated.lastEventTimestamp)
    : null;

  // Insight automático
  const insight = useMemo(() => {
    if (topInfluencers.length === 0 && topCasas.length === 0) {
      return "Conecte ou sincronize uma casa para ver insights de performance aqui.";
    }
    if (topInfluencers[0] && topInfluencers[0].receita > 0) {
      return `${topInfluencers[0].nome} está liderando as conversões neste período. Vale priorizar conteúdo com esse perfil.`;
    }
    if (topCasas[0] && topCasas[0].receita > 0) {
      return `${topCasas[0].nome} é a casa com melhor performance no momento — concentre tráfego nela.`;
    }
    return "Seus links estão ativos. Assim que as primeiras conversões caírem, os insights aparecem aqui.";
  }, [topInfluencers, topCasas]);

  const trendMax = Math.max(...trend.map((t) => t.receita), 1);

  return (
    <div
      className="min-h-[calc(100vh-4rem)] -m-4 sm:-m-6 lg:-m-8 p-4 sm:p-6 lg:p-10 text-white animate-fade-in"
      style={{
        background: TOKENS.bg,
        fontFamily: "Manrope, system-ui, sans-serif",
      }}
    >
      <div className="max-w-7xl mx-auto space-y-8">
        <Breadcrumbs items={[{ label: "Desempenho" }]} />

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <h1
              className="text-3xl font-bold tracking-tight text-white mb-1"
              style={{ fontFamily: "Sora, system-ui, sans-serif" }}
            >
              Desempenho
            </h1>
            <p className="text-sm text-indigo-200/60">
              {range.label} · atualizado{" "}
              {lastSync
                ? lastSync.toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })
                : "—"}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div
              className="rounded-xl px-3 py-1.5 flex items-center gap-2"
              style={{ background: TOKENS.panel, border: `1px solid ${TOKENS.raised}` }}
            >
              <span className="text-[10px] font-semibold text-indigo-400 uppercase tracking-wider">Período</span>
              <Select value={period} onValueChange={(v) => setPeriod(v as Period)}>
                <SelectTrigger className="h-7 w-[150px] bg-transparent border-0 text-sm font-medium focus:ring-0 text-white px-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="hoje">Hoje</SelectItem>
                  <SelectItem value="7d">Últimos 7 dias</SelectItem>
                  <SelectItem value="30d">Últimos 30 dias</SelectItem>
                  <SelectItem value="mes">Este mês</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="rounded-xl px-4 h-9 text-sm font-medium gap-2 text-white hover:bg-[#252570]"
                  style={{ background: TOKENS.raised, border: "1px solid rgba(79,70,229,0.3)" }}
                >
                  <Settings2 size={14} className="text-indigo-400" />
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

            <Button
              onClick={handleSync}
              disabled={syncing}
              className="rounded-xl px-6 h-9 text-sm font-bold text-white border-0 transition-all"
              style={{
                background: TOKENS.primary,
                boxShadow: syncing ? "none" : "0 0 20px rgba(79,70,229,0.3)",
              }}
            >
              {syncing ? (
                <><RefreshCcw size={14} className="mr-2 animate-spin" /> Sincronizando…</>
              ) : (
                <><CloudDownload size={14} className="mr-2" /> Sincronizar agora</>
              )}
            </Button>
          </div>
        </div>

        {/* KPI hero */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <KpiCard
            label="Visitas"
            value={fmtNum(kpiVisitas)}
            accent="indigo"
            barPct={barVisitas}
            delta={null}
          />
          <KpiCard
            label="Cadastros"
            value={fmtNum(kpiCadastros)}
            accent="purple"
            barPct={barCadastros}
            delta={kpiVisitas ? { sign: "up", text: pctStr(kpiCadastros, kpiVisitas) + " conv." } : null}
          />
          <KpiCard
            label="1º Depósito"
            value={fmtNum(kpiFtd)}
            accent="blue"
            barPct={barFtd}
            delta={kpiCadastros ? { sign: kpiFtd / Math.max(kpiCadastros, 1) > 0.2 ? "up" : "down", text: pctStr(kpiFtd, kpiCadastros) + " ativ." } : null}
          />
          <ReceitaCard valueBrl={kpiReceita} />
        </div>

        {/* Trend + insight */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div
            className="lg:col-span-2 rounded-3xl p-6 overflow-hidden"
            style={{ background: TOKENS.panel, border: `1px solid ${TOKENS.raised}` }}
          >
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="font-semibold text-white" style={{ fontFamily: "Sora, sans-serif" }}>
                  Receita ao longo do período
                </h3>
                <p className="text-xs text-indigo-200/50 mt-1">Em reais (R$)</p>
              </div>
              <TrendingUp size={18} className="text-indigo-400" />
            </div>
            <div className="h-[240px]">
              {trend.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trend} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="rev-grad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={TOKENS.primary} stopOpacity={0.6} />
                        <stop offset="100%" stopColor={TOKENS.primary} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#a5b4fc99" }} axisLine={false} tickLine={false} />
                    <YAxis hide domain={[0, trendMax * 1.2]} />
                    <ReTooltip
                      contentStyle={{
                        background: TOKENS.bg,
                        border: `1px solid ${TOKENS.raised}`,
                        borderRadius: 12,
                        fontSize: 12,
                        color: "white",
                      }}
                      formatter={(v: number) => [fmtBRL(v), "Receita"]}
                    />
                    <Area
                      type="monotone"
                      dataKey="receita"
                      stroke={TOKENS.primary}
                      strokeWidth={2}
                      fill="url(#rev-grad)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-indigo-200/40 text-sm">
                  Sem receita registrada no período
                </div>
              )}
            </div>
          </div>

          {/* Side: insight + status */}
          <div className="space-y-6">
            <div
              className="p-6 rounded-3xl relative overflow-hidden"
              style={{
                background: `linear-gradient(135deg, ${TOKENS.raised}, ${TOKENS.panel})`,
                border: "1px solid rgba(79,70,229,0.2)",
              }}
            >
              <div className="relative z-10">
                <div className="flex items-center gap-2 text-indigo-400 text-xs font-bold uppercase tracking-widest mb-3">
                  <Sparkle size={12} /> Insight
                </div>
                <p className="text-sm text-indigo-100 leading-relaxed font-medium">{insight}</p>
              </div>
              <div className="absolute -right-6 -bottom-6 text-indigo-500/10 pointer-events-none">
                <Sparkle size={96} />
              </div>
            </div>

            <div
              className="p-6 rounded-3xl"
              style={{ background: TOKENS.panel, border: `1px solid ${TOKENS.raised}` }}
            >
              <h3 className="font-semibold text-white mb-4" style={{ fontFamily: "Sora, sans-serif" }}>
                Status
              </h3>
              <dl className="space-y-3 text-sm">
                <StatusRow label="Casas conectadas" value={String(accounts.length)} />
                <StatusRow label="Eventos no período" value={fmtNum(consolidated.eventCount)} />
                <StatusRow label="Última atividade" value={lastSync ? lastSync.toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) : "—"} />
              </dl>
            </div>
          </div>
        </div>

        {/* Rankings */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <RankingCard
            title="Top Influenciadores"
            icon={<Trophy size={14} className="text-amber-400" />}
            rows={topInfluencers}
            totalReceita={totalReceitaRanking}
            onSeeAll={() => navigate("/influencers")}
            emptyMsg="Nenhum influenciador com receita no período."
          />
          <RankingCard
            title="Top Casas"
            icon={<Trophy size={14} className="text-emerald-400" />}
            rows={topCasas}
            totalReceita={totalReceitaRanking}
            onSeeAll={() => navigate("/plataformas")}
            emptyMsg="Nenhuma casa com receita no período."
          />
        </div>
      </div>

      {/* Hidden dialog driven by Avançado menu */}
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
  label,
  value,
  accent,
  barPct,
  delta,
}: {
  label: string;
  value: string;
  accent: "indigo" | "purple" | "blue";
  barPct: number;
  delta: { sign: "up" | "down"; text: string } | null;
}) {
  const accentColor =
    accent === "indigo" ? "#6366f1" : accent === "purple" ? "#a855f7" : "#3b82f6";
  const accentText =
    accent === "indigo" ? "text-indigo-400" : accent === "purple" ? "text-purple-400" : "text-blue-400";

  return (
    <div
      className="group relative p-6 rounded-3xl overflow-hidden transition-all hover:-translate-y-1"
      style={{ background: TOKENS.panel, border: `1px solid ${TOKENS.raised}` }}
    >
      <div
        className="absolute -right-4 -top-4 w-24 h-24 rounded-full blur-3xl group-hover:opacity-100 opacity-50 transition-opacity"
        style={{ background: `${accentColor}1a` }}
      />
      <div className="flex items-center justify-between mb-4 relative">
        <span className={`text-xs font-bold uppercase tracking-widest ${accentText}`}>{label}</span>
        {delta && (
          <div
            className={`px-2 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 ${
              delta.sign === "up" ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400"
            }`}
          >
            {delta.sign === "up" ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
            {delta.text}
          </div>
        )}
      </div>
      <div className="text-4xl font-extrabold mb-1 relative" style={{ fontFamily: "Sora, sans-serif" }}>
        {value}
      </div>
      <div className="w-full h-1.5 rounded-full mt-6 relative" style={{ background: TOKENS.raised }}>
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{
            width: `${barPct}%`,
            background: accentColor,
            boxShadow: `0 0 8px ${accentColor}99`,
          }}
        />
      </div>
    </div>
  );
}

function ReceitaCard({ valueBrl }: { valueBrl: number }) {
  return (
    <div
      className="group relative p-6 rounded-3xl overflow-hidden transition-all hover:-translate-y-1"
      style={{
        background: TOKENS.primary,
        boxShadow: "0 20px 40px rgba(0,0,0,0.4)",
      }}
    >
      <div className="absolute -right-2 -bottom-2 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
      <div className="flex items-center justify-between mb-4 relative">
        <span className="text-indigo-100 text-xs font-bold uppercase tracking-widest">Receita</span>
        <TrendingUp size={16} className="text-indigo-100/60" />
      </div>
      <div className="text-4xl font-extrabold mb-1 relative" style={{ fontFamily: "Sora, sans-serif" }}>
        {fmtBRL(valueBrl)}
      </div>
      <div className="text-indigo-100/70 text-sm mt-4 font-medium relative">
        {valueBrl > 0 ? "Saldo apurado no período" : "Aguardando primeira conversão"}
      </div>
    </div>
  );
}

function StatusRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-indigo-200/60 text-xs">{label}</dt>
      <dd className="text-white font-semibold text-sm">{value}</dd>
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
    <div
      className="rounded-3xl overflow-hidden"
      style={{ background: TOKENS.panel, border: `1px solid ${TOKENS.raised}` }}
    >
      <div className="p-6 border-b flex items-center justify-between" style={{ borderColor: TOKENS.raised }}>
        <div className="flex items-center gap-2">
          {icon}
          <h3 className="font-semibold text-white" style={{ fontFamily: "Sora, sans-serif" }}>{title}</h3>
        </div>
        <button
          onClick={onSeeAll}
          className="text-indigo-400 text-xs font-bold hover:text-indigo-300 transition-colors"
        >
          Ver todos
        </button>
      </div>

      {rows.length === 0 ? (
        <div className="px-6 py-12 text-center text-indigo-200/50 text-sm">{emptyMsg}</div>
      ) : (
        <div className="divide-y" style={{ borderColor: TOKENS.raised }}>
          {rows.map((r, i) => {
            const share = totalReceita > 0 ? (r.receita / totalReceita) * 100 : 0;
            return (
              <div
                key={r.id}
                className="px-6 py-4 flex items-center gap-4 hover:bg-[#1e1e5a]/30 transition-colors"
              >
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold"
                  style={{
                    background: i === 0 ? "#4f46e5" : TOKENS.raised,
                    color: i === 0 ? "white" : "#a5b4fc",
                  }}
                >
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white truncate">{r.nome}</p>
                  <p className="text-[11px] text-indigo-200/50">
                    {fmtNum(r.visitas)} visitas · {fmtNum(r.cadastros)} cadastros
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-white">{fmtBRL(r.receita)}</p>
                  <div className="w-20 h-1 rounded-full mt-1.5 ml-auto overflow-hidden" style={{ background: TOKENS.raised }}>
                    <div
                      className="h-full rounded-full bg-emerald-500"
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
