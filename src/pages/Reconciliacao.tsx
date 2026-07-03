import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, RefreshCw, AlertTriangle, CheckCircle2, ArrowRight } from "lucide-react";
import { toast } from "sonner";

type Sev = "ok" | "minor" | "major" | "critical";

interface Row {
  id: string;
  run_at: string;
  brand_slug: string;
  brand_name: string | null;
  data_ref: string;
  panel_registrations: number; db_registrations: number; diff_registrations: number;
  panel_ftds: number; db_ftds: number; diff_ftds: number;
  panel_deposits_count: number; db_deposits_count: number; diff_deposits_count: number;
  panel_deposits_total: number; db_deposits_total: number; diff_deposits_total: number;
  panel_ngr: number; db_ngr: number; diff_ngr: number;
  panel_commission: number; db_commission: number; diff_commission: number;
  severity: Sev;
  divergent: boolean;
}

const SEV_BADGE: Record<Sev, { label: string; className: string }> = {
  ok:       { label: "OK",       className: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30" },
  minor:    { label: "Leve",     className: "bg-amber-500/10 text-amber-400 border-amber-500/30" },
  major:    { label: "Relevante",className: "bg-orange-500/10 text-orange-400 border-orange-500/30" },
  critical: { label: "Crítica",  className: "bg-red-500/10 text-red-400 border-red-500/30" },
};

const brl = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 2 }).format(v || 0);

function DeltaCell({ panel, db, diff, money = false }: { panel: number; db: number; diff: number; money?: boolean }) {
  const zero = Math.abs(diff) < 0.01;
  return (
    <div className="text-xs leading-tight">
      <div className="text-muted-foreground tabular-nums">
        {money ? brl(panel) : panel} <span className="opacity-40">→</span> {money ? brl(db) : db}
      </div>
      <div
        className={`font-medium tabular-nums ${
          zero ? "text-muted-foreground" : diff > 0 ? "text-amber-400" : "text-sky-400"
        }`}
      >
        {zero ? "—" : (diff > 0 ? "+" : "") + (money ? brl(diff) : diff)}
      </div>
    </div>
  );
}

