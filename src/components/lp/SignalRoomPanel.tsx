import { useMemo, useState } from "react";
import { z } from "zod";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Radio, Plus, Trash2, ArrowRight, ShieldCheck } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLpSignals } from "@/hooks/useLpSignals";
import { useLpEvents } from "@/hooks/useLpEvents";
import { signalToOpportunityDraft } from "@/lib/opportunityEngine";
import type { LpOpportunityRow } from "@/services/lpOpportunityService";
import type { LpSignalRow, SignalChannel } from "@/services/lpSignalService";

interface Props {
  platforms: Array<{ id: string; name: string }>;
  onCreateOpportunity: (payload: Partial<LpOpportunityRow>) => Promise<unknown>;
}

const CHANNELS: { value: SignalChannel; label: string }[] = [
  { value: "manual", label: "Manual" },
  { value: "telegram", label: "Telegram" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "grupo", label: "Grupo" },
  { value: "api", label: "API" },
  { value: "outro", label: "Outro" },
];

const CONFIDENCE = [
  { value: "baixa", label: "Baixa" },
  { value: "media", label: "Média" },
  { value: "alta", label: "Alta" },
] as const;

const MARKETS = [
  { value: "resultado_final", label: "Resultado final" },
  { value: "dupla_chance", label: "Dupla chance" },
  { value: "total_gols", label: "Total de gols" },
  { value: "ambas_marcam", label: "Ambas marcam" },
  { value: "jogador", label: "Jogador" },
  { value: "especial", label: "Especial" },
];

const NONE = "__none__";

const signalSchema = z.object({
  raw_text: z.string().trim().min(3, "Cole o texto do sinal (mín. 3 caracteres)").max(2000),
  source_name: z.string().trim().max(120).optional().or(z.literal("")),
  market_name: z.string().trim().max(160).optional().or(z.literal("")),
  odd_label: z
    .string()
    .trim()
    .max(20)
    .regex(/^$|^[\d.,]+$/, "Odd deve ser numérica (ex.: 1.85)")
    .optional()
    .or(z.literal("")),
  house_url: z
    .string()
    .trim()
    .max(500)
    .refine(
      (v) => !v || /^https?:\/\//i.test(v),
      "URL deve começar com http:// ou https://",
    )
    .optional()
    .or(z.literal("")),
});

const CONFIDENCE_TONE: Record<string, string> = {
  baixa: "bg-muted text-muted-foreground border-border",
  media: "bg-amber-500/10 text-amber-600 border-amber-500/30",
  alta: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30",
};

const STATUS_TONE: Record<string, string> = {
  novo: "bg-primary/10 text-primary border-primary/30",
  rascunho: "bg-amber-500/10 text-amber-600 border-amber-500/30",
  publicado: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30",
  descartado: "bg-muted text-muted-foreground border-border",
};

