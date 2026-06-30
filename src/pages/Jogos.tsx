import { useState } from "react";
import { Plus, Edit, XCircle, CheckCircle, Eye, Search, Gamepad2, TrendingUp, TrendingDown, Minus, AlertTriangle, Copy, Link2, Globe, DollarSign } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useGames } from "@/hooks/useSupabaseQuery";
import type { GameRow } from "@/services/supabaseService";
import { toast } from "@/hooks/use-toast";
import Breadcrumbs from "@/components/Breadcrumbs";
import ExportDropdown from "@/components/ExportDropdown";

const getTrend = (status: string | null) => {
  if (status === "trending") return { label: "Trending", color: "text-success", icon: TrendingUp };
  if (status === "stable") return { label: "Estável", color: "text-accent", icon: Minus };
  if (status === "falling") return { label: "Em Queda", color: "text-warning", icon: TrendingDown };
  if (status === "critical") return { label: "Crítico", color: "text-destructive", icon: TrendingDown };
  return { label: "-", color: "text-muted-foreground", icon: Minus };
};

type EditingState = {
  id?: string;
  name: string;
  category: string;
  trend_status: string;
  is_active: boolean;
};

const emptyEditing: EditingState = {
  name: "", category: "Slot", trend_status: "stable", is_active: true,
};

