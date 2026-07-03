/**
 * Creative Studio — Canvas-based generator for affiliate materials.
 * Composes game artwork + Playbet logo + platform + CTA into
 * ready-to-share images (feed, story, landscape, whatsapp).
 *
 * 100% client-side, zero external API. External game images are pulled
 * through the `image-proxy` edge function to keep the canvas CORS-clean.
 */

import playbetLogo from "@/assets/logo-mark.png";

export const PLAYBET_LOGO_SRC = playbetLogo;

export type CreativeFormat = "feed" | "story" | "landscape" | "square_wa";
export type CreativeStyle = "hype" | "minimal" | "editorial";

/**
 * Marca camadas obrigatórias do "chrome" de marca (co-branding).
 * Elas SEMPRE têm que estar presentes em qualquer exportação:
 *  - "platform-logo"      → logo da casa/plataforma (topo-esquerda)
 *  - "playbet-signature"  → assinatura PlayBet (topo-direita, co-branding)
 *  - "legal-seal"         → selo legal 18+/SPA-MF (rodapé)
 */
export type BrandChromeSlot = "platform-logo" | "playbet-signature" | "legal-seal";

export interface TextLayer {
  kind: "text";
  id: string;
  text: string;               // may contain \n
  xPct: number;               // 0-100 (left edge of box)
  yPct: number;               // 0-100 (top edge of box)
  widthPct: number;           // 10-100
  fontSizePct: number;        // % of canvas width (e.g. 8 → 0.08 * w)
  color: string;              // hex
  weight: 400 | 500 | 600 | 700 | 800 | 900;
  align: "left" | "center" | "right";
  family: "display" | "sans" | "grotesk";
  uppercase?: boolean;
  shadow?: boolean;
  lineHeight?: number;        // multiplier (default 1.05)
  bgColor?: string | null;    // optional pill/box background
  bgPadPct?: number;          // padding for pill (% of font size)
  bgRadiusPct?: number;       // corner radius (% of height)
  chrome?: BrandChromeSlot;   // marca camada como parte do chrome bloqueado
}

export interface ImageLayer {
  kind: "image";
  id: string;
  src: string;
  label?: string;
  xPct: number;
  yPct: number;
  widthPct: number;
  heightPct: number;
  radiusPct?: number;         // % of min(w,h)
  opacity?: number;           // 0..1
  fit?: "cover" | "contain";
  glow?: string | null;       // hex accent glow color
  blur?: number;              // px of blur (for backdrop layers)
  brightness?: number;        // 0..2
  chrome?: BrandChromeSlot;   // marca camada como parte do chrome bloqueado
}

export type Layer = TextLayer | ImageLayer;


export interface CreativeInput {
  format: CreativeFormat;
  style: CreativeStyle;
  gameName?: string | null;
  gameImageUrl?: string | null;
  platformName?: string | null;
  platformColor?: string | null; // hex without #
  cta?: string;
  headline?: string;
  handle?: string; // @influencer or short link
  shortUrl?: string;
  hypeReason?: string | null;
  /** When true, auto text (headline/hype/cta/handle) is not drawn — use `layers` instead. */
  hideAutoText?: boolean;
  /** When true, auto artwork (hero image, backdrop, logo, pill) is not drawn — use `layers` instead. */
  hideAutoArt?: boolean;
  /** Custom layers (text + image) rendered on top of the artwork. */
  layers?: Layer[];
}

export interface CreativeSize { w: number; h: number; label: string; }

export const FORMAT_SIZES: Record<CreativeFormat, CreativeSize> = {
  feed:      { w: 1080, h: 1080, label: "Feed 1:1" },
  story:     { w: 1080, h: 1920, label: "Story 9:16" },
  landscape: { w: 1200, h: 628,  label: "Landscape 1.91:1" },
  square_wa: { w: 1080, h: 1080, label: "WhatsApp Status" },
};

export const STYLE_LABEL: Record<CreativeStyle, string> = {
  hype: "Hype Neon",
  minimal: "Minimal",
  editorial: "Editorial",
};

// Brand palette — Playbet blue + yellow.
const BRAND = {
  blue: "#1E5FD9",
  blueDeep: "#0B2A6B",
  yellow: "#FFC72C",
  ink: "#050B1E",
  white: "#FFFFFF",
};

/* ────────────────────────── image loading ────────────────────────── */

const SUPABASE_URL =
  (import.meta as unknown as { env?: Record<string, string> }).env?.VITE_SUPABASE_URL ??
  "";

function proxyUrl(url: string): string {
  if (!url) return url;
  // Data URLs, bundle imports and same-origin assets don't need proxying.
  if (url.startsWith("data:") || url.startsWith("blob:")) return url;
  if (url.startsWith("/")) return url;
  if (!SUPABASE_URL) return url;
  return `${SUPABASE_URL}/functions/v1/image-proxy?url=${encodeURIComponent(url)}`;
}

const imgCache = new Map<string, Promise<HTMLImageElement>>();

