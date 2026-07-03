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
    | "odd-label"          // rótulo da odd ("Vitória do mandante", "Over 2.5", etc)
    | "vs-divider"         // "VS" tipográfico entre times
    | "match-info"         // data/hora/estádio ("Sáb 18:30 · Allianz")
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
    label: "Duelo de Odds (Feed)",
    description: "Confronto direto: brasões grandes lado a lado, VS central, liga acima, odd em destaque abaixo.",
    formats: ["feed", "square_wa"],
    sourceHint: "Use o botão “Buscar clube” para puxar o brasão oficial em PNG. Se tiver screenshot da odd real, cole em ‘Arte principal’ como bônus.",
    slots: [
      { role: "league-badge",    xPct: 42, yPct: 13, widthPct: 16, heightPct: 8, align: "center" },
      { role: "match-info",      xPct: 15, yPct: 22, widthPct: 70, align: "center" },
      { role: "team-crest-home", xPct: 8,  yPct: 32, widthPct: 30, heightPct: 30 },
      { role: "vs-divider",      xPct: 40, yPct: 40, widthPct: 20, align: "center" },
      { role: "team-crest-away", xPct: 62, yPct: 32, widthPct: 30, heightPct: 30 },
      { role: "odd-label",       xPct: 10, yPct: 68, widthPct: 80, align: "center" },
      { role: "odd-value",       xPct: 25, yPct: 72, widthPct: 50, align: "center" },
      { role: "cta",             xPct: 22, yPct: 88, widthPct: 56, align: "center" },
    ],
  },
  {
    id: "odds-duel-story",
    category: "odds",
    label: "Duelo de Odds (Story)",
    description: "Versão vertical do duelo: liga no topo, brasões empilhados sobre VS, odd gigante, CTA no rodapé.",
    formats: ["story"],
    sourceHint: "Ideal pra stories no Instagram/TikTok. Brasões oficiais em PNG transparente ficam nítidos.",
    slots: [
      { role: "league-badge",    xPct: 40, yPct: 8,  widthPct: 20, heightPct: 6, align: "center" },
      { role: "match-info",      xPct: 10, yPct: 15, widthPct: 80, align: "center" },
      { role: "team-crest-home", xPct: 8,  yPct: 22, widthPct: 36, heightPct: 22 },
      { role: "vs-divider",      xPct: 40, yPct: 26, widthPct: 20, align: "center" },
      { role: "team-crest-away", xPct: 56, yPct: 22, widthPct: 36, heightPct: 22 },
      { role: "odd-label",       xPct: 8,  yPct: 52, widthPct: 84, align: "center" },
      { role: "odd-value",       xPct: 15, yPct: 58, widthPct: 70, align: "center" },
      { role: "cta",             xPct: 15, yPct: 88, widthPct: 70, align: "center" },
    ],
  },
  {
    id: "odds-shared-bet",
    category: "aposta-compartilhada",
    label: "Aposta Compartilhada (Story)",
    description: "Cartão vertical estilo bilhete: screenshot do bilhete + odd combinada + CTA.",
    formats: ["story"],
    sourceHint: "Cole o screenshot direto do bilhete compartilhado — usa 'Capturar do link' pra automatizar.",
    slots: [
      { role: "hero-art",  xPct: 8,  yPct: 15, widthPct: 84, heightPct: 60 },
      { role: "odd-label", xPct: 8,  yPct: 77, widthPct: 84, align: "center" },
      { role: "odd-value", xPct: 8,  yPct: 80, widthPct: 84, align: "center" },
      { role: "cta",       xPct: 15, yPct: 90, widthPct: 70, align: "center" },
    ],
  },
  {
    id: "odds-shared-feed",
    category: "aposta-compartilhada",
    label: "Aposta Compartilhada (Feed)",
    description: "Bilhete à esquerda + odd/CTA à direita. Formato editorial para feed.",
    formats: ["feed", "square_wa"],
    sourceHint: "Screenshot do bilhete à esquerda, texto/CTA à direita — funciona pra multi/simples.",
    slots: [
      { role: "hero-art",  xPct: 6,  yPct: 20, widthPct: 46, heightPct: 68 },
      { role: "odd-label", xPct: 56, yPct: 30, widthPct: 38, align: "left" },
      { role: "odd-value", xPct: 56, yPct: 40, widthPct: 38, align: "left" },
      { role: "subhead",   xPct: 56, yPct: 62, widthPct: 38, align: "left" },
      { role: "cta",       xPct: 56, yPct: 82, widthPct: 38, align: "left" },
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
    id: "cassino-share",
    category: "cassino",
    label: "Cassino Multiplicador",
    description: "Screenshot da rodada + multiplicador gigante ('523x'), estilo big win.",
    formats: ["story", "feed"],
    sourceHint: "Print de rodada boa (Aviator, Mines, Fortune Tiger) + multiplicador. Big win vende.",
    slots: [
      { role: "hero-art",  xPct: 10, yPct: 15, widthPct: 80, heightPct: 45 },
      { role: "odd-label", xPct: 10, yPct: 63, widthPct: 80, align: "center" },
      { role: "odd-value", xPct: 15, yPct: 68, widthPct: 70, align: "center" },
      { role: "cta",       xPct: 20, yPct: 88, widthPct: 60, align: "center" },
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

/* ────────────────────────── applyReference ──────────────────────────
 * Transforma um CreativeReference + contexto (marca + link + fills) em
 * um array de Layers pronto para o Creative Studio. Já adiciona o frame
 * obrigatório (logo plataforma + assinatura PlayBet + selo legal).
 */
import type { Layer, TextLayer, ImageLayer, CreativeFormat } from "./creativeStudio";
import { FORMAT_SIZES } from "./creativeStudio";

/** Preenchimentos que o usuário fornece por slot antes de aplicar. */
export interface ReferenceSlotFill {
  role: LayoutSlot["role"];
  /** URL de imagem (para hero-art, brasões, logos, badges de liga). */
  imageUrl?: string;
  /** Texto (para odd-value, headline, subhead, cta). */
  text?: string;
}

export interface ApplyReferenceCtx {
  format: CreativeFormat;
  /** Frame de marca: logo da plataforma + selo legal + cor CTA. */
  brand: {
    platformName?: string | null;
    platformLogoSrc?: string | null;
    playbetLogoSrc: string;
    ctaColor?: string | null;   // background do CTA (primary da marca)
    sealSrc?: string | null;
    sealLabel?: string | null;
  };
  link?: {
    gameName?: string | null;
    gameIconUrl?: string | null;
    hypeReason?: string | null;
    shortUrl?: string | null;
  } | null;
  /** Overrides por slot (imagem/texto) escolhidos no painel. */
  fills?: ReferenceSlotFill[];
}

const uid = () => (typeof crypto !== "undefined" && crypto.randomUUID
  ? crypto.randomUUID()
  : `id-${Math.random().toString(36).slice(2)}-${Date.now()}`);

function fillFor(role: LayoutSlot["role"], fills?: ReferenceSlotFill[]): ReferenceSlotFill | undefined {
  return fills?.find((f) => f.role === role);
}

function slotToLayer(slot: LayoutSlot, ctx: ApplyReferenceCtx): Layer | null {
  const fill = fillFor(slot.role, ctx.fills);
  const fmt = FORMAT_SIZES[ctx.format];
  const vertical = fmt.h >= fmt.w * 1.2;

  const base = {
    id: uid(),
    xPct: slot.xPct,
    yPct: slot.yPct,
    widthPct: slot.widthPct,
  };

  // ── Slots de IMAGEM
  if (slot.role === "hero-art" || slot.role === "game-logo"
    || slot.role === "team-crest-home" || slot.role === "team-crest-away"
    || slot.role === "league-badge") {
    const src =
      fill?.imageUrl ||
      (slot.role === "game-logo" || slot.role === "hero-art"
        ? ctx.link?.gameIconUrl || undefined
        : undefined);
    if (!src) return null; // sem imagem, não cria a camada — usuário precisa preencher
    const layer: ImageLayer = {
      kind: "image",
      ...base,
      src,
      label:
        slot.role === "hero-art" ? "Arte principal" :
        slot.role === "game-logo" ? "Logo do jogo" :
        slot.role === "team-crest-home" ? "Brasão mandante" :
        slot.role === "team-crest-away" ? "Brasão visitante" :
        "Liga",
      heightPct: slot.heightPct ?? slot.widthPct,
      radiusPct: slot.role === "hero-art" ? 6 : 0,
      opacity: 1,
      fit: slot.role === "hero-art" ? "cover" : "contain",
      glow: slot.role === "hero-art" ? (ctx.brand.ctaColor || null) : null,
    };
    return layer;
  }

  // ── Slots de TEXTO
  const align = slot.align || "left";
  if (slot.role === "odd-value") {
    const text = (fill?.text || "2.15").trim();
    return {
      kind: "text", ...base, text,
      fontSizePct: vertical ? 18 : 14,
      color: "#FFFFFF", weight: 900, align,
      family: "display", uppercase: true, shadow: true, lineHeight: 1,
    } satisfies TextLayer;
  }
  if (slot.role === "headline") {
    const text = fill?.text || ctx.link?.hypeReason || ctx.link?.gameName || "Manchete";
    return {
      kind: "text", ...base, text,
      fontSizePct: vertical ? 9 : 7.5,
      color: "#FFFFFF", weight: 900, align,
      family: "display", uppercase: true, shadow: true, lineHeight: 1.02,
    } satisfies TextLayer;
  }
  if (slot.role === "subhead") {
    const text = fill?.text || ctx.brand.platformName || "Aposte com a Playbet";
    return {
      kind: "text", ...base, text,
      fontSizePct: vertical ? 4.2 : 3.4,
      color: "#FFFFFFCC", weight: 500, align,
      family: "grotesk", uppercase: false, shadow: false, lineHeight: 1.15,
    } satisfies TextLayer;
  }
  if (slot.role === "cta") {
    const text = (fill?.text || "APOSTAR AGORA →").trim();
    return {
      kind: "text", ...base, text,
      fontSizePct: vertical ? 4.5 : 3.6,
      color: "#0B0B0F", weight: 800, align,
      family: "grotesk", uppercase: true, shadow: false, lineHeight: 1,
      bgColor: ctx.brand.ctaColor || "#FFC72C",
      bgPadPct: 60, bgRadiusPct: 50,
    } satisfies TextLayer;
  }
  return null;
}

/** Frame obrigatório de marca: logo plataforma (topo-esq), assinatura PlayBet (topo-dir), selo legal (rodapé). */
function brandFrame(ctx: ApplyReferenceCtx): Layer[] {
  const fmt = FORMAT_SIZES[ctx.format];
  const vertical = fmt.h >= fmt.w * 1.2;
  const layers: Layer[] = [];
  const platformLogo = ctx.brand.platformLogoSrc || ctx.brand.playbetLogoSrc;

  layers.push({
    kind: "image", id: uid(),
    src: platformLogo, label: `Logo ${ctx.brand.platformName || "plataforma"}`,
    xPct: 6, yPct: vertical ? 4 : 6,
    widthPct: vertical ? 28 : 24, heightPct: vertical ? 6 : 8,
    radiusPct: 0, opacity: 1, fit: "contain", glow: null,
    chrome: "platform-logo",
  });

  if (ctx.brand.platformLogoSrc) {
    layers.push({
      kind: "image", id: uid(),
      src: ctx.brand.playbetLogoSrc, label: "Assinatura PlayBet",
      xPct: vertical ? 74 : 78, yPct: vertical ? 4 : 6,
      widthPct: vertical ? 20 : 16, heightPct: vertical ? 4 : 5,
      radiusPct: 0, opacity: 0.85, fit: "contain", glow: null,
      chrome: "playbet-signature",
    });
  }

  if (ctx.brand.sealSrc) {
    layers.push({
      kind: "image", id: uid(),
      src: ctx.brand.sealSrc, label: ctx.brand.sealLabel || "Selo legal 18+",
      xPct: vertical ? 4 : 6, yPct: vertical ? 96.5 : 96,
      widthPct: vertical ? 46 : 34, heightPct: vertical ? 3 : 3.2,
      radiusPct: 0, opacity: 0.95, fit: "contain", glow: null,
      chrome: "legal-seal",
    });
  }
  return layers;
}


export function applyReference(ref: CreativeReference, ctx: ApplyReferenceCtx): Layer[] {
  const frame = brandFrame(ctx);
  const content = ref.slots
    .map((s) => slotToLayer(s, ctx))
    .filter((l): l is Layer => l !== null);
  return [...frame, ...content];
}

/** Slots que exigem uma URL de imagem preenchida pelo usuário (não têm fallback do link). */
export function requiredImageSlots(ref: CreativeReference): LayoutSlot[] {
  return ref.slots.filter((s) =>
    s.role === "team-crest-home" ||
    s.role === "team-crest-away" ||
    s.role === "league-badge"
  );
}
