import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Wand2, AlertTriangle, Copy, Send, Power, Sparkles, ChevronDown,
  Trophy, Dices, Gift, BookOpen, ImageIcon, ShieldCheck,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  detectOpportunity, applyUtms, isSelfLandingLoop, looksLikePublicNoTracking,
  scoreSports, scoreCasino, slugify,
  type DetectedOpportunity, type OpportunityCategory, type PlatformLite, type ScoreResult,
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
  /** Active highlights per LP id (sort_order >= 20) - used to alert when > 3. */
  highlightsCountByLp?: Map<string, number>;
}

type Mode = OpportunityCategory;

const MODES: Array<{ value: Mode; label: string; icon: any; hint: string }> = [
  { value: "sports", label: "Em destaque", icon: Trophy, hint: "Evento e opção" },
  { value: "casino", label: "Cassino / Jogos", icon: Dices, hint: "Jogo, provedor e tipo" },
  { value: "offer", label: "Oferta", icon: Gift, hint: "Bônus, cashback, cadastro" },
  { value: "guide", label: "Guia", icon: BookOpen, hint: "Conteúdo explicativo" },
];

const PRIORITY_OPTS = [
  { v: 0, label: "Normal" },
  { v: 10, label: "Alta" },
  { v: 20, label: "Destaque" },
];

const SPORTS_CTAS = ["Ver opção", "Acessar agora", "Confira na casa"];
const CASINO_CTAS = ["Jogar agora", "Ver jogo", "Abrir cassino"];
const OFFER_CTAS = ["Resgatar oferta", "Ativar bônus", "Quero participar"];
const GUIDE_CTAS = ["Ler guia", "Saiba mais"];

const CASINO_TYPES = ["slot", "crash", "roleta", "ao vivo", "mines", "blackjack", "destaque"];
const CASINO_BADGES = ["Em destaque", "Novidade", "Cassino em alta", "Oferta oficial"];

const MEDIA_TYPES: Array<{ v: string; label: string }> = [
  { v: "image", label: "Imagem" },
  { v: "screenshot", label: "Screenshot" },
  { v: "banner", label: "Banner" },
  { v: "game_thumb", label: "Thumb do jogo" },
  { v: "odds_print", label: "Print da opção" },
];

const SOURCE_LABELS = [
  "Print oficial", "Banner da casa", "Imagem do jogo", "Print da opção", "Mídia própria",
];

// Copy proibida - bloqueia publicação para qualquer campo textual.
const FORBIDDEN_RX = /\b(mais\s+chance(s)?\s+de\s+ganhar|ganho\s+certo|lucro|garantido|garantia\s+de\s+ganho)\b/i;

function toIso(local: string): string | null {
  if (!local) return null;
  const d = new Date(local);
  return isNaN(d.getTime()) ? null : d.toISOString();
}

function hasForbidden(...parts: Array<string | null | undefined>): string | null {
  for (const p of parts) {
    if (p && FORBIDDEN_RX.test(p)) return p;
  }
  return null;
}