export function loadImage(src: string): Promise<HTMLImageElement> {
  const key = src;
  const cached = imgCache.get(key);
  if (cached) return cached;
  const p = new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load ${src}`));
    img.src = key;
  });
  imgCache.set(key, p);
  return p;
}

let fontsReadyPromise: Promise<void> | null = null;
export function ensureFonts(): Promise<void> {
  if (fontsReadyPromise) return fontsReadyPromise;
  fontsReadyPromise = (async () => {
    if (typeof document === "undefined") return;
    const linkId = "playbet-creative-fonts";
    if (!document.getElementById(linkId)) {
      const preconnect = document.createElement("link");
      preconnect.rel = "preconnect";
      preconnect.href = "https://fonts.gstatic.com";
      preconnect.crossOrigin = "anonymous";
      document.head.appendChild(preconnect);

      const link = document.createElement("link");
      link.id = linkId;
      link.rel = "stylesheet";
      link.href =
        "https://fonts.googleapis.com/css2?family=Archivo+Black&family=Space+Grotesk:wght@500;700&family=Inter:wght@500;600;800&display=swap";
      document.head.appendChild(link);
    }
    try {
      await Promise.all([
        (document as unknown as { fonts: FontFaceSet }).fonts.load('900 96px "Archivo Black"'),
        (document as unknown as { fonts: FontFaceSet }).fonts.load('700 56px "Space Grotesk"'),
        (document as unknown as { fonts: FontFaceSet }).fonts.load('800 48px "Inter"'),
      ]);
      await (document as unknown as { fonts: FontFaceSet }).fonts.ready;
    } catch {
      /* fonts optional — fallbacks are fine */
    }
  })();
  return fontsReadyPromise;
}

/* ────────────────────────── drawing helpers ────────────────────────── */

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

function drawCover(ctx: CanvasRenderingContext2D, img: HTMLImageElement, x: number, y: number, w: number, h: number) {
  const ir = img.width / img.height;
  const cr = w / h;
  let dw = w, dh = h, dx = x, dy = y;
  if (ir > cr) { dw = h * ir; dx = x - (dw - w) / 2; }
  else { dh = w / ir; dy = y - (dh - h) / 2; }
  ctx.drawImage(img, dx, dy, dw, dh);
}

function drawContain(ctx: CanvasRenderingContext2D, img: HTMLImageElement, x: number, y: number, w: number, h: number) {
  const ir = img.width / img.height;
  const cr = w / h;
  let dw = w, dh = h;
  if (ir > cr) { dh = w / ir; } else { dw = h * ir; }
  const dx = x + (w - dw) / 2;
  const dy = y + (h - dh) / 2;
  ctx.drawImage(img, dx, dy, dw, dh);
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, maxLines = 2): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line); line = w;
      if (lines.length === maxLines - 1) break;
    } else { line = test; }
  }
  if (line) lines.push(line);
  if (lines.length === maxLines && words.length > lines.join(" ").split(/\s+/).length) {
    const last = lines[lines.length - 1];
    while (ctx.measureText(last + "…").width > maxWidth && lines[lines.length - 1].length > 1) {
      lines[lines.length - 1] = lines[lines.length - 1].slice(0, -1);
    }
    lines[lines.length - 1] += "…";
  }
  return lines;
}

function hexToRgba(hex: string, alpha = 1): string {
  const h = hex.replace("#", "");
  const n = parseInt(h.length === 3 ? h.split("").map(c => c + c).join("") : h, 16);
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  return `rgba(${r},${g},${b},${alpha})`;
}

/* ────────────────────────── renderer ────────────────────────── */

export interface RenderedCreative {
  canvas: HTMLCanvasElement;
  dataUrl: string;
  blob: Blob;
  size: CreativeSize;
}

export async function renderCreative(input: CreativeInput): Promise<RenderedCreative> {
  await ensureFonts();
  const size = FORMAT_SIZES[input.format];
  const canvas = document.createElement("canvas");
  canvas.width = size.w;
  canvas.height = size.h;
  const ctx = canvas.getContext("2d")!;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  const brandAccent = input.platformColor ? `#${input.platformColor.replace("#", "")}` : BRAND.blue;
  const gameImg = input.gameImageUrl ? await loadImage(proxyUrl(input.gameImageUrl)).catch(() => null) : null;
  const logoImg = await loadImage(playbetLogo).catch(() => null);

  // Base fill
  ctx.fillStyle = BRAND.ink;
  ctx.fillRect(0, 0, size.w, size.h);

  // Blurred game backdrop (if we have art)
  if (gameImg) {
    ctx.save();
    ctx.filter = "blur(60px) saturate(1.4) brightness(0.55)";
    drawCover(ctx, gameImg, -40, -40, size.w + 80, size.h + 80);
    ctx.restore();
  }

  // Style-specific layouts (skipped when the user is driving custom text layers)
  if (!input.hideAutoText) {
    if (input.style === "minimal") {
      await drawMinimal(ctx, size, input, gameImg, logoImg, brandAccent);
    } else if (input.style === "editorial") {
      await drawEditorial(ctx, size, input, gameImg, logoImg, brandAccent);
    } else {
      await drawHype(ctx, size, input, gameImg, logoImg, brandAccent);
    }
  } else if (input.hideAutoArt) {
    // Editor mode: draw a rich decorative background instead of a flat blur.
    drawEditorBackdrop(ctx, size, brandAccent);
  } else {
    const pad = Math.round(Math.min(size.w, size.h) * 0.055);
    drawLogo(ctx, logoImg, pad, pad, Math.round(size.w * 0.24));
    if (input.platformName) {
      drawPill(ctx, size.w - pad, pad + 12, input.platformName.toUpperCase(), brandAccent, "right");
    }
  }

  // Custom layers on top (text + image)
  if (input.layers && input.layers.length) {
    await drawLayers(ctx, size, input.layers);
  }

  const dataUrl = canvas.toDataURL("image/png");
  const blob = await new Promise<Blob>((resolve) =>
    canvas.toBlob((b) => resolve(b!), "image/png", 0.95)
  );
  return { canvas, dataUrl, blob, size };
}

/* ────────────────────────── editor backdrop ────────────────────────── */

function drawEditorBackdrop(ctx: CanvasRenderingContext2D, size: CreativeSize, accent: string) {
  const { w, h } = size;
  const g = ctx.createLinearGradient(0, 0, w, h);
  g.addColorStop(0, "#050B1E");
  g.addColorStop(0.55, "#0A1740");
  g.addColorStop(1, "#050B1E");
  ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);

  const blob1 = ctx.createRadialGradient(w * 0.15, h * 0.2, 0, w * 0.15, h * 0.2, Math.max(w, h) * 0.55);
  blob1.addColorStop(0, hexToRgba(accent, 0.55));
  blob1.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = blob1; ctx.fillRect(0, 0, w, h);

  const blob2 = ctx.createRadialGradient(w * 0.85, h * 0.85, 0, w * 0.85, h * 0.85, Math.max(w, h) * 0.6);
  blob2.addColorStop(0, hexToRgba(BRAND.yellow, 0.28));
  blob2.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = blob2; ctx.fillRect(0, 0, w, h);

  ctx.save();
  ctx.strokeStyle = "rgba(255,255,255,0.035)"; ctx.lineWidth = 1;
  const step = Math.round(Math.min(w, h) / 24);
  for (let x = 0; x < w; x += step) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
  for (let y = 0; y < h; y += step) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }
  ctx.restore();

  const shade = ctx.createLinearGradient(0, h * 0.55, 0, h);
  shade.addColorStop(0, "rgba(0,0,0,0)");
  shade.addColorStop(1, "rgba(0,0,0,0.75)");
  ctx.fillStyle = shade; ctx.fillRect(0, h * 0.55, w, h * 0.45);
}

/* ────────────────────────── text layers ────────────────────────── */

const FAMILY_STACK: Record<TextLayer["family"], string> = {
  display: '"Archivo Black", "Inter", sans-serif',
  sans:    '"Inter", system-ui, sans-serif',
  grotesk: '"Space Grotesk", "Inter", sans-serif',
};

export interface BrandOverride {
  /** Substitui a logo Playbet no canto do material pela logo da plataforma resolvida. */
  logoSrc?: string;
  /** Cor de fundo da badge do nome da plataforma (padrão: azul PlayBet #1E5FD9). */
  badgeBg?: string;
  /** Selo 18+ + licença. Se presente, é estampado no rodapé do material como camada obrigatória. */
  sealSrc?: string;
  /** Rótulo textual do selo — accessible/debug. */
  sealLabel?: string;
}

