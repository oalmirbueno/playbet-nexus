import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import Breadcrumbs from "@/components/Breadcrumbs";
import EmptyState from "@/components/EmptyState";
import { usePlatformEventMappings } from "@/hooks/useTrackingData";
import { usePlatforms } from "@/hooks/useSupabaseQuery";
import { Plus, Pencil, Trash2, Map } from "lucide-react";
import type { PlatformEventMappingRow } from "@/services/trackingService";

const CANONICAL_EVENTS = [
  "click", "registration", "ftd", "deposit", "redeposit",
  "revenue", "withdrawable_revenue", "app_install", "qualified_player",
];

const emptyForm = {
  platform_id: "",
  raw_event_name: "",
  canonical_event_name: "",
  amount_field: "",
  currency_field: "",
  transaction_id_field: "",
  user_id_field: "",
  country_field: "",
  status_field: "",
  notes: "",
};

export default function TrackingMappings() {
  const [platformFilter, setPlatformFilter] = useState<string | undefined>();
  const { data, isLoading, create, update, remove } = usePlatformEventMappings(platformFilter);
  const { data: platforms } = usePlatforms();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<typeof emptyForm & { id?: string }>(emptyForm);

  const getPlatformName = (id: string) => (platforms as any[]).find((p: any) => p.id === id)?.name || "—";

  const openCreate = () => { setEditing(emptyForm); setModalOpen(true); };
  const openEdit = (m: PlatformEventMappingRow) => {
    setEditing({
      id: m.id,
      platform_id: m.platform_id,
      raw_event_name: m.raw_event_name,
      canonical_event_name: m.canonical_event_name,
      amount_field: m.amount_field || "",
      currency_field: m.currency_field || "",
      transaction_id_field: m.transaction_id_field || "",
      user_id_field: m.user_id_field || "",
      country_field: m.country_field || "",
      status_field: m.status_field || "",
      notes: m.notes || "",
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!editing.platform_id || !editing.raw_event_name || !editing.canonical_event_name) return;
    const payload = { ...editing };
    const id = payload.id;
    delete (payload as any).id;
    if (id) {
      await update(id, payload);
    } else {
      await create(payload);
    }
    setModalOpen(false);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <Breadcrumbs items={[{ label: "Tracking Hub", path: "/tracking" }, { label: "Mapeamentos" }]} />

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Mapeamento de Eventos</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Configure como eventos de cada plataforma são traduzidos para o schema canônico</p>
        </div>
        <Button size="sm" onClick={openCreate}><Plus size={14} className="mr-1.5" /> Novo Mapeamento</Button>
      </div>

      <div className="flex gap-3">
        <Select value={platformFilter || "all"} onValueChange={v => setPlatformFilter(v === "all" ? undefined : v)}>
          <SelectTrigger className="h-9 text-xs w-[200px]"><SelectValue placeholder="Filtrar por plataforma" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas plataformas</SelectItem>
            {(platforms as any[]).map((p: any) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {isLoading && <Card><CardContent className="py-12 text-center text-muted-foreground text-sm">Carregando...</CardContent></Card>}

      {!isLoading && data.length === 0 && (
        <EmptyState
          icon={Map}
          title="Nenhum mapeamento configurado"
          description="Configure mapeamentos para traduzir eventos das plataformas para o schema canônico."
          actionLabel="Criar Mapeamento"
          onAction={openCreate}
        />
      )}

      {!isLoading && data.length > 0 && (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Plataforma</TableHead>
                  <TableHead>Evento Raw</TableHead>
                  <TableHead>Evento Canônico</TableHead>
                  <TableHead>Campo Amount</TableHead>
                  <TableHead>Campo Transaction</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map(m => (
                  <TableRow key={m.id}>
                    <TableCell>{getPlatformName(m.platform_id)}</TableCell>
                    <TableCell className="font-mono text-xs">{m.raw_event_name}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="text-[10px]">{m.canonical_event_name}</Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{m.amount_field || "—"}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{m.transaction_id_field || "—"}</TableCell>
                    <TableCell>
                      <Badge variant={m.is_active ? "default" : "secondary"} className="text-[10px]">
                        {m.is_active ? "Ativo" : "Inativo"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(m)}><Pencil size={13} /></Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => remove(m.id)}><Trash2 size={13} /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing.id ? "Editar Mapeamento" : "Novo Mapeamento"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Plataforma *</Label>
                <Select value={editing.platform_id} onValueChange={v => setEditing(p => ({ ...p, platform_id: v }))}>
                  <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {(platforms as any[]).map((p: any) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Evento Canônico *</Label>
                <Select value={editing.canonical_event_name} onValueChange={v => setEditing(p => ({ ...p, canonical_event_name: v }))}>
                  <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {CANONICAL_EVENTS.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label className="text-xs">Nome do evento raw (como vem da plataforma) *</Label>
              <Input className="h-9 text-xs" value={editing.raw_event_name} onChange={e => setEditing(p => ({ ...p, raw_event_name: e.target.value }))} placeholder="ex: first_deposit" />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label className="text-xs">Campo Amount</Label>
                <Input className="h-9 text-xs" value={editing.amount_field} onChange={e => setEditing(p => ({ ...p, amount_field: e.target.value }))} placeholder="amount" />
              </div>
              <div>
                <Label className="text-xs">Campo Currency</Label>
                <Input className="h-9 text-xs" value={editing.currency_field} onChange={e => setEditing(p => ({ ...p, currency_field: e.target.value }))} placeholder="currency" />
              </div>
              <div>
                <Label className="text-xs">Campo Transaction ID</Label>
                <Input className="h-9 text-xs" value={editing.transaction_id_field} onChange={e => setEditing(p => ({ ...p, transaction_id_field: e.target.value }))} placeholder="tid" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label className="text-xs">Campo User ID</Label>
                <Input className="h-9 text-xs" value={editing.user_id_field} onChange={e => setEditing(p => ({ ...p, user_id_field: e.target.value }))} placeholder="user_id" />
              </div>
              <div>
                <Label className="text-xs">Campo Country</Label>
                <Input className="h-9 text-xs" value={editing.country_field} onChange={e => setEditing(p => ({ ...p, country_field: e.target.value }))} placeholder="country" />
              </div>
              <div>
                <Label className="text-xs">Campo Status</Label>
                <Input className="h-9 text-xs" value={editing.status_field} onChange={e => setEditing(p => ({ ...p, status_field: e.target.value }))} placeholder="status" />
              </div>
            </div>
            <div>
              <Label className="text-xs">Observações</Label>
              <Input className="h-9 text-xs" value={editing.notes} onChange={e => setEditing(p => ({ ...p, notes: e.target.value }))} />
            </div>
            <Button onClick={handleSave} disabled={!editing.platform_id || !editing.raw_event_name || !editing.canonical_event_name}>
              {editing.id ? "Salvar" : "Criar Mapeamento"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
