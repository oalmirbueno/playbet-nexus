import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { usePlatformAccounts, useTrackingLinks, useTrackingEvents } from "@/hooks/useTrackingData";
import { usePlatforms } from "@/hooks/useSupabaseQuery";
import { Activity, ArrowRight, CheckCircle2, AlertTriangle, Radio } from "lucide-react";

export default function TrackingOverviewCard() {
  const navigate = useNavigate();
  const { data: platforms } = usePlatforms();
  const { data: accounts } = usePlatformAccounts();
  const { data: links } = useTrackingLinks();
  const { data: events } = useTrackingEvents();

  const realPlatforms = (platforms as any[]).filter((p: any) => !p.is_demo);
  const realAccounts = accounts.filter(a => !a.is_demo);
  const realLinks = links.filter(l => !l.is_demo);
  const realEvents = events.filter(e => !e.is_demo && !e.click_id?.startsWith("{"));

  const lastEvent = realEvents.length > 0
    ? new Date(realEvents[0].event_timestamp).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })
    : null;

  const status = useMemo(() => {
    if (realEvents.length > 0) return "ok";
    if (realAccounts.length > 0 || realLinks.length > 0) return "parcial";
    return "pendente";
  }, [realEvents, realAccounts, realLinks]);

  const statusConfig = {
    ok: { label: "Operacional", color: "text-green-500", bg: "bg-green-500/10 border-green-500/20", icon: CheckCircle2 },
    parcial: { label: "Parcial", color: "text-yellow-500", bg: "bg-yellow-500/10 border-yellow-500/20", icon: AlertTriangle },
    pendente: { label: "Pendente", color: "text-muted-foreground", bg: "bg-secondary/50 border-border", icon: Radio },
  };

  const cfg = statusConfig[status];
  const StatusIcon = cfg.icon;

  // Don't show if nothing tracking-related exists
  if (realPlatforms.length === 0 && realAccounts.length === 0) return null;

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
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
          <div>
            <p className="text-[10px] text-muted-foreground uppercase">Plataformas</p>
            <p className="text-lg font-bold">{realPlatforms.length}</p>
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground uppercase">Links ativos</p>
            <p className="text-lg font-bold">{realLinks.length}</p>
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground uppercase">Eventos reais</p>
            <p className="text-lg font-bold">{realEvents.length}</p>
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground uppercase">Última atividade</p>
            <p className="text-xs font-medium mt-1">{lastEvent || "—"}</p>
          </div>
        </div>
        <div className="flex items-center justify-end">
          <Button variant="ghost" size="sm" className="text-xs h-7 text-primary">
            Ver Tracking Hub <ArrowRight size={12} className="ml-1" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
