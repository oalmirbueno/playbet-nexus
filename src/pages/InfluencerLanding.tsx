import { useEffect, useState, useCallback } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { ArrowRight, Zap, Gift, Users, Copy } from "lucide-react";
import logo from "@/assets/logo.png";

type LoadState = "loading" | "ready" | "not_found" | "inactive" | "no_domain";

interface ResolvedLanding {
  affiliate_link: string;
  influencer_id: string;
  campanha_id: string | null;
  influencer_name: string;
  instance_id: string | null;
  landing_page_id: string | null;
  tracking_link_id: string | null;
  click_id: string;
  click_id_param: string; // e.g. "sub1"
}

/** Generate a unique click_id for attribution */
function generateClickId(): string {
  const ts = Date.now().toString(36);
  const rand = Math.random().toString(36).substring(2, 10);
  return `clk_${ts}_${rand}`;
}

function getOrCreatePageClickId(slug?: string | null): string {
  const key = `playbet_lp_click_id:${slug || "default"}`;
  try {
    const existing = window.sessionStorage.getItem(key);
    if (existing) return existing;
    const next = generateClickId();
    window.sessionStorage.setItem(key, next);
    return next;
  } catch {
    return generateClickId();
  }
}

function shouldSendLpView(slug?: string | null, clickId?: string | null): boolean {
  if (!slug || !clickId || isInternalPreviewContext()) return false;
  const key = `playbet_lp_view_sent:${slug}:${clickId}`;
  try {
    if (window.sessionStorage.getItem(key)) return false;
    window.sessionStorage.setItem(key, "1");
    return true;
  } catch {
    return true;
  }
}

/** Append click_id (sub1) to the affiliate URL */
function injectClickId(url: string, paramName: string, clickId: string): string {
  try {
    const u = new URL(url);
    u.searchParams.set(paramName, clickId);
    return u.toString();
  } catch {
    // If URL parsing fails, try simple append
    const sep = url.includes("?") ? "&" : "?";
    return `${url}${sep}${paramName}=${clickId}`;
  }
}