export function defaultLayersFor(
  input: Pick<CreativeInput, "gameName" | "hypeReason" | "cta" | "handle" | "format" | "platformName" | "gameImageUrl">,
  opts: { includeImages?: boolean; brand?: BrandOverride } = {},
): Layer[] {
  const size = FORMAT_SIZES[input.format];
  const vertical = size.h >= size.w * 1.2;
  const landscape = size.w > size.h * 1.3;
  const headline = (input.gameName || "Novo jogo em alta");
  const layers: Layer[] = [];
  const platformLogo = opts.brand?.logoSrc || null;
  const badgeBg = opts.brand?.badgeBg || "#1E5FD9";
  const sealSrc = opts.brand?.sealSrc;

  // ── Logo da PLATAFORMA (casa) — principal, canto superior esquerdo.
  layers.push({
    kind: "image", id: crypto.randomUUID(),
    src: platformLogo || PLAYBET_LOGO_SRC,
    label: platformLogo ? `Logo ${input.platformName || "plataforma"}` : "Logo Playbet",
    xPct: 6, yPct: vertical ? 4 : 6,
    widthPct: vertical ? 28 : 24,
    heightPct: vertical ? 6 : 8,
    radiusPct: 0, opacity: 1, fit: "contain", glow: null,
    chrome: "platform-logo",
  });

  // ── Assinatura PLAYBET (painel) — sempre presente como co-branding no canto superior direito,
  //    só some quando a marca ativa já é PlayBet (evita duplicar).
  if (platformLogo) {
    layers.push({
      kind: "image", id: crypto.randomUUID(),
      src: PLAYBET_LOGO_SRC, label: "Assinatura PlayBet",
      xPct: vertical ? 74 : 78, yPct: vertical ? 4 : 6,
      widthPct: vertical ? 20 : 16,
      heightPct: vertical ? 4 : 5,
      radiusPct: 0, opacity: 0.85, fit: "contain", glow: null,
      chrome: "playbet-signature",
    });
  }



  if (input.platformName) {
    layers.push({
      kind: "text", id: crypto.randomUUID(),
      text: input.platformName,
      xPct: vertical ? 56 : 60,
      yPct: vertical ? 5.5 : 7.5,
      widthPct: vertical ? 38 : 34,
      fontSizePct: vertical ? 2.8 : 2,
      color: "#FFFFFF", weight: 700, align: "right",
      family: "grotesk", uppercase: true, shadow: false, lineHeight: 1,
      bgColor: badgeBg, bgPadPct: 55, bgRadiusPct: 50,
    });
  }

  if (opts.includeImages && input.gameImageUrl) {
    const heroWidth = vertical ? 72 : landscape ? 38 : 50;
    const heroHeight = vertical ? 42 : landscape ? 70 : 50;
    layers.push({
      kind: "image", id: crypto.randomUUID(), src: input.gameImageUrl, label: "Arte do jogo",
      xPct: vertical ? 14 : landscape ? 55 : 44,
      yPct: vertical ? 20 : landscape ? 17 : 20,
      widthPct: heroWidth, heightPct: heroHeight,
      radiusPct: 8, opacity: 1, fit: "cover", glow: "#FFC72C",
    });
  }

  layers.push({
    kind: "text", id: crypto.randomUUID(),
    text: headline,
    xPct: 6, yPct: vertical ? 68 : landscape ? 35 : 42,
    widthPct: vertical ? 88 : landscape ? 46 : 48,
    fontSizePct: vertical ? 10 : landscape ? 7.5 : 8.2,
    color: "#FFFFFF", weight: 900, align: "left",
    family: "display", uppercase: true, shadow: true, lineHeight: 1.02,
  });
  if (input.hypeReason) {
    layers.push({
      kind: "text", id: crypto.randomUUID(),
      text: input.hypeReason,
      xPct: 6, yPct: vertical ? 64 : landscape ? 30 : 36,
      widthPct: 60, fontSizePct: vertical ? 2.8 : 2.6,
      color: "#FFC72C", weight: 700, align: "left",
      family: "grotesk", uppercase: true, shadow: false, lineHeight: 1.1,
    });
  }
  layers.push({
    kind: "text", id: crypto.randomUUID(),
    text: input.cta || "JOGUE AGORA →",
    xPct: 6, yPct: vertical ? 87 : landscape ? 78 : 84,
    widthPct: vertical ? 64 : 58, fontSizePct: vertical ? 3.8 : 3.6,
    color: "#0B0F1E", weight: 800, align: "left",
    family: "sans", uppercase: true, shadow: false, lineHeight: 1.1,
    bgColor: "#FFC72C", bgPadPct: 60, bgRadiusPct: 50,
  });
  if (input.handle) {
    layers.push({
      kind: "text", id: crypto.randomUUID(),
      text: input.handle,
      xPct: 6, yPct: vertical ? 94 : landscape ? 91 : 93,
      widthPct: 60, fontSizePct: 2.2,
      color: "#FFFFFFCC", weight: 600, align: "left",
      family: "grotesk", uppercase: false, shadow: false, lineHeight: 1,
    });
  }

  // ── Selo legal obrigatório (18+ / SPA-MF) — sempre no rodapé, nunca misturar plataforma.
  if (sealSrc) {
    layers.push({
      kind: "image", id: crypto.randomUUID(), src: sealSrc,
      label: opts.brand?.sealLabel || "Selo legal 18+",
      xPct: vertical ? 4 : 6, yPct: vertical ? 96.5 : 96,
      widthPct: vertical ? 46 : 34,
      heightPct: vertical ? 3 : 3.2,
      radiusPct: 0, opacity: 0.95, fit: "contain", glow: null,
    });
  }
  return layers;
}


async function drawLayers(ctx: CanvasRenderingContext2D, size: CreativeSize, layers: Layer[]) {
  for (const L of layers) {
    if (L.kind === "image") {
      await drawImageLayer(ctx, size, L);
    } else {
      drawTextLayer(ctx, size, L);
    }
  }
}

async function drawImageLayer(ctx: CanvasRenderingContext2D, size: CreativeSize, L: ImageLayer) {
  const { w, h } = size;
  const x = (L.xPct / 100) * w;
  const y = (L.yPct / 100) * h;
  const dw = (L.widthPct / 100) * w;
  const dh = (L.heightPct / 100) * h;
  const img = await loadImage(proxyUrl(L.src)).catch(() => null);
  if (!img) return;
  const radius = Math.min(dw, dh) * ((L.radiusPct ?? 0) / 100);
  ctx.save();
  ctx.globalAlpha = L.opacity ?? 1;
  if (L.blur) ctx.filter = `blur(${L.blur}px)${L.brightness ? ` brightness(${L.brightness})` : ""}`;
  else if (L.brightness) ctx.filter = `brightness(${L.brightness})`;
  roundRect(ctx, x, y, dw, dh, radius);
  ctx.clip();
  if (L.fit === "contain") drawContain(ctx, img, x, y, dw, dh);
  else drawCover(ctx, img, x, y, dw, dh);
  ctx.restore();
  if (L.glow) {
    ctx.save();
    ctx.strokeStyle = hexToRgba(L.glow, 0.9);
    ctx.lineWidth = Math.max(2, Math.min(dw, dh) * 0.008);
    ctx.shadowColor = hexToRgba(L.glow, 0.6);
    ctx.shadowBlur = Math.min(dw, dh) * 0.06;
    roundRect(ctx, x, y, dw, dh, radius);
    ctx.stroke();
    ctx.restore();
  }
}

