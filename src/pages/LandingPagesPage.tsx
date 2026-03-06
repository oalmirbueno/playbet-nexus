import { useState } from "react";
import { Plus, Edit, Copy, Eye, XCircle, CheckCircle, Search, ExternalLink } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useLandingPages, useGames, usePlatforms, useTemplates } from "@/hooks/useSupabaseQuery";
import type { LandingPageRow } from "@/services/supabaseService";
import { toast } from "@/hooks/use-toast";
import Breadcrumbs from "@/components/Breadcrumbs";
import ExportDropdown from "@/components/ExportDropdown";

type EditingState = {
  id?: string;
  name: string;
  slug: string;
  route: string;
  type: string;
  game_id: string;
  platform_id: string;
  template_id: string;
  is_active: boolean;
};

const emptyEditing: EditingState = {
  name: "", slug: "", route: "", type: "Jogo",
  game_id: "", platform_id: "", template_id: "", is_active: true,
};

export default function LandingPagesPage() {
  const navigate = useNavigate();
  const { data, isLoading, create, update, toggle, isCreating, isUpdating } = useLandingPages();
  const { data: games } = useGames();
  const { data: platforms } = usePlatforms();
  const { data: templates } = useTemplates();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<EditingState | null>(null);
  const [previewOpen, setPreviewOpen] = useState<LandingPageRow | null>(null);
  const [search, setSearch] = useState("");
  const [filterTipo, setFilterTipo] = useState("Todos");
  const [filterStatus, setFilterStatus] = useState("Todos");

  const getGameName = (id: string | null) => games.find(g => g.id === id)?.name || "—";
  const getPlatformName = (id: string | null) => platforms.find(p => p.id === id)?.name || "—";
  const getTemplateName = (id: string | null) => templates.find(t => t.id === id)?.name || "—";

  const filtered = data.filter(p => {
    if (search && !p.name.toLowerCase().includes(search.toLowerCase()) && !p.route.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterTipo !== "Todos" && p.type !== filterTipo) return false;
    if (filterStatus === "Ativo" && !p.is_active) return false;
    if (filterStatus === "Inativo" && p.is_active) return false;
    return true;
  });

  const stats = [
    { label: "Total LPs", value: data.length, variant: "border-l-primary" },
    { label: "Ativas", value: data.filter(p => p.is_active).length, variant: "border-l-success" },
    { label: "Inativas", value: data.filter(p => !p.is_active).length, variant: "border-l-warning" },
    { label: "Tipos", value: new Set(data.map(p => p.type).filter(Boolean)).size, variant: "border-l-info" },
  ];

  const openCreate = () => { setEditing({ ...emptyEditing }); setModalOpen(true); };
  const openEdit = (p: LandingPageRow) => {
    setEditing({
      id: p.id, name: p.name, slug: p.slug, route: p.route,
      type: p.type || "Jogo", game_id: p.game_id || "",
      platform_id: p.platform_id || "", template_id: p.template_id || "",
      is_active: p.is_active ?? true,
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!editing?.name || !editing?.slug || !editing?.route) {
      toast({ title: "Erro", description: "Nome, slug e rota são obrigatórios.", variant: "destructive" });
      return;
    }
    try {
      const payload = {
        name: editing.name, slug: editing.slug, route: editing.route,
        type: editing.type || null, is_active: editing.is_active,
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
    } catch { /* hook handles toast */ }
  };

  const handleToggle = async (p: LandingPageRow) => {
    await toggle({ id: p.id, current: p.is_active ?? true });
  };

  const exportableData = data.map(p => ({
    id: p.id, name: p.name, slug: p.slug, route: p.route,
    type: p.type || "", game: getGameName(p.game_id),
    platform: getPlatformName(p.platform_id), template: getTemplateName(p.template_id),
    status: p.is_active ? "Ativo" : "Inativo",
  }));

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Breadcrumbs items={[{ label: "Gestão de Ativos", path: "/landing-pages" }, { label: "Landing Pages" }]} />
        <div className="flex items-center justify-center py-20 text-muted-foreground">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mr-3" />
          <span className="text-sm">Carregando landing pages...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: "Gestão de Ativos", path: "/landing-pages" }, { label: "Landing Pages" }]} />
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div><h1 className="page-header">Landing Pages</h1><p className="page-subtitle">Gestão de páginas de conversão, performance e vínculos com influenciadores</p></div>
        <div className="flex gap-2">
          <ExportDropdown data={exportableData} filename="landing-pages-playbet" />
          <button className="btn-primary" onClick={openCreate}><Plus size={14} /> Adicionar LP</button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {stats.map(s => (
          <div key={s.label} className={`stat-card border-l-2 ${s.variant}`}>
            <span className="text-[10px] text-muted-foreground uppercase">{s.label}</span>
            <p className="text-xl font-bold">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Atalhos */}
      <div className="flex flex-wrap gap-2">
        <button className="btn-ghost text-xs" onClick={() => navigate("/lp-templates")}>→ Templates de LP</button>
        <button className="btn-ghost text-xs" onClick={() => navigate("/link-engine")}>→ Engine de Links</button>
        <button className="btn-ghost text-xs" onClick={() => navigate("/influencers")}>→ Influencers</button>
        <button className="btn-ghost text-xs" onClick={() => navigate("/analytics")}>→ Analytics</button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="flex items-center gap-2 bg-secondary/50 border border-border rounded-lg px-3 py-1.5 flex-1 max-w-xs">
          <Search size={13} className="text-muted-foreground shrink-0" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar LP..." className="bg-transparent text-xs text-foreground placeholder:text-muted-foreground focus:outline-none w-full" />
        </div>
        <select className="select-field" value={filterTipo} onChange={e => setFilterTipo(e.target.value)}>
          <option>Todos</option><option>Jogo</option><option>Promoção</option><option>Geral</option>
        </select>
        <select className="select-field" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option>Todos</option><option>Ativo</option><option>Inativo</option>
        </select>
      </div>

      {/* Table */}
      <div className="glass-card overflow-x-auto invisible-scroll">
        <table className="data-table">
          <thead><tr><th>Nome</th><th>Slug</th><th>Rota</th><th>Tipo</th><th>Jogo</th><th>Plataforma</th><th>Template</th><th>Status</th><th>Ações</th></tr></thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={9} className="text-center text-muted-foreground py-8">Nenhuma LP encontrada</td></tr>
            ) : filtered.map(p => (
              <tr key={p.id}>
                <td className="font-medium">{p.name}</td>
                <td className="font-mono text-xs text-accent">{p.slug}</td>
                <td className="font-mono text-xs text-accent">{p.route}</td>
                <td><span className="badge-neutral">{p.type || "—"}</span></td>
                <td className="text-xs">{getGameName(p.game_id)}</td>
                <td className="text-xs">{getPlatformName(p.platform_id)}</td>
                <td className="text-xs">{getTemplateName(p.template_id)}</td>
                <td><span className={p.is_active ? "badge-success" : "badge-danger"}>{p.is_active ? "Ativo" : "Inativo"}</span></td>
                <td>
                  <div className="flex gap-0.5">
                    <button onClick={() => setPreviewOpen(p)} className="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors" title="Preview"><Eye size={12} /></button>
                    <button onClick={() => openEdit(p)} className="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors" title="Editar"><Edit size={12} /></button>
                    <button onClick={() => { navigator.clipboard.writeText(`https://playbet.com${p.route}`); toast({ title: "URL copiada!" }); }} className="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors" title="Copiar"><Copy size={12} /></button>
                    <button onClick={() => handleToggle(p)} className={`p-1 rounded transition-colors text-muted-foreground ${p.is_active ? "hover:bg-destructive/15 hover:text-destructive" : "hover:bg-success/15 hover:text-success"}`} title={p.is_active ? "Desativar" : "Ativar"}>
                      {p.is_active ? <XCircle size={12} /> : <CheckCircle size={12} />}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Preview Modal */}
      <Dialog open={!!previewOpen} onOpenChange={() => setPreviewOpen(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Preview — {previewOpen?.name}</DialogTitle></DialogHeader>
          {previewOpen && (
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-xs text-muted-foreground">URL Pública</span><p className="font-mono text-accent">playbet.com{previewOpen.route}</p></div>
                <div><span className="text-xs text-muted-foreground">Tipo</span><p><span className="badge-neutral">{previewOpen.type || "—"}</span></p></div>
                <div><span className="text-xs text-muted-foreground">Jogo</span><p>{getGameName(previewOpen.game_id)}</p></div>
                <div><span className="text-xs text-muted-foreground">Plataforma</span><p>{getPlatformName(previewOpen.platform_id)}</p></div>
                <div><span className="text-xs text-muted-foreground">Template</span><p>{getTemplateName(previewOpen.template_id)}</p></div>
                <div><span className="text-xs text-muted-foreground">Status</span><p><span className={previewOpen.is_active ? "badge-success" : "badge-warning"}>{previewOpen.is_active ? "Ativo" : "Inativo"}</span></p></div>
              </div>
              <div className="border border-dashed border-border rounded-lg p-8 text-center text-muted-foreground bg-secondary/20">
                <ExternalLink size={24} className="mx-auto mb-2 opacity-30" />
                <p className="text-sm">Preview visual da LP</p>
                <p className="text-xs mt-1">A visualização real estará disponível em breve.</p>
              </div>
            </div>
          )}
          <DialogFooter>
            {previewOpen && <button className="btn-ghost" onClick={() => { navigator.clipboard.writeText(`https://playbet.com${previewOpen.route}`); toast({ title: "URL copiada!" }); }}>Copiar URL</button>}
            <button className="btn-ghost" onClick={() => setPreviewOpen(null)}>Fechar</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create/Edit Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editing?.id ? "Editar Landing Page" : "Adicionar Landing Page"}</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div><label className="text-xs font-medium text-muted-foreground">Nome *</label><input className="input-field mt-1" value={editing?.name || ""} onChange={e => setEditing(p => p ? { ...p, name: e.target.value } : p)} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-xs font-medium text-muted-foreground">Slug *</label><input className="input-field mt-1" value={editing?.slug || ""} onChange={e => setEditing(p => p ? { ...p, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") } : p)} placeholder="minha-lp" /></div>
              <div><label className="text-xs font-medium text-muted-foreground">Rota *</label><input className="input-field mt-1" value={editing?.route || ""} onChange={e => setEditing(p => p ? { ...p, route: e.target.value } : p)} placeholder="/minha-landing" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-xs font-medium text-muted-foreground">Tipo</label>
                <select className="select-field mt-1 w-full" value={editing?.type || "Jogo"} onChange={e => setEditing(p => p ? { ...p, type: e.target.value } : p)}>
                  <option>Jogo</option><option>Promoção</option><option>Geral</option>
                </select>
              </div>
              <div><label className="text-xs font-medium text-muted-foreground">Status</label>
                <select className="select-field mt-1 w-full" value={editing?.is_active ? "Ativo" : "Inativo"} onChange={e => setEditing(p => p ? { ...p, is_active: e.target.value === "Ativo" } : p)}>
                  <option>Ativo</option><option>Inativo</option>
                </select>
              </div>
            </div>
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
            <div><label className="text-xs font-medium text-muted-foreground">Template</label>
              <select className="select-field mt-1 w-full" value={editing?.template_id || ""} onChange={e => setEditing(p => p ? { ...p, template_id: e.target.value } : p)}>
                <option value="">Nenhum</option>
                {templates.filter(t => t.is_active).map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
          </div>
          <DialogFooter>
            <button className="btn-ghost" onClick={() => setModalOpen(false)}>Cancelar</button>
            <button className="btn-primary" onClick={handleSave} disabled={isCreating || isUpdating}>
              {isCreating || isUpdating ? "Salvando..." : "Salvar"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
