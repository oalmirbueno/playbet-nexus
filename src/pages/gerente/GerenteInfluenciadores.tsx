import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, usePreviewScope } from "@/contexts/AuthContext";
import { useManagerSync } from "@/hooks/useManagerSync";
import { Search, Users } from "lucide-react";
import { getMetricMoneyParts } from "@/lib/trackingMetrics";

type Row = {
  id: string; name: string; slug: string; instagram: string | null;
  category: string | null; is_active: boolean;
  clicks: number; ftd: number; revenue: number;
};

export default function GerenteInfluenciadores() {
  const { user } = useAuth();
  const scope = usePreviewScope();
  const { revision } = useManagerSync();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");

  useEffect(() => {
    (async () => {
      const prof = scope.active
        ? { full_name: scope.target?.name ?? "", influencer_id: scope.influencerId, manager_id: scope.managerId } as any
        : (await supabase.from("profiles").select("manager_id").eq("id", user!.id).maybeSingle()).data;
      if (!prof?.manager_id) { setLoading(false); return; }
      const { data: m } = await supabase.from("managers").select("squad_id").eq("id", prof.manager_id).maybeSingle();
      const { data: infs } = await supabase
        .from("influencers")
        .select("id, name, slug, instagram, category, is_active")
        .eq("squad_id", m?.squad_id ?? "")
        .order("name");
      const ids = (infs ?? []).map(i => i.id);
      const { data: metrics } = ids.length
        ? await supabase.from("tracking_metrics").select("influencer_id, cliques, ftd, revenue, cpa_commission, revshare_commission, commission_total, origem_importacao").in("influencer_id", ids).eq("is_demo", false)
        : { data: [] as any[] };
      const agg = new Map<string, { clicks: number; ftd: number; revenue: number }>();
      (metrics ?? []).forEach((mt: any) => {
        const cur = agg.get(mt.influencer_id) ?? { clicks: 0, ftd: 0, revenue: 0 };
        cur.clicks += mt.cliques ?? 0; cur.ftd += mt.ftd ?? 0; cur.revenue += getMetricMoneyParts(mt).total;
        agg.set(mt.influencer_id, cur);
      });
      setRows((infs ?? []).map(i => ({ ...i, ...(agg.get(i.id) ?? { clicks: 0, ftd: 0, revenue: 0 }) })));
      setLoading(false);
    })();
  }, [user, revision]);

  const filtered = useMemo(() => rows.filter(r => {
    if (statusFilter === "active" && !r.is_active) return false;
    if (statusFilter === "inactive" && r.is_active) return false;
    if (!q) return true;
    const s = q.toLowerCase();
    return r.name.toLowerCase().includes(s) || (r.instagram ?? "").toLowerCase().includes(s) || r.slug.toLowerCase().includes(s);
  }), [rows, q, statusFilter]);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="page-header">Influenciadores</h1>
        <p className="page-subtitle">{rows.length} vinculados ao seu squad · {rows.filter(r => r.is_active).length} ativos.</p>
      </div>

      <div className="glass-card p-3 flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[220px]">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input className="input-field pl-8" placeholder="Buscar por nome, @ ou slug…" value={q} onChange={e => setQ(e.target.value)} />
        </div>
        <div className="flex items-center gap-1 text-[12px]">
          {(["all", "active", "inactive"] as const).map(v => (
            <button key={v} onClick={() => setStatusFilter(v)}
              className={`px-3 py-1.5 rounded-lg border ${statusFilter === v ? "bg-primary/15 text-primary border-primary/30" : "border-border/40 text-muted-foreground hover:text-foreground"}`}>
              {v === "all" ? "Todos" : v === "active" ? "Ativos" : "Inativos"}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="glass-card p-6 text-sm text-muted-foreground">Carregando…</div>
      ) : filtered.length === 0 ? (
        <div className="glass-card p-10 text-center">
          <Users className="mx-auto mb-3 text-muted-foreground" size={22} />
          <p className="text-sm font-medium">Nenhum influenciador encontrado</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map(r => (
            <Link key={r.id} to={`/influencers/${r.id}`} className="glass-card p-4 hover:border-primary/40 transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-primary-glow flex items-center justify-center text-primary-foreground text-sm font-semibold">
                  {r.name?.charAt(0)?.toUpperCase() ?? "?"}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-medium truncate">{r.name}</p>
                  <p className="text-[11px] text-muted-foreground truncate">{r.instagram ?? `@${r.slug}`}</p>
                </div>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full border ${r.is_active ? "bg-success/10 text-success border-success/20" : "bg-muted/40 text-muted-foreground border-border/40"}`}>
                  {r.is_active ? "Ativo" : "Inativo"}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-border/40">
                <Mini label="Cliques" value={r.clicks.toLocaleString("pt-BR")} />
                <Mini label="FTDs" value={r.ftd.toLocaleString("pt-BR")} />
                <Mini label="Lucro" value={r.revenue.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 2 })} highlight />
              </div>
              {r.category && (
                <div className="mt-2 text-[10px] uppercase tracking-[0.14em] text-muted-foreground">{r.category}</div>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function Mini({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
      <p className={`text-sm font-semibold tabular-nums ${highlight ? "text-primary" : "text-foreground"}`}>{value}</p>
    </div>
  );
}
