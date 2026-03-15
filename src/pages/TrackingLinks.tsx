import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import Breadcrumbs from "@/components/Breadcrumbs";
import EmptyState from "@/components/EmptyState";

import TrackingLinkForm, { emptyForm, formFromRow, type FormState } from "@/components/tracking/TrackingLinkForm";
import TrackingLinkDetail from "@/components/tracking/TrackingLinkDetail";
import TrackingSetupWizard from "@/components/tracking/TrackingSetupWizard";
import HistoricalImport from "@/components/tracking/HistoricalImport";
import { useTrackingLinks, usePlatformAccounts, usePlatformEventMappings, useTrackingMetrics, useTrackingSnapshots } from "@/hooks/useTrackingData";
import { useInfluencers, useCampanhas, useLandingPages, useLandingPageInstances, usePlatforms } from "@/hooks/useSupabaseQuery";
import { Plus, Pencil, Trash2, Link2, Copy, Check, ExternalLink, AlertTriangle, Sparkles, Upload } from "lucide-react";
import { findPresetByName, type PlatformPreset } from "@/config/platformPresets";
import type { TrackingLinkRow } from "@/services/trackingService";
import { useToast } from "@/hooks/use-toast";

const ROLE_LABELS: Record<string, string> = {
  influencer: "Influencer",
  socio: "Sócio(a)",
  parceiro: "Parceiro",
  interno: "Interno",
};

