/**
 * Link intelligence — detecta plataforma, categoria e jogo a partir de uma URL de afiliado.
 * Roda no cliente, sem side effects. Retorna candidatos ranqueados.
 */

export type LinkCategory =
  | "casino"
  | "sports"
  | "odds"
  | "odds_share"
  | "live"
  | "crash"
  | "slots"
  | "poker"
  | "other";

export interface DetectionResult {
  hostname: string | null;
  path: string;
  query: Record<string, string>;
  platformCandidates: Array<{ platformId: string; score: number; matchedOn: string }>;
  category: LinkCategory | null;
  gameSlug: string | null;
  gameName: string | null;
}

export interface PlatformLike {
  id: string;
  name: string;
  domain_patterns?: string[] | null;
  domains?: string[] | null;
  website_url?: string | null;
}

const CATEGORY_PATTERNS: Array<{ cat: LinkCategory; re: RegExp }> = [
  { cat: "odds_share", re: /(?:ticket|bilhete|p/|share-?bet|bet-?share|compartilhad|coupon|ticket-?id)/i },
  { cat: "odds", re: /(odds?|super-?odd|boost|super-?boost|odd-?boost|acumulad|bet-?builder)/i },
  { cat: "crash", re: /(aviator|spaceman|crash|jetx|space-?xy)/i },
  { cat: "slots", re: /(slot|slots|pgsoft|pg-soft|pragmatic|fortune-?tiger|sweet-?bonanza|gates-?of-?olympus|fruit|tigrinho)/i },
  { cat: "casino", re: /(casino|cassino|mines|plinko|dragon-?tiger|roleta|roulette|baccarat|blackjack)/i },
  { cat: "live", re: /(live-?casino|ao-?vivo|live-?dealer|evolution|stream)/i },
  { cat: "poker", re: /(poker|texas|holdem)/i },
  { cat: "sports", re: /(sports?|sportbook|sportsbook|esporte|futebol|football|soccer|nba|nfl|tenis|tennis|brasileirao|copa|evento|match)/i },
];

const GAME_HINTS: Array<{ slug: string; name: string; re: RegExp }> = [
  { slug: "aviator", name: "Aviator", re: /aviator/i },
  { slug: "fortune-tiger", name: "Fortune Tiger", re: /fortune[-_ ]?tiger/i },
  { slug: "fortune-mouse", name: "Fortune Mouse", re: /fortune[-_ ]?mouse/i },
  { slug: "fortune-ox", name: "Fortune Ox", re: /fortune[-_ ]?ox/i },
  { slug: "mines", name: "Mines", re: /(?:^|[/=?_-])mines/i },
  { slug: "spaceman", name: "Spaceman", re: /spaceman/i },
  { slug: "sweet-bonanza", name: "Sweet Bonanza", re: /sweet[-_ ]?bonanza/i },
  { slug: "gates-of-olympus", name: "Gates of Olympus", re: /gates[-_ ]?of[-_ ]?olympus/i },
  { slug: "plinko", name: "Plinko", re: /plinko/i },
  { slug: "jetx", name: "JetX", re: /jet[-_ ]?x/i },
];

const GENERIC_SEGMENTS = new Set([
  "www", "go", "aff", "affiliate", "partners", "partner", "click", "redirect", "ref", "r", "link",
  "casino", "cassino", "slots", "slot", "games", "game", "play", "jogar", "sport", "sports", "esportes",
  "br", "pt", "promo", "promocao", "bonus", "login", "register", "cadastro", "landing",
]);

const GAME_PARAM_KEYS = [
  "game", "games", "game_slug", "gameName", "game_name", "casino_game", "casinoGame", "gameId", "game_id",
  "slug", "content", "modal", "launch", "providerGameId",
];

