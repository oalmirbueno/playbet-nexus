import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export default function PortalFinanceiro() {
  const { user } = useAuth();
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: prof } = await supabase.from("profiles").select("influencer_id").eq("id", user!.id).maybeSingle();
      if (!prof?.influencer_id) { setLoading(false); return; }
      const { data } = await supabase
        .from("tracking_metrics")
        .select("data_ref, cliques, registros, ftd, revenue")
        .eq("influencer_id", prof.influencer_id)
        .order("data_ref", { ascending: false })
        .limit(90);
      setRows(data ?? []);
      setLoading(false);
    })();
  }, [user]);

  const totalRev = rows.reduce((a, r) => a + Number(r.revenue ?? 0), 0);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="page-header">Financeiro</h1>
        <p className="page-subtitle">Extrato dos últimos 90 dias.</p>
      </div>

      <div className="glass-card p-5 flex items-baseline justify-between">
        <div>
          <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Receita acumulada</p>
          <p className="text-3xl font-semibold tracking-tight mt-1">
            {totalRev.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
          </p>
        </div>
        <span className="text-[11px] text-muted-foreground">{rows.length} dias</span>
      </div>

      <div className="glass-card overflow-hidden">
        <div className="max-h-[520px] overflow-y-auto">
          <table className="w-full text-[13px]">
            <thead className="bg-secondary/40 text-[11px] uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-2 text-left">Data</th>
                <th className="px-4 py-2 text-right">Cliques</th>
                <th className="px-4 py-2 text-right">Cadastros</th>
                <th className="px-4 py-2 text-right">FTD</th>
                <th className="px-4 py-2 text-right">Receita</th>
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={5} className="px-4 py-6 text-center text-muted-foreground">Carregando…</td></tr>}
              {!loading && rows.length === 0 && <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">Sem movimentação por enquanto.</td></tr>}
              {rows.map((r, i) => (
                <tr key={i} className="border-t border-border/40">
                  <td className="px-4 py-2">{new Date(r.data_ref).toLocaleDateString("pt-BR")}</td>
                  <td className="px-4 py-2 text-right">{(r.cliques ?? 0).toLocaleString("pt-BR")}</td>
                  <td className="px-4 py-2 text-right">{(r.registros ?? 0).toLocaleString("pt-BR")}</td>
                  <td className="px-4 py-2 text-right">{(r.ftd ?? 0).toLocaleString("pt-BR")}</td>
                  <td className="px-4 py-2 text-right font-medium">{Number(r.revenue ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
