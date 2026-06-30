/**
 * Detecção e enriquecimento de oportunidades para a LP pública.
 * Conservador: quando não tem certeza, devolve "sports" e mantém o link original intacto.
 *
 * Regras de ouro:
 *  - Nunca sobrescrever parâmetros do afiliado/deep link (aff, btag, clickid, subid, shareCode, aposta…).
 *  - Nunca sobrescrever utm_* já presentes na URL - só adiciona se faltar.
 *  - Bloquear destino quando aponta para a própria landing pública.
 */

export type OpportunityCategory = "sports" | "casino" | "offer" | "guide";
export type LinkKind = "share" | "bet" | "deeplink" | "url";

export interface PlatformLite {
  id: string;
  name?: string | null;
  slug?: string | null;
  domains?: string[] | null;
}

export interface DetectedOpportunity {
  rawInput: string;
  destination_url: string;
  host: string | null;
  platform: PlatformLite | null;
  category: OpportunityCategory;
  kind: LinkKind;
  shareCode: string | null;
  betId: string | null;
  hasUtm: boolean;
  hasAffiliateTracking: boolean;
  utm_source: string;
  utm_medium: string;
  utm_campaign: string;
  utm_content: string;
  suggestedTitle: string;
  suggestedSubtitle: string;
  suggestedBadge: string;
  suggestedCta: string;
}

// ---------- Heurísticas de URL ----------

const SHARE_HINTS = ["/share/", "share=", "sharecode", "share_code", "?code=", "betslip", "bet_slip"];
const BET_HINTS = ["/bet/", "/aposta/", "/bets/", "betid", "bet_id", "/coupon/", "/cupom/"];

const CASINO_HINTS = [
  "casino", "cassino", "slot", "slots", "/game", "/games", "live-casino", "livecasino",
  "roleta", "roulette", "blackjack", "baccarat", "mines", "crash", "aviator",
  "fortune", "tiger", "tigrinho", "fortune-tiger", "fortune_tiger",
  "pragmatic", "pg-soft", "pgsoft", "evolution",
];
const SPORTS_HINTS = ["/sport", "/esporte", "/futebol", "/sports", "/bet", "/aposta", "/odds", "/cupom"];
const OFFER_HINTS = ["/promo", "/promocao", "/promotion", "/oferta", "/bonus", "/welcome", "/cadastr"];
const GUIDE_HINTS = ["/guia", "/blog", "/aprenda", "/tutorial", "/como-"];

const AFFILIATE_PARAMS = [
  "aff", "affid", "aff_id", "affiliate", "affiliateid", "affiliate_id",
  "btag", "b_tag", "btagid",
  "clickid", "click_id", "cid", "gclid", "fbclid",
  "subid", "sub_id", "sub", "subid1", "subid2",
  "ref", "referral", "referrer", "promo", "promocode", "promo_code",
  "tracker", "tracking", "trackid", "trk",
  "sharecode", "share_code", "share", "code", "aposta",
];

