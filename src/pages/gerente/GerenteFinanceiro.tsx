import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, usePreviewScope } from "@/contexts/AuthContext";
import { useManagerSync } from "@/hooks/useManagerSync";
import { Wallet, TrendingUp, Users, ArrowRight, Percent, Info } from "lucide-react";
import { getMetricMoneyParts } from "@/lib/trackingMetrics";

type InfBreakdown = { id: string; name: string; slug: string; revenue: number; ftd: number };

export default function GerenteFinanceiro() {
  const { user } = useAuth();
  const scope = usePreviewScope();
  const { revision } = useManagerSync();
  const [loading, setLoading] = useState(true);
  const [mgr, setMgr] = useState<any>(null);
  const [squadRevenue, setSquadRevenue] = useState(0);
  const [squadRevenue30d, setSquadRevenue30d] = useState(0);
  const [influencers, setInfluencers] = useState<InfBreakdown[]>([]);
  const [saques, setSaques] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      const prof = scope.active
        ? { full_name: scope.target?.name ?? "", influencer_id: scope.influencerId, manager_id: scope.managerId } as any
        : (await supabase.from("profiles").select("manager_id").eq("id", user!.id).maybeSingle()).data;
      if (!prof?.manager_id) { setLoading(false); return; }
      const { data: m } = await supabase.from("managers").select("*, squad:squads(name, color)").eq("id", prof.manager_id).maybeSingle();
      setMgr(m);

      const { data: infs } = await supabase.from("influencers").select("id, name, slug").eq("squad_id", m?.squad_id ?? "");
      const ids = (infs ?? []).map(i => i.id);
      const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - 30);
      const cutoffStr = cutoff.toISOString().slice(0, 10);

      let mets: any[] = [];
      if (ids.length) {
        const { data } = await supabase.from("tracking_metrics")
          .select("influencer_id, revenue, cpa_commission, revshare_commission, commission_total, origem_importacao, ftd, data_ref")
          .in("influencer_id", ids).eq("is_demo", false);
        mets = data ?? [];
      }
      const perInf = new Map<string, InfBreakdown>();
      (infs ?? []).forEach(i => perInf.set(i.id, { id: i.id, name: i.name, slug: i.slug, revenue: 0, ftd: 0 }));
      let total = 0, total30 = 0;
      for (const mt of mets) {
        const r = perInf.get(mt.influencer_id); if (!r) continue;
        const rev = getMetricMoneyParts(mt).total;
        r.revenue += rev; r.ftd += mt.ftd ?? 0;
        total += rev;
        if ((mt.data_ref ?? "") >= cutoffStr) total30 += rev;
      }
      setSquadRevenue(total);
      setSquadRevenue30d(total30);
      setInfluencers([...perInf.values()].sort((a, b) => b.revenue - a.revenue));

      const { data: sq } = await supabase.from("saques").select("*").eq("manager_id", prof.manager_id).order("created_at", { ascending: false });
      setSaques(sq ?? []);
      setLoading(false);
    })();
  }, [user, revision]);

  const brl = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  const pct = Number(mgr?.commission_percent ?? 0);
  const grossEarnings = squadRevenue * pct / 100;
  const earnings30d = squadRevenue30d * pct / 100;

  const { requested, paid } = useMemo(() => {
    let requested = 0, paid = 0;
    for (const s of saques) {
      const st = (s.status ?? "").toLowerCase();
      const v = Number(s.valor ?? 0);
      if (["cancelado", "recusado", "failed"].includes(st)) continue;
      requested += v;
      if (["pago", "confirmed", "completed", "concluido"].includes(st)) paid += v;
    }
    return { requested, paid };
  }, [saques]);
  const available = Math.max(0, grossEarnings - requested);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="page-header">Meus ganhos</h1>
          <p className="page-subtitle">
            Comissão de gerência sobre o lucro real validado do squad
            {mgr?.squad?.name ? <> — <span className="text-foreground">{mgr.squad.name}</span></> : null}.
          </p>
        </div>
        <Link to="/gerente/saques" className="btn-primary inline-flex items-center gap-2 text-[12px]">
          <Wallet size={13} /> Solicitar saque <ArrowRight size={12} />
        </Link>
      </div>

      {/* Big card: available balance */}
      <div className="glass-card p-5 md:p-6 relative overflow-hidden">
        <div className="absolute inset-0 opacity-40 pointer-events-none bg-gradient-to-br from-success/10 via-transparent to-transparent" />
        <div className="relative grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="md:col-span-2">
            <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Disponível para saque</p>
            <p className="text-3xl md:text-4xl font-semibold tracking-tight text-success mt-1">{brl(available)}</p>
            <p className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1">
              <Info size={11} /> Ganhos brutos {brl(grossEarnings)} − já solicitado {brl(requested)}
            </p>
          </div>
          <BigStat label="Comissão vigente" value={`${pct.toFixed(1)}%`} icon={<Percent size={13} />} />
          <BigStat label="Últimos 30 dias" value={brl(earnings30d)} icon={<TrendingUp size={13} />} />
        </div>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Kpi label="Lucro real do squad (total)" value={brl(squadRevenue)} />
        <Kpi label="Ganhos brutos totais" value={brl(grossEarnings)} highlight />
        <Kpi label="Já pago" value={brl(paid)} />
        <Kpi label="Pendente" value={brl(Math.max(0, requested - paid))} />
      </div>

      {/* Formula card */}
      <div className="glass-card p-5">
        <h3 className="section-title">Como sua comissão é calculada</h3>
        <p className="text-[12px] text-muted-foreground mb-3">
          Modelo oficial PlayBet · sempre sobre RevShare + CPA recebido e validado da casa (nunca cliques ou depósitos brutos).
        </p>
        <div className="flex items-center gap-2 flex-wrap text-[13px] font-mono">
          <Chip label="Lucro real validado" value={brl(squadRevenue)} />
          <span className="text-muted-foreground">×</span>
          <Chip label="Sua comissão" value={`${pct.toFixed(1)}%`} />
          <span className="text-muted-foreground">=</span>
          <Chip label="Ganhos brutos" value={brl(grossEarnings)} highlight />
        </div>
        {mgr?.career_label && (
          <p className="text-[11px] text-muted-foreground mt-3">
            Nível: <span className="text-foreground">{mgr.career_label}</span> (faixa {mgr.career_level ?? "—"}).
          </p>
        )}
      </div>

      {/* Breakdown per influencer */}
      <div className="glass-card overflow-hidden">
        <div className="px-5 py-3 border-b border-border/40 flex items-center justify-between">
          <h3 className="section-title mb-0">Contribuição por influenciador</h3>
          <span className="text-[11px] text-muted-foreground">{influencers.length} no squad</span>
        </div>
        {loading ? (
          <div className="p-6 text-sm text-muted-foreground">Carregando…</div>
        ) : influencers.length === 0 ? (
          <div className="p-10 text-center text-sm text-muted-foreground">Sem influenciadores no squad ainda.</div>
        ) : (
          <div className="max-h-[420px] overflow-y-auto">
            <table className="w-full text-[13px]">
              <thead className="bg-secondary/40 text-[10px] uppercase tracking-[0.14em] text-muted-foreground sticky top-0 backdrop-blur-md">
                <tr>
                  <th className="px-4 py-2 text-left">Influenciador</th>
                  <th className="px-4 py-2 text-right">FTDs</th>
                  <th className="px-4 py-2 text-right">Lucro real</th>
                  <th className="px-4 py-2 text-right">Sua parte ({pct.toFixed(1)}%)</th>
                </tr>
              </thead>
              <tbody>
                {influencers.map(i => (
                  <tr key={i.id} className="border-t border-border/40 hover:bg-secondary/20">
                    <td className="px-4 py-2">
                      <div className="font-medium">{i.name}</div>
                      <div className="text-[11px] text-muted-foreground">@{i.slug}</div>
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums">{i.ftd.toLocaleString("pt-BR")}</td>
                    <td className="px-4 py-2 text-right tabular-nums">{brl(i.revenue)}</td>
                    <td className="px-4 py-2 text-right tabular-nums font-semibold text-primary">{brl(i.revenue * pct / 100)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function Kpi({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="glass-card p-4">
      <p className="text-[11px] text-muted-foreground mb-1">{label}</p>
      <p className={`text-xl font-semibold tabular-nums ${highlight ? "text-primary" : ""}`}>{value}</p>
    </div>
  );
}
function BigStat({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground inline-flex items-center gap-1.5">{icon} {label}</p>
      <p className="text-xl md:text-2xl font-semibold tracking-tight mt-1 tabular-nums">{value}</p>
    </div>
  );
}
function Chip({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <span className={`inline-flex flex-col px-3 py-2 rounded-lg border ${highlight ? "bg-primary/10 border-primary/30 text-primary" : "bg-secondary/40 border-border/40"}`}>
      <span className="text-[9px] uppercase tracking-[0.14em] opacity-70">{label}</span>
      <span className="font-semibold">{value}</span>
    </span>
  );
}
