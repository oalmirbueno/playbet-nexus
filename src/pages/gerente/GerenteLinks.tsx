import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, usePreviewScope } from "@/contexts/AuthContext";
import { useManagerSync } from "@/hooks/useManagerSync";
import { Copy, ExternalLink, Link2, Search, Power, PowerOff, ShieldAlert, Flame, Sparkles } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { resolveShareUrl } from "@/lib/trackingUrl";

interface EnrichedLink {
  id: string;
  tracking_code: string;
  status: string | null;
  created_at: string;
  share_url: string;
  influencer_id: string;
  influencer_name: string;
  influencer_slug: string;
  platform_name?: string;
  platform_id?: string | null;
  lp_name?: string;
  game_name?: string | null;
  game_icon_url?: string | null;
  hype_reason?: string | null;
  metrics: { clicks: number; regs: number; ftd: number; revenue: number };
  raw: any;
}

export default function GerenteLinks() {
  const { user } = useAuth();
  const scope = usePreviewScope();
  const { revision } = useManagerSync();
  const [links, setLinks] = useState<EnrichedLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "paused">("all");

  const load = async () => {
    setLoading(true);
    const prof = scope.active
        ? { full_name: scope.target?.name ?? "", influencer_id: scope.influencerId, manager_id: scope.managerId } as any
        : (await supabase.from("profiles").select("manager_id").eq("id", user!.id).maybeSingle()).data;
    if (!prof?.manager_id) { setLoading(false); return; }
    const { data: m } = await supabase.from("managers").select("squad_id").eq("id", prof.manager_id).maybeSingle();
    if (!m?.squad_id) { setLoading(false); return; }

    const { data: infs } = await supabase
      .from("influencers")
      .select("id, name, slug")
      .eq("squad_id", m.squad_id);
    const infMap = new Map((infs ?? []).map(i => [i.id, i]));
    const infIds = (infs ?? []).map(i => i.id);
    if (!infIds.length) { setLinks([]); setLoading(false); return; }

    const [{ data: rawLinks }, { data: metrics }] = await Promise.all([
      supabase.from("tracking_links")
        .select("id, tracking_code, status, created_at, base_url, final_url, short_url, click_id_param_name, landing_page_instance_id, landing_page_id, platform_account_id, influencer_id, game_name, game_icon_url, link_category, hype_reason")
        .in("influencer_id", infIds).eq("is_demo", false).order("created_at", { ascending: false }),
      supabase.from("tracking_metrics")
        .select("platform_account_id, influencer_id, cliques, registros, ftd, revenue")
        .in("influencer_id", infIds).eq("is_demo", false),
    ]);

    const lpiIds = (rawLinks ?? []).map(l => l.landing_page_instance_id).filter(Boolean) as string[];
    const lpIds = (rawLinks ?? []).map(l => l.landing_page_id).filter(Boolean) as string[];
    const paIds = (rawLinks ?? []).map(l => l.platform_account_id).filter(Boolean) as string[];

    const [{ data: instances }, { data: lps }, { data: accs }] = await Promise.all([
      lpiIds.length ? supabase.from("landing_page_instances").select("id, slug, landing_page_id").in("id", lpiIds) : Promise.resolve({ data: [] as any[] }),
      lpIds.length ? supabase.from("landing_pages").select("id, name, domain").in("id", lpIds) : Promise.resolve({ data: [] as any[] }),
      paIds.length ? supabase.from("platform_accounts").select("id, nome_conta, platforms(name)").in("id", paIds) : Promise.resolve({ data: [] as any[] }),
    ]);
    const instMap = new Map((instances ?? []).map((i: any) => [i.id, i]));
    const lpMap = new Map((lps ?? []).map((l: any) => [l.id, l]));
    const accMap = new Map((accs ?? []).map((a: any) => [a.id, a]));

    const metricsKey = (infId: string, paId?: string | null) => `${infId}|${paId || "_"}`;
    const metricsAgg = new Map<string, { clicks: number; regs: number; ftd: number; revenue: number }>();
    (metrics ?? []).forEach((mt: any) => {
      const k = metricsKey(mt.influencer_id, mt.platform_account_id);
      const cur = metricsAgg.get(k) ?? { clicks: 0, regs: 0, ftd: 0, revenue: 0 };
      cur.clicks += mt.cliques ?? 0; cur.regs += mt.registros ?? 0;
      cur.ftd += mt.ftd ?? 0; cur.revenue += Number(mt.revenue ?? 0);
      metricsAgg.set(k, cur);
    });

    const enriched: EnrichedLink[] = (rawLinks ?? []).map((l: any) => {
      const inst = l.landing_page_instance_id ? instMap.get(l.landing_page_instance_id) : null;
      const lp = l.landing_page_id ? lpMap.get(l.landing_page_id) : (inst ? lpMap.get(inst.landing_page_id) : null);
      const acc: any = l.platform_account_id ? accMap.get(l.platform_account_id) : null;
      const inf: any = infMap.get(l.influencer_id);
      const share = resolveShareUrl({
        lpDomain: lp?.domain ?? null,
        instanceSlug: inst?.slug ?? null,
        affiliateBaseUrl: l.final_url || l.base_url,
        clickIdParamName: l.click_id_param_name,
        sub1: l.tracking_code,
      });
      return {
        id: l.id,
        tracking_code: l.tracking_code,
        status: l.status,
        created_at: l.created_at,
        share_url: share || l.short_url || l.final_url || l.base_url || "",
        influencer_id: l.influencer_id,
        influencer_name: inf?.name ?? "—",
        influencer_slug: inf?.slug ?? "",
        platform_name: acc?.platforms?.name || acc?.nome_conta,
        lp_name: lp?.name,
        metrics: metricsAgg.get(metricsKey(l.influencer_id, l.platform_account_id)) ?? { clicks: 0, regs: 0, ftd: 0, revenue: 0 },
        raw: l,
      };
    });

    setLinks(enriched);
    setLoading(false);
  };

  useEffect(() => { load(); }, [user, revision]);

  const filtered = useMemo(() => {
    return links.filter(l => {
      if (statusFilter === "active" && l.status && l.status !== "active") return false;
      if (statusFilter === "paused" && l.status !== "paused") return false;
      if (!q) return true;
      const s = q.toLowerCase();
      return l.influencer_name.toLowerCase().includes(s)
        || l.tracking_code.toLowerCase().includes(s)
        || (l.platform_name ?? "").toLowerCase().includes(s)
        || (l.lp_name ?? "").toLowerCase().includes(s);
    });
  }, [links, q, statusFilter]);

  const totals = useMemo(() => filtered.reduce((a, l) => ({
    clicks: a.clicks + l.metrics.clicks,
    regs: a.regs + l.metrics.regs,
    ftd: a.ftd + l.metrics.ftd,
    revenue: a.revenue + l.metrics.revenue,
  }), { clicks: 0, regs: 0, ftd: 0, revenue: 0 }), [filtered]);

  const toggleStatus = async (l: EnrichedLink) => {
    setBusyId(l.id);
    const next = (l.status === "paused") ? "active" : "paused";
    const { error } = await supabase.from("tracking_links").update({ status: next }).eq("id", l.id);
    setBusyId(null);
    if (error) { toast({ title: "Sem permissão para alterar", description: error.message, variant: "destructive" }); return; }
    toast({ title: next === "paused" ? "Link pausado" : "Link ativado" });
    load();
  };

  const copy = (url: string) => { navigator.clipboard.writeText(url); toast({ title: "Link copiado" }); };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="page-header">Links do squad</h1>
          <p className="page-subtitle">Visualize, copie e pause os links dos seus influenciadores. Criação e edição completa segue com o admin central.</p>
        </div>
        <div className="text-[11px] text-muted-foreground inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-secondary/50 border border-border/40">
          <ShieldAlert size={12} /> Modo gerente · edição limitada
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Links", value: filtered.length.toLocaleString("pt-BR") },
          { label: "Cliques", value: totals.clicks.toLocaleString("pt-BR") },
          { label: "FTDs", value: totals.ftd.toLocaleString("pt-BR") },
          { label: "Receita", value: totals.revenue.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }) },
        ].map(c => (
          <div key={c.label} className="glass-card p-4">
            <p className="text-[11px] text-muted-foreground mb-1">{c.label}</p>
            <p className="text-xl font-semibold tabular-nums">{c.value}</p>
          </div>
        ))}
      </div>

      <div className="glass-card p-3 flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[220px]">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input className="input-field pl-8" placeholder="Buscar por influenciador, código, LP…" value={q} onChange={e => setQ(e.target.value)} />
        </div>
        <div className="flex items-center gap-1 text-[12px]">
          {(["all", "active", "paused"] as const).map(v => (
            <button key={v} onClick={() => setStatusFilter(v)}
              className={`px-3 py-1.5 rounded-lg border ${statusFilter === v ? "bg-primary/15 text-primary border-primary/30" : "border-border/40 text-muted-foreground hover:text-foreground"}`}>
              {v === "all" ? "Todos" : v === "active" ? "Ativos" : "Pausados"}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="glass-card p-6 text-sm text-muted-foreground">Carregando…</div>
      ) : filtered.length === 0 ? (
        <div className="glass-card p-10 text-center">
          <Link2 className="mx-auto mb-3 text-muted-foreground" size={22} />
          <p className="text-sm font-medium">Nenhum link encontrado</p>
          <p className="text-xs text-muted-foreground mt-1">Os links gerados no admin central aparecem aqui automaticamente.</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {filtered.map(l => (
            <div key={l.id} className="glass-card p-4 md:p-5">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap mb-1.5">
                    <span className="text-[11px] font-medium">{l.influencer_name}</span>
                    <span className="text-[10px] text-muted-foreground">@{l.influencer_slug}</span>
                    {l.platform_name && (
                      <span className="text-[10px] uppercase tracking-[0.16em] px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">{l.platform_name}</span>
                    )}
                    {l.lp_name && (
                      <span className="text-[10px] uppercase tracking-[0.16em] px-2 py-0.5 rounded-full bg-secondary/60 text-muted-foreground border border-border/40">LP · {l.lp_name}</span>
                    )}
                    <span className={`text-[10px] uppercase tracking-[0.16em] px-2 py-0.5 rounded-full border ${l.status === "paused" ? "bg-muted/40 text-muted-foreground border-border/40" : "bg-success/10 text-success border-success/20"}`}>
                      {l.status === "paused" ? "pausado" : "ativo"}
                    </span>
                  </div>
                  <p className="text-[12px] font-mono truncate text-foreground/90" title={l.share_url}>{l.share_url}</p>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Código <span className="font-mono">{l.tracking_code}</span> · criado em {new Date(l.created_at).toLocaleDateString("pt-BR")}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => copy(l.share_url)} className="btn-primary text-[11px] px-3 py-1.5 gap-1.5 inline-flex items-center"><Copy size={12} /> Copiar</button>
                  <a href={l.share_url} target="_blank" rel="noreferrer" className="p-2 rounded-lg hover:bg-secondary/60 text-muted-foreground hover:text-foreground" title="Abrir"><ExternalLink size={14} /></a>
                  <button onClick={() => toggleStatus(l)} disabled={busyId === l.id}
                    className="p-2 rounded-lg hover:bg-secondary/60 text-muted-foreground hover:text-foreground disabled:opacity-50"
                    title={l.status === "paused" ? "Ativar" : "Pausar"}>
                    {l.status === "paused" ? <Power size={14} /> : <PowerOff size={14} />}
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-4 gap-2 pt-3 mt-3 border-t border-border/40">
                <MiniStat label="Cliques" value={l.metrics.clicks.toLocaleString("pt-BR")} />
                <MiniStat label="Cadastros" value={l.metrics.regs.toLocaleString("pt-BR")} />
                <MiniStat label="FTDs" value={l.metrics.ftd.toLocaleString("pt-BR")} />
                <MiniStat label="Receita" value={l.metrics.revenue.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 })} highlight />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function MiniStat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
      <p className={`text-sm font-semibold tabular-nums ${highlight ? "text-primary" : "text-foreground"}`}>{value}</p>
    </div>
  );
}
