import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { usePlatforms } from "@/hooks/useSupabaseQuery";
import { useAutoConsolidation } from "@/hooks/useAutoConsolidation";
import Breadcrumbs from "@/components/Breadcrumbs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CheckCircle2, AlertTriangle, DollarSign, Wallet, Activity, Clock } from "lucide-react";

const fmt = (v: number, currency = "BRL") =>
  v.toLocaleString("pt-BR", { style: "currency", currency: currency === "BRL" ? "BRL" : "USD" });

export default function Reconciliacao() {
  const { data: platforms } = usePlatforms();
  const { consolidated } = useAutoConsolidation();

  // Fetch latest events grouped by platform for the reconciliation table
  const { data: recentEvents } = useQuery({
    queryKey: ["reconciliation_events"],
    queryFn: async () => {
      const res = await supabase
        .from("tracking_events")
        .select("id, platform_id, canonical_event_name, raw_event_name, original_amount, original_currency, converted_amount_brl, exchange_rate, event_timestamp, transaction_id, status, source_type")
        .eq("is_demo", false)
        .or("status.is.null,status.neq.invalid_legacy")
        .order("event_timestamp", { ascending: false })
        .limit(50);
      if (res.error) throw res.error;
      return res.data || [];
    },
    refetchInterval: 10_000,
  });

  const platformMap = useMemo(() => {
    const map: Record<string, string> = {};
    (platforms as any[])?.forEach((p: any) => { map[p.id] = p.name; });
    return map;
  }, [platforms]);

  // Group by platform
  const byPlatform = useMemo(() => {
    const groups: Record<string, {
      name: string;
      withdrawable: { original: number; currency: string; brl: number; rate: number | null; timestamp: string | null } | null;
      revenueSum: { original: number; currency: string; brl: number };
      events: typeof recentEvents;
      eventCount: number;
    }> = {};

    for (const evt of recentEvents || []) {
      if (evt.canonical_event_name?.startsWith("{")) continue;
      const pid = evt.platform_id || "unknown";
      if (!groups[pid]) {
        groups[pid] = {
          name: platformMap[pid] || "Desconhecida",
          withdrawable: null,
          revenueSum: { original: 0, currency: "BRL", brl: 0 },
          events: [],
          eventCount: 0,
        };
      }
      const g = groups[pid];
      g.eventCount++;
      if (g.events!.length < 10) g.events!.push(evt);

      if (evt.canonical_event_name === "withdrawable_revenue" && !g.withdrawable) {
        g.withdrawable = {
          original: Number(evt.original_amount ?? evt.converted_amount_brl ?? 0),
          currency: evt.original_currency || "BRL",
          brl: Number(evt.converted_amount_brl ?? evt.original_amount ?? 0),
          rate: evt.exchange_rate ? Number(evt.exchange_rate) : null,
          timestamp: evt.event_timestamp,
        };
      }

      if (evt.canonical_event_name === "revenue" && evt.original_amount != null) {
        g.revenueSum.original += Number(evt.original_amount);
        g.revenueSum.currency = evt.original_currency || "BRL";
        g.revenueSum.brl += Number(evt.converted_amount_brl ?? evt.original_amount ?? 0);
      }
    }
    return Object.entries(groups);
  }, [recentEvents, platformMap]);

  const withdrawOrig = consolidated.latestWithdrawableOriginal ?? 0;
  const withdrawCurrency = consolidated.latestWithdrawableCurrency || "BRL";
  const withdrawBrl = consolidated.latestWithdrawableBrl ?? 0;

  return (
    <div className="space-y-6 animate-fade-in">
      <Breadcrumbs items={[{ label: "Tracking Hub", path: "/tracking" }, { label: "Reconciliação" }]} />

      <div>
        <h1 className="text-2xl font-bold tracking-tight">Reconciliação Financeira</h1>
        <p className="text-sm text-muted-foreground mt-1">Universal · três fontes lado a lado para garantir que nada se perde</p>
      </div>

      {/* 3 colunas universais: Esperado (postback) → Confirmado (plataforma) → Recebido (Asaas) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* 1. ESPERADO */}
        <Card className="border-border">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <DollarSign size={16} className="text-muted-foreground" />
              <CardTitle className="text-sm">1. Esperado <span className="text-[10px] font-normal text-muted-foreground">(postbacks)</span></CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {consolidated.revenueOriginal > 0
                ? fmt(consolidated.revenueOriginal, consolidated.revenueOriginalCurrency)
                : "—"}
            </p>
            {consolidated.revenueOriginalCurrency !== "BRL" && consolidated.revenueBrl > 0 && (
              <p className="text-xs text-muted-foreground mt-1">≈ {fmt(consolidated.revenueBrl)}</p>
            )}
            <Badge variant="outline" className="mt-2 text-[10px] text-muted-foreground">
              Soma dos eventos de revenue
            </Badge>
          </CardContent>
        </Card>

        {/* 2. CONFIRMADO */}
        <Card className="border-primary/30 bg-primary/[0.03]">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Wallet size={16} className="text-primary" />
              <CardTitle className="text-sm">2. Confirmado <span className="text-[10px] font-normal text-muted-foreground">(plataforma)</span></CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-primary">
              {withdrawOrig > 0 ? fmt(withdrawOrig, withdrawCurrency) : "—"}
            </p>
            {withdrawCurrency !== "BRL" && withdrawBrl > 0 && (
              <p className="text-xs text-muted-foreground mt-1">≈ {fmt(withdrawBrl)}</p>
            )}
            {consolidated.latestWithdrawableTimestamp && (
              <p className="text-[10px] text-muted-foreground mt-2 flex items-center gap-1">
                <Clock size={10} />
                {new Date(consolidated.latestWithdrawableTimestamp).toLocaleString("pt-BR")}
              </p>
            )}
            {withdrawOrig > 0 && consolidated.revenueOriginal > 0 ? (() => {
              const diff = withdrawOrig - consolidated.revenueOriginal;
              const isOk = Math.abs(diff) < 0.5;
              return (
                <Badge variant="outline" className={`mt-2 text-[10px] ${isOk ? "text-emerald-500" : "text-amber-500"}`}>
                  {isOk ? <><CheckCircle2 size={10} className="mr-1" /> Conciliado</> : <><AlertTriangle size={10} className="mr-1" /> Δ {fmt(diff, withdrawCurrency)}</>}
                </Badge>
              );
            })() : (
              <Badge variant="outline" className="mt-2 text-[10px] text-primary">Saldo retirável</Badge>
            )}
          </CardContent>
        </Card>

        {/* 3. RECEBIDO (Asaas) */}
        <Card className="border-border">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Activity size={16} className="text-muted-foreground" />
              <CardTitle className="text-sm">3. Recebido <span className="text-[10px] font-normal text-muted-foreground">(Asaas)</span></CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-muted-foreground">—</p>
            <Badge variant="outline" className="mt-2 text-[10px] text-muted-foreground">
              <Clock size={10} className="mr-1" /> Aguardando integração Asaas
            </Badge>
          </CardContent>
        </Card>
      </div>

      {/* Per-platform breakdown */}
      {byPlatform.map(([pid, group]) => (
        <Card key={pid}>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">{group.name}</CardTitle>
              <Badge variant="secondary" className="text-[10px]">{group.eventCount} eventos</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
              <div className="bg-secondary/30 rounded-lg p-3 border border-border/50">
                <p className="text-[10px] text-muted-foreground uppercase">Saldo (available_revenue)</p>
                <p className="text-lg font-bold text-primary">
                  {group.withdrawable ? fmt(group.withdrawable.original, group.withdrawable.currency) : "—"}
                </p>
                {group.withdrawable && group.withdrawable.currency !== "BRL" && (
                  <p className="text-[10px] text-muted-foreground">≈ {fmt(group.withdrawable.brl)}</p>
                )}
              </div>
              <div className="bg-secondary/30 rounded-lg p-3 border border-border/50">
                <p className="text-[10px] text-muted-foreground uppercase">Revenue acumulado</p>
                <p className="text-lg font-bold">{group.revenueSum.original > 0 ? fmt(group.revenueSum.original, group.revenueSum.currency) : "—"}</p>
                {group.revenueSum.currency !== "BRL" && group.revenueSum.brl > 0 && (
                  <p className="text-[10px] text-muted-foreground">≈ {fmt(group.revenueSum.brl)}</p>
                )}
              </div>
              <div className="bg-secondary/30 rounded-lg p-3 border border-border/50">
                <p className="text-[10px] text-muted-foreground uppercase">Diferença</p>
                {group.withdrawable && group.revenueSum.original > 0 ? (() => {
                  const diff = group.withdrawable.original - group.revenueSum.original;
                  return <p className={`text-lg font-bold ${Math.abs(diff) < 0.5 ? "text-emerald-500" : "text-amber-500"}`}>
                    {diff >= 0 ? "+" : ""}{fmt(diff, group.withdrawable.currency)}
                  </p>;
                })() : <p className="text-lg text-muted-foreground">—</p>}
              </div>
            </div>

            <p className="text-[10px] text-muted-foreground uppercase mb-2">Últimos postbacks recebidos</p>
            <div className="rounded-lg border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-[10px]">Evento</TableHead>
                    <TableHead className="text-[10px]">Canônico</TableHead>
                    <TableHead className="text-[10px]">Valor Original</TableHead>
                    <TableHead className="text-[10px]">BRL</TableHead>
                    <TableHead className="text-[10px]">Taxa</TableHead>
                    <TableHead className="text-[10px]">Data</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {group.events?.map((evt: any) => (
                    <TableRow key={evt.id}>
                      <TableCell className="text-xs">{evt.raw_event_name}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[10px]">{evt.canonical_event_name}</Badge>
                      </TableCell>
                      <TableCell className="text-xs">
                        {evt.original_amount != null ? `${evt.original_currency || "BRL"} ${Number(evt.original_amount).toFixed(2)}` : "—"}
                      </TableCell>
                      <TableCell className="text-xs">
                        {evt.converted_amount_brl != null ? fmt(Number(evt.converted_amount_brl)) : "—"}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {evt.exchange_rate ? Number(evt.exchange_rate).toFixed(4) : "—"}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(evt.event_timestamp).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      ))}

      {byPlatform.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">Nenhum evento recebido ainda. Configure os postbacks para ver a reconciliação.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
