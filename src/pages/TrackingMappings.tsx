import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import Breadcrumbs from "@/components/Breadcrumbs";
import EmptyState from "@/components/EmptyState";

import { usePlatformEventMappings, usePlatformAccounts } from "@/hooks/useTrackingData";
import { usePlatforms } from "@/hooks/useSupabaseQuery";
import { Plus, Pencil, Trash2, Map, Info } from "lucide-react";
import type { PlatformEventMappingRow } from "@/services/trackingService";

const CANONICAL_EVENTS = [
  "click", "registration", "ftd", "deposit", "redeposit",
  "revenue", "withdrawable_revenue", "app_install", "qualified_player",
];

const SUB_FIELDS = [
  { key: "sub1_field", label: "SUB1", hint: "click_id (obrigatório)", default: "click_id" },
  { key: "sub2_field", label: "SUB2", hint: "influencer_id", default: "influencer_id" },
  { key: "sub3_field", label: "SUB3", hint: "campanha_id", default: "campanha_id" },
  { key: "sub4_field", label: "SUB4", hint: "conteudo_id", default: "conteudo_id" },
  { key: "sub5_field", label: "SUB5", hint: "lp_instance_id", default: "lp_instance_id" },
  { key: "sub6_field", label: "SUB6", hint: "tracking_code", default: "tracking_code" },
  { key: "sub7_field", label: "SUB7", hint: "utm_source", default: "utm_source" },
  { key: "sub8_field", label: "SUB8", hint: "utm_medium", default: "utm_medium" },
  { key: "sub9_field", label: "SUB9", hint: "utm_campaign", default: "utm_campaign" },
  { key: "sub10_field", label: "SUB10", hint: "reservado", default: "reserved" },
];

const emptyForm: Record<string, string> = {
  platform_id: "",
  platform_account_id: "",
  raw_event_name: "",
  canonical_event_name: "",
  amount_field: "",
  currency_field: "",
  transaction_id_field: "",
  user_id_field: "",
  country_field: "",
  status_field: "",
  sub1_field: "click_id",
  sub2_field: "influencer_id",
  sub3_field: "campanha_id",
  sub4_field: "conteudo_id",
  sub5_field: "lp_instance_id",
  sub6_field: "tracking_code",
  sub7_field: "utm_source",
  sub8_field: "utm_medium",
  sub9_field: "utm_campaign",
  sub10_field: "reserved",
  notes: "",
};