export default function TrackingLinks() {
  const { data, isLoading, create, update, remove } = useTrackingLinks();
  const { data: accounts } = usePlatformAccounts();
  const { data: influencers } = useInfluencers();
  const { data: campanhas } = useCampanhas();
  const { data: landingPages } = useLandingPages();
  const { data: lpInstances } = useLandingPageInstances();
  const { data: platforms } = usePlatforms();
  const { data: mappings, create: createMapping } = usePlatformEventMappings();
  const { create: createMetric } = useTrackingMetrics();
  const { toast } = useToast();

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<FormState>(emptyForm);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copiedType, setCopiedType] = useState("");
  const [search, setSearch] = useState("");
  const [detailLink, setDetailLink] = useState<TrackingLinkRow | null>(null);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);

  const filtered = data.filter(l =>
    (l.tracking_code || "").toLowerCase().includes(search.toLowerCase()) ||
    (l.base_url || "").toLowerCase().includes(search.toLowerCase()) ||
    (l.notes || "").toLowerCase().includes(search.toLowerCase())
  );

  const getName = (list: any[], id: string | null, field = "name") => list.find(i => i.id === id)?.[field] || "—";

  const openCreate = () => { setEditing(emptyForm); setModalOpen(true); };
  const openEdit = (l: TrackingLinkRow) => { setEditing(formFromRow(l)); setModalOpen(true); };

  const handleSave = async (form: FormState) => {
    const { id, ...payload } = form;
    const cleaned: any = { ...payload };
    Object.keys(cleaned).forEach(k => { if (cleaned[k] === "") cleaned[k] = null; });
    if (id) {
      await update(id, cleaned);
    } else {
      await create(cleaned);
    }
    setModalOpen(false);
  };

  const handleWizardComplete = async (payload: any) => {
    await create(payload);
    setWizardOpen(false);
    toast({ title: "Tracking link criado via setup guiado!" });
  };

  const handleApplyMappings = async (platformId: string, preset: PlatformPreset, accountId?: string) => {
    // Build sub_fields from macro_to_internal mapping
    const subFields: Record<string, string> = {};
    for (const macro of preset.supported_macros) {
      const subMatch = macro.native.match(/^sub(\d+)$/);
      if (subMatch) {
        subFields[`sub${subMatch[1]}_field`] = macro.internal_meaning;
      }
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
    if (l.final_url) return l.final_url;
    if (!l.base_url) return l.tracking_code;
    const sep = l.base_url.includes("?") ? "&" : "?";
    return `${l.base_url}${sep}${l.click_id_param_name || "sub1"}={click_id}`;
  };

  const copyToClipboard = (text: string, id: string, type: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setCopiedType(type);
    toast({ title: type === "link" ? "Link copiado!" : "Postback URL copiada!" });
    setTimeout(() => { setCopiedId(null); setCopiedType(""); }, 2000);
  };

  const isIncomplete = (l: TrackingLinkRow) => !l.platform_account_id || !l.influencer_id || !l.base_url;

  // Count existing mappings for wizard
  const existingMappingsCount = mappings.length;

  return (
    <div className="space-y-6 animate-fade-in">
      <Breadcrumbs items={[{ label: "Tracking Hub", path: "/tracking" }, { label: "Links" }]} />

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Tracking Links</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Links rastreáveis vinculados a influencers, contas e campanhas</p>
        </div>
        <div className="flex gap-2 items-center flex-wrap">
          
          <Button size="sm" variant="outline" onClick={() => setImportOpen(true)}>
            <Upload size={14} className="mr-1.5" /> Importar Histórico
          </Button>
          <Button size="sm" variant="outline" onClick={openCreate}>
            <Plus size={14} className="mr-1.5" /> Manual
          </Button>
          <Button size="sm" onClick={() => setWizardOpen(true)}>
            <Sparkles size={14} className="mr-1.5" /> Setup Guiado
          </Button>
        </div>
      </div>

      {isLoading && <Card><CardContent className="py-12 text-center text-muted-foreground text-sm">Carregando...</CardContent></Card>}

      {!isLoading && data.length === 0 && (
        <div className="space-y-4">
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="py-6 text-center space-y-3">
              <Sparkles className="mx-auto text-primary" size={28} />
              <h3 className="text-sm font-semibold">Comece pelo Setup Guiado</h3>
              <p className="text-xs text-muted-foreground max-w-md mx-auto">
                Escolha a plataforma, selecione a instância/slug e o painel configura tudo automaticamente:
                link operacional, mapeamentos, postbacks e tracking code.
              </p>
              <div className="flex gap-2 justify-center">
                <Button size="sm" onClick={() => setWizardOpen(true)}>
                  <Sparkles size={14} className="mr-1.5" /> Iniciar Setup Guiado
                </Button>
                <Button size="sm" variant="outline" onClick={() => setImportOpen(true)}>
                  <Upload size={14} className="mr-1.5" /> Importar Histórico
                </Button>
              </div>
            </CardContent>
          </Card>
          <EmptyState
            icon={Link2}
            title="Nenhum tracking link criado"
            description="Use o Setup Guiado acima ou crie manualmente."
            actionLabel="Criar Manual"
            onAction={openCreate}
          />
        </div>
      )}

      {!isLoading && data.length > 0 && (
        <>
          <Input className="h-9 text-xs max-w-sm" placeholder="Buscar por código, URL ou nota..." value={search} onChange={e => setSearch(e.target.value)} />
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Código</TableHead>
                      <TableHead>Conta / Plataforma</TableHead>
                      <TableHead>Influencer</TableHead>
                      <TableHead>Papel</TableHead>
                      <TableHead>LP / Slug</TableHead>
                      <TableHead>Link em Uso</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map(l => {
                      const account = accounts.find(a => a.id === l.platform_account_id);
                      const platform = account ? (platforms as any[]).find(p => p.id === account.platform_id) : null;
                      const instance = lpInstances.find((i: any) => i.id === l.landing_page_instance_id);
                      const incomplete = isIncomplete(l);

                      return (
                        <TableRow key={l.id} className={incomplete ? "bg-destructive/5" : ""}>
                          <TableCell className="font-mono text-xs font-medium">
                            <div className="flex items-center gap-1.5">
                              {l.tracking_code}
                              {l.is_demo && <Badge variant="secondary" className="text-[9px] bg-yellow-500/15 text-yellow-600">DEMO</Badge>}
                              {incomplete && <AlertTriangle size={12} className="text-destructive" />}
                            </div>
                          </TableCell>
                          <TableCell className="text-xs">
                            <div className="leading-tight">
                              <div>{account?.nome_conta || "—"}</div>
                              {platform && <div className="text-[10px] text-muted-foreground">{platform.name}</div>}
                            </div>
                          </TableCell>
                          <TableCell className="text-xs">{getName(influencers as any[], l.influencer_id)}</TableCell>
                          <TableCell className="text-xs">
                            <Badge variant="outline" className="text-[9px]">
                              {ROLE_LABELS[(l as any).tracking_role || "influencer"] || "Influencer"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs">
                            <div className="leading-tight">
                              <div>{getName(landingPages as any[], l.landing_page_id)}</div>
                              {instance && <div className="text-[10px] font-mono text-muted-foreground">/{instance.slug}</div>}
                            </div>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground max-w-[180px] truncate font-mono">
                            {l.short_url || buildFinalUrl(l)}
                          </TableCell>
                          <TableCell>
                            <Badge variant={l.status === "active" ? "default" : "secondary"} className="text-[10px]">
                              {l.status || "active"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <Button variant="ghost" size="icon" className="h-7 w-7" title="Copiar link final" onClick={() => copyToClipboard(l.short_url || buildFinalUrl(l), l.id, "link")}>
                                {copiedId === l.id && copiedType === "link" ? <Check size={13} className="text-green-500" /> : <Copy size={13} />}
                              </Button>
                              <Button variant="ghost" size="icon" className="h-7 w-7" title="Ver detalhes" onClick={() => setDetailLink(l)}>
                                <ExternalLink size={13} />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(l)} title="Editar"><Pencil size={13} /></Button>
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => remove(l.id)} title="Remover"><Trash2 size={13} /></Button>
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
        </>
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
        existingMappingsCount={existingMappingsCount}
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
