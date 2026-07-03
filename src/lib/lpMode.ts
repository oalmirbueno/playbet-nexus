/**
 * LP mode detection - decides how the Landing Page renders
 * based on link context. Never mixes modes.
 *
 * `platform_direct` = LP limpa (só hero co-brand PlayBet + plataforma + selo + CTA).
 * Serve quando o afiliado quer mandar direto para a plataforma, sem exibir jogo/odd.
 */
export type LpMode = "single_game" | "multi_game" | "odds" | "catalog" | "platform_direct";

export interface LpModeInput {
  linkCategory?: string | null;
  gameSlug?: string | null;
  extraGameSlugs?: string[];
}

export function detectLpMode({ linkCategory, gameSlug, extraGameSlugs }: LpModeInput): LpMode {
  const cat = (linkCategory || "").toLowerCase();
  const extras = extraGameSlugs?.filter(Boolean) ?? [];
  if (cat === "odds" || cat === "sports" || cat === "sportsbook" || cat === "esportes") return "odds";
  if (gameSlug && extras.length === 0) return "single_game";
  if (extras.length >= 1 && gameSlug) return "multi_game";
  if (extras.length >= 2) return "multi_game";
  return "platform_direct";
}

export const LP_MODE_LABELS: Record<LpMode, string> = {
  catalog: "LP padrão",
  single_game: "LP gerada · jogo único",
  multi_game: "LP gerada · vários jogos",
  odds: "LP em destaque",
  platform_direct: "LP limpa · direto pra plataforma",
};

export const LP_MODE_HINTS: Record<LpMode, string> = {
  catalog: "Modelo normal com CTA de oportunidades.",
  single_game: "Modelo direto com arte real do jogo.",
  multi_game: "Grade de jogos com CTA por card.",
  odds: "Opções em destaque com CTA direto.",
  platform_direct: "Hero co-brand PlayBet + plataforma, selo legal e CTA único. Sem jogos/odds.",
};

export const DEFAULT_SECTIONS: Array<{ id: string; label: string; enabled: boolean }> = [
  { id: "hero", label: "Hero", enabled: true },
  { id: "games", label: "Jogos", enabled: true },
  { id: "odds", label: "Em destaque", enabled: false },
  { id: "features", label: "Benefícios", enabled: true },
  { id: "cta", label: "CTA final", enabled: true },
  { id: "footer", label: "Rodapé", enabled: true },
];

export function defaultLayoutConfig(mode: LpMode) {
  const sections = DEFAULT_SECTIONS.map((s) => ({ ...s }));
  const features = sections.findIndex((s) => s.id === "features");
  const games = sections.findIndex((s) => s.id === "games");
  const odds = sections.findIndex((s) => s.id === "odds");

  if (mode === "catalog") {
    if (features !== -1) sections[features].enabled = false;
    if (games !== -1) sections[games].enabled = true;
    if (odds !== -1) sections[odds].enabled = false;
  }

  if (mode === "single_game") {
    if (features !== -1) sections[features].enabled = true;
    if (games !== -1) sections[games].enabled = false;
    if (odds !== -1) sections[odds].enabled = false;
  }

  if (mode === "multi_game") {
    if (features !== -1) sections[features].enabled = true;
    if (games !== -1) sections[games].enabled = true;
    if (odds !== -1) sections[odds].enabled = false;
  }

  if (mode === "odds") {
    if (odds !== -1) sections[odds].enabled = true;
    if (games !== -1) sections[games].enabled = false;
    if (features !== -1) sections[features].enabled = false;
  }

  // LP limpa: só hero (com lockup co-brand) + rodapé. Nada de jogos/odds/benefícios.
  if (mode === "platform_direct") {
    if (features !== -1) sections[features].enabled = false;
    if (games !== -1) sections[games].enabled = false;
    if (odds !== -1) sections[odds].enabled = false;
  }

  return { sections, mode };
}

/**
 * Resolve the *effective* mode a public LP should render.
 * Never trusts a stored `single_game`/`multi_game` when the instance has no
 * game slug bound — falls back to `platform_direct` (LP limpa) so we never
 * bleed games from other links onto a clean/generated LP.
 */
export interface ResolveEffectiveLpModeInput {
  storedMode?: string | null;
  hasResolvedGameArt: boolean;
  hypeCopyGameSlug?: string | null;
}

export function resolveEffectiveLpMode({
  storedMode,
  hasResolvedGameArt,
  hypeCopyGameSlug,
}: ResolveEffectiveLpModeInput): LpMode {
  const mode = (storedMode || "catalog") as LpMode;
  const hasSelectedGame =
    hasResolvedGameArt || Boolean((hypeCopyGameSlug || "").trim());
  if ((mode === "single_game" || mode === "multi_game") && !hasSelectedGame) {
    return "platform_direct";
  }
  return mode;
}

/**
 * Strict per-instance game scoping. Only returns games whose slug is listed
 * in the instance's `game_slugs` (or matches its `hype_copy.game_slug`).
 * Prevents catalog/hyped fallback leaks when the link binds a single game.
 */
export interface ScopeGamesInput<T extends { slug?: string | null }> {
  instanceGameSlugs?: Array<string | null | undefined> | null;
  hypeCopyGameSlug?: string | null;
  available: T[];
}

export function scopeGamesForInstance<T extends { slug?: string | null }>({
  instanceGameSlugs,
  hypeCopyGameSlug,
  available,
}: ScopeGamesInput<T>): T[] {
  const norm = (v?: string | null) =>
    String(v || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  const allow = new Set<string>();
  (instanceGameSlugs ?? []).forEach((s) => {
    const n = norm(s);
    if (n) allow.add(n);
  });
  const hype = norm(hypeCopyGameSlug);
  if (hype) allow.add(hype);
  if (allow.size === 0) return [];
  return available.filter((g) => allow.has(norm(g.slug)));
}


