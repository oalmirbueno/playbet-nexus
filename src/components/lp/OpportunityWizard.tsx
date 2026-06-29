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
import { Wand2, AlertTriangle, Copy, Send, Power, Sparkles, ChevronDown, Trophy, Dices, Gift, BookOpen } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  detectOpportunity,
  applyUtms,
  isSelfLandingLoop,
  looksLikePublicNoTracking,
  scoreSports,
  scoreCasino,
  slugify,
  type DetectedOpportunity,
  type OpportunityCategory,
  type PlatformLite,
  type ScoreResult,
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

type Mode = OpportunityCategory;

const MODES: Array<{ value: Mode; label: string; icon: any; hint: string }> = [
  { value: "sports", label: "Sports Odds", icon: Trophy, hint: "Evento, mercado e odd" },
  { value: "casino", label: "Cassino / Jogos", icon: Dices, hint: "Jogo, provedor e tipo" },
  { value: "offer", label: "Oferta", icon: Gift, hint: "Bônus, cashback, cadastro" },
  { value: "guide", label: "Guia", icon: BookOpen, hint: "Conteúdo explicativo" },
];

const PRIORITY_OPTS = [
  { v: 0, label: "Normal" },
  { v: 10, label: "Alta" },
  { v: 20, label: "Destaque" },
];

const SPORTS_CTAS = ["Ver odd", "Apostar agora", "Confira na casa"];
const CASINO_CTAS = ["Jogar agora", "Ver jogo", "Abrir cassino"];
const OFFER_CTAS = ["Resgatar oferta", "Ativar bônus", "Quero participar"];
const GUIDE_CTAS = ["Ler guia", "Saiba mais"];

const CASINO_TYPES = ["slot", "crash", "roleta", "ao vivo", "mines", "blackjack", "destaque"];
const CASINO_BADGES = ["Jogo em destaque", "Novidade", "Cassino em alta", "Oferta oficial"];

function toIso(local: string): string | null {
  if (!local) return null;
  const d = new Date(local);
  return isNaN(d.getTime()) ? null : d.toISOString();
}

