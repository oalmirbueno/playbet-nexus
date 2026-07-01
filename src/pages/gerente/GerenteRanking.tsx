import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Trophy } from "lucide-react";

export default function GerenteRanking() {
  const { user } = useAuth();
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: prof } = await supabase.from("profiles").select("manager_id").eq("id", user!.id).maybeSingle();
      if (!prof?.manager_id) { setLoading(false); return; }
      const { data: m } = await supabase.from("managers").select("squad_id").eq("id", prof.manager_id).maybeSingle();
      const { data: infs } = await supabase.from("influencers").select("id, name, slug, instagram").eq("squad_id", m?.squad_id ?? "");
      const ids = (infs ?? []).map((i) => i.id);
      if (!ids.length) { setRows([]); setLoading(false); return; }
      const { data: metrics } = await supabase
        .from("tracking_metrics")
        .select("influencer_id, revenue, ftd, cliques")
        .in("influencer_id", ids);
      const byInf: Record<string, any> = {};
      for (const inf of infs!) byInf[inf.id] = { ...inf, revenue: 0, ftd: 0, cliques: 0 };
      for (const m of metrics ?? []) {
        const row = byInf[m.influencer_id];
        if (!row) continue;
        row.revenue += Number(m.revenue ?? 0);
        row.ftd += m.ftd ?? 0;
        row.cliques += m.cliques ?? 0;
      }
      const list = Object.values(byInf).sort((a: any, b: any) => b.revenue - a.revenue);
      setRows(list);
      setLoading(false);
    })();
  }, [user]);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="page-header">Ranking do squad</h1>
        <p className="page-subtitle">Ordenado por receita gerada.</p>
      </div>

      {loading ? (
        <div className="glass-card p-6 text-sm text-muted-foreground">Carregando…</div>
      ) : rows.length === 0 ? (
        <div className="glass-card p-8 text-center">
          <Trophy className="mx-auto mb-3 text-muted-foreground" size={22} />
          <p className="text-sm font-medium">Sem influenciadores no squad ainda</p>
        </div>
      ) : (
        <div className="glass-card overflow-hidden">
          <table className="w-full text-[13px]">
            <thead className="bg-secondary/40 text-[11px] uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-2 text-left w-12">#</th>
                <th className="px-4 py-2 text-left">Influenciador</th>
                <th className="px-4 py-2 text-right">Cliques</th>
                <th className="px-4 py-2 text-right">FTD</th>
                <th className="px-4 py-2 text-right">Receita</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r.id} className="border-t border-border/40">
                  <td className="px-4 py-2 text-muted-foreground">{i + 1}</td>
                  <td className="px-4 py-2">
                    <div className="font-medium">{r.name}</div>
                    <div className="text-[11px] text-muted-foreground">{r.instagram ?? r.slug}</div>
                  </td>
                  <td className="px-4 py-2 text-right">{r.cliques.toLocaleString("pt-BR")}</td>
                  <td className="px-4 py-2 text-right">{r.ftd.toLocaleString("pt-BR")}</td>
                  <td className="px-4 py-2 text-right font-medium">{r.revenue.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
