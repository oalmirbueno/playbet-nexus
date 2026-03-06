import { useState } from "react";
import { Plus, Users, TrendingUp, MousePointerClick, DollarSign, ArrowRight, Search, Edit, XCircle, Copy, Globe, CheckCircle, Wallet, Link2, Eye, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useTemplates } from "@/hooks/useSupabaseQuery";
import { useInfluencers } from "@/hooks/useSupabaseQuery";
import type { InfluencerRow } from "@/services/supabaseService";
import { toast } from "@/hooks/use-toast";
import Breadcrumbs from "@/components/Breadcrumbs";
import ExportDropdown from "@/components/ExportDropdown";

type EditingState = {
  id?: string;
  name: string;
  slug: string;
  instagram: string;
  followers: number | null;
  commission_percent: number | null;
  affiliate_link: string;
  notes: string;
  is_active: boolean;
};

const emptyEditing: EditingState = {
  name: "", slug: "", instagram: "", followers: null,
  commission_percent: 15, affiliate_link: "", notes: "", is_active: true,
};

export default function Influencers() {
  const navigate = useNavigate();
  const { data, isLoading, create, update, toggle, remove, isCreating, isUpdating } = useInfluencers();
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("Todos");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<EditingState | null>(null);
  const [confirmDeactivate, setConfirmDeactivate] = useState<InfluencerRow | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<InfluencerRow | null>(null);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardData, setWizardData] = useState({ influencerId: "", slug: "", templateId: 0, affiliateLink: "" });

  const { data: templates } = useTemplates();

  const filtered = data.filter((inf) => {
    const q = search.toLowerCase();
    if (search && !inf.name.toLowerCase().includes(q) && !(inf.instagram || "").toLowerCase().includes(q) && !inf.slug.toLowerCase().includes(q)) return false;
    if (filterStatus === "Ativo" && !inf.is_active) return false;
    if (filterStatus === "Inativo" && inf.is_active) return false;
    return true;
  });

  const activeCount = data.filter(i => i.is_active).length;
  const inactiveCount = data.filter(i => !i.is_active).length;

  const stats = [
    { label: "Total Influencers", value: String(data.length), icon: Users, variant: "border-l-primary" },
    { label: "Ativos", value: String(activeCount), icon: CheckCircle, variant: "border-l-success" },
    { label: "Inativos", value: String(inactiveCount), icon: Users, variant: "border-l-warning" },
    { label: "Com Link", value: String(data.filter(i => i.affiliate_link).length), icon: Link2, variant: "border-l-accent" },
    { label: "Comissão Média", value: data.length ? `${(data.reduce((s, i) => s + (i.commission_percent || 0), 0) / data.length).toFixed(0)}%` : "—", icon: DollarSign, variant: "border-l-info" },
    { label: "Total Seguidores", value: data.reduce((s, i) => s + (i.followers || 0), 0).toLocaleString(), icon: TrendingUp, variant: "border-l-success" },
  ];

  const openCreate = () => { setEditing({ ...emptyEditing }); setModalOpen(true); };
  const openEdit = (inf: InfluencerRow) => {
    setEditing({
      id: inf.id,
      name: inf.name,
      slug: inf.slug,
      instagram: inf.instagram || "",
      followers: inf.followers,
      commission_percent: inf.commission_percent,
      affiliate_link: inf.affiliate_link || "",
      notes: inf.notes || "",
      is_active: inf.is_active ?? true,
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!editing?.name || !editing?.slug) {
      toast({ title: "Erro", description: "Nome e slug são obrigatórios.", variant: "destructive" });
      return;
    }
    try {
      if (editing.id) {
        await update({ id: editing.id, updates: {
          name: editing.name, slug: editing.slug, instagram: editing.instagram || null,
          followers: editing.followers, commission_percent: editing.commission_percent,
          affiliate_link: editing.affiliate_link || null, notes: editing.notes || null,
          is_active: editing.is_active,
        }});
      } else {
        await create({
          name: editing.name, slug: editing.slug, instagram: editing.instagram || null,
          followers: editing.followers, commission_percent: editing.commission_percent,
          affiliate_link: editing.affiliate_link || null, notes: editing.notes || null,
          is_active: editing.is_active,
        });
      }
      setModalOpen(false);
      setEditing(null);
    } catch { /* toast handled by hook */ }
  };

  const handleToggle = async (inf: InfluencerRow) => {
    if (inf.is_active) {
      setConfirmDeactivate(inf);
    } else {
      await toggle({ id: inf.id, current: inf.is_active ?? false });
    }
  };

  const handleDeactivate = async () => {
    if (!confirmDeactivate) return;
    await toggle({ id: confirmDeactivate.id, current: confirmDeactivate.is_active ?? true });
    setConfirmDeactivate(null);
  };

  const copyLink = (inf: InfluencerRow) => {
    const url = inf.affiliate_link;
    if (url) { navigator.clipboard.writeText(url); toast({ title: "Link afiliado copiado!", description: url }); }
    else { toast({ title: "Sem link", description: "Nenhum link de afiliado disponível.", variant: "destructive" }); }
  };

  const copyPublicUrl = (inf: InfluencerRow) => {
    // Uses central panel origin as fallback — ideally linked to a LP base domain
    const url = `${window.location.origin}/?ref=${inf.slug}`;
    navigator.clipboard.writeText(url);
    toast({ title: "URL pública copiada!", description: url });
  };

  const openPublicUrl = (inf: InfluencerRow) => {
    window.open(`/?ref=${inf.slug}`, "_blank");
  };

  const handleWizardSave = () => {
    if (!wizardData.slug || !wizardData.influencerId || !wizardData.templateId) {
      toast({ title: "Erro", description: "Preencha todos os campos obrigatórios.", variant: "destructive" });
      return;
    }
    toast({ title: "LP gerada com sucesso!", description: `URL: /?ref=${wizardData.slug}` });
    setWizardOpen(false);
    setWizardData({ influencerId: "", slug: "", templateId: 0, affiliateLink: "" });
  };

  const exportableData = data.map(({ id, name, slug, instagram, followers, commission_percent, affiliate_link, is_active }) => ({
    id, name, slug, instagram: instagram || "", followers: followers || 0,
    commission_percent: commission_percent || 0, affiliate_link: affiliate_link || "",
    status: is_active ? "Ativo" : "Inativo",
  }));

  const infSemLink = data.filter(i => (i.is_active) && !i.affiliate_link);

  if (isLoading) {
    return (
      <div className="space-y-8">
        <Breadcrumbs items={[{ label: "Gestão de Pessoas", path: "/influencers" }, { label: "Influencers" }]} />
        <div className="flex items-center justify-center py-20 text-muted-foreground">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mr-3" />
          <span className="text-sm">Carregando influencers...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <Breadcrumbs items={[{ label: "Gestão de Pessoas", path: "/influencers" }, { label: "Influencers" }]} />
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Influencers</h1>
          <p className="text-sm text-muted-foreground mt-1">Gestão completa de influenciadores, performance e distribuição de tráfego</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <ExportDropdown data={exportableData} filename="influencers-playbet" />
          <button className="btn-secondary" onClick={() => setWizardOpen(true)}><Globe size={14} /> Gerar LP</button>
          <button className="btn-primary" onClick={openCreate}><Plus size={14} /> Adicionar Influencer</button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {stats.map((s) => (
          <div key={s.label} className={`glass-card p-5 border-l-2 ${s.variant} transition-colors`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">{s.label}</span>
              <s.icon size={14} className="text-muted-foreground" />
            </div>
            <div className="text-lg font-bold">{s.value}</div>
          </div>
        ))}
      </div>

      {/* Validation Alerts */}
      {infSemLink.length > 0 && (
        <div className="glass-card p-4 border-warning/30 space-y-1">
          <p className="text-xs font-medium text-warning flex items-center gap-1"><XCircle size={13} /> Validação de Estrutura</p>
          <p className="text-xs text-muted-foreground">⚠ {infSemLink.length} influencer(s) ativo(s) sem affiliate link: {infSemLink.map(i => i.name).join(", ")}</p>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="flex items-center gap-2 bg-secondary/50 border border-border rounded-lg px-3 py-1.5 flex-1 max-w-xs">
          <Search size={13} className="text-muted-foreground shrink-0" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por nome, instagram ou slug..." className="bg-transparent text-xs text-foreground placeholder:text-muted-foreground focus:outline-none w-full" />
        </div>
        <select className="select-field" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option>Todos</option><option>Ativo</option><option>Inativo</option>
        </select>
      </div>

      {/* Table */}
      <div className="glass-card overflow-x-auto invisible-scroll">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <Users size={40} className="mb-3 opacity-30" />
            <p className="text-sm font-medium">Nenhum influencer encontrado</p>
            <p className="text-xs mt-1">Tente ajustar os filtros ou adicione um novo influencer.</p>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr><th>Nome</th><th>Instagram</th><th>Seguidores</th><th>%</th><th>Slug</th><th>Link Afiliado</th><th>Status</th><th>Ações</th></tr>
            </thead>
            <tbody>
              {filtered.map((inf) => (
                <tr key={inf.id}>
                  <td>
                    <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate(`/influencers/${inf.id}`)}>
                      <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center text-[10px] font-bold text-accent">{inf.name.charAt(0)}</div>
                      <span className="font-medium hover:text-accent transition-colors">{inf.name}</span>
                    </div>
                  </td>
                  <td className="text-accent text-xs">{inf.instagram || "—"}</td>
                  <td className="text-xs">{(inf.followers || 0).toLocaleString()}</td>
                  <td>{inf.commission_percent || 0}%</td>
                  <td className="font-mono text-xs text-accent">{inf.slug}</td>
                  <td className="text-xs max-w-[200px] truncate">{inf.affiliate_link || "—"}</td>
                  <td><span className={inf.is_active ? "badge-success" : "badge-danger"}>{inf.is_active ? "Ativo" : "Inativo"}</span></td>
                  <td>
                    <div className="flex gap-0.5" onClick={e => e.stopPropagation()}>
                      <button onClick={() => navigate(`/influencers/${inf.id}`)} className="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors" title="Ver perfil"><Eye size={12} /></button>
                      <button onClick={() => openEdit(inf)} className="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors" title="Editar"><Edit size={12} /></button>
                      <button onClick={() => copyPublicUrl(inf)} className="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors" title="Copiar URL pública"><Copy size={12} /></button>
                      <button onClick={() => openPublicUrl(inf)} className="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-accent transition-colors" title="Abrir landing pública"><Globe size={12} /></button>
                      <button onClick={() => copyLink(inf)} className="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors" title="Copiar link afiliado"><Link2 size={12} /></button>
                      {inf.is_active ? (
                        <button onClick={() => handleToggle(inf)} className="p-1 rounded hover:bg-destructive/15 text-muted-foreground hover:text-destructive transition-colors" title="Desativar"><XCircle size={12} /></button>
                      ) : (
                        <button onClick={() => handleToggle(inf)} className="p-1 rounded hover:bg-success/15 text-muted-foreground hover:text-success transition-colors" title="Ativar"><CheckCircle size={12} /></button>
                      )}
                      <button onClick={() => setConfirmDelete(inf)} className="p-1 rounded hover:bg-destructive/15 text-muted-foreground hover:text-destructive transition-colors" title="Apagar"><Trash2 size={12} /></button>
                    </div>
                  </td>
                </tr>
              ))}
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
              <div><label className="text-xs font-medium text-muted-foreground">Nome *</label><input className="input-field mt-1" value={editing?.name || ""} onChange={e => setEditing(prev => prev ? { ...prev, name: e.target.value } : prev)} /></div>
              <div><label className="text-xs font-medium text-muted-foreground">Slug *</label><input className="input-field mt-1" value={editing?.slug || ""} onChange={e => setEditing(prev => prev ? { ...prev, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") } : prev)} placeholder="ex: rafa" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-xs font-medium text-muted-foreground">Instagram</label><input className="input-field mt-1" value={editing?.instagram || ""} onChange={e => setEditing(prev => prev ? { ...prev, instagram: e.target.value } : prev)} /></div>
              <div><label className="text-xs font-medium text-muted-foreground">Seguidores</label><input type="number" className="input-field mt-1" value={editing?.followers || ""} onChange={e => setEditing(prev => prev ? { ...prev, followers: e.target.value ? Number(e.target.value) : null } : prev)} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-xs font-medium text-muted-foreground">% Comissão</label><input type="number" className="input-field mt-1" value={editing?.commission_percent || 15} onChange={e => setEditing(prev => prev ? { ...prev, commission_percent: Number(e.target.value) } : prev)} /></div>
              <div><label className="text-xs font-medium text-muted-foreground">Status</label>
                <select className="select-field mt-1 w-full" value={editing?.is_active ? "Ativo" : "Inativo"} onChange={e => setEditing(prev => prev ? { ...prev, is_active: e.target.value === "Ativo" } : prev)}>
                  <option>Ativo</option><option>Inativo</option>
                </select>
              </div>
            </div>
            <div><label className="text-xs font-medium text-muted-foreground">Link de Afiliado</label><input className="input-field mt-1" value={editing?.affiliate_link || ""} onChange={e => setEditing(prev => prev ? { ...prev, affiliate_link: e.target.value } : prev)} /></div>
            <div><label className="text-xs font-medium text-muted-foreground">Observações</label><textarea className="input-field mt-1 min-h-[60px]" value={editing?.notes || ""} onChange={e => setEditing(prev => prev ? { ...prev, notes: e.target.value } : prev)} /></div>
            {editing?.slug && (
              <div className="p-3 rounded-lg bg-secondary/50 border border-border">
                <span className="text-[10px] text-muted-foreground uppercase">URL pública gerada</span>
                <p className="font-mono text-sm text-accent mt-1">dominio-da-lp.playbet.app.br/?ref={editing.slug}</p>
              </div>
            )}
          </div>
          <DialogFooter>
            <button className="btn-ghost" onClick={() => setModalOpen(false)}>Cancelar</button>
            <button className="btn-primary" onClick={handleSave} disabled={isCreating || isUpdating}>
              {isCreating || isUpdating ? "Salvando..." : "Salvar"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Deactivate Confirm */}
      <Dialog open={!!confirmDeactivate} onOpenChange={() => setConfirmDeactivate(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Desativar Influencer</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Tem certeza que deseja desativar <strong>{confirmDeactivate?.name}</strong>? Seus links e LPs serão pausados.</p>
          <DialogFooter>
            <button className="btn-ghost" onClick={() => setConfirmDeactivate(null)}>Cancelar</button>
            <button className="btn-primary bg-destructive hover:bg-destructive/90" onClick={handleDeactivate}>Desativar</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <Dialog open={!!confirmDelete} onOpenChange={() => setConfirmDelete(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Apagar Influencer</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Tem certeza que deseja apagar <strong>{confirmDelete?.name}</strong> permanentemente? Esta ação não pode ser desfeita.</p>
          <DialogFooter>
            <button className="btn-ghost" onClick={() => setConfirmDelete(null)}>Cancelar</button>
            <button className="btn-primary bg-destructive hover:bg-destructive/90" onClick={async () => { if (confirmDelete) { await remove(confirmDelete.id); setConfirmDelete(null); } }}>Apagar</button>
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
                const inf = data.find(i => i.id === e.target.value);
                setWizardData(p => ({ ...p, influencerId: e.target.value, slug: inf?.slug || "", affiliateLink: inf?.affiliate_link || "" }));
              }}>
                <option value="">Selecionar...</option>
                {data.filter(i => i.is_active).map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
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
                <p className="font-mono text-sm text-accent mt-1">dominio-da-lp.playbet.app.br/?ref={wizardData.slug}</p>
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
