/**
 * Link intelligence — detecta plataforma, categoria e jogo a partir de uma URL de afiliado.
 * Roda no cliente, sem side effects. Retorna candidatos ranqueados.
 */

export type LinkCategory =
  | "casino"
  | "sports"
  | "odds"
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
  website_url?: string | null;
}

const CATEGORY_PATTERNS: Array<{ cat: LinkCategory; re: RegExp }> = [
  { cat: "crash", re: /(aviator|spaceman|crash|jetx|space-?xy)/i },
  { cat: "slots", re: /(slot|fortune-?tiger|pgsoft|pragmatic|sweet-?bonanza|gates-?of-?olympus|fruit)/i },
  { cat: "casino", re: /(casino|cassino|mines|plinko|dragon-?tiger|roleta|roulette|baccarat|blackjack)/i },
  { cat: "live", re: /(live-?casino|ao-?vivo|live-?dealer|evolution|stream)/i },
  { cat: "poker", re: /(poker|texas|holdem)/i },
  { cat: "sports", re: /(sports?|esporte|futebol|nba|nfl|tenis|tennis|brasileirao|copa|bet-?builder)/i },
  { cat: "odds", re: /(odds?|super-?odd|boost|super-?boost|acumulad)/i },
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

export function parseUrl(url: string): Pick<DetectionResult, "hostname" | "path" | "query"> | null {
  try {
    const u = new URL(url.trim());
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

export function scorePlatforms(hostname: string, platforms: PlatformLike[]) {
  const host = normalizeHost(hostname);
  const results: Array<{ platformId: string; score: number; matchedOn: string }> = [];

  for (const p of platforms) {
    let best = 0;
    let matched = "";

    // domain_patterns is the primary signal (explicit admin list)
    for (const pat of p.domain_patterns ?? []) {
      const clean = pat.replace(/^https?:\/\//, "").replace(/\/+$/, "").toLowerCase();
      if (!clean) continue;
      if (host === clean) { best = Math.max(best, 100); matched = clean; }
      else if (host.endsWith(`.${clean}`) || host.includes(clean)) {
        best = Math.max(best, 80); matched = clean;
      }
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
      const token = p.name.toLowerCase().replace(/[^a-z0-9]/g, "");
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
  const game = detectGame(haystack) ?? detectGame(parsed.path);

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
  live: "Cassino ao vivo",
  crash: "Crash",
  slots: "Slots",
  poker: "Poker",
  other: "Outro",
};
