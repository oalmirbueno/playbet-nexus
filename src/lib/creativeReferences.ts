/**
 * Biblioteca de layouts de referência para materiais afiliados.
 * Cada preset combina uma pegada visual profissional (odds, slots, cassino,
 * bônus, cashback) com posicionamento de logo do jogo, times, bandeiras e
 * espaço reservado pro co-branding PlayBet + plataforma.
 *
 * NÃO renderiza — descreve. O Creative Studio consome via applyReference()
 * transformando cada bloco numa camada real.
 */

export type ReferenceCategory = "odds" | "slots" | "cassino" | "bonus" | "cashback" | "aposta-compartilhada";

export interface LayoutSlot {
  role:
    | "hero-art"           // imagem principal (screenshot, arte do slot, foto do jogo)
    | "game-logo"          // logo do jogo/slot
    | "team-crest-home"    // brasão time mandante
    | "team-crest-away"    // brasão time visitante
    | "league-badge"       // logo da liga/competição
    | "odd-value"          // valor da odd (2.15, +150, etc)
    | "cta"
    | "headline"
    | "subhead";
  xPct: number;
  yPct: number;
  widthPct: number;
  heightPct?: number;
  align?: "left" | "center" | "right";
}

export interface CreativeReference {
  id: string;
  category: ReferenceCategory;
  label: string;
  description: string;
  /** Formatos onde faz mais sentido — feed/story/landscape/square_wa */
  formats: string[];
  slots: LayoutSlot[];
  /** Dica de fonte de imagem — screenshot da odd real, logo oficial do clube etc. */
  sourceHint?: string;
}

export const CREATIVE_REFERENCES: CreativeReference[] = [
  {
    id: "odds-duel",
    category: "odds",
    label: "Duelo de Odds",
    description: "Confronto direto entre dois times, brasões grandes, odd destacada no centro.",
    formats: ["feed", "square_wa"],
    sourceHint: "Baixar brasões oficiais em PNG transparente. Se tiver screenshot da odd real na plataforma, colar como hero-art.",
    slots: [
      { role: "team-crest-home", xPct: 8,  yPct: 30, widthPct: 28, heightPct: 28 },
      { role: "team-crest-away", xPct: 64, yPct: 30, widthPct: 28, heightPct: 28 },
      { role: "league-badge",    xPct: 42, yPct: 12, widthPct: 16, heightPct: 8, align: "center" },
      { role: "odd-value",       xPct: 30, yPct: 62, widthPct: 40, align: "center" },
      { role: "cta",             xPct: 30, yPct: 82, widthPct: 40, align: "center" },
    ],
  },
  {
    id: "odds-shared-bet",
    category: "aposta-compartilhada",
    label: "Aposta Compartilhada",
    description: "Cartão vertical estilo bilhete: várias seleções empilhadas + odd combinada.",
    formats: ["story"],
    sourceHint: "Screenshot direto do bilhete da plataforma dá o melhor resultado.",
    slots: [
      { role: "hero-art",  xPct: 8, yPct: 20, widthPct: 84, heightPct: 55 },
      { role: "odd-value", xPct: 8, yPct: 78, widthPct: 84, align: "center" },
      { role: "cta",       xPct: 8, yPct: 90, widthPct: 84, align: "center" },
    ],
  },
  {
    id: "slot-showcase",
    category: "slots",
    label: "Slot em Destaque",
    description: "Logo do slot enorme + arte do jogo em glow, tag de RTP/jackpot.",
    formats: ["feed", "story"],
    sourceHint: "Puxar a logo/arte do provedor (Pragmatic, PG Soft etc) direto do catálogo oficial.",
    slots: [
      { role: "hero-art",  xPct: 15, yPct: 18, widthPct: 70, heightPct: 45 },
      { role: "game-logo", xPct: 15, yPct: 66, widthPct: 70, heightPct: 10, align: "center" },
      { role: "subhead",   xPct: 15, yPct: 78, widthPct: 70, align: "center" },
      { role: "cta",       xPct: 25, yPct: 88, widthPct: 50, align: "center" },
    ],
  },
  {
    id: "cassino-live",
    category: "cassino",
    label: "Cassino ao Vivo",
    description: "Foto da mesa/dealer + call editorial. Fundo escuro cinemático.",
    formats: ["landscape", "feed"],
    sourceHint: "Fotos oficiais Evolution/Pragmatic Live ou screenshot da mesa.",
    slots: [
      { role: "hero-art", xPct: 0,  yPct: 0,  widthPct: 60, heightPct: 100 },
      { role: "headline", xPct: 64, yPct: 28, widthPct: 32 },
      { role: "subhead",  xPct: 64, yPct: 52, widthPct: 32 },
      { role: "cta",      xPct: 64, yPct: 70, widthPct: 32 },
    ],
  },
  {
    id: "bonus-cashback",
    category: "bonus",
    label: "Bônus & Cashback",
    description: "Cifra grande, badge de %, CTA direto. Tipografia agressiva.",
    formats: ["feed", "story", "square_wa"],
    slots: [
      { role: "headline", xPct: 8, yPct: 22, widthPct: 84 },
      { role: "subhead",  xPct: 8, yPct: 60, widthPct: 84 },
      { role: "cta",      xPct: 8, yPct: 82, widthPct: 84, align: "center" },
    ],
  },
];

export function referencesByCategory(cat: ReferenceCategory): CreativeReference[] {
  return CREATIVE_REFERENCES.filter((r) => r.category === cat);
}

export function findReference(id: string): CreativeReference | null {
  return CREATIVE_REFERENCES.find((r) => r.id === id) ?? null;
}
