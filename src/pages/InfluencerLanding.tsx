import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { ArrowRight, Zap, Gift, Users, Copy } from "lucide-react";
import logo from "@/assets/playbet-wordmark.webp";
import { BrandFooterSeal } from "@/components/brand/BrandFooterSeal";
import { resolveEffectiveLpMode } from "@/lib/lpMode";
import { BrandKit, isBrandLegallyReady, resolveBrand } from "@/lib/brandRegistry";



type LoadState = "loading" | "ready" | "not_found" | "inactive" | "no_domain";

interface ResolvedLanding {
  affiliate_link: string;
  influencer_id: string;
  campanha_id: string | null;
  influencer_name: string;
  instance_id: string | null;
  landing_page_id: string | null;
  tracking_link_id: string | null;
  platform_account_id: string | null;
  platform_id: string | null;
  click_id: string;
  click_id_param: string; // e.g. "sub1"
  brand: BrandKit | null;
  platform_name: string | null;
  platform_slug: string | null;
  tracking_code: string | null;
}

interface LpBrandContext {
  brand: BrandKit | null;
  platformName: string | null;
  platformSlug: string | null;
  platformAccountId: string | null;
  linkSlug: string | null;
  isLegallyReady: boolean;
  seo: {
    title: string;
    description: string;
    ogTitle: string;
    license: string | null;
  };
}

function buildSeo(brand: BrandKit | null, linkSlug: string | null): LpBrandContext["seo"] {
  if (!brand) return { title: "PlayBet", description: "", ogTitle: "PlayBet", license: null };
  const license = brand.seal?.license ?? null;
  const suffix = license ? ` · ${license}` : "";
  return {
    title: `${brand.name}${linkSlug ? " — " + linkSlug : ""}`,
    description: `Jogue com responsabilidade em ${brand.name}. +18${suffix}`,
    ogTitle: brand.name,
    license,
  };
}

