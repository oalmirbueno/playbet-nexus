import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Copy, Link2, ExternalLink, Sparkles, MousePointerClick, TrendingUp, Wallet } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { resolveShareUrl } from "@/lib/trackingUrl";

interface EnrichedLink {
  id: string;
  tracking_code: string;
  created_at: string;
  status: string | null;
  share_url: string;
  platform_name?: string;
  lp_name?: string;
  lp_domain?: string | null;
  metrics: { clicks: number; regs: number; ftd: number; revenue: number };
}

export default function PortalLinks() {
  const { user } = useAuth();
  const [links, setLinks] = useState<EnrichedLink[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data: prof } = await supabase.from("profiles").select("influencer_id").eq("id", user!.id).maybeSingle();
      const infId = prof?.influencer_id;
      if (!infId) { setLoading(false); return; }

      const [{ data: rawLinks }, { data: metrics }] = await Promise.all([
        supabase
          .from("tracking_links")
          .select(`
            id, tracking_code, created_at, status, base_url, final_url, short_url,
            click_id_param_name, landing_page_instance_id, landing_page_id, platform_account_id
          `)
          .eq("influencer_id", infId)
          .eq("is_demo", false)
          .order("created_at", { ascending: false }),
        supabase
          .from("tracking_metrics")
          .select("platform_account_id, cliques, registros, ftd, revenue")
          .eq("influencer_id", infId)
          .eq("is_demo", false),
      ]);

      const lpiIds = (rawLinks ?? []).map(l => l.landing_page_instance_id).filter(Boolean) as string[];
      const lpIds = (rawLinks ?? []).map(l => l.landing_page_id).filter(Boolean) as string[];
      const paIds = (rawLinks ?? []).map(l => l.platform_account_id).filter(Boolean) as string[];

      const [{ data: instances }, { data: lps }, { data: accs }] = await Promise.all([
        lpiIds.length ? supabase.from("landing_page_instances").select("id, slug, landing_page_id").in("id", lpiIds) : Promise.resolve({ data: [] as any[] }),
        lpIds.length ? supabase.from("landing_pages").select("id, name, domain").in("id", lpIds) : Promise.resolve({ data: [] as any[] }),
        paIds.length ? supabase.from("platform_accounts").select("id, nome_conta, platform_id, platforms(name)").in("id", paIds) : Promise.resolve({ data: [] as any[] }),
      ]);

      const instMap = new Map((instances ?? []).map((i: any) => [i.id, i]));
      const lpMap = new Map((lps ?? []).map((l: any) => [l.id, l]));
      const accMap = new Map((accs ?? []).map((a: any) => [a.id, a]));

      // Aggregate metrics per platform_account (best-effort per-link attribution)
      const metricsByAcc = new Map<string, { clicks: number; regs: number; ftd: number; revenue: number }>();
      (metrics ?? []).forEach((m: any) => {
        const k = m.platform_account_id || "_";
        const cur = metricsByAcc.get(k) ?? { clicks: 0, regs: 0, ftd: 0, revenue: 0 };
        cur.clicks += m.cliques ?? 0;
        cur.regs += m.registros ?? 0;
        cur.ftd += m.ftd ?? 0;
        cur.revenue += Number(m.revenue ?? 0);
        metricsByAcc.set(k, cur);
      });

      const enriched: EnrichedLink[] = (rawLinks ?? []).map((l: any) => {
        const inst = l.landing_page_instance_id ? instMap.get(l.landing_page_instance_id) : null;
        const lp = l.landing_page_id ? lpMap.get(l.landing_page_id) : (inst ? lpMap.get(inst.landing_page_id) : null);
        const acc: any = l.platform_account_id ? accMap.get(l.platform_account_id) : null;

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
          created_at: l.created_at,
          status: l.status,
          share_url: share || l.short_url || l.final_url || l.base_url || "",
          platform_name: acc?.platforms?.name || acc?.nome_conta,
          lp_name: lp?.name,
          lp_domain: lp?.domain,
          metrics: metricsByAcc.get(l.platform_account_id || "_") ?? { clicks: 0, regs: 0, ftd: 0, revenue: 0 },
        };
      });

      setLinks(enriched);
      setLoading(false);
    })();
  }, [user]);

  const totals = useMemo(() => links.reduce((a, l) => ({
    clicks: a.clicks + l.metrics.clicks,
    regs: a.regs + l.metrics.regs,
    ftd: a.ftd + l.metrics.ftd,
    revenue: a.revenue + l.metrics.revenue,
  }), { clicks: 0, regs: 0, ftd: 0, revenue: 0 }), [links]);

  const copy = (url: string) => {
    navigator.clipboard.writeText(url);
    toast({ title: "Link copiado", description: url });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-header">Meus links</h1>
        <p className="page-subtitle">Copie e compartilhe. Cada clique é atribuído ao seu perfil.</p>
      </div>

      {/* Totais consolidados */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Cliques", value: totals.clicks.toLocaleString("pt-BR"), icon: MousePointerClick },
          { label: "Cadastros", value: totals.regs.toLocaleString("pt-BR"), icon: Sparkles },
          { label: "FTDs", value: totals.ftd.toLocaleString("pt-BR"), icon: TrendingUp },
          { label: "Receita gerada", value: totals.revenue.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }), icon: Wallet },
        ].map((c) => (
          <div key={c.label} className="glass-card p-4">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] text-muted-foreground">{c.label}</span>
              <c.icon size={13} className="text-primary/80" />
            </div>
            <div className="text-xl font-semibold tracking-tight">{c.value}</div>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="glass-card p-6 text-sm text-muted-foreground">Carregando…</div>
      ) : links.length === 0 ? (
        <div className="glass-card p-10 text-center">
          <Link2 className="mx-auto mb-3 text-muted-foreground" size={22} />
          <p className="text-sm font-medium">Você ainda não tem links ativos</p>
          <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
            Fale com sua gerência para gerar seus links de afiliado. Assim que forem publicados eles aparecem aqui automaticamente.
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {links.map((l) => (
            <div key={l.id} className="glass-card p-4 md:p-5 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap mb-1.5">
                    {l.platform_name && (
                      <span className="text-[10px] uppercase tracking-[0.16em] px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                        {l.platform_name}
                      </span>
                    )}
                    {l.lp_name && (
                      <span className="text-[10px] uppercase tracking-[0.16em] px-2 py-0.5 rounded-full bg-secondary/60 text-muted-foreground border border-border/40">
                        LP · {l.lp_name}
                      </span>
                    )}
                    <span className={`text-[10px] uppercase tracking-[0.16em] px-2 py-0.5 rounded-full border ${l.status === "active" || !l.status ? "bg-success/10 text-success border-success/20" : "bg-muted/40 text-muted-foreground border-border/40"}`}>
                      {l.status ?? "ativo"}
                    </span>
                  </div>
                  <p className="text-[13px] font-mono truncate text-foreground/90" title={l.share_url}>{l.share_url}</p>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Código <span className="font-mono">{l.tracking_code}</span> · criado em {new Date(l.created_at).toLocaleDateString("pt-BR")}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => copy(l.share_url)} className="btn-primary text-[11px] px-3 py-1.5 gap-1.5 inline-flex items-center" title="Copiar">
                    <Copy size={12} /> Copiar
                  </button>
                  <a href={l.share_url} target="_blank" rel="noreferrer" className="p-2 rounded-lg hover:bg-secondary/60 text-muted-foreground hover:text-foreground" title="Abrir">
                    <ExternalLink size={14} />
                  </a>
                </div>
              </div>
              <div className="grid grid-cols-4 gap-2 pt-2 border-t border-border/40">
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
