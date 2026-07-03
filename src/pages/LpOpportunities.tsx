import { useMemo, useState } from "react";
import Breadcrumbs from "@/components/Breadcrumbs";
import EmptyState from "@/components/EmptyState";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Pencil, Trash2, Copy, AlertTriangle, Sparkles, Wand2, Star } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLpOpportunities } from "@/hooks/useLpOpportunities";
import {
  useLandingPages,
  usePlatforms,
  useCampanhas,
} from "@/hooks/useSupabaseQuery";
import { useTrackingLinks } from "@/hooks/useTrackingData";
import type { LpOpportunityRow } from "@/services/lpOpportunityService";
import { OpportunityWizard } from "@/components/lp/OpportunityWizard";
import { SportsEventsPanel } from "@/components/lp/SportsEventsPanel";
import { SignalRoomPanel } from "@/components/lp/SignalRoomPanel";
import { LinkLpGrid } from "@/components/lp/LinkLpGrid";
import { isSelfLandingLoop } from "@/lib/opportunityDetect";
import { BrandChip, BrandScope } from "@/components/brand/BrandScope";
import { resolveBrand } from "@/lib/brandRegistry";

const CATEGORIES = [
  { value: "sports", label: "Esportes" },
  { value: "casino", label: "Cassino" },
  { value: "offer", label: "Oferta" },
  { value: "guide", label: "Guia" },
];

type FormState = {
  landing_page_id: string;
  tracking_link_id: string;
  platform_id: string;
  campanha_id: string;
  title: string;
  subtitle: string;
  category: string;
  event_name: string;
  market_name: string;
  odd_label: string;
  badge: string;
  cta_label: string;
  destination_url: string;
  starts_at: string;
  ends_at: string;
  sort_order: number;
  is_active: boolean;
};

const empty: FormState = {
  landing_page_id: "",
  tracking_link_id: "",
  platform_id: "",
  campanha_id: "",
  title: "",
  subtitle: "",
  category: "sports",
  event_name: "",
  market_name: "",
  odd_label: "",
  badge: "",
  cta_label: "Ver oportunidade",
  destination_url: "",
  starts_at: "",
  ends_at: "",
  sort_order: 0,
  is_active: true,
};

const NONE = "__none__";

function toIso(local: string): string | null {
  if (!local) return null;
  const d = new Date(local);
  if (isNaN(d.getTime())) return null;
  return d.toISOString();
}

