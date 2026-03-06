import { useState } from "react";
import { Plus, Edit, Eye, XCircle, CheckCircle, Copy, Search, DollarSign, Globe, Gamepad2, Link2, Users, AlertTriangle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { usePlatforms } from "@/hooks/useSupabaseQuery";
import type { PlatformRow } from "@/services/supabaseService";
import { toast } from "@/hooks/use-toast";
import Breadcrumbs from "@/components/Breadcrumbs";
import ExportDropdown from "@/components/ExportDropdown";

type EditingState = {
  id?: string;
  name: string;
  commission_type: string;
  revshare: number | null;
  cpa: number | null;
  hybrid: boolean;
  currency: string;
  payout_method: string;
  affiliate_manager: string;
  notes: string;
  is_active: boolean;
};

const emptyEditing: EditingState = {
  name: "", commission_type: "Revenue Share", revshare: null, cpa: null,
  hybrid: false, currency: "BRL", payout_method: "Mensal",
  affiliate_manager: "", notes: "", is_active: true,
};

export default function PlataformasPage() {
  const navigate = useNavigate();
  const { data, isLoading, create, update, toggle, isCreating, isUpdating } = usePlatforms();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<EditingState | null>(null);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("Todos");
  const [filterTipo, setFilterTipo] = useState("Todos");

  const filtered = data.filter(p => {
    if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterStatus === "Ativo" && !p.is_active) return false;
    if (filterStatus === "Inativo" && p.is_active) return false;
    if (filterTipo !== "Todos" && p.commission_type !== filterTipo) return false;
    return true;
  });

  const activeCount = data.filter(p => p.is_active).length;

  const stats = [
    { label: "Total Plataformas", value: String(data.length), icon: Globe, variant: "border-l-primary" },
    { label: "Ativas", value: String(activeCount), icon: CheckCircle, variant: "border-l-success" },
    { label: "Inativas", value: String(data.length - activeCount), icon: XCircle, variant: "border-l-warning" },
    { label: "Revenue Share", value: String(data.filter(p => p.commission_type === "Revenue Share").length), icon: DollarSign, variant: "border-l-accent" },
    { label: "CPA", value: String(data.filter(p => p.commission_type === "CPA").length), icon: Link2, variant: "border-l-info" },
    { label: "Hybrid", value: String(data.filter(p => p.hybrid).length), icon: Gamepad2, variant: "border-l-primary" },
  ];

  const openCreate = () => { setEditing({ ...emptyEditing }); setModalOpen(true); };
  const openEdit = (p: PlatformRow) => {
    setEditing({
      id: p.id, name: p.name, commission_type: p.commission_type || "Revenue Share",
      revshare: p.revshare, cpa: p.cpa, hybrid: p.hybrid ?? false,
      currency: p.currency || "BRL", payout_method: p.payout_method || "Mensal",
      affiliate_manager: p.affiliate_manager || "", notes: p.notes || "", is_active: p.is_active ?? true,
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!editing?.name) { toast({ title: "Erro", description: "Nome é obrigatório.", variant: "destructive" }); return; }
    try {
      if (editing.id) {
        await update({ id: editing.id, updates: {
          name: editing.name, commission_type: editing.commission_type || null,
          revshare: editing.revshare, cpa: editing.cpa, hybrid: editing.hybrid,
          currency: editing.currency || null, payout_method: editing.payout_method || null,
          affiliate_manager: editing.affiliate_manager || null, notes: editing.notes || null,
          is_active: editing.is_active,
        }});
      } else {
        await create({
          name: editing.name, commission_type: editing.commission_type || null,
          revshare: editing.revshare, cpa: editing.cpa, hybrid: editing.hybrid,
          currency: editing.currency || null, payout_method: editing.payout_method || null,
          affiliate_manager: editing.affiliate_manager || null, notes: editing.notes || null,
          is_active: editing.is_active,
        });
      }
      setModalOpen(false);
    } catch { /* hook handles toast */ }
  };

  const handleToggle = async (p: PlatformRow) => {
    await toggle({ id: p.id, current: p.is_active ?? true });
  };

  const copyLink = (p: PlatformRow) => {
    navigator.clipboard.writeText(`https://playbet.com/plat/${p.name.toLowerCase()}`);
    toast({ title: "Link copiado!" });
  };

  const exportableData = data.map(p => ({
    id: p.id, name: p.name, commission_type: p.commission_type || "",
    revshare: p.revshare || 0, cpa: p.cpa || 0, currency: p.currency || "",
    payout_method: p.payout_method || "", status: p.is_active ? "Ativo" : "Inativo",
  }));

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Breadcrumbs items={[{ label: "Gestão de Ativos", path: "/plataformas" }, { label: "Plataformas" }]} />
        <div className="flex items-center justify-center py-20 text-muted-foreground">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mr-3" />
          <span className="text-sm">Carregando plataformas...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: "Gestão de Ativos", path: "/plataformas" }, { label: "Plataformas" }]} />
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="page-header">Plataformas</h1>
          <p className="page-subtitle">Gestão de plataformas parceiras, modelos de comissão e performance operacional</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <ExportDropdown data={exportableData} filename="plataformas-playbet" />
          <button className="btn-primary" onClick={openCreate}><Plus size={14} /> Adicionar Plataforma</button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {stats.map(s => (
          <div key={s.label} className={`stat-card border-l-2 ${s.variant}`}>
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">{s.label}</span>
              <s.icon size={14} className="text-muted-foreground" />
            </div>
            <div className="text-sm font-bold">{s.value}</div>
          </div>
        ))}
      </div>

      {/* Quick Nav */}
      <div className="flex flex-wrap gap-2">
        <button className="btn-ghost text-xs" onClick={() => navigate("/jogos")}>→ Jogos</button>
        <button className="btn-ghost text-xs" onClick={() => navigate("/links")}>→ Links Afiliados</button>
        <button className="btn-ghost text-xs" onClick={() => navigate("/landing-pages")}>→ Landing Pages</button>
        <button className="btn-ghost text-xs" onClick={() => navigate("/campanhas")}>→ Campanhas</button>
        <button className="btn-ghost text-xs" onClick={() => navigate("/financeiro")}>→ Financeiro</button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="flex items-center gap-2 bg-secondary/50 border border-border rounded-lg px-3 py-1.5 flex-1 max-w-xs">
          <Search size={13} className="text-muted-foreground shrink-0" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar plataforma..." className="bg-transparent text-xs text-foreground placeholder:text-muted-foreground focus:outline-none w-full" />
        </div>
        <select className="select-field" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option>Todos</option><option>Ativo</option><option>Inativo</option>
        </select>
        <select className="select-field" value={filterTipo} onChange={e => setFilterTipo(e.target.value)}>
          <option>Todos</option><option>Revenue Share</option><option>CPA</option><option>CPA + RevShare</option><option>Hybrid</option>
        </select>
      </div>

      {/* Table */}
      <div className="glass-card overflow-x-auto invisible-scroll">
        <table className="data-table">
          <thead>
            <tr>
              <th>Plataforma</th><th>Tipo Comissão</th><th>RevShare</th><th>CPA</th><th>Moeda</th><th>Pagamento</th>
              <th>Gerente</th><th>Status</th><th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(p => (
              <tr key={p.id}>
                <td>
                  <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate(`/plataformas/${p.id}`)}>
                    <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center text-[10px] font-bold text-accent">{p.name.charAt(0)}</div>
                    <span className="font-medium hover:text-accent transition-colors">{p.name}</span>
                  </div>
                </td>
                <td><span className="badge-primary">{p.commission_type || "—"}</span></td>
                <td>{p.revshare ? `${p.revshare}%` : "—"}</td>
                <td>{p.cpa ? `R$ ${p.cpa}` : "—"}</td>
                <td>{p.currency || "BRL"}</td>
                <td className="text-xs">{p.payout_method || "—"}</td>
                <td className="text-xs">{p.affiliate_manager || "—"}</td>
                <td><span className={p.is_active ? "badge-success" : "badge-danger"}>{p.is_active ? "Ativo" : "Inativo"}</span></td>
                <td>
                  <div className="flex gap-0.5" onClick={e => e.stopPropagation()}>
                    <button onClick={() => navigate(`/plataformas/${p.id}`)} className="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors" title="Ver detalhe"><Eye size={12} /></button>
                    <button onClick={() => openEdit(p)} className="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors" title="Editar"><Edit size={12} /></button>
                    <button onClick={() => copyLink(p)} className="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors" title="Copiar link"><Copy size={12} /></button>
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

      {/* Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editing?.id ? "Editar Plataforma" : "Adicionar Plataforma"}</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div><label className="text-xs font-medium text-muted-foreground">Nome *</label><input className="input-field mt-1" value={editing?.name || ""} onChange={e => setEditing(p => p ? { ...p, name: e.target.value } : p)} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-xs font-medium text-muted-foreground">Tipo Comissão</label>
                <select className="select-field mt-1 w-full" value={editing?.commission_type || ""} onChange={e => setEditing(p => p ? { ...p, commission_type: e.target.value } : p)}>
                  <option>Revenue Share</option><option>CPA</option><option>CPA + RevShare</option><option>Hybrid</option>
                </select>
              </div>
              <div><label className="text-xs font-medium text-muted-foreground">Status</label>
                <select className="select-field mt-1 w-full" value={editing?.is_active ? "Ativo" : "Inativo"} onChange={e => setEditing(p => p ? { ...p, is_active: e.target.value === "Ativo" } : p)}>
                  <option>Ativo</option><option>Inativo</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-xs font-medium text-muted-foreground">RevShare (%)</label><input type="number" className="input-field mt-1" value={editing?.revshare ?? ""} onChange={e => setEditing(p => p ? { ...p, revshare: e.target.value ? Number(e.target.value) : null } : p)} /></div>
              <div><label className="text-xs font-medium text-muted-foreground">CPA (R$)</label><input type="number" className="input-field mt-1" value={editing?.cpa ?? ""} onChange={e => setEditing(p => p ? { ...p, cpa: e.target.value ? Number(e.target.value) : null } : p)} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-xs font-medium text-muted-foreground">Moeda</label><input className="input-field mt-1" value={editing?.currency || ""} onChange={e => setEditing(p => p ? { ...p, currency: e.target.value } : p)} /></div>
              <div><label className="text-xs font-medium text-muted-foreground">Pagamento</label>
                <select className="select-field mt-1 w-full" value={editing?.payout_method || "Mensal"} onChange={e => setEditing(p => p ? { ...p, payout_method: e.target.value } : p)}>
                  <option>Semanal</option><option>Quinzenal</option><option>Mensal</option>
                </select>
              </div>
            </div>
            <div><label className="text-xs font-medium text-muted-foreground">Gerente de Afiliados</label><input className="input-field mt-1" value={editing?.affiliate_manager || ""} onChange={e => setEditing(p => p ? { ...p, affiliate_manager: e.target.value } : p)} /></div>
            <div><label className="text-xs font-medium text-muted-foreground">Observações</label><textarea className="input-field mt-1 min-h-[60px]" value={editing?.notes || ""} onChange={e => setEditing(p => p ? { ...p, notes: e.target.value } : p)} /></div>
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
