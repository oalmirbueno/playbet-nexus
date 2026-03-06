import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Copy, Edit, Eye, Pause, Play, AlertTriangle, ExternalLink, Plus, BarChart3 } from "lucide-react";
import Breadcrumbs from "@/components/Breadcrumbs";
import ExportDropdown from "@/components/ExportDropdown";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";

type UtmItem = {
  id: number; source: string; medium: string; campaign: string; content: string; subid: string;
  jogo: string; plat: string; influencer: string; lp: string; template: string;
  cliques: number; ultimaAtividade: string; status: string; observacoes?: string;
};

const initialUtms: UtmItem[] = [
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

const emptyUtm: Partial<UtmItem> = {
  source: "playbet", medium: "", campaign: "", content: "", subid: "", jogo: "", plat: "", influencer: "", lp: "", template: "", status: "Ativo", observacoes: "",
};

export default function UtmsSubids() {
  const navigate = useNavigate();
  const [data, setData] = useState(initialUtms);
  const [detail, setDetail] = useState<UtmItem | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<UtmItem> | null>(null);
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

  const buildUrl = (u: Partial<UtmItem>) =>
    `https://playbet.com/i/${u.subid || "..."}?utm_source=${u.source || ""}&utm_medium=${u.medium || ""}&utm_campaign=${u.campaign || ""}&utm_content=${u.content || ""}&subid=${u.subid || ""}`;

  const toggleStatus = (id: number) => {
    setData(prev => prev.map(u => u.id === id ? { ...u, status: u.status === "Ativo" ? "Inativo" : "Ativo" } : u));
    toast.success("Status atualizado");
  };

  const copyUrl = (u: Partial<UtmItem>) => {
    navigator.clipboard.writeText(buildUrl(u));
    toast.success("URL copiada");
  };

  const duplicate = (u: UtmItem) => {
    const newU = { ...u, id: Date.now(), subid: u.subid + "-copy", cliques: 0, status: "Ativo" };
    setData(prev => [newU, ...prev]);
    toast.success("UTM duplicado");
  };

  const openCreate = () => {
    setEditing({ ...emptyUtm, id: 0 });
    setModalOpen(true);
  };

  const openEdit = (u: UtmItem) => {
    setEditing({ ...u });
    setModalOpen(true);
  };

  const handleSave = () => {
    if (!editing?.subid || !editing?.medium) {
      toast.error("SubID e Medium são obrigatórios.");
      return;
    }
    if (editing.id && editing.id > 0) {
      setData(prev => prev.map(u => u.id === editing.id ? { ...u, ...editing } as UtmItem : u));
      toast.success(`UTM ${editing.subid} atualizado`);
    } else {
      const newItem: UtmItem = {
        ...emptyUtm as UtmItem,
        ...editing,
        id: Date.now(),
        cliques: 0,
        ultimaAtividade: new Date().toLocaleString("pt-BR"),
      };
      setData(prev => [newItem, ...prev]);
      toast.success(`UTM ${editing.subid} criado`);
    }
    setModalOpen(false);
    setEditing(null);
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
          <button className="btn-primary text-xs" onClick={openCreate}><Plus size={13} />Criar UTM</button>
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
      <div className="glass-card overflow-x-auto invisible-scroll">
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
                    <button onClick={() => setDetail(u)} className="p-1.5 hover:bg-secondary rounded cursor-pointer" title="Ver detalhe"><Eye size={13} className="text-muted-foreground" /></button>
                    <button onClick={() => openEdit(u)} className="p-1.5 hover:bg-secondary rounded cursor-pointer" title="Editar"><Edit size={13} className="text-muted-foreground" /></button>
                    <button onClick={() => copyUrl(u)} className="p-1.5 hover:bg-secondary rounded cursor-pointer" title="Copiar URL"><Copy size={13} className="text-muted-foreground" /></button>
                    <button onClick={() => duplicate(u)} className="p-1.5 hover:bg-secondary rounded cursor-pointer" title="Duplicar"><Plus size={13} className="text-muted-foreground" /></button>
                    <button onClick={() => toggleStatus(u.id)} className="p-1.5 hover:bg-secondary rounded cursor-pointer" title={u.status === "Ativo" ? "Desativar" : "Ativar"}>
                      {u.status === "Ativo" ? <Pause size={13} className="text-muted-foreground" /> : <Play size={13} className="text-muted-foreground" />}
                    </button>
                    <button onClick={() => navigate("/analytics")} className="p-1.5 hover:bg-secondary rounded cursor-pointer" title="Analytics"><BarChart3 size={13} className="text-muted-foreground" /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Create/Edit Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editing?.id ? "Editar UTM" : "Criar UTM"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2 max-h-[60vh] overflow-y-auto invisible-scroll">
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-xs font-medium text-muted-foreground">UTM Source</label><input className="input-field mt-1" value={editing?.source || ""} onChange={e => setEditing(p => ({ ...p, source: e.target.value }))} /></div>
              <div><label className="text-xs font-medium text-muted-foreground">UTM Medium *</label>
                <select className="select-field mt-1 w-full" value={editing?.medium || ""} onChange={e => setEditing(p => ({ ...p, medium: e.target.value }))}>
                  <option value="">Selecionar...</option>
                  <option>telegram</option><option>instagram</option><option>whatsapp</option><option>bio</option><option>youtube</option><option>tiktok</option><option>email</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-xs font-medium text-muted-foreground">UTM Campaign</label><input className="input-field mt-1" value={editing?.campaign || ""} onChange={e => setEditing(p => ({ ...p, campaign: e.target.value }))} /></div>
              <div><label className="text-xs font-medium text-muted-foreground">UTM Content</label><input className="input-field mt-1" value={editing?.content || ""} onChange={e => setEditing(p => ({ ...p, content: e.target.value }))} /></div>
            </div>
            <div><label className="text-xs font-medium text-muted-foreground">SubID *</label><input className="input-field mt-1" value={editing?.subid || ""} onChange={e => setEditing(p => ({ ...p, subid: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") }))} placeholder="ex: rafa001" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-xs font-medium text-muted-foreground">Influencer</label>
                <select className="select-field mt-1 w-full" value={editing?.influencer || ""} onChange={e => setEditing(p => ({ ...p, influencer: e.target.value }))}>
                  <option value="">Selecionar...</option>
                  {["Rafael M.", "Pedro L.", "Carlos S.", "Ana S.", "Julia C."].map(n => <option key={n}>{n}</option>)}
                </select>
              </div>
              <div><label className="text-xs font-medium text-muted-foreground">Landing Page</label>
                <select className="select-field mt-1 w-full" value={editing?.lp || ""} onChange={e => setEditing(p => ({ ...p, lp: e.target.value, template: e.target.value }))}>
                  <option value="">Selecionar...</option>
                  {["Fortune Tiger LP", "Aviator Promo", "Cadastro Geral", "Mines Special"].map(n => <option key={n}>{n}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-xs font-medium text-muted-foreground">Jogo</label>
                <select className="select-field mt-1 w-full" value={editing?.jogo || ""} onChange={e => setEditing(p => ({ ...p, jogo: e.target.value }))}>
                  <option value="">Selecionar...</option>
                  {["Fortune Tiger", "Aviator", "Mines", "Gates of Olympus", "Spaceman"].map(n => <option key={n}>{n}</option>)}
                </select>
              </div>
              <div><label className="text-xs font-medium text-muted-foreground">Plataforma</label>
                <select className="select-field mt-1 w-full" value={editing?.plat || ""} onChange={e => setEditing(p => ({ ...p, plat: e.target.value }))}>
                  <option value="">Selecionar...</option>
                  {["Bet365", "Betano", "Sportingbet", "Pixbet"].map(n => <option key={n}>{n}</option>)}
                </select>
              </div>
            </div>
            <div><label className="text-xs font-medium text-muted-foreground">Campanha vinculada</label>
              <select className="select-field mt-1 w-full" value={editing?.campaign || ""} onChange={e => setEditing(p => ({ ...p, campaign: e.target.value }))}>
                <option value="">Nenhuma</option>
                {["marco-turbo", "aviator-promo", "mines-vip", "geral", "spaceman"].map(n => <option key={n}>{n}</option>)}
              </select>
            </div>
            <div><label className="text-xs font-medium text-muted-foreground">Status</label>
              <select className="select-field mt-1 w-full" value={editing?.status || "Ativo"} onChange={e => setEditing(p => ({ ...p, status: e.target.value }))}>
                <option>Ativo</option><option>Inativo</option>
              </select>
            </div>
            <div><label className="text-xs font-medium text-muted-foreground">Observações</label>
              <textarea className="input-field mt-1 min-h-[60px]" value={editing?.observacoes || ""} onChange={e => setEditing(p => ({ ...p, observacoes: e.target.value }))} />
            </div>
            {/* URL Preview */}
            {editing?.subid && (
              <div>
                <label className="text-xs font-medium text-muted-foreground">URL Gerada</label>
                <div className="bg-secondary/50 border border-border rounded-md p-3 mt-1 font-mono text-[11px] break-all flex items-center gap-2">
                  <span className="flex-1">{buildUrl(editing)}</span>
                  <button onClick={() => copyUrl(editing)} className="btn-ghost text-xs shrink-0 px-2 py-1"><Copy size={11} /></button>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <button className="btn-ghost" onClick={() => setModalOpen(false)}>Cancelar</button>
            <button className="btn-primary" onClick={handleSave}>Salvar</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
                <div className="bg-secondary/50 border border-border rounded-md p-3 font-mono text-[11px] break-all flex items-center gap-2">
                  <span className="flex-1">{buildUrl(detail)}</span>
                  <button onClick={() => copyUrl(detail)} className="btn-ghost text-xs shrink-0 px-2 py-1"><Copy size={11} /></button>
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
                <button className="btn-ghost text-xs" onClick={() => { setDetail(null); openEdit(detail); }}>Editar</button>
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
