import { useState, useMemo, useCallback, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Copy, Check, CheckCircle2, Clock, Clipboard, ChevronDown, ChevronUp, RefreshCw, Settings, Radio, Globe } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { usePlatformAccounts, useTrackingLinks } from "@/hooks/useTrackingData";
import { usePlatforms } from "@/hooks/useSupabaseQuery";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  findPresetByName,
  buildPostbackUrlForEvent,
  buildGlobalPostbackUrls,
} from "@/config/platformPresets";

type ValidationStatus = "received" | "waiting";

interface ValidationInfo {
  status: ValidationStatus;
  count: number;
  lastReceived?: string;
}

/** Persisted config state per event — stored in localStorage */
function getConfigState(platformSlug: string): Record<string, boolean> {
  try {
    const raw = localStorage.getItem(`postback_config_${platformSlug}`);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

function setConfigState(platformSlug: string, state: Record<string, boolean>) {
  localStorage.setItem(`postback_config_${platformSlug}`, JSON.stringify(state));
}

/** Fetch event counts grouped by canonical + raw names */
async function fetchEventStatusFromDB(): Promise<
  { canonical_event_name: string; raw_event_name: string; count: number; last_ts: string }[]
> {
  const { data, error } = await supabase
    .from("tracking_events")
    .select("canonical_event_name, raw_event_name, event_timestamp")
    .eq("is_demo", false)
    .not("status", "eq", "invalid_legacy")
    .order("event_timestamp", { ascending: false });

  if (error || !data) {
    console.error("[PostbackChecklist] query error:", error);
    return [];
  }

  // Group by BOTH canonical and raw to keep all name variants
  const byCanonical = new Map<string, { raw_names: Set<string>; count: number; last_ts: string }>();
  for (const row of data) {
    const key = row.canonical_event_name;
    if (!key || key.startsWith("{")) continue;
    const existing = byCanonical.get(key);
    if (existing) {
      existing.count++;
      existing.raw_names.add(row.raw_event_name);
    } else {
      byCanonical.set(key, {
        raw_names: new Set([row.raw_event_name]),
        count: 1,
        last_ts: row.event_timestamp,
      });
    }
  }

  // Flatten: one entry per canonical, but also emit entries keyed by raw_name for matching
  const results: { canonical_event_name: string; raw_event_name: string; count: number; last_ts: string }[] = [];
  for (const [canonical, info] of byCanonical) {
    for (const raw of info.raw_names) {
      results.push({ canonical_event_name: canonical, raw_event_name: raw, count: info.count, last_ts: info.last_ts });
    }
  }
  return results;
}

export default function PostbackStatusChecklist() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: platforms } = usePlatforms();
  const { data: accounts } = usePlatformAccounts();
  const { data: links } = useTrackingLinks();
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const [copiedGlobalKey, setCopiedGlobalKey] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(true);
  const [showGlobal, setShowGlobal] = useState(true);
  const [selectedPlatformId, setSelectedPlatformId] = useState<string>("auto");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [configMarks, setConfigMarks] = useState<Record<string, boolean>>({});

  const { data: dbEventStatus = [], refetch } = useQuery({
    queryKey: ["postback_status_events"],
    queryFn: fetchEventStatusFromDB,
    staleTime: 5_000,
    refetchInterval: 15_000,
  });

  // Debug: log what the query returned
  useEffect(() => {
    if (dbEventStatus.length > 0) {
      console.log("[PostbackChecklist] Events from DB:", dbEventStatus);
    }
  }, [dbEventStatus]);

  const realPlatforms = useMemo(
    () => (platforms as any[]).filter((p: any) => !p.is_demo),
    [platforms]
  );

  const platformWithPreset = useMemo(() => {
    if (selectedPlatformId !== "auto") {
      const p = realPlatforms.find((p: any) => p.id === selectedPlatformId);
      if (p) return p;
    }
    return realPlatforms.find((p: any) => findPresetByName(p.name));
  }, [realPlatforms, selectedPlatformId]);

  const preset = platformWithPreset ? findPresetByName(platformWithPreset.name) : null;

  // Load config marks from localStorage when preset changes
  useEffect(() => {
    if (preset) setConfigMarks(getConfigState(preset.slug));
  }, [preset?.slug]);

  const trackingCode = useMemo(() => {
    if (!platformWithPreset) return undefined;
    const accs = accounts.filter(a => a.platform_id === platformWithPreset.id);
    const link = links.find(l => accs.some(a => a.id === l.platform_account_id));
    return link?.tracking_code;
  }, [platformWithPreset, accounts, links]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: ["postback_status_events"] });
    await refetch();
    toast({ title: "Status atualizado" });
    setIsRefreshing(false);
  }, [queryClient, refetch, toast]);

  const toggleConfigMark = useCallback((canonicalName: string) => {
    if (!preset) return;
    setConfigMarks(prev => {
      const next = { ...prev, [canonicalName]: !prev[canonicalName] };
      setConfigState(preset.slug, next);
      return next;
    });
  }, [preset]);

  const validationStatuses = useMemo(() => {
    if (!preset) return new Map<string, ValidationInfo>();
    const map = new Map<string, ValidationInfo>();
    for (const evt of preset.events) {
      const match = dbEventStatus.find(
        s => s.canonical_event_name === evt.canonical_event_name ||
             s.raw_event_name === evt.raw_event_name
      );
      if (match && match.count > 0) {
        map.set(evt.canonical_event_name, { status: "received", count: match.count, lastReceived: match.last_ts });
      } else {
        map.set(evt.canonical_event_name, { status: "waiting", count: 0 });
      }
    }
    return map;
  }, [preset, dbEventStatus]);

  const copy = (url: string, idx: number, label: string) => {
    navigator.clipboard.writeText(url);
    setCopiedIdx(idx);
    toast({ title: `URL de ${label} copiada!` });
    setTimeout(() => setCopiedIdx(null), 2000);
  };

  const copyGlobal = (url: string, key: string, label: string) => {
    navigator.clipboard.writeText(url);
    setCopiedGlobalKey(key);
    toast({ title: `Postback Global de ${label} copiado!` });
    setTimeout(() => setCopiedGlobalKey(null), 2000);
  };

  if (!preset || !platformWithPreset) return null;

  const receivedCount = Array.from(validationStatuses.values()).filter(s => s.status === "received").length;
  const configuredCount = preset.events.filter(e => configMarks[e.canonical_event_name]).length;

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clipboard size={14} className="text-primary" />
            <CardTitle className="text-sm">Postbacks — {preset.label}</CardTitle>
            <Badge variant="outline" className="text-[10px]">
              {configuredCount}/{preset.events.length} configurados
            </Badge>
            <Badge variant={receivedCount > 0 ? "default" : "secondary"} className="text-[10px]">
              {receivedCount}/{preset.events.length} validados
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
            <Button
              variant="outline" size="sm"
              className="h-7 text-[10px] px-2 gap-1"
              onClick={handleRefresh}
              disabled={isRefreshing}
            >
              <RefreshCw size={12} className={isRefreshing ? "animate-spin" : ""} />
              Atualizar
            </Button>
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setExpanded(!expanded)}>
              {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </Button>
          </div>
        </div>
        <p className="text-[10px] text-muted-foreground mt-1">
          Configure cada URL na {preset.label} e marque como configurado. O sistema valida automaticamente quando os eventos chegam.
        </p>
      </CardHeader>

      {expanded && (
        <CardContent className="pt-0 space-y-4">
          {/* ═══ GLOBAL POSTBACK SECTION ═══ */}
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Globe size={13} className="text-emerald-500" />
                <span className="text-xs font-semibold">Postback Global</span>
                <Badge variant="outline" className="text-[9px] border-emerald-500/40 text-emerald-600">
                  Configurações da conta
                </Badge>
              </div>
              <Button variant="ghost" size="sm" className="h-6 text-[10px] px-2" onClick={() => setShowGlobal(!showGlobal)}>
                {showGlobal ? "Ocultar" : "Mostrar"}
              </Button>
            </div>

            {showGlobal && (
              <>
                <p className="text-[10px] text-muted-foreground">
                  Cole cada URL em <strong>Configurações da conta → Postback Global</strong> na {preset.label}.
                  Captura eventos de <strong>todos os links</strong> automaticamente.
                </p>
                {buildGlobalPostbackUrls(preset).map(({ event: evt, url }) => {
                  const gKey = `g-${evt.raw_event_name}`;
                  const isCopied = copiedGlobalKey === gKey;
                  return (
                    <div key={gKey} className="border rounded-lg p-2.5 space-y-1.5 bg-emerald-500/5 border-emerald-500/15">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                          <Badge variant="outline" className="text-[8px] font-mono h-4 px-1 border-emerald-500/30 text-emerald-600">{evt.raw_event_name}</Badge>
                          <span className="text-[10px] text-muted-foreground">→</span>
                          <span className="text-[10px] font-medium">{evt.label}</span>
                        </div>
                        <Button
                          variant="outline" size="sm"
                          className="h-6 text-[10px] px-2 shrink-0 border-emerald-500/30 hover:bg-emerald-500/10"
                          onClick={() => copyGlobal(url, gKey, `${evt.label} (Global)`)}
                        >
                          {isCopied ? <Check size={10} className="mr-1 text-emerald-500" /> : <Copy size={10} className="mr-1" />}
                          Copiar
                        </Button>
                      </div>
                      <code className="block bg-secondary/50 rounded px-2 py-1.5 text-[9px] font-mono break-all leading-relaxed select-all">
                        {url}
                      </code>
                    </div>
                  );
                })}
              </>
            )}
          </div>

          {/* ═══ SEPARATOR ═══ */}
          <div className="border-t border-border/50" />

          {/* ═══ PER-LINK POSTBACKS ═══ */}
          <div className="flex items-center gap-2 mb-1">
            <Clipboard size={13} className="text-primary" />
            <span className="text-xs font-semibold">Postbacks por Link</span>
          </div>
          {preset.events.map((evt, idx) => {
            const validation = validationStatuses.get(evt.canonical_event_name) || { status: "waiting" as ValidationStatus, count: 0 };
            const isConfigured = !!configMarks[evt.canonical_event_name];
            const isReceived = validation.status === "received";
            const url = buildPostbackUrlForEvent(preset, evt, trackingCode);
            const isCopied = copiedIdx === idx;

            return (
              <div
                key={idx}
                className={`border rounded-lg p-3 space-y-2.5 transition-colors ${
                  isReceived
                    ? "bg-green-500/5 border-green-500/20"
                    : isConfigured
                    ? "bg-blue-500/5 border-blue-500/20"
                    : "bg-muted/20 border-border"
                }`}
              >
                {/* Event header */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold">{evt.label}</span>
                    <Badge variant="outline" className="text-[8px] font-mono h-4 px-1">{evt.raw_event_name}</Badge>
                  </div>
                  <Button
                    variant="outline" size="sm"
                    className="h-7 text-[10px] px-2 shrink-0"
                    onClick={() => copy(url, idx, evt.label)}
                  >
                    {isCopied ? <Check size={10} className="mr-1 text-green-500" /> : <Copy size={10} className="mr-1" />}
                    Copiar URL
                  </Button>
                </div>

                {/* URL */}
                <code className="block bg-secondary/50 rounded px-2 py-1.5 text-[9px] font-mono break-all leading-relaxed select-all">
                  {url}
                </code>

                {/* Two-layer status */}
                <div className="flex items-center gap-4 flex-wrap">
                  {/* Layer A: Configuration */}
                  <div className="flex items-center gap-1.5">
                    <Settings size={12} className="text-muted-foreground" />
                    <span className="text-[10px] text-muted-foreground">Configuração:</span>
                    {isConfigured ? (
                      <Badge
                        variant="default"
                        className="text-[9px] h-5 cursor-pointer bg-blue-600 hover:bg-blue-700"
                        onClick={() => toggleConfigMark(evt.canonical_event_name)}
                      >
                        <CheckCircle2 size={10} className="mr-1" />
                        Configurado na plataforma
                      </Badge>
                    ) : (
                      <Badge
                        variant="outline"
                        className="text-[9px] h-5 cursor-pointer hover:bg-accent"
                        onClick={() => toggleConfigMark(evt.canonical_event_name)}
                      >
                        Marcar como configurado
                      </Badge>
                    )}
                  </div>

                  {/* Layer B: Validation */}
                  <div className="flex items-center gap-1.5">
                    <Radio size={12} className="text-muted-foreground" />
                    <span className="text-[10px] text-muted-foreground">Validação:</span>
                    {isReceived ? (
                      <Badge variant="default" className="text-[9px] h-5 bg-green-600">
                        <CheckCircle2 size={10} className="mr-1" />
                        Evento recebido
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="text-[9px] h-5">
                        <Clock size={10} className="mr-1" />
                        Aguardando primeiro evento
                      </Badge>
                    )}
                    {validation.count > 0 && (
                      <span className="text-[10px] text-muted-foreground">
                        {validation.count} evento(s)
                      </span>
                    )}
                    {validation.lastReceived && (
                      <span className="text-[10px] text-muted-foreground">
                        · último: {new Date(validation.lastReceived).toLocaleString("pt-BR", {
                          day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit"
                        })}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          <p className="text-[10px] text-muted-foreground pt-1">
            1. Copie a URL de cada evento · 2. Cole no painel da {preset.label} · 3. Marque como configurado · 4. O sistema valida automaticamente quando os eventos chegam.
          </p>
        </CardContent>
      )}
    </Card>
  );
}
