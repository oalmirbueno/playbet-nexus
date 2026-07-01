import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { MousePointerClick, UserPlus, Wallet, TrendingUp } from "lucide-react";

interface Kpi { clicks: number; regs: number; ftd: number; revenue: number }

export default function PortalHome() {
  const { user } = useAuth();
  const [kpi, setKpi] = useState<Kpi>({ clicks: 0, regs: 0, ftd: 0, revenue: 0 });
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data: prof } = await supabase.from("profiles").select("full_name, influencer_id").eq("id", user!.id).maybeSingle();
      setName(prof?.full_name ?? "");
      const infId = prof?.influencer_id;
      if (!infId) { setLoading(false); return; }
      const { data } = await supabase
        .from("tracking_metrics")
        .select("cliques, registros, ftd, revenue")
        .eq("influencer_id", infId);
      const agg = (data ?? []).reduce<Kpi>((a, r: any) => ({
        clicks: a.clicks + (r.cliques ?? 0),
        regs: a.regs + (r.registros ?? 0),
        ftd: a.ftd + (r.ftd ?? 0),
        revenue: a.revenue + Number(r.revenue ?? 0),
      }), { clicks: 0, regs: 0, ftd: 0, revenue: 0 });
      setKpi(agg);
      setLoading(false);
    })();
  }, [user]);

  const cards = [
    { label: "Cliques", value: kpi.clicks.toLocaleString("pt-BR"), icon: MousePointerClick },
    { label: "Cadastros", value: kpi.regs.toLocaleString("pt-BR"), icon: UserPlus },
    { label: "FTDs", value: kpi.ftd.toLocaleString("pt-BR"), icon: TrendingUp },
    { label: "Receita gerada", value: kpi.revenue.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }), icon: Wallet },
  ];

  return (
    <div className="space-y-6">
      <div>
        <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Olá{name ? `, ${name.split(" ")[0]}` : ""}</p>
        <h1 className="page-header">Seu painel</h1>
        <p className="page-subtitle">Acompanhe o desempenho dos seus links e sua receita em tempo real.</p>
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

      <div className="glass-card p-5">
        <h3 className="section-title">Como funciona</h3>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Este é o seu portal exclusivo. Aqui você acompanha seus KPIs, gera links de afiliado, consulta seu financeiro e solicita saques. Suas informações são privadas — apenas você e sua gerência têm acesso.
        </p>
      </div>
    </div>
  );
}