export function SignalRoomPanel({ platforms, onCreateOpportunity }: Props) {
  const { toast } = useToast();
  const { data: signals, isLoading, create, update, remove } = useLpSignals();
  const { data: events } = useLpEvents();

  const [draft, setDraft] = useState({
    raw_text: "",
    source_name: "",
    source_channel: "manual" as SignalChannel,
    confidence: "media" as "baixa" | "media" | "alta",
    market_type: "",
    market_name: "",
    odd_label: "",
    house_url: "",
    platform_id: "",
    event_id: "",
  });
  const [convertingId, setConvertingId] = useState<string | null>(null);

  const eventsById = useMemo(() => {
    const m = new Map<string, (typeof events)[number]>();
    (events || []).forEach((e) => m.set(e.id, e));
    return m;
  }, [events]);

  async function handleAdd() {
    const parsed = signalSchema.safeParse({
      raw_text: draft.raw_text,
      source_name: draft.source_name,
      market_name: draft.market_name,
      odd_label: draft.odd_label,
      house_url: draft.house_url,
    });
    if (!parsed.success) {
      const first = Object.values(parsed.error.flatten().fieldErrors).flat()[0];
      toast({ title: "Sinal inválido", description: first, variant: "destructive" });
      return;
    }
    try {
      await create({
        raw_text: draft.raw_text.trim(),
        source_name: draft.source_name.trim() || null,
        source_channel: draft.source_channel,
        confidence: draft.confidence,
        market_type: draft.market_type || null,
        market_name: draft.market_name.trim() || null,
        odd_label: draft.odd_label.trim() || null,
        house_url: draft.house_url.trim() || null,
        platform_id: draft.platform_id || null,
        event_id: draft.event_id || null,
        status: "novo",
      });
      setDraft({
        raw_text: "",
        source_name: "",
        source_channel: draft.source_channel,
        confidence: "media",
        market_type: "",
        market_name: "",
        odd_label: "",
        house_url: "",
        platform_id: "",
        event_id: "",
      });
    } catch {
      /* hook toasts */
    }
  }

  async function handleConvert(s: LpSignalRow) {
    setConvertingId(s.id);
    try {
      const ev = s.event_id ? eventsById.get(s.event_id) : null;
      const payload = signalToOpportunityDraft(s, ev as any);
      const created = (await onCreateOpportunity(payload)) as { id?: string } | undefined;
      await update(s.id, {
        status: "rascunho",
        draft_opportunity_id: created?.id ?? null,
      });
      toast({
        title: "Rascunho criado",
        description: "Oportunidade inativa gerada. Revise destino e odd antes de publicar.",
      });
    } catch {
      /* hook toasts */
    } finally {
      setConvertingId(null);
    }
  }

  return (
    <Card>
      <CardContent className="p-0">
        <div className="px-5 py-4 border-b border-border/60 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <Radio className="w-4 h-4 text-muted-foreground" />
              <h2 className="text-sm font-semibold tracking-tight">Sala de sinais</h2>
              <Badge variant="outline" className="text-[10px] uppercase tracking-wider">
                Curadoria
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Cole o sinal recebido. Vira rascunho de oportunidade - nunca publica sem revisão.
            </p>
          </div>
          <Badge className="hidden sm:inline-flex items-center gap-1 bg-secondary/60 text-foreground border border-border/60">
            <ShieldCheck className="w-3 h-3" />
            Revisão obrigatória
          </Badge>
        </div>

        {/* Form colar sinal */}
        <div className="p-5 border-b border-border/60 bg-secondary/20 space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Texto do sinal *</Label>
            <Textarea
              rows={3}
              value={draft.raw_text}
              onChange={(e) => setDraft({ ...draft, raw_text: e.target.value })}
              placeholder="Ex.: Alemanha x Paraguai - Mais de 1.5 gols @1.55 (sala VIP)"
              className="resize-none"
              maxLength={2000}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
            <div className="md:col-span-3 space-y-1.5 min-w-0">
              <Label className="text-xs text-muted-foreground">Fonte</Label>
              <Input
                value={draft.source_name}
                onChange={(e) => setDraft({ ...draft, source_name: e.target.value })}
                placeholder="Sala VIP, @canal"
                maxLength={120}
              />
            </div>
            <div className="md:col-span-2 space-y-1.5 min-w-0">
              <Label className="text-xs text-muted-foreground">Canal</Label>
              <Select
                value={draft.source_channel}
                onValueChange={(v) => setDraft({ ...draft, source_channel: v as SignalChannel })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CHANNELS.map((c) => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="md:col-span-2 space-y-1.5 min-w-0">
              <Label className="text-xs text-muted-foreground">Confiança</Label>
              <Select
                value={draft.confidence}
                onValueChange={(v) => setDraft({ ...draft, confidence: v as any })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CONFIDENCE.map((c) => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="md:col-span-3 space-y-1.5 min-w-0">
              <Label className="text-xs text-muted-foreground">Evento</Label>
              <Select
                value={draft.event_id || NONE}
                onValueChange={(v) => setDraft({ ...draft, event_id: v === NONE ? "" : v })}
              >
                <SelectTrigger><SelectValue placeholder="-" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>-</SelectItem>
                  {(events || []).map((e) => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.home_team} × {e.away_team}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="md:col-span-2 space-y-1.5 min-w-0">
              <Label className="text-xs text-muted-foreground">Casa</Label>
              <Select
                value={draft.platform_id || NONE}
                onValueChange={(v) => setDraft({ ...draft, platform_id: v === NONE ? "" : v })}
              >
                <SelectTrigger><SelectValue placeholder="-" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>-</SelectItem>
                  {platforms.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="md:col-span-3 space-y-1.5 min-w-0">
              <Label className="text-xs text-muted-foreground">Mercado</Label>
              <Select
                value={draft.market_type || NONE}
                onValueChange={(v) => setDraft({ ...draft, market_type: v === NONE ? "" : v })}
              >
                <SelectTrigger><SelectValue placeholder="-" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>-</SelectItem>
                  {MARKETS.map((m) => (
                    <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="md:col-span-4 space-y-1.5 min-w-0">
              <Label className="text-xs text-muted-foreground">Descrição do mercado</Label>
              <Input
                value={draft.market_name}
                onChange={(e) => setDraft({ ...draft, market_name: e.target.value })}
                placeholder="Mais de 1.5 gols"
                maxLength={160}
              />
            </div>
            <div className="md:col-span-2 space-y-1.5 min-w-0">
              <Label className="text-xs text-muted-foreground">Odd</Label>
              <Input
                value={draft.odd_label}
                onChange={(e) => setDraft({ ...draft, odd_label: e.target.value })}
                placeholder="1.85"
                maxLength={20}
              />
            </div>
            <div className="md:col-span-3 space-y-1.5 min-w-0">
              <Label className="text-xs text-muted-foreground">Link da casa</Label>
              <Input
                value={draft.house_url}
                onChange={(e) => setDraft({ ...draft, house_url: e.target.value })}
                placeholder="https://casa.com/..."
                className="font-mono text-xs"
                maxLength={500}
              />
            </div>
          </div>

          <div className="flex justify-end">
            <Button size="sm" onClick={handleAdd}>
              <Plus className="w-4 h-4" /> Registrar sinal
            </Button>
          </div>
        </div>

        {/* Lista de sinais */}
        <div className="divide-y divide-border/50">
          {isLoading ? (
            <div className="p-6 text-sm text-muted-foreground">Carregando sinais…</div>
          ) : (signals || []).length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-sm text-muted-foreground">
                Nenhum sinal ainda. Cole o primeiro acima para gerar rascunho.
              </p>
            </div>
          ) : (
            (signals || []).map((s) => {
              const ev = s.event_id ? eventsById.get(s.event_id) : null;
              const isConverting = convertingId === s.id;
              const alreadyDraft = !!s.draft_opportunity_id || s.status !== "novo";
              return (
                <div key={s.id} className="p-5 space-y-3">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-2 flex-wrap min-w-0">
                      <Badge variant="outline" className={`text-[10px] ${STATUS_TONE[s.status] ?? ""}`}>
                        {s.status}
                      </Badge>
                      <Badge variant="outline" className={`text-[10px] ${CONFIDENCE_TONE[s.confidence]}`}>
                        Confiança {s.confidence}
                      </Badge>
                      {s.source_name && (
                        <span className="text-xs text-muted-foreground truncate">
                          {s.source_name} • {s.source_channel}
                        </span>
                      )}
                      {ev && (
                        <span className="text-xs text-foreground/80 truncate">
                          {ev.home_team} × {ev.away_team}
                        </span>
                      )}
                      {s.market_name && (
                        <span className="text-xs text-muted-foreground truncate">
                          • {s.market_name}{s.odd_label ? ` @ ${s.odd_label}` : ""}
                        </span>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleConvert(s)}
                        disabled={isConverting || alreadyDraft}
                        title={alreadyDraft ? "Rascunho já gerado" : "Gerar rascunho"}
                      >
                        <ArrowRight className="w-4 h-4" />
                        {isConverting ? "Gerando…" : alreadyDraft ? "Rascunho gerado" : "Virar rascunho"}
                      </Button>
                      {s.status !== "descartado" && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => update(s.id, { status: "descartado" })}
                        >
                          Descartar
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          if (confirm("Remover este sinal?")) remove(s.id);
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  <p className="text-sm text-foreground/90 whitespace-pre-wrap break-words bg-secondary/30 border border-border/40 rounded-md px-3 py-2">
                    {s.raw_text}
                  </p>
                </div>
              );
            })
          )}
        </div>

        <div className="px-5 py-3 border-t border-border/60 bg-secondary/15">
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            Sinais não são promessa de acerto. Cards nascem <strong>inativos</strong> para curadoria PlayBet -
            ajuste destino, valide a odd e revise antes de publicar.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
