import { useState } from "react";
import { Plus, Edit } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { initialCampanhas } from "@/data/mockData";
import type { Campanha } from "@/types";
import { toast } from "@/hooks/use-toast";

export default function Campanhas() {
  const [data, setData] = useState<Campanha[]>(initialCampanhas);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<Campanha> | null>(null);

  const openCreate = () => { setEditing({ id: 0, nome: "", objetivo: "", jogo: "", plat: "", influencer: "", inicio: "", fim: "", status: "Planejada", resultado: "—" }); setModalOpen(true); };
  const openEdit = (c: Campanha) => { setEditing({ ...c }); setModalOpen(true); };

  const handleSave = () => {
    if (!editing?.nome) { toast({ title: "Erro", description: "Nome é obrigatório.", variant: "destructive" }); return; }
    if (editing.id && editing.id > 0) {
      setData(prev => prev.map(c => c.id === editing.id ? { ...c, ...editing } as Campanha : c));
      toast({ title: "Campanha atualizada" });
    } else {
      const newId = Math.max(...data.map(c => c.id), 0) + 1;
      setData(prev => [...prev, { ...editing, id: newId } as Campanha]);
      toast({ title: "Campanha criada" });
    }
    setModalOpen(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div><h1 className="page-header">Campanhas</h1><p className="page-subtitle">Gestão de campanhas de marketing e performance</p></div>
        <button className="btn-primary" onClick={openCreate}><Plus size={14} /> Criar Campanha</button>
      </div>
      <div className="glass-card overflow-x-auto">
        <table className="data-table">
          <thead><tr><th>Nome</th><th>Objetivo</th><th>Jogo</th><th>Plataforma</th><th>Influencer</th><th>Início</th><th>Fim</th><th>Status</th><th>Resultado</th><th>Ações</th></tr></thead>
          <tbody>
            {data.map(c => (
              <tr key={c.id}>
                <td className="font-medium">{c.nome}</td>
                <td className="text-xs max-w-[200px]">{c.objetivo}</td>
                <td>{c.jogo}</td>
                <td>{c.plat}</td>
                <td>{c.influencer}</td>
                <td className="text-xs">{c.inicio}</td>
                <td className="text-xs">{c.fim}</td>
                <td><span className={c.status === "Ativa" ? "badge-success" : c.status === "Planejada" ? "badge-info" : "badge-neutral"}>{c.status}</span></td>
                <td className="text-xs font-medium">{c.resultado}</td>
                <td><button onClick={() => openEdit(c)} className="p-1.5 rounded-lg hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground"><Edit size={13} /></button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editing?.id ? "Editar Campanha" : "Criar Campanha"}</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div><label className="text-xs font-medium text-muted-foreground">Nome *</label><input className="input-field mt-1" value={editing?.nome || ""} onChange={e => setEditing(p => ({ ...p, nome: e.target.value }))} /></div>
            <div><label className="text-xs font-medium text-muted-foreground">Objetivo</label><input className="input-field mt-1" value={editing?.objetivo || ""} onChange={e => setEditing(p => ({ ...p, objetivo: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-xs font-medium text-muted-foreground">Jogo</label><input className="input-field mt-1" value={editing?.jogo || ""} onChange={e => setEditing(p => ({ ...p, jogo: e.target.value }))} /></div>
              <div><label className="text-xs font-medium text-muted-foreground">Plataforma</label><input className="input-field mt-1" value={editing?.plat || ""} onChange={e => setEditing(p => ({ ...p, plat: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div><label className="text-xs font-medium text-muted-foreground">Influencer</label><input className="input-field mt-1" value={editing?.influencer || ""} onChange={e => setEditing(p => ({ ...p, influencer: e.target.value }))} /></div>
              <div><label className="text-xs font-medium text-muted-foreground">Início</label><input className="input-field mt-1" value={editing?.inicio || ""} onChange={e => setEditing(p => ({ ...p, inicio: e.target.value }))} /></div>
              <div><label className="text-xs font-medium text-muted-foreground">Fim</label><input className="input-field mt-1" value={editing?.fim || ""} onChange={e => setEditing(p => ({ ...p, fim: e.target.value }))} /></div>
            </div>
            <div><label className="text-xs font-medium text-muted-foreground">Status</label>
              <select className="select-field mt-1 w-full" value={editing?.status || "Planejada"} onChange={e => setEditing(p => ({ ...p, status: e.target.value as Campanha["status"] }))}>
                <option>Planejada</option><option>Ativa</option><option>Finalizada</option>
              </select>
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
