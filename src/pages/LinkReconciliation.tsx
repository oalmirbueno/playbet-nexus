import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Loader2, RefreshCw, AlertTriangle, CheckCircle2, Link2Off, ArrowRight, Sigma, ImageOff, LinkIcon, Camera, Clock } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";

type Sev = "ok" | "minor" | "major" | "critical";
type Period = "24h" | "7d" | "30d" | "90d";

interface Row {
  id: string;
  run_at: string;
  period_label: string;
  period_start: string | null;
  period_end: string;
  platform_id: string | null;
  dash_clicks: number; links_clicks: number; diff_clicks: number;
  dash_registrations: number; links_registrations: number; diff_registrations: number;
  dash_ftd: number; links_ftd: number; diff_ftd: number;
  dash_deposits_total: number; links_deposits_total: number; diff_deposits_total: number;
  dash_revenue: number; links_revenue: number; diff_revenue: number;
  dash_commission: number; links_commission: number; diff_commission: number;
  unattributed_link_count: number;
  severity: Sev;
  divergent: boolean;
  notes: string | null;
}

const SEV: Record<Sev, { label: string; className: string }> = {
  ok: { label: "OK", className: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30" },
  minor: { label: "Leve", className: "bg-amber-500/10 text-amber-400 border-amber-500/30" },
  major: { label: "Relevante", className: "bg-orange-500/10 text-orange-400 border-orange-500/30" },
  critical: { label: "Crítica", className: "bg-red-500/10 text-red-400 border-red-500/30" },
};

const brl = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 2 }).format(v || 0);
const num = (v: number) => new Intl.NumberFormat("pt-BR").format(Math.round(v || 0));

function Delta({ dash, links, diff, money = false }: { dash: number; links: number; diff: number; money?: boolean }) {
  const zero = Math.abs(diff) < (money ? 0.01 : 0.5);
  const fmt = money ? brl : num;
  return (
    <div className="text-xs leading-tight">
      <div className="text-muted-foreground tabular-nums">
        {fmt(dash)} <ArrowRight className="inline h-3 w-3 opacity-40" /> {fmt(links)}
      </div>
      <div className={`font-medium tabular-nums ${zero ? "text-muted-foreground" : diff > 0 ? "text-amber-400" : "text-sky-400"}`}>
        {zero ? "—" : (diff > 0 ? "+" : "") + fmt(diff)}
      </div>
    </div>
  );
}