function ensureUrl(raw: string) {
  const trimmed = raw.trim();
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (/^[\w.-]+\.[a-z]{2,}(\/|\?|#|$)/i.test(trimmed)) return `https://${trimmed}`;
  return trimmed;
}

function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function slugify(value: string) {
  return normalizeText(value)
    .replace(/%[0-9a-f]{2}/gi, " ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

function titleize(slug: string) {
  return slug
    .split("-")
    .filter(Boolean)
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(" ");
}

export function parseUrl(url: string): Pick<DetectionResult, "hostname" | "path" | "query"> | null {
  try {
    const u = new URL(ensureUrl(url));
    const query: Record<string, string> = {};
    u.searchParams.forEach((v, k) => (query[k] = v));
    return { hostname: u.hostname.toLowerCase(), path: u.pathname.toLowerCase(), query };
  } catch {
    return null;
  }
}

function normalizeHost(h: string) {
  return h.replace(/^www\./, "").toLowerCase();
}

function cleanPatternHost(pattern: string) {
  try {
    return normalizeHost(new URL(ensureUrl(pattern)).hostname);
  } catch {
    return normalizeHost(pattern.replace(/^https?:\/\//, "").replace(/\/.*$/, "").replace(/\?.*$/, ""));
  }
}

export function scorePlatforms(hostname: string, platforms: PlatformLike[]) {
  const host = normalizeHost(hostname);
  const results: Array<{ platformId: string; score: number; matchedOn: string }> = [];

  for (const p of platforms) {
    let best = 0;
    let matched = "";

    // domain_patterns + domains are the primary signals (explicit admin lists)
    const patterns = [
      ...(p.domain_patterns ?? []),
      ...(p.domains ?? []),
    ];
    for (const pat of patterns) {
      const clean = cleanPatternHost(pat);
      if (!clean) continue;
      if (host === clean) { best = Math.max(best, 100); matched = clean; }
      else if (host.endsWith(`.${clean}`) || host.includes(clean)) {
        best = Math.max(best, 80); matched = clean;
      }
    }

    // Known affiliate shorteners that do not expose the bookmaker name in the host.
    const platformToken = normalizeText(`${p.name} ${(p as any).slug ?? ""}`).replace(/[^a-z0-9]/g, "");
    if (best === 0 && platformToken.includes("estrelabet") && /(^|\.)lkrh\.pro$/.test(host)) {
      best = 75;
      matched = "lkrh.pro";
    }

    // Fallback: match against platform website_url host
    if (best === 0 && p.website_url) {
      try {
        const wh = normalizeHost(new URL(p.website_url).hostname);
        const wbase = wh.split(".").slice(-2).join("."); // e.g. estrelabet.bet.br → bet.br (weak); keep for near matches
        if (host === wh) { best = 60; matched = wh; }
        else if (host.includes(wbase) && wbase.length > 4) { best = 30; matched = wbase; }
      } catch { /* ignore */ }
    }

    // Fallback: name token in hostname
    if (best === 0) {
      const token = normalizeText(p.name).replace(/[^a-z0-9]/g, "");
      if (token.length >= 4 && host.replace(/[^a-z0-9]/g, "").includes(token)) {
        best = 25; matched = token;
      }
    }

    if (best > 0) results.push({ platformId: p.id, score: best, matchedOn: matched });
  }

  results.sort((a, b) => b.score - a.score);
  return results;
}

export function detectCategory(input: string): LinkCategory | null {
  for (const { cat, re } of CATEGORY_PATTERNS) if (re.test(input)) return cat;
  return null;
}

export function detectGame(input: string): { slug: string; name: string } | null {
  for (const g of GAME_HINTS) if (g.re.test(input)) return { slug: g.slug, name: g.name };
  return null;
}

function deriveGame(parsed: Pick<DetectionResult, "path" | "query">, category: LinkCategory | null) {
  for (const [key, value] of Object.entries(parsed.query)) {
    if (!GAME_PARAM_KEYS.some((k) => k.toLowerCase() === key.toLowerCase())) continue;
    const slug = slugify(value);
    if (slug && slug.length > 2 && !/^\d+$/.test(slug) && !GENERIC_SEGMENTS.has(slug)) {
      return { slug, name: titleize(slug) };
    }
  }

  const segments = parsed.path
    .split("/")
    .map(slugify)
    .filter((s) => s.length > 2 && !/^\d+$/.test(s) && !GENERIC_SEGMENTS.has(s));
  const last = segments[segments.length - 1];
  if (last && ["casino", "slots", "crash", "live", "poker"].includes(category || "")) {
    return { slug: last, name: titleize(last) };
  }
  if (category === "odds_share") return { slug: "aposta-compartilhada", name: "Aposta compartilhada" };

  if (category === "odds") return { slug: "odds-especiais", name: "Odds especiais" };
  if (category === "sports") return { slug: "oferta-esportiva", name: "Oferta esportiva" };
  return null;
}

export function detectFromUrl(url: string, platforms: PlatformLike[]): DetectionResult {
  const parsed = parseUrl(url);
  const base: DetectionResult = {
    hostname: null, path: "", query: {},
    platformCandidates: [], category: null, gameSlug: null, gameName: null,
  };
  if (!parsed) return base;

  const platformCandidates = scorePlatforms(parsed.hostname!, platforms);

  const haystack = [
    parsed.path,
    ...Object.entries(parsed.query).map(([k, v]) => `${k}=${v}`),
  ].join(" ");

  const category = detectCategory(haystack) ?? detectCategory(parsed.hostname!);
  const game = detectGame(haystack) ?? detectGame(parsed.path) ?? deriveGame(parsed, category);

  return {
    ...parsed,
    platformCandidates,
    category,
    gameSlug: game?.slug ?? null,
    gameName: game?.name ?? null,
  };
}

export const CATEGORY_LABELS: Record<LinkCategory, string> = {
  casino: "Cassino",
  sports: "Esportes",
  odds: "Odds / Super odds",
  odds_share: "Aposta compartilhada",
  live: "Cassino ao vivo",
  crash: "Crash",
  slots: "Slots",
  poker: "Poker",
  other: "Outro",
};

export function inferAttributionParam(url: string, platformName?: string | null) {
  const parsed = parseUrl(url);
  const hostAndName = normalizeText(`${parsed?.hostname ?? ""} ${platformName ?? ""}`);
  if (hostAndName.includes("estrela") || hostAndName.includes("vupi")) return "afp";
  if (hostAndName.includes("betano")) return "clickid";
  if (hostAndName.includes("stake")) return "aff_sub";
  if (hostAndName.includes("1win") || hostAndName.includes("alanbase")) return "click_id";

  const preferred = ["afp", "sub1", "click_id", "clickid", "aff_sub", "s1"];
  const hit = preferred.find((p) => parsed?.query[p]);
  return hit || "sub1";
}
