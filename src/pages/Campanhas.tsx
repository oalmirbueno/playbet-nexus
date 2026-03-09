import { useState } from "react";
import { Plus, Edit, Eye, Copy, Pause, Play, CheckCircle, Search, Target } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import Breadcrumbs from "@/components/Breadcrumbs";
import ExportDropdown from "@/components/ExportDropdown";
import EmptyState from "@/components/EmptyState";
import { useCampanhas } from "@/hooks/useSupabaseQuery";

const TIPOS_CAMPANHA = ["Lançamento de Jogo", "Evergreen", "Relâmpago", "Por Influencer", "Por Plataforma", "Sazonal", "VIP / Grupo"];

export default function Campanhas() {
  const navigate = useNavigate();
  const { data, create, update, isLoading, isCreating } = useCampanhas();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("Todos");

  const filtered = data.filter((c: any) => {
    if (search && !c.nome.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterStatus !== "Todos" && c.status !== filterStatus) return false;
    return true;
  });

  const stats = [
    { label: "Total Campanhas", value: String(data.length), variant: "border-l-2 border-l-primary" },
    { label: "Ativas", value: String(data.filter((c: any) => c.status === "Ativa").length), variant: "border-l-2 border-l-success" },
    { label: "Planejadas", value: String(data.filter((c: any) => c.status === "Planejada").length), variant: "border-l-2 border-l-info" },
    { label: "Finalizadas", value: String(data.filter((c: any) => c.status === "Finalizada").length), variant: "border-l-2 border-l-muted-foreground" },
  ];

  const openCreate = () => {
    setEditing({ nome: "", objetivo: "", jogo: "", plataforma: "", influencer: "", inicio: "", fim: "", status: "Planejada", resultado: "" });
    setModalOpen(true);
  };
  const openEdit = (c: any) => { setEditing({ ...c }); setModalOpen(true); };

  const handleSave = async () => {
    if (!editing?.nome) { toast({ title: "Erro", description: "Nome é obrigatório.", variant: "destructive" }); return; }
    try {
      if (editing.id) {
        await update({ id: editing.id, updates: { nome: editing.nome, objetivo: editing.objetivo, jogo: editing.jogo, plataforma: editing.plataforma, influencer: editing.influencer, inicio: editing.inicio || null, fim: editing.fim || null, status: editing.status, resultado: editing.resultado } });
      } else {
        await create({ nome: editing.nome, objetivo: editing.objetivo, jogo: editing.jogo, plataforma: editing.plataforma, influencer: editing.influencer, inicio: editing.inicio || null, fim: editing.fim || null, status: editing.status || "Planejada" });
      }
      setModalOpen(false);
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    }
  };

  const setStatus = async (c: any, status: string) => {
    try {
      await update({ id: c.id, updates: { status } });
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    }
  };

  const duplicar = async (c: any) => {
    try {
      await create({ nome: `${c.nome} (cópia)`, objetivo: c.objetivo, jogo: c.jogo, plataforma: c.plataforma, influencer: c.influencer, inicio: c.inicio, fim: c.fim, status: "Planejada" });
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    }
  };

  if (isLoading) return <div className="p-8 text-sm text-muted-foreground">Carregando campanhas...</div>;

  return (
    <div className="space-y-8">
      <Breadcrumbs items={[{ label: "Marketing e Conteúdo", path: "/conteudo" }, { label: "Campanhas" }]} />

      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Campanhas</h1>
          <p className="text-sm text-muted-foreground mt-1">Centro de operação de campanhas de afiliados, performance e distribuição</p>
        </div>
        <div className="flex gap-2 flex-wrap items-center">
          {data.length > 0 && <ExportDropdown data={data.map((c: any) => ({ id: c.id, nome: c.nome, objetivo: c.objetivo, jogo: c.jogo, plataforma: c.plataforma, influencer: c.influencer, status: c.status }))} filename="campanhas-playbet" />}
          <button className="btn-primary" onClick={openCreate}><Plus size={15} /> Criar Campanha</button>
        </div>
      </div>

      {data.length === 0 ? (
        <div className="glass-card">
          <EmptyState
            icon={Target}
            title="Nenhuma campanha cadastrada"
            description="Crie sua primeira campanha para organizar a operação de afiliados por jogo, plataforma e influencer."
            actionLabel="Criar Campanha"
            onAction={openCreate}
          />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {stats.map(s => (
              <div key={s.label} className={`glass-card p-5 ${s.variant}`}>
                <span className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide">{s.label}</span>
                <p className="text-2xl font-semibold mt-1">{s.value}</p>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap gap-3 items-center">
            <div className="flex items-center gap-2.5 bg-secondary/40 border border-border rounded-lg px-4 py-2 flex-1 max-w-sm">
              <Search size={14} className="text-muted-foreground shrink-0" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar campanha..." className="bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none w-full" />
            </div>
            <select className="select-field text-sm" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
              <option>Todos</option><option>Ativa</option><option>Planejada</option><option>Finalizada</option>
            </select>
          </div>

          <div className="glass-card overflow-x-auto invisible-scroll rounded-lg">
            <table className="data-table">
              <thead><tr><th>Nome</th><th>Objetivo</th><th>Jogo</th><th>Plataforma</th><th>Influencer</th><th>Período</th><th>Status</th><th>Ações</th></tr></thead>
              <tbody>
                {filtered.map((c: any) => (
                  <tr key={c.id}>
                    <td><span className="font-medium cursor-pointer hover:text-primary transition-colors" onClick={() => navigate(`/campanhas/${c.id}`)}>{c.nome}</span></td>
                    <td className="text-sm max-w-[200px] truncate text-muted-foreground">{c.objetivo}</td>
                    <td className="text-sm">{c.jogo}</td>
                    <td className="text-sm">{c.plataforma}</td>
                    <td className="text-sm">{c.influencer}</td>
                    <td className="text-sm whitespace-nowrap text-muted-foreground">{c.inicio} - {c.fim}</td>
                    <td><span className={c.status === "Ativa" ? "badge-success" : c.status === "Planejada" ? "badge-info" : "badge-neutral"}>{c.status}</span></td>
                    <td>
                      <div className="flex gap-0.5" onClick={e => e.stopPropagation()}>
                        <button onClick={() => navigate(`/campanhas/${c.id}`)} className="p-1.5 rounded-md hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"><Eye size={14} /></button>
                        <button onClick={() => openEdit(c)} className="p-1.5 rounded-md hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"><Edit size={14} /></button>
                        <button onClick={() => duplicar(c)} className="p-1.5 rounded-md hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"><Copy size={14} /></button>
                        {c.status === "Planejada" && <button onClick={() => setStatus(c, "Ativa")} className="p-1.5 rounded-md hover:bg-success/10 text-muted-foreground hover:text-success transition-colors"><Play size={14} /></button>}
                        {c.status === "Ativa" && (
                          <>
                            <button onClick={() => setStatus(c, "Planejada")} className="p-1.5 rounded-md hover:bg-warning/10 text-muted-foreground hover:text-warning transition-colors"><Pause size={14} /></button>
                            <button onClick={() => setStatus(c, "Finalizada")} className="p-1.5 rounded-md hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors"><CheckCircle size={14} /></button>
                          </>
                        )}
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
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle className="text-lg font-semibold">{editing?.id ? "Editar Campanha" : "Criar Campanha"}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-3">
            <div><label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Nome *</label><input className="input-field mt-1.5" value={editing?.nome || ""} onChange={e => setEditing((p: any) => ({ ...p, nome: e.target.value }))} /></div>
            <div><label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Objetivo</label><input className="input-field mt-1.5" value={editing?.objetivo || ""} onChange={e => setEditing((p: any) => ({ ...p, objetivo: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Status</label>
                <select className="select-field mt-1.5 w-full" value={editing?.status || "Planejada"} onChange={e => setEditing((p: any) => ({ ...p, status: e.target.value }))}>
                  <option>Planejada</option><option>Ativa</option><option>Finalizada</option>
                </select>
              </div>
              <div><label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Jogo</label><input className="input-field mt-1.5" value={editing?.jogo || ""} onChange={e => setEditing((p: any) => ({ ...p, jogo: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Plataforma</label><input className="input-field mt-1.5" value={editing?.plataforma || ""} onChange={e => setEditing((p: any) => ({ ...p, plataforma: e.target.value }))} /></div>
              <div><label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Influencer</label><input className="input-field mt-1.5" value={editing?.influencer || ""} onChange={e => setEditing((p: any) => ({ ...p, influencer: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Início</label><input type="date" className="input-field mt-1.5" value={editing?.inicio || ""} onChange={e => setEditing((p: any) => ({ ...p, inicio: e.target.value }))} /></div>
              <div><label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Fim</label><input type="date" className="input-field mt-1.5" value={editing?.fim || ""} onChange={e => setEditing((p: any) => ({ ...p, fim: e.target.value }))} /></div>
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
