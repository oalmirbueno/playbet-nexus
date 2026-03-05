import { useState } from "react";
import { Plus } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { initialConteudos } from "@/data/mockData";
import type { ConteudoItem } from "@/types";
import { toast } from "@/hooks/use-toast";

const statusCols: ConteudoItem["status"][] = ["Ideia", "Roteiro", "Produção", "Revisão", "Agendado", "Publicado"];
const colColors: Record<string, string> = {
  Ideia: "border-t-muted-foreground", Roteiro: "border-t-accent", Produção: "border-t-info",
  Revisão: "border-t-warning", Agendado: "border-t-primary", Publicado: "border-t-success",
};

export default function Conteudo() {
  const [data, setData] = useState<ConteudoItem[]>(initialConteudos);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<ConteudoItem> | null>(null);

  const openCreate = (status: ConteudoItem["status"] = "Ideia") => {
    setEditing({ id: 0, tema: "", tipo: "Reels", jogo: "", influencer: "", campanha: "", status, data: "" });
    setModalOpen(true);
  };

  const handleSave = () => {
    if (!editing?.tema) { toast({ title: "Erro", description: "Tema é obrigatório.", variant: "destructive" }); return; }
    if (editing.id && editing.id > 0) {
      setData(prev => prev.map(c => c.id === editing.id ? { ...c, ...editing } as ConteudoItem : c));
      toast({ title: "Conteúdo atualizado" });
    } else {
      const newId = Math.max(...data.map(c => c.id), 0) + 1;
      setData(prev => [...prev, { ...editing, id: newId } as ConteudoItem]);
      toast({ title: "Conteúdo criado" });
    }
    setModalOpen(false);
  };

  const moveItem = (item: ConteudoItem, direction: "next" | "prev") => {
    const idx = statusCols.indexOf(item.status);
    const newIdx = direction === "next" ? Math.min(idx + 1, statusCols.length - 1) : Math.max(idx - 1, 0);
    if (idx === newIdx) return;
    setData(prev => prev.map(c => c.id === item.id ? { ...c, status: statusCols[newIdx] } : c));
    toast({ title: `Movido para ${statusCols[newIdx]}` });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div><h1 className="page-header">Conteúdos</h1><p className="page-subtitle">Central editorial — quadro kanban de produção de conteúdo</p></div>
        <button className="btn-primary" onClick={() => openCreate()}><Plus size={14} /> Criar Conteúdo</button>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-4">
        {statusCols.map(col => {
          const items = data.filter(c => c.status === col);
          return (
            <div key={col} className={`kanban-col border-t-2 ${colColors[col]} min-w-[240px]`}>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold uppercase tracking-wider">{col}</span>
                <div className="flex items-center gap-1">
                  <span className="text-[10px] text-muted-foreground bg-secondary px-1.5 py-0.5 rounded">{items.length}</span>
                  <button onClick={() => openCreate(col)} className="p-0.5 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"><Plus size={12} /></button>
                </div>
              </div>
              <div className="space-y-2">
                {items.map(item => (
                  <div key={item.id} className="kanban-item group">
                    <p className="text-xs font-medium mb-1">{item.tema}</p>
                    <div className="flex flex-wrap gap-1">
                      <span className="badge-neutral">{item.tipo}</span>
                      <span className="badge-accent">{item.jogo}</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-1">{item.influencer}</p>
                    <div className="flex gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => moveItem(item, "prev")} className="text-[10px] px-1.5 py-0.5 rounded bg-secondary hover:bg-secondary/80 text-muted-foreground">← Voltar</button>
                      <button onClick={() => moveItem(item, "next")} className="text-[10px] px-1.5 py-0.5 rounded bg-secondary hover:bg-secondary/80 text-muted-foreground">Avançar →</button>
                      <button onClick={() => { setEditing({ ...item }); setModalOpen(true); }} className="text-[10px] px-1.5 py-0.5 rounded bg-secondary hover:bg-secondary/80 text-muted-foreground">Editar</button>
                    </div>
                  </div>
                ))}
                {items.length === 0 && <p className="text-xs text-muted-foreground text-center py-4">Vazio</p>}
              </div>
            </div>
          );
        })}
      </div>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editing?.id ? "Editar Conteúdo" : "Criar Conteúdo"}</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div><label className="text-xs font-medium text-muted-foreground">Tema *</label><input className="input-field mt-1" value={editing?.tema || ""} onChange={e => setEditing(p => ({ ...p, tema: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-xs font-medium text-muted-foreground">Tipo</label>
                <select className="select-field mt-1 w-full" value={editing?.tipo || "Reels"} onChange={e => setEditing(p => ({ ...p, tipo: e.target.value }))}>
                  <option>Reels</option><option>Story</option><option>Post WA</option><option>Post Telegram</option><option>Vídeo</option>
                </select>
              </div>
              <div><label className="text-xs font-medium text-muted-foreground">Jogo</label><input className="input-field mt-1" value={editing?.jogo || ""} onChange={e => setEditing(p => ({ ...p, jogo: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-xs font-medium text-muted-foreground">Influencer</label><input className="input-field mt-1" value={editing?.influencer || ""} onChange={e => setEditing(p => ({ ...p, influencer: e.target.value }))} /></div>
              <div><label className="text-xs font-medium text-muted-foreground">Data</label><input className="input-field mt-1" value={editing?.data || ""} onChange={e => setEditing(p => ({ ...p, data: e.target.value }))} /></div>
            </div>
            <div><label className="text-xs font-medium text-muted-foreground">Campanha</label><input className="input-field mt-1" value={editing?.campanha || ""} onChange={e => setEditing(p => ({ ...p, campanha: e.target.value }))} /></div>
            <div><label className="text-xs font-medium text-muted-foreground">Status</label>
              <select className="select-field mt-1 w-full" value={editing?.status || "Ideia"} onChange={e => setEditing(p => ({ ...p, status: e.target.value as ConteudoItem["status"] }))}>
                {statusCols.map(s => <option key={s}>{s}</option>)}
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
