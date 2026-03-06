import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Copy, Edit, Eye, Pause, Play, Plus, BarChart3 } from "lucide-react";
import Breadcrumbs from "@/components/Breadcrumbs";
import ExportDropdown from "@/components/ExportDropdown";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { useUtms, useInfluencers, useLandingPages, useGames, usePlatforms, useTemplates } from "@/hooks/useSupabaseQuery";
import type { UtmRow } from "@/services/supabaseService";

type EditingState = {
  id?: string;
  utm_source: string;
  utm_medium: string;
  utm_campaign: string;
  utm_content: string;
  subid: string;
  influencer_id: string;
  landing_page_id: string;
  game_id: string;
  platform_id: string;
  template_id: string;
  notes: string;
  is_active: boolean;
};

const emptyEditing: EditingState = {
  utm_source: "playbet", utm_medium: "", utm_campaign: "", utm_content: "",
  subid: "", influencer_id: "", landing_page_id: "", game_id: "",
  platform_id: "", template_id: "", notes: "", is_active: true,
};

export default function UtmsSubids() {
  const navigate = useNavigate();
  const { data, isLoading, create, update, toggle, isCreating, isUpdating } = useUtms();
  const { data: influencers } = useInfluencers();
  const { data: landingPages } = useLandingPages();
  const { data: games } = useGames();
  const { data: platforms } = usePlatforms();
  const { data: templates } = useTemplates();

  const [detail, setDetail] = useState<UtmRow | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<EditingState | null>(null);
  const [filterSource, setFilterSource] = useState("Todos");
  const [filterMedium, setFilterMedium] = useState("Todos");
  const [search, setSearch] = useState("");

  const getInfluencerName = (id: string | null) => influencers.find(i => i.id === id)?.name || "—";
  const getLPName = (id: string | null) => landingPages.find(l => l.id === id)?.name || "—";
  const getGameName = (id: string | null) => games.find(g => g.id === id)?.name || "—";
  const getPlatformName = (id: string | null) => platforms.find(p => p.id === id)?.name || "—";
  const getTemplateName = (id: string | null) => templates.find(t => t.id === id)?.name || "—";

  const filtered = data.filter(u => {
    if (filterSource !== "Todos" && u.utm_source !== filterSource) return false;
    if (filterMedium !== "Todos" && u.utm_medium !== filterMedium) return false;
    if (search) {
      const q = search.toLowerCase();
      const searchable = [u.utm_source, u.utm_medium, u.utm_campaign, u.utm_content, u.subid, u.notes,
        getInfluencerName(u.influencer_id), getGameName(u.game_id)].filter(Boolean).join(" ").toLowerCase();
      if (!searchable.includes(q)) return false;
    }
    return true;
  });

  const buildUrl = (u: { subid?: string | null; utm_source?: string | null; utm_medium?: string | null; utm_campaign?: string | null; utm_content?: string | null }) =>
    `https://playbet.app.br/?ref=${u.subid || "..."}&utm_source=${u.utm_source || ""}&utm_medium=${u.utm_medium || ""}&utm_campaign=${u.utm_campaign || ""}&utm_content=${u.utm_content || ""}&subid=${u.subid || ""}`;

  const handleToggle = async (u: UtmRow) => {
    await toggle({ id: u.id, current: u.is_active ?? true });
  };

  const copyUrl = (u: { subid?: string | null; utm_source?: string | null; utm_medium?: string | null; utm_campaign?: string | null; utm_content?: string | null }) => {
    navigator.clipboard.writeText(buildUrl(u));
    toast({ title: "URL copiada" });
  };

  const openCreate = () => { setEditing({ ...emptyEditing }); setModalOpen(true); };
  const openEdit = (u: UtmRow) => {
    setEditing({
      id: u.id, utm_source: u.utm_source || "playbet", utm_medium: u.utm_medium || "",
      utm_campaign: u.utm_campaign || "", utm_content: u.utm_content || "",
      subid: u.subid || "", influencer_id: u.influencer_id || "",
      landing_page_id: u.landing_page_id || "", game_id: u.game_id || "",
      platform_id: u.platform_id || "", template_id: u.template_id || "",
      notes: u.notes || "", is_active: u.is_active ?? true,
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!editing?.subid || !editing?.utm_medium) {
      toast({ title: "Erro", description: "SubID e Medium são obrigatórios.", variant: "destructive" });
      return;
    }
    try {
      const payload = {
        utm_source: editing.utm_source || null, utm_medium: editing.utm_medium || null,
        utm_campaign: editing.utm_campaign || null, utm_content: editing.utm_content || null,
        subid: editing.subid || null, notes: editing.notes || null, is_active: editing.is_active,
        influencer_id: editing.influencer_id || null,
        landing_page_id: editing.landing_page_id || null,
        game_id: editing.game_id || null,
        platform_id: editing.platform_id || null,
        template_id: editing.template_id || null,
      };
      if (editing.id) {
        await update({ id: editing.id, updates: payload });
      } else {
        await create(payload);
      }
      setModalOpen(false);
      setEditing(null);
    } catch { /* hook handles toast */ }
  };

  const mediums = [...new Set(data.map(u => u.utm_medium).filter(Boolean))];
  const sources = [...new Set(data.map(u => u.utm_source).filter(Boolean))];

  const exportableData = data.map(u => ({
    id: u.id, utm_source: u.utm_source || "", utm_medium: u.utm_medium || "",
    utm_campaign: u.utm_campaign || "", utm_content: u.utm_content || "",
    subid: u.subid || "", influencer: getInfluencerName(u.influencer_id),
    landing_page: getLPName(u.landing_page_id), game: getGameName(u.game_id),
    platform: getPlatformName(u.platform_id), status: u.is_active ? "Ativo" : "Inativo",
  }));

  if (isLoading) {
    return (
      <div className="space-y-8">
        <Breadcrumbs items={[{ label: "UTMs / SubIDs" }]} />
        <div className="flex items-center justify-center py-20 text-muted-foreground">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mr-3" />
          <span className="text-sm">Carregando UTMs...</span>
        </div>
      </div>
    );
  }

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
          <ExportDropdown data={exportableData} filename="utms-subids" />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="stat-card border-l-2 border-l-primary"><span className="text-[10px] text-muted-foreground uppercase">Total UTMs</span><p className="text-xl font-bold">{data.length}</p></div>
        <div className="stat-card border-l-2 border-l-success"><span className="text-[10px] text-muted-foreground uppercase">Ativos</span><p className="text-xl font-bold">{data.filter(u => u.is_active).length}</p></div>
        <div className="stat-card border-l-2 border-l-warning"><span className="text-[10px] text-muted-foreground uppercase">Inativos</span><p className="text-xl font-bold">{data.filter(u => !u.is_active).length}</p></div>
        <div className="stat-card border-l-2 border-l-info"><span className="text-[10px] text-muted-foreground uppercase">Mediums</span><p className="text-xl font-bold">{mediums.length}</p></div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <input className="input-field w-64" placeholder="Buscar subid, campaign, influencer..." value={search} onChange={e => setSearch(e.target.value)} />
        <select className="select-field text-xs w-auto" value={filterSource} onChange={e => setFilterSource(e.target.value)}>
          <option value="Todos">Source: Todos</option>
          {sources.map(n => <option key={n} value={n!}>{n}</option>)}
        </select>
        <select className="select-field text-xs w-auto" value={filterMedium} onChange={e => setFilterMedium(e.target.value)}>
          <option value="Todos">Medium: Todos</option>
          {mediums.map(n => <option key={n} value={n!}>{n}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="glass-card overflow-x-auto invisible-scroll">
        <table className="data-table">
          <thead>
            <tr><th>Source</th><th>Medium</th><th>Campaign</th><th>Content</th><th>SubID</th><th>Influencer</th><th>LP</th><th>Jogo</th><th>Plat.</th><th>Status</th><th>Ações</th></tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={11} className="text-center text-muted-foreground py-8">Nenhum UTM encontrado</td></tr>
            ) : filtered.map(u => (
              <tr key={u.id}>
                <td className="font-mono text-[11px]">{u.utm_source || "—"}</td>
                <td className="font-mono text-[11px]">{u.utm_medium || "—"}</td>
                <td className="font-mono text-[11px] text-primary">{u.utm_campaign || "—"}</td>
                <td className="font-mono text-[11px]">{u.utm_content || "—"}</td>
                <td className="font-mono text-[11px] font-medium">{u.subid || "—"}</td>
                <td className="text-xs">{getInfluencerName(u.influencer_id)}</td>
                <td className="text-xs">{getLPName(u.landing_page_id)}</td>
                <td className="text-xs">{getGameName(u.game_id)}</td>
                <td className="text-xs">{getPlatformName(u.platform_id)}</td>
                <td><span className={u.is_active ? "badge-success" : "badge-danger"}>{u.is_active ? "Ativo" : "Inativo"}</span></td>
                <td>
                  <div className="flex items-center gap-1">
                    <button onClick={() => setDetail(u)} className="p-1.5 hover:bg-secondary rounded cursor-pointer" title="Ver detalhe"><Eye size={13} className="text-muted-foreground" /></button>
                    <button onClick={() => openEdit(u)} className="p-1.5 hover:bg-secondary rounded cursor-pointer" title="Editar"><Edit size={13} className="text-muted-foreground" /></button>
                    <button onClick={() => copyUrl(u)} className="p-1.5 hover:bg-secondary rounded cursor-pointer" title="Copiar URL"><Copy size={13} className="text-muted-foreground" /></button>
                    <button onClick={() => handleToggle(u)} className="p-1.5 hover:bg-secondary rounded cursor-pointer" title={u.is_active ? "Desativar" : "Ativar"}>
                      {u.is_active ? <Pause size={13} className="text-muted-foreground" /> : <Play size={13} className="text-muted-foreground" />}
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
              <div><label className="text-xs font-medium text-muted-foreground">UTM Source</label><input className="input-field mt-1" value={editing?.utm_source || ""} onChange={e => setEditing(p => p ? { ...p, utm_source: e.target.value } : p)} /></div>
              <div><label className="text-xs font-medium text-muted-foreground">UTM Medium *</label>
                <select className="select-field mt-1 w-full" value={editing?.utm_medium || ""} onChange={e => setEditing(p => p ? { ...p, utm_medium: e.target.value } : p)}>
                  <option value="">Selecionar...</option>
                  <option>telegram</option><option>instagram</option><option>whatsapp</option><option>bio</option><option>youtube</option><option>tiktok</option><option>email</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-xs font-medium text-muted-foreground">UTM Campaign</label><input className="input-field mt-1" value={editing?.utm_campaign || ""} onChange={e => setEditing(p => p ? { ...p, utm_campaign: e.target.value } : p)} /></div>
              <div><label className="text-xs font-medium text-muted-foreground">UTM Content</label><input className="input-field mt-1" value={editing?.utm_content || ""} onChange={e => setEditing(p => p ? { ...p, utm_content: e.target.value } : p)} /></div>
            </div>
            <div><label className="text-xs font-medium text-muted-foreground">SubID *</label><input className="input-field mt-1" value={editing?.subid || ""} onChange={e => setEditing(p => p ? { ...p, subid: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") } : p)} placeholder="ex: rafa001" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-xs font-medium text-muted-foreground">Influencer</label>
                <select className="select-field mt-1 w-full" value={editing?.influencer_id || ""} onChange={e => setEditing(p => p ? { ...p, influencer_id: e.target.value } : p)}>
                  <option value="">Nenhum</option>
                  {influencers.filter(i => i.is_active).map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
                </select>
              </div>
              <div><label className="text-xs font-medium text-muted-foreground">Landing Page</label>
                <select className="select-field mt-1 w-full" value={editing?.landing_page_id || ""} onChange={e => setEditing(p => p ? { ...p, landing_page_id: e.target.value } : p)}>
                  <option value="">Nenhuma</option>
                  {landingPages.filter(l => l.is_active).map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-xs font-medium text-muted-foreground">Jogo</label>
                <select className="select-field mt-1 w-full" value={editing?.game_id || ""} onChange={e => setEditing(p => p ? { ...p, game_id: e.target.value } : p)}>
                  <option value="">Nenhum</option>
                  {games.filter(g => g.is_active).map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                </select>
              </div>
              <div><label className="text-xs font-medium text-muted-foreground">Plataforma</label>
                <select className="select-field mt-1 w-full" value={editing?.platform_id || ""} onChange={e => setEditing(p => p ? { ...p, platform_id: e.target.value } : p)}>
                  <option value="">Nenhuma</option>
                  {platforms.filter(p => p.is_active).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
            </div>
            <div><label className="text-xs font-medium text-muted-foreground">Template</label>
              <select className="select-field mt-1 w-full" value={editing?.template_id || ""} onChange={e => setEditing(p => p ? { ...p, template_id: e.target.value } : p)}>
                <option value="">Nenhum</option>
                {templates.filter(t => t.is_active).map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
            <div><label className="text-xs font-medium text-muted-foreground">Status</label>
              <select className="select-field mt-1 w-full" value={editing?.is_active ? "Ativo" : "Inativo"} onChange={e => setEditing(p => p ? { ...p, is_active: e.target.value === "Ativo" } : p)}>
                <option>Ativo</option><option>Inativo</option>
              </select>
            </div>
            <div><label className="text-xs font-medium text-muted-foreground">Observações</label>
              <textarea className="input-field mt-1 min-h-[60px]" value={editing?.notes || ""} onChange={e => setEditing(p => p ? { ...p, notes: e.target.value } : p)} />
            </div>
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
            <button className="btn-primary" onClick={handleSave} disabled={isCreating || isUpdating}>
              {isCreating || isUpdating ? "Salvando..." : "Salvar"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog open={!!detail} onOpenChange={() => setDetail(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Detalhe UTM — {detail?.subid || detail?.id}</DialogTitle>
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
                  { l: "Source", v: detail.utm_source || "—" },
                  { l: "Medium", v: detail.utm_medium || "—" },
                  { l: "Campaign", v: detail.utm_campaign || "—" },
                  { l: "Content", v: detail.utm_content || "—" },
                  { l: "SubID", v: detail.subid || "—" },
                  { l: "Influencer", v: getInfluencerName(detail.influencer_id) },
                  { l: "Landing Page", v: getLPName(detail.landing_page_id) },
                  { l: "Jogo", v: getGameName(detail.game_id) },
                  { l: "Plataforma", v: getPlatformName(detail.platform_id) },
                  { l: "Template", v: getTemplateName(detail.template_id) },
                  { l: "Status", v: detail.is_active ? "Ativo" : "Inativo" },
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
                <button className="btn-ghost text-xs" onClick={() => copyUrl(detail)}>Copiar URL</button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
