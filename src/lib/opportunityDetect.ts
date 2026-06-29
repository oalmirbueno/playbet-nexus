/**
 * Heurísticas para detectar plataforma, tipo, shareCode/ID, UTMs
 * de um link colado pelo usuário no Assistente de Oportunidade.
 * Pensado para ser conservador — quando não tem certeza, devolve null.
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
  utm_source: string;
  utm_medium: string;
  utm_campaign: string;
  utm_content: string;
  suggestedTitle: string;
  suggestedSubtitle: string;
  suggestedBadge: string;
  suggestedCta: string;
}

const SHARE_HINTS = ["/share/", "share=", "sharecode", "share_code", "?code=", "betslip", "bet_slip"];
const BET_HINTS = ["/bet/", "/aposta/", "/bets/", "betid", "bet_id", "/coupon/", "/cupom/"];
const CASINO_HINTS = ["/casino", "/cassino", "/slots", "/live-casino", "/livecasino", "/games/", "/game/"];
const SPORTS_HINTS = ["/sport", "/esporte", "/futebol", "/sports", "/bet", "/aposta"];
const OFFER_HINTS = ["/promo", "/promocao", "/promotion", "/oferta", "/bonus", "/welcome"];

function safeUrl(input: string): URL | null {
  if (!input) return null;
  const trimmed = input.trim();
  // Bare ID / shareCode (sem http) — não é URL
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
    // Texto cru — heurística: numérico longo = betId, alfanumérico curto = share
    const onlyNumeric = /^\d{6,}$/.test(raw.trim());
    if (onlyNumeric) return { kind: "bet", shareCode: null, betId: raw.trim() };
    if (/^[a-z0-9]{4,20}$/i.test(raw.trim())) return { kind: "share", shareCode: raw.trim(), betId: null };
    return { kind: "url", shareCode: null, betId: null };
  }
  const path = url.pathname.toLowerCase();
  const q = url.search.toLowerCase();

  // ShareCode
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

  // Bet ID
  const betParam = url.searchParams.get("betId") || url.searchParams.get("bet_id");
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

function detectCategory(url: URL | null): OpportunityCategory {
  if (!url) return "sports";
  const p = (url.pathname + url.search).toLowerCase();
  if (CASINO_HINTS.some((h) => p.includes(h))) return "casino";
  if (OFFER_HINTS.some((h) => p.includes(h))) return "offer";
  if (SPORTS_HINTS.some((h) => p.includes(h))) return "sports";
  return "sports";
}

function detectPlatform(url: URL | null, platforms: PlatformLite[]): PlatformLite | null {
  if (!url) return null;
  const host = url.hostname.replace(/^www\./, "").toLowerCase();
  for (const p of platforms) {
    const domains = (p.domains || []).map((d) => d.toLowerCase().replace(/^www\./, ""));
    if (domains.some((d) => host === d || host.endsWith(`.${d}`))) return p;
  }
  // fallback por slug
  for (const p of platforms) {
    const slug = (p.slug || "").toLowerCase();
    if (slug && host.includes(slug)) return p;
  }
  return null;
}

function slugify(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 40);
}

const CATEGORY_LABEL: Record<OpportunityCategory, string> = {
  sports: "Esporte",
  casino: "Cassino",
  offer: "Oferta",
  guide: "Guia",
};

const CATEGORY_CTA: Record<OpportunityCategory, string> = {
  sports: "Apostar agora",
  casino: "Jogar agora",
  offer: "Resgatar oferta",
  guide: "Ler guia",
};

const CATEGORY_BADGE: Record<OpportunityCategory, string> = {
  sports: "Aposta do dia",
  casino: "Cassino em alta",
  offer: "Oferta oficial",
  guide: "Guia rápido",
};

export interface DetectInput {
  rawInput: string;
  platforms: PlatformLite[];
  campaignSlug?: string; // ex. "copa_jul_2026"
}

export function detectOpportunity({ rawInput, platforms, campaignSlug }: DetectInput): DetectedOpportunity {
  const url = safeUrl(rawInput);
  const platform = detectPlatform(url, platforms);
  const category = detectCategory(url);
  const { kind, shareCode, betId } = detectKind(url, rawInput);

  // Preservar destino: nunca apontar para a própria landing
  let destination_url = url ? url.toString() : "";
  if (url && /(^|\.)oportunidades\.playbet\.app\.br$/i.test(url.hostname)) {
    destination_url = ""; // bloqueia loop
  }

  const hasUtm = !!url && Array.from(url.searchParams.keys()).some((k) => k.toLowerCase().startsWith("utm_"));

  const platformSlug = platform?.slug || platform?.name || "playbet";
  const utm_source = slugify(platformSlug);
  const utm_medium = category === "casino" ? "cassino" : category === "offer" ? "oferta" : "aposta_esportiva";
  const utm_campaign = campaignSlug || `oportunidades_${new Date().toISOString().slice(0, 7).replace("-", "_")}`;
  const utm_content = kind === "share" && shareCode ? `share_${shareCode}` : kind === "bet" && betId ? `bet_${betId}` : "card";

  const suggestedTitle =
    category === "sports"
      ? "Aposta sugerida"
      : category === "casino"
        ? "Jogo em destaque"
        : category === "offer"
          ? "Oferta exclusiva"
          : "Guia rápido";

  const suggestedSubtitle = platform
    ? `Disponível em ${platform.name || platform.slug}`
    : "Preencha os detalhes do evento";

  const suggestedBadge = CATEGORY_BADGE[category];
  const suggestedCta = CATEGORY_CTA[category];

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
    utm_source,
    utm_medium,
    utm_campaign,
    utm_content,
    suggestedTitle,
    suggestedSubtitle,
    suggestedBadge,
    suggestedCta,
  };
}

/** Aplica/atualiza UTMs sem destruir parâmetros existentes (shareCode/betId). */
export function applyUtms(rawUrl: string, utms: { utm_source: string; utm_medium: string; utm_campaign: string; utm_content: string }): string {
  if (!rawUrl) return "";
  try {
    const u = new URL(rawUrl);
    Object.entries(utms).forEach(([k, v]) => {
      if (v) u.searchParams.set(k, v);
    });
    return u.toString();
  } catch {
    const params = new URLSearchParams(utms as any).toString();
    const sep = rawUrl.includes("?") ? "&" : "?";
    return `${rawUrl}${sep}${params}`;
  }
}

