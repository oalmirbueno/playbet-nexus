import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, usePreviewScope } from "@/contexts/AuthContext";
import { MousePointerClick, UserPlus, Wallet, TrendingUp, Percent, Users, ArrowUpRight, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { getMetricMoneyParts } from "@/lib/trackingMetrics";

interface DayRow { data_ref: string; cliques: number; registros: number; ftd: number; revenue: number }

export default function PortalHome() {
  const { user } = useAuth();
  const scope = usePreviewScope();
  const [name, setName] = useState("");
  const [inf, setInf] = useState<any>(null);
  const [manager, setManager] = useState<any>(null);
  const [rows, setRows] = useState<DayRow[]>([]);
  const [linkCount, setLinkCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const prof = scope.active
        ? { full_name: scope.target?.name ?? "", influencer_id: scope.influencerId, manager_id: scope.managerId } as any
        : (await supabase.from("profiles").select("full_name, influencer_id").eq("id", user!.id).maybeSingle()).data;
      setName(prof?.full_name ?? "");
      const infId = prof?.influencer_id;
      if (!infId) { setLoading(false); return; }

      const [{ data: iRow }, { data: metrics }, { count: lc }] = await Promise.all([
        supabase.from("influencers").select("*, managers(name, team_name)").eq("id", infId).maybeSingle(),
        supabase.from("tracking_metrics").select("data_ref, cliques, registros, ftd, revenue, cpa_commission, revshare_commission, commission_total, origem_importacao")
          .eq("influencer_id", infId).eq("is_demo", false)
          .order("data_ref", { ascending: false }).limit(60),
        supabase.from("tracking_links").select("id", { count: "exact", head: true })
          .eq("influencer_id", infId).eq("is_demo", false),
      ]);

      setInf(iRow);
      setManager(iRow?.managers ?? null);
      setRows((metrics ?? []).map((r: any) => ({
        data_ref: r.data_ref,
        cliques: r.cliques ?? 0,
        registros: r.registros ?? 0,
        ftd: r.ftd ?? 0,
        revenue: getMetricMoneyParts(r).total,
      })));
      setLinkCount(lc ?? 0);
      setLoading(false);
    })();
  }, [user]);

  const totals = useMemo(() => rows.reduce((a, r) => ({
    clicks: a.clicks + r.cliques,
    regs: a.regs + r.registros,
    ftd: a.ftd + r.ftd,
    revenue: a.revenue + r.revenue,
  }), { clicks: 0, regs: 0, ftd: 0, revenue: 0 }), [rows]);

  const last14 = useMemo(() => {
    const map = new Map(rows.map(r => [r.data_ref, r]));
    const out: { d: string; v: number }[] = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      out.push({ d: key, v: (map.get(key)?.revenue ?? 0) });
    }
    return out;
  }, [rows]);
  const maxV = Math.max(1, ...last14.map(x => x.v));

  const commissionPct = Number(inf?.commission_percent ?? 0);
  const estCommission = totals.revenue * (commissionPct / 100);
  const convReg = totals.clicks ? (totals.regs / totals.clicks) * 100 : 0;
  const convFtd = totals.regs ? (totals.ftd / totals.regs) * 100 : 0;

  const kpis = [
    { label: "Cliques", value: totals.clicks.toLocaleString("pt-BR"), icon: MousePointerClick },
    { label: "Cadastros", value: totals.regs.toLocaleString("pt-BR"), icon: UserPlus, sub: `${convReg.toFixed(1)}% conv.` },
    { label: "FTDs", value: totals.ftd.toLocaleString("pt-BR"), icon: TrendingUp, sub: `${convFtd.toFixed(1)}% conv.` },
    { label: "Lucro real", value: totals.revenue.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 2 }), icon: Wallet },
  ];

  return (
    <div className="space-y-6">
      {/* Hero */}
      <div className="glass-card p-5 md:p-6 relative overflow-hidden">
        <div className="absolute inset-0 opacity-40 pointer-events-none bg-gradient-to-br from-primary/10 via-transparent to-transparent" />
        <div className="relative flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div>
            <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Olá{name ? `, ${name.split(" ")[0]}` : ""}</p>
            <h1 className="text-2xl md:text-3xl font-semibold tracking-tight mt-1">Seu painel de performance</h1>
            <p className="text-sm text-muted-foreground mt-1 max-w-lg">Acompanhe cliques, cadastros, FTDs e lucro real atribuído aos seus links. Dados sincronizados em tempo real.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link to="/portal/links" className="btn-primary text-[12px] px-3 py-2 inline-flex items-center gap-1.5">
              Meus links <ArrowUpRight size={13} />
            </Link>
            <Link to="/portal/financeiro" className="text-[12px] px-3 py-2 rounded-lg bg-secondary/60 hover:bg-secondary text-foreground/90 inline-flex items-center gap-1.5">
              Financeiro <ArrowUpRight size={13} />
            </Link>
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        {kpis.map((c) => (
          <div key={c.label} className="glass-card p-4 md:p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] text-muted-foreground">{c.label}</span>
              <c.icon size={14} className="text-primary/80" />
            </div>
            <div className="text-xl md:text-2xl font-semibold tracking-tight">
              {loading ? <span className="inline-block h-6 w-16 rounded bg-secondary/60 animate-pulse" /> : c.value}
            </div>
            {c.sub && <p className="text-[10px] text-muted-foreground mt-1">{c.sub}</p>}
          </div>
        ))}
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        {/* Sparkline receita 14d */}
        <div className="md:col-span-2 glass-card p-5">
          <div className="flex items-baseline justify-between mb-3">
            <div>
              <h3 className="section-title">Lucro real — últimos 14 dias</h3>
              <p className="text-[11px] text-muted-foreground">RevShare + CPA em BRL</p>
            </div>
            <span className="text-[11px] text-muted-foreground">Máx {maxV.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 })}</span>
          </div>
          <div className="flex items-end gap-1 h-28">
            {last14.map((x, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <div
                  className="w-full rounded-t bg-gradient-to-t from-primary/70 to-primary-glow/90"
                  style={{ height: `${Math.max(4, (x.v / maxV) * 100)}%`, minHeight: 4 }}
                  title={`${x.d}: ${x.v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}`}
                />
              </div>
            ))}
          </div>
          <div className="flex justify-between text-[9px] text-muted-foreground mt-1.5 tabular-nums">
            <span>{new Date(last14[0].d).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}</span>
            <span>{new Date(last14[last14.length - 1].d).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}</span>
          </div>
        </div>

        {/* Comissão + vínculo */}
        <div className="glass-card p-5 space-y-4">
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Comissão estimada</span>
              <Percent size={13} className="text-primary/80" />
            </div>
            <p className="text-2xl font-semibold tracking-tight text-primary">
              {estCommission.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
            </p>
            <p className="text-[11px] text-muted-foreground">{commissionPct}% sobre receita validada</p>
          </div>
          <div className="pt-3 border-t border-border/40 space-y-1.5 text-[12px]">
            <div className="flex items-center gap-2 text-muted-foreground"><Users size={12} /> Gerente</div>
            <p className="text-foreground/90 font-medium">{manager?.name ?? "—"}</p>
            {manager?.team_name && <p className="text-[11px] text-muted-foreground">Time {manager.team_name}</p>}
          </div>
          <div className="pt-3 border-t border-border/40 flex items-center justify-between text-[12px]">
            <span className="text-muted-foreground">Links ativos</span>
            <span className="font-semibold">{linkCount}</span>
          </div>
        </div>
      </div>

      {/* Como funciona */}
      <div className="glass-card p-5">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles size={14} className="text-primary" />
          <h3 className="section-title mb-0">Como o portal funciona</h3>
        </div>
        <ul className="text-[13px] text-muted-foreground leading-relaxed space-y-1.5 list-disc pl-5">
          <li>Seus links já vêm com <strong className="text-foreground/90">landing page e atribuição</strong> configuradas — basta copiar e divulgar.</li>
          <li>Cada clique, cadastro, FTD e depósito é <strong className="text-foreground/90">rastreado automaticamente</strong> e refletido nos seus KPIs.</li>
          <li>Sua comissão é calculada sobre a receita <strong className="text-foreground/90">validada pela operação</strong> e liberada em Financeiro → Saques.</li>
        </ul>
      </div>
    </div>
  );
}
