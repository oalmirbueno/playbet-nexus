import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Copy, Check, CheckCircle2, Clock, AlertCircle, Clipboard, ChevronDown, ChevronUp } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { usePlatformAccounts, useTrackingEvents, useTrackingLinks } from "@/hooks/useTrackingData";
import { usePlatforms } from "@/hooks/useSupabaseQuery";
import {
  findPresetByName,
  buildPostbackUrlForEvent,
  type PlatformPreset,
  type PlatformEventPreset,
} from "@/config/platformPresets";

type EventStatus = "received" | "waiting" | "not_configured";

interface EventStatusInfo {
  status: EventStatus;
  count: number;
  lastReceived?: string;
}

export default function PostbackStatusChecklist() {
  const { toast } = useToast();
  const { data: platforms } = usePlatforms();
  const { data: accounts } = usePlatformAccounts();
  const { data: events } = useTrackingEvents();
  const { data: links } = useTrackingLinks();
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const [expanded, setExpanded] = useState(true);
  const [selectedPlatformId, setSelectedPlatformId] = useState<string>("auto");

  // Find the first real platform with a preset
  const platformWithPreset = useMemo(() => {
    const realPlatforms = (platforms as any[]).filter((p: any) => !p.is_demo);
    if (selectedPlatformId !== "auto") {
      const p = realPlatforms.find((p: any) => p.id === selectedPlatformId);
      if (p) return p;
    }
    return realPlatforms.find((p: any) => findPresetByName(p.name));
  }, [platforms, selectedPlatformId]);

  const preset = platformWithPreset ? findPresetByName(platformWithPreset.name) : null;

  // Get tracking code from first real link for this platform
  const trackingCode = useMemo(() => {
    if (!platformWithPreset) return undefined;
    const accs = accounts.filter(a => a.platform_id === platformWithPreset.id && !a.is_demo);
    const link = links.find(l => !l.is_demo && accs.some(a => a.id === l.platform_account_id));
    return link?.tracking_code;
  }, [platformWithPreset, accounts, links]);

  // Compute status per canonical event
  const eventStatuses = useMemo(() => {
    if (!preset) return new Map<string, EventStatusInfo>();
    const realEvents = events.filter(e => !e.is_demo && !e.click_id?.startsWith("{") && e.status !== "invalid_legacy");
    const map = new Map<string, EventStatusInfo>();

    for (const evt of preset.events) {
      const matching = realEvents.filter(e =>
        e.canonical_event_name === evt.canonical_event_name ||
        e.raw_event_name === evt.raw_event_name
      );
      const hasLink = links.some(l => !l.is_demo);

      if (matching.length > 0) {
        const sorted = [...matching].sort((a, b) =>
          new Date(b.event_timestamp).getTime() - new Date(a.event_timestamp).getTime()
        );
        map.set(evt.canonical_event_name, {
          status: "received",
          count: matching.length,
          lastReceived: sorted[0].event_timestamp,
        });
      } else if (hasLink) {
        map.set(evt.canonical_event_name, { status: "waiting", count: 0 });
      } else {
        map.set(evt.canonical_event_name, { status: "not_configured", count: 0 });
      }
    }
    return map;
  }, [preset, events, links]);

  const copy = (url: string, idx: number, label: string) => {
    navigator.clipboard.writeText(url);
    setCopiedIdx(idx);
    toast({ title: `URL de ${label} copiada!` });
    setTimeout(() => setCopiedIdx(null), 2000);
  };

  if (!preset || !platformWithPreset) return null;

  const receivedCount = Array.from(eventStatuses.values()).filter(s => s.status === "received").length;
  const totalEvents = preset.events.length;

  const statusIcon = (s: EventStatus) => {
    switch (s) {
      case "received": return <CheckCircle2 size={14} className="text-green-500" />;
      case "waiting": return <Clock size={14} className="text-yellow-500" />;
      case "not_configured": return <AlertCircle size={14} className="text-muted-foreground/50" />;
    }
  };

  const statusLabel = (s: EventStatus) => {
    switch (s) {
      case "received": return "Evento recebido";
      case "waiting": return "Aguardando evento";
      case "not_configured": return "Não configurado";
    }
  };

  const statusBadgeVariant = (s: EventStatus): "default" | "secondary" | "outline" | "destructive" => {
    switch (s) {
      case "received": return "default";
      case "waiting": return "secondary";
      case "not_configured": return "outline";
    }
  };

  const realPlatforms = (platforms as any[]).filter((p: any) => !p.is_demo);

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clipboard size={14} className="text-primary" />
            <CardTitle className="text-sm">Status dos Postbacks por Evento</CardTitle>
            <Badge variant="outline" className="text-[10px]">
              {receivedCount}/{totalEvents} recebidos
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            {realPlatforms.length > 1 && (
              <Select value={selectedPlatformId} onValueChange={setSelectedPlatformId}>
                <SelectTrigger className="h-7 text-[10px] w-[120px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">Auto-detectar</SelectItem>
                  {realPlatforms.map((p: any) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setExpanded(!expanded)}>
              {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </Button>
          </div>
        </div>
        <p className="text-[10px] text-muted-foreground mt-1">
          Verifique se cada evento da {preset.label} está configurado e chegando ao sistema.
        </p>
      </CardHeader>

      {expanded && (
        <CardContent className="pt-0 space-y-2">
          {preset.events.map((evt, idx) => {
            const info = eventStatuses.get(evt.canonical_event_name) || { status: "not_configured" as EventStatus, count: 0 };
            const url = buildPostbackUrlForEvent(preset, evt, trackingCode);
            const isCopied = copiedIdx === idx;

            return (
              <div
                key={idx}
                className={`border rounded-lg p-3 space-y-2 transition-colors ${
                  info.status === "received"
                    ? "bg-green-500/5 border-green-500/20"
                    : info.status === "waiting"
                    ? "bg-yellow-500/5 border-yellow-500/20"
                    : "bg-muted/20 border-border"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {statusIcon(info.status)}
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-semibold">{evt.label}</span>
                        <Badge variant="outline" className="text-[8px] font-mono h-4 px-1">{evt.raw_event_name}</Badge>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <Badge variant={statusBadgeVariant(info.status)} className="text-[9px] h-4">
                          {statusLabel(info.status)}
                        </Badge>
                        {info.count > 0 && (
                          <span className="text-[10px] text-muted-foreground">
                            {info.count} evento(s)
                          </span>
                        )}
                        {info.lastReceived && (
                          <span className="text-[10px] text-muted-foreground">
                            · último: {new Date(info.lastReceived).toLocaleString("pt-BR", {
                              day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit"
                            })}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-[10px] px-2 shrink-0"
                    onClick={() => copy(url, idx, evt.label)}
                  >
                    {isCopied ? <Check size={10} className="mr-1 text-green-500" /> : <Copy size={10} className="mr-1" />}
                    Copiar URL
                  </Button>
                </div>
                <code className="block bg-secondary/50 rounded px-2 py-1.5 text-[9px] font-mono break-all leading-relaxed select-all">
                  {url}
                </code>
              </div>
            );
          })}

          <p className="text-[10px] text-muted-foreground pt-1">
            Cole cada URL no painel de afiliados da {preset.label}, no campo de postback do evento correspondente.
          </p>
        </CardContent>
      )}
    </Card>
  );
}
