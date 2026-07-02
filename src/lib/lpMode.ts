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
  single_game: "Jogo único",
  multi_game: "Vários jogos",
  odds: "Odds / partidas",
  catalog: "Catálogo completo",
};

export const LP_MODE_HINTS: Record<LpMode, string> = {
  single_game: "Hero com a arte do jogo e CTA direto.",
  multi_game: "Grade de jogos com CTA por card.",
  odds: "Cartelas de partidas e mercados.",
  catalog: "Todos os jogos ativos da casa.",
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
  if (mode === "odds") {
    const idx = sections.findIndex((s) => s.id === "odds");
    if (idx !== -1) sections[idx].enabled = true;
    const g = sections.findIndex((s) => s.id === "games");
    if (g !== -1) sections[g].enabled = false;
  }
  if (mode === "catalog") {
    // uses games section as full catalog
  }
  return { sections, mode };
}
