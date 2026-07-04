import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Breadcrumbs from "@/components/Breadcrumbs";
import EmptyState from "@/components/EmptyState";

import TrackingLinkForm, { emptyForm, formFromRow, type FormState } from "@/components/tracking/TrackingLinkForm";
import QuickLinkDialog from "@/components/QuickLinkDialog";
import TrackingLinkDetail from "@/components/tracking/TrackingLinkDetail";
import LinkReportDrawer from "@/components/tracking/LinkReportDrawer";
import TrackingSetupWizard from "@/components/tracking/TrackingSetupWizard";
import HistoricalImport from "@/components/tracking/HistoricalImport";
import {
  useTrackingLinks, usePlatformAccounts, usePlatformEventMappings,
  useTrackingMetrics, useTrackingSnapshots,
} from "@/hooks/useTrackingData";
import {
  useInfluencers, useCampanhas, useLandingPages, useLandingPageInstances, usePlatforms,
} from "@/hooks/useSupabaseQuery";
import {
  Plus, Pencil, Trash2, Link2, Copy, Check, ExternalLink, AlertTriangle,
  Sparkles, Upload, Users, ChevronDown, ChevronRight, Search, Flame,
  LayoutGrid, Rows3, ShieldCheck, ShieldAlert, ArrowUpRight, Filter,
} from "lucide-react";
import { findPresetByName, type PlatformPreset } from "@/config/platformPresets";
import type { TrackingLinkRow } from "@/services/trackingService";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { syncLinkAssets } from "@/lib/linkAssets";
import { resolveShareUrl } from "@/lib/trackingUrl";
import GameArtwork from "@/components/tracking/GameArtwork";
import { getMetricMoneyParts } from "@/lib/trackingMetrics";

const ROLE_LABELS: Record<string, string> = {
  influencer: "Influencer",
  socio: "Sócio(a)",
  parceiro: "Parceiro",
  interno: "Interno",
};

type ViewMode = "grouped" | "table";
type StatusFilter = "all" | "active" | "paused" | "incomplete";

