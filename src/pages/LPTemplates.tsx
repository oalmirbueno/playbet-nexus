import { useState } from "react";
import { Plus, Edit, XCircle, CheckCircle, Eye, Copy, Search } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useTemplates } from "@/hooks/useSupabaseQuery";
import type { TemplateRow } from "@/services/supabaseService";
import { toast } from "@/hooks/use-toast";
import Breadcrumbs from "@/components/Breadcrumbs";
import ExportDropdown from "@/components/ExportDropdown";

type EditingState = {
  id?: string;
  name: string;
  type: string;
  main_game: string;
  is_active: boolean;
};

const emptyEditing: EditingState = {
  name: "", type: "Jogo", main_game: "", is_active: true,
};

export default function LPTemplates() {
  const navigate = useNavigate();
  const { data, isLoading, create, update, toggle, isCreating, isUpdating } = useTemplates();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<EditingState | null>(null);
  const [detailOpen, setDetailOpen] = useState<TemplateRow | null>(null);
  const [search, setSearch] = useState("");

  const filtered = data.filter(t => {
    if (search && !t.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const openCreate = () => { setEditing({ ...emptyEditing }); setModalOpen(true); };
  const openEdit = (t: TemplateRow) => {
    setEditing({
      id: t.id, name: t.name, type: t.type || "Jogo",
      main_game: t.main_game || "", is_active: t.is_active ?? true,
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!editing?.name) { toast({ title: "Erro", description: "Nome é obrigatório.", variant: "destructive" }); return; }
    try {
      if (editing.id) {
        await update({ id: editing.id, updates: {
          name: editing.name, type: editing.type || null,
          main_game: editing.main_game || null, is_active: editing.is_active,
        }});
      } else {
        await create({
          name: editing.name, type: editing.type || null,
          main_game: editing.main_game || null, is_active: editing.is_active,
        });
      }
      setModalOpen(false);
    } catch { /* hook handles toast */ }
  };

  const handleToggle = async (t: TemplateRow) => {
    await toggle({ id: t.id, current: t.is_active ?? true });
  };

  const exportableData = data.map(t => ({
    id: t.id, name: t.name, type: t.type || "",
    main_game: t.main_game || "", status: t.is_active ? "Ativo" : "Inativo",
  }));

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Breadcrumbs items={[{ label: "Gestão de Ativos", path: "/lp-templates" }, { label: "Templates de LP" }]} />
        <div className="flex items-center justify-center py-20 text-muted-foreground">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mr-3" />
          <span className="text-sm">Carregando templates...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: "Gestão de Ativos", path: "/lp-templates" }, { label: "Templates de LP" }]} />
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div><h1 className="page-header">Templates de LP</h1><p className="page-subtitle">Central de templates — base para distribuição por influenciador</p></div>
        <div className="flex gap-2">
          <ExportDropdown data={exportableData} filename="templates-lp-playbet" />
          <button className="btn-primary" onClick={openCreate}><Plus size={14} /> Criar Template</button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="stat-card border-l-2 border-l-primary"><span className="text-[10px] text-muted-foreground uppercase">Total Templates</span><p className="text-xl font-bold">{data.length}</p></div>
        <div className="stat-card border-l-2 border-l-success"><span className="text-[10px] text-muted-foreground uppercase">Ativos</span><p className="text-xl font-bold">{data.filter(t => t.is_active).length}</p></div>
        <div className="stat-card border-l-2 border-l-warning"><span className="text-[10px] text-muted-foreground uppercase">Inativos</span><p className="text-xl font-bold">{data.filter(t => !t.is_active).length}</p></div>
        <div className="stat-card border-l-2 border-l-info"><span className="text-[10px] text-muted-foreground uppercase">Tipos</span><p className="text-xl font-bold">{new Set(data.map(t => t.type).filter(Boolean)).size}</p></div>
      </div>

      {/* Atalhos */}
      <div className="flex flex-wrap gap-2">
        <button className="btn-ghost text-xs" onClick={() => navigate("/link-engine")}>→ Engine de Links</button>
        <button className="btn-ghost text-xs" onClick={() => navigate("/landing-pages")}>→ Landing Pages</button>
        <button className="btn-ghost text-xs" onClick={() => navigate("/influencers")}>→ Influencers</button>
        <button className="btn-ghost text-xs" onClick={() => navigate("/hubs")}>→ Hubs</button>
      </div>

      {/* Search */}
      <div className="flex items-center gap-2 bg-secondary/50 border border-border rounded-lg px-3 py-1.5 max-w-xs">
        <Search size={13} className="text-muted-foreground shrink-0" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar template..." className="bg-transparent text-xs text-foreground placeholder:text-muted-foreground focus:outline-none w-full" />
      </div>

      {/* Table */}
      <div className="glass-card overflow-x-auto invisible-scroll">
        <table className="data-table">
          <thead><tr><th>Nome</th><th>Tipo</th><th>Jogo Vinculado</th><th>Status</th><th>Ações</th></tr></thead>
          <tbody>
            {filtered.map(t => (
              <tr key={t.id}>
                <td className="font-medium">{t.name}</td>
                <td><span className="badge-neutral">{t.type || "—"}</span></td>
                <td>{t.main_game || "—"}</td>
                <td><span className={t.is_active ? "badge-success" : "badge-danger"}>{t.is_active ? "Ativo" : "Inativo"}</span></td>
                <td>
                  <div className="flex gap-0.5">
                    <button onClick={() => setDetailOpen(t)} className="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors" title="Detalhes"><Eye size={12} /></button>
                    <button onClick={() => openEdit(t)} className="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors" title="Editar"><Edit size={12} /></button>
                    <button onClick={() => handleToggle(t)} className={`p-1 rounded transition-colors text-muted-foreground ${t.is_active ? "hover:bg-destructive/15 hover:text-destructive" : "hover:bg-success/15 hover:text-success"}`} title={t.is_active ? "Desativar" : "Ativar"}>
                      {t.is_active ? <XCircle size={12} /> : <CheckCircle size={12} />}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Detail Modal */}
      <Dialog open={!!detailOpen} onOpenChange={() => setDetailOpen(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Template — {detailOpen?.name}</DialogTitle></DialogHeader>
          {detailOpen && (
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
                <div className="p-2 bg-secondary/50 rounded text-center"><span className="text-[10px] text-muted-foreground">Tipo</span><p className="font-medium">{detailOpen.type || "—"}</p></div>
                <div className="p-2 bg-secondary/50 rounded text-center"><span className="text-[10px] text-muted-foreground">Jogo</span><p className="font-medium">{detailOpen.main_game || "—"}</p></div>
                <div className="p-2 bg-secondary/50 rounded text-center"><span className="text-[10px] text-muted-foreground">Status</span><p className="font-medium">{detailOpen.is_active ? "Ativo" : "Inativo"}</p></div>
              </div>
            </div>
          )}
          <DialogFooter>
            <button className="btn-ghost" onClick={() => navigate("/link-engine")}>Ver na Engine</button>
            <button className="btn-ghost" onClick={() => setDetailOpen(null)}>Fechar</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create/Edit Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editing?.id ? "Editar Template" : "Criar Template"}</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div><label className="text-xs font-medium text-muted-foreground">Nome *</label><input className="input-field mt-1" value={editing?.name || ""} onChange={e => setEditing(p => p ? { ...p, name: e.target.value } : p)} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-xs font-medium text-muted-foreground">Tipo</label>
                <select className="select-field mt-1 w-full" value={editing?.type || "Jogo"} onChange={e => setEditing(p => p ? { ...p, type: e.target.value } : p)}>
                  <option>Jogo</option><option>Promoção</option><option>Geral</option>
                </select>
              </div>
              <div><label className="text-xs font-medium text-muted-foreground">Jogo Vinculado</label><input className="input-field mt-1" value={editing?.main_game || ""} onChange={e => setEditing(p => p ? { ...p, main_game: e.target.value } : p)} /></div>
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
