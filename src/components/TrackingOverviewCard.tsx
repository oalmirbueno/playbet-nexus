import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { usePlatformAccounts, useTrackingLinks } from "@/hooks/useTrackingData";
import { usePlatforms } from "@/hooks/useSupabaseQuery";
import { useAutoConsolidation } from "@/hooks/useAutoConsolidation";
import { useTrackingMetricsSummary } from "@/hooks/useTrackingMetricsSummary";
import { Activity, ArrowRight, CheckCircle2, AlertTriangle, Radio } from "lucide-react";

function fmtCurrency(value: number, currency: string) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: currency === "BRL" ? "BRL" : "USD" });
}

export default function TrackingOverviewCard() {
  const navigate = useNavigate();
  const { data: platforms } = usePlatforms();
  const { data: accounts } = usePlatformAccounts();
  const { data: links } = useTrackingLinks();
  const { consolidated, hasData: hasEvents } = useAutoConsolidation();
  const { summary: metricsSummary } = useTrackingMetricsSummary("30d");

  // Single source of truth for money: imported panel metrics when present.
  const hasMetrics = metricsSummary.profitBase > 0 || metricsSummary.ftd > 0 || metricsSummary.registrations > 0;
  const mergedRevenueBrl = hasMetrics ? metricsSummary.profitBase : consolidated.revenueBrl;
  const mergedConversions = Math.max(consolidated.conversionEventCount, metricsSummary.ftd + metricsSummary.registrations);

  const lastEvent = consolidated.lastEventTimestamp
    ? new Date(consolidated.lastEventTimestamp).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })
    : null;

  const status = useMemo(() => {
    if (hasEvents || hasMetrics) return "ok";
    if (accounts.length > 0 || links.length > 0) return "parcial";
    return "pendente";
  }, [hasEvents, hasMetrics, accounts, links]);

  const statusConfig = {
    ok: { label: "Operacional", color: "text-emerald-500", bg: "bg-emerald-500/10 border-emerald-500/20", icon: CheckCircle2 },
    parcial: { label: "Configurado", color: "text-emerald-500", bg: "bg-emerald-500/10 border-emerald-500/20", icon: CheckCircle2 },
    pendente: { label: "Pendente", color: "text-muted-foreground", bg: "bg-secondary/50 border-border", icon: Radio },
  };

  const cfg = statusConfig[status];
  const StatusIcon = cfg.icon;

  if ((platforms as any[]).length === 0 && accounts.length === 0) return null;

  return (
    <Card className={`${cfg.bg} border cursor-pointer hover:shadow-md transition-shadow`} onClick={() => navigate("/tracking")}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity size={16} className="text-primary" />
            <CardTitle className="text-sm">Tracking Hub</CardTitle>
          </div>
          <Badge variant="outline" className={`text-[10px] ${cfg.color}`}>
            <StatusIcon size={10} className="mr-1" />
            {cfg.label}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="grid grid-cols-2 sm:grid-cols-6 gap-3 mb-3">
          <div>
            <p className="text-[10px] text-muted-foreground uppercase">Visitas LP</p>
            <p className="text-lg font-bold text-blue-500">{consolidated.lpViewCount}</p>
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground uppercase">Cliques saída</p>
            <p className="text-lg font-bold text-emerald-500">{consolidated.outboundClickCount}</p>
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground uppercase">Lucro real (Rev+CPA)</p>
            <p className="text-lg font-bold text-primary">{fmtCurrency(mergedRevenueBrl, "BRL")}</p>
            {!hasMetrics && consolidated.revenueOriginalCurrency !== "BRL" && consolidated.revenueOriginal > 0 && (
              <p className="text-[10px] text-muted-foreground">≈ {fmtCurrency(consolidated.revenueOriginal, consolidated.revenueOriginalCurrency)}</p>
            )}
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground uppercase">Links ativos</p>
            <p className="text-lg font-bold">{links.length}</p>
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground uppercase">Conversões</p>
            <p className="text-lg font-bold">{mergedConversions}</p>
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground uppercase">FTD (30d)</p>
            <p className="text-lg font-bold">{metricsSummary.ftd}</p>
          </div>
        </div>
        <div className="mb-3">
          <p className="text-[10px] text-muted-foreground uppercase">Última atividade</p>
          <p className="text-xs font-medium mt-1">{lastEvent || (metricsSummary.latestDataRef ?? "-")}</p>
        </div>

        {!hasMetrics && (consolidated.latestWithdrawableOriginal ?? consolidated.latestWithdrawableBrl ?? 0) > 0 && (
          <div className="bg-background/50 rounded-lg p-2.5 mb-3 border border-border/50">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] text-muted-foreground uppercase">Saldo técnico por postback</p>
                {consolidated.latestWithdrawableCurrency && consolidated.latestWithdrawableCurrency !== "BRL" && consolidated.latestWithdrawableOriginal != null ? (
                  <>
                    <p className="text-sm font-bold">{fmtCurrency(consolidated.latestWithdrawableOriginal, consolidated.latestWithdrawableCurrency)}</p>
                    {consolidated.latestWithdrawableBrl != null && (
                      <p className="text-[10px] text-muted-foreground">
                        ≈ {fmtCurrency(consolidated.latestWithdrawableBrl, "BRL")}
                        {consolidated.latestWithdrawableExchangeRate && ` · Taxa: ${consolidated.latestWithdrawableExchangeRate.toFixed(4)}`}
                      </p>
                    )}
                  </>
                ) : (
                  <p className="text-sm font-bold">{fmtCurrency(consolidated.latestWithdrawableBrl || 0, "BRL")}</p>
                )}
              </div>
              {consolidated.platformName && (
                <Badge variant="secondary" className="text-[10px]">{consolidated.platformName}</Badge>
              )}
            </div>
          </div>
        )}

        <div className="flex items-center justify-end">
          <Button variant="ghost" size="sm" className="text-xs h-7 text-primary">
            Ver Tracking Hub <ArrowRight size={12} className="ml-1" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
