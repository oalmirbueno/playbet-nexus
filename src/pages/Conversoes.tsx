import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRightLeft, BarChart3, MousePointerClick, Users, TrendingUp } from "lucide-react";
import Breadcrumbs from "@/components/Breadcrumbs";
import EmptyState from "@/components/EmptyState";
import { clickService } from "@/services/supabaseService";
import type { ClickRow } from "@/services/supabaseService";

export default function Conversoes() {
  const navigate = useNavigate();
  const [clicks, setClicks] = useState<ClickRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    clickService.getAll().then(data => { setClicks(data); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  const funnel = useMemo(() => {
    const withUtm = clicks.filter(c => c.utm_id);
    const withLP = clicks.filter(c => c.landing_page_id);
    return { total: clicks.length, withUtm: withUtm.length, withLP: withLP.length };
  }, [clicks]);

  return (
    <div className="space-y-8">
      <Breadcrumbs items={[{ label: "Conversões" }]} />
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Conversões</h1>
          <p className="text-sm text-muted-foreground mt-1">Centro de leitura operacional - funil e drill-down por registro</p>
        </div>
        <button onClick={() => navigate("/analytics")} className="btn-ghost text-xs gap-1.5"><BarChart3 size={13} />Analytics</button>
      </div>

      {loading ? (
        <div className="glass-card p-8 text-sm text-muted-foreground">Carregando conversões...</div>
      ) : clicks.length === 0 ? (
        <div className="glass-card">
          <EmptyState
            icon={ArrowRightLeft}
            title="Nenhuma conversão registrada"
            description="O funil de conversão será exibido quando houver dados de cliques rastreados."
            actionLabel="Configurar UTMs"
            onAction={() => navigate("/utms")}
            secondaryLabel="Ver Analytics"
            onSecondary={() => navigate("/analytics")}
          />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="glass-card p-5 border-l-2 border-l-primary">
              <div className="flex items-center gap-2 mb-2"><MousePointerClick size={14} className="text-muted-foreground" /><span className="text-xs text-muted-foreground uppercase">Cliques Totais</span></div>
              <p className="text-3xl font-bold">{funnel.total}</p>
            </div>
            <div className="glass-card p-5 border-l-2 border-l-info">
              <div className="flex items-center gap-2 mb-2"><TrendingUp size={14} className="text-muted-foreground" /><span className="text-xs text-muted-foreground uppercase">Com UTM</span></div>
              <p className="text-3xl font-bold">{funnel.withUtm}</p>
              <p className="text-xs text-muted-foreground">{funnel.total > 0 ? Math.round((funnel.withUtm / funnel.total) * 100) : 0}% dos cliques</p>
            </div>
            <div className="glass-card p-5 border-l-2 border-l-success">
              <div className="flex items-center gap-2 mb-2"><Users size={14} className="text-muted-foreground" /><span className="text-xs text-muted-foreground uppercase">Via Landing Page</span></div>
              <p className="text-3xl font-bold">{funnel.withLP}</p>
              <p className="text-xs text-muted-foreground">{funnel.total > 0 ? Math.round((funnel.withLP / funnel.total) * 100) : 0}% dos cliques</p>
            </div>
          </div>

          <div className="glass-card p-6">
            <h3 className="text-sm font-semibold mb-4">Funil Visual</h3>
            <div className="space-y-3">
              {[
                { label: "Cliques Totais", value: funnel.total, pct: 100 },
                { label: "Com UTM Rastreado", value: funnel.withUtm, pct: funnel.total > 0 ? (funnel.withUtm / funnel.total) * 100 : 0 },
                { label: "Via Landing Page", value: funnel.withLP, pct: funnel.total > 0 ? (funnel.withLP / funnel.total) * 100 : 0 },
              ].map(step => (
                <div key={step.label}>
                  <div className="flex justify-between text-sm mb-1">
                    <span>{step.label}</span>
                    <span className="text-muted-foreground">{step.value} ({Math.round(step.pct)}%)</span>
                  </div>
                  <div className="h-3 bg-secondary rounded-full overflow-hidden">
                    <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${step.pct}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
