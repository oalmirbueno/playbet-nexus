import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Breadcrumbs from "@/components/Breadcrumbs";
import { supabase } from "@/integrations/supabase/client";
import { Activity, CheckCircle2, AlertTriangle, RefreshCcw, Copy, Radio, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type PlatformStatus = {
  id: string;
  name: string;
  slug: string;
  lastEventAt: string | null;
  lastEventName: string | null;
  eventsLast24h: number;
  eventsLast7d: number;
  postbackUrl: string;
};

const PROJECT_URL = "https://rcrrbznhatdqcmfyzgbt.supabase.co";
const TRACKED = [
  { slug: "estrela-bet", name: "Estrela Bet" },
  { slug: "vupi", name: "VUPI" },
];

function relTime(iso: string | null): string {
  if (!iso) return "Nunca";
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return `há ${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `há ${m}min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `há ${h}h`;
  const d = Math.floor(h / 24);
  return `há ${d}d`;
}

function healthOf(iso: string | null): { label: string; tone: "ok" | "warn" | "bad" } {
  if (!iso) return { label: "Sem eventos", tone: "bad" };
  const hours = (Date.now() - new Date(iso).getTime()) / 3_600_000;
  if (hours <= 24) return { label: "Saudável", tone: "ok" };
  if (hours <= 72) return { label: "Sem eventos recentes", tone: "warn" };
  return { label: "Inativo", tone: "bad" };
}

export default function TrackingStatus() {
  const [rows, setRows] = useState<PlatformStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshedAt, setRefreshedAt] = useState<Date>(new Date());
  const { toast } = useToast();

  async function load() {
    setLoading(true);
    const { data: platforms } = await supabase
      .from("platforms")
      .select("id, name, slug")
      .in("slug", TRACKED.map((t) => t.slug));

    const now = Date.now();
    const iso24 = new Date(now - 86_400_000).toISOString();
    const iso7d = new Date(now - 7 * 86_400_000).toISOString();

    const out: PlatformStatus[] = [];
    for (const p of platforms ?? []) {
      const [{ data: latest }, { count: c24 }, { count: c7 }] = await Promise.all([
        supabase
          .from("tracking_events")
          .select("event_timestamp, canonical_event_name")
          .eq("platform_id", p.id)
          .eq("is_demo", false)
          .order("event_timestamp", { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from("tracking_events")
          .select("id", { count: "exact", head: true })
          .eq("platform_id", p.id)
          .eq("is_demo", false)
          .gte("event_timestamp", iso24),
        supabase
          .from("tracking_events")
          .select("id", { count: "exact", head: true })
          .eq("platform_id", p.id)
          .eq("is_demo", false)
          .gte("event_timestamp", iso7d),
      ]);

      out.push({
        id: p.id,
        name: p.name ?? p.slug,
        slug: p.slug,
        lastEventAt: latest?.event_timestamp ?? null,
        lastEventName: latest?.canonical_event_name ?? null,
        eventsLast24h: c24 ?? 0,
        eventsLast7d: c7 ?? 0,
        postbackUrl: `${PROJECT_URL}/functions/v1/tracking-postback/${p.slug}`,
      });
    }
    setRows(out);
    setRefreshedAt(new Date());
    setLoading(false);
  }

  useEffect(() => {
    load();
    const t = setInterval(load, 30_000);
    return () => clearInterval(t);
  }, []);

  const overall = useMemo(() => {
    if (!rows.length) return { tone: "warn" as const, label: "Aguardando" };
    const worst = rows.reduce<"ok" | "warn" | "bad">((acc, r) => {
      const t = healthOf(r.lastEventAt).tone;
      if (acc === "bad" || t === "bad") return "bad";
      if (acc === "warn" || t === "warn") return "warn";
      return "ok";
    }, "ok");
    return {
      tone: worst,
      label:
        worst === "ok"
          ? "Postback ativo em todas as plataformas"
          : worst === "warn"
          ? "Postback ativo — sem eventos recentes"
          : "Atenção: sem eventos recebidos",
    };
  }, [rows]);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <Breadcrumbs items={[{ label: "Tracking", path: "/tracking" }, { label: "Status" }]} />

      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            <Radio className="h-6 w-6 text-primary" />
            Status do Tracking
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Monitoramento em tempo real dos postbacks recebidos das plataformas parceiras.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            Atualizado {relTime(refreshedAt.toISOString())}
          </span>
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCcw className={`h-4 w-4 mr-1 ${loading ? "animate-spin" : ""}`} />
            Atualizar
          </Button>
        </div>
      </div>

      {/* Overall banner */}
      <Card
        className={
          overall.tone === "ok"
            ? "border-emerald-500/40 bg-emerald-500/5"
            : overall.tone === "warn"
            ? "border-amber-500/40 bg-amber-500/5"
            : "border-red-500/40 bg-red-500/5"
        }
      >
        <CardContent className="p-5 flex items-center gap-4">
          {overall.tone === "ok" ? (
            <CheckCircle2 className="h-8 w-8 text-emerald-500" />
          ) : (
            <AlertTriangle className={`h-8 w-8 ${overall.tone === "warn" ? "text-amber-500" : "text-red-500"}`} />
          )}
          <div className="flex-1">
            <div className="font-semibold">{overall.label}</div>
            <div className="text-sm text-muted-foreground">
              Sem API key nesta operação. Ingestão 100% via postback em tempo real, com deduplicação por
              <code className="mx-1 px-1 rounded bg-muted text-xs">transaction_id</code>.
            </div>
          </div>
          <Badge variant="outline" className="gap-1">
            <Activity className="h-3 w-3" /> Modo: postback
          </Badge>
        </CardContent>
      </Card>

      {/* Per-platform cards */}
      <div className="grid gap-4 md:grid-cols-2">
        {TRACKED.map((t) => {
          const row = rows.find((r) => r.slug === t.slug);
          const health = healthOf(row?.lastEventAt ?? null);
          const toneClass =
            health.tone === "ok"
              ? "text-emerald-500"
              : health.tone === "warn"
              ? "text-amber-500"
              : "text-red-500";

          return (
            <Card key={t.slug} className="overflow-hidden">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{t.name}</CardTitle>
                  <Badge
                    variant="outline"
                    className={`gap-1 ${
                      health.tone === "ok"
                        ? "border-emerald-500/40 text-emerald-500"
                        : health.tone === "warn"
                        ? "border-amber-500/40 text-amber-500"
                        : "border-red-500/40 text-red-500"
                    }`}
                  >
                    <span className={`h-1.5 w-1.5 rounded-full ${toneClass} bg-current`} />
                    {health.label}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {!row && loading ? (
                  <div className="h-20 animate-pulse bg-muted rounded" />
                ) : !row ? (
                  <div className="text-sm text-muted-foreground">Plataforma não encontrada.</div>
                ) : (
                  <>
                    <div className="grid grid-cols-3 gap-3 text-center">
                      <div>
                        <div className="text-xs text-muted-foreground uppercase">Último evento</div>
                        <div className="text-sm font-semibold mt-1 flex items-center justify-center gap-1">
                          <Clock className="h-3 w-3" />
                          {relTime(row.lastEventAt)}
                        </div>
                        {row.lastEventName && (
                          <div className="text-[10px] text-muted-foreground mt-0.5 uppercase tracking-wide">
                            {row.lastEventName}
                          </div>
                        )}
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground uppercase">24h</div>
                        <div className="text-2xl font-semibold mt-1">{row.eventsLast24h.toLocaleString("pt-BR")}</div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground uppercase">7 dias</div>
                        <div className="text-2xl font-semibold mt-1">{row.eventsLast7d.toLocaleString("pt-BR")}</div>
                      </div>
                    </div>

                    <div className="border-t pt-3">
                      <div className="text-xs text-muted-foreground uppercase mb-1">Endpoint de postback</div>
                      <div className="flex items-center gap-2">
                        <code className="flex-1 text-xs bg-muted px-2 py-1.5 rounded truncate">
                          {row.postbackUrl}
                        </code>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => {
                            navigator.clipboard.writeText(row.postbackUrl);
                            toast({ title: "URL copiada" });
                          }}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardContent className="p-4 text-xs text-muted-foreground space-y-1">
          <div>
            <strong className="text-foreground">Label ID compartilhado:</strong> 397052 (Estrela Bet + VUPI).
            A segmentação por plataforma acontece pela URL do postback, não pelo Label.
          </div>
          <div>
            <strong className="text-foreground">Auto-refresh:</strong> a cada 30 segundos.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
