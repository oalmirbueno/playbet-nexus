import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Wand2, CheckCircle2, AlertTriangle, Copy, Send, Power } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  detectOpportunity,
  applyUtms,
  isSelfLandingLoop,
  scoreOpportunity,
  type DetectedOpportunity,
  type PlatformLite,
} from "@/lib/opportunityDetect";
import type { LpOpportunityRow } from "@/services/lpOpportunityService";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  platforms: PlatformLite[];
  landingPages: Array<{ id: string; name?: string | null; slug?: string | null }>;
  campanhas: Array<{ id: string; nome?: string | null; slug?: string | null }>;
  onCreate: (payload: Partial<LpOpportunityRow>) => Promise<LpOpportunityRow | void>;
  defaultLandingPageId?: string;
}

const PRIORITY_OPTS = [
  { v: 0, label: "Normal" },
  { v: 10, label: "Alta" },
  { v: 20, label: "Destaque" },
];

function toIso(local: string): string | null {
  if (!local) return null;
  const d = new Date(local);
  return isNaN(d.getTime()) ? null : d.toISOString();
}

export function OpportunityWizard({
  open,
  onOpenChange,
  platforms,
  landingPages,
  campanhas,
  onCreate,
  defaultLandingPageId,
}: Props) {
  const { toast } = useToast();
  const [raw, setRaw] = useState("");
  const [campaignId, setCampaignId] = useState<string>("");
  const [landingPageId, setLandingPageId] = useState<string>(defaultLandingPageId || "");
  const [evento, setEvento] = useState("");
  const [mercado, setMercado] = useState("");
  const [odd, setOdd] = useState("");
  const [casa, setCasa] = useState("");
  const [prioridade, setPrioridade] = useState<number>(10);
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [titleOverride, setTitleOverride] = useState("");
  const [subtitleOverride, setSubtitleOverride] = useState("");

  useEffect(() => {
    if (open && defaultLandingPageId && !landingPageId) setLandingPageId(defaultLandingPageId);
  }, [open, defaultLandingPageId, landingPageId]);

  const campanhaSlug = useMemo(() => {
    const c = campanhas.find((x) => x.id === campaignId);
    return c?.slug || (c?.nome ? c.nome : undefined);
  }, [campanhas, campaignId]);

  const detected: DetectedOpportunity | null = useMemo(() => {
    if (!raw.trim()) return null;
    return detectOpportunity({ rawInput: raw, platforms, campaignSlug: campanhaSlug || undefined });
  }, [raw, platforms, campanhaSlug]);

  const finalUrl = useMemo(() => {
    if (!detected) return "";
    if (!detected.destination_url) return "";
    if (isSelfLandingLoop(detected.destination_url)) return "";
    return applyUtms(detected.destination_url, {
      utm_source: detected.utm_source,
      utm_medium: detected.utm_medium,
      utm_campaign: detected.utm_campaign,
      utm_content: detected.utm_content,
    });
  }, [detected]);

  const score = useMemo(() => {
    if (!detected) return null;
    return scoreOpportunity({
      detected,
      oddLabel: odd,
      marketName: mercado,
      startsAt: toIso(startsAt),
      hasValidDestination: !!finalUrl,
    });
  }, [detected, odd, mercado, startsAt, finalUrl]);

  function reset() {
    setRaw("");
    setEvento(""); setMercado(""); setOdd(""); setCasa("");
    setPrioridade(10); setStartsAt(""); setEndsAt("");
    setTitleOverride(""); setSubtitleOverride("");
  }

  function buildPayload(active: boolean): Partial<LpOpportunityRow> | null {
    if (!detected || !finalUrl) return null;
    const title = titleOverride.trim() || `${evento || detected.suggestedTitle}`.trim();
    return {
      landing_page_id: landingPageId || null,
      platform_id: detected.platform?.id || null,
      campanha_id: campaignId || null,
      title: title || "Oportunidade",
      subtitle: subtitleOverride.trim() || detected.suggestedSubtitle,
      category: detected.category,
      event_name: evento || null,
      market_name: mercado || null,
      odd_label: odd || null,
      badge: detected.suggestedBadge,
      cta_label: detected.suggestedCta,
      destination_url: finalUrl,
      starts_at: toIso(startsAt),
      ends_at: toIso(endsAt),
      sort_order: prioridade,
      is_active: active,
      metadata: {
        wizard: true,
        kind: detected.kind,
        shareCode: detected.shareCode,
        betId: detected.betId,
        casa: casa || null,
        utms: {
          utm_source: detected.utm_source,
          utm_medium: detected.utm_medium,
          utm_campaign: detected.utm_campaign,
          utm_content: detected.utm_content,
        },
        score: score?.score ?? null,
        labels: score?.labels ?? [],
      },
    };
  }

  async function handleGenerate() {
    const payload = buildPayload(false);
    if (!payload) {
      toast({ title: "Cole um link válido", description: "Precisamos do link oficial da casa.", variant: "destructive" });
      return;
    }
    await onCreate(payload);
    toast({ title: "Oportunidade gerada", description: "Salva como inativa. Revise e publique quando quiser." });
    reset();
    onOpenChange(false);
  }

  async function handlePublish() {
    if (!finalUrl) {
      toast({ title: "Link final ausente", description: "Não é possível publicar sem destino válido.", variant: "destructive" });
      return;
    }
    if (!landingPageId) {
      toast({ title: "Selecione a landing page", variant: "destructive" });
      return;
    }
    const payload = buildPayload(true)!;
    await onCreate(payload);
    toast({ title: "Publicado na landing", description: "A LP pública já reflete este card." });
    reset();
    onOpenChange(false);
  }

  async function handleDuplicateForAnotherHouse() {
    const payload = buildPayload(false);
    if (!payload) return;
    await onCreate({ ...payload, title: `${payload.title} (duplicar/editar casa)`, is_active: false });
    toast({ title: "Duplicado", description: "Edite a casa/URL da cópia." });
  }

  function copyJson() {
    if (!detected) return;
    navigator.clipboard.writeText(JSON.stringify({ detected, finalUrl, score }, null, 2));
    toast({ title: "JSON copiado" });
  }

  const loop = detected ? isSelfLandingLoop(detected.rawInput) : false;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wand2 className="w-4 h-4 text-primary" /> Assistente de Oportunidade
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          <div>
            <Label>Cole aqui o link oficial, shareCode ou ID da aposta</Label>
            <Textarea
              rows={2}
              value={raw}
              onChange={(e) => setRaw(e.target.value)}
              placeholder="https://casa.com/share/AB12CD  •  AB12CD  •  3489271"
              className="font-mono text-sm"
            />
            {loop && (
              <p className="text-xs text-destructive mt-1 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" /> Este link aponta para a própria landing — gera loop. Use o deep link da casa.
              </p>
            )}
          </div>

          {detected && (
            <Card>
              <CardContent className="p-4 space-y-3">
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <Badge variant="secondary">
                    {detected.platform?.name || detected.platform?.slug || "Plataforma desconhecida"}
                  </Badge>
                  <Badge variant="outline">{detected.category}</Badge>
                  <Badge variant="outline">{detected.kind}</Badge>
                  {detected.shareCode && <Badge>shareCode: {detected.shareCode}</Badge>}
                  {detected.betId && <Badge>betId: {detected.betId}</Badge>}
                  {detected.hasUtm && <Badge variant="secondary">UTM original preservada</Badge>}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-muted-foreground font-mono break-all">
                  <div><span className="text-foreground">utm_source:</span> {detected.utm_source}</div>
                  <div><span className="text-foreground">utm_medium:</span> {detected.utm_medium}</div>
                  <div><span className="text-foreground">utm_campaign:</span> {detected.utm_campaign}</div>
                  <div><span className="text-foreground">utm_content:</span> {detected.utm_content}</div>
                </div>
                <div className="text-xs">
                  <div className="text-muted-foreground mb-1">URL final:</div>
                  <div className="font-mono break-all p-2 rounded bg-muted">{finalUrl || "—"}</div>
                </div>
                {score && (
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={score.score >= 70 ? "default" : score.score >= 40 ? "secondary" : "outline"}>
                      Recomendação: {score.score}/100
                    </Badge>
                    {score.labels.map((l) => (
                      <Badge key={l} variant="outline">{l}</Badge>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <Label>Landing page</Label>
              <Select value={landingPageId || "__"} onValueChange={(v) => setLandingPageId(v === "__" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__">—</SelectItem>
                  {landingPages.map((lp) => (
                    <SelectItem key={lp.id} value={lp.id}>{lp.name || lp.slug}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Campanha</Label>
              <Select value={campaignId || "__"} onValueChange={(v) => setCampaignId(v === "__" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__">—</SelectItem>
                  {campanhas.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Evento</Label>
              <Input value={evento} onChange={(e) => setEvento(e.target.value)} placeholder="Alemanha x Paraguai" />
            </div>
            <div>
              <Label>Mercado</Label>
              <Input value={mercado} onChange={(e) => setMercado(e.target.value)} placeholder="Favorito vence, +1.5 gols" />
            </div>

            <div>
              <Label>Odd</Label>
              <Input value={odd} onChange={(e) => setOdd(e.target.value)} placeholder="Odd 1.30" />
            </div>
            <div>
              <Label>Casa</Label>
              <Input value={casa} onChange={(e) => setCasa(e.target.value)} placeholder="VUPI, EstrelaBet…" />
            </div>

            <div>
              <Label>Prioridade</Label>
              <Select value={String(prioridade)} onValueChange={(v) => setPrioridade(Number(v))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PRIORITY_OPTS.map((p) => (
                    <SelectItem key={p.v} value={String(p.v)}>{p.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Início</Label>
                <Input type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} />
              </div>
              <div>
                <Label>Fim</Label>
                <Input type="datetime-local" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} />
              </div>
            </div>

            <div className="md:col-span-2">
              <Label>Título (opcional, sobrescreve sugestão)</Label>
              <Input value={titleOverride} onChange={(e) => setTitleOverride(e.target.value)} placeholder={detected?.suggestedTitle || "Título do card"} />
            </div>
            <div className="md:col-span-2">
              <Label>Subtítulo</Label>
              <Input value={subtitleOverride} onChange={(e) => setSubtitleOverride(e.target.value)} placeholder={detected?.suggestedSubtitle || ""} />
            </div>
          </div>

          {detected && finalUrl && (
            <div className="text-xs text-muted-foreground flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-emerald-500" /> Detecção concluída. Revise e publique.
            </div>
          )}
        </div>

        <DialogFooter className="flex-wrap gap-2">
          <Button variant="outline" onClick={copyJson} disabled={!detected}>
            <Copy className="w-4 h-4" /> Copiar JSON
          </Button>
          <Button variant="outline" onClick={handleDuplicateForAnotherHouse} disabled={!detected || !finalUrl}>
            Duplicar para outra casa
          </Button>
          <Button variant="secondary" onClick={handleGenerate} disabled={!detected || !finalUrl}>
            <Wand2 className="w-4 h-4" /> Gerar oportunidade
          </Button>
          <Button onClick={handlePublish} disabled={!detected || !finalUrl || !landingPageId}>
            <Send className="w-4 h-4" /> Publicar na landing
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export const DeactivateAfterGameButton = ({ onClick }: { onClick: () => void }) => (
  <Button size="sm" variant="ghost" onClick={onClick}>
    <Power className="w-4 h-4" /> Desativar após o jogo
  </Button>
);
