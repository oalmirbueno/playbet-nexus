import { useState } from "react";
import { Plus, Edit, XCircle, GitBranch, Copy, Eye, Search, CheckCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import Breadcrumbs from "@/components/Breadcrumbs";
import ExportDropdown from "@/components/ExportDropdown";
import EmptyState from "@/components/EmptyState";

interface Hub {
  id: number; nome: string; rota: string; destino: string;
  tipo: "Principal" | "Jogo" | "Campanha" | "Influencer" | "Temporário";
  status: "Ativo" | "Inativo";
  ultimaAlteracao: string;
}

const tipoBadge: Record<Hub["tipo"], string> = {
  Principal: "badge-accent", Jogo: "badge-info", Campanha: "badge-primary",
  Influencer: "badge-success", Temporário: "badge-warning",
};

export default function HubsRotas() {
  const navigate = useNavigate();
  const [data, setData] = useState<Hub[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<Hub> | null>(null);
  const [search, setSearch] = useState("");
  const [filterTipo, setFilterTipo] = useState("Todos");

  const filtered = data.filter(h => {
    if (search && !h.nome.toLowerCase().includes(search.toLowerCase()) && !h.rota.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterTipo !== "Todos" && h.tipo !== filterTipo) return false;
    return true;
  });

  const openCreate = () => {
    setEditing({ id: 0, nome: "", rota: "", destino: "", tipo: "Jogo", status: "Ativo", ultimaAlteracao: new Date().toLocaleDateString("pt-BR") });
    setModalOpen(true);
  };

  const handleSave = () => {
    if (!editing?.nome || !editing?.rota) { toast({ title: "Erro", description: "Nome e rota são obrigatórios.", variant: "destructive" }); return; }
    if (editing.id && editing.id > 0) {
      setData(prev => prev.map(h => h.id === editing.id ? { ...h, ...editing } as Hub : h));
      toast({ title: "Hub atualizado" });
    } else {
      const newId = Math.max(...data.map(h => h.id), 0) + 1;
      setData(prev => [...prev, { ...editing, id: newId } as Hub]);
      toast({ title: "Hub criado" });
    }
    setModalOpen(false);
  };

  const toggleStatus = (h: Hub) => {
    setData(prev => prev.map(item => item.id === h.id ? { ...item, status: item.status === "Ativo" ? "Inativo" as const : "Ativo" as const } : item));
    toast({ title: h.status === "Ativo" ? "Hub desativado" : "Hub ativado" });
  };

  const copyRota = (h: Hub) => {
    navigator.clipboard.writeText(`https://playbet.com${h.rota}`);
    toast({ title: "URL copiada!", description: `https://playbet.com${h.rota}` });
  };

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: "Gestão de Ativos", path: "/hubs" }, { label: "Hubs / Rotas" }]} />
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div><h1 className="page-header">Hubs / Rotas</h1><p className="page-subtitle">Gestão de páginas-hub, rotas de redirecionamento e distribuição de tráfego</p></div>
        <div className="flex gap-2">
          {data.length > 0 && <ExportDropdown data={data.map(h => ({ ...h }))} filename="hubs-rotas-playbet" />}
          <button className="btn-primary" onClick={openCreate}><Plus size={14} /> Adicionar Hub</button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <button className="btn-ghost text-xs" onClick={() => navigate("/link-engine")}>→ Engine de Links</button>
        <button className="btn-ghost text-xs" onClick={() => navigate("/landing-pages")}>→ Landing Pages</button>
        <button className="btn-ghost text-xs" onClick={() => navigate("/lp-templates")}>→ Templates</button>
      </div>

      {data.length === 0 ? (
        <div className="glass-card">
          <EmptyState
            icon={GitBranch}
            title="Nenhum hub cadastrado"
            description="Crie hubs para organizar rotas de redirecionamento e distribuição de tráfego entre landing pages."
            actionLabel="Adicionar Hub"
            onAction={openCreate}
          />
        </div>
      ) : (
        <>
          <div className="flex flex-wrap gap-3 items-center">
            <div className="flex items-center gap-2 bg-secondary/50 border border-border rounded-lg px-3 py-1.5 flex-1 max-w-xs">
              <Search size={13} className="text-muted-foreground shrink-0" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar hub..." className="bg-transparent text-xs text-foreground placeholder:text-muted-foreground focus:outline-none w-full" />
            </div>
            <select className="select-field" value={filterTipo} onChange={e => setFilterTipo(e.target.value)}>
              <option>Todos</option><option>Principal</option><option>Jogo</option><option>Campanha</option><option>Influencer</option><option>Temporário</option>
            </select>
          </div>

          <div className="glass-card overflow-x-auto invisible-scroll">
            <table className="data-table">
              <thead><tr><th>Nome</th><th>Rota</th><th>Destino</th><th>Tipo</th><th>Status</th><th>Ações</th></tr></thead>
              <tbody>
                {filtered.map((h) => (
                  <tr key={h.id}>
                    <td className="font-medium">{h.nome}</td>
                    <td className="font-mono text-xs text-accent">{h.rota}</td>
                    <td className="text-xs">{h.destino}</td>
                    <td><span className={tipoBadge[h.tipo]}>{h.tipo}</span></td>
                    <td><span className={h.status === "Ativo" ? "badge-success" : "badge-danger"}>{h.status}</span></td>
                    <td>
                      <div className="flex gap-0.5">
                        <button onClick={() => copyRota(h)} className="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"><Copy size={12} /></button>
                        <button onClick={() => { setEditing({ ...h }); setModalOpen(true); }} className="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"><Edit size={12} /></button>
                        <button onClick={() => toggleStatus(h)} className="p-1 rounded hover:bg-secondary text-muted-foreground transition-colors">
                          {h.status === "Ativo" ? <XCircle size={12} /> : <CheckCircle size={12} />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editing?.id ? "Editar Hub" : "Adicionar Hub"}</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div><label className="text-xs font-medium text-muted-foreground">Nome *</label><input className="input-field mt-1" value={editing?.nome || ""} onChange={e => setEditing(p => ({ ...p, nome: e.target.value }))} /></div>
            <div><label className="text-xs font-medium text-muted-foreground">Rota *</label><input className="input-field mt-1" value={editing?.rota || ""} onChange={e => setEditing(p => ({ ...p, rota: e.target.value }))} placeholder="/minha-rota" /></div>
            <div><label className="text-xs font-medium text-muted-foreground">Destino</label><input className="input-field mt-1" value={editing?.destino || ""} onChange={e => setEditing(p => ({ ...p, destino: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-xs font-medium text-muted-foreground">Tipo</label>
                <select className="select-field mt-1 w-full" value={editing?.tipo || "Jogo"} onChange={e => setEditing(p => ({ ...p, tipo: e.target.value as Hub["tipo"] }))}>
                  <option>Principal</option><option>Jogo</option><option>Campanha</option><option>Influencer</option><option>Temporário</option>
                </select>
              </div>
              <div><label className="text-xs font-medium text-muted-foreground">Status</label>
                <select className="select-field mt-1 w-full" value={editing?.status || "Ativo"} onChange={e => setEditing(p => ({ ...p, status: e.target.value as "Ativo" | "Inativo" }))}>
                  <option>Ativo</option><option>Inativo</option>
                </select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <button className="btn-ghost" onClick={() => setModalOpen(false)}>Cancelar</button>
            <button className="btn-primary" onClick={handleSave}>Salvar</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
