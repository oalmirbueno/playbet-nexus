import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { ArrowUp, ArrowDown, RefreshCw, ExternalLink, Loader2, Wand2, Users, Sparkles, TrendingUp, Gift } from "lucide-react";
import { LP_MODE_LABELS, defaultLayoutConfig, type LpMode } from "@/lib/lpMode";
import GameArtwork from "@/components/tracking/GameArtwork";
import { suggestThreeOptions, computeOpportunityScore } from "@/lib/opportunityEngine";
import { buildPublicLpUrl } from "@/lib/trackingUrl";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  instanceId: string | null;
  publicUrl?: string | null;
}

type SectionDef = { id: string; label?: string; enabled: boolean };

const SECTION_LABELS: Record<string, string> = {
  hero: "Hero",
  features: "Ofertas oficiais (card)",
  games: "Jogos",
  odds: "Odds/Partidas",
  community: "Comunidade",
  cta: "CTA final",
  footer: "Rodapé",
};

const PRIMARY_MODE_OPTIONS: Array<{ value: LpMode; title: string; badge: string }> = [
  { value: "catalog", title: "LP padrão", badge: "normal" },
  { value: "single_game", title: "LP gerada", badge: "jogo único" },
];

interface SmartOdd {
  event_id?: string | null;
  event_name: string;
  market_name: string;
  odd_label?: string | null;
  badge?: string | null;
  starts_at?: string | null;
  score?: number;
  reason?: string;
}

interface CommunityCta {
  enabled: boolean;
  label: string;
  url: string;
  note?: string;
}

interface BonusOffer {
  enabled: boolean;
  title: string;
  code: string;
  note: string;
  cta_label: string;
}

function isBonusCategory(category: string | null | undefined): boolean {
  const cat = (category || "").toLowerCase();
  return ["bonus", "bônus", "promo", "oferta", "offer", "cupom", "codigo", "código"].includes(cat);
}

function ctaForMode(lpMode: LpMode, category: string | null | undefined, gameName?: string | null): string {
  if (lpMode === "catalog") return "Acessar oportunidades";
  if (lpMode === "odds") return "Apostar agora";
  if (isBonusCategory(category)) return "Resgatar bônus";
  if (lpMode === "multi_game") return "Ver jogos";
  return gameName ? `Jogar ${gameName}` : "Jogar agora";
}

function titleForMode(lpMode: LpMode, gameName?: string | null): string {
  if (lpMode === "catalog") return "Oportunidades PlayBet";
  if (lpMode === "odds") return "Odds do dia";
  if (lpMode === "multi_game") return "Jogos em alta";
  return gameName || "Oferta oficial";
}

function ensureCommunitySection(rawSections: SectionDef[]): SectionDef[] {
  if (rawSections.some((s) => s.id === "community")) return rawSections;
  const ctaIndex = rawSections.findIndex((s) => s.id === "cta");
  const insertAt = ctaIndex >= 0 ? ctaIndex : rawSections.length;
  return [
    ...rawSections.slice(0, insertAt),
    { id: "community", label: "Comunidade", enabled: true },
    ...rawSections.slice(insertAt),
  ];
}

function adaptiveSubtitle(mode: LpMode, gameName?: string | null, platformName?: string | null): string {
  if (mode === "odds")
    return "Melhores oportunidades de hoje.";
  if (mode === "single_game")
    return `Oferta ativa${gameName ? ` para ${gameName}` : ""}${platformName ? ` na ${platformName}` : ""}.`;
  if (mode === "multi_game")
    return "Jogos em alta com ofertas oficiais.";
  return "Acesso rápido às melhores oportunidades.";
}

