import { useEffect, useMemo, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Coins, Plus, CalendarClock, Loader2, CheckCircle2, XCircle, UserX, ChevronLeft, ChevronRight, Search, X } from "lucide-react";
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

type FilterKey = "all" | "pending_profile" | "landed" | "available";
type SortKey = "created_desc" | "created_asc" | "landed_desc" | "amount_desc";

const PENDING_OR = "notified_landed_at.is.null,and(status.eq.available,notified_available_at.is.null)";

const SORT_MAP: Record<SortKey, { column: string; asc: boolean }> = {
  created_desc: { column: "created_at", asc: false },
  created_asc: { column: "created_at", asc: true },
  landed_desc: { column: "landed_at", asc: false },
  amount_desc: { column: "amount", asc: false },
};

export function WithdrawalCyclesAdmin() {
  const [rows, setRows] = useState<CycleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [influencers, setInfluencers] = useState<{ id: string; name: string }[]>([]);
  const [managers, setManagers] = useState<{ id: string; name: string }[]>([]);
  const [nameById, setNameById] = useState<Record<string, string>>({});
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState<FilterKey>("all");
  const [sort, setSort] = useState<SortKey>("created_desc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [totalCount, setTotalCount] = useState(0);
  const [counts, setCounts] = useState({ all: 0, pending_profile: 0, landed: 0, available: 0 });
  const [stats, setStats] = useState({ landed: 0, available: 0 });
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");

  // Debounce da busca (300ms)
  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput.trim()), 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  const escapeLike = (s: string) => s.replace(/[%,()]/g, "\\$&");

  // IDs de influencer/manager cujo nome bate com a busca
  const matchedTargetIds = useMemo(() => {
    if (!search) return null;
    const q = search.toLowerCase();
    const ids = new Set<string>();
    influencers.forEach((i) => { if (i.name.toLowerCase().includes(q)) ids.add(i.id); });
    managers.forEach((m) => { if (m.name.toLowerCase().includes(q)) ids.add(m.id); });
    return Array.from(ids);
  }, [search, influencers, managers]);

  const applyFilter = useCallback((q: any, key: FilterKey) => {
    if (key === "landed" || key === "available") q = q.eq("status", key);
    else if (key === "pending_profile") q = q.or(PENDING_OR);
    return q;
  }, []);

  const applySearch = useCallback((q: any) => {
    if (!search) return q;
    const safe = escapeLike(search);
    const orParts = [`reference.ilike.%${safe}%`];
    if (matchedTargetIds && matchedTargetIds.length > 0) {
      orParts.push(`target_id.in.(${matchedTargetIds.join(",")})`);
    }
    return q.or(orParts.join(","));
  }, [search, matchedTargetIds]);

  // Rows for current page — server-side filter/sort/range/search
  const loadRows = useCallback(async () => {
    setLoading(true);
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    const { column, asc } = SORT_MAP[sort];
    let q = supabase
      .from("withdrawal_cycles")
      .select("*", { count: "exact" })
      .order(column, { ascending: asc })
      .range(from, to);
    q = applyFilter(q, filter);
    q = applySearch(q);
    const { data, count } = await q;
    setRows((data ?? []) as CycleRow[]);
    setTotalCount(count ?? 0);
    setLoading(false);
  }, [page, pageSize, sort, filter, applyFilter, applySearch]);

  // Chip counts (respeitam a busca) + stats monetários totais
  const loadCounts = useCallback(async () => {
    const head = (key: FilterKey) => {
      let q = supabase.from("withdrawal_cycles").select("id", { count: "exact", head: true });
      q = applyFilter(q, key);
      q = applySearch(q);
      return q;
    };
    const [all, pending, landed, available, sumLanded, sumAvail] = await Promise.all([
      head("all"),
      head("pending_profile"),
      head("landed"),
      head("available"),
      supabase.from("withdrawal_cycles").select("amount").eq("status", "landed"),
      supabase.from("withdrawal_cycles").select("amount").eq("status", "available"),
    ]);
    setCounts({
      all: all.count ?? 0,
      pending_profile: pending.count ?? 0,
      landed: landed.count ?? 0,
      available: available.count ?? 0,
    });
    setStats({
      landed: (sumLanded.data ?? []).reduce((a: number, r: any) => a + Number(r.amount), 0),
      available: (sumAvail.data ?? []).reduce((a: number, r: any) => a + Number(r.amount), 0),
    });
  }, [applyFilter, applySearch]);

  const loadDirectory = useCallback(async () => {
    const [{ data: inf }, { data: mgr }] = await Promise.all([
      supabase.from("influencers").select("id,name").eq("is_active", true).order("name"),
      supabase.from("managers").select("id,name").eq("is_active", true).order("name"),
    ]);
    setInfluencers(inf ?? []);
    setManagers(mgr ?? []);
    const map: Record<string, string> = {};
    (inf ?? []).forEach((i: any) => { map[i.id] = i.name; });
    (mgr ?? []).forEach((m: any) => { map[m.id] = m.name; });
    setNameById(map);
  }, []);

  useEffect(() => { loadDirectory(); }, [loadDirectory]);
  useEffect(() => { loadRows(); }, [loadRows]);
  useEffect(() => { loadCounts(); }, [loadCounts]);

  // Reset to page 1 when filters/sort/search change
  useEffect(() => { setPage(1); }, [filter, sort, pageSize, search]);

  const refreshAll = () => { loadRows(); loadCounts(); };

  const isPendingProfile = (r: CycleRow) =>
    !r.notified_landed_at || (r.status === "available" && !r.notified_available_at);

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const rangeStart = totalCount === 0 ? 0 : (page - 1) * pageSize + 1;
  const rangeEnd = Math.min(page * pageSize, totalCount);

  const filterOptions: { key: FilterKey; label: string; count: number }[] = [
    { key: "all", label: "Todos", count: counts.all },
    { key: "pending_profile", label: "Aguardando cadastro", count: counts.pending_profile },
    { key: "landed", label: "Aguardando liberar", count: counts.landed },
    { key: "available", label: "Liberados", count: counts.available },
  ];

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

      <div className="px-5 py-2.5 border-b border-border/40 flex flex-wrap items-center gap-2 bg-secondary/10">
        <div className="flex flex-wrap items-center gap-1">
          {filterOptions.map((opt) => {
            const active = filter === opt.key;
            return (
              <button
                key={opt.key}
                onClick={() => setFilter(opt.key)}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] transition-colors ${
                  active
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-transparent hover:bg-secondary/60 border-border/60 text-muted-foreground"
                }`}
              >
                {opt.label}
                <span className={`tabular-nums text-[10px] px-1.5 py-0.5 rounded-full ${active ? "bg-primary-foreground/20" : "bg-secondary/70"}`}>
                  {opt.count}
                </span>
              </button>
            );
          })}
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
            <Input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Buscar nome ou referência…"
              className="h-7 text-xs pl-8 pr-7 w-[230px]"
            />
            {searchInput && (
              <button
                type="button"
                onClick={() => setSearchInput("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label="Limpar busca"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Ordenar</span>
          <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
            <SelectTrigger className="h-7 text-xs w-[190px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="created_desc">Criação (mais recente)</SelectItem>
              <SelectItem value="created_asc">Criação (mais antigo)</SelectItem>
              <SelectItem value="landed_desc">Data de chegada</SelectItem>
              <SelectItem value="amount_desc">Maior valor</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>





      {loading && rows.length === 0 ? (
        <div className="p-6 text-sm text-muted-foreground">Carregando…</div>
      ) : totalCount === 0 && filter === "all" && !search ? (
        <div className="p-10 text-center">
          <CalendarClock className="mx-auto mb-2 text-muted-foreground" size={22} />
          <p className="text-sm font-medium">Nenhum ciclo registrado ainda</p>
          <p className="text-xs text-muted-foreground mt-1">
            Ao registrar, o influenciador ou gerente é notificado automaticamente.
          </p>
        </div>
      ) : rows.length === 0 ? (
        <div className="p-10 text-center">
          {search ? <Search className="mx-auto mb-2 text-muted-foreground" size={22} /> : <UserX className="mx-auto mb-2 text-muted-foreground" size={22} />}
          <p className="text-sm font-medium">{search ? `Nenhum resultado para "${search}"` : "Nenhum ciclo neste filtro"}</p>
          <p className="text-xs text-muted-foreground mt-1">{search ? "Tente outro nome ou referência." : "Ajuste o filtro acima para ver outros ciclos."}</p>
        </div>
      ) : (
        <div className={`overflow-x-auto max-h-[420px] ${loading ? "opacity-60" : ""}`}>
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

      {totalCount > 0 && (
        <div className="px-5 py-2.5 border-t border-border/40 flex flex-wrap items-center justify-between gap-3 bg-secondary/10 text-[11px] text-muted-foreground">
          <div className="flex items-center gap-2">
            <span>Mostrando <span className="tabular-nums text-foreground font-medium">{rangeStart}–{rangeEnd}</span> de <span className="tabular-nums text-foreground font-medium">{totalCount}</span></span>
            {loading && <Loader2 className="h-3 w-3 animate-spin" />}
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className="uppercase tracking-wider text-[10px]">Por página</span>
              <Select value={String(pageSize)} onValueChange={(v) => setPageSize(Number(v))}>
                <SelectTrigger className="h-7 w-[70px] text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[10, 25, 50, 100].map((n) => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-1">
              <Button size="icon" variant="ghost" className="h-7 w-7" disabled={page <= 1 || loading} onClick={() => setPage((p) => Math.max(1, p - 1))}>
                <ChevronLeft className="h-3.5 w-3.5" />
              </Button>
              <span className="tabular-nums px-2">{page} / {totalPages}</span>
              <Button size="icon" variant="ghost" className="h-7 w-7" disabled={page >= totalPages || loading} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </div>
      )}

      <NewCycleDialog
        open={open}
        onOpenChange={setOpen}
        influencers={influencers}
        managers={managers}
        onCreated={refreshAll}
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

function NotificationPill({ row }: { row: CycleRow }) {
  const needLanded = !row.notified_landed_at;
  const needAvailable = row.status === "available" && !row.notified_available_at;
  if (needLanded || needAvailable) {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full border bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20">
        <UserX size={10} /> Aguardando cadastro
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full border bg-emerald-500/10 text-emerald-500 border-emerald-500/20">
      <CheckCircle2 size={10} /> Enviada
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
