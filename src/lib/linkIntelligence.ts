/**
 * Link intelligence — detecta plataforma, categoria, jogo e bilhete de odds.
 * Aceita texto colado com 1+ URLs (afiliado + aposta compartilhada) sem misturar casino/jogos.
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
  isSharedOdds: boolean;
  urls: string[];
}

export interface PlatformLike {
  id: string;
  name: string;
  slug?: string | null;
  domain_patterns?: string[] | null;
  domains?: string[] | null;
  website_url?: string | null;
}

const SHARED_ODDS_RE = /(aposta\s+compartilhada|bilhete|bet[-_\s]?slip|betslip|share[-_\s]?(bet|aposta|ticket)|bet[-_\s]?share|booking[-_\s]?code|c[oó]digo\s+(da\s+)?aposta|codigo\s+(da\s+)?aposta|palpite\s+pronto|cupom\s+de\s+aposta|coupon|ticket\s+de\s+aposta|sele[cç][oõ]es?|odd\s*total|total\s*odd)/i;

const CATEGORY_PATTERNS: Array<{ cat: LinkCategory; re: RegExp }> = [
  { cat: "odds_share", re: SHARED_ODDS_RE },
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

function safeDecode(value: string) {
  try { return decodeURIComponent(value); } catch { return value; }
}

function nestedUrlsFromUrl(url: string): string[] {
  try {
    const u = new URL(ensureUrl(url));
    const nested: string[] = [];
    u.searchParams.forEach((value) => {
      extractUrls(safeDecode(value)).forEach((candidate) => nested.push(candidate));
    });
    return Array.from(new Set(nested.filter((candidate) => candidate !== url)));
  } catch {
    return [];
  }
}

export function extractUrls(input: string): string[] {
  const raw = input.trim();
  if (!raw) return [];
  const matches = raw.match(/https?:\/\/[^\s,;|]+|(?:[\w-]+\.)+[a-z]{2,}(?:\/[^\s,;|]*)?/gi) ?? [];
  const urls = matches
    .map((u) => ensureUrl(u.replace(/[)\]}>'"]+$/g, "")))
    .filter(Boolean);
  if (!urls.length && ensureUrl(raw).startsWith("http")) return [ensureUrl(raw)];
  return Array.from(new Set(urls));
}

function textForUrl(url: string) {
  try {
    const u = new URL(ensureUrl(url));
    const parts = [u.hostname, u.pathname, u.search];
    u.searchParams.forEach((v) => parts.push(safeDecode(v)));
    return parts.join(" ");
  } catch {
    return url;
  }
}

export function isSharedOddsUrl(urlOrText: string) {
  const text = textForUrl(urlOrText);
  return SHARED_ODDS_RE.test(text) || (/(share|shared|slip|ticket|booking|coupon|bilhete|palpite)/i.test(text) && /(odd|bet|aposta|sport|esporte|sele[cç][aã]o)/i.test(text));
}

function isAffiliateLikeUrl(url: string) {
  const text = textForUrl(url);
  return /(partner|partners|affiliate|affiliates|afiliad|ref=|sub1=|sub=|afp=|click[_-]?id=|aff[_-]?sub=|utm_|campaign|campanha|promo|bonus|btag|click|go\/|\/r\/|\/ref\/)/i.test(text);
}

export function splitAffiliateAndOddsUrls(input: string) {
  const topLevelUrls = extractUrls(input);
  const nestedUrls = topLevelUrls.flatMap(nestedUrlsFromUrl);
  const urls = Array.from(new Set([...topLevelUrls, ...nestedUrls]));
  const bookmakerShareUrl = [...nestedUrls, ...topLevelUrls].find(isSharedOddsUrl) ?? (isSharedOddsUrl(input) ? topLevelUrls[0] ?? "" : "");
  const affiliateUrl = topLevelUrls.find((u) => u !== bookmakerShareUrl && isAffiliateLikeUrl(u))
    ?? topLevelUrls.find((u) => u !== bookmakerShareUrl)
    ?? topLevelUrls[0]
    ?? input.trim();
  return {
    urls,
    affiliateUrl,
    bookmakerShareUrl,
    isSharedOdds: Boolean(bookmakerShareUrl || isSharedOddsUrl(input)),
  };
}

export function parseUrl(url: string): Pick<DetectionResult, "hostname" | "path" | "query"> | null {
  try {
    const first = extractUrls(url)[0] ?? url;
    const u = new URL(ensureUrl(first));
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

    if (best === 0 && p.website_url) {
      try {
        const wh = normalizeHost(new URL(ensureUrl(p.website_url)).hostname);
        const wbase = wh.split(".").slice(-2).join(".");
        if (host === wh) { best = 60; matched = wh; }
        else if (host.includes(wbase) && wbase.length > 4) { best = 30; matched = wbase; }
      } catch { /* ignore */ }
    }

    if (best === 0) {
      const token = normalizeText(`${p.name} ${p.slug ?? ""}`).replace(/[^a-z0-9]/g, "");
      if (token.length >= 4 && host.replace(/[^a-z0-9]/g, "").includes(token)) {
        best = 25; matched = token;
      }
    }

    if (best > 0) results.push({ platformId: p.id, score: best, matchedOn: matched });
  }

  results.sort((a, b) => b.score - a.score);
  return results;
}