export default function TrackingLinks() {
  const { data, isLoading, create, update, remove } = useTrackingLinks();
  const { data: accounts } = usePlatformAccounts();
  const { data: influencers } = useInfluencers();
  const { data: campanhas } = useCampanhas();
  const { data: landingPages } = useLandingPages();
  const { data: lpInstances } = useLandingPageInstances();
  const { data: platforms } = usePlatforms();
  const { data: mappings, create: createMapping } = usePlatformEventMappings();
  const { data: metrics } = useTrackingMetrics();
  const { create: createMetric } = useTrackingMetrics();
  const { toast } = useToast();
  const qc = useQueryClient();

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<FormState>(emptyForm);
  const [quickOpen, setQuickOpen] = useState(false);
  const [quickDefaults, setQuickDefaults] = useState<{ influencerId?: string; lpId?: string }>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [detailLink, setDetailLink] = useState<TrackingLinkRow | null>(null);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);

  const [viewMode, setViewMode] = useState<ViewMode>("grouped");
  const [platformFilter, setPlatformFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const infMap = useMemo(() => new Map((influencers as any[]).map(i => [i.id, i])), [influencers]);
  const accMap = useMemo(() => new Map(accounts.map(a => [a.id, a])), [accounts]);
  const platMap = useMemo(() => new Map((platforms as any[]).map(p => [p.id, p])), [platforms]);
  const lpMap = useMemo(() => new Map((landingPages as any[]).map(l => [l.id, l])), [landingPages]);
  const instMap = useMemo(() => new Map((lpInstances as any[]).map(i => [i.id, i])), [lpInstances]);

  const isIncomplete = (l: TrackingLinkRow) => !l.platform_account_id || !l.influencer_id || !(l.base_url || l.final_url);

  // Multiple active links for the same influencer/account/LP are intentional:
  // each game, odds push or campaign variation needs its own tracking code.
  const isDuplicate = (_l: TrackingLinkRow) => false;

  // Global filtered list
  const filtered = useMemo(() => {
    const s = search.toLowerCase();
    return data.filter(l => {
      if (s) {
        const infName = (infMap.get(l.influencer_id!) as any)?.name?.toLowerCase() ?? "";
        const accName = (accMap.get(l.platform_account_id!) as any)?.nome_conta?.toLowerCase() ?? "";
        const hit = (l.tracking_code || "").toLowerCase().includes(s)
          || (l.base_url || "").toLowerCase().includes(s)
          || (l.notes || "").toLowerCase().includes(s)
          || infName.includes(s) || accName.includes(s);
        if (!hit) return false;
      }
      if (platformFilter !== "all") {
        const acc: any = accMap.get(l.platform_account_id!);
        if (acc?.platform_id !== platformFilter) return false;
      }
      if (statusFilter === "incomplete" && !isIncomplete(l)) return false;
      if (statusFilter === "active" && (isIncomplete(l) || (l.status && l.status !== "active"))) return false;
      if (statusFilter === "paused" && (l.status === "active" || !l.status)) return false;
      return true;
    });
  }, [data, search, platformFilter, statusFilter, infMap, accMap]);

  // Aggregate KPIs
  const kpis = useMemo(() => {
    const activeInfIds = new Set(data.map(l => l.influencer_id).filter(Boolean) as string[]);
    const totalRev = metrics.reduce((a, m: any) => a + getMetricMoneyParts(m as any).total, 0);
    return {
      total: data.length,
      active: data.filter(l => (l.status ?? "active") === "active" && !isIncomplete(l)).length,
      incomplete: data.filter(isIncomplete).length,
      influencers: activeInfIds.size,
      revenue: totalRev,
    };
  }, [data, metrics]);

  // Group by influencer
  const grouped = useMemo(() => {
    const g = new Map<string, TrackingLinkRow[]>();
    filtered.forEach(l => {
      const k = l.influencer_id ?? "__unassigned__";
      if (!g.has(k)) g.set(k, []);
      g.get(k)!.push(l);
    });
    return Array.from(g.entries()).sort((a, b) => {
      const na = (infMap.get(a[0]) as any)?.name ?? "zzz";
      const nb = (infMap.get(b[0]) as any)?.name ?? "zzz";
      return na.localeCompare(nb);
    });
  }, [filtered, infMap]);

  const openCreate = (defaults: { influencerId?: string; lpId?: string } = {}) => {
    setQuickDefaults(defaults);
    setQuickOpen(true);
  };
  const openEdit = (l: TrackingLinkRow) => { setEditing(formFromRow(l)); setModalOpen(true); };

  const handleDelete = async (l: TrackingLinkRow) => {
    const label = l.tracking_code || l.base_url || "este link";
    if (!window.confirm(`Remover ${label}?\nEsta ação não pode ser desfeita.`)) return;
    try {
      await remove(l.id);
      toast({ title: "Link removido" });
    } catch (e: any) {
      toast({
        title: "Não foi possível remover",
        description: e?.message || "Verifique dependências (materiais/LP) vinculados ao link.",
        variant: "destructive",
      });
    }
  };

  const handleSave = async (form: FormState) => {
    const { id, ...payload } = form;
    const cleaned: any = { ...payload };
    Object.keys(cleaned).forEach(k => { if (cleaned[k] === "") cleaned[k] = null; });
    try {
      if (id) {
        await update(id, cleaned);
        toast({ title: "Link atualizado" });
      } else {
        const created: any = await create(cleaned);
        const linkId = created?.id;
        if (linkId) {
          syncLinkAssets(linkId, { useLp: !!cleaned.landing_page_instance_id }, qc);
        }
        toast({
          title: "Link criado",
          description: "Materiais e LP sincronizando em segundo plano.",
        });
      }
      setModalOpen(false);
    } catch (e: any) {
      toast({ title: "Erro ao salvar", description: e?.message || "Tente novamente", variant: "destructive" });
    }
  };

  const handleWizardComplete = async (payload: any) => {
    const created: any = await create(payload);
    const linkId = created?.id;
    if (linkId) {
      syncLinkAssets(linkId, { useLp: !!payload?.landing_page_instance_id }, qc);
    }
    setWizardOpen(false);
    toast({
      title: "Tracking link criado via setup guiado!",
      description: "Materiais e LP sincronizando em segundo plano.",
    });
  };


  const handleApplyMappings = async (platformId: string, preset: PlatformPreset, accountId?: string) => {
    const subFields: Record<string, string> = {};
    for (const macro of preset.supported_macros) {
      const m = macro.native.match(/^sub(\d+)$/);
      if (m) subFields[`sub${m[1]}_field`] = macro.internal_meaning;
    }
    for (const evt of preset.events) {
      await createMapping({
        platform_id: platformId,
        platform_account_id: accountId || null,
        raw_event_name: evt.raw_event_name,
        canonical_event_name: evt.canonical_event_name,
        amount_field: evt.has_amount ? "amount" : null,
        currency_field: evt.has_amount ? "currency" : null,
        transaction_id_field: evt.has_transaction_id ? "transaction_id" : null,
        user_id_field: evt.extra_macros.includes("user_id") ? "user_id" : null,
        country_field: evt.extra_macros.includes("country") ? "country" : null,
        status_field: null,
        ...subFields,
      } as any);
    }
  };

  const handleSaveSnapshot = async (payload: any) => {
    const { supabase } = await import("@/integrations/supabase/client");
    await (supabase as any).from("tracking_snapshots").insert(payload);
  };

  const buildFinalUrl = (l: TrackingLinkRow) => {
    const lp: any = l.landing_page_id ? lpMap.get(l.landing_page_id) : null;
    const inst: any = l.landing_page_instance_id ? instMap.get(l.landing_page_instance_id) : null;
    const inf: any = l.influencer_id ? infMap.get(l.influencer_id) : null;
    const url = resolveShareUrl({
      lpDomain: lp?.domain,
      lpRoute: lp?.route,
      lpMode: inst?.lp_mode,
      instanceSlug: inst?.slug,
      affiliateBaseUrl: l.base_url || "",
      clickIdParamName: l.click_id_param_name || "sub1",
      sub1: l.tracking_code,
      sub2: l.influencer_id || "",
      sub3: l.campanha_id || "",
    });
    return url || l.final_url || l.tracking_code;
  };

  const copyLink = (l: TrackingLinkRow) => {
    const url = buildFinalUrl(l) || l.short_url;
    navigator.clipboard.writeText(url);
    setCopiedId(l.id);
    toast({ title: "Link copiado", description: url });
    setTimeout(() => setCopiedId(null), 1500);
  };

  const toggleExpanded = (id: string) => {
    setExpanded(prev => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };

  const brl = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

  return (
    <div className="space-y-6 animate-fade-in">
      <Breadcrumbs items={[{ label: "Tracking Hub", path: "/tracking" }, { label: "Central de Links" }]} />

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Central de Links</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Fonte da verdade para tracking, atribuição e pagamento de comissões via Asaas.
          </p>
        </div>
        <div className="flex gap-2 items-center flex-wrap">
          <Button size="sm" variant="outline" onClick={() => setImportOpen(true)}>
            <Upload size={14} className="mr-1.5" /> Importar histórico
          </Button>
          <Button size="sm" variant="outline" onClick={() => setWizardOpen(true)}>
            <Sparkles size={14} className="mr-1.5" /> Setup guiado
          </Button>
          <Button size="sm" onClick={() => openCreate()}>
            <Plus size={14} className="mr-1.5" /> Gerar link
          </Button>
        </div>
      </div>

      {/* KPI header */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <KpiCard label="Total de links" value={kpis.total.toLocaleString("pt-BR")} icon={Link2} />
        <KpiCard label="Ativos & saudáveis" value={kpis.active.toLocaleString("pt-BR")} icon={ShieldCheck} tone="success" />
        <KpiCard
          label="Incompletos"
          value={kpis.incomplete.toLocaleString("pt-BR")}
          icon={ShieldAlert}
          tone={kpis.incomplete ? "danger" : "muted"}
        />
        <KpiCard label="Influencers ativos" value={kpis.influencers.toLocaleString("pt-BR")} icon={Users} />
        <KpiCard label="Lucro real rastreado" value={brl(kpis.revenue)} icon={ArrowUpRight} tone="primary" />
      </div>

      {/* Toolbar */}
      <Card>
        <CardContent className="p-3 flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[240px]">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="h-9 pl-8 text-xs"
              placeholder="Buscar por influencer, código, conta ou URL…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <Select value={platformFilter} onValueChange={setPlatformFilter}>
            <SelectTrigger className="h-9 text-xs w-[180px]"><Filter size={12} className="mr-1" /><SelectValue placeholder="Plataforma" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as plataformas</SelectItem>
              {(platforms as any[]).map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={(v: StatusFilter) => setStatusFilter(v)}>
            <SelectTrigger className="h-9 text-xs w-[160px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os status</SelectItem>
              <SelectItem value="active">Só ativos</SelectItem>
              <SelectItem value="paused">Só pausados</SelectItem>
              <SelectItem value="incomplete">Só incompletos</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex rounded-md border border-border overflow-hidden">
            <button
              onClick={() => setViewMode("grouped")}
              className={`px-2.5 py-1.5 text-[11px] inline-flex items-center gap-1.5 ${viewMode === "grouped" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary/60"}`}
              title="Por influencer"
            >
              <LayoutGrid size={12} /> Por influencer
            </button>
            <button
              onClick={() => setViewMode("table")}
              className={`px-2.5 py-1.5 text-[11px] inline-flex items-center gap-1.5 border-l border-border ${viewMode === "table" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary/60"}`}
              title="Tabela"
            >
              <Rows3 size={12} /> Tabela
            </button>
          </div>
        </CardContent>
      </Card>

      {isLoading && <Card><CardContent className="py-12 text-center text-muted-foreground text-sm">Carregando…</CardContent></Card>}

      {!isLoading && data.length === 0 && (
        <div className="space-y-4">
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="py-6 text-center space-y-3">
              <Sparkles className="mx-auto text-primary" size={28} />
              <h3 className="text-sm font-semibold">Comece pelo Setup Guiado</h3>
              <p className="text-xs text-muted-foreground max-w-md mx-auto">
                Escolha a plataforma, o influencer e a LP da oportunidade — o painel monta o link, o postback e o tracking code automaticamente.
              </p>
              <div className="flex gap-2 justify-center">
                <Button size="sm" onClick={() => setWizardOpen(true)}>
                  <Sparkles size={14} className="mr-1.5" /> Iniciar Setup Guiado
                </Button>
                <Button size="sm" variant="outline" onClick={() => openCreate()}>
                  <Plus size={14} className="mr-1.5" /> Gerar manualmente
                </Button>
              </div>
            </CardContent>
          </Card>
          <EmptyState
            icon={Link2}
            title="Nenhum tracking link criado"
            description="Use o Setup Guiado acima ou gere manualmente."
            actionLabel="Gerar link"
            onAction={() => openCreate()}
          />
        </div>
      )}

      {!isLoading && data.length > 0 && filtered.length === 0 && (
        <Card><CardContent className="py-10 text-center text-muted-foreground text-sm">Nenhum link corresponde aos filtros.</CardContent></Card>
      )}

      {/* ── Grouped view ─────────────────────────────────────────── */}
      {!isLoading && viewMode === "grouped" && filtered.length > 0 && (
        <div className="space-y-3">
          {grouped.map(([infId, links]) => {
            const inf: any = infMap.get(infId);
            const isOpen = expanded.has(infId);
            const missing = links.filter(isIncomplete).length;
            const dupCount = links.filter(isDuplicate).length;

            return (
              <Card key={infId} className={missing ? "border-destructive/30" : ""}>
                <CardContent className="p-0">
                  {/* Group header */}
                  <button
                    onClick={() => toggleExpanded(infId)}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-secondary/40 transition-colors"
                  >
                    {isOpen ? <ChevronDown size={14} className="text-muted-foreground" /> : <ChevronRight size={14} className="text-muted-foreground" />}
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-primary-glow flex items-center justify-center text-primary-foreground text-[11px] font-semibold shrink-0">
                      {(inf?.name || "?").split(" ").map((w: string) => w[0]).slice(0, 2).join("").toUpperCase()}
                    </div>
                    <div className="flex-1 text-left min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-[13px] font-semibold truncate">{inf?.name ?? "Sem influencer"}</p>
                        {inf?.slug && <span className="text-[10px] font-mono text-muted-foreground">@{inf.slug}</span>}
                        {inf?.commission_percent && (
                          <Badge variant="outline" className="text-[9px] h-4">{inf.commission_percent}%</Badge>
                        )}
                        {!inf?.manager_id && infId !== "__unassigned__" && (
                          <Badge variant="outline" className="text-[9px] h-4 border-warning/40 text-warning">sem gerente</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-0.5">
                        <span className="text-[11px] text-muted-foreground">{links.length} link{links.length > 1 ? "s" : ""}</span>
                        {missing > 0 && (
                          <span className="text-[11px] text-destructive inline-flex items-center gap-1">
                            <AlertTriangle size={11} /> {missing} incompleto{missing > 1 ? "s" : ""}
                          </span>
                        )}
                        {dupCount > 0 && (
                          <span className="text-[11px] text-warning inline-flex items-center gap-1">
                            <AlertTriangle size={11} /> {dupCount} duplicado{dupCount > 1 ? "s" : ""}
                          </span>
                        )}
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 gap-1 text-[11px]"
                      onClick={(e) => { e.stopPropagation(); openCreate({ influencerId: infId }); }}
                    >
                      <Plus size={11} /> Novo link
                    </Button>
                  </button>

                  {/* Links */}
                  {isOpen && (
                    <div className="border-t border-border/40 divide-y divide-border/40">
                      {links.map(l => {
                        const acc: any = accMap.get(l.platform_account_id!);
                        const platform: any = acc ? platMap.get(acc.platform_id) : null;
                        const inst: any = l.landing_page_instance_id ? instMap.get(l.landing_page_instance_id) : null;
                        const lp: any = l.landing_page_id ? lpMap.get(l.landing_page_id) : null;
                        const incomplete = isIncomplete(l);
                        const dup = isDuplicate(l);
                        const url = buildFinalUrl(l) || l.short_url;
                        return (
                          <div key={l.id} className={`px-4 py-2.5 flex items-center gap-3 ${incomplete ? "bg-destructive/5" : ""}`}>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                                <span className="text-[11px] font-mono font-medium">{l.tracking_code}</span>
                                {platform && <Badge variant="outline" className="text-[9px] h-4">{platform.name}</Badge>}
                                {acc && <span className="text-[10px] text-muted-foreground">· {acc.nome_conta}</span>}
                                {lp && <Badge variant="outline" className="text-[9px] h-4 border-primary/30 text-primary">LP · {lp.name}</Badge>}
                                {inst && <span className="text-[10px] font-mono text-muted-foreground">/{inst.slug}</span>}
                                {(l as any).game_name && (
                                  <Badge variant="outline" className="text-[9px] h-4 border-warning/40 text-warning gap-0.5">
                                    <Flame size={9} /> {(l as any).game_name}
                                  </Badge>
                                )}
                                <Badge variant={l.status === "active" || !l.status ? "default" : "secondary"} className="text-[9px] h-4">
                                  {l.status ?? "active"}
                                </Badge>
                                {incomplete && (
                                  <Badge variant="outline" className="text-[9px] h-4 border-destructive/40 text-destructive gap-0.5">
                                    <AlertTriangle size={9} /> incompleto
                                  </Badge>
                                )}
                                {dup && !incomplete && (
                                  <Badge variant="outline" className="text-[9px] h-4 border-warning/40 text-warning gap-0.5">
                                    <AlertTriangle size={9} /> duplicado
                                  </Badge>
                                )}
                              </div>
                              <div className="flex items-center gap-2 min-w-0">
                                {(l as any).game_name && (
                                  <GameArtwork slug={(l as any).game_slug} name={(l as any).game_name} iconUrl={(l as any).game_icon_url} size="sm" />
                                )}
                                <div className="min-w-0 flex-1">
                                  <p className="text-[11px] font-mono text-muted-foreground truncate" title={url}>{url}</p>
                                  {(l as any).hype_reason && <p className="text-[10px] text-warning truncate">{(l as any).hype_reason}</p>}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-0.5 shrink-0">
                              <Button variant="ghost" size="icon" className="h-7 w-7" title="Copiar link" onClick={() => copyLink(l)}>
                                {copiedId === l.id ? <Check size={13} className="text-success" /> : <Copy size={13} />}
                              </Button>
                              <Button variant="ghost" size="icon" className="h-7 w-7" title="Detalhes" onClick={() => setDetailLink(l)}>
                                <ExternalLink size={13} />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-7 w-7" title="Editar" onClick={() => openEdit(l)}>
                                <Pencil size={13} />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" title="Remover" onClick={() => handleDelete(l)}>
                                <Trash2 size={13} />
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* ── Table view ───────────────────────────────────────────── */}
      {!isLoading && viewMode === "table" && filtered.length > 0 && (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Código</TableHead>
                    <TableHead>Influencer</TableHead>
                    <TableHead>Conta / Plataforma</TableHead>
                    <TableHead>Papel</TableHead>
                    <TableHead>LP / Slug</TableHead>
                    <TableHead>Link em uso</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map(l => {
                    const acc: any = accMap.get(l.platform_account_id!);
                    const platform: any = acc ? platMap.get(acc.platform_id) : null;
                    const inst: any = l.landing_page_instance_id ? instMap.get(l.landing_page_instance_id) : null;
                    const lp: any = l.landing_page_id ? lpMap.get(l.landing_page_id) : null;
                    const inf: any = l.influencer_id ? infMap.get(l.influencer_id) : null;
                    const incomplete = isIncomplete(l);
                    const dup = isDuplicate(l);
                    return (
                      <TableRow key={l.id} className={incomplete ? "bg-destructive/5" : ""}>
                        <TableCell className="font-mono text-xs font-medium">
                          <div className="flex items-center gap-1.5">
                            {l.tracking_code}
                            {incomplete && <AlertTriangle size={12} className="text-destructive" />}
                            {dup && !incomplete && <AlertTriangle size={12} className="text-warning" />}
                          </div>
                        </TableCell>
                        <TableCell className="text-xs">
                          <div className="leading-tight">
                            <div className="font-medium">{inf?.name || "—"}</div>
                            {inf?.slug && <div className="text-[10px] text-muted-foreground font-mono">@{inf.slug}</div>}
                          </div>
                        </TableCell>
                        <TableCell className="text-xs">
                          <div className="leading-tight">
                            <div>{acc?.nome_conta || "—"}</div>
                            {platform && <div className="text-[10px] text-muted-foreground">{platform.name}</div>}
                          </div>
                        </TableCell>
                        <TableCell className="text-xs">
                          <Badge variant="outline" className="text-[9px]">
                            {ROLE_LABELS[(l as any).tracking_role || "influencer"] || "Influencer"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs">
                          <div className="leading-tight">
                            <div>{lp?.name ?? "—"}</div>
                            {inst && <div className="text-[10px] font-mono text-muted-foreground">/{inst.slug}</div>}
                          </div>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground max-w-[180px] truncate font-mono">
                          {buildFinalUrl(l) || l.short_url}
                        </TableCell>
                        <TableCell>
                          <Badge variant={l.status === "active" || !l.status ? "default" : "secondary"} className="text-[10px]">
                            {l.status || "active"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="icon" className="h-7 w-7" title="Copiar" onClick={() => copyLink(l)}>
                              {copiedId === l.id ? <Check size={13} className="text-success" /> : <Copy size={13} />}
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7" title="Detalhes" onClick={() => setDetailLink(l)}>
                              <ExternalLink size={13} />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7" title="Editar" onClick={() => openEdit(l)}>
                              <Pencil size={13} />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" title="Remover" onClick={() => handleDelete(l)}>
                              <Trash2 size={13} />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      <TrackingLinkDetail
        link={detailLink}
        onClose={() => setDetailLink(null)}
        accounts={accounts}
        influencers={influencers as any[]}
        landingPages={landingPages as any[]}
        lpInstances={lpInstances as any[]}
        platforms={platforms as any[]}
      />

      <QuickLinkDialog
        open={quickOpen}
        onOpenChange={setQuickOpen}
        defaultInfluencerId={quickDefaults.influencerId}
        defaultLandingPageId={quickDefaults.lpId}
      />

      <TrackingLinkForm
        open={modalOpen}
        onOpenChange={setModalOpen}
        editing={editing}
        onSave={handleSave}
        accounts={accounts}
        influencers={influencers as any[]}
        campanhas={campanhas as any[]}
        landingPages={landingPages as any[]}
        lpInstances={lpInstances as any[]}
        platforms={platforms as any[]}
      />

      <TrackingSetupWizard
        open={wizardOpen}
        onOpenChange={setWizardOpen}
        accounts={accounts}
        influencers={influencers as any[]}
        campanhas={campanhas as any[]}
        landingPages={landingPages as any[]}
        lpInstances={lpInstances as any[]}
        platforms={platforms as any[]}
        onComplete={handleWizardComplete}
        onApplyMappings={handleApplyMappings}
        existingMappingsCount={mappings.length}
      />

      <HistoricalImport
        open={importOpen}
        onOpenChange={setImportOpen}
        accounts={accounts}
        platforms={platforms as any[]}
        onSaveMetric={createMetric}
        onSaveSnapshot={handleSaveSnapshot}
      />
    </div>
  );
}

function KpiCard({ label, value, icon: Icon, tone = "muted" }: { label: string; value: string; icon: any; tone?: "muted" | "primary" | "success" | "danger" }) {
  const toneCls = {
    muted: "text-foreground",
    primary: "text-primary",
    success: "text-success",
    danger: "text-destructive",
  }[tone];
  const iconCls = {
    muted: "text-muted-foreground",
    primary: "text-primary/80",
    success: "text-success/80",
    danger: "text-destructive/80",
  }[tone];
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">{label}</span>
          <Icon size={13} className={iconCls} />
        </div>
        <div className={`text-xl font-semibold tracking-tight tabular-nums ${toneCls}`}>{value}</div>
      </CardContent>
    </Card>
  );
}