function drawTextLayer(ctx: CanvasRenderingContext2D, size: CreativeSize, L: TextLayer) {
  const { w, h } = size;
  const fontPx = Math.max(10, (L.fontSizePct / 100) * w);
  const boxW = (L.widthPct / 100) * w;
  const x = (L.xPct / 100) * w;
  const y = (L.yPct / 100) * h;
  const text = L.uppercase ? L.text.toUpperCase() : L.text;
  ctx.save();
  ctx.font = `${L.weight} ${fontPx}px ${FAMILY_STACK[L.family]}`;
  ctx.textBaseline = "top";
  ctx.textAlign = L.align;
  const paragraphs = text.split(/\n/);
  const lh = (L.lineHeight ?? 1.05) * fontPx;

  // Measure block for optional background pill
  if (L.bgColor) {
    let maxW = 0;
    let totalLines = 0;
    for (const p of paragraphs) {
      const lines = p.length ? wrapText(ctx, p, boxW, 12) : [""];
      totalLines += lines.length;
      for (const ln of lines) maxW = Math.max(maxW, ctx.measureText(ln).width);
    }
    const padPx = fontPx * ((L.bgPadPct ?? 40) / 100);
    const bgW = Math.min(boxW, maxW + padPx * 2);
    const bgH = totalLines * lh - (lh - fontPx) + padPx * 1.4;
    const bgX = L.align === "center" ? x + (boxW - bgW) / 2
              : L.align === "right" ? x + boxW - bgW : x;
    const radius = bgH * ((L.bgRadiusPct ?? 20) / 100);
    ctx.fillStyle = L.bgColor;
    roundRect(ctx, bgX, y - padPx * 0.2, bgW, bgH, radius);
    ctx.fill();
  }

  ctx.fillStyle = L.color;
  if (L.shadow) {
    ctx.shadowColor = "rgba(0,0,0,0.55)";
    ctx.shadowBlur = fontPx * 0.18;
  }
  let cursorY = y;
  for (const p of paragraphs) {
    const lines = p.length ? wrapText(ctx, p, boxW, 12) : [""];
    for (const ln of lines) {
      const anchorX = L.align === "center" ? x + boxW / 2 : L.align === "right" ? x + boxW : x;
      ctx.fillText(ln, anchorX, cursorY);
      cursorY += lh;
    }
  }
  ctx.restore();
}

/* ────────────────────────── styles ────────────────────────── */

async function drawHype(
  ctx: CanvasRenderingContext2D,
  size: CreativeSize,
  input: CreativeInput,
  gameImg: HTMLImageElement | null,
  logoImg: HTMLImageElement | null,
  accent: string,
) {
  const { w, h } = size;
  const vertical = h >= w * 1.2;
  const pad = Math.round(Math.min(w, h) * 0.06);

  // Vignette
  const grad = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.2, w / 2, h / 2, Math.max(w, h) * 0.75);
  grad.addColorStop(0, "rgba(0,0,0,0)");
  grad.addColorStop(1, "rgba(0,0,0,0.85)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  // Diagonal color band
  ctx.save();
  const bandH = Math.round(h * 0.22);
  ctx.translate(0, h * 0.65);
  ctx.rotate(-0.08);
  const bandGrad = ctx.createLinearGradient(0, 0, w * 1.2, bandH);
  bandGrad.addColorStop(0, hexToRgba(accent, 0.85));
  bandGrad.addColorStop(1, hexToRgba(BRAND.yellow, 0.9));
  ctx.fillStyle = bandGrad;
  ctx.fillRect(-w * 0.1, 0, w * 1.3, bandH);
  ctx.restore();

  // Hero game art
  if (gameImg) {
    const heroSize = vertical ? Math.round(w * 0.72) : Math.round(Math.min(w, h) * 0.55);
    const heroX = vertical ? (w - heroSize) / 2 : Math.round(w * 0.55);
    const heroY = vertical ? Math.round(h * 0.22) : Math.round((h - heroSize) / 2);
    ctx.save();
    roundRect(ctx, heroX, heroY, heroSize, heroSize, 32);
    ctx.clip();
    drawCover(ctx, gameImg, heroX, heroY, heroSize, heroSize);
    ctx.restore();
    // Glow ring
    ctx.save();
    ctx.strokeStyle = hexToRgba(BRAND.yellow, 0.9);
    ctx.lineWidth = 4;
    roundRect(ctx, heroX, heroY, heroSize, heroSize, 32);
    ctx.shadowColor = hexToRgba(BRAND.yellow, 0.6);
    ctx.shadowBlur = 24;
    ctx.stroke();
    ctx.restore();
  }

  // Logo top-left
  drawLogo(ctx, logoImg, pad, pad, Math.round(w * 0.28));

  // Platform pill top-right
  if (input.platformName) {
    drawPill(ctx, w - pad, pad + 12, input.platformName.toUpperCase(), accent, "right");
  }

  // Headline
  const headline = (input.headline || input.gameName || "Novo jogo em alta").toUpperCase();
  ctx.fillStyle = BRAND.white;
  const headlineSize = vertical ? Math.round(w * 0.11) : Math.round(w * 0.075);
  ctx.font = `900 ${headlineSize}px "Archivo Black", "Inter", sans-serif`;
  ctx.textBaseline = "top";
  const headlineMaxW = vertical ? w - pad * 2 : Math.round(w * 0.5) - pad;
  const lines = wrapText(ctx, headline, headlineMaxW, 3);
  const headlineY = vertical ? Math.round(h * 0.68) : Math.round(h * 0.35);
  const headlineX = vertical ? pad : pad;
  lines.forEach((ln, i) => {
    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,0.55)";
    ctx.shadowBlur = 12;
    ctx.fillText(ln, headlineX, headlineY + i * headlineSize * 1.02);
    ctx.restore();
  });

  // Sub / reason
  const subY = headlineY + lines.length * headlineSize * 1.02 + 16;
  if (input.hypeReason) {
    ctx.fillStyle = hexToRgba(BRAND.yellow, 1);
    ctx.font = `700 ${Math.round(w * 0.028)}px "Space Grotesk", sans-serif`;
    ctx.fillText(input.hypeReason.toUpperCase(), headlineX, subY);
  }

  // CTA button
  const ctaText = (input.cta || "JOGUE AGORA").toUpperCase();
  const ctaFontSize = Math.round(w * 0.038);
  ctx.font = `800 ${ctaFontSize}px "Inter", sans-serif`;
  const ctaPadX = Math.round(ctaFontSize * 0.9);
  const ctaW = Math.min(w - pad * 2, ctx.measureText(ctaText).width + ctaPadX * 2);
  const ctaH = Math.round(ctaFontSize * 2.2);
  const ctaX = pad;
  const ctaY = h - pad - ctaH - (input.handle ? Math.round(w * 0.05) : 0);
  const ctaGrad = ctx.createLinearGradient(ctaX, 0, ctaX + ctaW, 0);
  ctaGrad.addColorStop(0, BRAND.yellow);
  ctaGrad.addColorStop(1, "#FFA800");
  ctx.fillStyle = ctaGrad;
  roundRect(ctx, ctaX, ctaY, ctaW, ctaH, ctaH / 2);
  ctx.fill();
  ctx.fillStyle = BRAND.ink;
  ctx.textBaseline = "middle";
  ctx.fillText(ctaText, ctaX + ctaPadX, ctaY + ctaH / 2 + 2);

  // Handle
  if (input.handle) {
    ctx.fillStyle = hexToRgba(BRAND.white, 0.85);
    ctx.font = `600 ${Math.round(w * 0.024)}px "Space Grotesk", sans-serif`;
    ctx.textBaseline = "alphabetic";
    ctx.fillText(input.handle, pad, h - pad + 4);
  }
}