function toLocal(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function LpOpportunities() {
  const { toast } = useToast();
  const { data: rows, isLoading, create, update, toggleActive, remove } = useLpOpportunities();
  const { data: lps = [] } = useLandingPages();
  const { data: platforms = [] } = usePlatforms();
  const { data: campanhas = [] } = useCampanhas();
  const { data: trackingLinks = [] } = useTrackingLinks();

  const [open, setOpen] = useState(false);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(empty);
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterLp, setFilterLp] = useState<string>("all");

  const todaysHighlights = useMemo(() => {
    return (rows || [])
      .filter((r: LpOpportunityRow) => r.is_active)
      .sort((a: LpOpportunityRow, b: LpOpportunityRow) => (b.sort_order || 0) - (a.sort_order || 0))
      .slice(0, 3)
      .map((r: LpOpportunityRow) => r.id);
  }, [rows]);

  const filtered = useMemo(() => {
    return (rows || []).filter((r: LpOpportunityRow) => {
      if (filterCategory !== "all" && r.category !== filterCategory) return false;
      if (filterStatus === "active" && !r.is_active) return false;
      if (filterStatus === "inactive" && r.is_active) return false;
      if (filterLp !== "all" && r.landing_page_id !== filterLp) return false;
      return true;
    });
  }, [rows, filterCategory, filterStatus, filterLp]);

  const activeCountByCampaign = useMemo(() => {
    const m = new Map<string, number>();
    (rows || []).forEach((r: LpOpportunityRow) => {
      if (r.is_active && r.campanha_id) {
        m.set(r.campanha_id, (m.get(r.campanha_id) || 0) + 1);
      }
    });
    return m;
  }, [rows]);

  const highlightsCountByLp = useMemo(() => {
    const m = new Map<string, number>();
    (rows || []).forEach((r: LpOpportunityRow) => {
      if (r.is_active && (r.sort_order || 0) >= 20 && r.landing_page_id) {
        m.set(r.landing_page_id, (m.get(r.landing_page_id) || 0) + 1);
      }
    });
    return m;
  }, [rows]);

  function openNew() {
    setEditingId(null);
    setForm(empty);
    setOpen(true);
  }

  function openEdit(r: LpOpportunityRow) {
    setEditingId(r.id);
    setForm({
      landing_page_id: r.landing_page_id || "",
      tracking_link_id: r.tracking_link_id || "",
      platform_id: r.platform_id || "",
      campanha_id: r.campanha_id || "",
      title: r.title,
      subtitle: r.subtitle || "",
      category: r.category,
      event_name: r.event_name || "",
      market_name: r.market_name || "",
      odd_label: r.odd_label || "",
      badge: r.badge || "",
      cta_label: r.cta_label,
      destination_url: r.destination_url,
      starts_at: toLocal(r.starts_at),
      ends_at: toLocal(r.ends_at),
      sort_order: r.sort_order,
      is_active: r.is_active,
    });
    setOpen(true);
  }

  function pickTrackingLink(tlId: string) {
    const tl = trackingLinks.find((t: any) => t.id === tlId);
    if (!tl) {
      setForm((f) => ({ ...f, tracking_link_id: "" }));
      return;
    }
    // Use the affiliate/deep URL, NOT the public LP share URL - avoid loop.
    const dest =
      (tl as any).deep_link_url ||
      (tl as any).destination_url ||
      (tl as any).final_url ||
      (tl as any).affiliate_url ||
      (tl as any).target_url ||
      "";
    setForm((f) => ({
      ...f,
      tracking_link_id: tlId,
      destination_url: dest || f.destination_url,
      platform_id: (tl as any).platform_id || f.platform_id,
      campanha_id: (tl as any).campanha_id || f.campanha_id,
    }));
  }

  async function handleSave() {
    if (!form.title.trim()) {
      toast({ title: "Informe um título", variant: "destructive" });
      return;
    }
    if (!form.destination_url.trim()) {
      toast({
        title: "Destino obrigatório",
        description: "Cole a URL final (afiliado) ou selecione um tracking link.",
        variant: "destructive",
      });
      return;
    }
    if (isSelfLandingLoop(form.destination_url)) {
      toast({
        title: "Loop bloqueado",
        description: "O destino não pode apontar para oportunidades.playbet.app.br. Use o deep link da casa.",
        variant: "destructive",
      });
      return;
    }
    if (form.is_active && !form.landing_page_id) {
      toast({
        title: "Atenção",
        description: "Cards ativos devem estar vinculados a uma landing page.",
        variant: "destructive",
      });
      return;
    }

    const payload: Partial<LpOpportunityRow> = {
      landing_page_id: form.landing_page_id || null,
      tracking_link_id: form.tracking_link_id || null,
      platform_id: form.platform_id || null,
      campanha_id: form.campanha_id || null,
      title: form.title.trim(),
      subtitle: form.subtitle.trim() || null,
      category: form.category,
      event_name: form.event_name.trim() || null,
      market_name: form.market_name.trim() || null,
      odd_label: form.odd_label.trim() || null,
      badge: form.badge.trim() || null,
      cta_label: form.cta_label.trim() || "Ver oportunidade",
      destination_url: form.destination_url.trim(),
      starts_at: toIso(form.starts_at),
      ends_at: toIso(form.ends_at),
      sort_order: Number(form.sort_order) || 0,
      is_active: form.is_active,
    };

    try {
      if (editingId) await update(editingId, payload);
      else await create(payload);
      setOpen(false);
    } catch {
      /* hook already toasts */
    }
  }

  function copyJsonPreview() {
    const json = JSON.stringify(filtered, null, 2);
    navigator.clipboard.writeText(json);
    toast({ title: "JSON copiado", description: `${filtered.length} oportunidades` });
  }

  return (
    <div className="space-y-5">
      <Breadcrumbs items={[{ label: "Oportunidades LP" }]} />

      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Oportunidades</h1>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="ghost" onClick={copyJsonPreview}>
            <Copy className="w-4 h-4" />
          </Button>
          <Button size="sm" variant="outline" onClick={openNew}>
            <Plus className="w-4 h-4" /> Manual
          </Button>
          <Button size="sm" onClick={() => setWizardOpen(true)}>
            <Wand2 className="w-4 h-4" /> Assistente
          </Button>
        </div>
      </div>

      <Tabs defaultValue="links" className="space-y-5">
        <TabsList className="bg-transparent p-0 h-auto gap-1 border-b border-border/60 rounded-none w-full justify-start">
          <TabsTrigger
            value="links"
            className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-3 py-2 text-sm"
          >
            Links
          </TabsTrigger>
          <TabsTrigger
            value="manual"
            className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-3 py-2 text-sm"
          >
            Manual
          </TabsTrigger>
          <TabsTrigger
            value="assistentes"
            className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-3 py-2 text-sm"
          >
            Assistentes
          </TabsTrigger>
        </TabsList>

        <TabsContent value="links" className="mt-0">
          <LinkLpGrid />
        </TabsContent>

        <TabsContent value="assistentes" className="mt-0 space-y-5">
          <SportsEventsPanel
            platforms={platforms as any}
            landingPages={lps as any}
            onCreateOpportunity={(payload) => create(payload)}
          />
          <SignalRoomPanel
            platforms={platforms as any}
            onCreateOpportunity={(payload) => create(payload)}
          />
        </TabsContent>

        <TabsContent value="manual" className="mt-0 space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger className="h-9 w-[140px] text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Categoria</SelectItem>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="h-9 w-[130px] text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Status</SelectItem>
                <SelectItem value="active">Ativos</SelectItem>
                <SelectItem value="inactive">Inativos</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterLp} onValueChange={setFilterLp}>
              <SelectTrigger className="h-9 w-[180px] text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as LPs</SelectItem>
                {lps.map((lp: any) => (
                  <SelectItem key={lp.id} value={lp.id}>{lp.name || lp.slug}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span className="text-xs text-muted-foreground ml-auto">
              {filtered.length} {filtered.length === 1 ? "item" : "itens"}
            </span>
          </div>

          <Card className="border-border/60">
            <CardContent className="p-0">
              {isLoading ? (
                <div className="p-8 text-sm text-muted-foreground">Carregando…</div>
              ) : filtered.length === 0 ? (
                <EmptyState
                  icon={Sparkles}
                  title="Nada por aqui"
                  description="Crie um card manual ou use o assistente."
                  actionLabel="Novo"
                  onAction={openNew}
                />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-16">#</TableHead>
                      <TableHead>Título</TableHead>
                      <TableHead>Marca</TableHead>
                      <TableHead>Categoria</TableHead>
                      <TableHead>LP</TableHead>
                      <TableHead className="w-16">Ativo</TableHead>
                      <TableHead className="w-20 text-right"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((r: LpOpportunityRow) => {
                      const lp = lps.find((l: any) => l.id === r.landing_page_id);
                      const overLimit =
                        r.campanha_id && (activeCountByCampaign.get(r.campanha_id) || 0) > 3;
                      const isHighlight = todaysHighlights.includes(r.id);
                      return (
                        <TableRow key={r.id} className={isHighlight ? "bg-primary/[0.03]" : ""}>
                          <TableCell className="text-muted-foreground text-xs">
                            <div className="flex items-center gap-1">
                              {isHighlight && <Star className="w-3 h-3 text-amber-500 fill-amber-500" />}
                              {r.sort_order}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="font-medium text-sm flex items-center gap-2">
                              {r.title}
                              {r.badge && <Badge variant="secondary" className="text-[10px] font-normal">{r.badge}</Badge>}
                              {overLimit && (
                                <span title="Mais de 3 ativos nesta campanha">
                                  <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                                </span>
                              )}
                            </div>
                            {r.subtitle && (
                              <div className="text-xs text-muted-foreground truncate max-w-md">{r.subtitle}</div>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-[10px] font-normal">
                              {CATEGORIES.find((c) => c.value === r.category)?.label || r.category}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">{lp?.name || lp?.slug || "—"}</TableCell>
                          <TableCell>
                            <Switch
                              checked={r.is_active}
                              onCheckedChange={() => toggleActive(r.id, r.is_active)}
                            />
                          </TableCell>
                          <TableCell className="text-right">
                            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEdit(r)}>
                              <Pencil className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8"
                              onClick={() => {
                                if (confirm("Remover?")) remove(r.id);
                              }}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>


      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl p-0 gap-0 max-h-[92vh] overflow-hidden flex flex-col">
          <DialogHeader className="sticky top-0 z-10 px-6 py-4 border-b border-border/60 bg-card/85 backdrop-blur-md">
            <DialogTitle className="text-base font-semibold tracking-tight">
              {editingId ? "Editar oportunidade" : "Nova oportunidade"}
            </DialogTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              Edição manual. Para detecção automática use o Assistente.
            </p>
          </DialogHeader>

          <div className="main-scroll flex-1 overflow-y-auto px-6 py-5 space-y-7 min-w-0">
            {/* Destino */}
            <section className="space-y-3">
              <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground font-medium">Destino</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1.5 min-w-0">
                  <Label className="text-xs text-muted-foreground">Landing page</Label>
                  <Select
                    value={form.landing_page_id || NONE}
                    onValueChange={(v) => setForm({ ...form, landing_page_id: v === NONE ? "" : v })}
                  >
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE}>-</SelectItem>
                      {lps.map((lp: any) => (
                        <SelectItem key={lp.id} value={lp.id}>{lp.name || lp.slug}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5 min-w-0">
                  <Label className="text-xs text-muted-foreground">Tracking link (opcional)</Label>
                  <Select
                    value={form.tracking_link_id || NONE}
                    onValueChange={(v) => pickTrackingLink(v === NONE ? "" : v)}
                  >
                    <SelectTrigger><SelectValue placeholder="Usar destino manual" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE}>- manual -</SelectItem>
                      {trackingLinks.map((tl: any) => (
                        <SelectItem key={tl.id} value={tl.id}>
                          {tl.subid || tl.name || tl.id.slice(0, 8)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">URL final (afiliado / casa)</Label>
                <Input
                  value={form.destination_url}
                  onChange={(e) => setForm({ ...form, destination_url: e.target.value })}
                  placeholder="https://casa.com/?subid=..."
                  className="font-mono text-xs"
                />
                <p className="text-[11px] text-muted-foreground">
                  Use o deep link do afiliado - nunca a URL pública da LP (evita loop).
                </p>
              </div>
            </section>

            <div className="border-t border-border/50" />

            {/* Conteúdo */}
            <section className="space-y-3">
              <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground font-medium">Conteúdo</p>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Título *</Label>
                <Input
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="Ex.: Alemanha vence o Paraguai"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Subtítulo</Label>
                <Textarea
                  rows={2}
                  value={form.subtitle}
                  onChange={(e) => setForm({ ...form, subtitle: e.target.value })}
                  className="resize-none"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1.5 min-w-0">
                  <Label className="text-xs text-muted-foreground">Categoria</Label>
                  <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((c) => (
                        <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5 min-w-0">
                  <Label className="text-xs text-muted-foreground">Badge</Label>
                  <Input
                    value={form.badge}
                    onChange={(e) => setForm({ ...form, badge: e.target.value })}
                    placeholder="Ex.: SuperBoost, Ao vivo"
                  />
                </div>
              </div>
            </section>

            <div className="border-t border-border/50" />

            {/* Evento */}
            <section className="space-y-3">
              <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground font-medium">Evento & odds</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1.5 min-w-0">
                  <Label className="text-xs text-muted-foreground">Evento</Label>
                  <Input
                    value={form.event_name}
                    onChange={(e) => setForm({ ...form, event_name: e.target.value })}
                    placeholder="Alemanha x Paraguai"
                  />
                </div>
                <div className="space-y-1.5 min-w-0">
                  <Label className="text-xs text-muted-foreground">Mercado</Label>
                  <Input
                    value={form.market_name}
                    onChange={(e) => setForm({ ...form, market_name: e.target.value })}
                    placeholder="Alemanha vence, +1.5 gols"
                  />
                </div>
                <div className="space-y-1.5 min-w-0">
                  <Label className="text-xs text-muted-foreground">Odd</Label>
                  <Input
                    value={form.odd_label}
                    onChange={(e) => setForm({ ...form, odd_label: e.target.value })}
                    placeholder="Odd 1.30"
                  />
                </div>
                <div className="space-y-1.5 min-w-0">
                  <Label className="text-xs text-muted-foreground">Texto do CTA</Label>
                  <Input
                    value={form.cta_label}
                    onChange={(e) => setForm({ ...form, cta_label: e.target.value })}
                  />
                </div>
              </div>
            </section>

            <div className="border-t border-border/50" />

            {/* Vínculos */}
            <section className="space-y-3">
              <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground font-medium">Vínculos</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1.5 min-w-0">
                  <Label className="text-xs text-muted-foreground">Plataforma</Label>
                  <Select
                    value={form.platform_id || NONE}
                    onValueChange={(v) => setForm({ ...form, platform_id: v === NONE ? "" : v })}
                  >
                    <SelectTrigger><SelectValue placeholder="-" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE}>-</SelectItem>
                      {platforms.map((p: any) => (
                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5 min-w-0">
                  <Label className="text-xs text-muted-foreground">Campanha</Label>
                  <Select
                    value={form.campanha_id || NONE}
                    onValueChange={(v) => setForm({ ...form, campanha_id: v === NONE ? "" : v })}
                  >
                    <SelectTrigger><SelectValue placeholder="-" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE}>-</SelectItem>
                      {campanhas.map((c: any) => (
                        <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </section>

            <div className="border-t border-border/50" />

            {/* Agendamento */}
            <section className="space-y-3">
              <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground font-medium">Agendamento</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1.5 min-w-0">
                  <Label className="text-xs text-muted-foreground">Início</Label>
                  <Input
                    type="datetime-local"
                    value={form.starts_at}
                    onChange={(e) => setForm({ ...form, starts_at: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5 min-w-0">
                  <Label className="text-xs text-muted-foreground">Fim</Label>
                  <Input
                    type="datetime-local"
                    value={form.ends_at}
                    onChange={(e) => setForm({ ...form, ends_at: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5 min-w-0">
                  <Label className="text-xs text-muted-foreground">Ordem</Label>
                  <Input
                    type="number"
                    value={form.sort_order}
                    onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })}
                  />
                </div>
                <div className="flex items-center justify-between rounded-md border border-border/60 px-3 py-2 min-w-0">
                  <div>
                    <Label className="text-xs">Ativo</Label>
                    <p className="text-[11px] text-muted-foreground">Publicar na LP</p>
                  </div>
                  <Switch
                    checked={form.is_active}
                    onCheckedChange={(v) => setForm({ ...form, is_active: v })}
                  />
                </div>
              </div>
            </section>
          </div>

          <DialogFooter className="sticky bottom-0 z-10 px-6 py-3 border-t border-border/60 bg-card/85 backdrop-blur-md gap-2">
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave}>{editingId ? "Salvar alterações" : "Criar oportunidade"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <OpportunityWizard
        open={wizardOpen}
        onOpenChange={setWizardOpen}
        platforms={platforms as any}
        landingPages={lps as any}
        campanhas={campanhas as any}
        onCreate={(payload) => create(payload)}
        defaultLandingPageId={filterLp !== "all" ? filterLp : undefined}
        highlightsCountByLp={highlightsCountByLp}
      />
    </div>
  );
}
