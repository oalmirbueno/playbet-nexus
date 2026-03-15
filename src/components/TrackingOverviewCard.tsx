import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { usePlatformAccounts, useTrackingLinks } from "@/hooks/useTrackingData";
import { usePlatforms } from "@/hooks/useSupabaseQuery";
import { useAutoConsolidation } from "@/hooks/useAutoConsolidation";
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

  const lastEvent = consolidated.lastEventTimestamp
    ? new Date(consolidated.lastEventTimestamp).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })
    : null;

  const status = useMemo(() => {
    if (hasEvents) return "ok";
    if (accounts.length > 0 || links.length > 0) return "parcial";
    return "pendente";
  }, [hasEvents, accounts, links]);

  const statusConfig = {
    ok: { label: "Operacional", color: "text-green-500", bg: "bg-green-500/10 border-green-500/20", icon: CheckCircle2 },
    parcial: { label: "Parcial", color: "text-yellow-500", bg: "bg-yellow-500/10 border-yellow-500/20", icon: AlertTriangle },
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
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-3">
          <div>
            <p className="text-[10px] text-muted-foreground uppercase">Plataformas</p>
            <p className="text-lg font-bold">{(platforms as any[]).length}</p>
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground uppercase">Links ativos</p>
            <p className="text-lg font-bold">{links.length}</p>
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground uppercase">Cliques reais</p>
            <p className="text-lg font-bold">{consolidated.realClicksCount}</p>
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground uppercase">Eventos válidos</p>
            <p className="text-lg font-bold">{consolidated.eventCount}</p>
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground uppercase">Última atividade</p>
            <p className="text-xs font-medium mt-1">{lastEvent || "—"}</p>
          </div>
        </div>

        {consolidated.revenueBrl > 0 && (
          <div className="bg-background/50 rounded-lg p-2.5 mb-3 border border-border/50">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] text-muted-foreground uppercase">Revenue consolidado (verificado)</p>
                {consolidated.revenueOriginalCurrency !== "BRL" ? (
                  <>
                    <p className="text-sm font-bold">{fmtCurrency(consolidated.revenueOriginal, consolidated.revenueOriginalCurrency)}</p>
                    <p className="text-[10px] text-muted-foreground">
                      ≈ {fmtCurrency(consolidated.revenueBrl, "BRL")}
                      {consolidated.lastExchangeRate && ` · Taxa: ${consolidated.lastExchangeRate.toFixed(4)}`}
                    </p>
                  </>
                ) : (
                  <p className="text-sm font-bold">{fmtCurrency(consolidated.revenueBrl, "BRL")}</p>
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
