import { useState } from "react";
import { Plus, Edit, Copy } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { initialLandingPages } from "@/data/mockData";
import type { LandingPage } from "@/types";
import { toast } from "@/hooks/use-toast";
import Breadcrumbs from "@/components/Breadcrumbs";
import ExportDropdown from "@/components/ExportDropdown";

export default function LandingPagesPage() {
  const navigate = useNavigate();
  const [data, setData] = useState<LandingPage[]>(initialLandingPages);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<LandingPage> | null>(null);

  const openCreate = () => { setEditing({ id: 0, nome: "", rota: "", tipo: "Jogo", jogo: "", plats: "", cliques: 0, ctr: "0%", saida: "0%", status: "Ativo" }); setModalOpen(true); };
  const openEdit = (p: LandingPage) => { setEditing({ ...p }); setModalOpen(true); };

  const handleSave = () => {
    if (!editing?.nome) { toast({ title: "Erro", description: "Nome é obrigatório.", variant: "destructive" }); return; }
    if (editing.id && editing.id > 0) {
      setData(prev => prev.map(p => p.id === editing.id ? { ...p, ...editing } as LandingPage : p));
      toast({ title: "Landing Page atualizada" });
    } else {
      const newId = Math.max(...data.map(p => p.id), 0) + 1;
      setData(prev => [...prev, { ...editing, id: newId } as LandingPage]);
      toast({ title: "Landing Page criada" });
    }
    setModalOpen(false);
  };

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: "Gestão de Ativos", path: "/landing-pages" }, { label: "Landing Pages" }]} />
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div><h1 className="page-header">Landing Pages</h1><p className="page-subtitle">Gestão de páginas de conversão e performance</p></div>
        <div className="flex gap-2">
          <ExportDropdown data={data.map(({ id, nome, rota, tipo, jogo, plats, cliques, ctr, saida, status }) => ({ id, nome, rota, tipo, jogo, plats, cliques, ctr, saida, status }))} filename="landing-pages-playbet" />
          <button className="btn-primary" onClick={openCreate}><Plus size={14} /> Adicionar LP</button>
        </div>
      </div>

      {/* Atalhos rápidos */}
      <div className="flex flex-wrap gap-2">
        <button className="btn-ghost text-xs" onClick={() => navigate("/lp-templates")}>→ Templates de LP</button>
        <button className="btn-ghost text-xs" onClick={() => navigate("/link-engine")}>→ Engine de Links</button>
        <button className="btn-ghost text-xs" onClick={() => navigate("/analytics")}>→ Analytics</button>
      </div>
      <div className="glass-card overflow-x-auto">
        <table className="data-table">
          <thead><tr><th>Nome</th><th>Rota</th><th>Tipo</th><th>Jogo</th><th>Plataformas</th><th>Cliques</th><th>CTR</th><th>Taxa Saída</th><th>Status</th><th>Ações</th></tr></thead>
          <tbody>
            {data.map(p => (
              <tr key={p.id}>
                <td className="font-medium">{p.nome}</td>
                <td className="font-mono text-xs text-accent">{p.rota}</td>
                <td><span className="badge-neutral">{p.tipo}</span></td>
                <td>{p.jogo}</td>
                <td className="text-xs">{p.plats}</td>
                <td>{p.cliques.toLocaleString()}</td>
                <td className="font-medium text-accent">{p.ctr}</td>
                <td className={parseFloat(p.saida) > 40 ? "text-destructive" : "text-success"}>{p.saida}</td>
                <td><span className={p.status === "Ativo" ? "badge-success" : "badge-warning"}>{p.status}</span></td>
                <td>
                  <div className="flex gap-1">
                    <button onClick={() => openEdit(p)} className="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"><Edit size={12} /></button>
                    <button onClick={() => { navigator.clipboard.writeText(`https://playbet.com${p.rota}`); toast({ title: "URL copiada!" }); }} className="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"><Copy size={12} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editing?.id ? "Editar Landing Page" : "Adicionar Landing Page"}</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div><label className="text-xs font-medium text-muted-foreground">Nome *</label><input className="input-field mt-1" value={editing?.nome || ""} onChange={e => setEditing(p => ({ ...p, nome: e.target.value }))} /></div>
            <div><label className="text-xs font-medium text-muted-foreground">Rota</label><input className="input-field mt-1" value={editing?.rota || ""} onChange={e => setEditing(p => ({ ...p, rota: e.target.value }))} placeholder="/minha-landing" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-xs font-medium text-muted-foreground">Tipo</label>
                <select className="select-field mt-1 w-full" value={editing?.tipo || "Jogo"} onChange={e => setEditing(p => ({ ...p, tipo: e.target.value }))}>
                  <option>Jogo</option><option>Promoção</option><option>Geral</option>
                </select>
              </div>
              <div><label className="text-xs font-medium text-muted-foreground">Jogo</label><input className="input-field mt-1" value={editing?.jogo || ""} onChange={e => setEditing(p => ({ ...p, jogo: e.target.value }))} /></div>
            </div>
            <div><label className="text-xs font-medium text-muted-foreground">Plataformas</label><input className="input-field mt-1" value={editing?.plats || ""} onChange={e => setEditing(p => ({ ...p, plats: e.target.value }))} /></div>
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
