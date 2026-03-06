import { useState } from "react";
import { Plus, Edit, XCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { initialJogos } from "@/data/mockData";
import type { Jogo } from "@/types";
import { toast } from "@/hooks/use-toast";
import Breadcrumbs from "@/components/Breadcrumbs";
import ExportDropdown from "@/components/ExportDropdown";

export default function Jogos() {
  const navigate = useNavigate();
  const [data, setData] = useState<Jogo[]>(initialJogos);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<Jogo> | null>(null);

  const openCreate = () => { setEditing({ id: 0, nome: "", cat: "Slot", status: "Ativo", lp: "", plats: "", links: 0, cliques: 0, ctr: "0%", cadastros: 0, receita: 0 }); setModalOpen(true); };
  const openEdit = (j: Jogo) => { setEditing({ ...j }); setModalOpen(true); };

  const handleSave = () => {
    if (!editing?.nome) { toast({ title: "Erro", description: "Nome é obrigatório.", variant: "destructive" }); return; }
    if (editing.id && editing.id > 0) {
      setData(prev => prev.map(j => j.id === editing.id ? { ...j, ...editing } as Jogo : j));
      toast({ title: "Jogo atualizado", description: `${editing.nome} salvo.` });
    } else {
      const newId = Math.max(...data.map(j => j.id), 0) + 1;
      setData(prev => [...prev, { ...editing, id: newId } as Jogo]);
      toast({ title: "Jogo criado", description: `${editing.nome} adicionado.` });
    }
    setModalOpen(false);
  };

  const toggleStatus = (j: Jogo) => {
    setData(prev => prev.map(item => item.id === j.id ? { ...item, status: item.status === "Ativo" ? "Inativo" as const : "Ativo" as const } : item));
    toast({ title: j.status === "Ativo" ? "Jogo desativado" : "Jogo ativado" });
  };

  const exportableData = data.map(({ id, nome, cat, lp, plats, links, cliques, ctr, cadastros, receita, status }) => ({ id, nome, cat, lp, plats, links, cliques, ctr, cadastros, receita, status }));

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: "Gestão de Ativos", path: "/jogos" }, { label: "Jogos" }]} />
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div><h1 className="page-header">Jogos</h1><p className="page-subtitle">Centro de gestão de jogos cadastrados na operação</p></div>
        <div className="flex gap-2">
          <ExportDropdown data={exportableData} filename="jogos-playbet" />
          <button className="btn-primary" onClick={openCreate}><Plus size={14} /> Adicionar Jogo</button>
        </div>
      </div>

      {/* Atalhos rápidos */}
      <div className="flex flex-wrap gap-2">
        <button className="btn-ghost text-xs" onClick={() => navigate("/landing-pages")}>→ Landing Pages</button>
        <button className="btn-ghost text-xs" onClick={() => navigate("/links")}>→ Links Afiliados</button>
        <button className="btn-ghost text-xs" onClick={() => navigate("/analytics")}>→ Analytics</button>
      </div>

      <div className="glass-card overflow-x-auto">
        <table className="data-table">
          <thead><tr><th>Jogo</th><th>Categoria</th><th>LP Vinculada</th><th>Plataformas</th><th>Links</th><th>Cliques</th><th>CTR</th><th>Cadastros</th><th>Receita Est.</th><th>Status</th><th>Ações</th></tr></thead>
          <tbody>
            {data.map((j) => (
              <tr key={j.id}>
                <td className="font-medium">{j.nome}</td>
                <td><span className="badge-neutral">{j.cat}</span></td>
                <td className="text-xs">{j.lp || "—"}</td>
                <td className="text-xs">{j.plats}</td>
                <td>{j.links}</td>
                <td>{j.cliques.toLocaleString()}</td>
                <td className="text-accent font-medium">{j.ctr}</td>
                <td>{j.cadastros.toLocaleString()}</td>
                <td className="font-medium">R$ {j.receita.toLocaleString()}</td>
                <td><span className={j.status === "Ativo" ? "badge-success" : "badge-danger"}>{j.status}</span></td>
                <td>
                  <div className="flex gap-1">
                    <button onClick={() => openEdit(j)} className="p-1.5 rounded-lg hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground" title="Editar"><Edit size={13} /></button>
                    <button onClick={() => toggleStatus(j)} className="p-1.5 rounded-lg hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground" title="Ativar/Desativar"><XCircle size={13} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editing?.id ? "Editar Jogo" : "Adicionar Jogo"}</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div><label className="text-xs font-medium text-muted-foreground">Nome *</label><input className="input-field mt-1" value={editing?.nome || ""} onChange={e => setEditing(p => ({ ...p, nome: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-xs font-medium text-muted-foreground">Categoria</label>
                <select className="select-field mt-1 w-full" value={editing?.cat || "Slot"} onChange={e => setEditing(p => ({ ...p, cat: e.target.value }))}>
                  <option>Slot</option><option>Crash</option><option>Casual</option><option>Card</option><option>Live</option>
                </select>
              </div>
              <div><label className="text-xs font-medium text-muted-foreground">Status</label>
                <select className="select-field mt-1 w-full" value={editing?.status || "Ativo"} onChange={e => setEditing(p => ({ ...p, status: e.target.value as "Ativo"|"Inativo" }))}>
                  <option>Ativo</option><option>Inativo</option>
                </select>
              </div>
            </div>
            <div><label className="text-xs font-medium text-muted-foreground">LP Vinculada</label><input className="input-field mt-1" value={editing?.lp || ""} onChange={e => setEditing(p => ({ ...p, lp: e.target.value }))} /></div>
            <div><label className="text-xs font-medium text-muted-foreground">Plataformas</label><input className="input-field mt-1" value={editing?.plats || ""} onChange={e => setEditing(p => ({ ...p, plats: e.target.value }))} placeholder="Bet365, Betano" /></div>
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