function safeUrl(input: string): URL | null {
  if (!input) return null;
  const trimmed = input.trim();
  if (!/^https?:\/\//i.test(trimmed)) return null;
  try {
    return new URL(trimmed);
  } catch {
    return null;
  }
}

function detectKind(url: URL | null, raw: string): { kind: LinkKind; shareCode: string | null; betId: string | null } {
  const lower = raw.toLowerCase();
  if (!url) {
    const onlyNumeric = /^\d{6,}$/.test(raw.trim());
    if (onlyNumeric) return { kind: "bet", shareCode: null, betId: raw.trim() };
    if (/^[a-z0-9]{4,20}$/i.test(raw.trim())) return { kind: "share", shareCode: raw.trim(), betId: null };
    return { kind: "url", shareCode: null, betId: null };
  }
  const path = url.pathname.toLowerCase();
  const q = url.search.toLowerCase();

  const shareParam =
    url.searchParams.get("code") ||
    url.searchParams.get("share") ||
    url.searchParams.get("shareCode") ||
    url.searchParams.get("share_code");
  if (shareParam) return { kind: "share", shareCode: shareParam, betId: null };
  if (SHARE_HINTS.some((h) => path.includes(h) || q.includes(h))) {
    const seg = path.split("/").filter(Boolean).pop() || null;
    return { kind: "share", shareCode: seg, betId: null };
  }

  const betParam = url.searchParams.get("betId") || url.searchParams.get("bet_id") || url.searchParams.get("aposta");
  if (betParam) return { kind: "bet", shareCode: null, betId: betParam };
  if (BET_HINTS.some((h) => path.includes(h))) {
    const seg = path.split("/").filter(Boolean).pop() || null;
    return { kind: "bet", shareCode: null, betId: seg };
  }

  if (lower.includes("deeplink") || lower.includes("deep_link")) {
    return { kind: "deeplink", shareCode: null, betId: null };
  }
  return { kind: "url", shareCode: null, betId: null };
}

function detectCategory(url: URL | null, rawInput: string): OpportunityCategory {
  const haystack = ((url ? url.hostname + url.pathname + url.search : "") + " " + rawInput).toLowerCase();
  if (CASINO_HINTS.some((h) => haystack.includes(h))) return "casino";
  if (GUIDE_HINTS.some((h) => haystack.includes(h))) return "guide";
  if (OFFER_HINTS.some((h) => haystack.includes(h))) return "offer";
  if (SPORTS_HINTS.some((h) => haystack.includes(h))) return "sports";
  return "sports";
}

function detectPlatform(url: URL | null, platforms: PlatformLite[]): PlatformLite | null {
  if (!url) return null;
  const host = url.hostname.replace(/^www\./, "").toLowerCase();
  for (const p of platforms) {
    const domains = (p.domains || []).map((d) => d.toLowerCase().replace(/^www\./, ""));
    if (domains.some((d) => host === d || host.endsWith(`.${d}`))) return p;
  }
  for (const p of platforms) {
    const slug = (p.slug || "").toLowerCase();
    if (slug && host.includes(slug)) return p;
  }
  return null;
}

function hasAffiliateTracking(url: URL | null): boolean {
  if (!url) return false;
  const keys = Array.from(url.searchParams.keys()).map((k) => k.toLowerCase());
  return keys.some((k) => AFFILIATE_PARAMS.includes(k));
}

export function slugify(s: string): string {
  return (s || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 60);
}

const CATEGORY_CTA: Record<OpportunityCategory, string> = {
  sports: "Apostar agora",
  casino: "Jogar agora",
  offer: "Resgatar oferta",
  guide: "Ler guia",
};

const CATEGORY_BADGE: Record<OpportunityCategory, string> = {
  sports: "Odd em destaque",
  casino: "Jogo em destaque",
  offer: "Oferta oficial",
  guide: "Guia rápido",
};

export interface DetectInput {
  rawInput: string;
  platforms: PlatformLite[];
  campaignSlug?: string;
  forcedCategory?: OpportunityCategory;
  channel?: { source?: string; medium?: string };
  itemSlug?: string; // ex: alemanha_paraguai, fortune_tiger
}

export function detectOpportunity({
  rawInput, platforms, campaignSlug, forcedCategory, channel, itemSlug,
}: DetectInput): DetectedOpportunity {
  const url = safeUrl(rawInput);
  const platform = detectPlatform(url, platforms);
  const category = forcedCategory || detectCategory(url, rawInput);
  const { kind, shareCode, betId } = detectKind(url, rawInput);

  let destination_url = url ? url.toString() : "";
  if (url && isSelfLandingLoop(url.toString())) destination_url = "";

  const hasUtm = !!url && Array.from(url.searchParams.keys()).some((k) => k.toLowerCase().startsWith("utm_"));
  const aff = hasAffiliateTracking(url);

  const platformSlug = slugify(platform?.slug || platform?.name || "playbet");
  const utm_source = slugify(channel?.source || "instagram");
  const utm_medium = slugify(
    channel?.medium ||
      (category === "casino" ? "bio" : category === "offer" ? "stories" : "bio"),
  );
  const utm_campaign = campaignSlug
    ? slugify(campaignSlug)
    : `oportunidades_${new Date().toISOString().slice(0, 7).replace("-", "_")}`;
  const utm_content = slugify(
    [category, platformSlug, itemSlug || (kind === "share" && shareCode) || (kind === "bet" && betId) || "card"]
      .filter(Boolean)
      .join("_"),
  );

  const suggestedTitle =
    category === "sports" ? "Aposta sugerida"
    : category === "casino" ? "Jogo em destaque"
    : category === "offer" ? "Oferta exclusiva"
    : "Guia rápido";

  const suggestedSubtitle = platform
    ? `Disponível em ${platform.name || platform.slug}`
    : "Preencha os detalhes";

  return {
    rawInput,
    destination_url,
    host: url ? url.hostname : null,
    platform,
    category,
    kind,
    shareCode,
    betId,
    hasUtm,
    hasAffiliateTracking: aff,
    utm_source,
    utm_medium,
    utm_campaign,
    utm_content,
    suggestedTitle,
    suggestedSubtitle,
    suggestedBadge: CATEGORY_BADGE[category],
    suggestedCta: CATEGORY_CTA[category],
  };
}

/**
 * Aplica UTMs PRESERVANDO TODOS os parâmetros existentes (inclusive utm_* já presentes
 * e parâmetros de afiliado/deep link). Só adiciona utm_* que ainda não existem.
 */
export function applyUtms(
  rawUrl: string,
  utms: { utm_source: string; utm_medium: string; utm_campaign: string; utm_content: string },
): string {
  if (!rawUrl) return "";
  try {
    const u = new URL(rawUrl);
    Object.entries(utms).forEach(([k, v]) => {
      if (v && !u.searchParams.has(k)) u.searchParams.set(k, v);
    });
    return u.toString();
  } catch {
    const params = new URLSearchParams(utms as any).toString();
    const sep = rawUrl.includes("?") ? "&" : "?";
    return `${rawUrl}${sep}${params}`;
  }
}

/** Bloqueia destino quando aponta para a própria LP pública. */
export function isSelfLandingLoop(url: string): boolean {
  if (!url) return false;
  try {
    const u = new URL(url);
    return /(^|\.)oportunidades\.playbet\.app\.br$/i.test(u.hostname);
  } catch {
    return false;
  }
}

/** Indica se o link parece público (sem qualquer parâmetro de afiliado/tracking). */
export function looksLikePublicNoTracking(url: string): boolean {
  const u = safeUrl(url);
  if (!u) return false;
  return !hasAffiliateTracking(u);
}

// ---------- Score por categoria ----------

const SIMPLE_MARKET_HINTS = [
  "vence", "classifica", "+1.5", "+2.5", "mais de 1.5", "mais de 2.5",
  "ambas marcam", "favorito", "dupla chance", "empate ou", "vitória",
];

export interface SportsScoreInput {
  detected: DetectedOpportunity;
  hasValidDestination: boolean;
  casa?: string;
  oddLabel?: string;
  marketName?: string;
  startsAt?: string | null;
}

export interface CasinoScoreInput {
  detected: DetectedOpportunity;
  hasValidDestination: boolean;
  casa?: string;
  gameName?: string;
  gameType?: string;
  provider?: string;
  badge?: string;
}

export interface ScoreResult {
  score: number;
  labels: string[];
  reasons: string[];
}

export function scoreSports({ detected, hasValidDestination, casa, oddLabel, marketName, startsAt }: SportsScoreInput): ScoreResult {
  let score = 0;
  const labels: string[] = [];
  const reasons: string[] = [];

  if (hasValidDestination) { score += 30; reasons.push("Link oficial válido"); }
  if (detected.platform || (casa && casa.trim())) { score += 20; reasons.push("Casa definida"); labels.push("Campanha oficial"); }
  if (oddLabel && oddLabel.trim()) { score += 15; reasons.push("Odd preenchida"); labels.push("Odd em destaque"); }
  if (marketName && SIMPLE_MARKET_HINTS.some((h) => marketName.toLowerCase().includes(h))) {
    score += 20; reasons.push("Mercado simples"); labels.push("Mercado simples");
  }
  if (startsAt) {
    const diffH = (new Date(startsAt).getTime() - Date.now()) / 3_600_000;
    if (diffH > 0 && diffH < 24) { score += 15; reasons.push("Evento nas próximas 24h"); }
  }
  return { score: Math.min(100, score), labels: Array.from(new Set(labels)), reasons };
}

export function scoreCasino({ detected, hasValidDestination, casa, gameName, gameType, provider, badge }: CasinoScoreInput): ScoreResult {
  let score = 0;
  const labels: string[] = [];
  const reasons: string[] = [];

  if (hasValidDestination) { score += 30; reasons.push("Link oficial válido"); }
  if (detected.platform || (casa && casa.trim())) { score += 20; reasons.push("Casa definida"); labels.push("Campanha oficial"); }
  if (gameName && gameName.trim()) { score += 20; reasons.push("Jogo identificado"); labels.push("Jogo em destaque"); }
  if ((gameType && gameType.trim()) || (provider && provider.trim())) { score += 15; reasons.push("Tipo/Provedor definido"); }
  if (badge && /novidade|destaque|oferta|cassino em alta/i.test(badge)) { score += 15; reasons.push("Marcado como novidade/destaque"); labels.push(badge); }
  return { score: Math.min(100, score), labels: Array.from(new Set(labels)), reasons };
}
