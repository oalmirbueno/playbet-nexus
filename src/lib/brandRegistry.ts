/**
 * Registry canônico de marcas por plataforma.
 * ⚠️ CRÍTICO: cada plataforma tem licença própria. NUNCA misturar logo/selo
 * entre plataformas — risco de multa regulatória. Todo consumidor (Creative
 * Studio, LP Instances, materiais) deve resolver a marca via `platform_account_id`
 * → `platform.name/slug` → `getBrandKit()`, sem fallback silencioso.
 */

export type BrandKey = "playbet" | "estrela-bet" | "vupi";

export interface BrandLogos {
  /** Marca isolada (ícone/símbolo) — ideal para avatar, favicon, canto de material */
  mark: string;
  /** Wordmark ou marca alternativa horizontal */
  wordmark?: string;
  /** Lockup completo (símbolo + wordmark) */
  lockup?: string;
  /** Variação alternativa do lockup */
  lockupAlt?: string;
}

export interface LegalSeal {
  horizontal: { light: string; dark: string };
  vertical: { light: string; dark: string };
  /** Nº da autorização SPA/MF exibido no selo */
  license: string;
  /** Texto acessível/aria-label */
  alt: string;
}

export interface BrandTypography {
  display: string; // headline / hero
  body: string;    // texto corrido
  numeric?: string;
}

export interface BrandPalette {
  primary: string;
  primaryContrast: string;
  secondary: string;
  surface: string;
  ink: string;
  /** Cores de fundo aprovadas para materiais (backgrounds oficiais) */
  backgrounds: { name: string; hex: string; url?: string }[];
}

export interface BrandKit {
  key: BrandKey;
  name: string;
  slugAliases: string[]; // matcher tolerante contra platform.name/slug
  logos: BrandLogos;
  seal: LegalSeal | null;
  palette: BrandPalette;
  typography: BrandTypography;
}

/* ─────────────────── ESTRELA BET ─────────────────── */
import ebMark from "@/assets/brands/estrela-bet/estrela-bet-principal.png.asset.json";
import ebMarkAlt from "@/assets/brands/estrela-bet/estrela-bet-alternativa.png.asset.json";
import ebLockup from "@/assets/brands/estrela-bet/estrela-bet-lockup-principal.png.asset.json";
import ebLockupAlt from "@/assets/brands/estrela-bet/estrela-bet-lockup-alternativa.png.asset.json";
import ebSealHLight from "@/assets/brands/estrela-bet/estrela-bet-selo-h-negativo.png.asset.json";
import ebSealHDark from "@/assets/brands/estrela-bet/estrela-bet-selo-h-preto.png.asset.json";
import ebSealVLight from "@/assets/brands/estrela-bet/estrela-bet-selo-v-negativo.png.asset.json";
import ebSealVDark from "@/assets/brands/estrela-bet/estrela-bet-selo-v-preto.png.asset.json";

/* ─────────────────── VUPI ─────────────────── */
import vupiBgViolet from "@/assets/brands/vupi/vupi-bg-violet.png.asset.json";
import vupiBgLavender from "@/assets/brands/vupi/vupi-bg-lavender.png.asset.json";
import vupiBgMidnight from "@/assets/brands/vupi/vupi-bg-midnight.png.asset.json";

const REGISTRY: Record<BrandKey, BrandKit> = {
  playbet: {
    key: "playbet",
    name: "PlayBet",
    slugAliases: ["playbet", "play-bet"],
    logos: { mark: "" }, // logo master do painel — usada no chrome, não em materiais de plataforma
    seal: null,
    palette: {
      primary: "#5B4EE8",
      primaryContrast: "#FFFFFF",
      secondary: "#9B5EEC",
      surface: "#10111C",
      ink: "#EEEEF2",
      backgrounds: [],
    },
    typography: { display: "Sora, system-ui, sans-serif", body: "Manrope, system-ui, sans-serif" },
  },

  "estrela-bet": {
    key: "estrela-bet",
    name: "Estrela Bet",
    slugAliases: ["estrela-bet", "estrelabet", "estrela bet", "estrela_bet"],
    logos: {
      mark: ebMark.url,
      wordmark: ebMarkAlt.url,
      lockup: ebLockup.url,
      lockupAlt: ebLockupAlt.url,
    },
    seal: {
      horizontal: { light: ebSealHLight.url, dark: ebSealHDark.url },
      vertical: { light: ebSealVLight.url, dark: ebSealVDark.url },
      license: "SPA/MF nº 320/2025",
      alt: "18+ Jogue com responsabilidade. Autorização SPA/MF nº 320/2025",
    },
    palette: {
      primary: "#C69B5B",   // dourado da estrela
      primaryContrast: "#0A1428",
      secondary: "#0A1428", // dark navy do wordmark
      surface: "#0A1428",
      ink: "#F5F1EA",
      backgrounds: [
        { name: "Dark Navy", hex: "#0A1428" },
        { name: "Gold",      hex: "#C69B5B" },
        { name: "Ivory",     hex: "#F5F1EA" },
      ],
    },
    typography: { display: "Sora, system-ui, sans-serif", body: "Manrope, system-ui, sans-serif" },
  },

  vupi: {
    key: "vupi",
    name: "VUPI",
    slugAliases: ["vupi", "vupibet", "vupi-bet"],
    logos: { mark: "" }, // aguardando upload da logo VUPI
    seal: null,          // aguardando selo + nº autorização VUPI
    palette: {
      primary: "#5A00C2",
      primaryContrast: "#FFFFFF",
      secondary: "#E2DBFF",
      surface: "#090B1B",
      ink: "#E2DBFF",
      backgrounds: [
        { name: "Violet",   hex: "#5A00C2", url: vupiBgViolet.url },
        { name: "Lavender", hex: "#E2DBFF", url: vupiBgLavender.url },
        { name: "Midnight", hex: "#090B1B", url: vupiBgMidnight.url },
      ],
    },
    typography: {
      display: '"Playfair Display", Georgia, serif',
      body: '"Articulat CF", "Inter", system-ui, sans-serif',
    },
  },
};

/** Normaliza para matching tolerante contra platform.name/slug do banco. */
function norm(s: string | null | undefined): string {
  return (s ?? "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
}

/** Resolve a marca por qualquer identificador vindo do banco (nome, slug). */
export function resolveBrand(platformNameOrSlug: string | null | undefined): BrandKit | null {
  const n = norm(platformNameOrSlug);
  if (!n) return null;
  for (const kit of Object.values(REGISTRY)) {
    if (kit.slugAliases.some(a => norm(a) === n) || norm(kit.name) === n) return kit;
  }
  return null;
}

export function getBrandKit(key: BrandKey): BrandKit {
  return REGISTRY[key];
}

export function listBrands(): BrandKit[] {
  return Object.values(REGISTRY);
}

/** True quando a marca está pronta para renderizar material com selo legal. */
export function isBrandLegallyReady(kit: BrandKit | null): boolean {
  return !!(kit && kit.logos.mark && kit.seal);
}