export default function TrackingMappings() {
  const [platformFilter, setPlatformFilter] = useState<string | undefined>();
  const { data, isLoading, create, update, remove } = usePlatformEventMappings(platformFilter);
  const { data: platforms } = usePlatforms();
  const { data: accounts } = usePlatformAccounts();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<typeof emptyForm & { id?: string }>({ ...emptyForm });

  const getPlatformName = (id: string) => (platforms as any[]).find((p: any) => p.id === id)?.name || "-";

  const openCreate = () => { setEditing({ ...emptyForm }); setModalOpen(true); };
  const openEdit = (m: PlatformEventMappingRow) => {
    const form: any = { id: m.id };
    Object.keys(emptyForm).forEach(k => {
      form[k] = (m as any)[k] || emptyForm[k] || "";
    });
    setEditing(form);
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!editing.platform_id || !editing.raw_event_name || !editing.canonical_event_name) return;
    const payload = { ...editing };
    const id = payload.id;
    delete (payload as any).id;
    // Clean empty strings to null for optional fields
    Object.keys(payload).forEach(k => {
      if (k !== "platform_id" && k !== "raw_event_name" && k !== "canonical_event_name" && (payload as any)[k] === "") {
        (payload as any)[k] = null;
      }
    });
    if (id) {
      await update(id, payload);
    } else {
      await create(payload);
    }
    setModalOpen(false);
  };

  const setField = (k: string, v: string) => setEditing(p => ({ ...p, [k]: v }));

  return (
    <div className="space-y-6 animate-fade-in">
      <Breadcrumbs items={[{ label: "Tracking Hub", path: "/tracking" }, { label: "Mapeamentos" }]} />

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Mapeamento de Eventos</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Configure como eventos de cada plataforma são traduzidos para o schema canônico</p>
        </div>
        <div className="flex gap-2 items-center">
          
          <Button size="sm" onClick={openCreate}><Plus size={14} className="mr-1.5" /> Novo Mapeamento</Button>
        </div>
      </div>

      {/* Quick reference */}
      <Accordion type="single" collapsible>
        <AccordionItem value="help" className="border rounded-lg px-4">
          <AccordionTrigger className="text-xs py-3">
            <div className="flex items-center gap-2">
              <Info size={13} className="text-muted-foreground" />
              <span>Como funciona o mapeamento?</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="text-xs text-muted-foreground space-y-2 pb-4">
            <p>Cada plataforma envia eventos com nomes próprios (ex: <code className="bg-secondary px-1 rounded">first_deposit</code>). O mapeamento traduz para o padrão canônico (<code className="bg-secondary px-1 rounded">ftd</code>).</p>
            <p><strong>SUBIDs:</strong> sub1 = click_id, sub2 = influencer, sub3 = campanha, sub4 = conteúdo, sub5 = LP instance, sub6 = tracking code.</p>
            <p><strong>Campos extras:</strong> amount, transaction_id, user_id, country e currency são extraídos do payload da plataforma.</p>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

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
          description="Configure mapeamentos para traduzir os eventos da plataforma (ex: first_deposit → ftd) e definir quais SUBIDs usar."
          actionLabel="Criar Mapeamento"
          onAction={openCreate}
        />
      )}

      {!isLoading && data.length > 0 && (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Plataforma</TableHead>
                    <TableHead>Evento Raw</TableHead>
                    <TableHead>Evento Canônico</TableHead>
                    <TableHead>SUB1</TableHead>
                    <TableHead>SUB2</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Transaction</TableHead>
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
                      <TableCell className="text-[10px] text-muted-foreground font-mono">{m.sub1_field || "-"}</TableCell>
                      <TableCell className="text-[10px] text-muted-foreground font-mono">{m.sub2_field || "-"}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{m.amount_field || "-"}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{m.transaction_id_field || "-"}</TableCell>
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
            </div>
          </CardContent>
        </Card>
      )}

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing.id ? "Editar Mapeamento" : "Novo Mapeamento de Evento"}</DialogTitle>
          </DialogHeader>
          <Tabs defaultValue="evento" className="mt-2">
            <TabsList className="w-full justify-start">
              <TabsTrigger value="evento">Evento</TabsTrigger>
              <TabsTrigger value="subids">SUBIDs</TabsTrigger>
              <TabsTrigger value="campos">Campos Extras</TabsTrigger>
            </TabsList>

            <TabsContent value="evento" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs font-medium">Plataforma *</Label>
                  <Select value={editing.platform_id} onValueChange={v => setField("platform_id", v)}>
                    <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      {(platforms as any[]).map((p: any) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs font-medium">Conta (opcional)</Label>
                  <Select value={editing.platform_account_id || "none"} onValueChange={v => setField("platform_account_id", v === "none" ? "" : v)}>
                    <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Todas as contas" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Todas as contas</SelectItem>
                      {accounts.filter(a => !editing.platform_id || a.platform_id === editing.platform_id).map(a => (
                        <SelectItem key={a.id} value={a.id}>{a.nome_conta}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs font-medium">Nome do evento raw (como vem da plataforma) *</Label>
                  <Input className="h-9 text-xs" value={editing.raw_event_name} onChange={e => setField("raw_event_name", e.target.value)} placeholder="ex: first_deposit, install, reg" />
                </div>
                <div>
                  <Label className="text-xs font-medium">Evento Canônico *</Label>
                  <Select value={editing.canonical_event_name} onValueChange={v => setField("canonical_event_name", v)}>
                    <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      {CANONICAL_EVENTS.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label className="text-xs font-medium">Observações</Label>
                <Input className="h-9 text-xs" value={editing.notes} onChange={e => setField("notes", e.target.value)} placeholder="Notas sobre esse mapeamento" />
              </div>
            </TabsContent>

            <TabsContent value="subids" className="space-y-3 mt-4">
              <p className="text-xs text-muted-foreground">Configure quais campos do payload da plataforma correspondem a cada SUBID.</p>
              <div className="grid grid-cols-2 gap-3">
                {SUB_FIELDS.map(sf => (
                  <div key={sf.key}>
                    <Label className="text-xs font-medium">{sf.label} <span className="text-muted-foreground font-normal">({sf.hint})</span></Label>
                    <Input
                      className="h-9 text-xs font-mono"
                      value={(editing as any)[sf.key] || ""}
                      onChange={e => setField(sf.key, e.target.value)}
                      placeholder={sf.default}
                    />
                  </div>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="campos" className="space-y-4 mt-4">
              <p className="text-xs text-muted-foreground">Campos extraídos do payload para enriquecer o evento.</p>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label className="text-xs font-medium">Campo Amount</Label>
                  <Input className="h-9 text-xs font-mono" value={editing.amount_field} onChange={e => setField("amount_field", e.target.value)} placeholder="amount" />
                </div>
                <div>
                  <Label className="text-xs font-medium">Campo Currency</Label>
                  <Input className="h-9 text-xs font-mono" value={editing.currency_field} onChange={e => setField("currency_field", e.target.value)} placeholder="currency" />
                </div>
                <div>
                  <Label className="text-xs font-medium">Campo Transaction ID</Label>
                  <Input className="h-9 text-xs font-mono" value={editing.transaction_id_field} onChange={e => setField("transaction_id_field", e.target.value)} placeholder="tid" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label className="text-xs font-medium">Campo User ID</Label>
                  <Input className="h-9 text-xs font-mono" value={editing.user_id_field} onChange={e => setField("user_id_field", e.target.value)} placeholder="user_id" />
                </div>
                <div>
                  <Label className="text-xs font-medium">Campo Country</Label>
                  <Input className="h-9 text-xs font-mono" value={editing.country_field} onChange={e => setField("country_field", e.target.value)} placeholder="country" />
                </div>
                <div>
                  <Label className="text-xs font-medium">Campo Status</Label>
                  <Input className="h-9 text-xs font-mono" value={editing.status_field} onChange={e => setField("status_field", e.target.value)} placeholder="status" />
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <Button className="mt-4 w-full" onClick={handleSave} disabled={!editing.platform_id || !editing.raw_event_name || !editing.canonical_event_name}>
            {editing.id ? "Salvar" : "Criar Mapeamento"}
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
