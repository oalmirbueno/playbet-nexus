import { useState } from "react";
import { Plus, LayoutGrid, Table2, FileText } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import Breadcrumbs from "@/components/Breadcrumbs";
import ExportDropdown from "@/components/ExportDropdown";
import EmptyState from "@/components/EmptyState";
import { useConteudo } from "@/hooks/useSupabaseQuery";

const statusCols = ["Ideia", "Roteiro", "Produção", "Revisão", "Agendado", "Publicado", "Pausado"];
const colColors: Record<string, string> = {
  Ideia: "border-t-muted-foreground", Roteiro: "border-t-accent", Produção: "border-t-info",
  Revisão: "border-t-warning", Agendado: "border-t-primary", Publicado: "border-t-success", Pausado: "border-t-destructive",
};
const tipoOptions = ["Story", "Reels", "Post", "Carrossel", "Live", "Vídeo", "Grupo Telegram", "WhatsApp", "Campanha Teaser", "Prova Social", "Lançamento de Jogo"];
const canalOptions = ["Instagram", "TikTok", "YouTube", "Telegram", "WhatsApp", "Twitter/X", "Bio Link"];
const prioOptions = ["Alta", "Média", "Baixa"];

type ViewMode = "kanban" | "tabela";

export default function Conteudo() {
  const navigate = useNavigate();
  const { data, create, update, isLoading, isCreating } = useConteudo();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [view, setView] = useState<ViewMode>("kanban");

  const openCreate = (status = "Ideia") => {
    setEditing({ tema: "", tipo: "Reels", formato: "Vertical 9:16", canal: "Instagram", jogo: "", influencer: "", campanha: "", lp: "", status, prioridade: "Média", data: "", responsavel: "", cta: "", roteiro: "", objetivo: "", observacoes: "" });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!editing?.tema) { toast({ title: "Erro", description: "Tema é obrigatório.", variant: "destructive" }); return; }
    try {
      if (editing.id) {
        await update({ id: editing.id, updates: { tema: editing.tema, tipo: editing.tipo, canal: editing.canal, jogo: editing.jogo, influencer: editing.influencer, campanha: editing.campanha, status: editing.status, prioridade: editing.prioridade, data: editing.data || null } });
      } else {
        await create({ tema: editing.tema, tipo: editing.tipo, canal: editing.canal, jogo: editing.jogo, influencer: editing.influencer, campanha: editing.campanha, status: editing.status || "Ideia", prioridade: editing.prioridade || "Média", data: editing.data || null });
      }
      setModalOpen(false);
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    }
  };

  const moveItem = async (item: any, direction: "next" | "prev") => {
    const idx = statusCols.indexOf(item.status);
    const newIdx = direction === "next" ? Math.min(idx + 1, statusCols.length - 1) : Math.max(idx - 1, 0);
    if (idx === newIdx) return;
    try {
      await update({ id: item.id, updates: { status: statusCols[newIdx] } });
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    }
  };

  if (isLoading) return <div className="p-8 text-sm text-muted-foreground">Carregando conteúdos...</div>;

  return (
    <div className="space-y-8">
      <Breadcrumbs items={[{ label: "Marketing e Conteúdo", path: "/conteudo" }, { label: "Conteúdos" }]} />

      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Conteúdos</h1>
          <p className="text-sm text-muted-foreground mt-1">Central editorial - produção, gestão e execução de marketing</p>
        </div>
        <div className="flex gap-2 items-center">
          {data.length > 0 && <ExportDropdown data={data.map(({ id, tema, tipo, canal, jogo, influencer, status, data: d }: any) => ({ id, tema, tipo, canal, jogo, influencer, status, data: d }))} filename="conteudos-playbet" />}
          <button className="btn-primary" onClick={() => openCreate()}><Plus size={15} /> Criar Conteúdo</button>
        </div>
      </div>

      {data.length === 0 ? (
        <div className="glass-card">
          <EmptyState
            icon={FileText}
            title="Nenhum conteúdo cadastrado"
            description="Crie seu primeiro conteúdo para organizar a produção editorial em kanban, tabela ou calendário."
            actionLabel="Criar Conteúdo"
            onAction={() => openCreate()}
            secondaryLabel="Ver Calendário"
            onSecondary={() => navigate("/calendario")}
          />
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-3">
            <button className="btn-ghost text-sm" onClick={() => navigate("/campanhas")}>Campanhas</button>
            <button className="btn-ghost text-sm" onClick={() => navigate("/calendario")}>Calendário Editorial</button>
            <div className="flex-1" />
            <div className="flex gap-0.5 bg-secondary/60 rounded-lg p-1 border border-border">
              {([["kanban", LayoutGrid, "Kanban"], ["tabela", Table2, "Tabela"]] as [ViewMode, any, string][]).map(([v, Icon, label]) => (
                <button key={v} onClick={() => setView(v)} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${view === v ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>
                  <Icon size={13} />{label}
                </button>
              ))}
            </div>
          </div>

          {view === "kanban" && (
            <div className="flex gap-4 overflow-x-auto invisible-scroll pb-6">
              {statusCols.map(col => {
                const items = data.filter((c: any) => c.status === col);
                return (
                  <div key={col} className={`flex-1 min-w-[280px] glass-card p-0 rounded-lg border-t-2 ${colColors[col]}`}>
                    <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                      <span className="text-xs font-semibold uppercase tracking-wider text-foreground/80">{col}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground bg-secondary px-2 py-0.5 rounded-md">{items.length}</span>
                        <button onClick={() => openCreate(col)} className="p-1 rounded-md hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"><Plus size={14} /></button>
                      </div>
                    </div>
                    <div className="p-3 space-y-2.5 min-h-[200px]">
                      {items.map((item: any) => (
                        <div key={item.id} className="glass-card-elevated p-4 rounded-lg group">
                          <p className="text-sm font-medium mb-2">{item.tema}</p>
                          <div className="flex flex-wrap gap-1.5 mb-2">
                            <span className="badge-neutral">{item.tipo}</span>
                            {item.canal && <span className="text-[11px] text-muted-foreground">{item.canal}</span>}
                          </div>
                          <div className="flex gap-1 mt-3 pt-2 border-t border-border-subtle opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => moveItem(item, "prev")} className="text-[11px] px-2 py-1 rounded-md bg-secondary text-muted-foreground">←</button>
                            <button onClick={() => moveItem(item, "next")} className="text-[11px] px-2 py-1 rounded-md bg-secondary text-muted-foreground">→</button>
                            <button onClick={() => { setEditing({ ...item }); setModalOpen(true); }} className="text-[11px] px-2 py-1 rounded-md bg-secondary text-muted-foreground">Editar</button>
                          </div>
                        </div>
                      ))}
                      {items.length === 0 && <p className="text-sm text-muted-foreground text-center py-10">Nenhum item</p>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {view === "tabela" && (
            <div className="glass-card overflow-x-auto invisible-scroll rounded-lg">
              <table className="data-table">
                <thead><tr><th>Título</th><th>Tipo</th><th>Canal</th><th>Influencer</th><th>Jogo</th><th>Status</th><th>Data</th><th>Ações</th></tr></thead>
                <tbody>
                  {data.map((item: any) => (
                    <tr key={item.id}>
                      <td className="font-medium">{item.tema}</td>
                      <td><span className="badge-neutral">{item.tipo}</span></td>
                      <td className="text-muted-foreground">{item.canal || "-"}</td>
                      <td>{item.influencer}</td>
                      <td className="text-muted-foreground">{item.jogo}</td>
                      <td><span className="badge-neutral">{item.status}</span></td>
                      <td className="text-muted-foreground">{item.data}</td>
                      <td>
                        <button onClick={() => { setEditing({ ...item }); setModalOpen(true); }} className="p-1.5 rounded-md hover:bg-secondary text-muted-foreground">✏️</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editing?.id ? "Editar Conteúdo" : "Criar Conteúdo"}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div><label className="text-xs font-medium text-muted-foreground">Tema *</label><input className="input-field mt-1" value={editing?.tema || ""} onChange={e => setEditing((p: any) => p ? { ...p, tema: e.target.value } : p)} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-xs font-medium text-muted-foreground">Tipo</label>
                <select className="select-field mt-1 w-full" value={editing?.tipo || "Reels"} onChange={e => setEditing((p: any) => p ? { ...p, tipo: e.target.value } : p)}>
                  {tipoOptions.map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div><label className="text-xs font-medium text-muted-foreground">Canal</label>
                <select className="select-field mt-1 w-full" value={editing?.canal || "Instagram"} onChange={e => setEditing((p: any) => p ? { ...p, canal: e.target.value } : p)}>
                  {canalOptions.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-xs font-medium text-muted-foreground">Influencer</label><input className="input-field mt-1" value={editing?.influencer || ""} onChange={e => setEditing((p: any) => p ? { ...p, influencer: e.target.value } : p)} /></div>
              <div><label className="text-xs font-medium text-muted-foreground">Jogo</label><input className="input-field mt-1" value={editing?.jogo || ""} onChange={e => setEditing((p: any) => p ? { ...p, jogo: e.target.value } : p)} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-xs font-medium text-muted-foreground">Data</label><input type="date" className="input-field mt-1" value={editing?.data || ""} onChange={e => setEditing((p: any) => p ? { ...p, data: e.target.value } : p)} /></div>
              <div><label className="text-xs font-medium text-muted-foreground">Prioridade</label>
                <select className="select-field mt-1 w-full" value={editing?.prioridade || "Média"} onChange={e => setEditing((p: any) => p ? { ...p, prioridade: e.target.value } : p)}>
                  {prioOptions.map(p => <option key={p}>{p}</option>)}
                </select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <button className="btn-ghost" onClick={() => setModalOpen(false)}>Cancelar</button>
            <button className="btn-primary" onClick={handleSave} disabled={isCreating}>Salvar</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
