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
import { Plus, Pencil, Trash2, Copy, AlertTriangle, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLpOpportunities } from "@/hooks/useLpOpportunities";
import {
  useLandingPages,
  usePlatforms,
  useCampanhas,
} from "@/hooks/useSupabaseQuery";
import { useTrackingLinks } from "@/hooks/useTrackingData";
import type { LpOpportunityRow } from "@/services/lpOpportunityService";

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
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(empty);
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterLp, setFilterLp] = useState<string>("all");

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
    // Use the affiliate/deep URL, NOT the public LP share URL — avoid loop.
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
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: "Oportunidades LP" }]} />

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Oportunidades LP</h1>
          <p className="text-sm text-muted-foreground max-w-2xl">
            A landing pública lê estes cards automaticamente. Use no máximo 3 destaques ativos por campanha.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={copyJsonPreview}>
            <Copy className="w-4 h-4" /> Copiar JSON
          </Button>
          <Button onClick={openNew}>
            <Plus className="w-4 h-4" /> Nova oportunidade
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-4 grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <Label className="text-xs">Categoria</Label>
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Status</Label>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="active">Ativos</SelectItem>
                <SelectItem value="inactive">Inativos</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Landing Page</Label>
            <Select value={filterLp} onValueChange={setFilterLp}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {lps.map((lp: any) => (
                  <SelectItem key={lp.id} value={lp.id}>{lp.name || lp.slug}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-sm text-muted-foreground">Carregando…</div>
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={Sparkles}
              title="Nenhuma oportunidade ainda"
              description="Crie a primeira oportunidade para alimentar a landing pública."
              actionLabel="Nova oportunidade"
              onAction={openNew}
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ordem</TableHead>
                  <TableHead>Título</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Período</TableHead>
                  <TableHead>LP</TableHead>
                  <TableHead>Ativo</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((r: LpOpportunityRow) => {
                  const lp = lps.find((l: any) => l.id === r.landing_page_id);
                  const overLimit =
                    r.campanha_id && (activeCountByCampaign.get(r.campanha_id) || 0) > 3;
                  return (
                    <TableRow key={r.id}>
                      <TableCell className="text-muted-foreground">{r.sort_order}</TableCell>
                      <TableCell>
                        <div className="font-medium flex items-center gap-2">
                          {r.title}
                          {r.badge && <Badge variant="secondary">{r.badge}</Badge>}
                          {overLimit && (
                            <span title="Mais de 3 ativos nesta campanha">
                              <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                            </span>
                          )}
                        </div>
                        {r.subtitle && (
                          <div className="text-xs text-muted-foreground">{r.subtitle}</div>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {CATEGORIES.find((c) => c.value === r.category)?.label || r.category}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {r.starts_at ? new Date(r.starts_at).toLocaleDateString("pt-BR") : "—"} →{" "}
                        {r.ends_at ? new Date(r.ends_at).toLocaleDateString("pt-BR") : "—"}
                      </TableCell>
                      <TableCell className="text-xs">{lp?.name || lp?.slug || "—"}</TableCell>
                      <TableCell>
                        <Switch
                          checked={r.is_active}
                          onCheckedChange={() => toggleActive(r.id, r.is_active)}
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant="ghost" onClick={() => openEdit(r)}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            if (confirm("Remover esta oportunidade?")) remove(r.id);
                          }}
                        >
                          <Trash2 className="w-4 h-4" />
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

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "Editar oportunidade" : "Nova oportunidade"}</DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <Label>Landing page</Label>
                <Select
                  value={form.landing_page_id || NONE}
                  onValueChange={(v) => setForm({ ...form, landing_page_id: v === NONE ? "" : v })}
                >
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>—</SelectItem>
                    {lps.map((lp: any) => (
                      <SelectItem key={lp.id} value={lp.id}>{lp.name || lp.slug}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Tracking link (opcional)</Label>
                <Select
                  value={form.tracking_link_id || NONE}
                  onValueChange={(v) => pickTrackingLink(v === NONE ? "" : v)}
                >
                  <SelectTrigger><SelectValue placeholder="Usar destino manual" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>— manual —</SelectItem>
                    {trackingLinks.map((tl: any) => (
                      <SelectItem key={tl.id} value={tl.id}>
                        {tl.subid || tl.name || tl.id.slice(0, 8)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="md:col-span-2">
              <Label>Destino (URL final do afiliado / casa)</Label>
              <Input
                value={form.destination_url}
                onChange={(e) => setForm({ ...form, destination_url: e.target.value })}
                placeholder="https://casa.com/?subid=..."
              />
              <p className="text-xs text-muted-foreground mt-1">
                Use o deep link do afiliado, nunca a URL pública da LP — para evitar loop.
              </p>
            </div>

            <div className="md:col-span-2">
              <Label>Título *</Label>
              <Input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Ex.: Alemanha vence o Paraguai"
              />
            </div>

            <div className="md:col-span-2">
              <Label>Subtítulo</Label>
              <Textarea
                rows={2}
                value={form.subtitle}
                onChange={(e) => setForm({ ...form, subtitle: e.target.value })}
              />
            </div>

            <div>
              <Label>Categoria</Label>
              <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Badge</Label>
              <Input
                value={form.badge}
                onChange={(e) => setForm({ ...form, badge: e.target.value })}
                placeholder="Ex.: SuperBoost, Ao vivo"
              />
            </div>

            <div>
              <Label>Evento</Label>
              <Input
                value={form.event_name}
                onChange={(e) => setForm({ ...form, event_name: e.target.value })}
                placeholder="Alemanha x Paraguai"
              />
            </div>
            <div>
              <Label>Mercado</Label>
              <Input
                value={form.market_name}
                onChange={(e) => setForm({ ...form, market_name: e.target.value })}
                placeholder="Alemanha vence, +1.5 gols"
              />
            </div>

            <div>
              <Label>Odd</Label>
              <Input
                value={form.odd_label}
                onChange={(e) => setForm({ ...form, odd_label: e.target.value })}
                placeholder="Odd 1.30"
              />
            </div>
            <div>
              <Label>Texto do CTA</Label>
              <Input
                value={form.cta_label}
                onChange={(e) => setForm({ ...form, cta_label: e.target.value })}
              />
            </div>

            <div>
              <Label>Plataforma (opcional)</Label>
              <Select
                value={form.platform_id || NONE}
                onValueChange={(v) => setForm({ ...form, platform_id: v === NONE ? "" : v })}
              >
                <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>—</SelectItem>
                  {platforms.map((p: any) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Campanha (opcional)</Label>
              <Select
                value={form.campanha_id || NONE}
                onValueChange={(v) => setForm({ ...form, campanha_id: v === NONE ? "" : v })}
              >
                <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>—</SelectItem>
                  {campanhas.map((c: any) => (
                    <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Início</Label>
              <Input
                type="datetime-local"
                value={form.starts_at}
                onChange={(e) => setForm({ ...form, starts_at: e.target.value })}
              />
            </div>
            <div>
              <Label>Fim</Label>
              <Input
                type="datetime-local"
                value={form.ends_at}
                onChange={(e) => setForm({ ...form, ends_at: e.target.value })}
              />
            </div>

            <div>
              <Label>Ordem</Label>
              <Input
                type="number"
                value={form.sort_order}
                onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })}
              />
            </div>
            <div className="flex items-center gap-3 pt-6">
              <Switch
                checked={form.is_active}
                onCheckedChange={(v) => setForm({ ...form, is_active: v })}
              />
              <Label>Ativo</Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave}>{editingId ? "Salvar" : "Criar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
