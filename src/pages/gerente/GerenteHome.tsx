import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, usePreviewScope } from "@/contexts/AuthContext";
import { useManagerSync } from "@/hooks/useManagerSync";
import { Users, Target, TrendingUp, Wallet, Trophy, Link2, Sparkles, ArrowRight, Banknote, PiggyBank } from "lucide-react";
import { getMetricMoneyParts } from "@/lib/trackingMetrics";

export default function GerenteHome() {
  const { user } = useAuth();
  const scope = usePreviewScope();
  const { revision } = useManagerSync();
  const [squad, setSquad] = useState<any>(null);
  const [kpi, setKpi] = useState({ influencers: 0, activeInfluencers: 0, clicks: 0, ftd: 0, revenue: 0, links: 0 });
  const [top, setTop] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const prof = scope.active
        ? { full_name: scope.target?.name ?? "", influencer_id: scope.influencerId, manager_id: scope.managerId } as any
        : (await supabase.from("profiles").select("manager_id, full_name").eq("id", user!.id).maybeSingle()).data;
      if (!prof?.manager_id) { setLoading(false); return; }
      const { data: m } = await supabase.from("managers").select("*, squad:squads(*)").eq("id", prof.manager_id).maybeSingle();
      setSquad(m);
      const { data: infs } = await supabase.from("influencers").select("id, name, slug, instagram, is_active").eq("squad_id", m?.squad_id ?? "");
      const ids = (infs ?? []).map(i => i.id);
      const activeCount = (infs ?? []).filter(i => i.is_active).length;
      let agg = { clicks: 0, ftd: 0, revenue: 0 };
      let linksCount = 0;
      let topRows: any[] = [];
      if (ids.length) {
        const [{ data: metrics }, { count: lc }] = await Promise.all([
          supabase.from("tracking_metrics").select("influencer_id, cliques, ftd, revenue, cpa_commission, revshare_commission, commission_total, origem_importacao").in("influencer_id", ids).eq("is_demo", false),
          supabase.from("tracking_links").select("id", { count: "exact", head: true }).in("influencer_id", ids).eq("is_demo", false),
        ]);
        linksCount = lc ?? 0;
        const byInf: Record<string, any> = {};
        for (const inf of infs!) byInf[inf.id] = { ...inf, revenue: 0, ftd: 0, clicks: 0 };
        for (const mt of metrics ?? []) {
          const r = byInf[mt.influencer_id]; if (!r) continue;
          const realProfit = getMetricMoneyParts(mt).total;
          agg.clicks += mt.cliques ?? 0; agg.ftd += mt.ftd ?? 0; agg.revenue += realProfit;
          r.clicks += mt.cliques ?? 0; r.ftd += mt.ftd ?? 0; r.revenue += realProfit;
        }
        topRows = Object.values(byInf).sort((a: any, b: any) => b.revenue - a.revenue).slice(0, 5);
      }
      setKpi({ influencers: ids.length, activeInfluencers: activeCount, links: linksCount, ...agg });
      setTop(topRows);
      setLoading(false);
    })();
  }, [user, revision]);

  const cards = [
    { label: "Influenciadores", value: `${kpi.activeInfluencers}/${kpi.influencers}`, icon: Users },
    { label: "Cliques totais", value: kpi.clicks.toLocaleString("pt-BR"), icon: Target },
    { label: "FTDs", value: kpi.ftd.toLocaleString("pt-BR"), icon: TrendingUp },
    { label: "Lucro real do squad", value: kpi.revenue.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 2 }), icon: Wallet },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground flex items-center gap-2">
            {squad?.squad?.color && <span className="w-2 h-2 rounded-full" style={{ background: squad.squad.color }} />}
            Squad
          </p>
          <h1 className="page-header">{squad?.squad?.name ?? "Meu squad"}</h1>
          <p className="page-subtitle">Painel do gerente · performance sincronizada em tempo real com o admin central.</p>
        </div>
        <div className="text-[11px] text-muted-foreground text-right">
          <p>{kpi.links.toLocaleString("pt-BR")} links ativos no squad</p>
          {squad?.monthly_goal && (
            <p className="mt-0.5">Meta mensal: <span className="font-medium text-foreground">{Number(squad.monthly_goal).toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 })}</span></p>
          )}
        </div>
      </div>

      {/* Meta hero + KPIs */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="glass-card p-5 lg:col-span-1 relative overflow-hidden">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Meta do mês</span>
            <Target size={13} className="text-primary/80" />
          </div>
          {(() => {
            const goal = Number(squad?.monthly_goal ?? 0);
            const done = kpi.revenue;
            const pct = goal > 0 ? Math.min(100, (done / goal) * 100) : 0;
            const R = 46; const C = 2 * Math.PI * R;
            const dash = (pct / 100) * C;
            return (
              <div className="flex items-center gap-4">
                <div className="relative w-[112px] h-[112px] shrink-0">
                  <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
                    <circle cx="60" cy="60" r={R} strokeWidth="10" className="stroke-secondary/60" fill="none" />
                    <circle
                      cx="60" cy="60" r={R} strokeWidth="10" fill="none"
                      stroke="url(#ring-grad)" strokeLinecap="round"
                      strokeDasharray={`${dash} ${C}`}
                      style={{ transition: "stroke-dasharray 600ms ease" }}
                    />
                    <defs>
                      <linearGradient id="ring-grad" x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0%" stopColor="hsl(238 84% 60%)" />
                        <stop offset="100%" stopColor="hsl(189 94% 55%)" />
                      </linearGradient>
                    </defs>
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-xl font-semibold tabular-nums">{loading ? "…" : `${pct.toFixed(0)}%`}</span>
                    <span className="text-[10px] text-muted-foreground">atingido</span>
                  </div>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] text-muted-foreground">Realizado</p>
                  <p className="text-lg font-semibold tabular-nums truncate">{done.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 })}</p>
                  <p className="text-[11px] text-muted-foreground mt-2">Meta</p>
                  <p className="text-[13px] tabular-nums text-foreground/80 truncate">{goal > 0 ? goal.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }) : "—"}</p>
                </div>
              </div>
            );
          })()}
        </div>

        <div className="lg:col-span-2 grid grid-cols-2 gap-3 md:gap-4">
          {cards.map(c => (
            <div key={c.label} className="glass-card p-4 md:p-5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] text-muted-foreground">{c.label}</span>
                <c.icon size={14} className="text-primary/80" />
              </div>
              <div className="text-xl md:text-2xl font-semibold tracking-tight">
                {loading ? <span className="inline-block h-6 w-16 rounded bg-secondary/60 animate-pulse" /> : c.value}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="glass-card p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <h3 className="section-title inline-flex items-center gap-2"><Trophy size={13} className="text-amber-400" /> Top performers</h3>
            <Link to="/gerente/ranking" className="text-[11px] text-primary hover:underline inline-flex items-center gap-1">
              Ranking completo <ArrowRight size={11} />
            </Link>
          </div>
          {loading ? (
            <div className="text-sm text-muted-foreground">Carregando…</div>
          ) : top.length === 0 ? (
            <div className="text-sm text-muted-foreground">Sem dados ainda.</div>
          ) : (
            <ul className="divide-y divide-border/40">
              {top.map((r, i) => (
                <li key={r.id} className="flex items-center gap-3 py-2.5">
                  <span className={`w-6 text-center text-[12px] tabular-nums ${i === 0 ? "text-amber-400" : i === 1 ? "text-zinc-300" : i === 2 ? "text-orange-400" : "text-muted-foreground"}`}>{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium truncate">{r.name}</p>
                    <p className="text-[11px] text-muted-foreground truncate">{r.instagram ?? `@${r.slug}`}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-[13px] font-semibold tabular-nums text-primary">{Number(r.revenue).toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 2 })}</p>
                    <p className="text-[10px] text-muted-foreground tabular-nums">{r.ftd} FTDs · {r.clicks.toLocaleString("pt-BR")} cliques</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="space-y-3">
          <Link to="/gerente/influenciadores" className="glass-card p-4 flex items-center gap-3 hover:border-primary/40 transition-colors">
            <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center"><Users size={16} /></div>
            <div className="flex-1">
              <p className="text-[13px] font-medium">Meu squad</p>
              <p className="text-[11px] text-muted-foreground">{kpi.influencers} influenciadores</p>
            </div>
            <ArrowRight size={13} className="text-muted-foreground" />
          </Link>
          <Link to="/gerente/financeiro" className="glass-card p-4 flex items-center gap-3 hover:border-primary/40 transition-colors">
            <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center"><Banknote size={16} /></div>
            <div className="flex-1">
              <p className="text-[13px] font-medium">Financeiro</p>
              <p className="text-[11px] text-muted-foreground">Comissões e receita do squad</p>
            </div>
            <ArrowRight size={13} className="text-muted-foreground" />
          </Link>
          <Link to="/gerente/saques" className="glass-card p-4 flex items-center gap-3 hover:border-primary/40 transition-colors">
            <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center"><PiggyBank size={16} /></div>
            <div className="flex-1">
              <p className="text-[13px] font-medium">Saques do squad</p>
              <p className="text-[11px] text-muted-foreground">Solicitações e status</p>
            </div>
            <ArrowRight size={13} className="text-muted-foreground" />
          </Link>
          <Link to="/gerente/links" className="glass-card p-4 flex items-center gap-3 hover:border-primary/40 transition-colors">
            <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center"><Link2 size={16} /></div>
            <div className="flex-1">
              <p className="text-[13px] font-medium">Links do squad</p>
              <p className="text-[11px] text-muted-foreground">Copie, compartilhe e pause</p>
            </div>
            <ArrowRight size={13} className="text-muted-foreground" />
          </Link>
          <Link to="/gerente/oportunidades" className="glass-card p-4 flex items-center gap-3 hover:border-primary/40 transition-colors">
            <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center"><Sparkles size={16} /></div>
            <div className="flex-1">
              <p className="text-[13px] font-medium">Oportunidades ativas</p>
              <p className="text-[11px] text-muted-foreground">Campanhas para repassar</p>
            </div>
            <ArrowRight size={13} className="text-muted-foreground" />
          </Link>
        </div>
      </div>
    </div>
  );
}