export default function LpInstanceVisualEditor({ open, onOpenChange, instanceId, publicUrl }: Props) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [instance, setInstance] = useState<any>(null);
  const [link, setLink] = useState<any>(null);
  const [platformName, setPlatformName] = useState<string | null>(null);
  const [mode, setMode] = useState<LpMode>("catalog");
  const [sections, setSections] = useState<SectionDef[]>([]);
  const [copy, setCopy] = useState<{ title: string; subtitle: string; cta_label: string }>({
    title: "",
    subtitle: "",
    cta_label: "",
  });
  const [community, setCommunity] = useState<CommunityCta>({
    enabled: true,
    label: "",
    url: "",
    note: "",
  });
  const [bonusOffer, setBonusOffer] = useState<BonusOffer>({
    enabled: true,
    title: "",
    code: "",
    note: "",
    cta_label: "",
  });
  const [smartOdds, setSmartOdds] = useState<SmartOdd[]>([]);
  const [oddsCandidates, setOddsCandidates] = useState<SmartOdd[]>([]);
  const [pickingOdds, setPickingOdds] = useState(false);
  const [gameSlugs, setGameSlugs] = useState<string[]>([]);
  const [availableGames, setAvailableGames] = useState<any[]>([]);
  const [previewKey, setPreviewKey] = useState(0);
  const [basePage, setBasePage] = useState<{ name: string | null; domain: string | null; route: string | null; slug: string | null } | null>(null);
  const [previewTab, setPreviewTab] = useState<"generated" | "catalog">("generated");


  useEffect(() => {
    if (!open || !instanceId) return;
    (async () => {
      setLoading(true);
      try {
        const { data: inst } = await supabase
          .from("landing_page_instances")
          .select("*")
          .eq("id", instanceId)
          .maybeSingle();
        if (!inst) { toast({ title: "Instância não encontrada", variant: "destructive" }); return; }
        setInstance(inst);
        // Load the registered "LP padrão" (landing_pages) so we can preview it side by side.
        if ((inst as any).landing_page_id) {
          const { data: lp } = await supabase
            .from("landing_pages")
            .select("name, domain, route, slug")
            .eq("id", (inst as any).landing_page_id)
            .maybeSingle();
          if (lp) setBasePage({ name: (lp as any).name, domain: (lp as any).domain, route: (lp as any).route, slug: (lp as any).slug });
          else setBasePage(null);
        } else {
          setBasePage(null);
        }
        const m: LpMode = ((inst as any).lp_mode as LpMode) || "catalog";
        setMode(m);

        setGameSlugs(((inst as any).game_slugs as string[]) || []);
        const lc = (inst as any).layout_config;
        const rawSections: SectionDef[] = Array.isArray(lc?.sections) && lc.sections.length > 0
          ? lc.sections : defaultLayoutConfig(m).sections;
        setSections(ensureCommunitySection(rawSections));

        const hc = (inst as any).hype_copy || {};
        setCopy({
          title: hc.title || "",
          subtitle: hc.subtitle || "",
          cta_label: hc.cta_label || "",
        });
        setCommunity({
          enabled: hc.community_cta?.enabled ?? true,
          label: hc.community_cta?.label || "",
          url: hc.community_cta?.url || "",
          note: hc.community_cta?.note || "",
        });
        setBonusOffer({
          enabled: hc.bonus_offer?.enabled ?? true,
          title: hc.bonus_offer?.title || "",
          code: hc.bonus_offer?.code || "",
          note: hc.bonus_offer?.note || "",
          cta_label: hc.bonus_offer?.cta_label || "",
        });
        setSmartOdds(Array.isArray(hc.smart_odds) ? hc.smart_odds : []);

        // Load tracking link linked to this instance (source of truth for game/hype).
        // Prefer the live instance relation, but fall back to source_tracking_link_id
        // so already registered LPs keep working even if an older sync missed the FK.
        let { data: tl } = await supabase
          .from("tracking_links")
          .select("id, game_name, game_slug, game_icon_url, hype_reason, link_category, base_url, platform_account_id, platform_accounts(platform_id, platforms(name))")
          .eq("landing_page_instance_id", instanceId)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (!tl && (inst as any).source_tracking_link_id) {
          const { data: sourceTl } = await supabase
            .from("tracking_links")
            .select("id, game_name, game_slug, game_icon_url, hype_reason, link_category, base_url, platform_account_id, platform_accounts(platform_id, platforms(name))")
            .eq("id", (inst as any).source_tracking_link_id)
            .maybeSingle();
          tl = sourceTl;
        }
        setLink(tl);
        const platformId = (tl as any)?.platform_accounts?.platform_id;
        const pName = (tl as any)?.platform_accounts?.platforms?.name || null;
        setPlatformName(pName);

        // Adaptive auto-fill for empty copy fields
        const autoFlag = hc.auto !== false;
        if (tl) {
          const gname = (tl as any).game_name;
          const hype = (tl as any).hype_reason;
          const cat = (tl as any).link_category;
          setCopy(prev => ({
            title: prev.title || titleForMode(m, gname),
            subtitle: prev.subtitle || hype || adaptiveSubtitle(m, gname, pName),
            cta_label: prev.cta_label || ctaForMode(m, cat, gname),
          }));
          setCommunity(prev => ({
            enabled: prev.enabled,
            label: prev.label || (gname ? `Comunidade ${gname}` : "Comunidade PlayBet"),
            url: prev.url,
            note: prev.note,
          }));
          setBonusOffer(prev => ({
            enabled: prev.enabled,
            title: prev.title || (isBonusCategory(cat) ? `Bônus ${gname || "exclusivo"}` : "Oferta oficial"),
            code: prev.code,
            note: prev.note || "Use no cadastro.",
            cta_label: prev.cta_label || ctaForMode(m, cat, gname),
          }));
        }

        if (platformId) {
          const { data: games } = await supabase
            .from("platform_hyped_games")
            .select("id, game_slug, game_name, icon_url, priority")
            .eq("platform_id", platformId)
            .order("priority", { ascending: false });
          const merged = [...(games || [])];
          // Ensure the link's own game shows up (with its real icon) even if not hyped yet
          const lg = (tl as any)?.game_slug;
          const existingIdx = lg ? merged.findIndex(g => g.game_slug === lg) : -1;
          if (existingIdx >= 0) {
            merged[existingIdx] = {
              ...merged[existingIdx],
              game_name: merged[existingIdx].game_name || (tl as any).game_name || lg,
              icon_url: (tl as any).game_icon_url || merged[existingIdx].icon_url || null,
              priority: Math.max(Number(merged[existingIdx].priority || 0), 999),
            };
          } else if (lg) {
            merged.unshift({
              id: `link-${lg}`,
              game_slug: lg,
              game_name: (tl as any).game_name || lg,
              icon_url: (tl as any).game_icon_url || null,
              priority: 999,
            } as any);
          }
          setAvailableGames(merged);
        } else if ((tl as any)?.game_slug) {
          setAvailableGames([{
            id: `link-${(tl as any).game_slug}`,
            game_slug: (tl as any).game_slug,
            game_name: (tl as any).game_name || (tl as any).game_slug,
            icon_url: (tl as any).game_icon_url || null,
            priority: 999,
          }]);
        } else {
          setAvailableGames([]);
        }

        // If instance has no games yet but the link declares one, seed it automatically
        if ((!((inst as any).game_slugs) || ((inst as any).game_slugs as string[]).length === 0) && (tl as any)?.game_slug) {
          setGameSlugs([(tl as any).game_slug]);
        }


        // Load odds candidates when mode = odds
        if (m === "odds") {
          await loadOddsCandidates(platformId);
        }
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, instanceId]);

  const loadOddsCandidates = async (platformId?: string | null) => {
    setPickingOdds(true);
    try {
      const { data: events } = await supabase
        .from("lp_events")
        .select("id, sport, league, home_team, away_team, starts_at")
        .eq("is_active", true)
        .gte("starts_at", new Date().toISOString())
        .order("starts_at", { ascending: true })
        .limit(20);
      const evIds = (events || []).map(e => e.id);
      let sigsMap = new Map<string, any[]>();
      if (evIds.length) {
        const { data: sigs } = await supabase
          .from("lp_signals")
          .select("id, event_id, market_name, market_type, odd_label, confidence, source_name, source_channel, house_url, platform_id")
          .in("event_id", evIds)
          .eq("status", "novo");
        (sigs || []).forEach((s: any) => {
          if (!s.event_id) return;
          if (platformId && s.platform_id && s.platform_id !== platformId) return;
          const arr = sigsMap.get(s.event_id) || [];
          arr.push(s);
          sigsMap.set(s.event_id, arr);
        });
      }

      const scored: SmartOdd[] = [];
      (events || []).forEach((ev: any) => {
        const sigs = sigsMap.get(ev.id) || [];
        const options = suggestThreeOptions({ event: ev, signals: sigs as any });
        options.forEach(opt => {
          const score = computeOpportunityScore({
            market_type: opt.market_type,
            odd_label: opt.odd_label,
            platform_id: platformId || null,
            starts_at: ev.starts_at,
            signal_confidence: opt.signal_confidence,
            destination_url: "https://placeholder",
          });
          scored.push({
            event_id: ev.id,
            event_name: `${ev.home_team} × ${ev.away_team}`,
            market_name: opt.market_name || opt.title,
            odd_label: opt.odd_label || null,
            badge: opt.badge,
            starts_at: ev.starts_at,
            score,
            reason: opt.recommendation_reason,
          });
        });
      });
      // Best opportunities first: score desc, then odds numeric desc if present
      scored.sort((a, b) => {
        if ((b.score || 0) !== (a.score || 0)) return (b.score || 0) - (a.score || 0);
        const ao = parseFloat(a.odd_label || "0"); const bo = parseFloat(b.odd_label || "0");
        return bo - ao;
      });
      setOddsCandidates(scored.slice(0, 12));
    } finally {
      setPickingOdds(false);
    }
  };

  const move = (idx: number, dir: -1 | 1) => {
    setSections((prev) => {
      const next = [...prev];
      const j = idx + dir;
      if (j < 0 || j >= next.length) return next;
      [next[idx], next[j]] = [next[j], next[idx]];
      return next;
    });
  };

  const toggleSection = (idx: number, on: boolean) =>
    setSections((prev) => prev.map((s, i) => (i === idx ? { ...s, enabled: on } : s)));

  const toggleGame = (slug: string) =>
    setGameSlugs((prev) => (prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug]));

  const handleModeChange = (nextMode: LpMode) => {
    setMode(nextMode);
    if (nextMode === "odds" && oddsCandidates.length === 0) {
      loadOddsCandidates((link as any)?.platform_accounts?.platform_id);
    }

    const gname = link?.game_name;
    const nextCta = ctaForMode(nextMode, link?.link_category, gname);
    setSections(ensureCommunitySection(defaultLayoutConfig(nextMode).sections));
    setCopy((prev) => ({
      title: titleForMode(nextMode, gname),
      subtitle: adaptiveSubtitle(nextMode, gname, platformName),
      cta_label: nextCta,
    }));
    setBonusOffer((prev) => ({
      ...prev,
      title: nextMode === "catalog" ? prev.title : prev.title || (isBonusCategory(link?.link_category) ? `Bônus ${gname || "exclusivo"}` : "Oferta oficial"),
      cta_label: nextCta,
    }));

    if (nextMode === "single_game" && link?.game_slug) {
      setGameSlugs([link.game_slug]);
    }
  };

  const applyAdaptiveCopy = () => {
    const gname = link?.game_name;
    setCopy({
      title: titleForMode(mode, gname) || copy.title || "",
      subtitle: link?.hype_reason || adaptiveSubtitle(mode, gname, platformName),
      cta_label: ctaForMode(mode, link?.link_category, gname),
    });
    setCommunity(prev => ({
      ...prev,
      label: gname ? `Comunidade ${gname}` : "Comunidade PlayBet",
      note: prev.note,
    }));
    setBonusOffer(prev => ({
      ...prev,
      title: isBonusCategory(link?.link_category) ? `Bônus ${gname || "exclusivo"}` : "Oferta oficial",
      note: prev.note || "Use no cadastro.",
      cta_label: ctaForMode(mode, link?.link_category, gname),
    }));
    toast({ title: "Copy aplicada" });
  };

  const pickTopOdds = (n = 3) => {
    setSmartOdds(oddsCandidates.slice(0, n));
    toast({ title: `Top ${n} odds inteligentes selecionadas`, description: "Curadoria por score + proximidade + confiança do sinal." });
  };

  const toggleOdd = (o: SmartOdd) => {
    setSmartOdds(prev => {
      const key = `${o.event_id}|${o.market_name}`;
      const exists = prev.some(p => `${p.event_id}|${p.market_name}` === key);
      return exists ? prev.filter(p => `${p.event_id}|${p.market_name}` !== key) : [...prev, o];
    });
  };

  const handleSave = async () => {
    if (!instanceId) return;
    setSaving(true);
    try {
      const layoutConfig = { mode, sections, updated_at: new Date().toISOString() };
      const hype_copy: any = {
        title: copy.title || null,
        subtitle: copy.subtitle || null,
        cta_label: copy.cta_label || ctaForMode(mode, link?.link_category, link?.game_name) || null,
        community_cta: {
          enabled: community.enabled,
          label: community.label || null,
          url: community.url || null,
          note: community.note || null,
        },
        bonus_offer: {
          enabled: bonusOffer.enabled,
          title: bonusOffer.title || null,
          code: bonusOffer.code || null,
          note: bonusOffer.note || null,
          cta_label: bonusOffer.cta_label || copy.cta_label || ctaForMode(mode, link?.link_category, link?.game_name) || null,
        },
        game_slug: link?.game_slug || gameSlugs[0] || null,
        game_name: link?.game_name || availableGames.find((g: any) => g.game_slug === gameSlugs[0])?.game_name || null,
        game_icon_url: link?.game_icon_url || availableGames.find((g: any) => g.game_slug === gameSlugs[0])?.icon_url || null,
        category: link?.link_category || null,
        auto: false,
      };
      if (mode === "odds" && smartOdds.length) hype_copy.smart_odds = smartOdds;

      const { error } = await supabase
        .from("landing_page_instances")
        .update({
          lp_mode: mode,
          game_slugs: gameSlugs,
          layout_config: layoutConfig,
          hype_copy,
        } as any)
        .eq("id", instanceId);
      if (error) throw new Error(error.message);

      // Keep the already registered LP instance and only refresh the public share URLs
      // of tracking links that point to it. This preserves the LP base/domain and
      // avoids creating or "eliminating" the page when switching between modes.
      let lpDomain: string | null = null;
      if (instance?.landing_page_id) {
        const { data: lp } = await supabase
          .from("landing_pages")
          .select("domain")
          .eq("id", instance.landing_page_id)
          .maybeSingle();
        lpDomain = (lp as any)?.domain || null;
      }

      const { data: linkedTrackingLinks } = await supabase
        .from("tracking_links")
        .select("id, influencer_id, campanha_id")
        .eq("landing_page_instance_id", instanceId);

      let linksToSync = ((linkedTrackingLinks || []) as any[]);
      if (!linksToSync.length && instance?.source_tracking_link_id) {
        const { data: sourceTl } = await supabase
          .from("tracking_links")
          .select("id, influencer_id, campanha_id")
          .eq("id", instance.source_tracking_link_id)
          .maybeSingle();
        if (sourceTl) linksToSync = [sourceTl as any];
      }

      const shareUrls = linksToSync
        .map((tl) => buildPublicLpUrl(
          lpDomain,
          instance?.slug,
          tl.influencer_id || instance?.influencer_id || "",
          tl.campanha_id || "",
        ))
        .filter(Boolean);

      await Promise.all(
        linksToSync.map((tl, idx) => supabase
          .from("tracking_links")
          .update({
            landing_page_id: instance?.landing_page_id || null,
            landing_page_instance_id: instanceId,
            final_url: shareUrls[idx] || null,
            use_lp: true,
            lp_auto_generated: true,
          } as any)
          .eq("id", tl.id)),
      );

      const publicShareUrl = shareUrls[0] || buildPublicLpUrl(lpDomain, instance?.slug, instance?.influencer_id || "", "") || publicUrl || "";
      if (publicShareUrl) {
        try { await navigator.clipboard.writeText(publicShareUrl); } catch {}
      }

      setInstance((prev: any) => prev ? {
        ...prev,
        lp_mode: mode,
        game_slugs: gameSlugs,
        layout_config: layoutConfig,
        hype_copy,
      } : prev);

      toast({
        title: "LP salva",
        description: publicShareUrl ? "Página preservada e link de divulgação atualizado." : "Página preservada e preview atualizado.",
      });
      setPreviewKey((k) => k + 1);
    } catch (e: any) {
      toast({ title: "Erro ao salvar", description: e?.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const previewSrc = useMemo(() => {
    // Prefer a same-origin preview so we always render the LATEST code and our thin scrollbars apply.
    // Extract the LP slug from the public URL (?ref=slug) and load the local /i/:slug route.
    let localSlug: string | null = null;
    if (publicUrl) {
      try {
        const u = new URL(publicUrl, window.location.origin);
        localSlug = u.searchParams.get("ref");
        if (!localSlug) {
          const m = u.pathname.match(/\/i\/([^/?#]+)/);
          if (m) localSlug = m[1];
        }
      } catch {
        const m = publicUrl.match(/[?&]ref=([^&]+)/);
        if (m) localSlug = decodeURIComponent(m[1]);
      }
    }
    if (localSlug) {
      return `${window.location.origin}/i/${localSlug}?_preview=${previewKey}`;
    }
    if (!publicUrl) return null;
    const sep = publicUrl.includes("?") ? "&" : "?";
    return `${publicUrl}${sep}_preview=${previewKey}`;
  }, [publicUrl, previewKey]);


  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl h-[90vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-5 pb-3 border-b shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Wand2 size={16} className="text-primary" />
            Editor visual da LP
            {link?.game_name && (
              <Badge variant="outline" className="text-[10px] font-normal ml-1">
                {link.game_name}{platformName ? ` · ${platformName}` : ""}
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-[380px_1fr] overflow-hidden">
          <div className="overflow-y-auto border-r px-5 py-4 space-y-5">
            {loading ? (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 size={12} className="animate-spin" /> Carregando…
              </div>
            ) : (
              <>
                <div>
                  <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Modo da LP</Label>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    {PRIMARY_MODE_OPTIONS.map((opt) => {
                      const active = mode === opt.value;
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => handleModeChange(opt.value)}
                          className={`rounded-md border px-3 py-2 text-left transition ${active ? "border-primary bg-primary/10 text-foreground" : "border-border/60 bg-background/40 text-muted-foreground hover:border-primary/40 hover:text-foreground"}`}
                        >
                          <span className="block text-xs font-semibold leading-tight">{opt.title}</span>
                          <span className="block text-[10px] leading-tight opacity-75 mt-0.5">{opt.badge}</span>
                        </button>
                      );
                    })}
                  </div>
                  <Select value={mode} onValueChange={(v) => handleModeChange(v as LpMode)}>
                    <SelectTrigger className="h-9 text-xs mt-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.keys(LP_MODE_LABELS) as LpMode[]).map((k) => (
                        <SelectItem key={k} value={k}>{LP_MODE_LABELS[k]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Copy</Label>
                    {link && (
                      <button
                        type="button"
                        onClick={applyAdaptiveCopy}
                        className="text-[10px] inline-flex items-center gap-1 text-primary hover:underline"
                        title="Preencher a partir do jogo/categoria do link"
                      >
                        <Sparkles size={10} /> Auto do link
                      </button>
                    )}
                  </div>
                  <Input
                    className="h-8 text-xs"
                    placeholder="Título (jogo ou headline)"
                    value={copy.title}
                    onChange={(e) => setCopy({ ...copy, title: e.target.value })}
                  />
                  <Input
                    className="h-8 text-xs mt-1"
                    placeholder="Subtítulo / motivo do hype"
                    value={copy.subtitle}
                    onChange={(e) => setCopy({ ...copy, subtitle: e.target.value })}
                  />
                  <Input
                    className="h-8 text-xs mt-1"
                    placeholder="Rótulo do CTA"
                    value={copy.cta_label}
                    onChange={(e) => setCopy({ ...copy, cta_label: e.target.value })}
                  />
                </div>

                {/* Bonus */}
                <div className="rounded-md border border-border/60 bg-secondary/20 p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <Gift size={13} className="text-primary" />
                    <Label className="text-[10px] uppercase tracking-wider text-muted-foreground flex-1">
                      Bônus / código
                    </Label>
                    <Switch checked={bonusOffer.enabled} onCheckedChange={(v) => setBonusOffer({ ...bonusOffer, enabled: v })} />
                  </div>
                  <Input
                    className="h-8 text-xs"
                    placeholder="Oferta (ex: Bônus de boas-vindas)"
                    value={bonusOffer.title}
                    onChange={(e) => setBonusOffer({ ...bonusOffer, title: e.target.value })}
                    disabled={!bonusOffer.enabled}
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      className="h-8 text-xs uppercase"
                      placeholder="Código"
                      value={bonusOffer.code}
                      onChange={(e) => setBonusOffer({ ...bonusOffer, code: e.target.value.toUpperCase() })}
                      disabled={!bonusOffer.enabled}
                    />
                    <Input
                      className="h-8 text-xs"
                      placeholder="Botão"
                      value={bonusOffer.cta_label}
                      onChange={(e) => setBonusOffer({ ...bonusOffer, cta_label: e.target.value })}
                      disabled={!bonusOffer.enabled}
                    />
                  </div>
                  <Input
                    className="h-8 text-xs"
                    placeholder="Nota curta"
                    value={bonusOffer.note}
                    onChange={(e) => setBonusOffer({ ...bonusOffer, note: e.target.value })}
                    disabled={!bonusOffer.enabled}
                  />
                </div>

                {/* Community CTA */}
                <div className="rounded-md border border-border/60 bg-secondary/20 p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <Users size={13} className="text-primary" />
                    <Label className="text-[10px] uppercase tracking-wider text-muted-foreground flex-1">
                      Acesso à comunidade
                    </Label>
                    <Switch checked={community.enabled} onCheckedChange={(v) => setCommunity({ ...community, enabled: v })} />
                  </div>
                  <Input
                    className="h-8 text-xs"
                    placeholder="Rótulo (ex: Entrar na comunidade de Fortune Tiger)"
                    value={community.label}
                    onChange={(e) => setCommunity({ ...community, label: e.target.value })}
                    disabled={!community.enabled}
                  />
                  <Input
                    className="h-8 text-xs"
                    placeholder="Link do grupo (WhatsApp, Telegram, Discord)"
                    value={community.url}
                    onChange={(e) => setCommunity({ ...community, url: e.target.value })}
                    disabled={!community.enabled}
                  />
                  <Input
                    className="h-8 text-xs"
                    placeholder="Nota curta (opcional)"
                    value={community.note}
                    onChange={(e) => setCommunity({ ...community, note: e.target.value })}
                    disabled={!community.enabled}
                  />
                </div>

                {/* Smart Odds */}
                {mode === "odds" && (
                  <div className="rounded-md border border-border/60 bg-secondary/20 p-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <TrendingUp size={13} className="text-primary" />
                      <Label className="text-[10px] uppercase tracking-wider text-muted-foreground flex-1">
                        Odds inteligentes
                      </Label>
                      <button
                        type="button"
                        onClick={() => loadOddsCandidates((link as any)?.platform_accounts?.platform_id)}
                        className="text-[10px] text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
                      >
                        <RefreshCw size={10} className={pickingOdds ? "animate-spin" : ""} /> Atualizar
                      </button>
                    </div>
                    <p className="text-[10px] text-muted-foreground leading-relaxed">
                      Ranqueadas por score de curadoria PlayBet (mercado simples, proximidade, confiança de sinal, odd em destaque).
                    </p>
                    <div className="flex gap-1.5">
                      <Button size="sm" variant="secondary" className="h-7 text-[10px] flex-1"
                        onClick={() => pickTopOdds(3)} disabled={!oddsCandidates.length}>
                        <Sparkles className="w-3 h-3" /> Top 3 automático
                      </Button>
                      <Button size="sm" variant="ghost" className="h-7 text-[10px]" onClick={() => setSmartOdds([])}>
                        Limpar
                      </Button>
                    </div>
                    <div className="max-h-56 overflow-y-auto space-y-1 pr-1">
                      {pickingOdds && oddsCandidates.length === 0 ? (
                        <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                          <Loader2 size={10} className="animate-spin" /> Analisando eventos e sinais…
                        </div>
                      ) : oddsCandidates.length === 0 ? (
                        <div className="text-[10px] text-muted-foreground">
                          Nenhum evento futuro cadastrado. Cadastre em <strong>Oportunidades LP → Eventos Sports</strong>.
                        </div>
                      ) : (
                        oddsCandidates.map((o) => {
                          const key = `${o.event_id}|${o.market_name}`;
                          const picked = smartOdds.some(p => `${p.event_id}|${p.market_name}` === key);
                          return (
                            <button
                              key={key}
                              type="button"
                              onClick={() => toggleOdd(o)}
                              className={`w-full text-left rounded border p-2 transition ${picked ? "border-primary bg-primary/10" : "border-border/50 bg-background/40 hover:border-primary/40"}`}
                            >
                              <div className="flex items-center justify-between gap-2 mb-0.5">
                                <span className="text-[11px] font-medium truncate">{o.event_name}</span>
                                <Badge variant="outline" className="text-[9px] shrink-0">{o.score}</Badge>
                              </div>
                              <div className="flex items-center justify-between gap-2 text-[10px] text-muted-foreground">
                                <span className="truncate">{o.market_name}</span>
                                {o.odd_label && <span className="text-emerald-500 font-semibold">{o.odd_label}</span>}
                              </div>
                              {o.badge && <span className="text-[9px] text-primary/80">{o.badge}</span>}
                            </button>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}

                <div>
                  <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Seções</Label>
                  <div className="space-y-1 mt-1">
                    {sections.map((s, i) => (
                      <div key={s.id} className="flex items-center gap-2 rounded border border-border/60 bg-background/40 px-2 py-1.5">
                        <span className="text-xs flex-1">{s.label || SECTION_LABELS[s.id] || s.id}</span>
                        <button type="button" onClick={() => move(i, -1)} disabled={i === 0} className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-30" title="Subir"><ArrowUp size={11} /></button>
                        <button type="button" onClick={() => move(i, 1)} disabled={i === sections.length - 1} className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-30" title="Descer"><ArrowDown size={11} /></button>
                        <Switch checked={s.enabled} onCheckedChange={(v) => toggleSection(i, v)} />
                      </div>
                    ))}
                  </div>
                </div>

                {availableGames.length > 0 && (
                  <div>
                    <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      Jogos exibidos ({gameSlugs.length})
                    </Label>
                    <div className="invisible-scroll flex gap-1.5 overflow-x-auto pb-1 mt-1">
                      {availableGames.map((g: any) => {
                        const on = gameSlugs.includes(g.game_slug);
                        return (
                          <button
                            key={g.id}
                            type="button"
                            onClick={() => toggleGame(g.game_slug)}
                            className={`shrink-0 w-[72px] rounded-md border p-1.5 text-center transition ${on ? "border-primary bg-primary/10" : "border-border/50 bg-background/50 hover:border-primary/40"}`}
                            title={g.game_name}
                          >
                            <div className="flex justify-center mb-1">
                              <GameArtwork slug={g.game_slug} name={g.game_name} iconUrl={g.icon_url} size="md" />
                            </div>
                            <span className="block text-[9px] font-medium leading-tight truncate">{g.game_name}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          <div className="flex flex-col overflow-hidden bg-secondary/20">
            <div className="flex items-center justify-between px-4 py-2 border-b bg-background/60 shrink-0">
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Preview</span>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setPreviewKey((k) => k + 1)}
                  className="text-[10px] text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
                  title="Recarregar"
                >
                  <RefreshCw size={11} /> Reload
                </button>
                {publicUrl && (
                  <a
                    href={publicUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[10px] text-primary hover:underline inline-flex items-center gap-1"
                  >
                    Abrir <ExternalLink size={10} />
                  </a>
                )}
              </div>
            </div>
            <div className="flex-1 min-h-0">
              {previewSrc ? (
              <iframe
                  key={previewKey}
                  src={previewSrc}
                  className="w-full h-full border-0 bg-background [color-scheme:dark]"
                  title="LP preview"
                  onLoad={(event) => {
                    try {
                      const doc = event.currentTarget.contentDocument;
                      if (!doc || doc.getElementById("lp-preview-scrollbar-style")) return;
                      const style = doc.createElement("style");
                      style.id = "lp-preview-scrollbar-style";
                      style.textContent = `
                        html, body { background: #0a0a0f !important; color-scheme: dark !important; scrollbar-width: thin !important; scrollbar-color: rgba(16,185,129,.5) transparent !important; }
                        ::-webkit-scrollbar { width: 4px !important; height: 4px !important; background: transparent !important; }
                        ::-webkit-scrollbar-track, ::-webkit-scrollbar-track-piece { background: transparent !important; border: 0 !important; box-shadow: none !important; }
                        ::-webkit-scrollbar-thumb { background: rgba(16,185,129,.48) !important; border-radius: 999px !important; border: 0 !important; box-shadow: none !important; min-height: 40px !important; }
                        ::-webkit-scrollbar-button, ::-webkit-scrollbar-corner { width: 0 !important; height: 0 !important; display: none !important; background: transparent !important; }
                      `;
                      doc.head.appendChild(style);
                    } catch {
                      // External previews may block access; same-origin previews receive the injected style.
                    }
                  }}
                />
              ) : (
                <div className="h-full flex items-center justify-center text-[11px] text-muted-foreground">
                  Configure o domínio da LP para ver o preview.
                </div>
              )}
            </div>
          </div>
        </div>

        <DialogFooter className="px-6 py-3 border-t shrink-0">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Fechar</Button>
          <Button onClick={handleSave} disabled={saving || loading}>
            {saving ? "Salvando…" : "Salvar LP"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