export default function LinkReconciliation() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [period, setPeriod] = useState<Period>("7d");
  const [filter, setFilter] = useState<"all" | "divergent" | Sev>("all");

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("link_reconciliations" as never)
      .select("*")
      .order("run_at", { ascending: false })
      .limit(100);
    setLoading(false);
    if (error) { toast.error("Falha ao carregar auditorias: " + error.message); return; }
    setRows((data ?? []) as unknown as Row[]);
  };

  useEffect(() => { load(); }, []);

  const run = async () => {
    setRunning(true);
    try {
      const { data, error } = await supabase.functions.invoke("link-report-reconcile", { body: { period } });
      if (error) throw error;
      const rec = (data as any)?.reconciliation;
      toast.success(
        rec?.divergent
          ? `Auditoria concluída · divergência ${SEV[rec.severity as Sev].label}`
          : "Auditoria concluída · sem divergências relevantes",
      );
      await load();
    } catch (e: any) {
      toast.error("Falha ao rodar auditoria: " + (e?.message ?? String(e)));
    } finally {
      setRunning(false);
    }
  };

  const filtered = useMemo(
    () => rows.filter((r) => {
      if (filter === "all") return true;
      if (filter === "divergent") return r.divergent;
      return r.severity === filter;
    }),
    [rows, filter],
  );

  const last = rows[0];
  const kpis = useMemo(() => {
    const total = rows.length;
    const divergent = rows.filter((r) => r.divergent).length;
    const critical = rows.filter((r) => r.severity === "critical").length;
    const unattr = last?.unattributed_link_count ?? 0;
    return { total, divergent, critical, unattr };
  }, [rows, last]);

  return (
    <div className="p-6 space-y-6">
      <Tabs defaultValue="links" className="space-y-6">
        <TabsList>
          <TabsTrigger value="links">Dashboard × Links</TabsTrigger>
          <TabsTrigger value="odds"><Sigma className="h-3.5 w-3.5 mr-1.5" /> Odds compartilhadas</TabsTrigger>
        </TabsList>
        <TabsContent value="links" className="space-y-6 mt-0">

      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Reconciliação Dashboard × Links</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Compara os totais do Dashboard/Tracking com a soma dos mesmos números atribuídos a cada link.
            Divergência = número aparece no dashboard mas não foi vinculado a nenhum link — comissão sem dono.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={period} onValueChange={(v) => setPeriod(v as Period)}>
            <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="24h">Últimas 24h</SelectItem>
              <SelectItem value="7d">Últimos 7 dias</SelectItem>
              <SelectItem value="30d">Últimos 30 dias</SelectItem>
              <SelectItem value="90d">Últimos 90 dias</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={run} disabled={running}>
            {running ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
            Rodar auditoria
          </Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
        <Card><CardContent className="p-4">
          <div className="text-xs uppercase text-muted-foreground">Última execução</div>
          <div className="text-lg font-semibold mt-1">
            {last?.run_at ? new Date(last.run_at).toLocaleString("pt-BR") : "—"}
          </div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="text-xs uppercase text-muted-foreground">Auditorias armazenadas</div>
          <div className="text-2xl font-semibold mt-1 tabular-nums">{kpis.total}</div>
        </CardContent></Card>
        <Card className={kpis.divergent > 0 ? "border-amber-500/30" : ""}><CardContent className="p-4">
          <div className="text-xs uppercase text-muted-foreground">Divergentes</div>
          <div className="text-2xl font-semibold mt-1 tabular-nums text-amber-400">{kpis.divergent}</div>
        </CardContent></Card>
        <Card className={kpis.unattr > 0 ? "border-red-500/40" : ""}><CardContent className="p-4">
          <div className="text-xs uppercase text-muted-foreground flex items-center gap-1">
            <Link2Off className="h-3 w-3" /> Registros sem link (última)
          </div>
          <div className="text-2xl font-semibold mt-1 tabular-nums text-red-400">{kpis.unattr}</div>
        </CardContent></Card>
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base">Histórico de auditorias</CardTitle>
          <div className="flex gap-1">
            {(["all", "divergent", "critical", "major", "minor", "ok"] as const).map((k) => (
              <Button key={k} size="sm" variant={filter === k ? "default" : "ghost"} onClick={() => setFilter(k)}>
                {k === "all" ? "Tudo" : k === "divergent" ? "Divergentes" : SEV[k].label}
              </Button>
            ))}
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center gap-2 text-muted-foreground p-6">
              <Loader2 className="h-4 w-4 animate-spin" /> Carregando…
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex items-center gap-2 text-muted-foreground p-6">
              <CheckCircle2 className="h-4 w-4" /> Nenhum registro para este filtro. Rode uma auditoria para começar.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Período</TableHead>
                  <TableHead>Executada</TableHead>
                  <TableHead>Severidade</TableHead>
                  <TableHead>Sem link</TableHead>
                  <TableHead>Cliques</TableHead>
                  <TableHead>Cadastros</TableHead>
                  <TableHead>FTDs</TableHead>
                  <TableHead>Depósitos</TableHead>
                  <TableHead>Revenue</TableHead>
                  <TableHead>Comissão</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((r) => {
                  const s = SEV[r.severity];
                  return (
                    <TableRow key={r.id} className={
                      r.severity === "critical" ? "bg-red-500/5" :
                      r.severity === "major" ? "bg-orange-500/5" :
                      r.severity === "minor" ? "bg-amber-500/[0.03]" : ""
                    }>
                      <TableCell className="font-medium">
                        {r.period_label}
                        <div className="text-[10px] text-muted-foreground">
                          {r.period_start ? new Date(r.period_start).toLocaleDateString("pt-BR") : "—"}
                          {" → "}
                          {new Date(r.period_end).toLocaleDateString("pt-BR")}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground tabular-nums">
                        {new Date(r.run_at).toLocaleString("pt-BR")}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={s.className}>
                          {r.severity !== "ok" && <AlertTriangle className="h-3 w-3 mr-1" />}
                          {s.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="tabular-nums">
                        <span className={r.unattributed_link_count > 0 ? "text-red-400 font-medium" : "text-muted-foreground"}>
                          {r.unattributed_link_count}
                        </span>
                      </TableCell>
                      <TableCell><Delta dash={r.dash_clicks} links={r.links_clicks} diff={r.diff_clicks} /></TableCell>
                      <TableCell><Delta dash={r.dash_registrations} links={r.links_registrations} diff={r.diff_registrations} /></TableCell>
                      <TableCell><Delta dash={r.dash_ftd} links={r.links_ftd} diff={r.diff_ftd} /></TableCell>
                      <TableCell><Delta dash={r.dash_deposits_total} links={r.links_deposits_total} diff={r.diff_deposits_total} money /></TableCell>
                      <TableCell><Delta dash={r.dash_revenue} links={r.links_revenue} diff={r.diff_revenue} money /></TableCell>
                      <TableCell><Delta dash={r.dash_commission} links={r.links_commission} diff={r.diff_commission} money /></TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        Auditoria automática diária às 09:30 (BRT). Divergências <em>Relevantes</em> ou <em>Críticas</em> indicam
        números do dashboard que ainda não estão vinculados a nenhum link — corrija o postback / SUBID para atribuir.
      </p>
      </TabsContent>
      <TabsContent value="odds" className="mt-0">
        <OddsReconciliationPanel />
      </TabsContent>
      </Tabs>
    </div>
  );
}

// ---- Odds panel ----

type OddsSev = "ok" | "minor" | "major" | "critical";
interface OddsRow {
  id: string;
  run_at: string;
  period_label: string;
  period_start: string | null;
  period_end: string;
  odds_links_total: number;
  odds_links_single: number;
  odds_links_multipla: number;
  odds_links_sistema: number;
  odds_avg_total_odd: number;
  odds_selections_total: number;
  materials_total: number;
  materials_ready: number;
  materials_failed: number;
  links_without_material: number;
  links_without_bookmaker_url: number;
  links_without_screenshot: number;
  links_expired_event: number;
  gaps: Array<{ tracking_link_id: string; reasons: string[] }> | null;
  severity: OddsSev;
  divergent: boolean;
  notes: string | null;
}

function OddsReconciliationPanel() {
  const [rows, setRows] = useState<OddsRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [period, setPeriod] = useState<Period>("7d");

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("odds_reconciliations" as never)
      .select("*")
      .order("run_at", { ascending: false })
      .limit(60);
    setLoading(false);
    if (error) { toast.error("Falha ao carregar auditoria de odds: " + error.message); return; }
    setRows((data ?? []) as unknown as OddsRow[]);
  };

  useEffect(() => { load(); }, []);

  const run = async () => {
    setRunning(true);
    try {
      const { data, error } = await supabase.functions.invoke("odds-reconcile", { body: { period } });
      if (error) throw error;
      const rec = (data as any)?.reconciliation;
      toast.success(
        rec?.divergent
          ? `Auditoria de odds · divergência ${SEV[rec.severity as OddsSev].label}`
          : "Auditoria de odds concluída · tudo em ordem",
      );
      await load();
    } catch (e: any) {
      toast.error("Falha ao rodar auditoria de odds: " + (e?.message ?? String(e)));
    } finally { setRunning(false); }
  };

  const last = rows[0];

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Reconciliação de Odds Compartilhadas</h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
            Compara os links de aposta compartilhada com os materiais gerados a partir deles. Detecta odds
            sem material, sem URL da casa, sem screenshot e eventos já expirados no período.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={period} onValueChange={(v) => setPeriod(v as Period)}>
            <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="24h">Últimas 24h</SelectItem>
              <SelectItem value="7d">Últimos 7 dias</SelectItem>
              <SelectItem value="30d">Últimos 30 dias</SelectItem>
              <SelectItem value="90d">Últimos 90 dias</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={run} disabled={running}>
            {running ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
            Rodar auditoria
          </Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card><CardContent className="p-4">
          <div className="text-xs uppercase text-muted-foreground">Última execução</div>
          <div className="text-lg font-semibold mt-1">
            {last?.run_at ? new Date(last.run_at).toLocaleString("pt-BR") : "—"}
          </div>
          <div className="text-[11px] text-muted-foreground mt-1">{last?.notes ?? ""}</div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="text-xs uppercase text-muted-foreground">Links de odds (última)</div>
          <div className="text-2xl font-semibold mt-1 tabular-nums">{last?.odds_links_total ?? 0}</div>
          <div className="text-[11px] text-muted-foreground mt-1">
            {last ? `${last.odds_links_single} simples · ${last.odds_links_multipla} múltiplas · ${last.odds_links_sistema} sistema` : "—"}
          </div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="text-xs uppercase text-muted-foreground">Odd média · seleções</div>
          <div className="text-2xl font-semibold mt-1 tabular-nums">{(last?.odds_avg_total_odd ?? 0).toFixed(2)}</div>
          <div className="text-[11px] text-muted-foreground mt-1">
            {last ? `${last.odds_selections_total} pernas · ${last.materials_ready}/${last.materials_total} materiais ready` : "—"}
          </div>
        </CardContent></Card>
        <Card className={(last?.links_without_material ?? 0) > 0 ? "border-red-500/40" : ""}><CardContent className="p-4">
          <div className="text-xs uppercase text-muted-foreground flex items-center gap-1">
            <ImageOff className="h-3 w-3" /> Odds sem material
          </div>
          <div className="text-2xl font-semibold mt-1 tabular-nums text-red-400">{last?.links_without_material ?? 0}</div>
          <div className="text-[11px] text-muted-foreground mt-1">
            {last ? `${last.links_expired_event} evento(s) expirado(s)` : "—"}
          </div>
        </CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Histórico de auditorias de odds</CardTitle></CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center gap-2 text-muted-foreground p-6">
              <Loader2 className="h-4 w-4 animate-spin" /> Carregando…
            </div>
          ) : rows.length === 0 ? (
            <div className="flex items-center gap-2 text-muted-foreground p-6">
              <CheckCircle2 className="h-4 w-4" /> Nenhuma auditoria de odds ainda. Rode uma para começar.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Período</TableHead>
                  <TableHead>Executada</TableHead>
                  <TableHead>Severidade</TableHead>
                  <TableHead>Links odds</TableHead>
                  <TableHead>Materiais</TableHead>
                  <TableHead><ImageOff className="inline h-3 w-3 mr-1" />Sem mat.</TableHead>
                  <TableHead><LinkIcon className="inline h-3 w-3 mr-1" />Sem URL</TableHead>
                  <TableHead><Camera className="inline h-3 w-3 mr-1" />Sem print</TableHead>
                  <TableHead><Clock className="inline h-3 w-3 mr-1" />Expirados</TableHead>
                  <TableHead>Odd méd.</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => {
                  const s = SEV[r.severity];
                  return (
                    <TableRow key={r.id} className={
                      r.severity === "critical" ? "bg-red-500/5" :
                      r.severity === "major" ? "bg-orange-500/5" :
                      r.severity === "minor" ? "bg-amber-500/[0.03]" : ""
                    }>
                      <TableCell className="font-medium">
                        {r.period_label}
                        <div className="text-[10px] text-muted-foreground">
                          {r.period_start ? new Date(r.period_start).toLocaleDateString("pt-BR") : "—"}
                          {" → "}
                          {new Date(r.period_end).toLocaleDateString("pt-BR")}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground tabular-nums">
                        {new Date(r.run_at).toLocaleString("pt-BR")}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={s.className}>
                          {r.severity !== "ok" && <AlertTriangle className="h-3 w-3 mr-1" />}
                          {s.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="tabular-nums">
                        <div className="font-medium">{r.odds_links_total}</div>
                        <div className="text-[10px] text-muted-foreground">
                          S{r.odds_links_single}/M{r.odds_links_multipla}/Sy{r.odds_links_sistema}
                        </div>
                      </TableCell>
                      <TableCell className="tabular-nums">
                        <div className="font-medium">{r.materials_ready}/{r.materials_total}</div>
                        {r.materials_failed > 0 && (
                          <div className="text-[10px] text-red-400">{r.materials_failed} falha(s)</div>
                        )}
                      </TableCell>
                      <TableCell className="tabular-nums">
                        <span className={r.links_without_material > 0 ? "text-red-400 font-medium" : "text-muted-foreground"}>
                          {r.links_without_material}
                        </span>
                      </TableCell>
                      <TableCell className="tabular-nums">
                        <span className={r.links_without_bookmaker_url > 0 ? "text-amber-400 font-medium" : "text-muted-foreground"}>
                          {r.links_without_bookmaker_url}
                        </span>
                      </TableCell>
                      <TableCell className="tabular-nums">
                        <span className={r.links_without_screenshot > 0 ? "text-amber-400 font-medium" : "text-muted-foreground"}>
                          {r.links_without_screenshot}
                        </span>
                      </TableCell>
                      <TableCell className="tabular-nums">
                        <span className={r.links_expired_event > 0 ? "text-orange-400 font-medium" : "text-muted-foreground"}>
                          {r.links_expired_event}
                        </span>
                      </TableCell>
                      <TableCell className="tabular-nums">{(r.odds_avg_total_odd || 0).toFixed(2)}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        Auditoria de odds diária às 09:45 (BRT). Divergência = link com odds cadastradas mas sem material
        pronto, sem URL da casa, sem screenshot ou com evento já expirado — quebra a experiência do bilhete.
      </p>
    </div>
  );
}

