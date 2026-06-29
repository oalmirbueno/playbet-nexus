import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Wand2, Plus, Trophy, Trash2, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLpEvents } from "@/hooks/useLpEvents";
import { useLpSignals } from "@/hooks/useLpSignals";
import { suggestThreeOptions } from "@/lib/opportunityEngine";
import type { LpEventRow } from "@/services/lpEventService";
import type { LpOpportunityRow } from "@/services/lpOpportunityService";

interface Props {
  platforms: Array<{ id: string; name: string }>;
  landingPages: Array<{ id: string; name?: string; slug?: string }>;
  onCreateOpportunity: (payload: Partial<LpOpportunityRow>) => Promise<unknown>;
}

const SPORTS = [
  { value: "futebol", label: "Futebol" },
  { value: "basquete", label: "Basquete" },
  { value: "tenis", label: "Tênis" },
  { value: "esports", label: "eSports" },
  { value: "outro", label: "Outro" },
];

function toLocal(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function toIso(local: string): string | null {
  if (!local) return null;
  const d = new Date(local);
  return isNaN(d.getTime()) ? null : d.toISOString();
}

export function SportsEventsPanel({ platforms, landingPages, onCreateOpportunity }: Props) {
  const { toast } = useToast();
  const { data: events, isLoading, create: createEvent, remove: removeEvent } = useLpEvents();
  const { data: signals } = useLpSignals();

  const [draft, setDraft] = useState({
    sport: "futebol",
    league: "",
    home_team: "",
    away_team: "",
    starts_at: "",
  });

  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const [targetLpByEvent, setTargetLpByEvent] = useState<Record<string, string>>({});
  const [targetPlatformByEvent, setTargetPlatformByEvent] = useState<Record<string, string>>({});

  const signalsByEvent = useMemo(() => {
    const m = new Map<string, typeof signals>();
    (signals || []).forEach((s) => {
      if (!s.event_id) return;
      const arr = m.get(s.event_id) || [];
      arr.push(s);
      m.set(s.event_id, arr);
    });
    return m;
  }, [signals]);

  async function handleCreateEvent() {
    if (!draft.home_team.trim() || !draft.away_team.trim()) {
      toast({ title: "Informe mandante e visitante", variant: "destructive" });
      return;
    }
    try {
      await createEvent({
        sport: draft.sport,
        league: draft.league.trim() || null,
        home_team: draft.home_team.trim(),
        away_team: draft.away_team.trim(),
        starts_at: toIso(draft.starts_at),
        source: "manual",
        is_active: true,
      });
      setDraft({ sport: "futebol", league: "", home_team: "", away_team: "", starts_at: "" });
    } catch {
      /* hook toasts */
    }
  }

  async function handleGenerate(ev: LpEventRow) {
    setGeneratingId(ev.id);
    try {
      const eventSignals = (signalsByEvent.get(ev.id) || []) as any[];
      const options = suggestThreeOptions({ event: ev, signals: eventSignals });
      const lpId = targetLpByEvent[ev.id] || null;
      const platformId = targetPlatformByEvent[ev.id] || null;
      const eventName = `${ev.home_team} x ${ev.away_team}`;

      let created = 0;
      for (let i = 0; i < options.length; i++) {
        const opt = options[i];
        const payload: Partial<LpOpportunityRow> = {
          landing_page_id: lpId,
          platform_id: platformId,
          event_id: ev.id,
          event_name: eventName,
          category: "sports",
          market_type: opt.market_type,
          market_name: opt.market_name,
          title: opt.title,
          subtitle: `${eventName} • ${opt.badge}`,
          badge: opt.badge,
          cta_label: "Apostar agora",
          destination_url: "", // será definido na revisão
          starts_at: ev.starts_at,
          sort_order: 10 - i,
          is_active: false, // rascunho — revisão obrigatória
          signal_id: opt.signal_id ?? null,
          signal_source: opt.signal_source ?? null,
          signal_confidence: opt.signal_confidence ?? null,
          recommendation_score: opt.recommendation_score,
          recommendation_reason: opt.recommendation_reason,
          home_team_logo_url: ev.home_team_logo_url,
          away_team_logo_url: ev.away_team_logo_url,
          event_image_url: ev.event_image_url,
          odd_label: opt.odd_label ?? null,
        };
        // pula linha que viraria publicada por engano — rascunho não precisa de destino,
        // mas se houver URL vinda de sinal, registra
        try {
          await onCreateOpportunity(payload);
          created++;
        } catch {
          // continua para as próximas opções
        }
      }
      toast({
        title: "Rascunhos gerados",
        description: `${created} de ${options.length} opções criadas em modo revisão (inativas).`,
      });
    } finally {
      setGeneratingId(null);
    }
  }

  return (
    <Card>
      <CardContent className="p-0">
        <div className="px-5 py-4 border-b border-border/60 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <Trophy className="w-4 h-4 text-muted-foreground" />
              <h2 className="text-sm font-semibold tracking-tight">Eventos Sports</h2>
              <Badge variant="outline" className="text-[10px] uppercase tracking-wider">
                Motor
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Cadastre um confronto e gere até 3 oportunidades em modo revisão (curadoria PlayBet).
            </p>
          </div>
        </div>

        {/* Criar evento rápido */}
        <div className="p-5 grid grid-cols-1 md:grid-cols-12 gap-3 border-b border-border/60 bg-secondary/20">
          <div className="md:col-span-2 space-y-1.5 min-w-0">
            <Label className="text-xs text-muted-foreground">Esporte</Label>
            <Select value={draft.sport} onValueChange={(v) => setDraft({ ...draft, sport: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {SPORTS.map((s) => (
                  <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="md:col-span-2 space-y-1.5 min-w-0">
            <Label className="text-xs text-muted-foreground">Liga</Label>
            <Input
              value={draft.league}
              onChange={(e) => setDraft({ ...draft, league: e.target.value })}
              placeholder="Eliminatórias"
            />
          </div>
          <div className="md:col-span-3 space-y-1.5 min-w-0">
            <Label className="text-xs text-muted-foreground">Mandante</Label>
            <Input
              value={draft.home_team}
              onChange={(e) => setDraft({ ...draft, home_team: e.target.value })}
              placeholder="Alemanha"
            />
          </div>
          <div className="md:col-span-3 space-y-1.5 min-w-0">
            <Label className="text-xs text-muted-foreground">Visitante</Label>
            <Input
              value={draft.away_team}
              onChange={(e) => setDraft({ ...draft, away_team: e.target.value })}
              placeholder="Paraguai"
            />
          </div>
          <div className="md:col-span-2 space-y-1.5 min-w-0">
            <Label className="text-xs text-muted-foreground">Início</Label>
            <Input
              type="datetime-local"
              value={draft.starts_at}
              onChange={(e) => setDraft({ ...draft, starts_at: e.target.value })}
            />
          </div>
          <div className="md:col-span-12 flex justify-end">
            <Button size="sm" onClick={handleCreateEvent}>
              <Plus className="w-4 h-4" /> Adicionar evento
            </Button>
          </div>
        </div>

        {/* Lista */}
        <div className="divide-y divide-border/50">
          {isLoading ? (
            <div className="p-6 text-sm text-muted-foreground">Carregando eventos…</div>
          ) : (events || []).length === 0 ? (
            <div className="p-8 text-center space-y-2">
              <Sparkles className="w-5 h-5 text-muted-foreground mx-auto" />
              <p className="text-sm text-muted-foreground">
                Nenhum evento ainda. Cadastre um confronto acima para começar.
              </p>
            </div>
          ) : (
            (events || []).map((ev) => {
              const sigCount = (signalsByEvent.get(ev.id) || []).length;
              const isGenerating = generatingId === ev.id;
              return (
                <div
                  key={ev.id}
                  className="p-5 grid grid-cols-1 lg:grid-cols-12 gap-3 items-end"
                >
                  <div className="lg:col-span-4 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium text-sm truncate">
                        {ev.home_team} <span className="text-muted-foreground">×</span> {ev.away_team}
                      </p>
                      {sigCount > 0 && (
                        <Badge variant="secondary" className="text-[10px]">
                          {sigCount} sinal{sigCount > 1 ? "is" : ""}
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {SPORTS.find((s) => s.value === ev.sport)?.label || ev.sport}
                      {ev.league ? ` • ${ev.league}` : ""}
                      {ev.starts_at ? ` • ${new Date(ev.starts_at).toLocaleString("pt-BR")}` : ""}
                    </p>
                  </div>

                  <div className="lg:col-span-3 space-y-1 min-w-0">
                    <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      LP destino
                    </Label>
                    <Select
                      value={targetLpByEvent[ev.id] || ""}
                      onValueChange={(v) =>
                        setTargetLpByEvent((m) => ({ ...m, [ev.id]: v }))
                      }
                    >
                      <SelectTrigger className="h-9"><SelectValue placeholder="—" /></SelectTrigger>
                      <SelectContent>
                        {landingPages.map((lp) => (
                          <SelectItem key={lp.id} value={lp.id}>
                            {lp.name || lp.slug}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="lg:col-span-3 space-y-1 min-w-0">
                    <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      Casa sugerida
                    </Label>
                    <Select
                      value={targetPlatformByEvent[ev.id] || ""}
                      onValueChange={(v) =>
                        setTargetPlatformByEvent((m) => ({ ...m, [ev.id]: v }))
                      }
                    >
                      <SelectTrigger className="h-9"><SelectValue placeholder="—" /></SelectTrigger>
                      <SelectContent>
                        {platforms.map((p) => (
                          <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="lg:col-span-2 flex gap-2 justify-end">
                    <Button
                      size="sm"
                      onClick={() => handleGenerate(ev)}
                      disabled={isGenerating}
                    >
                      <Wand2 className="w-4 h-4" />
                      {isGenerating ? "Gerando…" : "Gerar 3 opções"}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        if (confirm(`Remover ${ev.home_team} x ${ev.away_team}?`)) removeEvent(ev.id);
                      }}
                      title="Remover evento"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="px-5 py-3 border-t border-border/60 bg-secondary/15">
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            Score e badges são <strong>curadoria</strong>, não promessa de acerto. Cards nascem <strong>inativos</strong> —
            ajuste destino, odd e revise antes de publicar.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
