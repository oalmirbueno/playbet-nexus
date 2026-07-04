import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { getMetricMoneyParts } from "@/lib/trackingMetrics";
import type { TrackingLinkRow, TrackingMetricRow } from "@/services/trackingService";
import {
  MousePointerClick, Eye, ArrowUpRight, UserPlus, Wallet, Coins,
  TrendingUp, Percent, DollarSign, Users, Briefcase,
} from "lucide-react";

interface Props {
  link: TrackingLinkRow | null;
  onClose: () => void;
  influencer?: { id?: string; name?: string; commission_percent?: number | null; manager_id?: string | null } | null;
  manager?: { id?: string; name?: string; commission_percent?: number | null } | null;
}

interface Aggregates {
  clicks: number;
  lpViews: number;
  ctaClicks: number;
  registrations: number;
  ftd: number;
  depositsTotal: number;
  depositsCount: number;
  revShare: number;
  cpa: number;
  commissionTotal: number;
  avgTicket: number;
  ftdCr: number;
  daily: { date: string; clicks: number; ftd: number }[];
}

const fmtBRL = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 2 });
const fmtNum = (n: number) => n.toLocaleString("pt-BR");
const fmtPct = (n: number) => `${(n * 100).toFixed(1)}%`;

export default function LinkReportDrawer({ link, onClose, influencer, manager }: Props) {
  const [loading, setLoading] = useState(false);
  const [agg, setAgg] = useState<Aggregates | null>(null);

  useEffect(() => {
    if (!link) { setAgg(null); return; }
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        // Panel-scraper rows são frequentemente órfãs (sem influencer/campaign/LP),
        // mas carregam platform_account_id. Unimos todas as linhas que casam com
        // qualquer chave do link para que cadastros, FTDs, depósitos e financeiro
        // apareçam mesmo quando a atribuição fina falta.
        const orParts: string[] = [];
        if (link.platform_account_id) orParts.push(`platform_account_id.eq.${link.platform_account_id}`);
        if (link.influencer_id) orParts.push(`influencer_id.eq.${link.influencer_id}`);
        if (link.landing_page_instance_id) orParts.push(`landing_page_instance_id.eq.${link.landing_page_instance_id}`);
        if (link.campanha_id) orParts.push(`campanha_id.eq.${link.campanha_id}`);

        const metricsPromise = orParts.length
          ? (supabase as any).from("tracking_metrics")
              .select("*, platform_accounts(revshare_percent,cpa_value,cpa_baseline_deposit)")
              .or("is_demo.is.false,is_demo.is.null")
              .or(orParts.join(","))
          : Promise.resolve({ data: [], error: null });

        const [clicksRes, eventsRes, metricsRes] = await Promise.all([
          supabase.from("clicks").select("id, clicked_at", { count: "exact" })
            .eq("tracking_link_id", link.id)
            .eq("is_demo", false),
          supabase.from("tracking_events").select("canonical_event_name, event_timestamp, amount")
            .eq("tracking_link_id", link.id)
            .eq("is_demo", false)
            .eq("is_duplicate", false)
            .limit(5000),
          metricsPromise,
        ]);

        if (cancelled) return;

        const clicks = clicksRes.count ?? (clicksRes.data?.length ?? 0);
        const events = eventsRes.data ?? [];
        const seen = new Set<string>();
        const metrics = ((metricsRes.data ?? []) as TrackingMetricRow[]).filter(m => {
          if (seen.has(m.id)) return false;
          seen.add(m.id);
          return true;
        });

        const lpViews = events.filter(e => e.canonical_event_name === "lp_view").length;
        const ctaClicks = events.filter(e => e.canonical_event_name === "click").length;
        let registrations = events.filter(e => ["registration", "signup", "lead"].includes(e.canonical_event_name)).length;

        let ftd = 0, depositsTotal = 0, depositsCount = 0, revShare = 0, cpa = 0, commissionTotal = 0;
        let regsFromMetrics = 0;
        for (const m of metrics) {
          const parts = getMetricMoneyParts(m as any);
          revShare += parts.revShare;
          cpa += parts.cpa;
          commissionTotal += parts.total;
          ftd += Number(m.ftd || 0);
          depositsTotal += Number(m.depositos_total || (m as any).converted_amount || 0);
          depositsCount += Number(m.deposits_count || 0);
          regsFromMetrics += Number(m.registros || 0);
        }
        if (regsFromMetrics > registrations) registrations = regsFromMetrics;

        if (ftd === 0) {
          ftd = events.filter(e => ["ftd", "first_deposit"].includes(e.canonical_event_name)).length;
        }

        const avgTicket = ftd > 0 ? depositsTotal / ftd : 0;
        const ftdCr = lpViews > 0 ? ftd / lpViews : 0;

        const byDay = new Map<string, { clicks: number; ftd: number }>();
        const isoDay = (t: string) => t.slice(0, 10);
        const cutoff = Date.now() - 30 * 24 * 3600 * 1000;
        (clicksRes.data || []).forEach((c: any) => {
          if (!c.clicked_at || new Date(c.clicked_at).getTime() < cutoff) return;
          const d = isoDay(c.clicked_at);
          const cur = byDay.get(d) || { clicks: 0, ftd: 0 };
          cur.clicks += 1;
          byDay.set(d, cur);
        });
        events.forEach(e => {
          if (!["ftd", "first_deposit"].includes(e.canonical_event_name)) return;
          if (!e.event_timestamp || new Date(e.event_timestamp).getTime() < cutoff) return;
          const d = isoDay(e.event_timestamp);
          const cur = byDay.get(d) || { clicks: 0, ftd: 0 };
          cur.ftd += 1;
          byDay.set(d, cur);
        });
        for (const m of metrics) {
          const f = Number(m.ftd || 0);
          if (!f || !m.data_ref) continue;
          if (new Date(m.data_ref).getTime() < cutoff) continue;
          const cur = byDay.get(m.data_ref) || { clicks: 0, ftd: 0 };
          cur.ftd += f;
          byDay.set(m.data_ref, cur);
        }
        const daily = Array.from(byDay.entries())
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([date, v]) => ({ date, ...v }));

        setAgg({
          clicks, lpViews, ctaClicks, registrations,
          ftd, depositsTotal, depositsCount,
          revShare, cpa, commissionTotal,
          avgTicket, ftdCr, daily,
        });
      } catch (e) {
        console.warn("[LinkReportDrawer] load failed", e);
        setAgg(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [link?.id, link?.landing_page_instance_id, link?.platform_account_id, link?.influencer_id, link?.campanha_id]);

  const commissions = useMemo(() => {
    const total = agg?.commissionTotal ?? 0;
    const infPct = Number(influencer?.commission_percent ?? 0);
    const mgrPct = Number(manager?.commission_percent ?? 0);
    return {
      influencer: total * (infPct / 100),
      manager: total * (mgrPct / 100),
      house: total * Math.max(0, (100 - infPct - mgrPct) / 100),
      infPct, mgrPct,
    };
  }, [agg, influencer, manager]);

  const maxBar = useMemo(() => {
    if (!agg?.daily?.length) return 1;
    return Math.max(1, ...agg.daily.map(d => d.clicks + d.ftd));
  }, [agg]);

  if (!link) return null;

  return (
    <Dialog open={!!link} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 flex-wrap">
            Relatório do link
            <Badge variant="outline" className="font-mono text-[10px]">{link.tracking_code}</Badge>
            {influencer?.name && <span className="text-xs text-muted-foreground font-normal">· {influencer.name}</span>}
          </DialogTitle>
        </DialogHeader>

        {loading && (
          <div className="grid grid-cols-3 gap-2">
            {Array.from({ length: 9 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-lg" />)}
          </div>
        )}

        {!loading && agg && (
          <div className="space-y-4">
            {/* Funil */}
            <div>
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground mb-2">Funil de conversão</p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                <StatCard icon={MousePointerClick} label="Cliques" value={fmtNum(agg.clicks)} />
                <StatCard icon={Eye} label="LP views" value={fmtNum(agg.lpViews)} />
                <StatCard icon={ArrowUpRight} label="Avançaram (CTA)" value={fmtNum(agg.ctaClicks)} />
                <StatCard icon={UserPlus} label="Cadastros" value={fmtNum(agg.registrations)} />
                <StatCard icon={Wallet} label="FTDs" value={fmtNum(agg.ftd)} />
                <StatCard icon={Coins} label="Depósitos totais" value={fmtBRL(agg.depositsTotal)} />
              </div>
            </div>

            {/* Financeiro */}
            <div>
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground mb-2">Financeiro do link</p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                <StatCard icon={TrendingUp} label="Revenue (RevShare)" value={fmtBRL(agg.revShare)} accent />
                <StatCard icon={DollarSign} label="CPA" value={fmtBRL(agg.cpa)} accent />
                <StatCard icon={Coins} label="Comissão total" value={fmtBRL(agg.commissionTotal)} accent primary />
                <StatCard icon={Percent} label="Conversão LP → FTD" value={fmtPct(agg.ftdCr)} />
                <StatCard icon={Wallet} label="Ticket médio (FTD)" value={fmtBRL(agg.avgTicket)} />
                <StatCard icon={Users} label="Depósitos (qtd)" value={fmtNum(agg.depositsCount)} />
              </div>
            </div>

            {/* Split de comissão */}
            {agg.commissionTotal > 0 && (
              <div>
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground mb-2">Split de comissão deste link</p>
                <div className="grid grid-cols-3 gap-2">
                  <SplitCard
                    icon={Users}
                    label={`Influencer · ${commissions.infPct}%`}
                    value={fmtBRL(commissions.influencer)}
                    hint={influencer?.name || "—"}
                  />
                  <SplitCard
                    icon={Briefcase}
                    label={`Gerente · ${commissions.mgrPct}%`}
                    value={fmtBRL(commissions.manager)}
                    hint={manager?.name || "sem gerente"}
                  />
                  <SplitCard
                    icon={TrendingUp}
                    label={`Casa · ${Math.max(0, 100 - commissions.infPct - commissions.mgrPct)}%`}
                    value={fmtBRL(commissions.house)}
                    hint="Playbet"
                  />
                </div>
              </div>
            )}

            {/* Série temporal */}
            {agg.daily.length > 0 && (
              <div>
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground mb-2">Últimos 30 dias</p>
                <div className="flex items-end gap-1 h-24 bg-secondary/30 rounded-lg p-2">
                  {agg.daily.map(d => {
                    const totalH = ((d.clicks + d.ftd) / maxBar) * 100;
                    const ftdH = d.ftd ? (d.ftd / (d.clicks + d.ftd)) * totalH : 0;
                    const clickH = totalH - ftdH;
                    return (
                      <div key={d.date} className="flex-1 flex flex-col justify-end min-w-0" title={`${d.date}: ${d.clicks} cliques · ${d.ftd} FTD`}>
                        <div className="bg-success/70 rounded-t" style={{ height: `${ftdH}%` }} />
                        <div className="bg-primary/60" style={{ height: `${clickH}%` }} />
                      </div>
                    );
                  })}
                </div>
                <div className="flex items-center gap-3 mt-1.5 text-[10px] text-muted-foreground">
                  <span className="inline-flex items-center gap-1"><span className="w-2 h-2 bg-primary/60 rounded-sm" /> Cliques</span>
                  <span className="inline-flex items-center gap-1"><span className="w-2 h-2 bg-success/70 rounded-sm" /> FTDs</span>
                </div>
              </div>
            )}

            {agg.clicks === 0 && agg.lpViews === 0 && agg.commissionTotal === 0 && (
              <div className="text-center text-xs text-muted-foreground py-6 border border-dashed border-border rounded-lg">
                Ainda não há tráfego registrado neste link. Assim que o influencer publicar, cliques, cadastros, FTDs e comissões aparecerão aqui em tempo real.
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function StatCard({
  icon: Icon, label, value, accent, primary,
}: { icon: any; label: string; value: string; accent?: boolean; primary?: boolean }) {
  return (
    <div className={`rounded-lg border px-3 py-2.5 ${primary ? "border-primary/40 bg-primary/5" : accent ? "border-border bg-secondary/40" : "border-border bg-card"}`}>
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-muted-foreground">
        <Icon size={11} /> {label}
      </div>
      <div className={`mt-1 text-lg font-semibold tabular-nums ${primary ? "text-primary" : ""}`}>{value}</div>
    </div>
  );
}

function SplitCard({ icon: Icon, label, value, hint }: { icon: any; label: string; value: string; hint: string }) {
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2.5">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-muted-foreground">
        <Icon size={11} /> {label}
      </div>
      <div className="mt-1 text-base font-semibold tabular-nums">{value}</div>
      <div className="text-[10px] text-muted-foreground truncate">{hint}</div>
    </div>
  );
}
