import { useState } from "react";
import { Plus, Copy, Edit, XCircle, CopyPlus, Search, Eye, Link2, CheckCircle, Globe, AlertTriangle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { initialInfluencerLPs, initialLPTemplates, initialInfluencers, initialLinks, initialJogos, initialPlataformas } from "@/data/mockData";
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
  const [filterInfluencer, setFilterInfluencer] = useState("Todos");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<InfluencerLP> | null>(null);
  const [detailOpen, setDetailOpen] = useState<InfluencerLP | null>(null);
  const [validationTab, setValidationTab] = useState(false);

  const templates = initialLPTemplates;
  const influencers = initialInfluencers;

  const filtered = data.filter(lp => {
    if (search && !lp.influencerNome.toLowerCase().includes(search.toLowerCase()) && !lp.slug.toLowerCase().includes(search.toLowerCase()) && !lp.templateNome.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterTemplate !== "Todos" && lp.templateNome !== filterTemplate) return false;
    if (filterStatus !== "Todos" && lp.status !== filterStatus) return false;
    if (filterInfluencer !== "Todos" && lp.influencerNome !== filterInfluencer) return false;
    return true;
  });

  // Validation checks
  const slugDuplicates = data.filter((lp, i) => data.findIndex(x => x.slug === lp.slug) !== i);
  const lpsWithoutLink = data.filter(lp => !lp.affiliateLink);
  const inflWithoutLP = influencers.filter(i => i.status === "Ativo" && !data.some(lp => lp.influencerId === i.id));
  const templatesSemUso = templates.filter(t => t.status === "Ativo" && !data.some(lp => lp.templateId === t.id));
  const hasValidationIssues = slugDuplicates.length > 0 || lpsWithoutLink.length > 0 || inflWithoutLP.length > 0 || templatesSemUso.length > 0;

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
    // Check slug duplicate
    const slugExists = data.some(lp => lp.slug === editing.slug && lp.id !== editing.id);
    if (slugExists) {
      toast({ title: "Erro", description: "Esse slug já está em uso!", variant: "destructive" });
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
    const newSlug = `${lp.slug}-${newId}`;
    setData(prev => [...prev, { ...lp, id: newId, slug: newSlug, urlPublica: `/i/${newSlug}`, cliques: 0 }]);
    toast({ title: "Configuração duplicada", description: `Novo slug: ${newSlug}` });
  };

  const toggleStatus = (lp: InfluencerLP) => {
    setData(prev => prev.map(x => x.id === lp.id ? { ...x, status: x.status === "Ativo" ? "Inativo" as const : "Ativo" as const } : x));
    toast({ title: lp.status === "Ativo" ? "Desativado" : "Ativado" });
  };

  const uniqueInfluencers = [...new Set(data.map(l => l.influencerNome))];

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: "Gestão de Ativos", path: "/link-engine" }, { label: "Engine de Links" }]} />
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div><h1 className="page-header">Engine de Links</h1><p className="page-subtitle">Distribuição centralizada de LPs por influenciador — gestão de vínculos e rastreio</p></div>
        <div className="flex gap-2">
          <ExportDropdown data={data.map(({ id, influencerNome, slug, templateNome, affiliateLink, urlPublica, cliques, status }) => ({ id, influencerNome, slug, templateNome, affiliateLink, urlPublica, cliques, status }))} filename="engine-links-playbet" />
          <button className="btn-primary" onClick={openCreate}><Plus size={14} /> Criar Vínculo</button>
        </div>
      </div>

      {/* Atalhos */}
      <div className="flex flex-wrap gap-2">
        <button className="btn-ghost text-xs" onClick={() => navigate("/influencers")}>→ Influencers</button>
        <button className="btn-ghost text-xs" onClick={() => navigate("/lp-templates")}>→ Templates de LP</button>
        <button className="btn-ghost text-xs" onClick={() => navigate("/landing-pages")}>→ Landing Pages</button>
        <button className="btn-ghost text-xs" onClick={() => navigate("/links")}>→ Links Afiliados</button>
        <button className="btn-ghost text-xs" onClick={() => navigate("/hubs")}>→ Hubs</button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <div className="stat-card border-l-2 border-l-primary"><span className="text-[10px] text-muted-foreground uppercase">Total Vínculos</span><p className="text-xl font-bold">{data.length}</p></div>
        <div className="stat-card border-l-2 border-l-success"><span className="text-[10px] text-muted-foreground uppercase">Ativos</span><p className="text-xl font-bold">{data.filter(l => l.status === "Ativo").length}</p></div>
        <div className="stat-card border-l-2 border-l-accent"><span className="text-[10px] text-muted-foreground uppercase">Cliques Totais</span><p className="text-xl font-bold">{data.reduce((a, l) => a + l.cliques, 0).toLocaleString()}</p></div>
        <div className="stat-card border-l-2 border-l-info"><span className="text-[10px] text-muted-foreground uppercase">Templates</span><p className="text-xl font-bold">{new Set(data.map(l => l.templateId)).size}</p></div>
        <div className={`stat-card border-l-2 ${hasValidationIssues ? "border-l-warning cursor-pointer hover:bg-secondary/40" : "border-l-success"} transition-colors`} onClick={() => hasValidationIssues && setValidationTab(!validationTab)}>
          <span className="text-[10px] text-muted-foreground uppercase">Integridade</span>
          <p className={`text-xl font-bold ${hasValidationIssues ? "text-warning" : "text-success"}`}>{hasValidationIssues ? "Atenção" : "OK"}</p>
        </div>
      </div>

      {/* Validation Panel */}
      {validationTab && (
        <div className="glass-card p-5 border-warning/30 animate-fade-in space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="section-title mb-0 flex items-center gap-2"><AlertTriangle size={15} className="text-warning" /> Validação de Estrutura</h3>
            <button className="btn-ghost text-xs" onClick={() => setValidationTab(false)}>Fechar</button>
          </div>
          {slugDuplicates.length > 0 && (
            <div className="p-3 rounded-lg border border-destructive/30 bg-destructive/5">
              <p className="text-xs font-medium text-destructive">⚠ Slugs duplicados: {slugDuplicates.map(l => l.slug).join(", ")}</p>
            </div>
          )}
          {lpsWithoutLink.length > 0 && (
            <div className="p-3 rounded-lg border border-warning/30 bg-warning/5">
              <p className="text-xs font-medium text-warning">⚠ {lpsWithoutLink.length} vínculo(s) sem affiliate link: {lpsWithoutLink.map(l => l.influencerNome).join(", ")}</p>
            </div>
          )}
          {inflWithoutLP.length > 0 && (
            <div className="p-3 rounded-lg border border-info/30 bg-info/5 cursor-pointer" onClick={() => navigate("/influencers")}>
              <p className="text-xs font-medium text-info">⚠ {inflWithoutLP.length} influencer(s) ativo(s) sem LP: {inflWithoutLP.map(i => i.nome).join(", ")}</p>
            </div>
          )}
          {templatesSemUso.length > 0 && (
            <div className="p-3 rounded-lg border border-muted/30 bg-muted/10 cursor-pointer" onClick={() => navigate("/lp-templates")}>
              <p className="text-xs font-medium text-muted-foreground">⚠ {templatesSemUso.length} template(s) sem uso: {templatesSemUso.map(t => t.nome).join(", ")}</p>
            </div>
          )}
          {!hasValidationIssues && <p className="text-sm text-success">✓ Nenhum problema de integridade encontrado.</p>}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="flex items-center gap-2 bg-secondary/50 border border-border rounded-lg px-3 py-1.5 flex-1 max-w-xs">
          <Search size={13} className="text-muted-foreground shrink-0" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar influencer, slug ou template..." className="bg-transparent text-xs text-foreground placeholder:text-muted-foreground focus:outline-none w-full" />
        </div>
        <select className="select-field" value={filterInfluencer} onChange={e => setFilterInfluencer(e.target.value)}>
          <option>Todos</option>{uniqueInfluencers.map(i => <option key={i}>{i}</option>)}
        </select>
        <select className="select-field" value={filterTemplate} onChange={e => setFilterTemplate(e.target.value)}>
          <option>Todos</option>{templates.map(t => <option key={t.id}>{t.nome}</option>)}
        </select>
        <select className="select-field" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option>Todos</option><option>Ativo</option><option>Inativo</option>
        </select>
      </div>

      {/* Table */}
      <div className="glass-card overflow-x-auto">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <Link2 size={40} className="mb-3 opacity-30" />
            <p className="text-sm font-medium">Nenhum vínculo encontrado</p>
          </div>
        ) : (
          <table className="data-table">
            <thead><tr><th>Influenciador</th><th>Slug</th><th>Landing Base</th><th>Affiliate Link</th><th>URL Pública</th><th>Cliques</th><th>Última Atividade</th><th>Status</th><th>Ações</th></tr></thead>
            <tbody>
              {filtered.map(lp => {
                const hasSlugDupe = data.filter(x => x.slug === lp.slug).length > 1;
                return (
                  <tr key={lp.id} className={hasSlugDupe ? "bg-destructive/5" : !lp.affiliateLink ? "bg-warning/5" : ""}>
                    <td>
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-[9px] font-bold text-accent">{lp.influencerNome.charAt(0)}</div>
                        <span className="font-medium text-xs cursor-pointer hover:text-accent transition-colors" onClick={() => navigate(`/influencers/${lp.influencerId}`)}>{lp.influencerNome}</span>
                      </div>
                    </td>
                    <td className="font-mono text-xs text-accent">
                      {lp.slug}
                      {hasSlugDupe && <span className="badge-danger text-[8px] ml-1">DUPLICADO</span>}
                    </td>
                    <td className="text-xs cursor-pointer hover:text-accent transition-colors" onClick={() => navigate("/lp-templates")}>{lp.templateNome}</td>
                    <td className="text-xs max-w-[150px] truncate text-muted-foreground">{lp.affiliateLink || <span className="text-warning">⚠ Sem link</span>}</td>
                    <td className="font-mono text-xs text-accent">{lp.urlPublica}</td>
                    <td className="font-medium">{lp.cliques.toLocaleString()}</td>
                    <td className="text-[10px] text-muted-foreground whitespace-nowrap">{lp.ultimaAtividade}</td>
                    <td><span className={lp.status === "Ativo" ? "badge-success" : "badge-danger"}>{lp.status}</span></td>
                    <td>
                      <div className="flex gap-0.5">
                        <button onClick={() => copyUrl(lp)} className="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors" title="Copiar URL"><Copy size={12} /></button>
                        <button onClick={() => setDetailOpen(lp)} className="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors" title="Detalhes"><Eye size={12} /></button>
                        <button onClick={() => openEdit(lp)} className="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors" title="Editar"><Edit size={12} /></button>
                        <button onClick={() => duplicate(lp)} className="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors" title="Duplicar"><CopyPlus size={12} /></button>
                        <button onClick={() => toggleStatus(lp)} className={`p-1 rounded hover:bg-secondary transition-colors ${lp.status === "Ativo" ? "text-muted-foreground hover:text-destructive" : "text-muted-foreground hover:text-success"}`} title={lp.status === "Ativo" ? "Desativar" : "Ativar"}>
                          {lp.status === "Ativo" ? <XCircle size={12} /> : <CheckCircle size={12} />}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Detail Modal */}
      <Dialog open={!!detailOpen} onOpenChange={() => setDetailOpen(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Detalhes do Vínculo</DialogTitle></DialogHeader>
          {detailOpen && (
            <div className="space-y-4 py-2 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div><span className="text-xs text-muted-foreground">Influenciador</span><p className="font-medium">{detailOpen.influencerNome}</p></div>
                <div><span className="text-xs text-muted-foreground">Slug</span><p className="font-mono text-accent">{detailOpen.slug}</p></div>
                <div><span className="text-xs text-muted-foreground">Template</span><p>{detailOpen.templateNome}</p></div>
                <div><span className="text-xs text-muted-foreground">Status</span><p><span className={detailOpen.status === "Ativo" ? "badge-success" : "badge-danger"}>{detailOpen.status}</span></p></div>
              </div>
              <div><span className="text-xs text-muted-foreground">URL Pública</span><p className="font-mono text-accent">https://playbet.com{detailOpen.urlPublica}</p></div>
              <div><span className="text-xs text-muted-foreground">Affiliate Link</span><p className="text-xs break-all">{detailOpen.affiliateLink || "—"}</p></div>
              <div className="grid grid-cols-2 gap-3">
                <div><span className="text-xs text-muted-foreground">Cliques</span><p className="font-bold text-lg">{detailOpen.cliques.toLocaleString()}</p></div>
                <div><span className="text-xs text-muted-foreground">Última Atividade</span><p className="text-xs">{detailOpen.ultimaAtividade}</p></div>
              </div>
              <div className="border-t border-border pt-3 text-xs text-muted-foreground space-y-1">
                <p>🔗 Prepared for Supabase: clicks table will track per-influencer metrics</p>
                <p>📊 Future: real-time analytics, referrer breakdown, device stats</p>
              </div>
            </div>
          )}
          <DialogFooter className="flex-wrap gap-2">
            <button className="btn-primary" onClick={() => { if (detailOpen) copyUrl(detailOpen); }}>Copiar URL</button>
            <button className="btn-ghost" onClick={() => { if (detailOpen) navigate(`/influencers/${detailOpen.influencerId}`); }}>Ver Influencer</button>
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
                  setEditing(p => ({ ...p, influencerNome: e.target.value, influencerId: inf?.id || 0, slug: inf?.slug || p?.slug || "", affiliateLink: inf?.affiliate_link || p?.affiliateLink || "" }));
                }}>
                  <option value="">Selecionar...</option>
                  {influencers.filter(i => i.status !== "Inativo").map(i => <option key={i.id}>{i.nome}</option>)}
                </select>
              </div>
              <div><label className="text-xs font-medium text-muted-foreground">Slug *</label><input className="input-field mt-1" value={editing?.slug || ""} onChange={e => setEditing(p => ({ ...p, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") }))} placeholder="ex: rafa" /></div>
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