async function drawMinimal(
  ctx: CanvasRenderingContext2D,
  size: CreativeSize,
  input: CreativeInput,
  gameImg: HTMLImageElement | null,
  logoImg: HTMLImageElement | null,
  accent: string,
) {
  const { w, h } = size;
  const pad = Math.round(Math.min(w, h) * 0.07);

  // Solid background with subtle gradient
  const bg = ctx.createLinearGradient(0, 0, w, h);
  bg.addColorStop(0, "#0A1230");
  bg.addColorStop(1, BRAND.ink);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  // Thin accent line
  ctx.fillStyle = accent;
  ctx.fillRect(pad, pad + Math.round(w * 0.18), Math.round(w * 0.08), 4);

  // Logo top-left
  drawLogo(ctx, logoImg, pad, pad, Math.round(w * 0.24));

  // Game art centered card
  if (gameImg) {
    const cardSize = Math.round(Math.min(w * 0.6, h * 0.5));
    const cx = Math.round((w - cardSize) / 2);
    const cy = Math.round(h * 0.25);
    ctx.save();
    roundRect(ctx, cx, cy, cardSize, cardSize, 28);
    ctx.clip();
    drawCover(ctx, gameImg, cx, cy, cardSize, cardSize);
    ctx.restore();
    ctx.save();
    ctx.strokeStyle = hexToRgba(BRAND.white, 0.08);
    ctx.lineWidth = 2;
    roundRect(ctx, cx, cy, cardSize, cardSize, 28);
    ctx.stroke();
    ctx.restore();
  }

  // Platform label
  if (input.platformName) {
    ctx.fillStyle = hexToRgba(BRAND.white, 0.55);
    ctx.font = `600 ${Math.round(w * 0.022)}px "Space Grotesk", sans-serif`;
    ctx.textBaseline = "top";
    ctx.fillText(input.platformName.toUpperCase() + "  ·  EM ALTA", pad, Math.round(h * 0.66));
  }

  // Headline
  const headline = input.gameName || input.headline || "Novo jogo";
  ctx.fillStyle = BRAND.white;
  const hs = Math.round(w * 0.065);
  ctx.font = `800 ${hs}px "Inter", sans-serif`;
  ctx.textBaseline = "top";
  const maxW = w - pad * 2;
  const lines = wrapText(ctx, headline, maxW, 2);
  const hy = Math.round(h * 0.7);
  lines.forEach((ln, i) => ctx.fillText(ln, pad, hy + i * hs * 1.05));

  // Divider + CTA row
  const rowY = h - pad - Math.round(w * 0.09);
  ctx.fillStyle = hexToRgba(BRAND.white, 0.15);
  ctx.fillRect(pad, rowY - 20, w - pad * 2, 1);

  ctx.fillStyle = BRAND.yellow;
  ctx.font = `800 ${Math.round(w * 0.036)}px "Inter", sans-serif`;
  ctx.textBaseline = "middle";
  ctx.fillText((input.cta || "Jogar agora →").toUpperCase(), pad, rowY + 20);

  if (input.handle) {
    ctx.fillStyle = hexToRgba(BRAND.white, 0.7);
    ctx.font = `600 ${Math.round(w * 0.022)}px "Space Grotesk", sans-serif`;
    ctx.textAlign = "right";
    ctx.fillText(input.handle, w - pad, rowY + 20);
    ctx.textAlign = "left";
  }
}

async function drawEditorial(
  ctx: CanvasRenderingContext2D,
  size: CreativeSize,
  input: CreativeInput,
  gameImg: HTMLImageElement | null,
  logoImg: HTMLImageElement | null,
  accent: string,
) {
  const { w, h } = size;
  const pad = Math.round(Math.min(w, h) * 0.055);
  const vertical = h >= w * 1.2;

  // Split composition: image occupies top ~55%, ink footer with typographic block
  const imgH = vertical ? Math.round(h * 0.62) : Math.round(h * 0.55);

  // Image band
  if (gameImg) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, w, imgH);
    ctx.clip();
    drawCover(ctx, gameImg, 0, 0, w, imgH);
    // Overlay tint
    const tint = ctx.createLinearGradient(0, 0, 0, imgH);
    tint.addColorStop(0, "rgba(0,0,0,0.1)");
    tint.addColorStop(1, hexToRgba(BRAND.blueDeep, 0.85));
    ctx.fillStyle = tint;
    ctx.fillRect(0, 0, w, imgH);
    ctx.restore();
  } else {
    ctx.fillStyle = BRAND.blueDeep;
    ctx.fillRect(0, 0, w, imgH);
  }

  // Logo on top of image
  drawLogo(ctx, logoImg, pad, pad, Math.round(w * 0.24));

  // Platform pill
  if (input.platformName) {
    drawPill(ctx, w - pad, pad + 12, input.platformName.toUpperCase(), BRAND.yellow, "right", BRAND.ink);
  }

  // Footer block
  const footerY = imgH;
  ctx.fillStyle = BRAND.ink;
  ctx.fillRect(0, footerY, w, h - footerY);
  ctx.fillStyle = accent;
  ctx.fillRect(0, footerY, Math.round(w * 0.28), 6);

  ctx.fillStyle = hexToRgba(BRAND.yellow, 1);
  ctx.font = `700 ${Math.round(w * 0.022)}px "Space Grotesk", sans-serif`;
  ctx.textBaseline = "top";
  ctx.fillText("EDIÇÃO DA SEMANA · JOGO EM DESTAQUE", pad, footerY + Math.round(w * 0.035));

  const headline = input.gameName || input.headline || "Novo jogo em alta";
  ctx.fillStyle = BRAND.white;
  const hs = vertical ? Math.round(w * 0.085) : Math.round(w * 0.06);
  ctx.font = `900 ${hs}px "Archivo Black", sans-serif`;
  const maxW = w - pad * 2;
  const lines = wrapText(ctx, headline, maxW, 2);
  const hy = footerY + Math.round(w * 0.08);
  lines.forEach((ln, i) => ctx.fillText(ln, pad, hy + i * hs * 1));

  // CTA + handle at bottom
  const ctaY = h - pad - Math.round(w * 0.045);
  ctx.fillStyle = BRAND.yellow;
  ctx.font = `800 ${Math.round(w * 0.032)}px "Inter", sans-serif`;
  ctx.textBaseline = "alphabetic";
  ctx.fillText((input.cta || "Jogue agora na Playbet →"), pad, ctaY);

  if (input.handle) {
    ctx.fillStyle = hexToRgba(BRAND.white, 0.55);
    ctx.font = `500 ${Math.round(w * 0.02)}px "Space Grotesk", sans-serif`;
    ctx.textAlign = "right";
    ctx.fillText(input.handle, w - pad, ctaY);
    ctx.textAlign = "left";
  }
}

/* ────────────────────────── shared bits ────────────────────────── */

function drawLogo(
  ctx: CanvasRenderingContext2D,
  logo: HTMLImageElement | null,
  x: number, y: number, targetW: number,
) {
  if (!logo) return;
  const ratio = logo.height / logo.width;
  const h = targetW * ratio;
  drawContain(ctx, logo, x, y, targetW, h);
}

function drawPill(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, text: string,
  bg: string, align: "left" | "right" = "left",
  fg: string = "#FFFFFF",
) {
  ctx.save();
  const fontSize = Math.max(18, Math.round(ctx.canvas.width * 0.018));
  ctx.font = `700 ${fontSize}px "Space Grotesk", sans-serif`;
  const padX = fontSize * 0.9;
  const padY = fontSize * 0.55;
  const tw = ctx.measureText(text).width;
  const w = tw + padX * 2;
  const h = fontSize + padY * 2;
  const px = align === "right" ? x - w : x;
  ctx.fillStyle = bg;
  roundRect(ctx, px, y, w, h, h / 2);
  ctx.fill();
  ctx.fillStyle = fg;
  ctx.textBaseline = "middle";
  ctx.fillText(text, px + padX, y + h / 2 + 1);
  ctx.restore();
}

