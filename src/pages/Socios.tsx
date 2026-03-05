import { useState } from "react";
import { Plus, Edit } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { initialSocios } from "@/data/mockData";
import type { Socio } from "@/types";
import { toast } from "@/hooks/use-toast";
import { ArrowRight } from "lucide-react";

export default function Socios() {
  const navigate = useNavigate();
  const [data, setData] = useState<Socio[]>(initialSocios);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<Socio> | null>(null);

  const openCreate = () => { setEditing({ id: 0, nome: "", part: 0, ganhos: 0, disponivel: 0, ultimoSaque: "—", status: "Ativo" }); setModalOpen(true); };
  const openEdit = (s: Socio) => { setEditing({ ...s }); setModalOpen(true); };

  const handleSave = () => {
    if (!editing?.nome) { toast({ title: "Erro", description: "Nome é obrigatório.", variant: "destructive" }); return; }
    if (editing.id && editing.id > 0) {
      setData(prev => prev.map(s => s.id === editing.id ? { ...s, ...editing } as Socio : s));
      toast({ title: "Sócio atualizado" });
    } else {
      const newId = Math.max(...data.map(s => s.id), 0) + 1;
      setData(prev => [...prev, { ...editing, id: newId } as Socio]);
      toast({ title: "Sócio adicionado" });
    }
    setModalOpen(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div><h1 className="page-header">Sócios</h1><p className="page-subtitle">Gestão societária — participação, ganhos e distribuição</p></div>
        <button className="btn-primary" onClick={openCreate}><Plus size={14} /> Adicionar Sócio</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {data.map(s => (
          <div key={s.id} className="glass-card p-5 hover:border-primary/30 transition-colors">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-sm font-bold text-accent">{s.nome.charAt(0)}</div>
                <div>
                  <p className="font-semibold">{s.nome}</p>
                  <span className="badge-primary">{s.part}% participação</span>
                </div>
              </div>
              <div className="flex gap-1">
                <button onClick={() => openEdit(s)} className="p-1.5 rounded-lg hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground"><Edit size={13} /></button>
                <button onClick={() => navigate(`/socios/${s.id}`)} className="p-1.5 rounded-lg hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground"><ArrowRight size={13} /></button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><p className="text-[10px] text-muted-foreground uppercase">Ganhos Acumulados</p><p className="font-bold">R$ {s.ganhos.toLocaleString()}</p></div>
              <div><p className="text-[10px] text-muted-foreground uppercase">Saldo Disponível</p><p className="font-bold text-success">R$ {s.disponivel.toLocaleString()}</p></div>
              <div><p className="text-[10px] text-muted-foreground uppercase">Último Saque</p><p className="text-xs">{s.ultimoSaque}</p></div>
              <div><p className="text-[10px] text-muted-foreground uppercase">Status</p><span className="badge-success">{s.status}</span></div>
            </div>
          </div>
        ))}
      </div>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editing?.id ? "Editar Sócio" : "Adicionar Sócio"}</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div><label className="text-xs font-medium text-muted-foreground">Nome *</label><input className="input-field mt-1" value={editing?.nome || ""} onChange={e => setEditing(p => ({ ...p, nome: e.target.value }))} /></div>
            <div><label className="text-xs font-medium text-muted-foreground">Participação %</label><input type="number" className="input-field mt-1" value={editing?.part || 0} onChange={e => setEditing(p => ({ ...p, part: Number(e.target.value) }))} /></div>
            <div><label className="text-xs font-medium text-muted-foreground">Status</label>
              <select className="select-field mt-1 w-full" value={editing?.status || "Ativo"} onChange={e => setEditing(p => ({ ...p, status: e.target.value as Socio["status"] }))}>
                <option>Ativo</option><option>Inativo</option>
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
