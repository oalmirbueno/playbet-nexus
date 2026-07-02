/**
 * LP mode detection - decides how the Landing Page renders
 * based on link context. Never mixes modes.
 */
export type LpMode = "single_game" | "multi_game" | "odds" | "catalog";

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
  return "catalog";
}

export const LP_MODE_LABELS: Record<LpMode, string> = {
  catalog: "LP padrão",
  single_game: "LP gerada · jogo único",
  multi_game: "LP gerada · vários jogos",
  odds: "LP odds / partidas",
};

export const LP_MODE_HINTS: Record<LpMode, string> = {
  catalog: "Modelo normal com CTA de oportunidades.",
  single_game: "Modelo direto com arte real do jogo.",
  multi_game: "Grade de jogos com CTA por card.",
  odds: "Cartelas de partidas e mercados.",
};

export const DEFAULT_SECTIONS: Array<{ id: string; label: string; enabled: boolean }> = [
  { id: "hero", label: "Hero", enabled: true },
  { id: "games", label: "Jogos", enabled: true },
  { id: "odds", label: "Odds/Partidas", enabled: false },
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

  return { sections, mode };
}
