import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Sparkles, ExternalLink, Calendar, TrendingUp } from "lucide-react";

export default function GerenteOportunidades() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("lp_opportunities")
        .select("id, title, subtitle, cta_label, cta_url, category, priority, starts_at, ends_at, is_active, landing_page_id")
        .eq("is_active", true)
        .order("priority", { ascending: false })
        .order("starts_at", { ascending: false })
        .limit(60);
      setRows(data ?? []);
      setLoading(false);
    })();
  }, []);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="page-header">Oportunidades ativas</h1>
        <p className="page-subtitle">Preview das campanhas em destaque para você repassar ao squad e ampliar conversões.</p>
      </div>

      {loading ? (
        <div className="glass-card p-6 text-sm text-muted-foreground">Carregando…</div>
      ) : rows.length === 0 ? (
        <div className="glass-card p-10 text-center">
          <Sparkles className="mx-auto mb-3 text-muted-foreground" size={22} />
          <p className="text-sm font-medium">Nenhuma oportunidade ativa no momento</p>
          <p className="text-xs text-muted-foreground mt-1">Quando o admin publicar campanhas elas aparecem aqui automaticamente.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {rows.map(o => (
            <div key={o.id} className="glass-card p-4 md:p-5 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    {o.category && (
                      <span className="text-[10px] uppercase tracking-[0.16em] px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">{o.category}</span>
                    )}
                    {typeof o.priority === "number" && o.priority > 0 && (
                      <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                        <TrendingUp size={11} /> prioridade {o.priority}
                      </span>
                    )}
                  </div>
                  <p className="text-sm font-medium leading-snug">{o.title}</p>
                  {o.subtitle && <p className="text-[12px] text-muted-foreground mt-0.5 line-clamp-2">{o.subtitle}</p>}
                </div>
              </div>
              <div className="flex items-center justify-between gap-3 pt-2 border-t border-border/40 text-[11px] text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <Calendar size={11} />
                  {o.starts_at ? new Date(o.starts_at).toLocaleDateString("pt-BR") : "—"}
                  {o.ends_at ? ` → ${new Date(o.ends_at).toLocaleDateString("pt-BR")}` : ""}
                </span>
                {o.cta_url && (
                  <a href={o.cta_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline">
                    {o.cta_label ?? "Abrir"} <ExternalLink size={11} />
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