/** Bloqueia destino se for a própria landing de oportunidades. */
export function isSelfLandingLoop(url: string): boolean {
  if (!url) return false;
  try {
    const u = new URL(url);
    return /(^|\.)oportunidades\.playbet\.app\.br$/i.test(u.hostname);
  } catch {
    return false;
  }
}

/** Score 0–100 conservador, sem prometer ganho. */
export interface ScoreInput {
  detected: DetectedOpportunity;
  oddLabel?: string;
  marketName?: string;
  startsAt?: string | null; // ISO
  hasValidDestination: boolean;
}

export interface ScoreResult {
  score: number;
  labels: string[];
  reasons: string[];
}

const SIMPLE_MARKET_HINTS = [
  "vence", "classifica", "+1.5", "+2.5", "mais de 1.5", "mais de 2.5",
  "ambas marcam", "favorito", "dupla chance", "empate ou", "vitória",
];

export function scoreOpportunity({ detected, oddLabel, marketName, startsAt, hasValidDestination }: ScoreInput): ScoreResult {
  let score = 0;
  const labels: string[] = [];
  const reasons: string[] = [];

  if (hasValidDestination) {
    score += 30;
    reasons.push("Link oficial válido");
  }
  if (detected.platform) {
    score += 20;
    reasons.push("Plataforma definida");
    labels.push("Campanha oficial");
  }
  if (oddLabel && oddLabel.trim()) {
    score += 15;
    reasons.push("Odd preenchida");
    labels.push("Odd em destaque");
  }
  if (marketName && SIMPLE_MARKET_HINTS.some((h) => marketName.toLowerCase().includes(h))) {
    score += 20;
    reasons.push("Mercado simples");
    labels.push("Mais simples");
  }
  if (startsAt) {
    const diffH = (new Date(startsAt).getTime() - Date.now()) / 3_600_000;
    if (diffH > 0 && diffH < 24) {
      score += 15;
      reasons.push("Evento nas próximas 24h");
    }
  }
  if (detected.category === "casino") {
    labels.push("Oferta cassino");
  }

  return { score: Math.min(100, score), labels: Array.from(new Set(labels)), reasons };
}
