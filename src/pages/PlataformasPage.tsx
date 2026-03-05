import { useState } from "react";
import { Plus, Edit, XCircle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { initialPlataformas } from "@/data/mockData";
import type { Plataforma } from "@/types";
import { toast } from "@/hooks/use-toast";

export default function PlataformasPage() {
  const [data, setData] = useState<Plataforma[]>(initialPlataformas);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<Plataforma> | null>(null);

  const openCreate = () => { setEditing({ id: 0, nome: "", tipo: "Revenue Share", revshare: "", cpa: "—", moeda: "BRL", pagamento: "Mensal", status: "Pendente", links: 0, jogos: 0 }); setModalOpen(true); };
  const openEdit = (p: Plataforma) => { setEditing({ ...p }); setModalOpen(true); };

  const handleSave = () => {
    if (!editing?.nome) { toast({ title: "Erro", description: "Nome é obrigatório.", variant: "destructive" }); return; }
    if (editing.id && editing.id > 0) {
      setData(prev => prev.map(p => p.id === editing.id ? { ...p, ...editing } as Plataforma : p));
      toast({ title: "Plataforma atualizada" });
    } else {
      const newId = Math.max(...data.map(p => p.id), 0) + 1;
      setData(prev => [...prev, { ...editing, id: newId } as Plataforma]);
      toast({ title: "Plataforma criada" });
    }
    setModalOpen(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div><h1 className="page-header">Plataformas</h1><p className="page-subtitle">Gestão de plataformas parceiras e modelos de comissão</p></div>
        <button className="btn-primary" onClick={openCreate}><Plus size={14} /> Adicionar Plataforma</button>
      </div>
      <div className="glass-card overflow-x-auto">
        <table className="data-table">
          <thead><tr><th>Plataforma</th><th>Tipo Comissão</th><th>RevShare</th><th>CPA</th><th>Moeda</th><th>Pagamento</th><th>Links</th><th>Jogos</th><th>Status</th><th>Ações</th></tr></thead>
          <tbody>
            {data.map((p) => (
              <tr key={p.id}>
                <td className="font-medium">{p.nome}</td>
                <td><span className="badge-primary">{p.tipo}</span></td>
                <td>{p.revshare}</td>
                <td>{p.cpa}</td>
                <td>{p.moeda}</td>
                <td>{p.pagamento}</td>
                <td>{p.links}</td>
                <td>{p.jogos}</td>
                <td><span className={p.status === "Ativo" ? "badge-success" : "badge-warning"}>{p.status}</span></td>
                <td>
                  <div className="flex gap-1">
                    <button onClick={() => openEdit(p)} className="p-1.5 rounded-lg hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground"><Edit size={13} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editing?.id ? "Editar Plataforma" : "Adicionar Plataforma"}</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div><label className="text-xs font-medium text-muted-foreground">Nome *</label><input className="input-field mt-1" value={editing?.nome || ""} onChange={e => setEditing(p => ({ ...p, nome: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-xs font-medium text-muted-foreground">Tipo Comissão</label>
                <select className="select-field mt-1 w-full" value={editing?.tipo || ""} onChange={e => setEditing(p => ({ ...p, tipo: e.target.value }))}>
                  <option>Revenue Share</option><option>CPA</option><option>CPA + RevShare</option><option>Hybrid</option>
                </select>
              </div>
              <div><label className="text-xs font-medium text-muted-foreground">Status</label>
                <select className="select-field mt-1 w-full" value={editing?.status || "Pendente"} onChange={e => setEditing(p => ({ ...p, status: e.target.value as Plataforma["status"] }))}>
                  <option>Ativo</option><option>Pendente</option><option>Inativo</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-xs font-medium text-muted-foreground">RevShare</label><input className="input-field mt-1" value={editing?.revshare || ""} onChange={e => setEditing(p => ({ ...p, revshare: e.target.value }))} /></div>
              <div><label className="text-xs font-medium text-muted-foreground">CPA</label><input className="input-field mt-1" value={editing?.cpa || ""} onChange={e => setEditing(p => ({ ...p, cpa: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-xs font-medium text-muted-foreground">Moeda</label><input className="input-field mt-1" value={editing?.moeda || ""} onChange={e => setEditing(p => ({ ...p, moeda: e.target.value }))} /></div>
              <div><label className="text-xs font-medium text-muted-foreground">Pagamento</label>
                <select className="select-field mt-1 w-full" value={editing?.pagamento || "Mensal"} onChange={e => setEditing(p => ({ ...p, pagamento: e.target.value }))}>
                  <option>Semanal</option><option>Quinzenal</option><option>Mensal</option>
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
