import { useState } from "react";
import { Plus, Edit, ArrowRight, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import Breadcrumbs from "@/components/Breadcrumbs";
import ExportDropdown from "@/components/ExportDropdown";
import EmptyState from "@/components/EmptyState";
import { useSocios } from "@/hooks/useSupabaseQuery";

export default function Socios() {
  const navigate = useNavigate();
  const { data, create, update, isLoading, isCreating, isUpdating } = useSocios();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);

  const openCreate = () => {
    setEditing({ nome: "", participacao: 0, status: "Ativo" });
    setModalOpen(true);
  };
  const openEdit = (s: any) => {
    setEditing({ ...s });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!editing?.nome) { toast({ title: "Erro", description: "Nome é obrigatório.", variant: "destructive" }); return; }
    try {
      if (editing.id) {
        await update({ id: editing.id, updates: { nome: editing.nome, participacao: editing.participacao, status: editing.status } });
      } else {
        await create({ nome: editing.nome, participacao: editing.participacao || 0, status: editing.status || "Ativo" });
      }
      setModalOpen(false);
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    }
  };

  if (isLoading) return <div className="p-8 text-sm text-muted-foreground">Carregando sócios...</div>;

  return (
    <div className="space-y-8">
      <Breadcrumbs items={[{ label: "Gestão de Pessoas", path: "/socios" }, { label: "Sócios" }]} />
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Sócios</h1>
          <p className="text-sm text-muted-foreground mt-1">Gestão societária — participação, ganhos e distribuição</p>
        </div>
        <div className="flex gap-2">
          {data.length > 0 && <ExportDropdown data={data.map(({ id, nome, participacao, ganhos, disponivel, status }: any) => ({ id, nome, participacao, ganhos, disponivel, status }))} filename="socios-playbet" />}
          <button className="btn-primary" onClick={openCreate}><Plus size={14} /> Adicionar Sócio</button>
        </div>
      </div>

      {data.length === 0 ? (
        <div className="glass-card">
          <EmptyState
            icon={Users}
            title="Nenhum sócio cadastrado"
            description="Cadastre os sócios da operação para gerenciar a divisão societária, ganhos e saques."
            actionLabel="Adicionar Sócio"
            onAction={openCreate}
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {data.map((s: any) => (
            <div key={s.id} className="glass-card p-5 hover:border-primary/30 transition-colors">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-sm font-bold text-accent">{s.nome.charAt(0)}</div>
                  <div>
                    <p className="font-semibold">{s.nome}</p>
                    <span className="badge-primary">{s.participacao}% participação</span>
                  </div>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => openEdit(s)} className="p-1.5 rounded-lg hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground"><Edit size={13} /></button>
                  <button onClick={() => navigate(`/socios/${s.id}`)} className="p-1.5 rounded-lg hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground"><ArrowRight size={13} /></button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                <div><span className="text-xs text-muted-foreground">Ganhos</span><p className="font-semibold">R$ {Number(s.ganhos || 0).toLocaleString()}</p></div>
                <div><span className="text-xs text-muted-foreground">Disponível</span><p className="font-semibold">R$ {Number(s.disponivel || 0).toLocaleString()}</p></div>
              </div>
              <div className="mt-3 pt-3 border-t border-border">
                <span className={s.status === "Ativo" ? "badge-success" : "badge-neutral"}>{s.status}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editing?.id ? "Editar Sócio" : "Adicionar Sócio"}</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div><label className="text-xs font-medium text-muted-foreground">Nome *</label><input className="input-field mt-1" value={editing?.nome || ""} onChange={e => setEditing((p: any) => ({ ...p, nome: e.target.value }))} /></div>
            <div><label className="text-xs font-medium text-muted-foreground">Participação %</label><input type="number" className="input-field mt-1" value={editing?.participacao || 0} onChange={e => setEditing((p: any) => ({ ...p, participacao: Number(e.target.value) }))} /></div>
            <div><label className="text-xs font-medium text-muted-foreground">Status</label>
              <select className="select-field mt-1 w-full" value={editing?.status || "Ativo"} onChange={e => setEditing((p: any) => ({ ...p, status: e.target.value }))}>
                <option>Ativo</option><option>Inativo</option>
              </select>
            </div>
          </div>
          <DialogFooter>
            <button className="btn-ghost" onClick={() => setModalOpen(false)}>Cancelar</button>
            <button className="btn-primary" onClick={handleSave} disabled={isCreating || isUpdating}>Salvar</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
