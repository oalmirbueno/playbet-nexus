import { useState } from "react";
import { Plus, Edit, XCircle, GitBranch } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";

interface Hub {
  id: number;
  nome: string;
  rota: string;
  destino: string;
  tipo: string;
  status: "Ativo" | "Inativo";
  links: number;
  cliques: number;
}

const initialHubs: Hub[] = [
  { id: 1, nome: "Hub Principal", rota: "/", destino: "Página inicial PlayBet", tipo: "Principal", status: "Ativo", links: 8, cliques: 24500 },
  { id: 2, nome: "Hub Jogar", rota: "/jogar", destino: "Seleção de jogos", tipo: "Navegação", status: "Ativo", links: 12, cliques: 18200 },
  { id: 3, nome: "Hub Influencer", rota: "/convite/:slug", destino: "Página personalizada influencer", tipo: "Dinâmico", status: "Ativo", links: 5, cliques: 9800 },
  { id: 4, nome: "Hub Campanha Março", rota: "/marco-turbo", destino: "LP campanha especial", tipo: "Campanha", status: "Ativo", links: 4, cliques: 6500 },
  { id: 5, nome: "Hub VIP", rota: "/vip", destino: "Acesso VIP exclusivo", tipo: "Especial", status: "Inativo", links: 2, cliques: 1200 },
];

export default function HubsRotas() {
  const [data, setData] = useState<Hub[]>(initialHubs);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<Hub> | null>(null);

  const openCreate = () => {
    setEditing({ id: 0, nome: "", rota: "", destino: "", tipo: "Navegação", status: "Ativo", links: 0, cliques: 0 });
    setModalOpen(true);
  };
  const openEdit = (h: Hub) => { setEditing({ ...h }); setModalOpen(true); };

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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div><h1 className="page-header">Hubs / Rotas</h1><p className="page-subtitle">Gestão de páginas-hub e rotas de redirecionamento</p></div>
        <button className="btn-primary" onClick={openCreate}><Plus size={14} /> Adicionar Hub</button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="stat-card border-l-2 border-l-primary"><span className="text-[10px] text-muted-foreground uppercase">Total Hubs</span><p className="text-xl font-bold">{data.length}</p></div>
        <div className="stat-card border-l-2 border-l-success"><span className="text-[10px] text-muted-foreground uppercase">Ativos</span><p className="text-xl font-bold">{data.filter(h => h.status === "Ativo").length}</p></div>
        <div className="stat-card border-l-2 border-l-accent"><span className="text-[10px] text-muted-foreground uppercase">Cliques Totais</span><p className="text-xl font-bold">{data.reduce((a, h) => a + h.cliques, 0).toLocaleString()}</p></div>
        <div className="stat-card border-l-2 border-l-info"><span className="text-[10px] text-muted-foreground uppercase">Links Vinculados</span><p className="text-xl font-bold">{data.reduce((a, h) => a + h.links, 0)}</p></div>
      </div>

      <div className="glass-card overflow-x-auto">
        {data.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <GitBranch size={40} className="mb-3 opacity-30" />
            <p className="text-sm font-medium">Nenhum hub cadastrado</p>
          </div>
        ) : (
          <table className="data-table">
            <thead><tr><th>Nome</th><th>Rota</th><th>Destino</th><th>Tipo</th><th>Links</th><th>Cliques</th><th>Status</th><th>Ações</th></tr></thead>
            <tbody>
              {data.map((h) => (
                <tr key={h.id}>
                  <td className="font-medium">{h.nome}</td>
                  <td className="font-mono text-xs text-accent">{h.rota}</td>
                  <td className="text-xs">{h.destino}</td>
                  <td><span className="badge-neutral">{h.tipo}</span></td>
                  <td>{h.links}</td>
                  <td>{h.cliques.toLocaleString()}</td>
                  <td><span className={h.status === "Ativo" ? "badge-success" : "badge-danger"}>{h.status}</span></td>
                  <td>
                    <div className="flex gap-1">
                      <button onClick={() => openEdit(h)} className="p-1.5 rounded-lg hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground" title="Editar"><Edit size={13} /></button>
                      <button onClick={() => toggleStatus(h)} className="p-1.5 rounded-lg hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground" title="Ativar/Desativar"><XCircle size={13} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editing?.id ? "Editar Hub" : "Adicionar Hub"}</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div><label className="text-xs font-medium text-muted-foreground">Nome *</label><input className="input-field mt-1" value={editing?.nome || ""} onChange={e => setEditing(p => ({ ...p, nome: e.target.value }))} /></div>
            <div><label className="text-xs font-medium text-muted-foreground">Rota *</label><input className="input-field mt-1" value={editing?.rota || ""} onChange={e => setEditing(p => ({ ...p, rota: e.target.value }))} placeholder="/minha-rota" /></div>
            <div><label className="text-xs font-medium text-muted-foreground">Destino</label><input className="input-field mt-1" value={editing?.destino || ""} onChange={e => setEditing(p => ({ ...p, destino: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-xs font-medium text-muted-foreground">Tipo</label>
                <select className="select-field mt-1 w-full" value={editing?.tipo || "Navegação"} onChange={e => setEditing(p => ({ ...p, tipo: e.target.value }))}>
                  <option>Principal</option><option>Navegação</option><option>Dinâmico</option><option>Campanha</option><option>Especial</option>
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
