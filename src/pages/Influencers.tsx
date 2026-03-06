import { useState } from "react";
import { Plus, Users, TrendingUp, MousePointerClick, DollarSign, ArrowRight, Search, Edit, XCircle, Copy, Globe, CheckCircle, Wallet, Link2, Eye } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { initialInfluencers, initialInfluencerLPs, initialLPTemplates } from "@/data/mockData";
import type { Influencer } from "@/types";
import { toast } from "@/hooks/use-toast";
import Breadcrumbs from "@/components/Breadcrumbs";
import ExportDropdown from "@/components/ExportDropdown";

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
  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardData, setWizardData] = useState({ influencerId: 0, slug: "", templateId: 0, affiliateLink: "" });

  const lps = initialInfluencerLPs;
  const templates = initialLPTemplates;

  const filtered = data.filter((inf) => {
    if (search && !inf.nome.toLowerCase().includes(search.toLowerCase()) && !inf.insta.toLowerCase().includes(search.toLowerCase()) && !inf.slug.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterStatus !== "Todos" && inf.status !== filterStatus) return false;
    if (filterTipo !== "Todos" && inf.tipo !== filterTipo) return false;
    return true;
  });

  const topReceita = [...data].sort((a, b) => b.receita - a.receita)[0];
  const topSaldo = [...data].sort((a, b) => b.saldo - a.saldo)[0];

  const stats = [
    { label: "Total Influencers", value: String(data.length), icon: Users, variant: "border-l-primary" },
    { label: "Ativos", value: String(data.filter(i => i.status === "Ativo").length), icon: CheckCircle, variant: "border-l-success" },
    { label: "Pausados", value: String(data.filter(i => i.status === "Pausado").length), icon: Users, variant: "border-l-warning" },
    { label: "Maior Faturamento", value: topReceita ? `${topReceita.nome.split(" ")[0]} — R$ ${(topReceita.receita / 1000).toFixed(1)}K` : "—", icon: DollarSign, variant: "border-l-accent", path: topReceita ? `/influencers/${topReceita.id}` : undefined },
    { label: "Maior CTR", value: "Pedro L. — 12.8%", icon: MousePointerClick, variant: "border-l-info" },
    { label: "Maior Saldo Disp.", value: topSaldo ? `${topSaldo.nome.split(" ")[0]} — R$ ${topSaldo.saldo.toLocaleString()}` : "—", icon: Wallet, variant: "border-l-success", path: topSaldo ? `/influencers/${topSaldo.id}` : undefined },
  ];

  const openCreate = () => { setEditing({ ...emptyInfluencer, id: 0 }); setModalOpen(true); };
  const openEdit = (inf: Influencer) => { setEditing({ ...inf }); setModalOpen(true); };

  const handleSave = () => {
    if (!editing?.nome || !editing?.slug) {
      toast({ title: "Erro", description: "Nome e slug são obrigatórios.", variant: "destructive" });
      return;
    }
    // Check slug duplicity
    const slugExists = data.some(i => i.slug === editing.slug && i.id !== editing.id);
    if (slugExists) {
      toast({ title: "Erro", description: "Esse slug já está em uso por outro influencer.", variant: "destructive" });
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

  const handleActivate = (inf: Influencer) => {
    setData(prev => prev.map(i => i.id === inf.id ? { ...i, status: "Ativo" as const, is_active: true } : i));
    toast({ title: "Influencer ativado", description: `${inf.nome} foi reativado.` });
  };

  const handleDeactivate = () => {
    if (!confirmDeactivate) return;
    setData(prev => prev.map(i => i.id === confirmDeactivate.id ? { ...i, status: "Inativo" as const, is_active: false } : i));
    toast({ title: "Influencer desativado", description: `${confirmDeactivate.nome} foi desativado.` });
    setConfirmDeactivate(null);
  };

  const copyLink = (inf: Influencer) => {
    const lp = lps.find(l => l.influencerId === inf.id);
    const url = lp ? `https://playbet.com${lp.urlPublica}` : inf.affiliate_link;
    if (url) { navigator.clipboard.writeText(url); toast({ title: "Link copiado!", description: url }); }
    else { toast({ title: "Sem link", description: "Nenhum link disponível.", variant: "destructive" }); }
  };

  const handleWizardSave = () => {
    if (!wizardData.slug || !wizardData.influencerId || !wizardData.templateId) {
      toast({ title: "Erro", description: "Preencha todos os campos obrigatórios.", variant: "destructive" });
      return;
    }
    toast({ title: "LP gerada com sucesso!", description: `URL: /i/${wizardData.slug}` });
    setWizardOpen(false);
    setWizardData({ influencerId: 0, slug: "", templateId: 0, affiliateLink: "" });
  };

  const getInfLP = (infId: number) => lps.find(l => l.influencerId === infId);

  const exportableData = data.map(({ id, nome, slug, insta, seg, tipo, perc, jogos, links, receita, saldo, status, affiliate_link }) => ({ id, nome, slug, insta, seg, tipo, perc, jogos, links, receita, saldo, status, affiliate_link }));

  // Validation alerts
  const infSemLP = data.filter(i => i.status === "Ativo" && !lps.some(l => l.influencerId === i.id));
  const infSemLink = data.filter(i => i.status === "Ativo" && !i.affiliate_link);

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: "Gestão de Pessoas", path: "/influencers" }, { label: "Influencers" }]} />
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="page-header">Influencers</h1>
          <p className="page-subtitle">Gestão completa de influenciadores, performance e distribuição de tráfego</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <ExportDropdown data={exportableData} filename="influencers-playbet" />
          <button className="btn-secondary" onClick={() => setWizardOpen(true)}><Globe size={14} /> Gerar LP</button>
          <button className="btn-primary" onClick={openCreate}><Plus size={14} /> Adicionar Influencer</button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
        {stats.map((s) => (
          <div key={s.label} onClick={() => s.path && navigate(s.path)} className={`stat-card border-l-2 ${s.variant} ${s.path ? "cursor-pointer hover:bg-secondary/40" : ""} transition-colors`}>
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">{s.label}</span>
              <s.icon size={14} className="text-muted-foreground" />
            </div>
            <div className="text-sm font-bold">{s.value}</div>
          </div>
        ))}
      </div>

      {/* Validation Alerts */}
      {(infSemLP.length > 0 || infSemLink.length > 0) && (
        <div className="glass-card p-4 border-warning/30 space-y-1">
          <p className="text-xs font-medium text-warning flex items-center gap-1"><XCircle size={13} /> Validação de Estrutura</p>
          {infSemLP.length > 0 && <p className="text-xs text-muted-foreground">⚠ {infSemLP.length} influencer(s) ativo(s) sem LP vinculada: {infSemLP.map(i => i.nome).join(", ")}</p>}
          {infSemLink.length > 0 && <p className="text-xs text-muted-foreground">⚠ {infSemLink.length} influencer(s) ativo(s) sem affiliate link: {infSemLink.map(i => i.nome).join(", ")}</p>}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="flex items-center gap-2 bg-secondary/50 border border-border rounded-lg px-3 py-1.5 flex-1 max-w-xs">
          <Search size={13} className="text-muted-foreground shrink-0" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por nome, instagram ou slug..." className="bg-transparent text-xs text-foreground placeholder:text-muted-foreground focus:outline-none w-full" />
        </div>
        <select className="select-field" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option>Todos</option><option>Ativo</option><option>Pausado</option><option>Novo</option><option>Inativo</option>
        </select>
        <select className="select-field" value={filterTipo} onChange={e => setFilterTipo(e.target.value)}>
          <option>Todos</option><option>Premium</option><option>Standard</option><option>Starter</option>
        </select>
      </div>

      {/* Table */}
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
              <tr><th>Nome</th><th>Instagram</th><th>Seg.</th><th>Tipo</th><th>%</th><th>Slug</th><th>LP Principal</th><th>Links</th><th>Receita</th><th>Saldo Disp.</th><th>Último Saque</th><th>Status</th><th>Ações</th></tr>
            </thead>
            <tbody>
              {filtered.map((inf) => {
                const infLp = getInfLP(inf.id);
                return (
                  <tr key={inf.id}>
                    <td>
                      <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate(`/influencers/${inf.id}`)}>
                        <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center text-[10px] font-bold text-accent">{inf.nome.charAt(0)}</div>
                        <span className="font-medium hover:text-accent transition-colors">{inf.nome}</span>
                      </div>
                    </td>
                    <td className="text-accent text-xs">{inf.insta}</td>
                    <td className="text-xs">{inf.seg}</td>
                    <td><span className={inf.tipo === "Premium" ? "badge-accent" : inf.tipo === "Standard" ? "badge-primary" : "badge-neutral"}>{inf.tipo}</span></td>
                    <td>{inf.perc}%</td>
                    <td className="font-mono text-xs text-accent">{inf.slug}</td>
                    <td className="text-xs">{infLp ? <span className="cursor-pointer hover:text-accent transition-colors" onClick={() => navigate("/link-engine")}>{infLp.templateNome}</span> : <span className="text-muted-foreground">—</span>}</td>
                    <td>{inf.links}</td>
                    <td className="font-medium">R$ {inf.receita.toLocaleString()}</td>
                    <td className="text-success font-medium">R$ {inf.saldo.toLocaleString()}</td>
                    <td className="text-xs text-muted-foreground whitespace-nowrap">{inf.ultimoSaque}</td>
                    <td><span className={inf.status === "Ativo" ? "badge-success" : inf.status === "Pausado" ? "badge-warning" : inf.status === "Novo" ? "badge-info" : "badge-danger"}>{inf.status}</span></td>
                    <td>
                      <div className="flex gap-0.5" onClick={e => e.stopPropagation()}>
                        <button onClick={() => navigate(`/influencers/${inf.id}`)} className="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors" title="Ver perfil"><Eye size={12} /></button>
                        <button onClick={() => openEdit(inf)} className="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors" title="Editar"><Edit size={12} /></button>
                        <button onClick={() => copyLink(inf)} className="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors" title="Copiar link"><Copy size={12} /></button>
                        {infLp && <button onClick={() => window.open(`/i/${inf.slug}`, "_blank")} className="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors" title="Abrir LP"><Globe size={12} /></button>}
                        {inf.status === "Inativo" ? (
                          <button onClick={() => handleActivate(inf)} className="p-1 rounded hover:bg-success/15 text-muted-foreground hover:text-success transition-colors" title="Ativar"><CheckCircle size={12} /></button>
                        ) : inf.status !== "Novo" ? (
                          <button onClick={() => setConfirmDeactivate(inf)} className="p-1 rounded hover:bg-destructive/15 text-muted-foreground hover:text-destructive transition-colors" title="Desativar"><XCircle size={12} /></button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Quick links */}
      <div className="flex flex-wrap gap-2">
        <button className="btn-ghost text-xs" onClick={() => navigate("/links")}>→ Links Afiliados</button>
        <button className="btn-ghost text-xs" onClick={() => navigate("/link-engine")}>→ Engine de Links</button>
        <button className="btn-ghost text-xs" onClick={() => navigate("/landing-pages")}>→ Landing Pages</button>
        <button className="btn-ghost text-xs" onClick={() => navigate("/lp-templates")}>→ Templates</button>
        <button className="btn-ghost text-xs" onClick={() => navigate("/saques")}>→ Saques</button>
        <button className="btn-ghost text-xs" onClick={() => navigate("/campanhas")}>→ Campanhas</button>
        <button className="btn-ghost text-xs" onClick={() => navigate("/comissoes")}>→ Comissões</button>
      </div>

      {/* Create/Edit Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editing?.id ? "Editar Influencer" : "Adicionar Influencer"}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-xs font-medium text-muted-foreground">Nome *</label><input className="input-field mt-1" value={editing?.nome || ""} onChange={e => setEditing(prev => ({ ...prev, nome: e.target.value }))} /></div>
              <div><label className="text-xs font-medium text-muted-foreground">Slug *</label><input className="input-field mt-1" value={editing?.slug || ""} onChange={e => setEditing(prev => ({ ...prev, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") }))} placeholder="ex: rafa" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-xs font-medium text-muted-foreground">Instagram</label><input className="input-field mt-1" value={editing?.insta || ""} onChange={e => setEditing(prev => ({ ...prev, insta: e.target.value }))} /></div>
              <div><label className="text-xs font-medium text-muted-foreground">Seguidores</label><input className="input-field mt-1" value={editing?.seg || ""} onChange={e => setEditing(prev => ({ ...prev, seg: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div><label className="text-xs font-medium text-muted-foreground">Tipo</label>
                <select className="select-field mt-1 w-full" value={editing?.tipo || "Standard"} onChange={e => setEditing(prev => ({ ...prev, tipo: e.target.value as Influencer["tipo"] }))}>
                  <option>Premium</option><option>Standard</option><option>Starter</option>
                </select>
              </div>
              <div><label className="text-xs font-medium text-muted-foreground">% Comissão</label><input type="number" className="input-field mt-1" value={editing?.perc || 15} onChange={e => setEditing(prev => ({ ...prev, perc: Number(e.target.value) }))} /></div>
              <div><label className="text-xs font-medium text-muted-foreground">Status</label>
                <select className="select-field mt-1 w-full" value={editing?.status || "Novo"} onChange={e => setEditing(prev => ({ ...prev, status: e.target.value as Influencer["status"] }))}>
                  <option>Ativo</option><option>Pausado</option><option>Novo</option><option>Inativo</option>
                </select>
              </div>
            </div>
            <div><label className="text-xs font-medium text-muted-foreground">Link de Afiliado</label><input className="input-field mt-1" value={editing?.affiliate_link || ""} onChange={e => setEditing(prev => ({ ...prev, affiliate_link: e.target.value }))} /></div>
            <div><label className="text-xs font-medium text-muted-foreground">Landing Template</label>
              <select className="select-field mt-1 w-full" value={editing?.landing_template || ""} onChange={e => setEditing(prev => ({ ...prev, landing_template: e.target.value }))}>
                <option value="">Selecionar...</option>
                {templates.map(t => <option key={t.id} value={t.nome}>{t.nome}</option>)}
              </select>
            </div>
            <div><label className="text-xs font-medium text-muted-foreground">Observações</label><textarea className="input-field mt-1 min-h-[60px]" value={editing?.observacoes || ""} onChange={e => setEditing(prev => ({ ...prev, observacoes: e.target.value }))} /></div>
            {editing?.slug && (
              <div className="p-3 rounded-lg bg-secondary/50 border border-border">
                <span className="text-[10px] text-muted-foreground uppercase">URL pública gerada</span>
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

      {/* Deactivate Confirm */}
      <Dialog open={!!confirmDeactivate} onOpenChange={() => setConfirmDeactivate(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Desativar Influencer</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Tem certeza que deseja desativar <strong>{confirmDeactivate?.nome}</strong>? Seus links e LPs serão pausados.</p>
          <DialogFooter>
            <button className="btn-ghost" onClick={() => setConfirmDeactivate(null)}>Cancelar</button>
            <button className="btn-primary bg-destructive hover:bg-destructive/90" onClick={handleDeactivate}>Desativar</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* LP Generation Wizard */}
      <Dialog open={wizardOpen} onOpenChange={setWizardOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Gerar LP para Influenciador</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-xs text-muted-foreground">Vincule um influenciador a um template de LP e gere uma URL pública única.</p>
            <div><label className="text-xs font-medium text-muted-foreground">Influenciador *</label>
              <select className="select-field mt-1 w-full" value={wizardData.influencerId} onChange={e => {
                const inf = data.find(i => i.id === Number(e.target.value));
                setWizardData(p => ({ ...p, influencerId: Number(e.target.value), slug: inf?.slug || "", affiliateLink: inf?.affiliate_link || "" }));
              }}>
                <option value={0}>Selecionar...</option>
                {data.filter(i => i.status !== "Inativo").map(i => <option key={i.id} value={i.id}>{i.nome}</option>)}
              </select>
            </div>
            <div><label className="text-xs font-medium text-muted-foreground">Slug *</label><input className="input-field mt-1" value={wizardData.slug} onChange={e => setWizardData(p => ({ ...p, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") }))} /></div>
            <div><label className="text-xs font-medium text-muted-foreground">Template de LP *</label>
              <select className="select-field mt-1 w-full" value={wizardData.templateId} onChange={e => setWizardData(p => ({ ...p, templateId: Number(e.target.value) }))}>
                <option value={0}>Selecionar...</option>
                {templates.filter(t => t.status === "Ativo").map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
              </select>
            </div>
            <div><label className="text-xs font-medium text-muted-foreground">Affiliate Link</label><input className="input-field mt-1" value={wizardData.affiliateLink} onChange={e => setWizardData(p => ({ ...p, affiliateLink: e.target.value }))} /></div>
            {wizardData.slug && (
              <div className="p-3 rounded-lg bg-secondary/50 border border-border">
                <span className="text-[10px] text-muted-foreground uppercase">URL Pública</span>
                <p className="font-mono text-sm text-accent mt-1">https://playbet.com/i/{wizardData.slug}</p>
              </div>
            )}
          </div>
          <DialogFooter>
            <button className="btn-ghost" onClick={() => setWizardOpen(false)}>Cancelar</button>
            <button className="btn-primary" onClick={handleWizardSave}>Gerar LP</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
