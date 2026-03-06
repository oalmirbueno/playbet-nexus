import { useState } from "react";
import { Plus, Copy, Edit, XCircle, CopyPlus, Search, Eye, Link2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { initialInfluencerLPs, initialLPTemplates, initialInfluencers } from "@/data/mockData";
import type { InfluencerLP } from "@/types";
import { toast } from "@/hooks/use-toast";
import Breadcrumbs from "@/components/Breadcrumbs";
import ExportDropdown from "@/components/ExportDropdown";

export default function LinkEngine() {
  const navigate = useNavigate();
  const [data, setData] = useState<InfluencerLP[]>(initialInfluencerLPs);
  const [search, setSearch] = useState("");
  const [filterTemplate, setFilterTemplate] = useState("Todos");
  const [filterStatus, setFilterStatus] = useState("Todos");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<InfluencerLP> | null>(null);
  const [detailOpen, setDetailOpen] = useState<InfluencerLP | null>(null);

  const templates = initialLPTemplates;
  const influencers = initialInfluencers;

  const filtered = data.filter(lp => {
    if (search && !lp.influencerNome.toLowerCase().includes(search.toLowerCase()) && !lp.slug.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterTemplate !== "Todos" && lp.templateNome !== filterTemplate) return false;
    if (filterStatus !== "Todos" && lp.status !== filterStatus) return false;
    return true;
  });

  const openCreate = () => {
    setEditing({ id: 0, influencerId: 0, influencerNome: "", slug: "", templateId: 0, templateNome: "", affiliateLink: "", urlPublica: "", cliques: 0, status: "Ativo", ultimaAtividade: "—" });
    setModalOpen(true);
  };

  const openEdit = (lp: InfluencerLP) => { setEditing({ ...lp }); setModalOpen(true); };

  const handleSave = () => {
    if (!editing?.slug || !editing?.influencerNome) {
      toast({ title: "Erro", description: "Influencer e slug são obrigatórios.", variant: "destructive" });
      return;
    }
    const urlPublica = `/i/${editing.slug}`;
    if (editing.id && editing.id > 0) {
      setData(prev => prev.map(lp => lp.id === editing.id ? { ...lp, ...editing, urlPublica } as InfluencerLP : lp));
      toast({ title: "Vínculo atualizado" });
    } else {
      const newId = Math.max(...data.map(lp => lp.id), 0) + 1;
      setData(prev => [...prev, { ...editing, id: newId, urlPublica } as InfluencerLP]);
      toast({ title: "Vínculo criado", description: `URL: ${urlPublica}` });
    }
    setModalOpen(false);
  };

  const copyUrl = (lp: InfluencerLP) => {
    const fullUrl = `https://playbet.com${lp.urlPublica}`;
    navigator.clipboard.writeText(fullUrl);
    toast({ title: "URL copiada!", description: fullUrl });
  };

  const duplicate = (lp: InfluencerLP) => {
    const newId = Math.max(...data.map(x => x.id), 0) + 1;
    const newSlug = `${lp.slug}-2`;
    setData(prev => [...prev, { ...lp, id: newId, slug: newSlug, urlPublica: `/i/${newSlug}`, cliques: 0 }]);
    toast({ title: "Configuração duplicada" });
  };

  const toggleStatus = (lp: InfluencerLP) => {
    setData(prev => prev.map(x => x.id === lp.id ? { ...x, status: x.status === "Ativo" ? "Inativo" as const : "Ativo" as const } : x));
    toast({ title: lp.status === "Ativo" ? "Desativado" : "Ativado" });
  };

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: "Gestão de Ativos", path: "/link-engine" }, { label: "Engine de Links" }]} />
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div><h1 className="page-header">Engine de Links</h1><p className="page-subtitle">Distribuição de LPs por influenciador — gestão centralizada de vínculos</p></div>
        <div className="flex gap-2">
          <ExportDropdown data={data.map(({ id, influencerNome, slug, templateNome, affiliateLink, urlPublica, cliques, status }) => ({ id, influencerNome, slug, templateNome, affiliateLink, urlPublica, cliques, status }))} filename="engine-links-playbet" />
          <button className="btn-primary" onClick={openCreate}><Plus size={14} /> Criar Vínculo</button>
        </div>
      </div>

      {/* Atalhos rápidos */}
      <div className="flex flex-wrap gap-2">
        <button className="btn-ghost text-xs" onClick={() => navigate("/influencers")}>→ Influencers</button>
        <button className="btn-ghost text-xs" onClick={() => navigate("/lp-templates")}>→ Templates de LP</button>
        <button className="btn-ghost text-xs" onClick={() => navigate("/links")}>→ Links Afiliados</button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="stat-card border-l-2 border-l-primary"><span className="text-[10px] text-muted-foreground uppercase">Total Vínculos</span><p className="text-xl font-bold">{data.length}</p></div>
        <div className="stat-card border-l-2 border-l-success"><span className="text-[10px] text-muted-foreground uppercase">Ativos</span><p className="text-xl font-bold">{data.filter(l => l.status === "Ativo").length}</p></div>
        <div className="stat-card border-l-2 border-l-accent"><span className="text-[10px] text-muted-foreground uppercase">Cliques Totais</span><p className="text-xl font-bold">{data.reduce((a, l) => a + l.cliques, 0).toLocaleString()}</p></div>
        <div className="stat-card border-l-2 border-l-info"><span className="text-[10px] text-muted-foreground uppercase">Templates Usados</span><p className="text-xl font-bold">{new Set(data.map(l => l.templateId)).size}</p></div>
      </div>

      <div className="flex flex-wrap gap-3 items-center">
        <div className="flex items-center gap-2 bg-secondary/50 border border-border rounded-lg px-3 py-1.5 flex-1 max-w-xs">
          <Search size={13} className="text-muted-foreground shrink-0" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar influencer ou slug..." className="bg-transparent text-xs text-foreground placeholder:text-muted-foreground focus:outline-none w-full" />
        </div>
        <select className="select-field" value={filterTemplate} onChange={e => setFilterTemplate(e.target.value)}>
          <option>Todos</option>{templates.map(t => <option key={t.id}>{t.nome}</option>)}
        </select>
        <select className="select-field" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option>Todos</option><option>Ativo</option><option>Inativo</option>
        </select>
      </div>

      <div className="glass-card overflow-x-auto">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <Link2 size={40} className="mb-3 opacity-30" />
            <p className="text-sm font-medium">Nenhum vínculo encontrado</p>
            <p className="text-xs mt-1">Crie um novo vínculo entre influenciador e template de LP.</p>
          </div>
        ) : (
          <table className="data-table">
            <thead><tr><th>Influenciador</th><th>Slug</th><th>Landing Base</th><th>Affiliate Link</th><th>URL Pública</th><th>Cliques</th><th>Última Atividade</th><th>Status</th><th>Ações</th></tr></thead>
            <tbody>
              {filtered.map(lp => (
                <tr key={lp.id}>
                  <td>
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-[9px] font-bold text-accent">{lp.influencerNome.charAt(0)}</div>
                      <span className="font-medium text-xs">{lp.influencerNome}</span>
                    </div>
                  </td>
                  <td className="font-mono text-xs text-accent">{lp.slug}</td>
                  <td className="text-xs">{lp.templateNome}</td>
                  <td className="text-xs max-w-[150px] truncate text-muted-foreground">{lp.affiliateLink}</td>
                  <td className="font-mono text-xs text-accent">{lp.urlPublica}</td>
                  <td className="font-medium">{lp.cliques.toLocaleString()}</td>
                  <td className="text-[10px] text-muted-foreground whitespace-nowrap">{lp.ultimaAtividade}</td>
                  <td><span className={lp.status === "Ativo" ? "badge-success" : "badge-danger"}>{lp.status}</span></td>
                  <td>
                    <div className="flex gap-1">
                      <button onClick={() => copyUrl(lp)} className="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors" title="Copiar URL"><Copy size={12} /></button>
                      <button onClick={() => setDetailOpen(lp)} className="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors" title="Detalhes"><Eye size={12} /></button>
                      <button onClick={() => openEdit(lp)} className="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors" title="Editar"><Edit size={12} /></button>
                      <button onClick={() => duplicate(lp)} className="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors" title="Duplicar"><CopyPlus size={12} /></button>
                      <button onClick={() => toggleStatus(lp)} className="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-destructive transition-colors" title="Desativar"><XCircle size={12} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Detail Modal */}
      <Dialog open={!!detailOpen} onOpenChange={() => setDetailOpen(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Detalhes do Vínculo</DialogTitle></DialogHeader>
          {detailOpen && (
            <div className="space-y-3 py-2 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div><span className="text-xs text-muted-foreground">Influenciador</span><p className="font-medium">{detailOpen.influencerNome}</p></div>
                <div><span className="text-xs text-muted-foreground">Slug</span><p className="font-mono text-accent">{detailOpen.slug}</p></div>
                <div><span className="text-xs text-muted-foreground">Template</span><p>{detailOpen.templateNome}</p></div>
                <div><span className="text-xs text-muted-foreground">Status</span><p><span className={detailOpen.status === "Ativo" ? "badge-success" : "badge-danger"}>{detailOpen.status}</span></p></div>
              </div>
              <div><span className="text-xs text-muted-foreground">URL Pública</span><p className="font-mono text-accent">https://playbet.com{detailOpen.urlPublica}</p></div>
              <div><span className="text-xs text-muted-foreground">Affiliate Link</span><p className="text-xs break-all">{detailOpen.affiliateLink}</p></div>
              <div className="grid grid-cols-2 gap-3">
                <div><span className="text-xs text-muted-foreground">Cliques</span><p className="font-bold text-lg">{detailOpen.cliques.toLocaleString()}</p></div>
                <div><span className="text-xs text-muted-foreground">Última Atividade</span><p className="text-xs">{detailOpen.ultimaAtividade}</p></div>
              </div>
            </div>
          )}
          <DialogFooter>
            <button className="btn-primary" onClick={() => { if (detailOpen) copyUrl(detailOpen); }}>Copiar URL</button>
            <button className="btn-ghost" onClick={() => setDetailOpen(null)}>Fechar</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create/Edit Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editing?.id ? "Editar Vínculo" : "Criar Vínculo"}</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-xs font-medium text-muted-foreground">Influenciador *</label>
                <select className="select-field mt-1 w-full" value={editing?.influencerNome || ""} onChange={e => {
                  const inf = influencers.find(i => i.nome === e.target.value);
                  setEditing(p => ({ ...p, influencerNome: e.target.value, influencerId: inf?.id || 0, slug: inf?.slug || p?.slug || "" }));
                }}>
                  <option value="">Selecionar...</option>
                  {influencers.map(i => <option key={i.id}>{i.nome}</option>)}
                </select>
              </div>
              <div><label className="text-xs font-medium text-muted-foreground">Slug *</label><input className="input-field mt-1" value={editing?.slug || ""} onChange={e => setEditing(p => ({ ...p, slug: e.target.value }))} placeholder="ex: rafa" /></div>
            </div>
            <div><label className="text-xs font-medium text-muted-foreground">Template de LP</label>
              <select className="select-field mt-1 w-full" value={editing?.templateNome || ""} onChange={e => {
                const tpl = templates.find(t => t.nome === e.target.value);
                setEditing(p => ({ ...p, templateNome: e.target.value, templateId: tpl?.id || 0 }));
              }}>
                <option value="">Selecionar...</option>
                {templates.filter(t => t.status === "Ativo").map(t => <option key={t.id}>{t.nome}</option>)}
              </select>
            </div>
            <div><label className="text-xs font-medium text-muted-foreground">Affiliate Link</label><input className="input-field mt-1" value={editing?.affiliateLink || ""} onChange={e => setEditing(p => ({ ...p, affiliateLink: e.target.value }))} /></div>
            {editing?.slug && (
              <div className="p-3 rounded-lg bg-secondary/50 border border-border">
                <span className="text-[10px] text-muted-foreground uppercase">URL Pública Gerada</span>
                <p className="font-mono text-sm text-accent mt-1">https://playbet.com/i/{editing.slug}</p>
              </div>
            )}
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