function scorePlatformsForUrls(urls: string[], platforms: PlatformLike[]) {
  const byPlatform = new Map<string, { platformId: string; score: number; matchedOn: string }>();
  const registerHit = (hit: { platformId: string; score: number; matchedOn: string }) => {
    const existing = byPlatform.get(hit.platformId);
    if (!existing || hit.score > existing.score) byPlatform.set(hit.platformId, hit);
  };

  for (const url of urls) {
    const parsed = parseUrl(url);
    if (parsed?.hostname) {
      for (const hit of scorePlatforms(parsed.hostname, platforms)) {
        registerHit(hit);
      }
    }

    // Some Stellar affiliate links use an Estrela tracking domain while the real
    // destination inside the query is VUPI. The nested destination is the actual
    // house/content source, so it must outrank the wrapper affiliate host.
    for (const nested of nestedUrlsFromUrl(url)) {
      const nestedParsed = parseUrl(nested);
      if (!nestedParsed?.hostname) continue;
      for (const hit of scorePlatforms(nestedParsed.hostname, platforms)) {
        registerHit({ ...hit, score: hit.score + 40, matchedOn: `dest:${hit.matchedOn}` });
      }
    }

    const decoded = normalizeText(textForUrl(url)).replace(/[^a-z0-9]/g, "");
    for (const p of platforms) {
      const tokens = [p.name, p.slug, ...(p.domain_patterns ?? []), ...(p.domains ?? [])]
        .filter(Boolean)
        .map((v) => normalizeText(String(v)).replace(/[^a-z0-9]/g, ""))
        .filter((v) => v.length >= 4);
      const token = tokens.find((t) => decoded.includes(t));
      if (!token) continue;
      const existing = byPlatform.get(p.id);
      const candidate = { platformId: p.id, score: 78, matchedOn: token };
      if (!existing || candidate.score > existing.score) byPlatform.set(p.id, candidate);
    }
  }
  return Array.from(byPlatform.values()).sort((a, b) => b.score - a.score);
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
  if (["odds_share", "odds", "sports"].includes(category || "")) return null;
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
  return null;
}

function extractNumber(value: string | null | undefined) {
  if (!value) return null;
  const m = String(value).replace(/,/g, ".").match(/\d+(?:\.\d+)?/);
  if (!m) return null;
  const n = Number(m[0]);
  return Number.isFinite(n) && n > 1 ? n : null;
}

export function extractOddsDraftFromInput(input: string) {
  const split = splitAffiliateAndOddsUrls(input);
  const texts = [input, ...split.urls.map(textForUrl)].join(" ");
  let totalOdd: number | null = null;
  let eventLabel = "";

  for (const url of split.urls) {
    try {
      const u = new URL(ensureUrl(url));
      for (const key of ["total_odd", "totalOdd", "odd_total", "odd", "odds", "price", "coef", "cotacao"]) {
        totalOdd = totalOdd ?? extractNumber(u.searchParams.get(key));
      }
      for (const key of ["event", "evento", "match", "jogo", "fixture", "title"]) {
        const v = u.searchParams.get(key);
        if (!eventLabel && v) eventLabel = safeDecode(v).replace(/[+_-]+/g, " ").trim();
      }
    } catch { /* ignore */ }
  }

  totalOdd = totalOdd ?? extractNumber((texts.match(/(?:odd\s*total|total\s*odd|odds?)\s*[:=]?\s*(\d+[,.]\d+)/i) ?? [])[1]);

  return {
    isSharedOdds: split.isSharedOdds,
    affiliate_url: split.affiliateUrl,
    bookmaker_share_url: split.bookmakerShareUrl,
    total_odd: totalOdd,
    event_label: eventLabel,
  };
}

export function detectFromUrl(url: string, platforms: PlatformLike[]): DetectionResult {
  const split = splitAffiliateAndOddsUrls(url);
  const primary = split.affiliateUrl || split.bookmakerShareUrl || url;
  const parsed = parseUrl(primary);
  const base: DetectionResult = {
    hostname: null, path: "", query: {},
    platformCandidates: [], category: null, gameSlug: null, gameName: null,
    isSharedOdds: false, urls: [],
  };
  if (!parsed) return base;

  const urls = split.urls.length ? split.urls : [primary].filter(Boolean);
  const platformCandidates = scorePlatformsForUrls(urls, platforms);
  const haystack = [url, ...urls.map(textForUrl), parsed.path, ...Object.entries(parsed.query).map(([k, v]) => `${k}=${v}`)].join(" ");
  const isSharedOdds = split.isSharedOdds || SHARED_ODDS_RE.test(haystack);
  const category = isSharedOdds ? "odds_share" : (detectCategory(haystack) ?? detectCategory(parsed.hostname!));
  const game = ["odds_share", "odds", "sports"].includes(category || "")
    ? null
    : (detectGame(haystack) ?? detectGame(parsed.path) ?? deriveGame(parsed, category));

  return {
    ...parsed,
    platformCandidates,
    category,
    gameSlug: game?.slug ?? null,
    gameName: game?.name ?? null,
    isSharedOdds,
    urls,
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
  const parsed = parseUrl(splitAffiliateAndOddsUrls(url).affiliateUrl || url);
  const hostAndName = normalizeText(`${parsed?.hostname ?? ""} ${platformName ?? ""}`);
  if (hostAndName.includes("estrela") || hostAndName.includes("vupi")) return "afp";
  if (hostAndName.includes("betano")) return "clickid";
  if (hostAndName.includes("stake")) return "aff_sub";
  if (hostAndName.includes("1win") || hostAndName.includes("alanbase")) return "click_id";

  const preferred = ["afp", "sub1", "click_id", "clickid", "aff_sub", "s1"];
  const hit = preferred.find((p) => parsed?.query[p]);
  return hit || "sub1";
}