export function OpportunityWizard({
  open, onOpenChange, platforms, landingPages, campanhas, onCreate,
  defaultLandingPageId, highlightsCountByLp,
}: Props) {
  const { toast } = useToast();

  const [mode, setMode] = useState<Mode>("sports");
  const [raw, setRaw] = useState("");
  const [campaignId, setCampaignId] = useState("");
  const [landingPageId, setLandingPageId] = useState(defaultLandingPageId || "");
  const [casa, setCasa] = useState("");
  const [prioridade, setPrioridade] = useState<number>(10);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [techOpen, setTechOpen] = useState(false);

  // Sports
  const [evento, setEvento] = useState("");
  const [mercado, setMercado] = useState("");
  const [odd, setOdd] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [sportsCta, setSportsCta] = useState(SPORTS_CTAS[1]);

  // Casino
  const [gameName, setGameName] = useState("");
  const [gameType, setGameType] = useState("");
  const [provider, setProvider] = useState("");
  const [casinoOffer, setCasinoOffer] = useState("");
  const [casinoBadge, setCasinoBadge] = useState(CASINO_BADGES[0]);
  const [casinoCta, setCasinoCta] = useState(CASINO_CTAS[0]);

  // Offer / Guide
  const [genericTitle, setGenericTitle] = useState("");
  const [genericSubtitle, setGenericSubtitle] = useState("");
  const [genericCta, setGenericCta] = useState(OFFER_CTAS[0]);

  // Media
  const [imageUrl, setImageUrl] = useState("");
  const [imageAlt, setImageAlt] = useState("");
  const [mediaType, setMediaType] = useState<string>("image");
  const [sourceLabel, setSourceLabel] = useState<string>("");
  const [sourceUrl, setSourceUrl] = useState("");

  useEffect(() => {
    if (open && defaultLandingPageId && !landingPageId) setLandingPageId(defaultLandingPageId);
  }, [open, defaultLandingPageId, landingPageId]);

  useEffect(() => {
    if (mode === "offer") setGenericCta(OFFER_CTAS[0]);
    if (mode === "guide") setGenericCta(GUIDE_CTAS[0]);
    // default media type sugerido por modo
    if (mode === "sports") setMediaType((m) => m || "odds_print");
    else if (mode === "casino") setMediaType((m) => m || "game_thumb");
    else setMediaType((m) => m || "image");
  }, [mode]);

  const campanhaSlug = useMemo(() => {
    const c = campanhas.find((x) => x.id === campaignId);
    return c?.slug || c?.nome || undefined;
  }, [campanhas, campaignId]);

  const channelHint = useMemo(() => {
    if (mode === "casino") return { source: "instagram", medium: "bio" };
    if (mode === "offer") return { source: "instagram", medium: "stories" };
    return { source: "instagram", medium: "bio" };
  }, [mode]);

  const itemSlug = useMemo(() => {
    if (mode === "sports") return slugify(evento);
    if (mode === "casino") return slugify(gameName);
    return slugify(genericTitle);
  }, [mode, evento, gameName, genericTitle]);

  const detected: DetectedOpportunity | null = useMemo(() => {
    if (!raw.trim()) return null;
    return detectOpportunity({
      rawInput: raw, platforms, campaignSlug: campanhaSlug,
      forcedCategory: mode, channel: channelHint, itemSlug,
    });
  }, [raw, platforms, campanhaSlug, mode, channelHint, itemSlug]);

  const [modeTouched, setModeTouched] = useState(false);
  useEffect(() => {
    if (!modeTouched && detected) setMode(detected.category);
  }, [detected, modeTouched]);

  const finalUrl = useMemo(() => {
    if (!detected || !detected.destination_url) return "";
    if (isSelfLandingLoop(detected.destination_url)) return "";
    return applyUtms(detected.destination_url, {
      utm_source: detected.utm_source,
      utm_medium: detected.utm_medium,
      utm_campaign: detected.utm_campaign,
      utm_content: detected.utm_content,
    });
  }, [detected]);

  const publicNoTracking = useMemo(
    () => !!detected && !!finalUrl && looksLikePublicNoTracking(detected.destination_url),
    [detected, finalUrl],
  );

  const score: ScoreResult | null = useMemo(() => {
    if (!detected) return null;
    if (mode === "sports") {
      return scoreSports({ detected, hasValidDestination: !!finalUrl, casa, oddLabel: odd, marketName: mercado, startsAt: toIso(startsAt) });
    }
    if (mode === "casino") {
      return scoreCasino({ detected, hasValidDestination: !!finalUrl, casa, gameName, gameType, provider, badge: casinoBadge });
    }
    return { score: finalUrl ? 60 : 0, labels: [], reasons: [] };
  }, [detected, mode, finalUrl, casa, odd, mercado, startsAt, gameName, gameType, provider, casinoBadge]);

  // Preview computed
  const preview = useMemo(() => {
    let title = "Oportunidade";
    let subtitle = "";
    let badge: string | null = null;
    let cta = "Ver";
    if (mode === "sports") {
      title = evento || "Aposta sugerida";
      subtitle = [mercado, casa].filter(Boolean).join(" · ");
      badge = "Em destaque";
      cta = sportsCta;
    } else if (mode === "casino") {
      title = gameName || "Em destaque";
      subtitle = [provider, gameType, casa].filter(Boolean).join(" · ");
      badge = casinoBadge;
      cta = casinoCta;
    } else {
      title = genericTitle || (mode === "offer" ? "Oferta exclusiva" : "Guia rápido");
      subtitle = genericSubtitle || (detected?.suggestedSubtitle ?? "");
      badge = mode === "offer" ? "Oferta oficial" : "Guia rápido";
      cta = genericCta;
    }
    return { title, subtitle, badge, cta };
  }, [mode, evento, mercado, casa, odd, sportsCta, gameName, provider, gameType, casinoBadge, casinoCta, genericTitle, genericSubtitle, genericCta, detected]);

  function reset() {
    setRaw(""); setCasa(""); setPrioridade(10); setAdvancedOpen(false); setTechOpen(false);
    setEvento(""); setMercado(""); setOdd(""); setStartsAt(""); setEndsAt(""); setSportsCta(SPORTS_CTAS[1]);
    setGameName(""); setGameType(""); setProvider(""); setCasinoOffer(""); setCasinoBadge(CASINO_BADGES[0]); setCasinoCta(CASINO_CTAS[0]);
    setGenericTitle(""); setGenericSubtitle(""); setGenericCta(OFFER_CTAS[0]);
    setImageUrl(""); setImageAlt(""); setMediaType("image"); setSourceLabel(""); setSourceUrl("");
    setModeTouched(false);
  }

  function buildPayload(active: boolean, sortOverride?: number): Partial<LpOpportunityRow> | null {
    if (!detected || !finalUrl) return null;

    let title = "";
    let subtitle: string | null = null;
    let cta = "";
    let badge: string | null = null;
    let event_name: string | null = null;
    let market_name: string | null = null;
    let odd_label: string | null = null;

    const media = imageUrl
      ? {
          image_url: imageUrl.trim(),
          image_alt: imageAlt.trim() || preview.title,
          media_type: mediaType,
          source_label: sourceLabel || null,
          source_url: sourceUrl.trim() || null,
        }
      : null;

    const meta: Record<string, unknown> = {
      wizard: true,
      mode,
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
      media,
    };

    if (mode === "sports") {
      title = evento || detected.suggestedTitle;
      subtitle = mercado || detected.suggestedSubtitle;
      cta = sportsCta;
      badge = odd ? `Odd ${odd}` : "Em destaque";
      event_name = evento || null;
      market_name = mercado || null;
      odd_label = odd || null;
    } else if (mode === "casino") {
      title = gameName || detected.suggestedTitle;
      subtitle = [provider, gameType].filter(Boolean).join(" · ") || detected.suggestedSubtitle;
      cta = casinoCta;
      badge = casinoBadge;
      meta.game = { name: gameName, type: gameType, provider, offer: casinoOffer };
    } else {
      title = genericTitle || detected.suggestedTitle;
      subtitle = genericSubtitle || detected.suggestedSubtitle;
      cta = genericCta;
      badge = detected.suggestedBadge;
    }

    return {
      landing_page_id: landingPageId || null,
      platform_id: detected.platform?.id || null,
      campanha_id: campaignId || null,
      title: title || "Oportunidade",
      subtitle,
      category: mode,
      event_name,
      market_name,
      odd_label,
      badge,
      cta_label: cta,
      destination_url: finalUrl,
      starts_at: toIso(startsAt),
      ends_at: toIso(endsAt),
      sort_order: sortOverride ?? prioridade,
      is_active: active,
      metadata: meta,
    };
  }

  function validate(active: boolean): string | null {
    if (!raw.trim()) return "Cole o link, shareCode ou ID da aposta.";
    if (!detected || !finalUrl) {
      if (detected && isSelfLandingLoop(detected.destination_url))
        return "Link aponta para a própria LP - gera loop. Use o deep link da casa.";
      return "Link inválido ou vazio.";
    }
    if (active && !landingPageId) return "Selecione a landing page para publicar.";

    const offender = hasForbidden(
      evento, mercado, casinoOffer, genericTitle, genericSubtitle, sourceLabel, imageAlt,
    );
    if (offender) return `Copy proibida detectada ("${offender}"). Evite prometer ganho, lucro ou garantia.`;

    return null;
  }

  async function persist(active: boolean, sortOverride?: number) {
    const err = validate(active);
    if (err) { toast({ title: "Não foi possível salvar", description: err, variant: "destructive" }); return; }

    if (mode === "sports" && (!mercado || !odd)) {
      toast({ title: "Atenção", description: "Sports sem mercado/odd ainda pode ser publicado, mas perde força." });
    }
    if (mode === "casino" && !gameName) {
      toast({ title: "Atenção", description: "Cassino sem nome do jogo perde clareza no card." });
    }
    if (!imageUrl) {
      toast({ title: "Sem imagem", description: "Recomendado: anexar print/banner real para o card da LP." });
    }
    // Destaque > 3 por LP
    if (sortOverride === 20 && landingPageId && highlightsCountByLp) {
      const current = highlightsCountByLp.get(landingPageId) || 0;
      if (current >= 3) {
        const ok = confirm(`Esta landing já tem ${current} destaques ativos. Recomendado no máximo 3. Publicar mesmo assim?`);
        if (!ok) return;
      }
    }

    const payload = buildPayload(active, sortOverride)!;
    await onCreate(payload);
    toast({
      title: active ? (sortOverride === 20 ? "Publicado como destaque" : "Publicado na landing") : "Rascunho salvo",
    });
    reset();
    onOpenChange(false);
  }

  function copyJson() {
    if (!detected) return;
    navigator.clipboard.writeText(JSON.stringify({ mode, detected, finalUrl, score, media: { imageUrl, imageAlt, mediaType, sourceLabel, sourceUrl } }, null, 2));
    toast({ title: "JSON copiado" });
  }

  const loop = detected ? isSelfLandingLoop(detected.rawInput) : false;
  const platformName = detected?.platform?.name || detected?.platform?.slug;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl p-0 gap-0 max-h-[92vh] flex flex-col overflow-hidden border-border">
        {/* STICKY HEADER */}
        <DialogHeader className="sticky top-0 z-20 px-6 py-4 bg-card/85 backdrop-blur-md border-b border-border space-y-0">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <DialogTitle className="flex items-center gap-2 text-base font-semibold tracking-tight">
                <Wand2 className="w-4 h-4 text-primary shrink-0" />
                Assistente de Oportunidade
              </DialogTitle>
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground mt-1">
                Oportunidades LP
              </p>
            </div>
          </div>
        </DialogHeader>

        {/* SCROLLABLE BODY */}
        <div className="flex-1 overflow-y-auto main-scroll px-6 py-6 space-y-7">
          {/* MODE TABS - segmented */}
          <Tabs value={mode} onValueChange={(v) => { setMode(v as Mode); setModeTouched(true); }}>
            <TabsList className="grid grid-cols-4 w-full h-auto p-1 bg-secondary/60 rounded-lg">
              {MODES.map((m) => (
                <TabsTrigger
                  key={m.value}
                  value={m.value}
                  className="gap-1.5 py-2 text-xs font-medium rounded-md data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm"
                >
                  <m.icon className="w-3.5 h-3.5" /> {m.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>

          {/* PASTE LINK */}
          <section className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              Link da oportunidade
            </Label>
            <Textarea
              rows={2}
              value={raw}
              onChange={(e) => setRaw(e.target.value)}
              placeholder="https://casa.com/share/AB12CD  •  AB12CD  •  3489271"
              className="font-mono text-sm resize-none"
            />
            {loop && (
              <p className="text-xs text-destructive flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" /> Link aponta para a própria landing - bloqueado por segurança.
              </p>
            )}
            {publicNoTracking && (
              <p className="text-xs text-warning flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" /> Confirme se este link mantém afiliado/tracking antes de publicar.
              </p>
            )}

            {detected && (
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                <Badge variant="secondary">{platformName || "Casa não detectada"}</Badge>
                <Badge variant="outline">{MODES.find((m) => m.value === mode)?.label}</Badge>
                {detected.shareCode && <Badge>shareCode: {detected.shareCode}</Badge>}
                {detected.betId && <Badge>aposta: {detected.betId}</Badge>}
                {detected.hasAffiliateTracking && (
                  <Badge variant="secondary" className="gap-1">
                    <ShieldCheck className="w-3 h-3" /> tracking preservado
                  </Badge>
                )}
                {score && (
                  <Badge variant={score.score >= 70 ? "default" : score.score >= 40 ? "secondary" : "outline"}>
                    Recomendação {score.score}/100
                  </Badge>
                )}
              </div>
            )}
          </section>

          {/* CASA + LP */}
          <section className="space-y-3 pt-6 border-t border-border-subtle">
            <Label className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              Destino
            </Label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Casa</Label>
                <Input value={casa || platformName || ""} onChange={(e) => setCasa(e.target.value)} placeholder="VUPI, EstrelaBet…" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Landing page</Label>
                <Select value={landingPageId || "__"} onValueChange={(v) => setLandingPageId(v === "__" ? "" : v)}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__">-</SelectItem>
                    {landingPages.map((lp) => (
                      <SelectItem key={lp.id} value={lp.id}>{lp.name || lp.slug}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </section>

          {/* CAMPOS POR MODO */}
          <section className="space-y-3 pt-6 border-t border-border-subtle">
            <Label className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              Conteúdo do card
            </Label>

            {mode === "sports" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="md:col-span-2 space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Evento</Label>
                  <Input value={evento} onChange={(e) => setEvento(e.target.value)} placeholder="Alemanha x Paraguai" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Mercado</Label>
                  <Input value={mercado} onChange={(e) => setMercado(e.target.value)} placeholder="Favorito vence, +1.5 gols" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Odd</Label>
                  <Input value={odd} onChange={(e) => setOdd(e.target.value)} placeholder="1.30" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Horário do jogo</Label>
                  <Input type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">CTA</Label>
                  <Select value={sportsCta} onValueChange={setSportsCta}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{SPORTS_CTAS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {mode === "casino" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="md:col-span-2 space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Nome do jogo</Label>
                  <Input value={gameName} onChange={(e) => setGameName(e.target.value)} placeholder="Fortune Tiger" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Tipo</Label>
                  <Select value={gameType || "__"} onValueChange={(v) => setGameType(v === "__" ? "" : v)}>
                    <SelectTrigger><SelectValue placeholder="Slot, crash, roleta…" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__">-</SelectItem>
                      {CASINO_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Provedor (opcional)</Label>
                  <Input value={provider} onChange={(e) => setProvider(e.target.value)} placeholder="Pragmatic, PG Soft, Evolution…" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Badge</Label>
                  <Select value={casinoBadge} onValueChange={setCasinoBadge}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{CASINO_BADGES.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">CTA</Label>
                  <Select value={casinoCta} onValueChange={setCasinoCta}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{CASINO_CTAS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="md:col-span-2 space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Oferta / benefício (opcional)</Label>
                  <Input value={casinoOffer} onChange={(e) => setCasinoOffer(e.target.value)} placeholder="50 giros grátis, cashback semanal…" />
                </div>
              </div>
            )}

            {(mode === "offer" || mode === "guide") && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="md:col-span-2 space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Título</Label>
                  <Input value={genericTitle} onChange={(e) => setGenericTitle(e.target.value)} placeholder={mode === "offer" ? "Bônus de boas-vindas" : "Como começar com responsabilidade"} />
                </div>
                <div className="md:col-span-2 space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Subtítulo</Label>
                  <Input value={genericSubtitle} onChange={(e) => setGenericSubtitle(e.target.value)} placeholder="Resumo curto e claro" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">CTA</Label>
                  <Select value={genericCta} onValueChange={setGenericCta}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {(mode === "offer" ? OFFER_CTAS : GUIDE_CTAS).map((c) => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Prioridade</Label>
                  <Select value={String(prioridade)} onValueChange={(v) => setPrioridade(Number(v))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{PRIORITY_OPTS.map((p) => <SelectItem key={p.v} value={String(p.v)}>{p.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </section>

          {/* MEDIA */}
          <section className="space-y-3 pt-6 border-t border-border-subtle">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground flex items-center gap-1.5">
                <ImageIcon className="w-3.5 h-3.5" /> Mídia visual
              </Label>
              {!imageUrl && (
                <span className="text-[10px] text-muted-foreground">Recomendado 16:9</span>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="md:col-span-2 space-y-1.5">
                <Label className="text-xs text-muted-foreground">URL da imagem</Label>
                <Input value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="https://cdn.exemplo.com/print.jpg" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Tipo</Label>
                <Select value={mediaType} onValueChange={setMediaType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{MEDIA_TYPES.map((m) => <SelectItem key={m.v} value={m.v}>{m.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Rótulo da fonte</Label>
                <Select value={sourceLabel || "__"} onValueChange={(v) => setSourceLabel(v === "__" ? "" : v)}>
                  <SelectTrigger><SelectValue placeholder="-" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__">-</SelectItem>
                    {SOURCE_LABELS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Alt text</Label>
                <Input value={imageAlt} onChange={(e) => setImageAlt(e.target.value)} placeholder="Descrição curta da imagem" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">URL da fonte (opcional)</Label>
                <Input value={sourceUrl} onChange={(e) => setSourceUrl(e.target.value)} placeholder="https://…" />
              </div>
            </div>
          </section>

          {/* PREVIEW DO CARD */}
          <section className="space-y-3 pt-6 border-t border-border-subtle">
            <Label className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              Prévia do card
            </Label>
            <div className="rounded-xl border border-border bg-card overflow-hidden max-w-sm">
              <div className="aspect-[16/9] bg-muted relative">
                {imageUrl ? (
                  <img src={imageUrl} alt={imageAlt || preview.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground">
                    <ImageIcon className="w-5 h-5 mr-2" /> sem imagem
                  </div>
                )}
                {preview.badge && (
                  <span className="absolute top-2 left-2 text-[10px] uppercase tracking-wider px-2 py-1 rounded bg-primary text-primary-foreground font-semibold">
                    {preview.badge}
                  </span>
                )}
              </div>
              <div className="p-3 space-y-1">
                <div className="text-sm font-semibold leading-tight">{preview.title}</div>
                {preview.subtitle && (
                  <div className="text-xs text-muted-foreground">{preview.subtitle}</div>
                )}
                <Button size="sm" className="w-full mt-2">{preview.cta}</Button>
                <div className="text-[10px] text-muted-foreground pt-1">
                  Jogue com responsabilidade · +18 · Conteúdo informativo
                </div>
              </div>
            </div>
          </section>

          {/* ADVANCED */}
          <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen}>
            <CollapsibleTrigger className="w-full flex items-center justify-between py-3 border-t border-border-subtle group text-left">
              <span className="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors">
                Mais opções
              </span>
              <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${advancedOpen ? "rotate-180" : ""}`} />
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Campanha</Label>
                <Select value={campaignId || "__"} onValueChange={(v) => setCampaignId(v === "__" ? "" : v)}>
                  <SelectTrigger><SelectValue placeholder="-" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__">-</SelectItem>
                    {campanhas.map((c) => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              {mode !== "offer" && mode !== "guide" && (
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Prioridade</Label>
                  <Select value={String(prioridade)} onValueChange={(v) => setPrioridade(Number(v))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{PRIORITY_OPTS.map((p) => <SelectItem key={p.v} value={String(p.v)}>{p.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              )}
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Início (vigência)</Label>
                <Input type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Fim (vigência)</Label>
                <Input type="datetime-local" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} />
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* DETALHES TÉCNICOS */}
          <Collapsible open={techOpen} onOpenChange={setTechOpen}>
            <CollapsibleTrigger className="w-full flex items-center justify-between py-3 border-t border-border-subtle group text-left">
              <span className="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors">
                Detalhes técnicos
              </span>
              <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${techOpen ? "rotate-180" : ""}`} />
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-3 space-y-2 text-[11px] text-muted-foreground">
              <div>
                <span className="uppercase tracking-wide font-semibold">URL final</span>
                <div className="font-mono break-all p-2 rounded bg-muted mt-1">{finalUrl || "-"}</div>
              </div>
              {detected && (
                <div className="font-mono break-all">
                  utm_source={detected.utm_source} · utm_medium={detected.utm_medium} · utm_campaign={detected.utm_campaign} · utm_content={detected.utm_content}
                </div>
              )}
              {score && (
                <div>Score: {score.score}/100 · {score.reasons.join(" · ")}</div>
              )}
            </CollapsibleContent>
          </Collapsible>
        </div>

        {/* STICKY FOOTER */}
        <DialogFooter className="sticky bottom-0 z-20 px-6 py-4 bg-card/85 backdrop-blur-md border-t border-border flex-row items-center justify-between gap-2 sm:justify-between">
          <Button variant="ghost" size="sm" onClick={copyJson} disabled={!detected} className="gap-1.5">
            <Copy className="w-3.5 h-3.5" /> JSON
          </Button>
          <div className="flex items-center gap-2 flex-wrap justify-end">
            <Button variant="ghost" size="sm" onClick={() => persist(false)} disabled={!detected || !finalUrl}>
              Salvar rascunho
            </Button>
            <Button variant="secondary" size="sm" onClick={() => persist(true)} disabled={!detected || !finalUrl || !landingPageId} className="gap-1.5">
              <Send className="w-3.5 h-3.5" /> Publicar
            </Button>
            <Button size="sm" onClick={() => persist(true, 20)} disabled={!detected || !finalUrl || !landingPageId} className="gap-1.5 bg-accent text-accent-foreground hover:bg-accent/90 shadow-[0_0_18px_-4px_hsl(var(--accent)/0.45)]">
              <Sparkles className="w-3.5 h-3.5" /> Publicar como destaque
            </Button>
          </div>
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
