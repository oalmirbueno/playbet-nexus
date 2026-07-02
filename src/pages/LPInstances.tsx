import { useState } from "react";
import { Plus, Edit, Copy, Eye, XCircle, CheckCircle, Search, ExternalLink, AlertTriangle, Link2, Radio, Zap, Wand2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useLandingPageInstances, useLandingPages, useInfluencers, usePlatforms } from "@/hooks/useSupabaseQuery";
import { landingPageInstanceService } from "@/services/supabaseService";
import type { LandingPageInstanceRow } from "@/services/supabaseService";
import { toast } from "@/hooks/use-toast";
import Breadcrumbs from "@/components/Breadcrumbs";
import ExportDropdown from "@/components/ExportDropdown";
import QuickLinkDialog from "@/components/QuickLinkDialog";
import { findPresetByName, buildPostbackUrlForEvent } from "@/config/platformPresets";

type EditingState = {
  id?: string;
  landing_page_id: string;
  influencer_id: string;
  slug: string;
  affiliate_link: string;
  notes: string;
  is_active: boolean;
};

const emptyEditing: EditingState = {
  landing_page_id: "", influencer_id: "", slug: "", affiliate_link: "", notes: "", is_active: true,
};

function buildPublicUrl(domain: string | null, slug: string) {
  if (!domain) return `/?ref=${slug}`;
  let base = domain.replace(/\/+$/, "");
  if (!/^https?:\/\//i.test(base)) base = `https://${base}`;
  return `${base}/?ref=${slug}`;
}

export default function LPInstances() {
  const navigate = useNavigate();
  const { data, isLoading, create, update, toggle, isCreating, isUpdating } = useLandingPageInstances();
  const { data: landingPages } = useLandingPages();
  const { data: influencers } = useInfluencers();
  const { data: platforms } = usePlatforms();
  const [modalOpen, setModalOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [editing, setEditing] = useState<EditingState | null>(null);
  const [previewOpen, setPreviewOpen] = useState<LandingPageInstanceRow | null>(null);
  const [postbackOpen, setPostbackOpen] = useState<LandingPageInstanceRow | null>(null);
  const [quickLinkFor, setQuickLinkFor] = useState<LandingPageInstanceRow | null>(null);
  const [visualEditorFor, setVisualEditorFor] = useState<LandingPageInstanceRow | null>(null);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("Todos");
  const [filterLP, setFilterLP] = useState("Todos");

  const getLPName = (id: string) => landingPages.find(l => l.id === id)?.name || "-";
  const getLPDomain = (id: string) => landingPages.find(l => l.id === id)?.domain || "";
  const getLPPlatformId = (id: string) => landingPages.find(l => l.id === id)?.platform_id || null;
  const getInfluencerName = (id: string) => influencers.find(i => i.id === id)?.name || "-";
  const getPlatformName = (id: string) => platforms.find(p => p.id === id)?.name || "";

  // Universal postback URL builder - uses the LP's linked platform preset, no hardcoded fallback.
  const getPostbackUrls = (inst: LandingPageInstanceRow) => {
    const platformId = getLPPlatformId(inst.landing_page_id);
    if (!platformId) return null;
    const preset = findPresetByName(getPlatformName(platformId));
    if (!preset) return null;

    return preset.events.map(evt => ({
      event: evt,
      url: buildPostbackUrlForEvent(preset, evt, undefined, inst.influencer_id, undefined, false),
    }));
  };

  const filtered = data.filter(inst => {
    if (search) {
      const s = search.toLowerCase();
      if (!inst.slug.toLowerCase().includes(s) &&
          !getInfluencerName(inst.influencer_id).toLowerCase().includes(s) &&
          !getLPName(inst.landing_page_id).toLowerCase().includes(s)) return false;
    }
    if (filterStatus === "Ativo" && !inst.is_active) return false;
    if (filterStatus === "Inativo" && inst.is_active) return false;
    if (filterLP !== "Todos" && inst.landing_page_id !== filterLP) return false;
    return true;
  });

  // Validation alerts
  const alerts: { msg: string; type: "warning" | "error" }[] = [];
  data.forEach(inst => {
    if (!inst.affiliate_link) alerts.push({ msg: `Instância "${inst.slug}" sem affiliate link`, type: "error" });
    if (!getLPDomain(inst.landing_page_id)) alerts.push({ msg: `LP base de "${inst.slug}" sem domínio`, type: "warning" });
  });
  landingPages.filter(lp => lp.is_active && !lp.domain).forEach(lp => {
    alerts.push({ msg: `LP "${lp.name}" sem domínio base configurado`, type: "warning" });
  });
  landingPages.filter(lp => lp.is_active).forEach(lp => {
    if (!data.some(i => i.landing_page_id === lp.id)) {
      alerts.push({ msg: `LP "${lp.name}" sem nenhuma instância`, type: "warning" });
    }
  });

  const stats = [
    { label: "Total Instâncias", value: data.length, variant: "border-l-primary" },
    { label: "Ativas", value: data.filter(i => i.is_active).length, variant: "border-l-success" },
    { label: "LPs Base", value: new Set(data.map(i => i.landing_page_id)).size, variant: "border-l-info" },
    { label: "Influencers", value: new Set(data.map(i => i.influencer_id)).size, variant: "border-l-accent" },
  ];

  const openCreate = () => { setEditing({ ...emptyEditing }); setStep(1); setModalOpen(true); };
  const openEdit = (inst: LandingPageInstanceRow) => {
    setEditing({
      id: inst.id, landing_page_id: inst.landing_page_id, influencer_id: inst.influencer_id,
      slug: inst.slug, affiliate_link: inst.affiliate_link, notes: inst.notes || "", is_active: inst.is_active ?? true,
    });
    setStep(1);
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!editing) return;
    if (!editing.landing_page_id || !editing.influencer_id || !editing.slug || !editing.affiliate_link) {
      toast({ title: "Erro", description: "LP base, influencer, slug e affiliate link são obrigatórios.", variant: "destructive" });
      return;
    }
    try {
      const dup = await landingPageInstanceService.checkDuplicate(
        editing.landing_page_id, editing.influencer_id, editing.slug, editing.id
      );
      if (dup === "slug") {
        toast({ title: "Slug duplicado", description: "Esse slug já existe nessa LP base.", variant: "destructive" });
        return;
      }
      // Múltiplas instâncias do mesmo influencer na mesma LP são permitidas (com slugs diferentes)

      const payload = {
        landing_page_id: editing.landing_page_id, influencer_id: editing.influencer_id,
        slug: editing.slug, affiliate_link: editing.affiliate_link,
        notes: editing.notes || null, is_active: editing.is_active,
      };
      if (editing.id) {
        await update({ id: editing.id, updates: payload });
      } else {
        await create(payload);
      }
      setModalOpen(false);
    } catch { /* hook handles toast */ }
  };

  const handleToggle = async (inst: LandingPageInstanceRow) => {
    await toggle({ id: inst.id, current: inst.is_active ?? true });
  };

  const copyUrl = (inst: LandingPageInstanceRow) => {
    const url = buildPublicUrl(getLPDomain(inst.landing_page_id), inst.slug);
    navigator.clipboard.writeText(url);
    toast({ title: "URL pública copiada!", description: url });
  };

  const copyAffLink = (inst: LandingPageInstanceRow) => {
    navigator.clipboard.writeText(inst.affiliate_link);
    toast({ title: "Affiliate link copiado!" });
  };

  // Auto-generate slug from influencer
  const autoSlug = (influencerId: string) => {
    const inf = influencers.find(i => i.id === influencerId);
    return inf?.slug || "";
  };

  // Generate slug suggestions based on existing instances
  const slugSuggestions = (influencerId: string, lpId: string): string[] => {
    const inf = influencers.find(i => i.id === influencerId);
    if (!inf) return [];
    const baseSlug = inf.slug;
    const existingSlugs = data
      .filter(inst => inst.landing_page_id === lpId)
      .map(inst => inst.slug);
    const suggestions: string[] = [];
    // Always suggest base slug if not taken
    if (!existingSlugs.includes(baseSlug)) suggestions.push(baseSlug);
    // Suggest numbered variants
    for (let n = 2; n <= 10; n++) {
      const variant = `${baseSlug}-${n}`;
      if (!existingSlugs.includes(variant)) {
        suggestions.push(variant);
        if (suggestions.length >= 5) break;
      }
    }
    // Also suggest with common suffixes
    const suffixes = ["promo", "stories", "bio", "reels", "live"];
    for (const suf of suffixes) {
      const variant = `${baseSlug}-${suf}`;
      if (!existingSlugs.includes(variant)) {
        suggestions.push(variant);
        if (suggestions.length >= 8) break;
      }
    }
    return suggestions;
  };

  const exportableData = data.map(inst => ({
    id: inst.id, lp_base: getLPName(inst.landing_page_id),
    dominio: getLPDomain(inst.landing_page_id), influencer: getInfluencerName(inst.influencer_id),
    slug: inst.slug, affiliate_link: inst.affiliate_link,
    url_publica: buildPublicUrl(getLPDomain(inst.landing_page_id), inst.slug),
    status: inst.is_active ? "Ativo" : "Inativo",
  }));

  const selectedLP = editing ? landingPages.find(l => l.id === editing.landing_page_id) : null;
  const generatedUrl = editing && selectedLP ? buildPublicUrl(selectedLP.domain, editing.slug) : "";

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Breadcrumbs items={[{ label: "Gestão de Ativos", path: "/landing-pages" }, { label: "Instâncias de LP" }]} />
        <div className="flex items-center justify-center py-20 text-muted-foreground">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mr-3" />
          <span className="text-sm">Carregando instâncias...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: "Gestão de Ativos", path: "/landing-pages" }, { label: "Distribuição de LPs" }]} />
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="page-header">Distribuição de LPs</h1>
          <p className="page-subtitle">Instâncias de landing pages por influencer com affiliate links individuais</p>
        </div>
        <div className="flex gap-2">
          <ExportDropdown data={exportableData} filename="lp-instances-playbet" />
          <button className="btn-primary" onClick={openCreate}><Plus size={14} /> Criar Instância</button>
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
      {alerts.length > 0 && (
        <div className="space-y-1.5">
          {alerts.slice(0, 5).map((a, i) => (
            <div key={i} className={`flex items-center gap-2 text-xs px-3 py-2 rounded-lg border ${a.type === "error" ? "bg-destructive/10 border-destructive/20 text-destructive" : "bg-warning/10 border-warning/20 text-warning"}`}>
              <AlertTriangle size={12} /> {a.msg}
            </div>
          ))}
          {alerts.length > 5 && <p className="text-xs text-muted-foreground">+ {alerts.length - 5} alertas adicionais</p>}
        </div>
      )}

      {/* Quick nav */}
      <div className="flex flex-wrap gap-2">
        <button className="btn-ghost text-xs" onClick={() => navigate("/landing-pages")}>→ LPs Base</button>
        <button className="btn-ghost text-xs" onClick={() => navigate("/lp-performance")}>→ Performance de LPs</button>
        <button className="btn-ghost text-xs" onClick={() => navigate("/influencers")}>→ Influencers</button>
        <button className="btn-ghost text-xs" onClick={() => navigate("/link-engine")}>→ Engine de Links</button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="flex items-center gap-2 bg-secondary/50 border border-border rounded-lg px-3 py-1.5 flex-1 max-w-xs">
          <Search size={13} className="text-muted-foreground shrink-0" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar instância, influencer, LP..." className="bg-transparent text-xs text-foreground placeholder:text-muted-foreground focus:outline-none w-full" />
        </div>
        <select className="select-field" value={filterLP} onChange={e => setFilterLP(e.target.value)}>
          <option value="Todos">Todas LPs</option>
          {landingPages.map(lp => <option key={lp.id} value={lp.id}>{lp.name}</option>)}
        </select>
        <select className="select-field" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option>Todos</option><option>Ativo</option><option>Inativo</option>
        </select>
      </div>

      {/* Table */}
      <div className="glass-card overflow-x-auto invisible-scroll">
        <table className="data-table">
          <thead>
            <tr>
              <th>LP Base</th><th>Domínio</th><th>Influencer</th><th>Slug</th>
              <th>Affiliate Link</th><th>URL Pública</th><th>Status</th><th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={8} className="text-center text-muted-foreground py-8">Nenhuma instância encontrada</td></tr>
            ) : filtered.map(inst => {
              const pubUrl = buildPublicUrl(getLPDomain(inst.landing_page_id), inst.slug);
              return (
                <tr key={inst.id}>
                  <td className="font-medium text-xs">{getLPName(inst.landing_page_id)}</td>
                  <td className="font-mono text-xs text-muted-foreground">{getLPDomain(inst.landing_page_id) || <span className="text-destructive">sem domínio</span>}</td>
                  <td className="text-xs">{getInfluencerName(inst.influencer_id)}</td>
                  <td className="font-mono text-xs text-accent">{inst.slug}</td>
                  <td className="font-mono text-xs text-accent max-w-[140px] truncate" title={inst.affiliate_link}>{inst.affiliate_link || <span className="text-destructive">-</span>}</td>
                  <td className="font-mono text-xs text-accent max-w-[200px] truncate" title={pubUrl}>{pubUrl}</td>
                  <td><span className={inst.is_active ? "badge-success" : "badge-danger"}>{inst.is_active ? "Ativo" : "Inativo"}</span></td>
                  <td>
                    <div className="flex gap-0.5">
                      <button onClick={() => setQuickLinkFor(inst)} className="p-1 rounded hover:bg-primary/15 text-primary transition-colors" title="Gerar link de afiliado"><Zap size={12} /></button>
                      <button onClick={() => setPreviewOpen(inst)} className="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors" title="Preview"><Eye size={12} /></button>
                      <button onClick={() => setPostbackOpen(inst)} className="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-accent transition-colors" title="Postback URLs"><Radio size={12} /></button>
                      <button onClick={() => setVisualEditorFor(inst)} className="p-1 rounded hover:bg-primary/15 text-muted-foreground hover:text-primary transition-colors" title="Editor visual"><Wand2 size={12} /></button>
                      <button onClick={() => openEdit(inst)} className="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors" title="Editar campos"><Edit size={12} /></button>
                      <button onClick={() => copyUrl(inst)} className="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors" title="Copiar URL"><Copy size={12} /></button>
                      <button onClick={() => copyAffLink(inst)} className="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors" title="Copiar Affiliate Link"><Link2 size={12} /></button>
                      <button onClick={() => handleToggle(inst)} className={`p-1 rounded transition-colors text-muted-foreground ${inst.is_active ? "hover:bg-destructive/15 hover:text-destructive" : "hover:bg-success/15 hover:text-success"}`} title={inst.is_active ? "Desativar" : "Ativar"}>
                        {inst.is_active ? <XCircle size={12} /> : <CheckCircle size={12} />}
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Preview Drawer */}
      <Dialog open={!!previewOpen} onOpenChange={() => setPreviewOpen(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Instância - {previewOpen?.slug}</DialogTitle></DialogHeader>
          {previewOpen && (
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-xs text-muted-foreground">LP Base</span><p className="font-medium">{getLPName(previewOpen.landing_page_id)}</p></div>
                <div><span className="text-xs text-muted-foreground">Domínio Base</span><p className="font-mono text-accent text-xs">{getLPDomain(previewOpen.landing_page_id) || "-"}</p></div>
                <div><span className="text-xs text-muted-foreground">Influencer</span><p>{getInfluencerName(previewOpen.influencer_id)}</p></div>
                <div><span className="text-xs text-muted-foreground">Slug</span><p className="font-mono text-accent">{previewOpen.slug}</p></div>
                <div className="col-span-2"><span className="text-xs text-muted-foreground">Affiliate Link</span><p className="font-mono text-xs text-accent break-all">{previewOpen.affiliate_link}</p></div>
                <div className="col-span-2"><span className="text-xs text-muted-foreground">URL Pública Final</span><p className="font-mono text-xs text-accent break-all">{buildPublicUrl(getLPDomain(previewOpen.landing_page_id), previewOpen.slug)}</p></div>
                <div><span className="text-xs text-muted-foreground">Status</span><p><span className={previewOpen.is_active ? "badge-success" : "badge-warning"}>{previewOpen.is_active ? "Ativo" : "Inativo"}</span></p></div>
                {previewOpen.notes && <div className="col-span-2"><span className="text-xs text-muted-foreground">Observações</span><p className="text-xs">{previewOpen.notes}</p></div>}
              </div>
              <div className="border border-dashed border-border rounded-lg p-6 text-center text-muted-foreground bg-secondary/20">
                <ExternalLink size={24} className="mx-auto mb-2 opacity-30" />
                <p className="text-sm">Preview da Landing Page</p>
                <a href={buildPublicUrl(getLPDomain(previewOpen.landing_page_id), previewOpen.slug)} target="_blank" rel="noopener noreferrer" className="text-xs text-accent underline mt-1 inline-block">Abrir URL pública →</a>
              </div>
            </div>
          )}
          <DialogFooter>
            {previewOpen && (
              <>
                <button className="btn-ghost" onClick={() => { setPreviewOpen(null); setPostbackOpen(previewOpen); }}>
                  <Radio size={12} /> Postback URLs
                </button>
                <button className="btn-ghost" onClick={() => copyUrl(previewOpen)}>Copiar URL</button>
                <button className="btn-ghost" onClick={() => copyAffLink(previewOpen)}>Copiar Affiliate</button>
              </>
            )}
            <button className="btn-ghost" onClick={() => setPreviewOpen(null)}>Fechar</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Postback URLs Dialog */}
      <Dialog open={!!postbackOpen} onOpenChange={() => setPostbackOpen(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <Radio size={14} className="text-primary" />
              </div>
              <div>
                <DialogTitle className="text-base">Postback URLs</DialogTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Slug: <span className="font-mono text-foreground">{postbackOpen?.slug}</span>
                </p>
              </div>
            </div>
          </DialogHeader>
          {postbackOpen && (() => {
            const urls = getPostbackUrls(postbackOpen);
            if (!urls) {
              return (
                <div className="py-8 text-center text-muted-foreground">
                  <AlertTriangle size={24} className="mx-auto mb-2 opacity-40" />
                  <p className="text-sm">Nenhum preset de plataforma encontrado.</p>
                  <p className="text-xs mt-1">Vincule a LP base a uma plataforma para gerar postback URLs.</p>
                </div>
              );
            }
            const copyAll = () => {
              const text = urls.map(u => `${u.event.label}: ${u.url}`).join("\n\n");
              navigator.clipboard.writeText(text);
              toast({ title: "Todos os postbacks copiados!" });
            };

            const eventColors: Record<string, string> = {
              registration: "bg-blue-500",
              ftd: "bg-emerald-500",
              deposit: "bg-cyan-500",
              redeposit: "bg-teal-500",
              revenue: "bg-amber-500",
              withdrawable_revenue: "bg-purple-500",
              app_install: "bg-rose-500",
            };

            return (
              <div className="space-y-4 py-1">
                {/* Info bar */}
                <div className="flex items-center justify-between bg-secondary/40 rounded-lg px-3 py-2 border border-border/50">
                  <div className="flex items-center gap-4 text-xs">
                    <span className="text-muted-foreground">
                      Influencer: <strong className="text-foreground">{getInfluencerName(postbackOpen.influencer_id)}</strong>
                    </span>
                    <span className="text-muted-foreground">
                      LP: <strong className="text-foreground">{getLPName(postbackOpen.landing_page_id)}</strong>
                    </span>
                  </div>
                  <button className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 font-medium transition-colors" onClick={copyAll}>
                    <Copy size={11} /> Copiar Todos
                  </button>
                </div>

                {/* Event cards */}
                <div className="space-y-2">
                  {urls.map(({ event: evt, url }) => (
                    <div key={evt.raw_event_name} className="rounded-lg border border-border bg-card overflow-hidden">
                      <div className="flex items-center justify-between px-3 py-2 bg-secondary/20 border-b border-border/50">
                        <div className="flex items-center gap-2">
                          <span className={`w-1.5 h-1.5 rounded-full ${eventColors[evt.canonical_event_name] || "bg-muted-foreground/40"}`} />
                          <span className="text-xs font-semibold">{evt.label}</span>
                          <span className="text-[9px] font-mono text-muted-foreground bg-secondary/60 px-1.5 py-0.5 rounded">{evt.raw_event_name}</span>
                        </div>
                        <button
                          className="flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                          onClick={() => {
                            navigator.clipboard.writeText(url);
                            toast({ title: `URL de ${evt.label} copiada!` });
                          }}
                        >
                          <Copy size={10} /> Copiar
                        </button>
                      </div>
                      <div className="px-3 py-2">
                        <code className="text-[10px] font-mono text-muted-foreground leading-relaxed break-all select-all block">{url}</code>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Instructions */}
                <div className="rounded-lg border border-primary/15 bg-primary/5 p-3">
                  <p className="text-xs font-semibold text-foreground mb-1.5">Como configurar:</p>
                  <ol className="list-decimal list-inside text-[11px] text-muted-foreground space-y-1">
                    <li>Copie a URL do evento desejado</li>
                    <li>Acesse o painel da plataforma → <strong>Postback / S2S</strong></li>
                    <li>Cole no campo correspondente ao evento</li>
                    <li>Os macros <code className="text-primary bg-primary/10 px-1 rounded text-[10px]">{"{sub1}"}</code>, <code className="text-primary bg-primary/10 px-1 rounded text-[10px]">{"{amount}"}</code> etc. são preenchidos automaticamente</li>
                  </ol>
                </div>
              </div>
            );
          })()}
          <DialogFooter>
            <button className="btn-ghost" onClick={() => setPostbackOpen(null)}>Fechar</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create/Edit Wizard Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing?.id ? "Editar Instância" : "Criar Instância de LP"}</DialogTitle>
            {!editing?.id && <p className="text-xs text-muted-foreground mt-1">Passo {step} de 3</p>}
          </DialogHeader>
          <div className="space-y-4 py-2">
            {/* Step 1: LP + Influencer */}
            {(step === 1 || editing?.id) && (
              <>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">LP Base *</label>
                  <select className="select-field mt-1 w-full" value={editing?.landing_page_id || ""} onChange={e => setEditing(p => p ? { ...p, landing_page_id: e.target.value } : p)}>
                    <option value="">Selecionar LP base...</option>
                    {landingPages.filter(lp => lp.is_active).map(lp => (
                      <option key={lp.id} value={lp.id}>{lp.name} {lp.domain ? `(${lp.domain})` : ""}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Influencer *</label>
                  <select className="select-field mt-1 w-full" value={editing?.influencer_id || ""} onChange={e => {
                    const id = e.target.value;
                    const suggestions = id && editing?.landing_page_id ? slugSuggestions(id, editing.landing_page_id) : [];
                    const newSlug = suggestions.length > 0 ? suggestions[0] : autoSlug(id);
                    setEditing(p => p ? { ...p, influencer_id: id, slug: newSlug } : p);
                  }}>
                    <option value="">Selecionar influencer...</option>
                    {influencers.filter(i => i.is_active).map(i => (
                      <option key={i.id} value={i.id}>{i.name} (@{i.slug})</option>
                    ))}
                  </select>
                </div>
              </>
            )}

            {/* Step 2: Slug + Affiliate */}
            {(step === 2 || editing?.id) && (
              <>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Slug *</label>
                  <input className="input-field mt-1" value={editing?.slug || ""} onChange={e => setEditing(p => p ? { ...p, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") } : p)} placeholder="camille-stresser" />
                  {editing?.influencer_id && editing?.landing_page_id && (
                    <div className="mt-2">
                      <p className="text-[10px] text-muted-foreground mb-1.5">Slugs disponíveis (clique para usar):</p>
                      <div className="flex flex-wrap gap-1.5">
                        {slugSuggestions(editing.influencer_id, editing.landing_page_id).map(s => (
                          <button
                            key={s}
                            type="button"
                            onClick={() => setEditing(p => p ? { ...p, slug: s } : p)}
                            className={`px-2 py-0.5 rounded-md text-xs font-mono transition-colors border ${
                              editing.slug === s
                                ? "bg-primary/20 border-primary/40 text-primary"
                                : "bg-secondary/50 border-border hover:bg-secondary hover:border-primary/30 text-muted-foreground"
                            }`}
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                      {slugSuggestions(editing.influencer_id, editing.landing_page_id).length === 0 && (
                        <p className="text-[10px] text-warning">Todos os slugs comuns já estão em uso. Digite um slug personalizado acima.</p>
                      )}
                    </div>
                  )}
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Affiliate Link *</label>
                  <input className="input-field mt-1" value={editing?.affiliate_link || ""} onChange={e => setEditing(p => p ? { ...p, affiliate_link: e.target.value } : p)} placeholder="https://lkrh.pro/945b" />
                </div>
              </>
            )}

            {/* Step 3: Preview + Notes */}
            {(step === 3 || editing?.id) && (
              <>
                {generatedUrl && (
                  <div className="bg-secondary/30 border border-border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-muted-foreground">URL Pública Gerada</span>
                      <button
                        type="button"
                        className="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                        title="Copiar URL"
                        onClick={() => { navigator.clipboard.writeText(generatedUrl); toast({ title: "URL copiada!" }); }}
                      >
                        <Copy size={12} />
                      </button>
                    </div>
                    <div className="overflow-x-auto invisible-scroll">
                      <p className="font-mono text-sm text-accent whitespace-nowrap">{generatedUrl}</p>
                    </div>
                  </div>
                )}
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Observações</label>
                  <textarea className="input-field mt-1 min-h-[60px]" value={editing?.notes || ""} onChange={e => setEditing(p => p ? { ...p, notes: e.target.value } : p)} placeholder="Notas opcionais..." />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Status</label>
                  <select className="select-field mt-1 w-full" value={editing?.is_active ? "Ativo" : "Inativo"} onChange={e => setEditing(p => p ? { ...p, is_active: e.target.value === "Ativo" } : p)}>
                    <option>Ativo</option><option>Inativo</option>
                  </select>
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            {!editing?.id && step > 1 && <button className="btn-ghost" onClick={() => setStep(s => s - 1)}>Voltar</button>}
            <button className="btn-ghost" onClick={() => setModalOpen(false)}>Cancelar</button>
            {!editing?.id && step < 3 ? (
              <button className="btn-primary" onClick={() => {
                if (step === 1 && (!editing?.landing_page_id || !editing?.influencer_id)) {
                  toast({ title: "Selecione a LP e o influencer", variant: "destructive" }); return;
                }
                if (step === 2 && (!editing?.slug || !editing?.affiliate_link)) {
                  toast({ title: "Slug e affiliate link são obrigatórios", variant: "destructive" }); return;
                }
                setStep(s => s + 1);
              }}>Próximo</button>
            ) : (
              <button className="btn-primary" onClick={handleSave} disabled={isCreating || isUpdating}>
                {isCreating || isUpdating ? "Salvando..." : "Salvar"}
              </button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Quick affiliate link generator pre-filled with this LP + influencer */}
      <QuickLinkDialog
        open={!!quickLinkFor}
        onOpenChange={(v) => { if (!v) setQuickLinkFor(null); }}
        defaultInfluencerId={quickLinkFor?.influencer_id || ""}
        defaultLandingPageId={quickLinkFor?.landing_page_id || ""}
      />

      {/* Visual editor: mode, sections, hype copy, jogos */}
      <LpInstanceVisualEditor
        open={!!visualEditorFor}
        onOpenChange={(v) => { if (!v) setVisualEditorFor(null); }}
        instanceId={visualEditorFor?.id || null}
        publicUrl={visualEditorFor ? buildPublicUrl(getLPDomain(visualEditorFor.landing_page_id), visualEditorFor.slug) : null}
      />
    </div>
  );
}
