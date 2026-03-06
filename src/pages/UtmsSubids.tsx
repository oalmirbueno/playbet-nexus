import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Copy, Edit, Eye, Pause, Play, AlertTriangle, ExternalLink, Plus, BarChart3 } from "lucide-react";
import Breadcrumbs from "@/components/Breadcrumbs";
import ExportDropdown from "@/components/ExportDropdown";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";

const initialUtms = [
  { id: 1, source: "playbet", medium: "telegram", campaign: "marco-turbo", content: "cta-azul", subid: "rafa001", jogo: "Fortune Tiger", plat: "Bet365", influencer: "Rafael M.", lp: "Fortune Tiger LP", template: "Fortune Tiger LP", cliques: 4520, ultimaAtividade: "05/03/2026 14:32", status: "Ativo" },
  { id: 2, source: "playbet", medium: "instagram", campaign: "aviator-promo", content: "reels", subid: "pedro001", jogo: "Aviator", plat: "Pixbet", influencer: "Pedro L.", lp: "Aviator Promo", template: "Aviator Promo", cliques: 3200, ultimaAtividade: "05/03/2026 13:18", status: "Ativo" },
  { id: 3, source: "playbet", medium: "whatsapp", campaign: "mines-vip", content: "msg-direta", subid: "carlos001", jogo: "Mines", plat: "Betano", influencer: "Carlos S.", lp: "Fortune Tiger LP", template: "Fortune Tiger LP", cliques: 2100, ultimaAtividade: "05/03/2026 11:45", status: "Ativo" },
  { id: 4, source: "playbet", medium: "bio", campaign: "geral", content: "link-bio", subid: "ana001", jogo: "Gates of Olympus", plat: "Bet365", influencer: "Ana S.", lp: "Cadastro Geral", template: "Cadastro Geral", cliques: 1800, ultimaAtividade: "04/03/2026 22:10", status: "Ativo" },
  { id: 5, source: "playbet", medium: "telegram", campaign: "spaceman", content: "cta-play", subid: "julia001", jogo: "Spaceman", plat: "Pixbet", influencer: "Julia C.", lp: "Aviator Promo", template: "Aviator Promo", cliques: 450, ultimaAtividade: "28/02/2026 15:30", status: "Inativo" },
];

const validationAlerts = [
  { msg: "SubID 'julia001' sem atividade há 5 dias — possível link inativo", type: "warning" },
  { msg: "Campanha 'spaceman' sem source utm_content definido adequadamente", type: "warning" },
  { msg: "LP 'Mines Special' referenciada mas sem UTM ativo vinculado", type: "danger" },
  { msg: "Rota /i/marcos sem parâmetro de rastreio configurado", type: "danger" },
];

