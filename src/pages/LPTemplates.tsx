import { useState } from "react";
import { Plus, Edit, XCircle, Users } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { initialLPTemplates } from "@/data/mockData";
import type { LPTemplate } from "@/types";
import { toast } from "@/hooks/use-toast";

export default function LPTemplates() {
  const [data, setData] = useState<LPTemplate[]>(initialLPTemplates);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<LPTemplate> | null>(null);

  const openCreate = () => { setEditing({ id: 0, nome: "", rotaBase: "", tipo: "Jogo", jogoVinculado: "", status: "Ativo", cliquesTotais: 0, conversoesEstimadas: 0 }); setModalOpen(true); };
  const openEdit = (t: LPTemplate) => { setEditing({ ...t }); setModalOpen(true); };

  const handleSave = () => {
    if (!editing?.nome) { toast({ title: "Erro", description: "Nome é obrigatório.", variant: "destructive" }); return; }
    if (editing.id && editing.id > 0) {
      setData(prev => prev.map(t => t.id === editing.id ? { ...t, ...editing } as LPTemplate : t));
      toast({ title: "Template atualizado" });
    } else {
      const newId = Math.max(...data.map(t => t.id), 0) + 1;
      setData(prev => [...prev, { ...editing, id: newId } as LPTemplate]);
      toast({ title: "Template criado" });
    }
    setModalOpen(false);
  };

  const toggleStatus = (t: LPTemplate) => {
    setData(prev => prev.map(item => item.id === t.id ? { ...item, status: item.status === "Ativo" ? "Inativo" as const : "Ativo" as const } : item));
    toast({ title: t.status === "Ativo" ? "Template desativado" : "Template ativado" });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div><h1 className="page-header">Templates de LP</h1><p className="page-subtitle">Central de templates de landing pages — base para distribuição por influenciador</p></div>
        <button className="btn-primary" onClick={openCreate}><Plus size={14} /> Criar Template</button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="stat-card border-l-2 border-l-primary"><span className="text-[10px] text-muted-foreground uppercase">Total Templates</span><p className="text-xl font-bold">{data.length}</p></div>
        <div className="stat-card border-l-2 border-l-success"><span className="text-[10px] text-muted-foreground uppercase">Ativos</span><p className="text-xl font-bold">{data.filter(t => t.status === "Ativo").length}</p></div>
        <div className="stat-card border-l-2 border-l-accent"><span className="text-[10px] text-muted-foreground uppercase">Cliques Totais</span><p className="text-xl font-bold">{data.reduce((a, t) => a + t.cliquesTotais, 0).toLocaleString()}</p></div>
        <div className="stat-card border-l-2 border-l-info"><span className="text-[10px] text-muted-foreground uppercase">Conversões</span><p className="text-xl font-bold">{data.reduce((a, t) => a + t.conversoesEstimadas, 0).toLocaleString()}</p></div>
      </div>

      <div className="glass-card overflow-x-auto">
        <table className="data-table">
          <thead><tr><th>Nome</th><th>Rota Base</th><th>Tipo</th><th>Jogo Vinculado</th><th>Cliques</th><th>Conversões</th><th>Status</th><th>Ações</th></tr></thead>
          <tbody>
            {data.map(t => (
              <tr key={t.id}>
                <td className="font-medium">{t.nome}</td>
                <td className="font-mono text-xs text-accent">{t.rotaBase}</td>
                <td><span className="badge-neutral">{t.tipo}</span></td>
                <td>{t.jogoVinculado}</td>
                <td>{t.cliquesTotais.toLocaleString()}</td>
                <td className="font-medium">{t.conversoesEstimadas.toLocaleString()}</td>
                <td><span className={t.status === "Ativo" ? "badge-success" : "badge-danger"}>{t.status}</span></td>
                <td>
                  <div className="flex gap-1">
                    <button onClick={() => openEdit(t)} className="p-1.5 rounded-lg hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground"><Edit size={13} /></button>
                    <button onClick={() => toggleStatus(t)} className="p-1.5 rounded-lg hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground"><XCircle size={13} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editing?.id ? "Editar Template" : "Criar Template"}</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div><label className="text-xs font-medium text-muted-foreground">Nome *</label><input className="input-field mt-1" value={editing?.nome || ""} onChange={e => setEditing(p => ({ ...p, nome: e.target.value }))} /></div>
            <div><label className="text-xs font-medium text-muted-foreground">Rota Base</label><input className="input-field mt-1" value={editing?.rotaBase || ""} onChange={e => setEditing(p => ({ ...p, rotaBase: e.target.value }))} placeholder="/meu-template" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-xs font-medium text-muted-foreground">Tipo</label>
                <select className="select-field mt-1 w-full" value={editing?.tipo || "Jogo"} onChange={e => setEditing(p => ({ ...p, tipo: e.target.value }))}>
                  <option>Jogo</option><option>Promoção</option><option>Geral</option>
                </select>
              </div>
              <div><label className="text-xs font-medium text-muted-foreground">Jogo Vinculado</label><input className="input-field mt-1" value={editing?.jogoVinculado || ""} onChange={e => setEditing(p => ({ ...p, jogoVinculado: e.target.value }))} /></div>
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
