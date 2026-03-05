import { useState } from "react";
import { Plus, Users, TrendingUp, MousePointerClick, DollarSign, ArrowRight, Search, Edit, XCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { initialInfluencers } from "@/data/mockData";
import type { Influencer } from "@/types";
import { toast } from "@/hooks/use-toast";

const emptyInfluencer: Partial<Influencer> = {
  nome: "", slug: "", insta: "", seg: "", tipo: "Standard", perc: 15,
  affiliate_link: "", landing_template: "", observacoes: "", status: "Novo",
};

export default function Influencers() {
  const navigate = useNavigate();
  const [data, setData] = useState<Influencer[]>(initialInfluencers);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("Todos");
  const [filterTipo, setFilterTipo] = useState("Todos");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<Influencer> | null>(null);
  const [confirmDeactivate, setConfirmDeactivate] = useState<Influencer | null>(null);

  const filtered = data.filter((inf) => {
    if (search && !inf.nome.toLowerCase().includes(search.toLowerCase()) && !inf.insta.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterStatus !== "Todos" && inf.status !== filterStatus) return false;
    if (filterTipo !== "Todos" && inf.tipo !== filterTipo) return false;
    return true;
  });

  const stats = [
    { label: "Total Influencers", value: String(data.length), icon: Users, variant: "border-l-primary" },
    { label: "Ativos", value: String(data.filter(i => i.status === "Ativo").length), icon: TrendingUp, variant: "border-l-success" },
    { label: "Pausados", value: String(data.filter(i => i.status === "Pausado").length), icon: Users, variant: "border-l-warning" },
    { label: "Maior Faturamento", value: (() => { const top = [...data].sort((a,b) => b.receita - a.receita)[0]; return top ? `${top.nome.split(" ")[0]} — R$ ${(top.receita/1000).toFixed(1)}K` : "—"; })(), icon: DollarSign, variant: "border-l-accent" },
    { label: "Maior CTR", value: "Pedro L. — 12.8%", icon: MousePointerClick, variant: "border-l-info" },
    { label: "Maior Conversão", value: "Carlos S. — 9.2%", icon: TrendingUp, variant: "border-l-success" },
  ];

  const openCreate = () => { setEditing({ ...emptyInfluencer, id: 0 }); setModalOpen(true); };
  const openEdit = (inf: Influencer) => { setEditing({ ...inf }); setModalOpen(true); };

  const handleSave = () => {
    if (!editing?.nome || !editing?.slug) {
      toast({ title: "Erro", description: "Nome e slug são obrigatórios.", variant: "destructive" });
      return;
    }
    if (editing.id && editing.id > 0) {
      setData(prev => prev.map(i => i.id === editing.id ? { ...i, ...editing } as Influencer : i));
      toast({ title: "Influencer atualizado", description: `${editing.nome} foi atualizado com sucesso.` });
    } else {
      const newId = Math.max(...data.map(i => i.id)) + 1;
      const newInf: Influencer = {
        ...emptyInfluencer as Influencer,
        ...editing,
        id: newId,
        jogos: 0, links: 0, receita: 0, saldo: 0, ultimoSaque: "—",
        is_active: true,
        created_at: new Date().toISOString().split("T")[0],
        updated_at: new Date().toISOString().split("T")[0],
      };
      setData(prev => [...prev, newInf]);
      toast({ title: "Influencer criado", description: `${editing.nome} foi adicionado com sucesso.` });
    }
    setModalOpen(false);
    setEditing(null);
  };

  const handleDeactivate = () => {
    if (!confirmDeactivate) return;
    setData(prev => prev.map(i => i.id === confirmDeactivate.id ? { ...i, status: "Inativo" as const, is_active: false } : i));
    toast({ title: "Influencer desativado", description: `${confirmDeactivate.nome} foi desativado.` });
    setConfirmDeactivate(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="page-header">Influencers</h1>
          <p className="page-subtitle">Gestão completa de influenciadores e performance de afiliados</p>
        </div>
        <button className="btn-primary" onClick={openCreate}><Plus size={14} /> Adicionar Influencer</button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
        {stats.map((s) => (
          <div key={s.label} className={`stat-card border-l-2 ${s.variant}`}>
            <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">{s.label}</span>
            <div className="text-sm font-bold">{s.value}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="flex items-center gap-2 bg-secondary/50 border border-border rounded-lg px-3 py-1.5 flex-1 max-w-xs">
          <Search size={13} className="text-muted-foreground shrink-0" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar influencer..." className="bg-transparent text-xs text-foreground placeholder:text-muted-foreground focus:outline-none w-full" />
        </div>
        <select className="select-field" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option>Todos</option><option>Ativo</option><option>Pausado</option><option>Novo</option><option>Inativo</option>
        </select>
        <select className="select-field" value={filterTipo} onChange={e => setFilterTipo(e.target.value)}>
          <option>Todos</option><option>Premium</option><option>Standard</option><option>Starter</option>
        </select>
      </div>

      <div className="glass-card overflow-x-auto">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <Users size={40} className="mb-3 opacity-30" />
            <p className="text-sm font-medium">Nenhum influencer encontrado</p>
            <p className="text-xs mt-1">Tente ajustar os filtros ou adicione um novo influencer.</p>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr><th>Nome</th><th>Instagram</th><th>Seguidores</th><th>Tipo</th><th>%</th><th>Jogos</th><th>Links</th><th>Receita</th><th>Saldo</th><th>Status</th><th>Ações</th></tr>
            </thead>
            <tbody>
              {filtered.map((inf) => (
                <tr key={inf.id}>
                  <td>
                    <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate(`/influencers/${inf.id}`)}>
                      <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center text-[10px] font-bold text-accent">{inf.nome.charAt(0)}</div>
                      <span className="font-medium hover:text-accent transition-colors">{inf.nome}</span>
                    </div>
                  </td>
                  <td className="text-accent text-xs">{inf.insta}</td>
                  <td>{inf.seg}</td>
                  <td><span className={inf.tipo === "Premium" ? "badge-accent" : inf.tipo === "Standard" ? "badge-primary" : "badge-neutral"}>{inf.tipo}</span></td>
                  <td>{inf.perc}%</td>
                  <td>{inf.jogos}</td>
                  <td>{inf.links}</td>
                  <td className="font-medium">R$ {inf.receita.toLocaleString()}</td>
                  <td className="text-success">R$ {inf.saldo.toLocaleString()}</td>
                  <td><span className={inf.status === "Ativo" ? "badge-success" : inf.status === "Pausado" ? "badge-warning" : inf.status === "Novo" ? "badge-info" : "badge-danger"}>{inf.status}</span></td>
                  <td>
                    <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                      <button onClick={() => openEdit(inf)} className="p-1.5 rounded-lg hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground" title="Editar"><Edit size={13} /></button>
                      <button onClick={() => navigate(`/influencers/${inf.id}`)} className="p-1.5 rounded-lg hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground" title="Detalhe"><ArrowRight size={13} /></button>
                      {inf.status !== "Inativo" && (
                        <button onClick={() => setConfirmDeactivate(inf)} className="p-1.5 rounded-lg hover:bg-destructive/15 transition-colors text-muted-foreground hover:text-destructive" title="Desativar"><XCircle size={13} /></button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Create/Edit Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing?.id ? "Editar Influencer" : "Adicionar Influencer"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-xs font-medium text-muted-foreground">Nome *</label><input className="input-field mt-1" value={editing?.nome || ""} onChange={e => setEditing(prev => ({ ...prev, nome: e.target.value }))} /></div>
              <div><label className="text-xs font-medium text-muted-foreground">Slug *</label><input className="input-field mt-1" value={editing?.slug || ""} onChange={e => setEditing(prev => ({ ...prev, slug: e.target.value }))} placeholder="ex: rafa" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-xs font-medium text-muted-foreground">Instagram</label><input className="input-field mt-1" value={editing?.insta || ""} onChange={e => setEditing(prev => ({ ...prev, insta: e.target.value }))} /></div>
              <div><label className="text-xs font-medium text-muted-foreground">Seguidores</label><input className="input-field mt-1" value={editing?.seg || ""} onChange={e => setEditing(prev => ({ ...prev, seg: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground">Tipo</label>
                <select className="select-field mt-1 w-full" value={editing?.tipo || "Standard"} onChange={e => setEditing(prev => ({ ...prev, tipo: e.target.value as Influencer["tipo"] }))}>
                  <option>Premium</option><option>Standard</option><option>Starter</option>
                </select>
              </div>
              <div><label className="text-xs font-medium text-muted-foreground">% Comissão</label><input type="number" className="input-field mt-1" value={editing?.perc || 15} onChange={e => setEditing(prev => ({ ...prev, perc: Number(e.target.value) }))} /></div>
            </div>
            <div><label className="text-xs font-medium text-muted-foreground">Link de Afiliado</label><input className="input-field mt-1" value={editing?.affiliate_link || ""} onChange={e => setEditing(prev => ({ ...prev, affiliate_link: e.target.value }))} /></div>
            <div><label className="text-xs font-medium text-muted-foreground">Landing Template</label><input className="input-field mt-1" value={editing?.landing_template || ""} onChange={e => setEditing(prev => ({ ...prev, landing_template: e.target.value }))} /></div>
            <div><label className="text-xs font-medium text-muted-foreground">Observações</label><textarea className="input-field mt-1 min-h-[60px]" value={editing?.observacoes || ""} onChange={e => setEditing(prev => ({ ...prev, observacoes: e.target.value }))} /></div>
          </div>
          <DialogFooter>
            <button className="btn-ghost" onClick={() => setModalOpen(false)}>Cancelar</button>
            <button className="btn-primary" onClick={handleSave}>Salvar</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Deactivate Confirmation */}
      <Dialog open={!!confirmDeactivate} onOpenChange={() => setConfirmDeactivate(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Desativar Influencer</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">Tem certeza que deseja desativar <strong>{confirmDeactivate?.nome}</strong>? Seus links serão pausados.</p>
          <DialogFooter>
            <button className="btn-ghost" onClick={() => setConfirmDeactivate(null)}>Cancelar</button>
            <button className="btn-primary bg-destructive hover:bg-destructive/90" onClick={handleDeactivate}>Desativar</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