function buildBrandContext(
  brand: BrandKit | null,
  platformName: string | null,
  platformSlug: string | null,
  platformAccountId: string | null,
  linkSlug: string | null,
): LpBrandContext {
  return {
    brand,
    platformName,
    platformSlug,
    platformAccountId,
    linkSlug,
    isLegallyReady: isBrandLegallyReady(brand),
    seo: buildSeo(brand, linkSlug),
  };
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

function inferClickParamName(url: string, preferred?: string | null): string {
  if (preferred) {
    try {
      const u = new URL(url, window.location.origin);
      if (u.searchParams.has(preferred)) return preferred;
    } catch {}
  }
  try {
    const u = new URL(url, window.location.origin);
    if (u.searchParams.has("afp")) return "afp";
    if (u.searchParams.has("sub1")) return "sub1";
    if (u.searchParams.has("tracking_code")) return "tracking_code";
  } catch {}
  return "sub1";
}

async function findLPBaseByHostname(hostname: string) {
  const normalizedHost = hostname.split(":")[0].toLowerCase();
  const candidates = [
    normalizedHost,
    `https://${normalizedHost}`,
    `http://${normalizedHost}`,
    `https://${normalizedHost}/`,
    `http://${normalizedHost}/`,
  ];

  const { data: exact } = await supabase
    .from("landing_pages")
    .select("id, domain, name")
    .eq("is_active", true)
    .in("domain", candidates)
    .limit(1);

  if (exact?.[0]) return exact[0];

  const { data: lps } = await supabase
    .from("landing_pages")
    .select("id, domain, name")
    .eq("is_active", true);

  if (!lps || lps.length === 0) return null;

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

/** Find tracking_link for a given instance/influencer. Prefer the code carried by the public URL. */
async function findTrackingLink(instanceId: string | null, influencerId: string, preferredCode?: string | null, affiliateUrl?: string | null) {
  const select = "id, click_id_param_name, base_url, short_url, final_url, campanha_id, status, tracking_code, platform_account_id, landing_page_id, landing_page_instance_id, platform_accounts(platform_id, platforms(name, slug))";

  if (preferredCode) {
    const { data } = await supabase
      .from("tracking_links")
      .select(select)
      .eq("tracking_code", preferredCode)
      .eq("influencer_id", influencerId)
      .limit(1)
      .maybeSingle();
    if (data) return data;
  }

  if (instanceId) {
    const { data: instance } = await supabase
      .from("landing_page_instances")
      .select("source_tracking_link_id")
      .eq("id", instanceId)
      .maybeSingle();

    const sourceTrackingLinkId = (instance as any)?.source_tracking_link_id;
    if (sourceTrackingLinkId) {
      const { data } = await supabase
        .from("tracking_links")
        .select(select)
        .eq("id", sourceTrackingLinkId)
        .eq("is_demo", false)
        .maybeSingle();
      if (data) return data;
    }
  }

  if (instanceId) {
    const { data } = await supabase
      .from("tracking_links")
      .select(select)
      .eq("landing_page_instance_id", instanceId)
      .order("status", { ascending: true }) // active < paused alphabetically
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (data) return data;
  }

  // Older LP instances can carry the affiliate URL but not the tracking_link_id.
  // In that case, match by the actual destination host/path before using the
  // "latest link" fallback, otherwise Estrela Bet and VUPI can be swapped.
  if (affiliateUrl) {
    const affiliateKey = urlMatchKey(affiliateUrl);
    const codeFromAffiliate = extractTrackingCodeFromUrl(affiliateUrl);
    const { data: candidates } = await supabase
      .from("tracking_links")
      .select(select)
      .eq("influencer_id", influencerId)
      .order("updated_at", { ascending: false })
      .limit(50);
    const matched = (candidates || []).find((tl: any) => {
      if (codeFromAffiliate && tl.tracking_code === codeFromAffiliate) return true;
      return affiliateKey && [tl.base_url, tl.short_url].some((url) => urlMatchKey(url) === affiliateKey);
    });
    if (matched) return matched;
  }

  const { data } = await supabase
    .from("tracking_links")
    .select(select)
    .eq("influencer_id", influencerId)
    .order("status", { ascending: true })
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return data || null;
}

function extractTrackingCodeFromUrl(value?: string | null) {
  if (!value) return null;
  try {
    const u = new URL(value, window.location.origin);
    return u.searchParams.get("sub1") || u.searchParams.get("afp") || u.searchParams.get("tracking_code");
  } catch {
    return null;
  }
}

function urlMatchKey(value?: string | null) {
  if (!value) return null;
  try {
    const u = new URL(value, window.location.origin);
    return `${u.hostname.toLowerCase().replace(/^www\./, "")}${u.pathname.replace(/\/+$/, "")}`;
  } catch {
    return null;
  }
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

/** Fallback: get the tracked affiliate destination from the bound opportunity.
 *  IMPORTANTE: só retornamos uma opportunity que esteja explicitamente amarrada
 *  a este tracking_link_id. Nunca caímos numa opportunity "LP-wide" — isso levaria
 *  o CTA de um influenciador para a oferta de outro (quebra de atribuição e de casa).
 */
async function findOpportunityDestination(_instanceId: string | null, _landingPageId: string | null, trackingLinkId?: string | null) {
  if (!trackingLinkId) return null;
  const { data } = await supabase
    .from("lp_opportunities")
    .select("destination_url")
    .eq("tracking_link_id", trackingLinkId)
    .eq("is_active", true)
    .not("destination_url", "is", null)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
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

interface CachedLpSnapshot {
  resolved: ResolvedLanding;
  instanceCtx: InstanceContext | null;
  gameArts: GameArt[];
  storedAt: number;
}

const SUPABASE_URL = (import.meta as unknown as { env?: Record<string, string> }).env?.VITE_SUPABASE_URL ?? "";
const SUPABASE_ANON_KEY = (import.meta as unknown as { env?: Record<string, string> }).env?.VITE_SUPABASE_PUBLISHABLE_KEY ?? "";
const TRACKING_LINK_SELECT = "id, click_id_param_name, base_url, short_url, final_url, campanha_id, status, tracking_code, platform_account_id, landing_page_id, landing_page_instance_id, platform_accounts(platform_id, platforms(name, slug))";
const LP_INSTANCE_SELECT = `id, slug, landing_page_id, affiliate_link, influencer_id, is_active, lp_mode, game_slugs, layout_config, hype_copy, source_tracking_link_id, source_tracking_link:tracking_links!landing_page_instances_source_tracking_link_id_fkey(${TRACKING_LINK_SELECT})`;
const LP_CACHE_TTL_MS = 15 * 60 * 1000;

function lpCacheKey(slug?: string | null) {
  return `playbet_lp_snapshot:v2:${slug || "default"}`;
}

function readCachedLpSnapshot(slug?: string | null): CachedLpSnapshot | null {
  if (!slug) return null;
  try {
    const raw = window.sessionStorage.getItem(lpCacheKey(slug)) || window.localStorage.getItem(lpCacheKey(slug));
    if (!raw) return null;
    const snapshot = JSON.parse(raw) as CachedLpSnapshot;
    if (!snapshot?.resolved || Date.now() - snapshot.storedAt > LP_CACHE_TTL_MS) return null;
    snapshot.resolved.click_id = getOrCreatePageClickId(slug);
    return snapshot;
  } catch {
    return null;
  }
}

function writeCachedLpSnapshot(slug: string | null | undefined, snapshot: Omit<CachedLpSnapshot, "storedAt">) {
  if (!slug || !snapshot.resolved?.affiliate_link) return;
  try {
    const payload = JSON.stringify({ ...snapshot, storedAt: Date.now() });
    window.sessionStorage.setItem(lpCacheKey(slug), payload);
    window.localStorage.setItem(lpCacheKey(slug), payload);
  } catch {}
}

function runWhenIdle(task: () => void) {
  const w = window as typeof window & { requestIdleCallback?: (cb: () => void, options?: { timeout?: number }) => number };
  if (w.requestIdleCallback) {
    w.requestIdleCallback(task, { timeout: 1200 });
    return;
  }
  window.setTimeout(task, 180);
}

function insertClickKeepAlive(payload: Record<string, unknown>) {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return;
  try {
    void fetch(`${SUPABASE_URL}/rest/v1/clicks`, {
      method: "POST",
      keepalive: true,
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify(payload),
    }).catch(() => {});
  } catch {}
}

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

function LogoSlot({ src, name, className = "", size = "sm" }: { src?: string | null; name: string; className?: string; size?: "sm" | "md" }) {
  const [failed, setFailed] = useState(false);
  const box = size === "md" ? "h-10 max-w-[160px]" : "h-7 max-w-[110px]";
  const img = size === "md" ? "h-9 w-auto max-w-full object-contain" : "h-5 w-auto max-w-full object-contain";
  if (!src || failed) {
    return (
      <span className={`inline-flex ${box} shrink-0 items-center justify-center text-center text-xs font-extrabold tracking-wide text-white ${className}`}>
        {name}
      </span>
    );
  }
  return (
    <span className={`inline-flex ${box} shrink-0 items-center justify-center ${className}`}>
      <img
        src={src}
        alt={name}
        className={img}
        loading="eager"
        decoding="async"
        onError={() => setFailed(true)}
      />
    </span>
  );
}

function BrandLogoImage({ src, name }: { src?: string | null; name: string }) {
  return <LogoSlot src={src} name={name} size="md" />;
}

export default function InfluencerLanding() {
  const { slug: pathSlug } = useParams<{ slug: string }>();
  const [searchParams] = useSearchParams();
  const slug = searchParams.get("ref") || pathSlug;
  // Editors/admin previews carry `_preview` — never use the cached snapshot so
  // edits (brand override, copy, seções, jogos) aparecem imediatamente ao recarregar.
  const isPreview = searchParams.has("_preview");
  const cachedSnapshot = isPreview ? null : readCachedLpSnapshot(slug);
  const [state, setState] = useState<LoadState>(() => cachedSnapshot ? "ready" : "loading");
  const [resolved, setResolved] = useState<ResolvedLanding | null>(() => cachedSnapshot?.resolved ?? null);
  const [instanceCtx, setInstanceCtx] = useState<InstanceContext | null>(() => cachedSnapshot?.instanceCtx ?? null);
  const [gameArts, setGameArts] = useState<GameArt[]>(() => cachedSnapshot?.gameArts ?? []);
  const clickingRef = useRef(false);

  // Brand travada pela plataforma do link. Para LP pública, resolve de forma síncrona
  // pelo tracking_link quando disponível ou pelo hint denormalizado no hype_copy.
  // Um override manual salvo em layout_config.brand_override_key sempre vence.
  const platformHint =
    (instanceCtx?.hype_copy?.platform_slug as string | null | undefined) ||
    (instanceCtx?.hype_copy?.platform_name as string | null | undefined) ||
    null;
  const overrideKey = (instanceCtx?.layout_config?.brand_override_key as string | null | undefined) || null;
  const overrideBrand = overrideKey ? resolveBrand(overrideKey) : null;
  const hintedBrand = resolveBrand(platformHint);
  const effectiveBrand = overrideBrand || resolved?.brand || hintedBrand;
  const brandCtx = buildBrandContext(
    effectiveBrand,
    overrideBrand?.name || resolved?.platform_name || (hintedBrand?.name ?? (platformHint ? String(platformHint) : null)),
    overrideBrand?.key || resolved?.platform_slug || (hintedBrand?.key ?? null),
    resolved?.platform_account_id ?? null,
    resolved?.tracking_code ?? null,
  );

  // SEO dinâmico por marca resolvida
  useEffect(() => {
    if (!brandCtx?.brand) return;
    document.title = brandCtx.seo.title;
    const setMeta = (name: string, content: string, attr: "name" | "property" = "name") => {
      let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${name}"]`);
      if (!el) { el = document.createElement("meta"); el.setAttribute(attr, name); document.head.appendChild(el); }
      el.content = content;
    };
    setMeta("description", brandCtx.seo.description);
    setMeta("og:title", brandCtx.seo.ogTitle, "property");
    setMeta("og:description", brandCtx.seo.description, "property");
    setMeta("og:type", "website", "property");
    setMeta("twitter:card", "summary_large_image");
  }, [brandCtx?.brand?.key, brandCtx?.seo.title, brandCtx?.seo.description, brandCtx?.seo.ogTitle]);


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

    const cached = readCachedLpSnapshot(slug);
    if (cached) {
      setResolved(cached.resolved);
      setInstanceCtx(cached.instanceCtx);
      setGameArts(cached.gameArts || []);
      setState("ready");
    } else {
      setState("loading");
    }

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

      const sourceSlug = normalizeSlug(tl?.game_slug || fallback?.game_slug);
      const fallbackSlug = normalizeSlug(fallback?.game_slug || tl?.game_slug);
      const fallbackName = fallback?.game_name || tl?.game_name || fallbackSlug;
      const fallbackIcon = fallback?.game_icon_url || tl?.game_icon_url || null;
      const instanceSlugs = compactUnique(slugs || []);
      const effectiveSlugs = instanceId
        ? (sourceSlug ? [sourceSlug] : (fallback?.source_tracking_link_id ? [] : instanceSlugs.slice(0, 1)))
        : compactUnique([fallbackSlug || instanceSlugs[0]]).slice(0, 1);
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
      const isDirectInstanceRoute = window.location.pathname.startsWith("/i/");

      // Helper to finalize resolution
      const setFastResolved = (
        affiliateLink: string,
        influencerId: string,
        influencerName: string,
        instanceId: string | null,
        landingPageId: string | null,
        quickCtx?: InstanceContext | null,
      ) => {
        const preferredTrackingCode = searchParams.get("sub1") || searchParams.get("afp") || searchParams.get("tracking_code") || extractTrackingCodeFromUrl(affiliateLink);
        const quickAffiliate = isPublicLpLoop(affiliateLink, hostname, slug) ? "" : affiliateLink;
        const quickPlatformSlug = quickCtx?.hype_copy?.platform_slug as string | null | undefined;
        const quickPlatformName = quickCtx?.hype_copy?.platform_name as string | null | undefined;
        const quickResolved: ResolvedLanding = {
          affiliate_link: quickAffiliate,
          influencer_id: influencerId,
          campanha_id: searchParams.get("sub3"),
          influencer_name: influencerName,
          instance_id: instanceId,
          landing_page_id: landingPageId,
          tracking_link_id: null,
          platform_account_id: null,
          platform_id: null,
          click_id: clickId,
          click_id_param: inferClickParamName(affiliateLink, preferredTrackingCode ? (affiliateLink.includes("afp=") ? "afp" : "sub1") : null),
          brand: resolveBrand(quickPlatformSlug) || resolveBrand(quickPlatformName),
          platform_name: quickPlatformName || null,
          platform_slug: quickPlatformSlug || null,
          tracking_code: preferredTrackingCode,
        };
        setResolved(quickResolved);
        setState("ready");
        writeCachedLpSnapshot(slug, { resolved: quickResolved, instanceCtx: quickCtx ?? null, gameArts: [] });
        return preferredTrackingCode;
      };

      const finalize = async (
        affiliateLink: string,
        influencerId: string,
        influencerName: string,
        instanceId: string | null,
        landingPageId: string | null,
        quickCtx?: InstanceContext | null,
        sourceTrackingLink?: any,
        snapshotGameArts: GameArt[] = [],
      ) => {
        const preferredTrackingCode = setFastResolved(affiliateLink, influencerId, influencerName, instanceId, landingPageId, quickCtx);
        const tl = sourceTrackingLink || await findTrackingLink(instanceId, influencerId, preferredTrackingCode, affiliateLink);
        const paramName = tl?.click_id_param_name || "sub1";
        // A URL do próprio tracking_link deste influenciador SEMPRE vence — só caímos
        // para uma opportunity explicitamente amarrada a este tracking_link_id como
        // último recurso, e nunca para uma opportunity "LP-wide" (outro influenciador).
        const fallbackOpportunity = sourceTrackingLink ? null : await findOpportunityDestination(instanceId, landingPageId, tl?.id || null);
        const outboundAffiliate = [
          (tl as any)?.base_url,
          (tl as any)?.short_url,
          affiliateLink,
          fallbackOpportunity,
          (tl as any)?.final_url,
        ].find((url) => url && !isPublicLpLoop(url, hostname, slug)) || "";

        const platformAccountId = (tl as any)?.platform_account_id || null;
        const platformId = (tl as any)?.platform_accounts?.platform_id || null;
        const platformName = (tl as any)?.platform_accounts?.platforms?.name || null;
        const platformSlug = (tl as any)?.platform_accounts?.platforms?.slug || null;
        const brand = resolveBrand(platformSlug) || resolveBrand(platformName) || resolveBrand((quickCtx?.hype_copy?.platform_slug as string | null | undefined) || null);

        const finalResolved: ResolvedLanding = {
          affiliate_link: outboundAffiliate,
          influencer_id: influencerId,
          campanha_id: tl?.campanha_id || searchParams.get("sub3"),
          influencer_name: influencerName,
          instance_id: instanceId,
          landing_page_id: landingPageId,
          tracking_link_id: tl?.id || null,
          platform_account_id: platformAccountId,
          platform_id: platformId,
          click_id: clickId,
          click_id_param: paramName,
          brand,
          platform_name: platformName,
          platform_slug: platformSlug,
          tracking_code: tl?.tracking_code || preferredTrackingCode,
        };
        setResolved(finalResolved);
        writeCachedLpSnapshot(slug, { resolved: finalResolved, instanceCtx: quickCtx ?? null, gameArts: snapshotGameArts });

        // Register real public LP views only. Admin/editor previews must never
        // inflate production tracking.
        if (shouldSendLpView(slug, clickId)) {
          runWhenIdle(() => {
            supabase.from("tracking_events").insert({
              canonical_event_name: "lp_view",
              raw_event_name: "lp_view",
              click_id: clickId,
              influencer_id: influencerId,
              landing_page_id: landingPageId,
              landing_page_instance_id: instanceId,
              tracking_link_id: tl?.id || null,
              platform_account_id: platformAccountId,
              platform_id: platformId,
              campanha_id: tl?.campanha_id || searchParams.get("sub3"),
              source_type: "landing_page",
              event_timestamp: new Date().toISOString(),
              raw_payload: {
                slug,
                hostname,
                path: window.location.pathname,
                search: window.location.search,
                is_preview: searchParamsPreview(),
                sub2: searchParams.get("sub2"),
                sub3: searchParams.get("sub3"),
                sub1: preferredTrackingCode,
                user_agent: navigator.userAgent,
                referrer: document.referrer || null,
              },
            }).then(() => {});
          });
        }

      };

      const resolveGenericInstance = async () => {
        const { data: instance } = await supabase
          .from("landing_page_instances")
          .select(LP_INSTANCE_SELECT)
          .eq("slug", slug)
          .eq("is_active", true)
          .limit(1)
          .maybeSingle();

        if (!instance) return false;

        const nextCtx = {
          lp_mode: (instance as any).lp_mode,
          game_slugs: (instance as any).game_slugs,
          layout_config: (instance as any).layout_config,
          hype_copy: (instance as any).hype_copy,
        };
        setInstanceCtx(nextCtx);
        const fallbackArt = (instance as any).hype_copy?.game_slug
          ? [{
              slug: normalizeSlug((instance as any).hype_copy.game_slug),
              name: (instance as any).hype_copy?.game_name || normalizeSlug((instance as any).hype_copy.game_slug),
              icon_url: (instance as any).hype_copy?.game_icon_url || null,
            }]
          : [];
        setGameArts(fallbackArt);
        if (!cached && (fallbackArt.length > 0 || ((instance as any).game_slugs || []).length > 0)) {
          runWhenIdle(() => void hydrateGameArts(instance.landing_page_id, instance.id, (instance as any).game_slugs || [], {
            game_slug: (instance as any).hype_copy?.game_slug,
            game_name: (instance as any).hype_copy?.game_name,
            game_icon_url: (instance as any).hype_copy?.game_icon_url,
            source_tracking_link_id: (instance as any).source_tracking_link_id,
          }));
        }
        void finalize(instance.affiliate_link, instance.influencer_id, "", instance.id, instance.landing_page_id, nextCtx, (instance as any).source_tracking_link, fallbackArt);
        return true;
      };

      // Public /i links are generated instance links; resolve them directly and
      // skip domain discovery so painelcentral links open without loading panel/auth.
      if (isDirectInstanceRoute) {
        const resolvedInstance = await resolveGenericInstance();
        if (!resolvedInstance) setState("not_found");
        return;
      }

      // ── STRATEGY 1: Domain-aware ──
      const lpBase = await findLPBaseByHostname(hostname);

      if (lpBase) {
        const { data: instance } = await supabase
          .from("landing_page_instances")
          .select(LP_INSTANCE_SELECT)
          .eq("slug", slug)
          .eq("landing_page_id", lpBase.id)
          .maybeSingle();

        if (!instance) { setState("not_found"); return; }
        if (!instance.is_active) { setState("inactive"); return; }

        const nextCtx = {
          lp_mode: (instance as any).lp_mode,
          game_slugs: (instance as any).game_slugs,
          layout_config: (instance as any).layout_config,
          hype_copy: (instance as any).hype_copy,
        };
        setInstanceCtx(nextCtx);
        const fallbackArt = (instance as any).hype_copy?.game_slug
          ? [{
              slug: normalizeSlug((instance as any).hype_copy.game_slug),
              name: (instance as any).hype_copy?.game_name || normalizeSlug((instance as any).hype_copy.game_slug),
              icon_url: (instance as any).hype_copy?.game_icon_url || null,
            }]
          : [];
        setGameArts(fallbackArt);
        if (!cached && (fallbackArt.length > 0 || ((instance as any).game_slugs || []).length > 0)) {
          runWhenIdle(() => void hydrateGameArts(lpBase.id, instance.id, (instance as any).game_slugs || [], {
            game_slug: (instance as any).hype_copy?.game_slug,
            game_name: (instance as any).hype_copy?.game_name,
            game_icon_url: (instance as any).hype_copy?.game_icon_url,
            source_tracking_link_id: (instance as any).source_tracking_link_id,
          }));
        }
        void finalize(instance.affiliate_link, instance.influencer_id, "", instance.id, instance.landing_page_id, nextCtx, (instance as any).source_tracking_link, fallbackArt);
        return;
      }

      // ── STRATEGY 2: Generic instance ──
      if (await resolveGenericInstance()) {
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

      void finalize(influencer.affiliate_link || "", influencer.id, influencer.name, null, null);
    })();
  }, [slug]);

  const handleCTA = useCallback(() => {
    if (!resolved?.affiliate_link || clickingRef.current) return;
    clickingRef.current = true;

    // Build final URL first so redirect is instantaneous. The platform-facing
    // attribution must be the stable tracking code, otherwise panel reports
    // cannot group conversions back into the individual link.
    let finalUrl = injectClickId(
      resolved.affiliate_link,
      resolved.click_id_param,
      // Sempre o click_id único por visita — o postback da casa devolve esse valor
      // em sub1 e o trigger `sync_click_to_tracking_event` casa 1:1 com a linha em
      // public.clicks. Usar tracking_code aqui colapsaria todas as visitas do link
      // no mesmo id e destruiria a atribuição por clique.
      resolved.click_id || resolved.tracking_code || "",
    );

    const fwd2 = searchParams.get("sub2") || resolved.influencer_id;
    const fwd3 = searchParams.get("sub3") || resolved.campanha_id;
    if (fwd2) finalUrl = injectClickId(finalUrl, "sub2", fwd2);
    if (fwd3) finalUrl = injectClickId(finalUrl, "sub3", fwd3);

    // Fire-and-forget: never block the redirect on the click insert.
    // The DB trigger `sync_click_to_tracking_event` will create the canonical
    // tracking_event server-side, so attribution stays intact.
    if (!isInternalPreviewContext()) {
      try {
        insertClickKeepAlive({
          click_id: resolved.click_id,
          influencer_id: resolved.influencer_id,
          landing_page_id: resolved.landing_page_id,
          landing_page_instance_id: resolved.instance_id,
          tracking_link_id: resolved.tracking_link_id,
          clicked_at: new Date().toISOString(),
          user_agent: navigator.userAgent,
          referrer: document.referrer || null,
          route: window.location.pathname + window.location.search,
          source: "cta_click",
        });
      } catch {
        // ignore — redirect must never wait on tracking
      }
    }

    window.location.href = finalUrl;
  }, [resolved, searchParams]);

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
        <LogoSlot src={logo} name="PlayBet" className="mb-8 opacity-80" />
        <h1 className="text-2xl font-bold mb-2">Página não encontrada</h1>
        <p className="text-sm text-gray-400 max-w-sm">O link que você acessou não está disponível ou não existe. Verifique o endereço e tente novamente.</p>
      </div>
    );
  }

  // ── No Domain Match ──
  if (state === "no_domain") {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex flex-col items-center justify-center text-white px-6 text-center">
        <LogoSlot src={logo} name="PlayBet" className="mb-8 opacity-80" />
        <h1 className="text-2xl font-bold mb-2">Domínio não configurado</h1>
        <p className="text-sm text-gray-400 max-w-sm">Este domínio ainda não foi vinculado a uma Landing Page no painel central da PlayBet.</p>
      </div>
    );
  }

  // ── Inactive ──
  if (state === "inactive") {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex flex-col items-center justify-center text-white px-6 text-center">
        <LogoSlot src={logo} name="PlayBet" className="mb-8 opacity-80" />
        <h1 className="text-2xl font-bold mb-2">Página temporariamente indisponível</h1>
        <p className="text-sm text-gray-400 max-w-sm">Este link está temporariamente fora do ar. Tente novamente mais tarde.</p>
      </div>
    );
  }

  const hasLink = !!resolved?.affiliate_link;

  const storedMode = (instanceCtx?.lp_mode as string) || "catalog";
  const mode = resolveEffectiveLpMode({
    storedMode,
    hasResolvedGameArt: gameArts.length > 0,
    hypeCopyGameSlug: normalizeSlug(instanceCtx?.hype_copy?.game_slug),
  });

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
  const isPlatformDirect = mode === "platform_direct";
  const isGeneratedMode = !isCatalogMode && !isPlatformDirect;
  // Regra anti-duplicação: em `single_game` o jogo já aparece no hero — não
  // repetimos ele na grade de "Jogo selecionado". Em `catalog` com 1 jogo,
  // também evitamos o duplo (hero + grade). Em `multi_game`/`catalog` (2+),
  // a grade é o valor da página e o hero fica sem arte de jogo específico.
  const isMultiGame = mode === "multi_game" || (isCatalogMode && gameArts.length > 1);
  const displayGames = isMultiGame ? gameArts : [];
  const heroGame = isPlatformDirect
    ? null
    : isMultiGame
      ? null
      : (primaryGame || null);
  const bonusEnabled = !isPlatformDirect && bonusOffer?.enabled !== false;
  const communityEnabled = !isPlatformDirect && communityCta?.enabled !== false;
  // Só mostramos a barra "Oferta oficial" quando há bônus real (código/CTA
  // próprio). Sem isso, repetiria o mesmo jogo do hero e polui a página.
  const hasRealBonus = Boolean(bonusOffer?.code) || Boolean(bonusEnabled && bonusOffer?.cta_label && bonusOffer.cta_label !== instanceCtx?.hype_copy?.cta_label);
  const showFeatures = isGeneratedMode && isSectionOn("features") && bonusEnabled && hasRealBonus;
  const showCommunity = isSectionOn("community") && communityEnabled && (communityCta?.label || communityCta?.url);
  const platformName = brandCtx?.brand?.name ?? null;
  const defaultCta = isCatalogMode
    ? "Acessar oportunidades"
    : mode === "odds"
      ? "Acessar oportunidades"
      : isPlatformDirect
        ? (platformName ? `Acessar ${platformName}` : "Acessar plataforma")
        : bonusEnabled && bonusOffer?.code
          ? "Resgatar bônus"
          : primaryGame?.name
            ? `Jogar ${primaryGame.name}`
            : "Jogar agora";
  const configuredCta: string | null = (bonusEnabled ? bonusOffer?.cta_label : null) || instanceCtx?.hype_copy?.cta_label || null;
  const ctaLabel: string = isGeneratedMode && configuredCta?.toLowerCase().trim() === "acessar oportunidades"
    ? defaultCta
    : configuredCta || defaultCta;
  const heroTitle = hypeTitle || (
    isCatalogMode ? "Oportunidades PlayBet"
    : isPlatformDirect ? (platformName ? `${platformName} com PlayBet` : "Oferta oficial")
    : primaryGame?.name || "Oferta oficial"
  );
  const heroSubtitle = hypeSub || (
    isCatalogMode ? "Acesso rápido às melhores oportunidades."
    : isPlatformDirect
      ? (platformName
          ? `Acesse ${platformName} agora com bônus oficial PlayBet.`
          : "Acesse a plataforma oficial com bônus PlayBet.")
      : "Oferta ativa para jogar agora."
  );
  const copyBonusCode = async () => {
    if (!bonusOffer?.code) return;
    try { await navigator.clipboard.writeText(bonusOffer.code); } catch {}
  };

  // ── Tokens da marca resolvida (nunca misturar entre plataformas) ──
  const brandStyle = brandCtx?.brand ? {
    ["--brand-primary" as any]: brandCtx.brand.palette.primary,
    ["--brand-primary-contrast" as any]: brandCtx.brand.palette.primaryContrast,
    ["--brand-secondary" as any]: brandCtx.brand.palette.secondary,
    ["--brand-surface" as any]: brandCtx.brand.palette.surface,
    ["--brand-ink" as any]: brandCtx.brand.palette.ink,
    ["--brand-display" as any]: brandCtx.brand.typography.display,
    ["--brand-body" as any]: brandCtx.brand.typography.body,
  } : undefined;

  // ── Ready ──
  return (
    <div
      className="min-h-screen text-white overflow-x-hidden lp-public-page antialiased"
      style={{
        background: brandCtx?.brand?.palette.surface || "#07070d",
        color: brandCtx?.brand?.palette.ink || "#ffffff",
        fontFamily: brandCtx?.brand?.typography.body || "Inter, system-ui, sans-serif",
        ...brandStyle,
      }}
    >

      {isSectionOn("hero") && (
        <header className="relative pt-10 pb-16 px-6">
          {/* Aurora backdrop */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[520px] h-[520px] rounded-full bg-emerald-500/20 blur-[120px]" />
            <div className="absolute top-24 right-[-80px] w-[280px] h-[280px] rounded-full bg-cyan-400/10 blur-[100px]" />
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-400/40 to-transparent" />
          </div>
          <div className="max-w-md mx-auto relative z-10 text-center">
            {isPlatformDirect && brandCtx?.brand ? (
              <div className="mb-8 flex items-center justify-center gap-3">
                <LogoSlot src={logo} name="PlayBet" className="opacity-95 justify-end" />
                <span className="text-white/30 text-lg font-light select-none leading-none">×</span>
                <BrandLogoImage
                  src={brandCtx.brand.logos.wordmark || brandCtx.brand.logos.lockup || brandCtx.brand.logos.mark}
                  name={brandCtx.brand.name}
                />
              </div>
            ) : (
              <LogoSlot src={logo} name="PlayBet" className="mx-auto mb-8 opacity-95" />
            )}
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/[0.04] backdrop-blur border border-emerald-400/20 text-emerald-300 text-[10px] font-semibold uppercase tracking-[0.14em] mb-6">
              <Zap size={11} /> {mode === "odds" ? "Em destaque" : isCatalogMode ? "Oportunidades" : isPlatformDirect ? "Parceria oficial" : "Oferta oficial"}
            </div>
            {brandCtx?.brand?.seal && (
              <div className="mb-6 flex justify-center">
                <BrandFooterSeal brand={brandCtx.brand} variant="horizontal" tone="light" compact />
              </div>
            )}
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
              disabled={!hasLink}
              className="group relative inline-flex items-center gap-2 bg-gradient-to-b from-emerald-400 to-emerald-500 hover:from-emerald-300 hover:to-emerald-400 disabled:opacity-50 text-black font-bold px-9 py-3.5 rounded-2xl text-[15px] transition-all shadow-[0_10px_30px_-8px_rgba(16,185,129,0.7)] hover:shadow-[0_14px_40px_-8px_rgba(16,185,129,0.9)] active:scale-[0.97]"
            >
              <span className="absolute inset-0 rounded-2xl bg-gradient-to-b from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition" />
              <span className="relative">{ctaLabel}</span>
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

      {isSectionOn("games") && mode !== "odds" && !isPlatformDirect && displayGames.length > 0 && (
        <section className="px-6 pb-16">
          <div className="max-w-xl mx-auto">
            <h2 className="text-center text-[11px] font-semibold uppercase tracking-[0.2em] text-gray-500 mb-5">
              {mode === "single_game" ? "Jogo selecionado" : mode === "multi_game" ? "Jogos em alta" : "Catálogo"}
            </h2>
            <div className={`grid gap-2.5 ${displayGames.length === 1 ? "grid-cols-1 max-w-[220px] mx-auto" : "grid-cols-3"}`}>
              {displayGames.map((g) => (
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
              disabled={!hasLink}
              className="inline-flex items-center gap-2 bg-gradient-to-b from-emerald-400 to-emerald-500 disabled:opacity-50 text-black font-bold px-9 py-3.5 rounded-2xl text-[15px] transition-all shadow-[0_10px_30px_-8px_rgba(16,185,129,0.7)] active:scale-[0.97]"
            >
              {ctaLabel} <ArrowRight size={17} />
            </button>
          </div>
        </section>
      )}

      {isSectionOn("footer") && (
        <footer className="border-t border-white/[0.04] py-6 px-6 flex flex-col items-center gap-3">
          {brandCtx?.brand?.seal ? (
            <BrandFooterSeal brand={brandCtx.brand} variant="horizontal" tone="light" />
          ) : null}
          <p className="text-[11px] text-gray-600 tracking-wide text-center">
            {brandCtx?.brand?.name ?? "PlayBet"} © {new Date().getFullYear()} · Jogue com responsabilidade · 18+
            {brandCtx?.brand?.seal ? ` · ${brandCtx.brand.seal.license}` : ""}
          </p>
        </footer>
      )}

    </div>
  );

}