async function findLPBaseByHostname(hostname: string) {
  const { data: lps } = await supabase
    .from("landing_pages")
    .select("id, domain, name")
    .eq("is_active", true);

  if (!lps || lps.length === 0) return null;

  const normalizedHost = hostname.split(":")[0].toLowerCase();

  for (const lp of lps) {
    if (!lp.domain) continue;
    try {
      const domainHost = lp.domain.replace(/^https?:\/\//, "").replace(/\/+$/, "").toLowerCase();
      if (domainHost === normalizedHost) return lp;
    } catch {
      continue;
    }
  }

  return null;
}

/** Find tracking_link for a given instance or influencer (any status; prefer active) */
async function findTrackingLink(instanceId: string | null, influencerId: string) {
  if (instanceId) {
    const { data } = await supabase
      .from("tracking_links")
      .select("id, click_id_param_name, base_url, short_url, final_url, campanha_id, status")
      .eq("landing_page_instance_id", instanceId)
      .order("status", { ascending: true }) // active < paused alphabetically
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (data) return data;
  }

  const { data } = await supabase
    .from("tracking_links")
    .select("id, click_id_param_name, base_url, short_url, final_url, campanha_id, status")
    .eq("influencer_id", influencerId)
    .order("status", { ascending: true })
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return data || null;
}

function isPublicLpLoop(url: string | null | undefined, hostname: string, slug?: string | null): boolean {
  if (!url) return false;
  try {
    const u = new URL(url, window.location.origin);
    const host = u.hostname.toLowerCase();
    const currentHost = hostname.split(":")[0].toLowerCase();
    const isLpHost = host === currentHost || host.includes("oportunidades.playbet");
    if (!isLpHost) return false;
    const ref = u.searchParams.get("ref");
    const isInstanceRoute = u.pathname.startsWith("/i/");
    return Boolean(ref || isInstanceRoute || (slug && url.includes(slug)));
  } catch {
    return false;
  }
}

/** Fallback: get the tracked affiliate destination from the bound opportunity. */
async function findOpportunityDestination(instanceId: string | null, landingPageId: string | null, trackingLinkId?: string | null) {
  if (trackingLinkId) {
    const { data } = await supabase
      .from("lp_opportunities")
      .select("destination_url")
      .eq("tracking_link_id", trackingLinkId)
      .eq("is_active", true)
      .not("destination_url", "is", null)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (data?.destination_url) return data.destination_url;
  }
  if (!landingPageId && !instanceId) return null;
  const query = supabase
    .from("lp_opportunities")
    .select("destination_url")
    .eq("is_active", true)
    .not("destination_url", "is", null)
    .order("sort_order", { ascending: false })
    .limit(1);
  const { data } = landingPageId
    ? await query.eq("landing_page_id", landingPageId).maybeSingle()
    : await query.maybeSingle();
  return data?.destination_url || null;
}

interface InstanceContext {
  lp_mode?: string | null;
  game_slugs?: string[] | null;
  layout_config?: any;
  hype_copy?: any;
}

interface GameArt {
  slug: string;
  name: string;
  icon_url: string | null;
}

const SUPABASE_URL = (import.meta as unknown as { env?: Record<string, string> }).env?.VITE_SUPABASE_URL ?? "";

function proxiedImageUrl(url?: string | null) {
  if (!url) return null;
  if (url.startsWith("data:") || url.startsWith("blob:") || url.startsWith("/")) return url;
  if (!SUPABASE_URL) return url;
  return `${SUPABASE_URL}/functions/v1/image-proxy?url=${encodeURIComponent(url)}`;
}

function normalizeSlug(value?: string | null) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function compactUnique(values: Array<string | null | undefined>) {
  return Array.from(new Set(values.map(normalizeSlug).filter(Boolean)));
}

function isInternalPreviewContext(): boolean {
  const host = window.location.hostname.toLowerCase();
  const referrer = document.referrer.toLowerCase();
  const isEmbeddedPreview = (() => {
    try {
      return window.self !== window.top;
    } catch {
      return true;
    }
  })();
  return (
    isEmbeddedPreview ||
    host === "localhost" ||
    host === "127.0.0.1" ||
    host.startsWith("id-preview--") ||
    referrer.includes("/lp-opportunities") ||
    referrer.includes("/lp-instancias") ||
    referrer.includes("/landing-pages") ||
    referrer.includes("__lovable_") ||
    searchParamsPreview()
  );
}

function searchParamsPreview(): boolean {
  try {
    return new URLSearchParams(window.location.search).has("_preview");
  } catch {
    return false;
  }
}

function GameImage({
  art,
  className,
  fallbackClassName,
  iconSize = 22,
}: {
  art?: GameArt | null;
  className: string;
  fallbackClassName: string;
  iconSize?: number;
}) {
  const [src, setSrc] = useState(() => proxiedImageUrl(art?.icon_url) || art?.icon_url || null);
  const [failedProxy, setFailedProxy] = useState(false);

  useEffect(() => {
    setSrc(proxiedImageUrl(art?.icon_url) || art?.icon_url || null);
    setFailedProxy(false);
  }, [art?.icon_url]);

  if (src) {
    return (
      <img
        src={src}
        alt={art?.name || "Jogo"}
        className={className}
        loading="lazy"
        onError={() => {
          if (!failedProxy && art?.icon_url && art.icon_url !== src) {
            setFailedProxy(true);
            setSrc(art.icon_url);
            return;
          }
          setSrc(null);
        }}
      />
    );
  }

  return (
    <div className={fallbackClassName} role="img" aria-label={art?.name || "Jogo sem imagem"}>
      <Gift size={iconSize} className="text-emerald-400" />
    </div>
  );
}

export default function InfluencerLanding() {
  const { slug: pathSlug } = useParams<{ slug: string }>();
  const [searchParams] = useSearchParams();
  const slug = searchParams.get("ref") || pathSlug;
  const [state, setState] = useState<LoadState>("loading");
  const [resolved, setResolved] = useState<ResolvedLanding | null>(null);
  const [instanceCtx, setInstanceCtx] = useState<InstanceContext | null>(null);
  const [gameArts, setGameArts] = useState<GameArt[]>([]);
  const [clicking, setClicking] = useState(false);

  useEffect(() => {
    const id = "lp-public-scrollbar-style";
    if (document.getElementById(id)) return;
    const style = document.createElement("style");
    style.id = id;
    style.textContent = `
      html, body { background: #0a0a0f !important; color-scheme: dark !important; scrollbar-width: thin !important; scrollbar-color: rgba(16,185,129,.5) transparent !important; }
      ::-webkit-scrollbar { width: 4px !important; height: 4px !important; background: transparent !important; }
      ::-webkit-scrollbar-track, ::-webkit-scrollbar-track-piece { background: transparent !important; border: 0 !important; box-shadow: none !important; }
      ::-webkit-scrollbar-thumb { background: rgba(16,185,129,.48) !important; border-radius: 999px !important; border: 0 !important; box-shadow: none !important; min-height: 40px !important; }
      ::-webkit-scrollbar-button, ::-webkit-scrollbar-corner { width: 0 !important; height: 0 !important; display: none !important; background: transparent !important; }
    `;
    document.head.appendChild(style);
  }, []);

  useEffect(() => {
    if (!slug) { setState("not_found"); return; }

    const hydrateGameArts = async (
      landingPageId: string | null,
      instanceId: string | null,
      slugs: string[],
      fallback?: { game_slug?: string | null; game_name?: string | null; game_icon_url?: string | null; source_tracking_link_id?: string | null },
    ) => {
      // Always prefer the LP source link; old instances can have several links and the first one may not carry artwork.
      let tl: any = null;
      if (fallback?.source_tracking_link_id) {
        const { data } = await supabase
          .from("tracking_links")
          .select("game_slug, game_name, game_icon_url, platform_account_id, platform_accounts(platform_id)")
          .eq("id", fallback.source_tracking_link_id)
          .maybeSingle();
        tl = data;
      }

      if (!tl) {
        let tlQuery = supabase
        .from("tracking_links")
        .select("game_slug, game_name, game_icon_url, platform_account_id, platform_accounts(platform_id)");
        tlQuery = instanceId ? tlQuery.eq("landing_page_instance_id", instanceId) : tlQuery.eq("landing_page_id", landingPageId ?? "");
        const { data } = await tlQuery.order("updated_at", { ascending: false }).limit(1).maybeSingle();
        tl = data;
      }

      const fallbackSlug = normalizeSlug(fallback?.game_slug || tl?.game_slug);
      const fallbackName = fallback?.game_name || tl?.game_name || fallbackSlug;
      const fallbackIcon = fallback?.game_icon_url || tl?.game_icon_url || null;
      const effectiveSlugs = compactUnique([...(slugs || []), fallbackSlug]);
      const linkIcon: GameArt | null = fallbackSlug
        ? { slug: fallbackSlug, name: fallbackName || fallbackSlug, icon_url: fallbackIcon }
        : null;
      const platformId: string | null = tl?.platform_accounts?.platform_id ?? null;

      if (effectiveSlugs.length === 0) {
        setGameArts([]);
        return;
      }

      let catalog: any[] = [];
      const baseQuery = supabase
        .from("platform_hyped_games")
        .select("game_slug, game_name, icon_url, platform_id")
        .in("game_slug", effectiveSlugs);
      const { data } = platformId ? await baseQuery.eq("platform_id", platformId) : await baseQuery;
      catalog = data ?? [];

      // If the platform-specific catalog has no image yet, reuse any official asset already known for this game slug.
      const missingIcon = effectiveSlugs.some((slug) => !catalog.some((g: any) => g.game_slug === slug && g.icon_url));
      if (missingIcon) {
        const { data: globalCatalog } = await supabase
          .from("platform_hyped_games")
          .select("game_slug, game_name, icon_url, platform_id")
          .in("game_slug", effectiveSlugs)
          .not("icon_url", "is", null);
        catalog = [...catalog, ...(globalCatalog ?? [])];
      }

      const byName = new Map<string, GameArt>();
      catalog.forEach((g: any) => {
        const key = normalizeSlug(g.game_slug);
        const current = byName.get(key);
        if (!current || (!current.icon_url && g.icon_url)) {
          byName.set(key, { slug: key, name: g.game_name || key.replace(/-/g, " "), icon_url: g.icon_url });
        }
      });
      // Prefer the link's selected official asset for its game; fallback to the platform catalog for the rest.
      if (linkIcon) {
        const catalogIcon = byName.get(linkIcon.slug);
        byName.set(linkIcon.slug, {
          ...(catalogIcon || {}),
          ...linkIcon,
          icon_url: linkIcon.icon_url || catalogIcon?.icon_url || null,
        });
      }
      const arts = effectiveSlugs.map((s) => byName.get(s) ?? { slug: s, name: s.replace(/-/g, " "), icon_url: null });
      setGameArts(arts);
    };



    if (!slug) { setState("not_found"); return; }

    (async () => {
      const hostname = window.location.hostname;
      const clickId = getOrCreatePageClickId(slug);

      // Helper to finalize resolution
      const finalize = async (
        affiliateLink: string,
        influencerId: string,
        influencerName: string,
        instanceId: string | null,
        landingPageId: string | null,
      ) => {
        const tl = await findTrackingLink(instanceId, influencerId);
        const paramName = tl?.click_id_param_name || "sub1";
        const fallbackOpportunity = await findOpportunityDestination(instanceId, landingPageId, tl?.id || null);
        const outboundAffiliate = [
          affiliateLink,
          (tl as any)?.base_url,
          (tl as any)?.short_url,
          fallbackOpportunity,
          (tl as any)?.final_url,
        ].find((url) => url && !isPublicLpLoop(url, hostname, slug)) || "";

        setResolved({
          affiliate_link: outboundAffiliate,
          influencer_id: influencerId,
          campanha_id: tl?.campanha_id || searchParams.get("sub3"),
          influencer_name: influencerName,
          instance_id: instanceId,
          landing_page_id: landingPageId,
          tracking_link_id: tl?.id || null,
          click_id: clickId,
          click_id_param: paramName,
        });
        setState("ready");

        // Register real public LP views only. Admin/editor previews must never
        // inflate production tracking.
        if (shouldSendLpView(slug, clickId)) {
          supabase.from("tracking_events").insert({
            canonical_event_name: "lp_view",
            raw_event_name: "lp_view",
            click_id: clickId,
            influencer_id: influencerId,
            landing_page_id: landingPageId,
            landing_page_instance_id: instanceId,
            tracking_link_id: tl?.id || null,
            source_type: "landing_page",
            event_timestamp: new Date().toISOString(),
            raw_payload: {
              slug,
              hostname,
              sub2: searchParams.get("sub2"),
              sub3: searchParams.get("sub3"),
              user_agent: navigator.userAgent,
              referrer: document.referrer || null,
            },
          }).then(() => {});
        }

      };

      // ── STRATEGY 1: Domain-aware ──
      const lpBase = await findLPBaseByHostname(hostname);

      if (lpBase) {
        const { data: instance } = await supabase
          .from("landing_page_instances")
          .select("*")
          .eq("slug", slug)
          .eq("landing_page_id", lpBase.id)
          .maybeSingle();

        if (!instance) { setState("not_found"); return; }
        if (!instance.is_active) { setState("inactive"); return; }

        const { data: inf } = await supabase
          .from("influencers")
          .select("name")
          .eq("id", instance.influencer_id)
          .maybeSingle();

        setInstanceCtx({
          lp_mode: (instance as any).lp_mode,
          game_slugs: (instance as any).game_slugs,
          layout_config: (instance as any).layout_config,
          hype_copy: (instance as any).hype_copy,
        });
        await hydrateGameArts(lpBase.id, instance.id, (instance as any).game_slugs || [], {
          game_slug: (instance as any).hype_copy?.game_slug,
          game_name: (instance as any).hype_copy?.game_name,
          game_icon_url: (instance as any).hype_copy?.game_icon_url,
          source_tracking_link_id: (instance as any).source_tracking_link_id,
        });
        await finalize(instance.affiliate_link, instance.influencer_id, inf?.name || "", instance.id, instance.landing_page_id);
        return;
      }

      // ── STRATEGY 2: Generic instance ──
      const { data: instance } = await supabase
        .from("landing_page_instances")
        .select("*")
        .eq("slug", slug)
        .eq("is_active", true)
        .limit(1)
        .maybeSingle();

      if (instance) {
        const { data: inf } = await supabase
          .from("influencers")
          .select("name")
          .eq("id", instance.influencer_id)
          .maybeSingle();

        setInstanceCtx({
          lp_mode: (instance as any).lp_mode,
          game_slugs: (instance as any).game_slugs,
          layout_config: (instance as any).layout_config,
          hype_copy: (instance as any).hype_copy,
        });
        await hydrateGameArts(instance.landing_page_id, instance.id, (instance as any).game_slugs || [], {
          game_slug: (instance as any).hype_copy?.game_slug,
          game_name: (instance as any).hype_copy?.game_name,
          game_icon_url: (instance as any).hype_copy?.game_icon_url,
          source_tracking_link_id: (instance as any).source_tracking_link_id,
        });
        await finalize(instance.affiliate_link, instance.influencer_id, inf?.name || "", instance.id, instance.landing_page_id);
        return;
      }

      // ── STRATEGY 3: Legacy influencer ──
      const { data: influencer } = await supabase
        .from("influencers")
        .select("*")
        .eq("slug", slug)
        .maybeSingle();

      if (!influencer) { setState("not_found"); return; }
      if (!influencer.is_active) { setState("inactive"); return; }

      await finalize(influencer.affiliate_link || "", influencer.id, influencer.name, null, null);
    })();
  }, [slug]);

  const handleCTA = useCallback(async () => {
    if (!resolved?.affiliate_link || clicking) return;
    setClicking(true);

    // Insert CTA click into legacy `clicks` table - DB trigger
    // `sync_click_to_tracking_event` then creates the canonical
    // tracking_event with platform_id resolved from the tracking_link,
    // so the click counts in tracking_metrics for the right casa.
    try {
      await supabase.from("clicks").insert({
        click_id: resolved.click_id,
        influencer_id: resolved.influencer_id,
        landing_page_id: resolved.landing_page_id,
        landing_page_instance_id: resolved.instance_id,
        tracking_link_id: resolved.tracking_link_id,
        clicked_at: new Date().toISOString(),
        user_agent: navigator.userAgent,
        referrer: document.referrer || null,
        route: `/?ref=${slug}`,
        source: "cta_click",
      } as any);
    } catch {
      // Don't block redirect
    }


    // Inject click_id (sub1) into affiliate link, and forward sub2/sub3 from
    // the LP's incoming URL so attribution survives the redirect.
    let finalUrl = injectClickId(resolved.affiliate_link, resolved.click_id_param, resolved.click_id);
    const fwd2 = searchParams.get("sub2") || resolved.influencer_id;
    const fwd3 = searchParams.get("sub3") || resolved.campanha_id;
    if (fwd2) finalUrl = injectClickId(finalUrl, "sub2", fwd2);
    if (fwd3) finalUrl = injectClickId(finalUrl, "sub3", fwd3);
    window.location.href = finalUrl;
  }, [resolved, clicking, slug, searchParams]);

  // ── Loading ──
  if (state === "loading") {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-500" />
      </div>
    );
  }

  // ── Not Found ──
  if (state === "not_found") {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex flex-col items-center justify-center text-white px-6 text-center">
        <img src={logo} alt="PlayBet" className="h-20 mb-8 opacity-80" />
        <h1 className="text-2xl font-bold mb-2">Página não encontrada</h1>
        <p className="text-sm text-gray-400 max-w-sm">O link que você acessou não está disponível ou não existe. Verifique o endereço e tente novamente.</p>
      </div>
    );
  }

  // ── No Domain Match ──
  if (state === "no_domain") {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex flex-col items-center justify-center text-white px-6 text-center">
        <img src={logo} alt="PlayBet" className="h-20 mb-8 opacity-80" />
        <h1 className="text-2xl font-bold mb-2">Domínio não configurado</h1>
        <p className="text-sm text-gray-400 max-w-sm">Este domínio ainda não foi vinculado a uma Landing Page no painel central da PlayBet.</p>
      </div>
    );
  }

  // ── Inactive ──
  if (state === "inactive") {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex flex-col items-center justify-center text-white px-6 text-center">
        <img src={logo} alt="PlayBet" className="h-20 mb-8 opacity-80" />
        <h1 className="text-2xl font-bold mb-2">Página temporariamente indisponível</h1>
        <p className="text-sm text-gray-400 max-w-sm">Este link está temporariamente fora do ar. Tente novamente mais tarde.</p>
      </div>
    );
  }

  const hasLink = !!resolved?.affiliate_link;

  const mode = (instanceCtx?.lp_mode as string) || "catalog";
  const rawSections: Array<{ id: string; enabled: boolean }> =
    instanceCtx?.layout_config?.sections ?? [
      { id: "hero", enabled: true },
      { id: "features", enabled: true },
      { id: "games", enabled: true },
      { id: "community", enabled: true },
      { id: "cta", enabled: true },
      { id: "footer", enabled: true },
    ];
  const isSectionOn = (id: string) => {
    const s = rawSections.find((s) => s.id === id);
    if (s) return s.enabled;
    // Sections not explicitly configured default to enabled (backward compat).
    return true;
  };


  const hypeTitle: string | null = instanceCtx?.hype_copy?.title ?? null;
  const hypeSub: string | null = instanceCtx?.hype_copy?.subtitle ?? null;
  const bonusOffer = instanceCtx?.hype_copy?.bonus_offer;
  const communityCta = instanceCtx?.hype_copy?.community_cta;
  const smartOdds: Array<{ event_name: string; market_name: string; odd_label?: string | null; badge?: string | null; starts_at?: string | null }> =
    Array.isArray(instanceCtx?.hype_copy?.smart_odds) ? instanceCtx.hype_copy.smart_odds : [];

  const primaryGame = gameArts[0];
  const isCatalogMode = mode === "catalog";
  const isGeneratedMode = !isCatalogMode;
  const displayGames = mode === "single_game" && primaryGame ? [primaryGame] : gameArts;
  const heroGame = primaryGame || null;
  const bonusEnabled = bonusOffer?.enabled !== false;
  const communityEnabled = communityCta?.enabled !== false;
  const showFeatures = isGeneratedMode && isSectionOn("features") && bonusEnabled && (bonusOffer?.title || bonusOffer?.code || primaryGame);
  const showCommunity = isSectionOn("community") && communityEnabled && (communityCta?.label || communityCta?.url);
  const defaultCta = isCatalogMode
    ? "Acessar oportunidades"
    : mode === "odds"
      ? "Acessar oportunidades"
      : bonusEnabled && bonusOffer?.code
        ? "Resgatar bônus"
        : primaryGame?.name
          ? `Jogar ${primaryGame.name}`
          : "Jogar agora";
  const configuredCta: string | null = (bonusEnabled ? bonusOffer?.cta_label : null) || instanceCtx?.hype_copy?.cta_label || null;
  const ctaLabel: string = isGeneratedMode && configuredCta?.toLowerCase().trim() === "acessar oportunidades"
    ? defaultCta
    : configuredCta || defaultCta;
  const heroTitle = hypeTitle || (isCatalogMode ? "Oportunidades PlayBet" : primaryGame?.name || "Oferta oficial");
  const heroSubtitle = hypeSub || (isCatalogMode ? "Acesso rápido às melhores oportunidades." : "Oferta ativa para jogar agora.");
  const copyBonusCode = async () => {
    if (!bonusOffer?.code) return;
    try { await navigator.clipboard.writeText(bonusOffer.code); } catch {}
  };

  // ── Ready ──
  return (
    <div className="min-h-screen bg-[#07070d] text-white overflow-x-hidden lp-public-page antialiased">
      {isSectionOn("hero") && (
        <header className="relative pt-10 pb-16 px-6">
          {/* Aurora backdrop */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[520px] h-[520px] rounded-full bg-emerald-500/20 blur-[120px]" />
            <div className="absolute top-24 right-[-80px] w-[280px] h-[280px] rounded-full bg-cyan-400/10 blur-[100px]" />
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-400/40 to-transparent" />
          </div>
          <div className="max-w-md mx-auto relative z-10 text-center">
            <img src={logo} alt="PlayBet" className="h-11 mx-auto mb-8 opacity-95" />
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/[0.04] backdrop-blur border border-emerald-400/20 text-emerald-300 text-[10px] font-semibold uppercase tracking-[0.14em] mb-6">
              <Zap size={11} /> {mode === "odds" ? "Em destaque" : isCatalogMode ? "Oportunidades" : "Oferta oficial"}
            </div>
            {heroGame && (
              <div className="relative mx-auto mb-6 w-fit">
                <div className="absolute inset-0 rounded-3xl bg-gradient-to-tr from-emerald-500/40 to-cyan-400/20 blur-2xl" />
                <GameImage
                  art={heroGame}
                  className="relative w-28 h-28 rounded-3xl object-cover ring-1 ring-white/10 shadow-[0_20px_60px_-20px_rgba(16,185,129,0.6)]"
                  fallbackClassName="relative w-28 h-28 rounded-3xl bg-gradient-to-br from-emerald-500/20 to-cyan-500/10 ring-1 ring-emerald-400/20 flex items-center justify-center"
                  iconSize={32}
                />
              </div>
            )}
            <h1 className="text-[28px] sm:text-4xl font-extrabold leading-[1.08] tracking-tight mb-4 bg-gradient-to-b from-white via-white to-white/70 bg-clip-text text-transparent">
              {heroTitle}
            </h1>
            <p className="text-gray-400 text-[13px] sm:text-sm leading-relaxed max-w-sm mx-auto mb-8">
              {heroSubtitle}
            </p>
            <button
              onClick={handleCTA}
              disabled={clicking || !hasLink}
              className="group relative inline-flex items-center gap-2 bg-gradient-to-b from-emerald-400 to-emerald-500 hover:from-emerald-300 hover:to-emerald-400 disabled:opacity-50 text-black font-bold px-9 py-3.5 rounded-2xl text-[15px] transition-all shadow-[0_10px_30px_-8px_rgba(16,185,129,0.7)] hover:shadow-[0_14px_40px_-8px_rgba(16,185,129,0.9)] active:scale-[0.97]"
            >
              <span className="absolute inset-0 rounded-2xl bg-gradient-to-b from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition" />
              <span className="relative">{clicking ? "Abrindo..." : ctaLabel}</span>
              <ArrowRight size={17} className="relative transition-transform group-hover:translate-x-0.5" />
            </button>
            {!hasLink && (
              <p className="text-[11px] text-gray-500 mt-3">Link de cadastro em configuração.</p>
            )}
          </div>
        </header>
      )}

      {showFeatures && (
        <section className="px-6 pb-14">
          <div className="max-w-md mx-auto">
            <div className="relative rounded-2xl border border-white/[0.06] bg-gradient-to-b from-white/[0.05] to-white/[0.015] p-5 overflow-hidden">
              <div className="absolute -top-16 -right-16 w-40 h-40 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />
              <div className="relative flex items-center gap-4">
                {primaryGame && (
                  <GameImage
                    art={primaryGame}
                    className="w-14 h-14 rounded-xl object-cover shrink-0 ring-1 ring-white/10"
                    fallbackClassName="w-14 h-14 rounded-xl bg-emerald-500/15 ring-1 ring-emerald-400/20 flex items-center justify-center shrink-0"
                  />
                )}
                <div className="min-w-0 flex-1 text-left">
                  <p className="text-[9px] uppercase tracking-[0.18em] text-emerald-300/80 font-semibold mb-1">
                    Oferta oficial
                  </p>
                  <h3 className="text-[15px] font-bold truncate leading-tight">
                    {bonusOffer?.title || primaryGame?.name || "Bônus ativo"}
                  </h3>
                </div>
              </div>
              {bonusOffer?.code && (
                <button
                  onClick={copyBonusCode}
                  className="relative mt-5 w-full inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-400/25 bg-emerald-500/[0.06] hover:bg-emerald-500/[0.12] px-4 py-3 font-mono text-sm font-bold tracking-[0.24em] text-emerald-200 transition"
                >
                  {bonusOffer.code} <Copy size={13} className="opacity-70" />
                </button>
              )}
              {bonusOffer?.note && (
                <p className="relative mt-3 text-[11px] text-gray-500 text-center">{bonusOffer.note}</p>
              )}
            </div>
          </div>
        </section>
      )}

      {isSectionOn("games") && mode !== "odds" && (
        <section className="px-6 pb-16">
          <div className="max-w-xl mx-auto">
            <h2 className="text-center text-[11px] font-semibold uppercase tracking-[0.2em] text-gray-500 mb-5">
              {mode === "single_game" ? "Jogo selecionado" : mode === "multi_game" ? "Jogos em alta" : "Catálogo"}
            </h2>
            <div className={`grid gap-2.5 ${displayGames.length === 1 ? "grid-cols-1 max-w-[220px] mx-auto" : "grid-cols-3"}`}>
              {(displayGames.length > 0
                ? displayGames
                : ["Fortune Tiger", "Aviator", "Mines", "Sweet Bonanza", "Gates of Olympus", "Spaceman"].map(
                    (n) => ({ slug: n, name: n, icon_url: null } as GameArt),
                  )
              ).map((g) => (
                <button
                  key={g.slug}
                  onClick={handleCTA}
                  className="group relative bg-white/[0.025] hover:bg-white/[0.05] border border-white/[0.05] hover:border-emerald-400/30 rounded-xl p-3.5 flex flex-col items-center gap-2 transition-all overflow-hidden"
                >
                  <div className="absolute inset-x-0 -top-8 h-16 bg-emerald-400/10 blur-2xl opacity-0 group-hover:opacity-100 transition" />
                  <GameImage
                    art={g}
                    className="relative w-14 h-14 rounded-lg object-cover ring-1 ring-white/5"
                    fallbackClassName="relative w-14 h-14 rounded-lg bg-emerald-500/10 ring-1 ring-emerald-400/15 flex items-center justify-center"
                    iconSize={20}
                  />
                  <span className="relative text-[11px] font-medium leading-tight text-center line-clamp-2">{g.name}</span>
                </button>
              ))}
            </div>
          </div>
        </section>
      )}

      {isSectionOn("odds") && mode === "odds" && (
        <section className="px-6 pb-16">
          <div className="max-w-xl mx-auto">
            <div className="text-center mb-6">
              <h2 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-gray-500 mb-2">Em destaque</h2>
              <p className="text-sm text-gray-400">Opções disponíveis para acessar agora</p>
            </div>
            {smartOdds.length > 0 ? (
              <div className="space-y-2">
                {smartOdds.map((o, i) => (
                  <button
                    key={i}
                    onClick={handleCTA}
                    className="w-full text-left bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.06] hover:border-emerald-400/40 rounded-xl p-4 transition-all group"
                  >
                    <div className="flex items-center justify-between gap-3 mb-1">
                      <span className="text-sm font-semibold truncate">{o.event_name}</span>
                      {o.odd_label && (
                        <span className="text-emerald-300 font-extrabold text-lg tabular-nums shrink-0">{o.odd_label}</span>
                      )}
                    </div>
                    <div className="flex items-center justify-between gap-2 text-xs text-gray-400">
                      <span className="truncate">{o.market_name}</span>
                      {o.badge && <span className="text-[10px] uppercase tracking-wider text-emerald-300/80">{o.badge}</span>}
                    </div>
                    {o.starts_at && (
                      <p className="text-[10px] text-gray-500 mt-1">
                        {new Date(o.starts_at).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                      </p>
                    )}
                  </button>
                ))}
              </div>
            ) : (
              <button
                onClick={handleCTA}
                className="w-full max-w-md mx-auto block bg-white/[0.03] border border-white/[0.06] rounded-2xl p-6 hover:border-emerald-400/40 transition text-center"
              >
                <p className="text-sm text-gray-400 mb-1">Ver todas as opções em destaque</p>
                <p className="text-lg font-bold text-emerald-300">Ver opções →</p>
              </button>
            )}
          </div>
        </section>
      )}

      {showCommunity && (
        <section className="px-6 pb-16">
          <div className="max-w-md mx-auto rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 text-center">
            <div className="inline-flex items-center justify-center w-11 h-11 rounded-full bg-emerald-500/12 ring-1 ring-emerald-400/25 mb-3">
              <Users size={20} className="text-emerald-300" />
            </div>
            <h3 className="text-[15px] font-bold mb-1">{communityCta?.label || "Comunidade PlayBet"}</h3>
            {communityCta?.note && (
              <p className="text-[12px] text-gray-500 mb-4 max-w-sm mx-auto leading-relaxed">{communityCta.note}</p>
            )}
            {communityCta?.url ? (
              <a
                href={communityCta.url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 bg-white/[0.05] hover:bg-white/[0.08] border border-white/[0.08] px-5 py-2 rounded-xl text-[13px] font-semibold transition"
              >
                Acessar comunidade <ArrowRight size={13} />
              </a>
            ) : (
              <p className="text-[11px] text-gray-600">Link do grupo em configuração pelo influenciador.</p>
            )}
          </div>
        </section>
      )}

      {isSectionOn("cta") && !isSectionOn("hero") && (
        <section className="px-6 pb-16">
          <div className="max-w-xl mx-auto text-center">
            <button
              onClick={handleCTA}
              disabled={clicking || !hasLink}
              className="inline-flex items-center gap-2 bg-gradient-to-b from-emerald-400 to-emerald-500 disabled:opacity-50 text-black font-bold px-9 py-3.5 rounded-2xl text-[15px] transition-all shadow-[0_10px_30px_-8px_rgba(16,185,129,0.7)] active:scale-[0.97]"
            >
              {clicking ? "Abrindo..." : ctaLabel} <ArrowRight size={17} />
            </button>
          </div>
        </section>
      )}

      {isSectionOn("footer") && (
        <footer className="border-t border-white/[0.04] py-6 px-6 text-center">
          <p className="text-[11px] text-gray-600 tracking-wide">
            PlayBet © {new Date().getFullYear()} · Jogue com responsabilidade · 18+
          </p>
        </footer>
      )}
    </div>
  );

}