export function OpportunityWizard({
  open, onOpenChange, platforms, landingPages, campanhas, onCreate, defaultLandingPageId,
}: Props) {
  const { toast } = useToast();

  const [mode, setMode] = useState<Mode>("sports");
  const [raw, setRaw] = useState("");
  const [campaignId, setCampaignId] = useState("");
  const [landingPageId, setLandingPageId] = useState(defaultLandingPageId || "");
  const [casa, setCasa] = useState("");
  const [prioridade, setPrioridade] = useState<number>(10);
  const [advancedOpen, setAdvancedOpen] = useState(false);

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

  useEffect(() => {
    if (open && defaultLandingPageId && !landingPageId) setLandingPageId(defaultLandingPageId);
  }, [open, defaultLandingPageId, landingPageId]);

  useEffect(() => {
    if (mode === "offer") setGenericCta(OFFER_CTAS[0]);
    if (mode === "guide") setGenericCta(GUIDE_CTAS[0]);
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
      rawInput: raw,
      platforms,
      campaignSlug: campanhaSlug,
      forcedCategory: mode,
      channel: channelHint,
      itemSlug,
    });
  }, [raw, platforms, campanhaSlug, mode, channelHint, itemSlug]);

  // Auto-detect mode on first paste if user didn't override yet
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

  function reset() {
    setRaw(""); setCasa(""); setPrioridade(10); setAdvancedOpen(false);
    setEvento(""); setMercado(""); setOdd(""); setStartsAt(""); setEndsAt(""); setSportsCta(SPORTS_CTAS[1]);
    setGameName(""); setGameType(""); setProvider(""); setCasinoOffer(""); setCasinoBadge(CASINO_BADGES[0]); setCasinoCta(CASINO_CTAS[0]);
    setGenericTitle(""); setGenericSubtitle(""); setGenericCta(OFFER_CTAS[0]);
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
    };

    if (mode === "sports") {
      title = evento || detected.suggestedTitle;
      subtitle = mercado || detected.suggestedSubtitle;
      cta = sportsCta;
      badge = odd ? `Odd ${odd}` : "Odd em destaque";
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
        return "Link aponta para a própria LP — gera loop. Use o deep link da casa.";
      return "Link inválido ou vazio.";
    }
    if (active && !landingPageId) return "Selecione a landing page para publicar.";
    return null;
  }

  async function persist(active: boolean, sortOverride?: number) {
    const err = validate(active);
    if (err) { toast({ title: "Não foi possível salvar", description: err, variant: "destructive" }); return; }

    // Alertas leves (não bloqueiam)
    if (mode === "sports" && (!mercado || !odd)) {
      toast({ title: "Atenção", description: "Sports sem mercado/odd ainda pode ser publicado, mas perde força." });
    }
    if (mode === "casino" && !gameName) {
      toast({ title: "Atenção", description: "Cassino sem nome do jogo perde clareza no card." });
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
    navigator.clipboard.writeText(JSON.stringify({ mode, detected, finalUrl, score }, null, 2));
    toast({ title: "JSON copiado" });
  }

  const loop = detected ? isSelfLandingLoop(detected.rawInput) : false;
  const platformName = detected?.platform?.name || detected?.platform?.slug;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wand2 className="w-4 h-4 text-primary" /> Assistente de Oportunidade
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          {/* MODE TABS */}
          <Tabs value={mode} onValueChange={(v) => { setMode(v as Mode); setModeTouched(true); }}>
            <TabsList className="grid grid-cols-4 w-full">
              {MODES.map((m) => (
                <TabsTrigger key={m.value} value={m.value} className="gap-1.5">
                  <m.icon className="w-3.5 h-3.5" /> {m.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>

          {/* PASTE LINK */}
          <div>
            <Label>1. Cole o link oficial, shareCode ou ID</Label>
            <Textarea
              rows={2}
              value={raw}
              onChange={(e) => setRaw(e.target.value)}
              placeholder="https://casa.com/share/AB12CD  •  AB12CD  •  3489271"
              className="font-mono text-sm"
            />
            {loop && (
              <p className="text-xs text-destructive mt-1 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" /> Link aponta para a própria landing — bloqueado por segurança.
              </p>
            )}
            {publicNoTracking && (
              <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" /> Confirme se este link mantém afiliado/tracking antes de publicar.
              </p>
            )}
          </div>

          {/* DETECTION SUMMARY */}
          {detected && (
            <Card>
              <CardContent className="p-3 space-y-2">
                <div className="flex flex-wrap items-center gap-1.5 text-xs">
                  <Badge variant="secondary">{platformName || "Casa não detectada"}</Badge>
                  <Badge variant="outline">{MODES.find((m) => m.value === mode)?.label}</Badge>
                  {detected.shareCode && <Badge>shareCode: {detected.shareCode}</Badge>}
                  {detected.betId && <Badge>aposta: {detected.betId}</Badge>}
                  {detected.hasAffiliateTracking && <Badge variant="secondary">tracking preservado</Badge>}
                  {score && (
                    <Badge variant={score.score >= 70 ? "default" : score.score >= 40 ? "secondary" : "outline"}>
                      Recomendação {score.score}/100
                    </Badge>
                  )}
                </div>
                <div className="text-[11px] text-muted-foreground font-mono break-all p-2 rounded bg-muted">
                  {finalUrl || "—"}
                </div>
              </CardContent>
            </Card>
          )}

          {/* 2. Casa + LP */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <Label>2. Casa</Label>
              <Input value={casa || platformName || ""} onChange={(e) => setCasa(e.target.value)} placeholder="VUPI, EstrelaBet…" />
            </div>
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
          </div>

          {/* 3. CAMPOS PRINCIPAIS POR MODO */}
          {mode === "sports" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="md:col-span-2">
                <Label>3. Evento</Label>
                <Input value={evento} onChange={(e) => setEvento(e.target.value)} placeholder="Alemanha x Paraguai" />
              </div>
              <div>
                <Label>Mercado</Label>
                <Input value={mercado} onChange={(e) => setMercado(e.target.value)} placeholder="Favorito vence, +1.5 gols" />
              </div>
              <div>
                <Label>Odd</Label>
                <Input value={odd} onChange={(e) => setOdd(e.target.value)} placeholder="1.30" />
              </div>
              <div>
                <Label>Horário do jogo</Label>
                <Input type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} />
              </div>
              <div>
                <Label>CTA</Label>
                <Select value={sportsCta} onValueChange={setSportsCta}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{SPORTS_CTAS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
          )}

          {mode === "casino" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="md:col-span-2">
                <Label>3. Nome do jogo</Label>
                <Input value={gameName} onChange={(e) => setGameName(e.target.value)} placeholder="Fortune Tiger" />
              </div>
              <div>
                <Label>Tipo</Label>
                <Select value={gameType || "__"} onValueChange={(v) => setGameType(v === "__" ? "" : v)}>
                  <SelectTrigger><SelectValue placeholder="Slot, crash, roleta…" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__">—</SelectItem>
                    {CASINO_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Provedor (opcional)</Label>
                <Input value={provider} onChange={(e) => setProvider(e.target.value)} placeholder="Pragmatic, PG Soft, Evolution…" />
              </div>
              <div>
                <Label>Badge</Label>
                <Select value={casinoBadge} onValueChange={setCasinoBadge}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{CASINO_BADGES.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>CTA</Label>
                <Select value={casinoCta} onValueChange={setCasinoCta}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{CASINO_CTAS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="md:col-span-2">
                <Label>Oferta / benefício (opcional)</Label>
                <Input value={casinoOffer} onChange={(e) => setCasinoOffer(e.target.value)} placeholder="50 giros grátis, cashback semanal…" />
              </div>
            </div>
          )}

          {(mode === "offer" || mode === "guide") && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="md:col-span-2">
                <Label>3. Título</Label>
                <Input value={genericTitle} onChange={(e) => setGenericTitle(e.target.value)} placeholder={mode === "offer" ? "Bônus de boas-vindas" : "Como começar com responsabilidade"} />
              </div>
              <div className="md:col-span-2">
                <Label>Subtítulo</Label>
                <Input value={genericSubtitle} onChange={(e) => setGenericSubtitle(e.target.value)} placeholder="Resumo curto e claro" />
              </div>
              <div>
                <Label>CTA</Label>
                <Select value={genericCta} onValueChange={setGenericCta}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(mode === "offer" ? OFFER_CTAS : GUIDE_CTAS).map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Prioridade</Label>
                <Select value={String(prioridade)} onValueChange={(v) => setPrioridade(Number(v))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{PRIORITY_OPTS.map((p) => <SelectItem key={p.v} value={String(p.v)}>{p.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
          )}

          {/* ADVANCED */}
          <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-1">
                <ChevronDown className={`w-4 h-4 transition-transform ${advancedOpen ? "rotate-180" : ""}`} />
                Mais opções
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <Label>Campanha</Label>
                <Select value={campaignId || "__"} onValueChange={(v) => setCampaignId(v === "__" ? "" : v)}>
                  <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__">—</SelectItem>
                    {campanhas.map((c) => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              {mode !== "offer" && mode !== "guide" && (
                <div>
                  <Label>Prioridade</Label>
                  <Select value={String(prioridade)} onValueChange={(v) => setPrioridade(Number(v))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{PRIORITY_OPTS.map((p) => <SelectItem key={p.v} value={String(p.v)}>{p.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              )}
              <div>
                <Label>Início (vigência)</Label>
                <Input type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} />
              </div>
              <div>
                <Label>Fim (vigência)</Label>
                <Input type="datetime-local" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} />
              </div>
              {detected && (
                <div className="md:col-span-2 text-[11px] text-muted-foreground font-mono break-all">
                  utm_source={detected.utm_source} · utm_medium={detected.utm_medium} · utm_campaign={detected.utm_campaign} · utm_content={detected.utm_content}
                </div>
              )}
            </CollapsibleContent>
          </Collapsible>
        </div>

        <DialogFooter className="flex-wrap gap-2">
          <Button variant="ghost" size="sm" onClick={copyJson} disabled={!detected}>
            <Copy className="w-4 h-4" /> JSON
          </Button>
          <Button variant="outline" onClick={() => persist(false)} disabled={!detected || !finalUrl}>
            Salvar rascunho
          </Button>
          <Button variant="secondary" onClick={() => persist(true)} disabled={!detected || !finalUrl || !landingPageId}>
            <Send className="w-4 h-4" /> Publicar
          </Button>
          <Button onClick={() => persist(true, 20)} disabled={!detected || !finalUrl || !landingPageId}>
            <Sparkles className="w-4 h-4" /> Publicar como destaque
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