export default function Jogos() {
  const navigate = useNavigate();
  const { data, isLoading, create, update, toggle, isCreating, isUpdating } = useGames();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<EditingState | null>(null);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("Todos");
  const [filterCat, setFilterCat] = useState("Todos");

  const filtered = data.filter(j => {
    if (search && !j.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterStatus === "Ativo" && !j.is_active) return false;
    if (filterStatus === "Inativo" && j.is_active) return false;
    if (filterCat !== "Todos" && j.category !== filterCat) return false;
    return true;
  });

  const activeCount = data.filter(j => j.is_active).length;
  const trendingCount = data.filter(j => j.trend_status === "trending").length;

  const stats = [
    { label: "Total Jogos", value: String(data.length), icon: Gamepad2, variant: "border-l-primary" },
    { label: "Ativos", value: String(activeCount), icon: CheckCircle, variant: "border-l-success" },
    { label: "Inativos", value: String(data.length - activeCount), icon: XCircle, variant: "border-l-warning" },
    { label: "Trending", value: String(trendingCount), icon: TrendingUp, variant: "border-l-success" },
    { label: "Em Queda", value: String(data.filter(j => j.trend_status === "falling" || j.trend_status === "critical").length), icon: TrendingDown, variant: "border-l-destructive" },
    { label: "Categorias", value: String(new Set(data.map(j => j.category).filter(Boolean)).size), icon: Globe, variant: "border-l-info" },
  ];

  const openCreate = () => { setEditing({ ...emptyEditing }); setModalOpen(true); };
  const openEdit = (j: GameRow) => {
    setEditing({
      id: j.id, name: j.name, category: j.category || "Slot",
      trend_status: j.trend_status || "stable", is_active: j.is_active ?? true,
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!editing?.name) { toast({ title: "Erro", description: "Nome é obrigatório.", variant: "destructive" }); return; }
    try {
      if (editing.id) {
        await update({ id: editing.id, updates: {
          name: editing.name, category: editing.category || null,
          trend_status: editing.trend_status || null, is_active: editing.is_active,
        }});
      } else {
        await create({
          name: editing.name, category: editing.category || null,
          trend_status: editing.trend_status || null, is_active: editing.is_active,
        });
      }
      setModalOpen(false);
    } catch { /* toast handled by hook */ }
  };

  const handleToggle = async (j: GameRow) => {
    await toggle({ id: j.id, current: j.is_active ?? true });
  };

  const exportableData = data.map(j => ({
    id: j.id, name: j.name, category: j.category || "",
    trend: getTrend(j.trend_status).label, status: j.is_active ? "Ativo" : "Inativo",
  }));

  if (isLoading) {
    return (
      <div className="space-y-8">
        <Breadcrumbs items={[{ label: "Gestão de Ativos", path: "/jogos" }, { label: "Jogos" }]} />
        <div className="flex items-center justify-center py-20 text-muted-foreground">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mr-3" />
          <span className="text-sm">Carregando jogos...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <Breadcrumbs items={[{ label: "Gestão de Ativos", path: "/jogos" }, { label: "Jogos" }]} />
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Jogos</h1>
          <p className="text-sm text-muted-foreground mt-1">Centro de gestão de jogos, performance e distribuição estratégica</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <ExportDropdown data={exportableData} filename="jogos-playbet" />
          <button className="btn-primary" onClick={openCreate}><Plus size={14} /> Adicionar Jogo</button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {stats.map(s => (
          <div key={s.label} className={`glass-card p-5 border-l-2 ${s.variant}`}>
            <div className="flex items-center justify-between mb-2"><span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">{s.label}</span><s.icon size={14} className="text-muted-foreground" /></div>
            <div className="text-lg font-bold">{s.value}</div>
          </div>
        ))}
      </div>

      {/* Quick Nav */}
      <div className="flex flex-wrap gap-2">
        <button className="btn-ghost text-xs" onClick={() => navigate("/plataformas")}>→ Plataformas</button>
        <button className="btn-ghost text-xs" onClick={() => navigate("/landing-pages")}>→ Landing Pages</button>
        <button className="btn-ghost text-xs" onClick={() => navigate("/links")}>→ Links Afiliados</button>
        <button className="btn-ghost text-xs" onClick={() => navigate("/campanhas")}>→ Campanhas</button>
        <button className="btn-ghost text-xs" onClick={() => navigate("/analytics")}>→ Analytics</button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="flex items-center gap-2 bg-secondary/50 border border-border rounded-lg px-3 py-1.5 flex-1 max-w-xs">
          <Search size={13} className="text-muted-foreground shrink-0" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar jogo..." className="bg-transparent text-xs text-foreground placeholder:text-muted-foreground focus:outline-none w-full" />
        </div>
        <select className="select-field" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option>Todos</option><option>Ativo</option><option>Inativo</option>
        </select>
        <select className="select-field" value={filterCat} onChange={e => setFilterCat(e.target.value)}>
          <option>Todos</option><option>Slot</option><option>Crash</option><option>Casual</option><option>Card</option><option>Live</option>
        </select>
      </div>

      {/* Table */}
      <div className="glass-card overflow-x-auto invisible-scroll">
        <table className="data-table">
          <thead><tr><th>Jogo</th><th>Categoria</th><th>Tendência</th><th>Status</th><th>Ações</th></tr></thead>
          <tbody>
            {filtered.map(j => {
              const trend = getTrend(j.trend_status);
              return (
                <tr key={j.id}>
                  <td>
                    <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate(`/jogos/${j.id}`)}>
                      <div className="w-7 h-7 rounded bg-primary/20 flex items-center justify-center text-[10px] font-bold text-accent">{j.name.charAt(0)}</div>
                      <span className="font-medium hover:text-accent transition-colors">{j.name}</span>
                    </div>
                  </td>
                  <td><span className="badge-neutral">{j.category || "-"}</span></td>
                  <td><span className={`flex items-center gap-1 text-xs font-medium ${trend.color}`}><trend.icon size={12} />{trend.label}</span></td>
                  <td><span className={j.is_active ? "badge-success" : "badge-danger"}>{j.is_active ? "Ativo" : "Inativo"}</span></td>
                  <td>
                    <div className="flex gap-0.5" onClick={e => e.stopPropagation()}>
                      <button onClick={() => navigate(`/jogos/${j.id}`)} className="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors" title="Ver detalhe"><Eye size={12} /></button>
                      <button onClick={() => openEdit(j)} className="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors" title="Editar"><Edit size={12} /></button>
                      <button onClick={() => handleToggle(j)} className={`p-1 rounded transition-colors text-muted-foreground ${j.is_active ? "hover:bg-destructive/15 hover:text-destructive" : "hover:bg-success/15 hover:text-success"}`} title={j.is_active ? "Desativar" : "Ativar"}>
                        {j.is_active ? <XCircle size={12} /> : <CheckCircle size={12} />}
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editing?.id ? "Editar Jogo" : "Adicionar Jogo"}</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div><label className="text-xs font-medium text-muted-foreground">Nome *</label><input className="input-field mt-1" value={editing?.name || ""} onChange={e => setEditing(p => p ? { ...p, name: e.target.value } : p)} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-xs font-medium text-muted-foreground">Categoria</label>
                <select className="select-field mt-1 w-full" value={editing?.category || "Slot"} onChange={e => setEditing(p => p ? { ...p, category: e.target.value } : p)}>
                  <option>Slot</option><option>Crash</option><option>Casual</option><option>Card</option><option>Live</option>
                </select>
              </div>
              <div><label className="text-xs font-medium text-muted-foreground">Status</label>
                <select className="select-field mt-1 w-full" value={editing?.is_active ? "Ativo" : "Inativo"} onChange={e => setEditing(p => p ? { ...p, is_active: e.target.value === "Ativo" } : p)}>
                  <option>Ativo</option><option>Inativo</option>
                </select>
              </div>
            </div>
            <div><label className="text-xs font-medium text-muted-foreground">Tendência</label>
              <select className="select-field mt-1 w-full" value={editing?.trend_status || "stable"} onChange={e => setEditing(p => p ? { ...p, trend_status: e.target.value } : p)}>
                <option value="trending">Trending</option><option value="stable">Estável</option><option value="falling">Em Queda</option><option value="critical">Crítico</option>
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