/* ────────────────────────── download helper ────────────────────────── */

export function downloadCreative(rendered: RenderedCreative, filename: string) {
  const url = URL.createObjectURL(rendered.blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".png") ? filename : `${filename}.png`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5_000);
}

/**
 * Download a raw asset (game art, brand logo, etc.) by URL. Routes through the
 * image-proxy so external CDNs don't break CORS/downloads. Preserves original
 * extension when detectable, otherwise defaults to .png.
 */
export async function downloadRawAsset(url: string, filename: string): Promise<void> {
  if (!url) throw new Error("URL vazia");
  const src = proxyUrl(url);
  const res = await fetch(src, { credentials: "omit" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const blob = await res.blob();
  const type = blob.type || "image/png";
  const extFromType = type.split("/")[1]?.split(";")[0] || "png";
  const extFromUrl = url.split("?")[0].split("#")[0].match(/\.(png|jpe?g|webp|gif|svg|avif)$/i)?.[1]?.toLowerCase();
  const ext = extFromUrl || extFromType || "png";
  const safe = filename.replace(/\.(png|jpe?g|webp|gif|svg|avif)$/i, "");
  const objUrl = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = objUrl;
  a.download = `${safe}.${ext}`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(objUrl), 5_000);
}

export function slugify(s: string): string {
  return (s || "criativo")
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 60);
}

/* ────────────────────────── template catalog ────────────────────────── */

export interface CreativeTemplate {
  id: string;
  name: string;
  tagline: string;
  accent: string;      // preview swatch
  build: (input: TemplateInput) => Layer[];
}

export interface TemplateInput {
  format: CreativeFormat;
  gameName?: string | null;
  gameImageUrl?: string | null;
  platformName?: string | null;
  hypeReason?: string | null;
  cta?: string;
  handle?: string;
}

const nid = () => (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : Math.random().toString(36).slice(2));

function fmtDims(fmt: CreativeFormat) {
  const s = FORMAT_SIZES[fmt];
  return { vertical: s.h >= s.w * 1.2, landscape: s.w > s.h * 1.3, square: Math.abs(s.w - s.h) < 20 };
}

/** Neon hype — bold display headline with glowing hero art. */
const tplHypeNeon: CreativeTemplate = {
  id: "hype-neon",
  name: "Hype Neon",
  tagline: "Manchete gigante + brilho amarelo",
  accent: "#FFC72C",
  build: ({ format, gameName, gameImageUrl, platformName, hypeReason, cta, handle }) => {
    const { vertical, landscape } = fmtDims(format);
    const layers: Layer[] = [
      { kind: "image", id: nid(), src: PLAYBET_LOGO_SRC, label: "Logo Playbet",
        xPct: 6, yPct: vertical ? 4 : 6, widthPct: vertical ? 26 : 22, heightPct: vertical ? 5 : 7,
        radiusPct: 0, opacity: 1, fit: "contain" },
    ];
    if (platformName) layers.push({
      kind: "text", id: nid(), text: platformName,
      xPct: vertical ? 56 : 60, yPct: vertical ? 5.5 : 7.5,
      widthPct: vertical ? 38 : 34, fontSizePct: vertical ? 2.6 : 2,
      color: "#0B0F1E", weight: 800, align: "right", family: "grotesk",
      uppercase: true, lineHeight: 1, bgColor: "#FFC72C", bgPadPct: 60, bgRadiusPct: 50,
    });
    if (gameImageUrl) layers.push({
      kind: "image", id: nid(), src: gameImageUrl, label: "Arte do jogo",
      xPct: vertical ? 14 : landscape ? 55 : 44,
      yPct: vertical ? 18 : landscape ? 15 : 18,
      widthPct: vertical ? 72 : landscape ? 40 : 52,
      heightPct: vertical ? 42 : landscape ? 72 : 54,
      radiusPct: 8, opacity: 1, fit: "cover", glow: "#FFC72C",
    });
    layers.push({
      kind: "text", id: nid(), text: (gameName || "Novo drop").toUpperCase(),
      xPct: 6, yPct: vertical ? 66 : landscape ? 40 : 74,
      widthPct: vertical ? 88 : landscape ? 46 : 88,
      fontSizePct: vertical ? 11 : landscape ? 8 : 7,
      color: "#FFFFFF", weight: 900, align: "left", family: "display",
      uppercase: true, shadow: true, lineHeight: 1,
    });
    if (hypeReason) layers.push({
      kind: "text", id: nid(), text: hypeReason,
      xPct: 6, yPct: vertical ? 62 : landscape ? 34 : 70,
      widthPct: 70, fontSizePct: 2.6,
      color: "#FFC72C", weight: 700, align: "left", family: "grotesk", uppercase: true, lineHeight: 1,
    });
    layers.push({
      kind: "text", id: nid(), text: cta || "JOGUE AGORA →",
      xPct: 6, yPct: vertical ? 88 : landscape ? 80 : 90,
      widthPct: vertical ? 60 : 50, fontSizePct: vertical ? 3.6 : 3.4,
      color: "#0B0F1E", weight: 800, align: "left", family: "sans", uppercase: true,
      lineHeight: 1.1, bgColor: "#FFC72C", bgPadPct: 60, bgRadiusPct: 50,
    });
    if (handle) layers.push({
      kind: "text", id: nid(), text: handle,
      xPct: 6, yPct: vertical ? 95 : 96, widthPct: 60, fontSizePct: 2,
      color: "#FFFFFFCC", weight: 600, align: "left", family: "grotesk", lineHeight: 1,
    });
    return layers;
  },
};

/** Editorial magazine — image band + serif-like block. */
const tplEditorial: CreativeTemplate = {
  id: "editorial",
  name: "Editorial",
  tagline: "Capa de revista, tipografia refinada",
  accent: "#1E5FD9",
  build: ({ format, gameName, gameImageUrl, platformName, hypeReason, cta, handle }) => {
    const { vertical } = fmtDims(format);
    const layers: Layer[] = [];
    if (gameImageUrl) layers.push({
      kind: "image", id: nid(), src: gameImageUrl, label: "Capa",
      xPct: 0, yPct: 0, widthPct: 100, heightPct: vertical ? 62 : 55,
      radiusPct: 0, opacity: 1, fit: "cover", brightness: 0.85,
    });
    layers.push({
      kind: "image", id: nid(), src: PLAYBET_LOGO_SRC, label: "Logo",
      xPct: 6, yPct: 5, widthPct: 22, heightPct: 5,
      radiusPct: 0, opacity: 1, fit: "contain",
    });
    if (platformName) layers.push({
      kind: "text", id: nid(), text: `— ${platformName} · edição`,
      xPct: 6, yPct: vertical ? 66 : 60, widthPct: 88, fontSizePct: 2,
      color: "#FFC72C", weight: 700, align: "left", family: "grotesk", uppercase: true, lineHeight: 1,
    });
    layers.push({
      kind: "text", id: nid(), text: gameName || "Novo capítulo",
      xPct: 6, yPct: vertical ? 70 : 66, widthPct: 88,
      fontSizePct: vertical ? 9 : 6,
      color: "#FFFFFF", weight: 900, align: "left", family: "display", uppercase: true, lineHeight: 0.98,
    });
    if (hypeReason) layers.push({
      kind: "text", id: nid(), text: hypeReason,
      xPct: 6, yPct: vertical ? 84 : 80, widthPct: 78, fontSizePct: 2.4,
      color: "#FFFFFFCC", weight: 500, align: "left", family: "grotesk", lineHeight: 1.3,
    });
    layers.push({
      kind: "text", id: nid(), text: cta || "Jogue agora →",
      xPct: 6, yPct: vertical ? 92 : 90, widthPct: 60, fontSizePct: 2.6,
      color: "#FFC72C", weight: 800, align: "left", family: "sans", uppercase: true, lineHeight: 1,
    });
    if (handle) layers.push({
      kind: "text", id: nid(), text: handle,
      xPct: 70, yPct: vertical ? 92 : 90, widthPct: 24, fontSizePct: 1.8,
      color: "#FFFFFF77", weight: 500, align: "right", family: "grotesk", lineHeight: 1,
    });
    return layers;
  },
};

