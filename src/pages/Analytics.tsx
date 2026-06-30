import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { BarChart3, ArrowRightLeft, MousePointerClick, Globe, Smartphone } from "lucide-react";
import Breadcrumbs from "@/components/Breadcrumbs";
import EmptyState from "@/components/EmptyState";
import { clickService } from "@/services/supabaseService";
import type { ClickRow } from "@/services/supabaseService";

export default function Analytics() {
  const navigate = useNavigate();
  const [clicks, setClicks] = useState<ClickRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    clickService.getAll().then(data => { setClicks(data); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  const stats = useMemo(() => {
    const sources: Record<string, number> = {};
    clicks.forEach(c => {
      const s = c.source || "direto";
      sources[s] = (sources[s] || 0) + 1;
    });
    const topSources = Object.entries(sources).sort((a, b) => b[1] - a[1]).slice(0, 5);
    return { total: clicks.length, topSources };
  }, [clicks]);

  return (
    <div className="space-y-8">
      <Breadcrumbs items={[{ label: "Analytics" }]} />
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Analytics</h1>
          <p className="text-sm text-muted-foreground mt-1">Centro analítico - métricas de cliques e fontes de tráfego</p>
        </div>
        <button onClick={() => navigate("/conversoes")} className="btn-ghost text-xs gap-1.5"><ArrowRightLeft size={13} />Conversões</button>
      </div>

      {loading ? (
        <div className="glass-card p-8 text-sm text-muted-foreground">Carregando analytics...</div>
      ) : clicks.length === 0 ? (
        <div className="glass-card">
          <EmptyState
            icon={BarChart3}
            title="Sem dados analíticos ainda"
            description="Os gráficos e métricas serão exibidos automaticamente quando houver cliques registrados na plataforma."
            actionLabel="Configurar UTMs"
            onAction={() => navigate("/utms")}
            secondaryLabel="Ver Landing Pages"
            onSecondary={() => navigate("/landing-pages")}
          />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="glass-card p-5">
              <div className="flex items-center gap-2 mb-2"><MousePointerClick size={14} className="text-muted-foreground" /><span className="text-xs text-muted-foreground uppercase tracking-wide">Total de Cliques</span></div>
              <p className="text-3xl font-bold">{stats.total}</p>
            </div>
            <div className="glass-card p-5">
              <div className="flex items-center gap-2 mb-2"><Globe size={14} className="text-muted-foreground" /><span className="text-xs text-muted-foreground uppercase tracking-wide">Fontes Únicas</span></div>
              <p className="text-3xl font-bold">{stats.topSources.length}</p>
            </div>
            <div className="glass-card p-5">
              <div className="flex items-center gap-2 mb-2"><Smartphone size={14} className="text-muted-foreground" /><span className="text-xs text-muted-foreground uppercase tracking-wide">Último Clique</span></div>
              <p className="text-sm font-medium">{clicks[0]?.clicked_at ? new Date(clicks[0].clicked_at).toLocaleString("pt-BR") : "-"}</p>
            </div>
          </div>

          <div className="glass-card p-6">
            <h3 className="text-sm font-semibold mb-4">Top Fontes de Tráfego</h3>
            <div className="space-y-3">
              {stats.topSources.map(([source, count]) => (
                <div key={source} className="flex items-center gap-3">
                  <span className="text-sm font-medium flex-1">{source}</span>
                  <div className="flex-1 h-2 bg-secondary rounded-full overflow-hidden">
                    <div className="h-full bg-primary rounded-full" style={{ width: `${(count / stats.total) * 100}%` }} />
                  </div>
                  <span className="text-sm text-muted-foreground w-12 text-right">{count}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="glass-card p-6">
            <h3 className="text-sm font-semibold mb-4">Últimos Cliques</h3>
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead><tr><th>Data</th><th>Fonte</th><th>Rota</th><th>Referrer</th></tr></thead>
                <tbody>
                  {clicks.slice(0, 20).map(c => (
                    <tr key={c.id}>
                      <td className="text-xs whitespace-nowrap">{c.clicked_at ? new Date(c.clicked_at).toLocaleString("pt-BR") : "-"}</td>
                      <td><span className="badge-neutral">{c.source || "direto"}</span></td>
                      <td className="text-xs text-muted-foreground">{c.route || "-"}</td>
                      <td className="text-xs text-muted-foreground truncate max-w-[200px]">{c.referrer || "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
