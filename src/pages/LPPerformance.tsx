import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { BarChart3, TrendingUp, Eye, Copy, ExternalLink } from "lucide-react";
import { useLandingPages, useLandingPageInstances, useInfluencers } from "@/hooks/useSupabaseQuery";
import { clickService } from "@/services/supabaseService";
import { useQuery } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import Breadcrumbs from "@/components/Breadcrumbs";
import ExportDropdown from "@/components/ExportDropdown";

function buildPublicUrl(domain: string | null, slug: string) {
  if (!domain) return `/?ref=${slug}`;
  let base = domain.replace(/\/+$/, "");
  if (!/^https?:\/\//i.test(base)) base = `https://${base}`;
  return `${base}/?ref=${slug}`;
}

export default function LPPerformance() {
  const navigate = useNavigate();
  const { data: landingPages } = useLandingPages();
  const { data: instances } = useLandingPageInstances();
  const { data: influencers } = useInfluencers();
  const { data: clicks = [] } = useQuery({ queryKey: ["clicks-all"], queryFn: () => clickService.getAll() });
  const [view, setView] = useState<"lps" | "instances">("lps");

  const getInfluencerName = (id: string) => influencers.find(i => i.id === id)?.name || "-";

  // LP-level stats
  const lpStats = landingPages.map(lp => {
    const lpInstances = instances.filter(i => i.landing_page_id === lp.id);
    const lpClicks = clicks.filter(c => c.landing_page_id === lp.id);
    const topInstance = lpInstances.reduce((best, inst) => {
      const instClicks = clicks.filter(c => c.landing_page_id === lp.id && c.influencer_id === inst.influencer_id).length;
      return instClicks > (best?.clicks || 0) ? { inst, clicks: instClicks } : best;
    }, null as { inst: typeof lpInstances[0]; clicks: number } | null);

    return {
      lp,
      totalInstances: lpInstances.length,
      activeInstances: lpInstances.filter(i => i.is_active).length,
      totalClicks: lpClicks.length,
      topInfluencer: topInstance ? getInfluencerName(topInstance.inst.influencer_id) : "-",
      topUrl: topInstance ? buildPublicUrl(lp.domain, topInstance.inst.slug) : "-",
    };
  }).sort((a, b) => b.totalClicks - a.totalClicks);

  // Instance-level stats
  const instanceStats = instances.map(inst => {
    const lp = landingPages.find(l => l.id === inst.landing_page_id);
    const instClicks = clicks.filter(c => c.landing_page_id === inst.landing_page_id && c.influencer_id === inst.influencer_id).length;
    return {
      inst,
      lpName: lp?.name || "-",
      domain: lp?.domain || "",
      influencer: getInfluencerName(inst.influencer_id),
      clicks: instClicks,
      url: buildPublicUrl(lp?.domain || null, inst.slug),
    };
  }).sort((a, b) => b.clicks - a.clicks);

  const totalClicks = clicks.length;
  const activeLPs = landingPages.filter(lp => lp.is_active).length;
  const activeInstances = instances.filter(i => i.is_active).length;

  const exportData = (view === "lps"
    ? lpStats.map(s => ({ nome: s.lp.name, dominio: s.lp.domain, instancias: s.totalInstances, cliques: s.totalClicks, top_influencer: s.topInfluencer, status: s.lp.is_active ? "Ativo" : "Inativo" }))
    : instanceStats.map(s => ({ nome: s.lpName, dominio: s.domain, instancias: 0, cliques: s.clicks, top_influencer: s.influencer, status: s.inst.is_active ? "Ativo" : "Inativo" }))
  );

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: "Métricas", path: "/analytics" }, { label: "Performance de LPs" }]} />
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="page-header">Performance de LPs</h1>
          <p className="page-subtitle">Ranking e métricas de performance por LP base e por instância</p>
        </div>
        <ExportDropdown data={exportData} filename="lp-performance-playbet" />
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="stat-card border-l-2 border-l-primary"><span className="text-[10px] text-muted-foreground uppercase">Total Cliques</span><p className="text-xl font-bold">{totalClicks.toLocaleString()}</p></div>
        <div className="stat-card border-l-2 border-l-success"><span className="text-[10px] text-muted-foreground uppercase">LPs Ativas</span><p className="text-xl font-bold">{activeLPs}</p></div>
        <div className="stat-card border-l-2 border-l-info"><span className="text-[10px] text-muted-foreground uppercase">Instâncias Ativas</span><p className="text-xl font-bold">{activeInstances}</p></div>
        <div className="stat-card border-l-2 border-l-accent"><span className="text-[10px] text-muted-foreground uppercase">Top LP</span><p className="text-sm font-bold truncate">{lpStats[0]?.lp.name || "-"}</p></div>
      </div>

      {/* Quick nav */}
      <div className="flex flex-wrap gap-2">
        <button className="btn-ghost text-xs" onClick={() => navigate("/landing-pages")}>→ LPs Base</button>
        <button className="btn-ghost text-xs" onClick={() => navigate("/lp-instances")}>→ Instâncias</button>
        <button className="btn-ghost text-xs" onClick={() => navigate("/analytics")}>→ Analytics</button>
      </div>

      {/* View toggle */}
      <div className="flex gap-1 bg-secondary/50 p-1 rounded-xl w-fit">
        <button onClick={() => setView("lps")} className={view === "lps" ? "tab-btn-active" : "tab-btn"}>
          <BarChart3 size={13} /> Por LP Base
        </button>
        <button onClick={() => setView("instances")} className={view === "instances" ? "tab-btn-active" : "tab-btn"}>
          <TrendingUp size={13} /> Por Instância
        </button>
      </div>

      {/* Rankings */}
      {view === "lps" ? (
        <div className="glass-card overflow-x-auto invisible-scroll">
          <table className="data-table">
            <thead>
              <tr><th>#</th><th>LP Base</th><th>Domínio</th><th>Instâncias</th><th>Cliques</th><th>Top Influencer</th><th>Status</th><th>Ações</th></tr>
            </thead>
            <tbody>
              {lpStats.length === 0 ? (
                <tr><td colSpan={8} className="text-center text-muted-foreground py-8">Sem dados</td></tr>
              ) : lpStats.map((s, i) => (
                <tr key={s.lp.id}>
                  <td className="font-bold text-accent">{i + 1}</td>
                  <td className="font-medium text-xs">{s.lp.name}</td>
                  <td className="font-mono text-xs text-muted-foreground">{s.lp.domain || "-"}</td>
                  <td>{s.activeInstances}/{s.totalInstances}</td>
                  <td className="font-bold">{s.totalClicks.toLocaleString()}</td>
                  <td className="text-xs">{s.topInfluencer}</td>
                  <td><span className={s.lp.is_active ? "badge-success" : "badge-danger"}>{s.lp.is_active ? "Ativo" : "Inativo"}</span></td>
                  <td>
                    <div className="flex gap-0.5">
                      <button onClick={() => navigate("/landing-pages")} className="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-foreground" title="Ver LP"><Eye size={12} /></button>
                      {s.lp.domain && <button onClick={() => { navigator.clipboard.writeText(s.lp.domain!); toast({ title: "Domínio copiado!" }); }} className="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-foreground" title="Copiar domínio"><Copy size={12} /></button>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="glass-card overflow-x-auto invisible-scroll">
          <table className="data-table">
            <thead>
              <tr><th>#</th><th>LP Base</th><th>Influencer</th><th>Slug</th><th>Cliques</th><th>URL Pública</th><th>Status</th><th>Ações</th></tr>
            </thead>
            <tbody>
              {instanceStats.length === 0 ? (
                <tr><td colSpan={8} className="text-center text-muted-foreground py-8">Sem dados</td></tr>
              ) : instanceStats.map((s, i) => (
                <tr key={s.inst.id}>
                  <td className="font-bold text-accent">{i + 1}</td>
                  <td className="font-medium text-xs">{s.lpName}</td>
                  <td className="text-xs">{s.influencer}</td>
                  <td className="font-mono text-xs text-accent">{s.inst.slug}</td>
                  <td className="font-bold">{s.clicks.toLocaleString()}</td>
                  <td className="font-mono text-xs text-accent max-w-[200px] truncate" title={s.url}>{s.url}</td>
                  <td><span className={s.inst.is_active ? "badge-success" : "badge-danger"}>{s.inst.is_active ? "Ativo" : "Inativo"}</span></td>
                  <td>
                    <div className="flex gap-0.5">
                      <button onClick={() => { navigator.clipboard.writeText(s.url); toast({ title: "URL copiada!" }); }} className="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-foreground" title="Copiar URL"><Copy size={12} /></button>
                      {s.domain && <a href={s.url} target="_blank" rel="noopener noreferrer" className="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-foreground" title="Abrir"><ExternalLink size={12} /></a>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