/** Minimal card — centered card with restrained type. */
const tplMinimal: CreativeTemplate = {
  id: "minimal",
  name: "Minimal Card",
  tagline: "Muito espaço, foco na arte",
  accent: "#FFFFFF",
  build: ({ format, gameName, gameImageUrl, platformName, cta, handle }) => {
    const { vertical } = fmtDims(format);
    const layers: Layer[] = [
      { kind: "image", id: nid(), src: PLAYBET_LOGO_SRC, label: "Logo",
        xPct: 42, yPct: 6, widthPct: 16, heightPct: 4, radiusPct: 0, opacity: 0.9, fit: "contain" },
    ];
    if (gameImageUrl) layers.push({
      kind: "image", id: nid(), src: gameImageUrl, label: "Arte",
      xPct: vertical ? 15 : 30, yPct: vertical ? 22 : 20,
      widthPct: vertical ? 70 : 40, heightPct: vertical ? 40 : 55,
      radiusPct: 10, opacity: 1, fit: "cover",
    });
    if (platformName) layers.push({
      kind: "text", id: nid(), text: `${platformName}  ·  em alta`,
      xPct: 10, yPct: vertical ? 66 : 78, widthPct: 80, fontSizePct: 1.8,
      color: "#FFFFFF77", weight: 600, align: "center", family: "grotesk", uppercase: true, lineHeight: 1,
    });
    layers.push({
      kind: "text", id: nid(), text: gameName || "Novo jogo",
      xPct: 6, yPct: vertical ? 70 : 82, widthPct: 88,
      fontSizePct: vertical ? 7 : 4.6,
      color: "#FFFFFF", weight: 800, align: "center", family: "sans", uppercase: false, lineHeight: 1,
    });
    layers.push({
      kind: "text", id: nid(), text: cta || "Jogar agora →",
      xPct: 20, yPct: vertical ? 84 : 90, widthPct: 60, fontSizePct: 2.4,
      color: "#FFC72C", weight: 700, align: "center", family: "grotesk", uppercase: true, lineHeight: 1,
    });
    if (handle) layers.push({
      kind: "text", id: nid(), text: handle,
      xPct: 20, yPct: vertical ? 92 : 94, widthPct: 60, fontSizePct: 1.6,
      color: "#FFFFFF55", weight: 500, align: "center", family: "grotesk", lineHeight: 1,
    });
    return layers;
  },
};

/** Cutout Poster — massive display over full-bleed art. */
const tplCutoutPoster: CreativeTemplate = {
  id: "cutout-poster",
  name: "Cutout Poster",
  tagline: "Tipo cortando a arte, pôster de show",
  accent: "#FF3D71",
  build: ({ format, gameName, gameImageUrl, platformName, cta, handle }) => {
    const { vertical } = fmtDims(format);
    const layers: Layer[] = [];
    if (gameImageUrl) layers.push({
      kind: "image", id: nid(), src: gameImageUrl, label: "Fundo",
      xPct: 0, yPct: 0, widthPct: 100, heightPct: 100,
      radiusPct: 0, opacity: 1, fit: "cover", brightness: 0.7,
    });
    layers.push({
      kind: "image", id: nid(), src: PLAYBET_LOGO_SRC, label: "Logo",
      xPct: 6, yPct: 5, widthPct: 22, heightPct: 5,
      radiusPct: 0, opacity: 1, fit: "contain",
    });
    layers.push({
      kind: "text", id: nid(), text: (gameName || "Play").toUpperCase(),
      xPct: 3, yPct: vertical ? 30 : 22, widthPct: 94,
      fontSizePct: vertical ? 22 : 16,
      color: "#FFC72C", weight: 900, align: "center", family: "display",
      uppercase: true, shadow: true, lineHeight: 0.9,
    });
    if (platformName) layers.push({
      kind: "text", id: nid(), text: platformName,
      xPct: 3, yPct: vertical ? 62 : 58, widthPct: 94, fontSizePct: 3,
      color: "#FFFFFF", weight: 700, align: "center", family: "grotesk",
      uppercase: true, shadow: true, lineHeight: 1,
    });
    layers.push({
      kind: "text", id: nid(), text: cta || "JOGUE AGORA",
      xPct: 20, yPct: vertical ? 88 : 86, widthPct: 60, fontSizePct: vertical ? 3.4 : 3,
      color: "#0B0F1E", weight: 900, align: "center", family: "sans", uppercase: true,
      lineHeight: 1, bgColor: "#FFC72C", bgPadPct: 70, bgRadiusPct: 50,
    });
    if (handle) layers.push({
      kind: "text", id: nid(), text: handle,
      xPct: 3, yPct: vertical ? 95 : 94, widthPct: 94, fontSizePct: 1.8,
      color: "#FFFFFFAA", weight: 500, align: "center", family: "grotesk", lineHeight: 1,
    });
    return layers;
  },
};

/** Split Duo — arte 50/50 texto, card premium. */
const tplSplit: CreativeTemplate = {
  id: "split-duo",
  name: "Split Duo",
  tagline: "Metade arte, metade manifesto",
  accent: "#2DD4A8",
  build: ({ format, gameName, gameImageUrl, platformName, hypeReason, cta, handle }) => {
    const { vertical } = fmtDims(format);
    const layers: Layer[] = [];
    if (gameImageUrl) layers.push({
      kind: "image", id: nid(), src: gameImageUrl, label: "Arte",
      xPct: vertical ? 0 : 50, yPct: 0,
      widthPct: vertical ? 100 : 50, heightPct: vertical ? 50 : 100,
      radiusPct: 0, opacity: 1, fit: "cover",
    });
    layers.push({
      kind: "image", id: nid(), src: PLAYBET_LOGO_SRC, label: "Logo",
      xPct: vertical ? 6 : 6, yPct: vertical ? 54 : 8,
      widthPct: 22, heightPct: 5, radiusPct: 0, opacity: 1, fit: "contain",
    });
    if (platformName) layers.push({
      kind: "text", id: nid(), text: platformName,
      xPct: vertical ? 6 : 6, yPct: vertical ? 60 : 18,
      widthPct: 30, fontSizePct: 2.2,
      color: "#0B0F1E", weight: 800, align: "left", family: "grotesk",
      uppercase: true, lineHeight: 1, bgColor: "#2DD4A8", bgPadPct: 60, bgRadiusPct: 50,
    });
    layers.push({
      kind: "text", id: nid(), text: gameName || "Sua próxima jogada",
      xPct: vertical ? 6 : 6, yPct: vertical ? 66 : 28,
      widthPct: vertical ? 88 : 42,
      fontSizePct: vertical ? 8 : 5.4,
      color: "#FFFFFF", weight: 900, align: "left", family: "display", uppercase: true, lineHeight: 1,
    });
    if (hypeReason) layers.push({
      kind: "text", id: nid(), text: hypeReason,
      xPct: vertical ? 6 : 6, yPct: vertical ? 82 : 60,
      widthPct: vertical ? 88 : 42, fontSizePct: 2.2,
      color: "#FFFFFFAA", weight: 500, align: "left", family: "grotesk", lineHeight: 1.3,
    });
    layers.push({
      kind: "text", id: nid(), text: cta || "Jogar agora →",
      xPct: vertical ? 6 : 6, yPct: vertical ? 90 : 82,
      widthPct: vertical ? 60 : 42, fontSizePct: 2.6,
      color: "#0B0F1E", weight: 800, align: "left", family: "sans", uppercase: true,
      lineHeight: 1, bgColor: "#FFC72C", bgPadPct: 60, bgRadiusPct: 50,
    });
    if (handle) layers.push({
      kind: "text", id: nid(), text: handle,
      xPct: vertical ? 6 : 6, yPct: vertical ? 96 : 92,
      widthPct: 42, fontSizePct: 1.6,
      color: "#FFFFFF77", weight: 500, align: "left", family: "grotesk", lineHeight: 1,
    });
    return layers;
  },
};

