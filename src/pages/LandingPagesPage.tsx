import { useState } from "react";
import { Plus, Edit, Copy, Eye, XCircle, Users, Link2, ExternalLink, Search } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { initialLandingPages, initialInfluencerLPs, initialLPTemplates } from "@/data/mockData";
import type { LandingPage } from "@/types";
import { toast } from "@/hooks/use-toast";
import Breadcrumbs from "@/components/Breadcrumbs";
import ExportDropdown from "@/components/ExportDropdown";

export default function LandingPagesPage() {
  const navigate = useNavigate();
  const [data, setData] = useState<LandingPage[]>(initialLandingPages);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<LandingPage> | null>(null);
  const [previewOpen, setPreviewOpen] = useState<LandingPage | null>(null);
  const [search, setSearch] = useState("");
  const [filterTipo, setFilterTipo] = useState("Todos");
  const [filterStatus, setFilterStatus] = useState("Todos");

  const infLPs = initialInfluencerLPs;
  const templates = initialLPTemplates;

  const filtered = data.filter(p => {
    if (search && !p.nome.toLowerCase().includes(search.toLowerCase()) && !p.rota.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterTipo !== "Todos" && p.tipo !== filterTipo) return false;
    if (filterStatus !== "Todos" && p.status !== filterStatus) return false;
    return true;
  });

  const getInfluencersForLP = (lpNome: string) => infLPs.filter(l => l.templateNome === lpNome);

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

  const toggleStatus = (p: LandingPage) => {
    const newStatus = p.status === "Ativo" ? "Inativo" as const : "Ativo" as const;
    setData(prev => prev.map(item => item.id === p.id ? { ...item, status: newStatus } : item));
    toast({ title: `LP ${newStatus === "Ativo" ? "ativada" : "desativada"}` });
  };

  const duplicate = (p: LandingPage) => {
    const newId = Math.max(...data.map(x => x.id), 0) + 1;
    setData(prev => [...prev, { ...p, id: newId, nome: `${p.nome} (cópia)`, cliques: 0 }]);
    toast({ title: "LP duplicada" });
  };

  // Validation
  const lpsSemInfluencer = data.filter(p => p.status === "Ativo" && getInfluencersForLP(p.nome).length === 0);

  const stats = [
    { label: "Total LPs", value: data.length, variant: "border-l-primary" },
    { label: "Ativas", value: data.filter(p => p.status === "Ativo").length, variant: "border-l-success" },
    { label: "Cliques Totais", value: data.reduce((a, p) => a + p.cliques, 0).toLocaleString(), variant: "border-l-accent" },
    { label: "Influencers Vinculados", value: new Set(infLPs.map(l => l.influencerId)).size, variant: "border-l-info" },
  ];

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: "Gestão de Ativos", path: "/landing-pages" }, { label: "Landing Pages" }]} />
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div><h1 className="page-header">Landing Pages</h1><p className="page-subtitle">Gestão de páginas de conversão, performance e vínculos com influenciadores</p></div>
        <div className="flex gap-2">
          <ExportDropdown data={data.map(({ id, nome, rota, tipo, jogo, plats, cliques, ctr, saida, status }) => ({ id, nome, rota, tipo, jogo, plats, cliques, ctr, saida, status }))} filename="landing-pages-playbet" />
          <button className="btn-primary" onClick={openCreate}><Plus size={14} /> Adicionar LP</button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {stats.map(s => (
          <div key={s.label} className={`stat-card border-l-2 ${s.variant}`}>
            <span className="text-[10px] text-muted-foreground uppercase">{s.label}</span>
            <p className="text-xl font-bold">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Alerts */}
      {lpsSemInfluencer.length > 0 && (
        <div className="glass-card p-4 border-warning/30">
          <p className="text-xs font-medium text-warning">⚠ {lpsSemInfluencer.length} LP(s) ativa(s) sem influencer vinculado: {lpsSemInfluencer.map(p => p.nome).join(", ")}</p>
        </div>
      )}

      {/* Atalhos */}
      <div className="flex flex-wrap gap-2">
        <button className="btn-ghost text-xs" onClick={() => navigate("/lp-templates")}>→ Templates de LP</button>
        <button className="btn-ghost text-xs" onClick={() => navigate("/link-engine")}>→ Engine de Links</button>
        <button className="btn-ghost text-xs" onClick={() => navigate("/influencers")}>→ Influencers</button>
        <button className="btn-ghost text-xs" onClick={() => navigate("/analytics")}>→ Analytics</button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="flex items-center gap-2 bg-secondary/50 border border-border rounded-lg px-3 py-1.5 flex-1 max-w-xs">
          <Search size={13} className="text-muted-foreground shrink-0" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar LP..." className="bg-transparent text-xs text-foreground placeholder:text-muted-foreground focus:outline-none w-full" />
        </div>
        <select className="select-field" value={filterTipo} onChange={e => setFilterTipo(e.target.value)}>
          <option>Todos</option><option>Jogo</option><option>Promoção</option><option>Geral</option>
        </select>
        <select className="select-field" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option>Todos</option><option>Ativo</option><option>Revisão</option><option>Inativo</option>
        </select>
      </div>

      {/* Table */}
      <div className="glass-card overflow-x-auto invisible-scroll">
        <table className="data-table">
          <thead><tr><th>Nome</th><th>Rota</th><th>Tipo</th><th>Jogo</th><th>Plataformas</th><th>Influencers</th><th>Cliques</th><th>CTR</th><th>Saída</th><th>Status</th><th>Ações</th></tr></thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={11} className="text-center text-muted-foreground py-8">Nenhuma LP encontrada</td></tr>
            ) : filtered.map(p => {
              const vinculados = getInfluencersForLP(p.nome);
              return (
                <tr key={p.id}>
                  <td className="font-medium">{p.nome}</td>
                  <td className="font-mono text-xs text-accent">{p.rota}</td>
                  <td><span className="badge-neutral">{p.tipo}</span></td>
                  <td>{p.jogo}</td>
                  <td className="text-xs">{p.plats}</td>
                  <td>
                    {vinculados.length > 0 ? (
                      <span className="badge-info cursor-pointer" onClick={() => navigate("/link-engine")}>{vinculados.length} vinculado(s)</span>
                    ) : <span className="text-xs text-muted-foreground">—</span>}
                  </td>
                  <td>{p.cliques.toLocaleString()}</td>
                  <td className="font-medium text-accent">{p.ctr}</td>
                  <td className={parseFloat(p.saida) > 40 ? "text-destructive" : "text-success"}>{p.saida}</td>
                  <td><span className={p.status === "Ativo" ? "badge-success" : p.status === "Revisão" ? "badge-warning" : "badge-danger"}>{p.status}</span></td>
                  <td>
                    <div className="flex gap-0.5">
                      <button onClick={() => setPreviewOpen(p)} className="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors" title="Preview"><Eye size={12} /></button>
                      <button onClick={() => openEdit(p)} className="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors" title="Editar"><Edit size={12} /></button>
                      <button onClick={() => { navigator.clipboard.writeText(`https://playbet.com${p.rota}`); toast({ title: "URL copiada!" }); }} className="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors" title="Copiar"><Copy size={12} /></button>
                      <button onClick={() => duplicate(p)} className="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors" title="Duplicar"><Plus size={12} /></button>
                      <button onClick={() => toggleStatus(p)} className="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-destructive transition-colors" title="Ativar/Desativar"><XCircle size={12} /></button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Preview Modal */}
      <Dialog open={!!previewOpen} onOpenChange={() => setPreviewOpen(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Preview — {previewOpen?.nome}</DialogTitle></DialogHeader>
          {previewOpen && (
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-xs text-muted-foreground">URL Pública</span><p className="font-mono text-accent">playbet.com{previewOpen.rota}</p></div>
                <div><span className="text-xs text-muted-foreground">Tipo</span><p><span className="badge-neutral">{previewOpen.tipo}</span></p></div>
                <div><span className="text-xs text-muted-foreground">Jogo</span><p>{previewOpen.jogo || "—"}</p></div>
                <div><span className="text-xs text-muted-foreground">Plataformas</span><p>{previewOpen.plats}</p></div>
                <div><span className="text-xs text-muted-foreground">Cliques</span><p className="font-bold text-lg">{previewOpen.cliques.toLocaleString()}</p></div>
                <div><span className="text-xs text-muted-foreground">Status</span><p><span className={previewOpen.status === "Ativo" ? "badge-success" : "badge-warning"}>{previewOpen.status}</span></p></div>
              </div>
              <div className="border-t border-border pt-3">
                <h4 className="text-xs font-medium text-muted-foreground uppercase mb-2">Influencers Vinculados</h4>
                {getInfluencersForLP(previewOpen.nome).length > 0 ? (
                  <div className="space-y-2">
                    {getInfluencersForLP(previewOpen.nome).map(l => (
                      <div key={l.id} className="flex items-center justify-between p-2 rounded bg-secondary/30">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-[9px] font-bold text-accent">{l.influencerNome.charAt(0)}</div>
                          <span className="text-sm">{l.influencerNome}</span>
                          <span className="font-mono text-xs text-accent">/i/{l.slug}</span>
                        </div>
                        <span className="text-xs text-muted-foreground">{l.cliques.toLocaleString()} cliques</span>
                      </div>
                    ))}
                  </div>
                ) : <p className="text-sm text-muted-foreground">Nenhum influencer vinculado a esta LP.</p>}
              </div>
              <div className="border border-dashed border-border rounded-lg p-8 text-center text-muted-foreground bg-secondary/20">
                <ExternalLink size={24} className="mx-auto mb-2 opacity-30" />
                <p className="text-sm">Preview visual da LP</p>
                <p className="text-xs mt-1">A visualização real estará disponível após integração com Lovable Cloud.</p>
              </div>
            </div>
          )}
          <DialogFooter>
            {previewOpen && <button className="btn-ghost" onClick={() => { navigator.clipboard.writeText(`https://playbet.com${previewOpen.rota}`); toast({ title: "URL copiada!" }); }}>Copiar URL</button>}
            <button className="btn-ghost" onClick={() => previewOpen && navigate("/link-engine")}>Ver na Engine</button>
            <button className="btn-ghost" onClick={() => setPreviewOpen(null)}>Fechar</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create/Edit Modal */}
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
            <div><label className="text-xs font-medium text-muted-foreground">Status</label>
              <select className="select-field mt-1 w-full" value={editing?.status || "Ativo"} onChange={e => setEditing(p => ({ ...p, status: e.target.value as LandingPage["status"] }))}>
                <option>Ativo</option><option>Revisão</option><option>Inativo</option>
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