export default function UtmsSubids() {
  const navigate = useNavigate();
  const [data, setData] = useState(initialUtms);
  const [detail, setDetail] = useState<typeof initialUtms[0] | null>(null);
  const [filterSource, setFilterSource] = useState("Todos");
  const [filterMedium, setFilterMedium] = useState("Todos");
  const [filterCampaign, setFilterCampaign] = useState("Todas");
  const [filterInfluencer, setFilterInfluencer] = useState("Todos");
  const [search, setSearch] = useState("");
  const [alertsOpen, setAlertsOpen] = useState(false);

  const filtered = data.filter(u => {
    if (filterSource !== "Todos" && u.source !== filterSource) return false;
    if (filterMedium !== "Todos" && u.medium !== filterMedium) return false;
    if (filterCampaign !== "Todas" && u.campaign !== filterCampaign) return false;
    if (filterInfluencer !== "Todos" && u.influencer !== filterInfluencer) return false;
    if (search && !Object.values(u).some(v => String(v).toLowerCase().includes(search.toLowerCase()))) return false;
    return true;
  });

  const toggleStatus = (id: number) => {
    setData(prev => prev.map(u => u.id === id ? { ...u, status: u.status === "Ativo" ? "Inativo" : "Ativo" } : u));
    toast.success("Status atualizado");
  };

  const copyUrl = (u: typeof initialUtms[0]) => {
    const url = `https://playbet.com/i/${u.subid}?utm_source=${u.source}&utm_medium=${u.medium}&utm_campaign=${u.campaign}&utm_content=${u.content}&subid=${u.subid}`;
    navigator.clipboard.writeText(url);
    toast.success("URL copiada");
  };

  const duplicate = (u: typeof initialUtms[0]) => {
    const newU = { ...u, id: Date.now(), subid: u.subid + "-copy", cliques: 0, status: "Ativo" as const };
    setData(prev => [newU, ...prev]);
    toast.success("UTM duplicado");
  };

  return (
    <div className="space-y-8">
      <Breadcrumbs items={[{ label: "UTMs / SubIDs" }]} />
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">UTMs / SubIDs</h1>
          <p className="text-sm text-muted-foreground mt-1">Centro de rastreio — parâmetros, validação e performance de cada link</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="btn-primary text-xs"><Plus size={13} />Criar UTM</button>
          <ExportDropdown data={data} filename="utms-subids" />
        </div>
      </div>

      {/* Validation Alerts */}
      <div className="glass-card p-4 border-l-2 border-l-warning cursor-pointer" onClick={() => setAlertsOpen(!alertsOpen)}>
        <div className="flex items-center gap-2">
          <AlertTriangle size={14} className="text-warning" />
          <span className="text-sm font-medium">{validationAlerts.length} inconsistências detectadas</span>
        </div>
        {alertsOpen && (
          <div className="mt-3 space-y-2">
            {validationAlerts.map((a, i) => (
              <div key={i} className="flex items-center gap-2 text-sm py-1.5">
                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${a.type === "danger" ? "bg-destructive" : "bg-warning"}`} />
                {a.msg}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <input className="input-field w-64" placeholder="Buscar subid, campaign..." value={search} onChange={e => setSearch(e.target.value)} />
        <select className="select-field text-xs w-auto" value={filterSource} onChange={e => setFilterSource(e.target.value)}>
          <option value="Todos">Source: Todos</option>
          <option value="playbet">playbet</option>
        </select>
        <select className="select-field text-xs w-auto" value={filterMedium} onChange={e => setFilterMedium(e.target.value)}>
          <option value="Todos">Medium: Todos</option>
          {["telegram", "instagram", "whatsapp", "bio"].map(n => <option key={n} value={n}>{n}</option>)}
        </select>
        <select className="select-field text-xs w-auto" value={filterCampaign} onChange={e => setFilterCampaign(e.target.value)}>
          <option value="Todas">Campaign: Todas</option>
          {["marco-turbo", "aviator-promo", "mines-vip", "geral", "spaceman"].map(n => <option key={n} value={n}>{n}</option>)}
        </select>
        <select className="select-field text-xs w-auto" value={filterInfluencer} onChange={e => setFilterInfluencer(e.target.value)}>
          <option value="Todos">Influencer: Todos</option>
          {["Rafael M.", "Pedro L.", "Carlos S.", "Ana S.", "Julia C."].map(n => <option key={n} value={n}>{n}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="glass-card overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr><th>Source</th><th>Medium</th><th>Campaign</th><th>Content</th><th>SubID</th><th>Influencer</th><th>LP</th><th>Jogo</th><th>Plat.</th><th>Cliques</th><th>Última Ativ.</th><th>Status</th><th>Ações</th></tr>
          </thead>
          <tbody>
            {filtered.map(u => (
              <tr key={u.id}>
                <td className="font-mono text-[11px]">{u.source}</td>
                <td className="font-mono text-[11px]">{u.medium}</td>
                <td className="font-mono text-[11px] text-primary">{u.campaign}</td>
                <td className="font-mono text-[11px]">{u.content}</td>
                <td className="font-mono text-[11px] font-medium">{u.subid}</td>
                <td className="text-xs">{u.influencer}</td>
                <td className="text-xs">{u.lp}</td>
                <td className="text-xs">{u.jogo}</td>
                <td className="text-xs">{u.plat}</td>
                <td className="font-medium">{u.cliques.toLocaleString()}</td>
                <td className="text-xs text-muted-foreground whitespace-nowrap">{u.ultimaAtividade}</td>
                <td><span className={u.status === "Ativo" ? "badge-success" : "badge-danger"}>{u.status}</span></td>
                <td>
                  <div className="flex items-center gap-1">
                    <button onClick={() => setDetail(u)} className="p-1.5 hover:bg-secondary rounded" title="Ver detalhe"><Eye size={13} className="text-muted-foreground" /></button>
                    <button className="p-1.5 hover:bg-secondary rounded" title="Editar"><Edit size={13} className="text-muted-foreground" /></button>
                    <button onClick={() => copyUrl(u)} className="p-1.5 hover:bg-secondary rounded" title="Copiar URL"><Copy size={13} className="text-muted-foreground" /></button>
                    <button onClick={() => duplicate(u)} className="p-1.5 hover:bg-secondary rounded" title="Duplicar"><Plus size={13} className="text-muted-foreground" /></button>
                    <button onClick={() => toggleStatus(u.id)} className="p-1.5 hover:bg-secondary rounded" title={u.status === "Ativo" ? "Desativar" : "Ativar"}>
                      {u.status === "Ativo" ? <Pause size={13} className="text-muted-foreground" /> : <Play size={13} className="text-muted-foreground" />}
                    </button>
                    <button onClick={() => navigate("/analytics")} className="p-1.5 hover:bg-secondary rounded" title="Analytics"><BarChart3 size={13} className="text-muted-foreground" /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Detail Dialog */}
      <Dialog open={!!detail} onOpenChange={() => setDetail(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Detalhe UTM — {detail?.subid}</DialogTitle>
          </DialogHeader>
          {detail && (
            <div className="space-y-6">
              <div>
                <p className="text-[10.5px] uppercase tracking-wider text-muted-foreground mb-2">URL Completa</p>
                <div className="bg-secondary/50 border border-border rounded-md p-3 font-mono text-[11px] break-all">
                  https://playbet.com/i/{detail.subid}?utm_source={detail.source}&utm_medium={detail.medium}&utm_campaign={detail.campaign}&utm_content={detail.content}&subid={detail.subid}
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {[
                  { l: "Source", v: detail.source }, { l: "Medium", v: detail.medium }, { l: "Campaign", v: detail.campaign },
                  { l: "Content", v: detail.content }, { l: "SubID", v: detail.subid }, { l: "Influencer", v: detail.influencer },
                  { l: "Landing Page", v: detail.lp }, { l: "Template", v: detail.template }, { l: "Jogo", v: detail.jogo },
                  { l: "Plataforma", v: detail.plat }, { l: "Cliques", v: detail.cliques.toLocaleString() }, { l: "Status", v: detail.status },
                  { l: "Última Atividade", v: detail.ultimaAtividade },
                ].map(f => (
                  <div key={f.l}>
                    <p className="text-[10.5px] uppercase tracking-wider text-muted-foreground mb-1">{f.l}</p>
                    <p className="text-sm font-medium">{f.v}</p>
                  </div>
                ))}
              </div>
              <div className="flex gap-2 pt-2 border-t border-border">
                <button className="btn-ghost text-xs" onClick={() => { setDetail(null); navigate("/analytics"); }}>Ver Analytics</button>
                <button className="btn-ghost text-xs" onClick={() => { setDetail(null); navigate("/campanhas"); }}>Ver Campanha</button>
                <button className="btn-ghost text-xs" onClick={() => copyUrl(detail)}>Copiar URL</button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
