import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft, Target, Users, TrendingUp, Settings2, KeyRound, Link2, ExternalLink,
  RefreshCw, Save, Edit3, Trash2, ChevronRight, ShieldAlert, Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

const db = supabase as any;
const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

// ────────────────────────────────────────────────────────────
// Data hooks
// ────────────────────────────────────────────────────────────
function useSquadDetail(squadId: string | undefined) {
  const qc = useQueryClient();
  const enabled = !!squadId;

  const squad = useQuery({
    queryKey: ["squad-detail", squadId],
    enabled,
    queryFn: async () => {
      const { data, error } = await db.from("squads").select("*").eq("id", squadId).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const roster = useQuery({
    queryKey: ["squad-roster", squadId],
    enabled,
    queryFn: async () => {
      const { data, error } = await db
        .from("influencers")
        .select("*")
        .eq("squad_id", squadId)
        .order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const perf = useQuery({
    queryKey: ["squad-perf-30d", squadId, roster.data?.map((i: any) => i.id).join(",")],
    enabled: enabled && (roster.data?.length ?? 0) > 0,
    queryFn: async () => {
      const ids = (roster.data ?? []).map((i: any) => i.id);
      if (!ids.length) return {} as Record<string, number>;
      const since = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
      const { data, error } = await db
        .from("tracking_metrics")
        .select("influencer_id, revenue")
        .in("influencer_id", ids)
        .gte("data_ref", since)
        .eq("is_demo", false);
      if (error) throw error;
      const map: Record<string, number> = {};
      for (const row of data ?? []) {
        map[row.influencer_id] = (map[row.influencer_id] ?? 0) + Number(row.revenue ?? 0);
      }
      return map;
    },
  });

  const managers = useQuery({
    queryKey: ["squad-managers-catalog"],
    queryFn: async () => {
      const { data, error } = await db
        .from("managers")
        .select("id,name,slug,squad_id,compensation_mode,origin_type,hierarchy_role")
        .eq("is_active", true).order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const directors = useQuery({
    queryKey: ["squad-directors-catalog"],
    queryFn: async () => {
      const { data, error } = await db.from("directors").select("id,name").order("name");
      if (error) return [];
      return data ?? [];
    },
  });

  const activity = useQuery({
    queryKey: ["squad-activity", squadId],
    enabled,
    queryFn: async () => {
      const { data, error } = await db
        .from("squad_activity")
        .select("*")
        .eq("squad_id", squadId)
        .order("created_at", { ascending: false })
        .limit(10);
      if (error) return [];
      return data ?? [];
    },
  });

  const invalidateAll = () => {
    qc.invalidateQueries({ queryKey: ["squad-detail", squadId] });
    qc.invalidateQueries({ queryKey: ["squad-roster", squadId] });
    qc.invalidateQueries({ queryKey: ["squad-activity", squadId] });
    qc.invalidateQueries({ queryKey: ["squads"] });
    qc.invalidateQueries({ queryKey: ["influencers"] });
  };

  return { squad, roster, perf, managers, directors, activity, invalidateAll };
}

// ────────────────────────────────────────────────────────────
// Main page
// ────────────────────────────────────────────────────────────
export default function SquadDetail() {
  const { squadId } = useParams<{ squadId: string }>();
  const nav = useNavigate();
  const { isAdmin, role } = useAuth();
  const canManage = isAdmin || role === "gerente"; // director-level lives under admin/socio

  const { squad, roster, perf, managers, directors, activity, invalidateAll } = useSquadDetail(squadId);

  const [distributeOpen, setDistributeOpen] = useState(false);
  const [profileId, setProfileId] = useState<string | null>(null);
  const [linksOfId, setLinksOfId] = useState<string | null>(null);

  const [editHeader, setEditHeader] = useState(false);
  const [draft, setDraft] = useState({ monthly_goal: "", manager_goal_brl: "", manager_id: "", director_id: "" });

  const s = squad.data;
  const rows = roster.data ?? [];
  const perfMap = perf.data ?? {};

  const totalRealized = useMemo(
    () => rows.reduce((sum: number, r: any) => sum + (perfMap[r.id] ?? 0), 0),
    [rows, perfMap]
  );
  const goalPct = s?.monthly_goal ? Math.min(100, (totalRealized / Number(s.monthly_goal)) * 100) : 0;

  const openEdit = () => {
    if (!s) return;
    setDraft({
      monthly_goal: s.monthly_goal?.toString() ?? "",
      manager_goal_brl: s.manager_goal_brl?.toString() ?? "",
      manager_id: s.manager_id ?? "",
      director_id: s.director_id ?? "",
    });
    setEditHeader(true);
  };

  const saveHeader = async () => {
    if (!squadId) return;
    const payload: any = {
      monthly_goal: draft.monthly_goal ? Number(draft.monthly_goal) : null,
      manager_goal_brl: draft.manager_goal_brl ? Number(draft.manager_goal_brl) : null,
      manager_id: draft.manager_id || null,
      director_id: draft.director_id || null,
    };
    const { error } = await db.from("squads").update(payload).eq("id", squadId);
    if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); return; }
    await db.from("squad_activity").insert({ squad_id: squadId, action: "header_updated", payload });
    toast({ title: "Squad atualizado" });
    setEditHeader(false);
    invalidateAll();
  };

  const updateInfluencerGoal = async (id: string, val: number | null) => {
    const { error } = await db.from("influencers").update({ monthly_goal_brl: val }).eq("id", id);
    if (error) toast({ title: "Erro", description: error.message, variant: "destructive" });
    else invalidateAll();
  };

  const toggleActive = async (id: string, curr: boolean) => {
    const { error } = await db.from("influencers").update({ is_active: !curr }).eq("id", id);
    if (error) toast({ title: "Erro", description: error.message, variant: "destructive" });
    else invalidateAll();
  };

  const removeFromSquad = async (id: string) => {
    if (!confirm("Remover influenciador do squad?")) return;
    const { error } = await db.from("influencers").update({ squad_id: null }).eq("id", id);
    if (error) toast({ title: "Erro", description: error.message, variant: "destructive" });
    else { toast({ title: "Removido do squad" }); invalidateAll(); }
  };

  const sendPasswordReset = async (email: string | null) => {
    if (!email) { toast({ title: "Sem email cadastrado", variant: "destructive" }); return; }
    const { data, error } = await (supabase as any).functions.invoke("admin-user-manage", {
      body: { action: "send_recovery", email },
    });
    if (error || (data as any)?.error) {
      toast({ title: "Erro ao enviar reset", description: error?.message ?? (data as any)?.error, variant: "destructive" });
    } else {
      toast({ title: "Link de reset enviado", description: email });
    }
  };

  if (!squadId) return null;

  if (squad.isLoading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!s) {
    return (
      <div className="p-6">
        <p className="text-sm text-muted-foreground">Squad não encontrado.</p>
        <Button variant="ghost" onClick={() => nav("/pessoas")} className="mt-3"><ArrowLeft size={14} className="mr-1" /> Voltar</Button>
      </div>
    );
  }

  const manager = managers.data?.find((m: any) => m.id === s.manager_id);
  const director = directors.data?.find((d: any) => d.id === s.director_id);
  const isSocioManager = manager?.origin_type === "socio" || manager?.compensation_mode === "socio_only";

  return (
    <div className="min-h-screen bg-background">
      {/* Breadcrumb / back */}
      <div className="border-b border-border">
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-3 flex items-center gap-2 text-xs">
          <button onClick={() => nav("/pessoas")} className="text-muted-foreground hover:text-foreground flex items-center gap-1">
            <ArrowLeft size={12} /> Pessoas
          </button>
          <ChevronRight size={12} className="text-muted-foreground" />
          <span className="text-foreground font-medium">{s.name}</span>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-6 py-5 space-y-5">
        {/* Header */}
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-1.5 h-14 rounded-sm shrink-0" style={{ backgroundColor: s.color }} />
              <div className="min-w-0">
                <h1 className="text-lg md:text-xl font-semibold truncate">{s.name}</h1>
                <div className="flex flex-wrap items-center gap-2 mt-1.5 text-[11px] text-muted-foreground">
                  <span className="inline-flex items-center gap-1"><Users size={11} /> {rows.length} membros · {rows.filter((r: any) => r.is_active).length} ativos</span>
                  {director && <Badge variant="outline" className="h-5 text-[10px]">Diretor: {director.name}</Badge>}
                  {manager && (
                    <Badge variant="outline" className="h-5 text-[10px]">
                      Gerente: {manager.name}
                      {isSocioManager && <span className="ml-1 text-amber-500">· Sócia</span>}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
            {canManage && (
              <Button size="sm" variant="outline" onClick={openEdit}>
                <Settings2 size={14} className="mr-1.5" /> Editar squad
              </Button>
            )}
          </div>

          {/* Goal strip */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mt-5">
            <div className="rounded-lg border border-border bg-secondary/30 p-3">
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground flex items-center gap-1"><Target size={10} /> Meta do squad</div>
              <div className="text-base font-semibold mt-1">{s.monthly_goal ? brl(Number(s.monthly_goal)) : "—"}</div>
            </div>
            <div className="rounded-lg border border-border bg-secondary/30 p-3">
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground flex items-center gap-1"><TrendingUp size={10} /> Realizado 30d</div>
              <div className="text-base font-semibold mt-1">{brl(totalRealized)}</div>
            </div>
            <div className="rounded-lg border border-border bg-secondary/30 p-3">
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Meta do gerente</div>
              <div className="text-base font-semibold mt-1">{s.manager_goal_brl ? brl(Number(s.manager_goal_brl)) : "—"}</div>
            </div>
            <div className="rounded-lg border border-border bg-secondary/30 p-3">
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Progresso</div>
              <div className="mt-2"><Progress value={goalPct} className="h-2" /></div>
              <div className="text-[11px] text-muted-foreground mt-1">{goalPct.toFixed(0)}% da meta</div>
            </div>
          </div>

          {canManage && (
            <div className="flex items-center gap-2 mt-4">
              <Button size="sm" onClick={() => setDistributeOpen(true)} disabled={!s.monthly_goal || rows.length === 0}>
                <Sparkles size={14} className="mr-1.5" /> Distribuir meta aos influenciadores
              </Button>
              {s.goal_last_distributed_at && (
                <span className="text-[11px] text-muted-foreground">
                  Última distribuição: {new Date(s.goal_last_distributed_at).toLocaleDateString("pt-BR")} · modo {s.goal_distribution_mode ?? "equal"}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Roster */}
        <div className="rounded-xl border border-border bg-card">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <h2 className="text-sm font-semibold">Roster de influenciadores</h2>
            <span className="text-[11px] text-muted-foreground">Total: {brl(rows.reduce((s: number, r: any) => s + Number(r.monthly_goal_brl ?? 0), 0))}</span>
          </div>

          {roster.isLoading ? (
            <div className="p-4 space-y-2">
              <Skeleton className="h-8" /><Skeleton className="h-8" /><Skeleton className="h-8" />
            </div>
          ) : rows.length === 0 ? (
            <div className="p-10 text-center">
              <Users size={26} className="mx-auto mb-2 text-muted-foreground/60" />
              <p className="text-sm">Nenhum influenciador vinculado</p>
              <p className="text-xs text-muted-foreground mt-1">Aprove candidatos no pipeline comercial para popular o squad.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-[13px]">
                <thead className="bg-secondary/30 text-[10px] uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="text-left px-4 py-2">Influenciador</th>
                    <th className="text-left px-3 py-2">Categoria</th>
                    <th className="text-right px-3 py-2">Meta ind.</th>
                    <th className="text-right px-3 py-2">Realizado 30d</th>
                    <th className="text-right px-3 py-2">%</th>
                    <th className="text-center px-3 py-2">Ativo</th>
                    <th className="text-right px-4 py-2">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r: any) => {
                    const realized = perfMap[r.id] ?? 0;
                    const goal = Number(r.monthly_goal_brl ?? 0);
                    const pct = goal > 0 ? Math.min(999, (realized / goal) * 100) : 0;
                    return (
                      <tr key={r.id} className="border-t border-border/60 hover:bg-secondary/20">
                        <td className="px-4 py-2">
                          <button className="font-medium hover:underline text-left" onClick={() => setProfileId(r.id)}>
                            {r.name}
                          </button>
                          {r.instagram && <div className="text-[11px] text-muted-foreground">@{r.instagram.replace(/^@/, "")}</div>}
                        </td>
                        <td className="px-3 py-2 text-muted-foreground">{r.category}</td>
                        <td className="px-3 py-2 text-right">
                          <InlineGoalInput
                            value={goal}
                            disabled={!canManage}
                            onSave={(v) => updateInfluencerGoal(r.id, v)}
                          />
                        </td>
                        <td className="px-3 py-2 text-right">{brl(realized)}</td>
                        <td className="px-3 py-2 text-right">
                          <span className={pct >= 100 ? "text-emerald-500 font-medium" : pct >= 50 ? "text-amber-500" : "text-muted-foreground"}>
                            {goal > 0 ? `${pct.toFixed(0)}%` : "—"}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-center">
                          <Switch checked={r.is_active} disabled={!canManage} onCheckedChange={() => toggleActive(r.id, r.is_active)} />
                        </td>
                        <td className="px-4 py-2 text-right">
                          <div className="inline-flex items-center gap-1">
                            <IconBtn title="Perfil" onClick={() => setProfileId(r.id)}><Edit3 size={12} /></IconBtn>
                            <IconBtn title="Links do influenciador" onClick={() => setLinksOfId(r.id)}><Link2 size={12} /></IconBtn>
                            {canManage && (
                              <IconBtn title="Enviar reset de senha" onClick={() => sendPasswordReset(r.email ?? null)}>
                                <KeyRound size={12} />
                              </IconBtn>
                            )}
                            {canManage && (
                              <IconBtn title="Remover do squad" onClick={() => removeFromSquad(r.id)} danger>
                                <Trash2 size={12} />
                              </IconBtn>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Activity */}
        <div className="rounded-xl border border-border bg-card p-4">
          <h2 className="text-sm font-semibold mb-3">Histórico do squad</h2>
          {activity.data && activity.data.length > 0 ? (
            <ul className="space-y-2">
              {activity.data.map((a: any) => (
                <li key={a.id} className="text-[12px] flex items-center gap-2">
                  <span className="text-muted-foreground w-24 shrink-0">{new Date(a.created_at).toLocaleString("pt-BR")}</span>
                  <Badge variant="outline" className="h-5 text-[10px]">{a.action}</Badge>
                  <code className="text-[11px] text-muted-foreground truncate">{JSON.stringify(a.payload)}</code>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-muted-foreground">Nenhuma atividade registrada ainda.</p>
          )}
        </div>
      </div>

      {/* Edit header dialog */}
      <Dialog open={editHeader} onOpenChange={setEditHeader}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Editar squad</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label className="text-xs">Meta mensal do squad (R$)</Label>
              <Input type="number" value={draft.monthly_goal} onChange={(e) => setDraft({ ...draft, monthly_goal: e.target.value })} />
            </div>
            <div>
              <Label className="text-xs">Meta do gerente (R$)</Label>
              <Input type="number" value={draft.manager_goal_brl} onChange={(e) => setDraft({ ...draft, manager_goal_brl: e.target.value })} />
            </div>
            <div>
              <Label className="text-xs">Gerente responsável</Label>
              <Select value={draft.manager_id || "none"} onValueChange={(v) => setDraft({ ...draft, manager_id: v === "none" ? "" : v })}>
                <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sem gerente</SelectItem>
                  {managers.data?.map((m: any) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.name}{m.origin_type === "socio" ? " · Sócia" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Diretor</Label>
              <Select value={draft.director_id || "none"} onValueChange={(v) => setDraft({ ...draft, director_id: v === "none" ? "" : v })}>
                <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sem diretor</SelectItem>
                  {directors.data?.map((d: any) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditHeader(false)}>Cancelar</Button>
            <Button onClick={saveHeader}><Save size={14} className="mr-1.5" /> Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DistributeGoalDialog
        open={distributeOpen}
        onClose={() => setDistributeOpen(false)}
        squadId={squadId}
        squadGoal={Number(s.monthly_goal ?? 0)}
        rows={rows}
        perfMap={perfMap}
        onDone={invalidateAll}
      />

      <InfluencerQuickProfile
        influencerId={profileId}
        onClose={() => setProfileId(null)}
        onOpenLinks={(id) => { setProfileId(null); setLinksOfId(id); }}
        onSendReset={sendPasswordReset}
        canManage={canManage}
      />

      <InfluencerLinksSheet influencerId={linksOfId} onClose={() => setLinksOfId(null)} canManage={canManage} />
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// Inline goal editor
// ────────────────────────────────────────────────────────────
function InlineGoalInput({ value, disabled, onSave }: { value: number; disabled?: boolean; onSave: (v: number | null) => void }) {
  const [v, setV] = useState<string>(value ? String(value) : "");
  return (
    <div className="flex items-center gap-1 justify-end">
      <Input
        type="number"
        className="h-7 w-24 text-right text-[12px] px-2"
        value={v}
        disabled={disabled}
        onChange={(e) => setV(e.target.value)}
        onBlur={() => {
          const num = v ? Number(v) : null;
          if (num !== value) onSave(num);
        }}
        placeholder="—"
      />
    </div>
  );
}

function IconBtn({ children, onClick, title, danger }: { children: React.ReactNode; onClick: () => void; title: string; danger?: boolean }) {
  return (
    <button
      title={title}
      onClick={onClick}
      className={`p-1.5 rounded ${danger ? "hover:bg-destructive/10 text-muted-foreground hover:text-destructive" : "hover:bg-secondary text-muted-foreground hover:text-foreground"}`}
    >
      {children}
    </button>
  );
}

// ────────────────────────────────────────────────────────────
// Distribute goal dialog
// ────────────────────────────────────────────────────────────
function DistributeGoalDialog({ open, onClose, squadId, squadGoal, rows, perfMap, onDone }: {
  open: boolean; onClose: () => void; squadId: string; squadGoal: number;
  rows: any[]; perfMap: Record<string, number>; onDone: () => void;
}) {
  const [mode, setMode] = useState<"equal" | "weighted" | "manual">("equal");
  const [overrides, setOverrides] = useState<Record<string, string>>({});
  const [running, setRunning] = useState(false);

  const active = rows.filter((r) => r.is_active);
  const preview = useMemo(() => {
    if (mode === "equal") {
      const share = active.length ? squadGoal / active.length : 0;
      return active.map((r) => ({ id: r.id, name: r.name, value: share }));
    }
    if (mode === "weighted") {
      const total = active.reduce((s, r) => s + (perfMap[r.id] ?? 0), 0);
      return active.map((r) => ({
        id: r.id, name: r.name,
        value: total > 0 ? squadGoal * ((perfMap[r.id] ?? 0) / total) : (active.length ? squadGoal / active.length : 0),
      }));
    }
    return active.map((r) => ({ id: r.id, name: r.name, value: Number(overrides[r.id] ?? r.monthly_goal_brl ?? 0) }));
  }, [mode, active, squadGoal, perfMap, overrides]);

  const submit = async () => {
    setRunning(true);
    try {
      const payload: any = { _squad_id: squadId, _mode: mode };
      if (mode === "manual") payload._overrides = overrides;
      const { data, error } = await (supabase as any).rpc("distribute_squad_goal", payload);
      if (error) throw error;
      toast({ title: "Metas distribuídas", description: `${(data as any)?.updated ?? 0} atualizações` });
      onDone(); onClose();
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    } finally { setRunning(false); }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Distribuir meta do squad</DialogTitle></DialogHeader>
        <div className="space-y-3 py-1">
          <div className="text-[11px] text-muted-foreground">Meta total: <strong className="text-foreground">{brl(squadGoal)}</strong> · {active.length} ativos</div>
          <div className="grid grid-cols-3 gap-1.5">
            {(["equal", "weighted", "manual"] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`px-2 py-2 rounded-md border text-[11px] font-medium ${mode === m ? "border-primary bg-primary/10 text-foreground" : "border-border text-muted-foreground"}`}
              >
                {m === "equal" ? "Igual" : m === "weighted" ? "Ponderada 30d" : "Manual"}
              </button>
            ))}
          </div>
          <div className="max-h-64 overflow-auto rounded-md border border-border">
            <table className="w-full text-[12px]">
              <tbody>
                {preview.map((p) => (
                  <tr key={p.id} className="border-b border-border/60">
                    <td className="px-3 py-1.5">{p.name}</td>
                    <td className="px-3 py-1.5 text-right">
                      {mode === "manual" ? (
                        <Input
                          type="number"
                          className="h-7 w-28 text-right text-[12px] ml-auto"
                          value={overrides[p.id] ?? ""}
                          placeholder={String(Math.round(p.value))}
                          onChange={(e) => setOverrides({ ...overrides, [p.id]: e.target.value })}
                        />
                      ) : brl(p.value)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {mode === "weighted" && active.every((r) => (perfMap[r.id] ?? 0) === 0) && (
            <div className="text-[11px] text-amber-500 flex items-center gap-1"><ShieldAlert size={11} /> Sem receita nos últimos 30 dias — cai para divisão igual.</div>
          )}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button onClick={submit} disabled={running || squadGoal <= 0}>{running ? "Aplicando…" : "Aplicar distribuição"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ────────────────────────────────────────────────────────────
// Quick profile drawer
// ────────────────────────────────────────────────────────────
function InfluencerQuickProfile({ influencerId, onClose, onOpenLinks, onSendReset, canManage }: {
  influencerId: string | null; onClose: () => void; onOpenLinks: (id: string) => void;
  onSendReset: (email: string | null) => void; canManage: boolean;
}) {
  const q = useQuery({
    queryKey: ["influencer-profile", influencerId],
    enabled: !!influencerId,
    queryFn: async () => {
      const { data: inf } = await db.from("influencers").select("*").eq("id", influencerId).maybeSingle();
      const { data: profile } = await db.from("profiles").select("id,email,phone,full_name").eq("influencer_id", influencerId).maybeSingle();
      return { inf, profile };
    },
  });

  const inf = q.data?.inf;
  const profile = q.data?.profile;

  return (
    <Sheet open={!!influencerId} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{inf?.name ?? "Influenciador"}</SheetTitle>
        </SheetHeader>
        {!inf ? (
          <Skeleton className="h-32 w-full mt-4" />
        ) : (
          <div className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-2 text-[12px]">
              <Info label="Categoria" value={inf.category} />
              <Info label="Nível" value={inf.career_label ?? `L${inf.career_level}`} />
              <Info label="Instagram" value={inf.instagram} />
              <Info label="Seguidores" value={inf.followers?.toLocaleString("pt-BR") ?? "—"} />
              <Info label="Comissão" value={inf.commission_percent ? `${inf.commission_percent}%` : "—"} />
              <Info label="Meta" value={inf.monthly_goal_brl ? brl(Number(inf.monthly_goal_brl)) : "—"} />
            </div>

            <div className="rounded-lg border border-border p-3 space-y-2">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Conta de acesso</p>
              <Info label="Email" value={profile?.email ?? "—"} />
              <Info label="Telefone" value={profile?.phone ?? "—"} />
              {canManage && (
                <Button size="sm" variant="outline" className="w-full mt-1" onClick={() => onSendReset(profile?.email ?? null)}>
                  <KeyRound size={13} className="mr-1.5" /> Enviar link de reset de senha
                </Button>
              )}
            </div>

            <div className="flex gap-2">
              <Button size="sm" variant="outline" className="flex-1" onClick={() => onOpenLinks(inf.id)}>
                <Link2 size={13} className="mr-1.5" /> Ver links
              </Button>
              <Button asChild size="sm" variant="outline" className="flex-1">
                <a href={`/influencers/${inf.id}`}>
                  <ExternalLink size={13} className="mr-1.5" /> Perfil completo
                </a>
              </Button>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

function Info({ label, value }: { label: string; value: any }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-[12px] font-medium truncate">{value ?? "—"}</p>
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// Influencer links manager
// ────────────────────────────────────────────────────────────
function InfluencerLinksSheet({ influencerId, onClose, canManage }: {
  influencerId: string | null; onClose: () => void; canManage: boolean;
}) {
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["influencer-tracking-links", influencerId],
    enabled: !!influencerId,
    queryFn: async () => {
      const { data } = await db.from("tracking_links")
        .select("id,name,short_url,base_url,is_active,game_name,link_category,updated_at,is_broken")
        .eq("influencer_id", influencerId)
        .order("updated_at", { ascending: false });
      return data ?? [];
    },
  });

  const toggle = async (id: string, curr: boolean) => {
    const { error } = await db.from("tracking_links").update({ is_active: !curr }).eq("id", id);
    if (error) toast({ title: "Erro", description: error.message, variant: "destructive" });
    else qc.invalidateQueries({ queryKey: ["influencer-tracking-links", influencerId] });
  };

  const markBroken = async (id: string, curr: boolean) => {
    const { error } = await db.from("tracking_links").update({ is_broken: !curr }).eq("id", id);
    if (error) {
      // column may not exist — fallback to deactivating
      toast({ title: "Marcando como inativo", variant: "default" });
      await toggle(id, true);
    } else {
      qc.invalidateQueries({ queryKey: ["influencer-tracking-links", influencerId] });
    }
  };

  return (
    <Sheet open={!!influencerId} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader><SheetTitle>Links do influenciador</SheetTitle></SheetHeader>
        <div className="space-y-2 mt-4">
          {q.isLoading ? <Skeleton className="h-24 w-full" /> :
            (q.data ?? []).length === 0 ? (
              <p className="text-xs text-muted-foreground">Nenhum link cadastrado.</p>
            ) : (
              q.data!.map((l: any) => (
                <div key={l.id} className="rounded-lg border border-border p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-[13px] font-medium truncate">{l.name ?? l.game_name ?? "Link"}</p>
                      <a href={l.short_url ?? l.base_url} target="_blank" rel="noreferrer" className="text-[11px] text-muted-foreground hover:text-foreground break-all">
                        {l.short_url ?? l.base_url}
                      </a>
                      <div className="flex items-center gap-1.5 mt-1">
                        {l.link_category && <Badge variant="outline" className="h-4 text-[9px]">{l.link_category}</Badge>}
                        {!l.is_active && <Badge variant="destructive" className="h-4 text-[9px]">Inativo</Badge>}
                        {l.is_broken && <Badge variant="destructive" className="h-4 text-[9px]">Quebrado</Badge>}
                      </div>
                    </div>
                    {canManage && (
                      <div className="flex flex-col items-end gap-1.5 shrink-0">
                        <Switch checked={l.is_active} onCheckedChange={() => toggle(l.id, l.is_active)} />
                        <button
                          onClick={() => markBroken(l.id, l.is_broken)}
                          className="text-[10px] text-muted-foreground hover:text-destructive underline"
                        >
                          {l.is_broken ? "Marcar OK" : "Marcar quebrado"}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
