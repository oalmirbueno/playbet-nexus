import { useState } from "react";
import { Plus, Edit, XCircle, Eye, Copy, Users, Search, Link2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { initialLPTemplates, initialInfluencerLPs, initialLandingPages } from "@/data/mockData";
import type { LPTemplate } from "@/types";
import { toast } from "@/hooks/use-toast";
import Breadcrumbs from "@/components/Breadcrumbs";
import ExportDropdown from "@/components/ExportDropdown";

export default function LPTemplates() {
  const navigate = useNavigate();
  const [data, setData] = useState<LPTemplate[]>(initialLPTemplates);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<LPTemplate> | null>(null);
  const [detailOpen, setDetailOpen] = useState<LPTemplate | null>(null);
  const [search, setSearch] = useState("");

  const infLPs = initialInfluencerLPs;
  const landingPages = initialLandingPages;

  const filtered = data.filter(t => {
    if (search && !t.nome.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const getInfluencersUsing = (tplNome: string) => infLPs.filter(l => l.templateNome === tplNome);
  const getLPsUsing = (tplNome: string) => landingPages.filter(lp => lp.nome === tplNome);

  // Validation
  const templatesSemUso = data.filter(t => t.status === "Ativo" && getInfluencersUsing(t.nome).length === 0);

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

  const duplicateTemplate = (t: LPTemplate) => {
    const newId = Math.max(...data.map(x => x.id), 0) + 1;
    setData(prev => [...prev, { ...t, id: newId, nome: `${t.nome} (cópia)`, cliquesTotais: 0, conversoesEstimadas: 0 }]);
    toast({ title: "Template duplicado" });
  };

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: "Gestão de Ativos", path: "/lp-templates" }, { label: "Templates de LP" }]} />
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div><h1 className="page-header">Templates de LP</h1><p className="page-subtitle">Central de templates — base para distribuição por influenciador</p></div>
        <div className="flex gap-2">
          <ExportDropdown data={data.map(({ id, nome, rotaBase, tipo, jogoVinculado, cliquesTotais, conversoesEstimadas, status }) => ({ id, nome, rotaBase, tipo, jogoVinculado, cliquesTotais, conversoesEstimadas, status }))} filename="templates-lp-playbet" />
          <button className="btn-primary" onClick={openCreate}><Plus size={14} /> Criar Template</button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        <div className="stat-card border-l-2 border-l-primary"><span className="text-[10px] text-muted-foreground uppercase">Total Templates</span><p className="text-xl font-bold">{data.length}</p></div>
        <div className="stat-card border-l-2 border-l-success"><span className="text-[10px] text-muted-foreground uppercase">Ativos</span><p className="text-xl font-bold">{data.filter(t => t.status === "Ativo").length}</p></div>
        <div className="stat-card border-l-2 border-l-accent"><span className="text-[10px] text-muted-foreground uppercase">Cliques Totais</span><p className="text-xl font-bold">{data.reduce((a, t) => a + t.cliquesTotais, 0).toLocaleString()}</p></div>
        <div className="stat-card border-l-2 border-l-info"><span className="text-[10px] text-muted-foreground uppercase">Conversões</span><p className="text-xl font-bold">{data.reduce((a, t) => a + t.conversoesEstimadas, 0).toLocaleString()}</p></div>
        <div className="stat-card border-l-2 border-l-warning"><span className="text-[10px] text-muted-foreground uppercase">Sem Uso</span><p className="text-xl font-bold">{templatesSemUso.length}</p></div>
      </div>

      {/* Validation */}
      {templatesSemUso.length > 0 && (
        <div className="glass-card p-4 border-warning/30">
          <p className="text-xs font-medium text-warning">⚠ {templatesSemUso.length} template(s) ativo(s) sem influencer vinculado: {templatesSemUso.map(t => t.nome).join(", ")}</p>
        </div>
      )}

      {/* Atalhos */}
      <div className="flex flex-wrap gap-2">
        <button className="btn-ghost text-xs" onClick={() => navigate("/link-engine")}>→ Engine de Links</button>
        <button className="btn-ghost text-xs" onClick={() => navigate("/landing-pages")}>→ Landing Pages</button>
        <button className="btn-ghost text-xs" onClick={() => navigate("/influencers")}>→ Influencers</button>
        <button className="btn-ghost text-xs" onClick={() => navigate("/hubs")}>→ Hubs</button>
      </div>

      {/* Search */}
      <div className="flex items-center gap-2 bg-secondary/50 border border-border rounded-lg px-3 py-1.5 max-w-xs">
        <Search size={13} className="text-muted-foreground shrink-0" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar template..." className="bg-transparent text-xs text-foreground placeholder:text-muted-foreground focus:outline-none w-full" />
      </div>

      {/* Table */}
      <div className="glass-card overflow-x-auto invisible-scroll">
        <table className="data-table">
          <thead><tr><th>Nome</th><th>Rota Base</th><th>Tipo</th><th>Jogo Vinculado</th><th>LPs Usando</th><th>Influencers</th><th>Cliques</th><th>Conversões</th><th>Status</th><th>Ações</th></tr></thead>
          <tbody>
            {filtered.map(t => {
              const infs = getInfluencersUsing(t.nome);
              const lpsUsing = getLPsUsing(t.nome);
              return (
                <tr key={t.id}>
                  <td className="font-medium">{t.nome}</td>
                  <td className="font-mono text-xs text-accent">{t.rotaBase}</td>
                  <td><span className="badge-neutral">{t.tipo}</span></td>
                  <td>{t.jogoVinculado}</td>
                  <td>{lpsUsing.length > 0 ? <span className="badge-info">{lpsUsing.length}</span> : <span className="text-xs text-muted-foreground">0</span>}</td>
                  <td>{infs.length > 0 ? <span className="badge-accent cursor-pointer" onClick={() => setDetailOpen(t)}>{infs.length}</span> : <span className="text-xs text-muted-foreground">0</span>}</td>
                  <td>{t.cliquesTotais.toLocaleString()}</td>
                  <td className="font-medium">{t.conversoesEstimadas.toLocaleString()}</td>
                  <td><span className={t.status === "Ativo" ? "badge-success" : "badge-danger"}>{t.status}</span></td>
                  <td>
                    <div className="flex gap-0.5">
                      <button onClick={() => setDetailOpen(t)} className="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors" title="Detalhes"><Eye size={12} /></button>
                      <button onClick={() => openEdit(t)} className="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors" title="Editar"><Edit size={12} /></button>
                      <button onClick={() => duplicateTemplate(t)} className="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors" title="Duplicar"><Copy size={12} /></button>
                      <button onClick={() => toggleStatus(t)} className="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-destructive transition-colors" title="Ativar/Desativar"><XCircle size={12} /></button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Detail Modal */}
      <Dialog open={!!detailOpen} onOpenChange={() => setDetailOpen(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Template — {detailOpen?.nome}</DialogTitle></DialogHeader>
          {detailOpen && (
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                <div className="p-2 bg-secondary/50 rounded text-center"><span className="text-[10px] text-muted-foreground">Tipo</span><p className="font-medium">{detailOpen.tipo}</p></div>
                <div className="p-2 bg-secondary/50 rounded text-center"><span className="text-[10px] text-muted-foreground">Jogo</span><p className="font-medium">{detailOpen.jogoVinculado || "—"}</p></div>
                <div className="p-2 bg-secondary/50 rounded text-center"><span className="text-[10px] text-muted-foreground">Cliques</span><p className="font-bold">{detailOpen.cliquesTotais.toLocaleString()}</p></div>
                <div className="p-2 bg-secondary/50 rounded text-center"><span className="text-[10px] text-muted-foreground">Conversões</span><p className="font-bold">{detailOpen.conversoesEstimadas.toLocaleString()}</p></div>
              </div>
              <div className="border-t border-border pt-3">
                <h4 className="text-xs font-medium text-muted-foreground uppercase mb-2">Influencers Usando Este Template</h4>
                {getInfluencersUsing(detailOpen.nome).length > 0 ? (
                  <div className="space-y-2">
                    {getInfluencersUsing(detailOpen.nome).map(l => (
                      <div key={l.id} className="flex items-center justify-between p-2 rounded bg-secondary/30">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-[9px] font-bold text-accent">{l.influencerNome.charAt(0)}</div>
                          <span className="text-sm font-medium">{l.influencerNome}</span>
                          <span className="font-mono text-xs text-accent">/i/{l.slug}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">{l.cliques.toLocaleString()} cliques</span>
                          <span className={l.status === "Ativo" ? "badge-success" : "badge-danger"}>{l.status}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : <p className="text-sm text-muted-foreground">Nenhum influencer usando este template.</p>}
              </div>
              <div className="border-t border-border pt-3">
                <h4 className="text-xs font-medium text-muted-foreground uppercase mb-2">LPs Derivadas</h4>
                {getLPsUsing(detailOpen.nome).length > 0 ? (
                  getLPsUsing(detailOpen.nome).map(lp => (
                    <div key={lp.id} className="flex items-center justify-between p-2 rounded bg-secondary/30 mb-1">
                      <span className="text-sm">{lp.nome}</span>
                      <span className="font-mono text-xs text-accent">{lp.rota}</span>
                    </div>
                  ))
                ) : <p className="text-sm text-muted-foreground">Nenhuma LP derivada encontrada.</p>}
              </div>
            </div>
          )}
          <DialogFooter>
            <button className="btn-ghost" onClick={() => navigate("/link-engine")}>Ver na Engine</button>
            <button className="btn-ghost" onClick={() => setDetailOpen(null)}>Fechar</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create/Edit Modal */}
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