export default function Reconciliacao() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [filter, setFilter] = useState<"all" | "divergent" | Sev>("all");
  const [days, setDays] = useState<number>(7);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("panel_reconciliations")
      .select("*")
      .order("run_at", { ascending: false })
      .order("data_ref", { ascending: false })
      .limit(400);
    setLoading(false);
    if (error) { toast.error("Falha ao carregar auditorias: " + error.message); return; }
    setRows((data ?? []) as Row[]);
  };

  useEffect(() => { load(); }, []);

  const runAudit = async () => {
    setRunning(true);
    try {
      const { data, error } = await supabase.functions.invoke("stellar-panel-reconcile", {
        body: { days },
      });
      if (error) throw error;
      const summary = data as any;
      toast.success(
        `Auditoria concluída · ${summary?.rows_written ?? 0} linhas · ${summary?.divergent_count ?? 0} divergências (${summary?.worst_severity ?? "ok"})`,
      );
      await load();
    } catch (e: any) {
      toast.error("Falha ao rodar auditoria: " + (e?.message ?? String(e)));
    } finally {
      setRunning(false);
    }
  };

  const latestRunAt = rows[0]?.run_at ?? null;
  const latestRows = useMemo(
    () => (latestRunAt ? rows.filter((r) => r.run_at === latestRunAt) : []),
    [rows, latestRunAt],
  );

  const filtered = useMemo(() => {
    return latestRows.filter((r) => {
      if (filter === "all") return true;
      if (filter === "divergent") return r.divergent;
      return r.severity === filter;
    });
  }, [latestRows, filter]);

  const kpis = useMemo(() => {
    const total = latestRows.length;
    const divergent = latestRows.filter((r) => r.divergent).length;
    const critical = latestRows.filter((r) => r.severity === "critical").length;
    const major = latestRows.filter((r) => r.severity === "major").length;
    return { total, divergent, critical, major };
  }, [latestRows]);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Auditoria & Reconciliação</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Compara os totais reportados pelo painel da Estrela com os números do banco. Divergências relevantes disparam notificação para admins.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={String(days)} onValueChange={(v) => setDays(Number(v))}>
            <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {[1, 3, 7, 14, 30].map((d) => (
                <SelectItem key={d} value={String(d)}>{d} dia{d > 1 ? "s" : ""}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={runAudit} disabled={running}>
            {running ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
            Rodar auditoria
          </Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
        <Card><CardContent className="p-4">
          <div className="text-xs uppercase text-muted-foreground">Última execução</div>
          <div className="text-lg font-semibold mt-1">
            {latestRunAt ? new Date(latestRunAt).toLocaleString("pt-BR") : "—"}
          </div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="text-xs uppercase text-muted-foreground">Linhas auditadas</div>
          <div className="text-2xl font-semibold mt-1 tabular-nums">{kpis.total}</div>
        </CardContent></Card>
        <Card className={kpis.divergent > 0 ? "border-amber-500/30" : ""}><CardContent className="p-4">
          <div className="text-xs uppercase text-muted-foreground">Divergências</div>
          <div className="text-2xl font-semibold mt-1 tabular-nums text-amber-400">{kpis.divergent}</div>
        </CardContent></Card>
        <Card className={kpis.critical > 0 ? "border-red-500/40" : ""}><CardContent className="p-4">
          <div className="text-xs uppercase text-muted-foreground">Críticas / Relevantes</div>
          <div className="text-2xl font-semibold mt-1 tabular-nums text-red-400">
            {kpis.critical}<span className="text-muted-foreground/60 text-base"> / {kpis.major}</span>
          </div>
        </CardContent></Card>
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base">Última execução por marca × dia</CardTitle>
          <div className="flex gap-1">
            {(["all","divergent","critical","major","minor","ok"] as const).map((k) => (
              <Button
                key={k}
                size="sm"
                variant={filter === k ? "default" : "ghost"}
                onClick={() => setFilter(k)}
              >
                {k === "all" ? "Tudo" : k === "divergent" ? "Divergentes" : SEV_BADGE[k].label}
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
              <CheckCircle2 className="h-4 w-4" /> Nenhum registro para este filtro.
            </div>
          ) : (
            <div className="overflow-auto -mx-2 px-2">
              <table className="min-w-full text-sm">
                <thead className="text-xs uppercase text-muted-foreground">
                  <tr className="border-b border-border/40">
                    <th className="text-left py-2 pr-3">Marca</th>
                    <th className="text-left py-2 pr-3">Data</th>
                    <th className="text-left py-2 pr-3">Severidade</th>
                    <th className="text-left py-2 pr-3">Cadastros</th>
                    <th className="text-left py-2 pr-3">FTDs</th>
                    <th className="text-left py-2 pr-3">Depósitos (qtd)</th>
                    <th className="text-left py-2 pr-3">Depósitos (R$)</th>
                    <th className="text-left py-2 pr-3">NGR</th>
                    <th className="text-left py-2 pr-3">Comissão</th>
                  </tr>
                  <tr className="text-[10px] text-muted-foreground/60">
                    <th colSpan={3}></th>
                    <th className="pb-2 pr-3">Painel <ArrowRight className="inline h-3 w-3" /> Banco</th>
                    <th className="pb-2 pr-3">Painel <ArrowRight className="inline h-3 w-3" /> Banco</th>
                    <th className="pb-2 pr-3">Painel <ArrowRight className="inline h-3 w-3" /> Banco</th>
                    <th className="pb-2 pr-3">Painel <ArrowRight className="inline h-3 w-3" /> Banco</th>
                    <th className="pb-2 pr-3">Painel <ArrowRight className="inline h-3 w-3" /> Banco</th>
                    <th className="pb-2 pr-3">Painel <ArrowRight className="inline h-3 w-3" /> Banco</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r) => {
                    const sev = SEV_BADGE[r.severity];
                    return (
                      <tr
                        key={r.id}
                        className={`border-b border-border/20 ${
                          r.severity === "critical" ? "bg-red-500/5" :
                          r.severity === "major" ? "bg-orange-500/5" :
                          r.severity === "minor" ? "bg-amber-500/[0.03]" : ""
                        }`}
                      >
                        <td className="py-2 pr-3 font-medium">{r.brand_name ?? r.brand_slug}</td>
                        <td className="py-2 pr-3 tabular-nums text-muted-foreground">
                          {new Date(r.data_ref).toLocaleDateString("pt-BR")}
                        </td>
                        <td className="py-2 pr-3">
                          <Badge variant="outline" className={sev.className}>
                            {r.severity !== "ok" && <AlertTriangle className="h-3 w-3 mr-1" />}
                            {sev.label}
                          </Badge>
                        </td>
                        <td className="py-2 pr-3"><DeltaCell panel={r.panel_registrations} db={r.db_registrations} diff={r.diff_registrations} /></td>
                        <td className="py-2 pr-3"><DeltaCell panel={r.panel_ftds} db={r.db_ftds} diff={r.diff_ftds} /></td>
                        <td className="py-2 pr-3"><DeltaCell panel={r.panel_deposits_count} db={r.db_deposits_count} diff={r.diff_deposits_count} /></td>
                        <td className="py-2 pr-3"><DeltaCell panel={r.panel_deposits_total} db={r.db_deposits_total} diff={r.diff_deposits_total} money /></td>
                        <td className="py-2 pr-3"><DeltaCell panel={r.panel_ngr} db={r.db_ngr} diff={r.diff_ngr} money /></td>
                        <td className="py-2 pr-3"><DeltaCell panel={r.panel_commission} db={r.db_commission} diff={r.diff_commission} money /></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        Auditoria automática diária às 09:22 (BRT). Divergências <em>relevantes</em> ou <em>críticas</em> notificam admins.
      </p>
    </div>
  );
}
