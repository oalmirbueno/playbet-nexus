/**
 * Creative Studio — Canvas-based generator for affiliate materials.
 * Composes game artwork + Playbet logo + platform + CTA into
 * ready-to-share images (feed, story, landscape, whatsapp).
 *
 * 100% client-side, zero external API. External game images are pulled
 * through the `image-proxy` edge function to keep the canvas CORS-clean.
 */

import playbetLogo from "@/assets/logo-mark.png";

export type CreativeFormat = "feed" | "story" | "landscape" | "square_wa";
export type CreativeStyle = "hype" | "minimal" | "editorial";

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

  // Style-specific layouts
  if (input.style === "minimal") {
    await drawMinimal(ctx, size, input, gameImg, logoImg, brandAccent);
  } else if (input.style === "editorial") {
    await drawEditorial(ctx, size, input, gameImg, logoImg, brandAccent);
  } else {
    await drawHype(ctx, size, input, gameImg, logoImg, brandAccent);
  }

  const dataUrl = canvas.toDataURL("image/png");
  const blob = await new Promise<Blob>((resolve) =>
    canvas.toBlob((b) => resolve(b!), "image/png", 0.95)
  );
  return { canvas, dataUrl, blob, size };
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

export function slugify(s: string): string {
  return (s || "criativo")
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 60);
}
