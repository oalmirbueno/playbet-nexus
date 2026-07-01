import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Coins, Plus, CalendarClock, Loader2, CheckCircle2, XCircle, UserX } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

const brl = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

interface CycleRow {
  id: string;
  target_type: "influencer" | "manager";
  target_id: string;
  amount: number;
  landed_at: string;
  available_at: string;
  status: string;
  source: string | null;
  reference: string | null;
  notes: string | null;
  created_at: string;
  notified_landed_at: string | null;
  notified_available_at: string | null;
}

export function WithdrawalCyclesAdmin() {
  const [rows, setRows] = useState<CycleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [influencers, setInfluencers] = useState<{ id: string; name: string }[]>([]);
  const [managers, setManagers] = useState<{ id: string; name: string }[]>([]);
  const [nameById, setNameById] = useState<Record<string, string>>({});
  const [open, setOpen] = useState(false);

  const load = async () => {
    setLoading(true);
    const [{ data: c }, { data: inf }, { data: mgr }] = await Promise.all([
      supabase.from("withdrawal_cycles").select("*").order("landed_at", { ascending: false }).limit(60),
      supabase.from("influencers").select("id,name").eq("is_active", true).order("name"),
      supabase.from("managers").select("id,name").eq("is_active", true).order("name"),
    ]);
    setRows((c ?? []) as CycleRow[]);
    setInfluencers(inf ?? []);
    setManagers(mgr ?? []);
    const map: Record<string, string> = {};
    (inf ?? []).forEach((i: any) => { map[i.id] = i.name; });
    (mgr ?? []).forEach((m: any) => { map[m.id] = m.name; });
    setNameById(map);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const stats = useMemo(() => {
    const landed = rows.filter((r) => r.status === "landed").reduce((a, r) => a + Number(r.amount), 0);
    const available = rows.filter((r) => r.status === "available").reduce((a, r) => a + Number(r.amount), 0);
    return { landed, available, count: rows.length };
  }, [rows]);

  return (
    <div className="rounded-xl border border-border/60 bg-card/40 overflow-hidden">
      <div className="px-5 py-3 border-b border-border/40 flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-primary/15 text-primary flex items-center justify-center">
            <Coins className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold">Ciclos de recebimento (Asaas)</h3>
            <p className="text-[11px] text-muted-foreground">
              Registre cada entrada de dinheiro para liberar o saque em 3 dias.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4 text-[11px] text-muted-foreground">
          <span>Aguardando: <span className="text-amber-600 dark:text-amber-400 font-semibold">{brl(stats.landed)}</span></span>
          <span>Liberado: <span className="text-emerald-600 dark:text-emerald-400 font-semibold">{brl(stats.available)}</span></span>
          <Button size="sm" className="gap-1.5" onClick={() => setOpen(true)}>
            <Plus className="h-3.5 w-3.5" /> Registrar entrada
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="p-6 text-sm text-muted-foreground">Carregando…</div>
      ) : rows.length === 0 ? (
        <div className="p-10 text-center">
          <CalendarClock className="mx-auto mb-2 text-muted-foreground" size={22} />
          <p className="text-sm font-medium">Nenhum ciclo registrado ainda</p>
          <p className="text-xs text-muted-foreground mt-1">
            Ao registrar, o influenciador ou gerente é notificado automaticamente.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto max-h-[420px]">
          <table className="w-full text-[13px]">
            <thead className="bg-secondary/40 text-[10px] uppercase tracking-wider text-muted-foreground sticky top-0 backdrop-blur">
              <tr>
                <th className="px-4 py-2 text-left">Destinatário</th>
                <th className="px-4 py-2 text-right">Valor</th>
                <th className="px-4 py-2 text-left">Chegou</th>
                <th className="px-4 py-2 text-left">Libera</th>
                <th className="px-4 py-2 text-left">Status</th>
                <th className="px-4 py-2 text-left">Notificação</th>
                <th className="px-4 py-2 text-left">Ref.</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const pending = !r.notified_landed_at || (r.status === "available" && !r.notified_available_at);
                return (
                <tr key={r.id} className="border-t border-border/40 hover:bg-secondary/20">
                  <td className="px-4 py-2">
                    <div className="font-medium truncate flex items-center gap-1.5">
                      {nameById[r.target_id] ?? r.target_id.slice(0, 8)}
                      {pending && (
                        <TooltipProvider delayDuration={100}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <UserX className="h-3 w-3 text-amber-500" />
                            </TooltipTrigger>
                            <TooltipContent className="text-xs max-w-[220px]">
                              Usuário ainda sem cadastro na plataforma. A notificação será enviada automaticamente assim que o acesso for provisionado.
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                    </div>
                    <div className="text-[10px] text-muted-foreground uppercase tracking-wider">
                      {r.target_type === "manager" ? "Gerente" : "Influenciador"}
                    </div>
                  </td>
                  <td className="px-4 py-2 text-right font-semibold tabular-nums">{brl(Number(r.amount))}</td>
                  <td className="px-4 py-2 text-[11px] text-muted-foreground tabular-nums">
                    {new Date(r.landed_at).toLocaleDateString("pt-BR")}
                  </td>
                  <td className="px-4 py-2 text-[11px] tabular-nums">
                    {formatDistanceToNow(new Date(r.available_at), { addSuffix: true, locale: ptBR })}
                  </td>
                  <td className="px-4 py-2"><StatusPill status={r.status} /></td>
                  <td className="px-4 py-2"><NotificationPill row={r} /></td>
                  <td className="px-4 py-2 text-[11px] font-mono text-muted-foreground truncate max-w-[180px]">
                    {r.reference ?? "—"}
                  </td>
                </tr>
              );})}
            </tbody>
          </table>
        </div>
      )}

      <NewCycleDialog
        open={open}
        onOpenChange={setOpen}
        influencers={influencers}
        managers={managers}
        onCreated={load}
      />
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, { cls: string; label: string; Icon: any }> = {
    landed: { cls: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20", label: "Aguardando", Icon: CalendarClock },
    available: { cls: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20", label: "Liberado", Icon: CheckCircle2 },
    consumed: { cls: "bg-muted text-muted-foreground border-border", label: "Consumido", Icon: CheckCircle2 },
    cancelled: { cls: "bg-destructive/10 text-destructive border-destructive/20", label: "Cancelado", Icon: XCircle },
  };
  const c = map[status] ?? map.landed;
  const Icon = c.Icon;
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full border ${c.cls}`}>
      <Icon size={10} /> {c.label}
    </span>
  );
}

function NewCycleDialog({ open, onOpenChange, influencers, managers, onCreated }: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  influencers: { id: string; name: string }[];
  managers: { id: string; name: string }[];
  onCreated: () => void;
}) {
  const [targetType, setTargetType] = useState<"influencer" | "manager">("influencer");
  const [targetId, setTargetId] = useState("");
  const [amount, setAmount] = useState("");
  const [landedAt, setLandedAt] = useState(new Date().toISOString().slice(0, 10));
  const [releaseDays, setReleaseDays] = useState(3);
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const value = Number(amount.replace(/\./g, "").replace(",", "."));
  const disabled = !targetId || !(value > 0) || saving;

  async function create() {
    if (disabled) return;
    setSaving(true);
    const landed = new Date(landedAt + "T12:00:00");
    const available = new Date(landed);
    available.setDate(available.getDate() + releaseDays);
    const { error } = await supabase.from("withdrawal_cycles").insert({
      target_type: targetType,
      target_id: targetId,
      amount: value,
      landed_at: landed.toISOString(),
      available_at: available.toISOString(),
      source: "asaas",
      reference: reference.trim() || null,
      notes: notes.trim() || null,
      status: "landed",
    });
    setSaving(false);
    if (error) {
      toast({ title: "Erro ao registrar", description: error.message, variant: "destructive" });
      return;
    }
    toast({
      title: "Ciclo registrado",
      description: `${brl(value)} liberará em ${releaseDays} dias. Usuário foi notificado.`,
    });
    setAmount(""); setReference(""); setNotes(""); setTargetId("");
    onOpenChange(false);
    onCreated();
  }

  const options = targetType === "influencer" ? influencers : managers;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display flex items-center gap-2">
            <Coins className="h-4 w-4 text-primary" />
            Registrar entrada de dinheiro
          </DialogTitle>
          <DialogDescription>
            Use quando o valor cair na conta Asaas para um influenciador ou gerente.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">Destinatário</Label>
            <RadioGroup
              className="mt-2 grid grid-cols-2 gap-2"
              value={targetType}
              onValueChange={(v) => { setTargetType(v as any); setTargetId(""); }}
            >
              {[{ v: "influencer", t: "Influenciador" }, { v: "manager", t: "Gerente" }].map((o) => (
                <label
                  key={o.v}
                  className={`flex items-center gap-2 rounded-lg border p-2.5 cursor-pointer ${
                    targetType === o.v ? "border-primary bg-primary/5" : "border-border/60 hover:bg-secondary/40"
                  }`}
                >
                  <RadioGroupItem value={o.v} />
                  <span className="text-sm font-medium">{o.t}</span>
                </label>
              ))}
            </RadioGroup>
          </div>

          <div>
            <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">Pessoa</Label>
            <Select value={targetId} onValueChange={setTargetId}>
              <SelectTrigger className="mt-1"><SelectValue placeholder="Selecione…" /></SelectTrigger>
              <SelectContent>
                {options.map((o) => (
                  <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">Valor recebido</Label>
              <div className="relative mt-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">R$</span>
                <Input
                  inputMode="decimal"
                  className="pl-9 tabular-nums"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value.replace(/[^0-9,.]/g, ""))}
                  placeholder="0,00"
                />
              </div>
            </div>
            <div>
              <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">Data de chegada</Label>
              <Input type="date" className="mt-1" value={landedAt} onChange={(e) => setLandedAt(e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">Dias até liberar</Label>
              <Input
                type="number"
                min={0}
                max={30}
                className="mt-1 tabular-nums"
                value={releaseDays}
                onChange={(e) => setReleaseDays(Math.max(0, Math.min(30, Number(e.target.value) || 0)))}
              />
            </div>
            <div>
              <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">Referência Asaas</Label>
              <Input
                className="mt-1 font-mono text-xs"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder="pay_xxxxxxxx"
              />
            </div>
          </div>

          <div>
            <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">Notas internas</Label>
            <Textarea rows={2} className="mt-1" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={create} disabled={disabled} className="gap-2">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            {saving ? "Registrando…" : "Registrar e notificar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
