import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useManagerSync } from "@/hooks/useManagerSync";
import { Trophy, Medal, Search } from "lucide-react";

type Row = {
  id: string; name: string; slug: string; instagram: string | null;
  clicks: number; regs: number; ftd: number; revenue: number;
  regRate: number; ftdRate: number;
};

const PERIODS = [
  { key: "7d", label: "7 dias", days: 7 },
  { key: "30d", label: "30 dias", days: 30 },
  { key: "90d", label: "90 dias", days: 90 },
  { key: "all", label: "Total", days: null as number | null },
] as const;

export default function GerenteRanking() {
  const { user } = useAuth();
  const { revision } = useManagerSync();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<typeof PERIODS[number]["key"]>("30d");
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<"revenue" | "ftd" | "clicks" | "ftdRate">("revenue");

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data: prof } = await supabase.from("profiles").select("manager_id").eq("id", user!.id).maybeSingle();
      if (!prof?.manager_id) { setLoading(false); return; }
      const { data: m } = await supabase.from("managers").select("squad_id").eq("id", prof.manager_id).maybeSingle();
      const { data: infs } = await supabase.from("influencers").select("id, name, slug, instagram").eq("squad_id", m?.squad_id ?? "");
      const ids = (infs ?? []).map(i => i.id);
      if (!ids.length) { setRows([]); setLoading(false); return; }

      const days = PERIODS.find(p => p.key === period)?.days;
      let query = supabase.from("tracking_metrics")
        .select("influencer_id, revenue, ftd, cliques, registros, data_ref")
        .in("influencer_id", ids)
        .eq("is_demo", false);
      if (days) {
        const from = new Date(); from.setDate(from.getDate() - days);
        query = query.gte("data_ref", from.toISOString().slice(0, 10));
      }
      const { data: metrics } = await query;

      const byInf: Record<string, Row> = {};
      for (const inf of infs!) byInf[inf.id] = {
        id: inf.id, name: inf.name, slug: inf.slug, instagram: inf.instagram,
        clicks: 0, regs: 0, ftd: 0, revenue: 0, regRate: 0, ftdRate: 0,
      };
      for (const mt of metrics ?? []) {
        const r = byInf[mt.influencer_id]; if (!r) continue;
        r.revenue += Number(mt.revenue ?? 0);
        r.ftd += mt.ftd ?? 0;
        r.clicks += mt.cliques ?? 0;
        r.regs += mt.registros ?? 0;
      }
      Object.values(byInf).forEach(r => {
        r.regRate = r.clicks > 0 ? (r.regs / r.clicks) * 100 : 0;
        r.ftdRate = r.regs > 0 ? (r.ftd / r.regs) * 100 : 0;
      });
      setRows(Object.values(byInf));
      setLoading(false);
    })();
  }, [user, period]);

  const sorted = useMemo(() => {
    const filtered = q ? rows.filter(r => (r.name + (r.instagram ?? "") + r.slug).toLowerCase().includes(q.toLowerCase())) : rows;
    return [...filtered].sort((a, b) => (b as any)[sort] - (a as any)[sort]);
  }, [rows, q, sort]);

  const totals = useMemo(() => rows.reduce((a, r) => ({
    revenue: a.revenue + r.revenue, ftd: a.ftd + r.ftd, clicks: a.clicks + r.clicks, regs: a.regs + r.regs,
  }), { revenue: 0, ftd: 0, clicks: 0, regs: 0 }), [rows]);

  const medal = (i: number) =>
    i === 0 ? "text-amber-400" : i === 1 ? "text-zinc-300" : i === 2 ? "text-orange-400" : "text-muted-foreground";

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="page-header">Ranking do squad</h1>
          <p className="page-subtitle">Performance sincronizada em tempo real, ordenada automaticamente por resultado.</p>
        </div>
        <div className="flex items-center gap-1 text-[12px]">
          {PERIODS.map(p => (
            <button key={p.key} onClick={() => setPeriod(p.key)}
              className={`px-3 py-1.5 rounded-lg border ${period === p.key ? "bg-primary/15 text-primary border-primary/30" : "border-border/40 text-muted-foreground hover:text-foreground"}`}>
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { l: "Cliques", v: totals.clicks.toLocaleString("pt-BR") },
          { l: "Cadastros", v: totals.regs.toLocaleString("pt-BR") },
          { l: "FTDs", v: totals.ftd.toLocaleString("pt-BR") },
          { l: "Receita", v: totals.revenue.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }) },
        ].map(c => (
          <div key={c.l} className="glass-card p-4"><p className="text-[11px] text-muted-foreground mb-1">{c.l}</p><p className="text-xl font-semibold tabular-nums">{c.v}</p></div>
        ))}
      </div>

      <div className="glass-card p-3 flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[220px]">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input className="input-field pl-8" placeholder="Buscar influenciador…" value={q} onChange={e => setQ(e.target.value)} />
        </div>
        <div className="flex items-center gap-1 text-[12px]">
          {([["revenue", "Receita"], ["ftd", "FTDs"], ["clicks", "Cliques"], ["ftdRate", "Conv. FTD"]] as const).map(([k, l]) => (
            <button key={k} onClick={() => setSort(k)}
              className={`px-3 py-1.5 rounded-lg border ${sort === k ? "bg-primary/15 text-primary border-primary/30" : "border-border/40 text-muted-foreground hover:text-foreground"}`}>
              {l}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="glass-card p-6 text-sm text-muted-foreground">Carregando…</div>
      ) : sorted.length === 0 ? (
        <div className="glass-card p-10 text-center">
          <Trophy className="mx-auto mb-3 text-muted-foreground" size={22} />
          <p className="text-sm font-medium">Sem dados no período selecionado</p>
        </div>
      ) : (
        <div className="glass-card overflow-x-auto">
          <table className="w-full text-[13px] min-w-[720px]">
            <thead className="bg-secondary/40 text-[11px] uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-2 text-left w-12">#</th>
                <th className="px-4 py-2 text-left">Influenciador</th>
                <th className="px-4 py-2 text-right">Cliques</th>
                <th className="px-4 py-2 text-right">Cadastros</th>
                <th className="px-4 py-2 text-right">FTDs</th>
                <th className="px-4 py-2 text-right">Conv. FTD</th>
                <th className="px-4 py-2 text-right">Receita</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((r, i) => (
                <tr key={r.id} className="border-t border-border/40 hover:bg-secondary/20">
                  <td className="px-4 py-2">
                    <span className={`inline-flex items-center gap-1 ${medal(i)}`}>
                      {i < 3 ? <Medal size={13} /> : null}
                      <span className="tabular-nums">{i + 1}</span>
                    </span>
                  </td>
                  <td className="px-4 py-2">
                    <div className="font-medium">{r.name}</div>
                    <div className="text-[11px] text-muted-foreground">{r.instagram ?? `@${r.slug}`}</div>
                  </td>
                  <td className="px-4 py-2 text-right tabular-nums">{r.clicks.toLocaleString("pt-BR")}</td>
                  <td className="px-4 py-2 text-right tabular-nums">{r.regs.toLocaleString("pt-BR")}</td>
                  <td className="px-4 py-2 text-right tabular-nums">{r.ftd.toLocaleString("pt-BR")}</td>
                  <td className="px-4 py-2 text-right tabular-nums text-muted-foreground">{r.ftdRate.toFixed(1)}%</td>
                  <td className="px-4 py-2 text-right font-medium tabular-nums">{r.revenue.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
