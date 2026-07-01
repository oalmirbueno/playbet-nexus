import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Users, Target, TrendingUp, Wallet } from "lucide-react";

export default function GerenteHome() {
  const { user } = useAuth();
  const [squad, setSquad] = useState<any>(null);
  const [kpi, setKpi] = useState({ influencers: 0, clicks: 0, ftd: 0, revenue: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: prof } = await supabase.from("profiles").select("manager_id, full_name").eq("id", user!.id).maybeSingle();
      if (!prof?.manager_id) { setLoading(false); return; }
      const { data: m } = await supabase.from("managers").select("*, squad:squads(*)").eq("id", prof.manager_id).maybeSingle();
      setSquad(m);
      const { data: infs } = await supabase.from("influencers").select("id").eq("squad_id", m?.squad_id ?? "");
      const ids = (infs ?? []).map((i) => i.id);
      if (ids.length) {
        const { data: metrics } = await supabase
          .from("tracking_metrics")
          .select("cliques, ftd, revenue")
          .in("influencer_id", ids);
        const agg = (metrics ?? []).reduce((a: any, r: any) => ({
          clicks: a.clicks + (r.cliques ?? 0),
          ftd: a.ftd + (r.ftd ?? 0),
          revenue: a.revenue + Number(r.revenue ?? 0),
        }), { clicks: 0, ftd: 0, revenue: 0 });
        setKpi({ influencers: ids.length, ...agg });
      } else {
        setKpi({ influencers: 0, clicks: 0, ftd: 0, revenue: 0 });
      }
      setLoading(false);
    })();
  }, [user]);

  const cards = [
    { label: "Influenciadores", value: kpi.influencers, icon: Users },
    { label: "Cliques totais", value: kpi.clicks.toLocaleString("pt-BR"), icon: Target },
    { label: "FTDs", value: kpi.ftd.toLocaleString("pt-BR"), icon: TrendingUp },
    { label: "Receita do squad", value: kpi.revenue.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }), icon: Wallet },
  ];

  return (
    <div className="space-y-6">
      <div>
        <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Squad</p>
        <h1 className="page-header">{squad?.squad?.name ?? "Meu squad"}</h1>
        <p className="page-subtitle">Visão consolidada da equipe que você gerencia.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        {cards.map((c) => (
          <div key={c.label} className="glass-card p-4 md:p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] text-muted-foreground">{c.label}</span>
              <c.icon size={14} className="text-primary/80" />
            </div>
            <div className="text-xl md:text-2xl font-semibold tracking-tight">
              {loading ? <span className="inline-block h-6 w-16 rounded bg-secondary/60 animate-pulse" /> : c.value}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