/** Ticker Bar — barra inferior de notícia. */
const tplTicker: CreativeTemplate = {
  id: "ticker",
  name: "Breaking Ticker",
  tagline: "Barra estilo breaking news",
  accent: "#EF4444",
  build: ({ format, gameName, gameImageUrl, platformName, cta, handle }) => {
    const { vertical } = fmtDims(format);
    const layers: Layer[] = [];
    if (gameImageUrl) layers.push({
      kind: "image", id: nid(), src: gameImageUrl, label: "Arte",
      xPct: 0, yPct: 0, widthPct: 100, heightPct: 100,
      radiusPct: 0, opacity: 1, fit: "cover", brightness: 0.75,
    });
    layers.push({
      kind: "image", id: nid(), src: PLAYBET_LOGO_SRC, label: "Logo",
      xPct: 6, yPct: 5, widthPct: 22, heightPct: 5, radiusPct: 0, opacity: 1, fit: "contain",
    });
    layers.push({
      kind: "text", id: nid(), text: "AO VIVO",
      xPct: 78, yPct: 6, widthPct: 16, fontSizePct: 1.8,
      color: "#FFFFFF", weight: 800, align: "center", family: "grotesk",
      uppercase: true, lineHeight: 1, bgColor: "#EF4444", bgPadPct: 60, bgRadiusPct: 40,
    });
    layers.push({
      kind: "text", id: nid(), text: (gameName || "Novo jogo em alta").toUpperCase(),
      xPct: 6, yPct: vertical ? 72 : 66, widthPct: 88,
      fontSizePct: vertical ? 8 : 6,
      color: "#FFFFFF", weight: 900, align: "left", family: "display",
      uppercase: true, shadow: true, lineHeight: 1,
    });
    if (platformName) layers.push({
      kind: "text", id: nid(), text: `${platformName} · ${cta || "jogue agora"}`,
      xPct: 0, yPct: vertical ? 92 : 90, widthPct: 100, fontSizePct: 2.4,
      color: "#0B0F1E", weight: 800, align: "center", family: "grotesk",
      uppercase: true, lineHeight: 1.6, bgColor: "#FFC72C", bgPadPct: 40, bgRadiusPct: 0,
    });
    if (handle) layers.push({
      kind: "text", id: nid(), text: handle,
      xPct: 6, yPct: vertical ? 97 : 96, widthPct: 88, fontSizePct: 1.5,
      color: "#FFFFFF88", weight: 500, align: "center", family: "grotesk", lineHeight: 1,
    });
    return layers;
  },
};

/** Neon Grid — futurista, com pílulas duplas. */
const tplNeonGrid: CreativeTemplate = {
  id: "neon-grid",
  name: "Neon Grid",
  tagline: "Futurista com pílulas neon",
  accent: "#A78BFA",
  build: ({ format, gameName, gameImageUrl, platformName, hypeReason, cta, handle }) => {
    const { vertical } = fmtDims(format);
    const layers: Layer[] = [
      { kind: "image", id: nid(), src: PLAYBET_LOGO_SRC, label: "Logo",
        xPct: 6, yPct: 5, widthPct: 22, heightPct: 5, radiusPct: 0, opacity: 1, fit: "contain" },
    ];
    if (gameImageUrl) layers.push({
      kind: "image", id: nid(), src: gameImageUrl, label: "Arte",
      xPct: vertical ? 12 : 32, yPct: vertical ? 16 : 14,
      widthPct: vertical ? 76 : 36, heightPct: vertical ? 44 : 58,
      radiusPct: 50, opacity: 1, fit: "cover", glow: "#A78BFA",
    });
    if (platformName) layers.push({
      kind: "text", id: nid(), text: platformName,
      xPct: 6, yPct: vertical ? 64 : 78, widthPct: 30, fontSizePct: 1.8,
      color: "#A78BFA", weight: 700, align: "center", family: "grotesk",
      uppercase: true, lineHeight: 1, bgColor: "#1A0B3D", bgPadPct: 60, bgRadiusPct: 50,
    });
    if (hypeReason) layers.push({
      kind: "text", id: nid(), text: hypeReason,
      xPct: 40, yPct: vertical ? 64 : 78, widthPct: 30, fontSizePct: 1.8,
      color: "#FFC72C", weight: 700, align: "center", family: "grotesk",
      uppercase: true, lineHeight: 1, bgColor: "#3D2A0B", bgPadPct: 60, bgRadiusPct: 50,
    });
    layers.push({
      kind: "text", id: nid(), text: (gameName || "Novo drop").toUpperCase(),
      xPct: 6, yPct: vertical ? 72 : 84,
      widthPct: 88, fontSizePct: vertical ? 8 : 5,
      color: "#FFFFFF", weight: 900, align: "center", family: "display",
      uppercase: true, shadow: true, lineHeight: 1,
    });
    layers.push({
      kind: "text", id: nid(), text: cta || "JOGAR AGORA →",
      xPct: 20, yPct: vertical ? 88 : 92, widthPct: 60, fontSizePct: 2.6,
      color: "#0B0F1E", weight: 800, align: "center", family: "sans",
      uppercase: true, lineHeight: 1, bgColor: "#A78BFA", bgPadPct: 70, bgRadiusPct: 50,
    });
    if (handle) layers.push({
      kind: "text", id: nid(), text: handle,
      xPct: 20, yPct: vertical ? 95 : 97, widthPct: 60, fontSizePct: 1.5,
      color: "#FFFFFF77", weight: 500, align: "center", family: "grotesk", lineHeight: 1,
    });
    return layers;
  },
};

export const CREATIVE_TEMPLATES: CreativeTemplate[] = [
  tplHypeNeon, tplEditorial, tplMinimal, tplCutoutPoster, tplSplit, tplTicker, tplNeonGrid,
];

export function applyTemplate(id: string, input: TemplateInput): Layer[] {
  const t = CREATIVE_TEMPLATES.find(x => x.id === id) ?? tplHypeNeon;
  return t.build(input);
}
