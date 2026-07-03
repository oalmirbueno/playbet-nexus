/**
 * Processamento client-side de brasões/logos antes de aplicar no criativo:
 *  - trim: recorta a bounding box do conteúdo (remove sobras transparentes)
 *  - padding: adiciona respiro proporcional ao redor
 *  - background: nenhum (transparente), disco (círculo) ou quadrado arredondado,
 *    com cor sólida configurável
 *
 * Retorna sempre um data URL PNG pronto pra virar `ImageLayer.src`.
 * Assume que o PNG remoto expõe CORS (TheSportsDB expõe). Se falhar por CORS,
 * cai no proxy do projeto (proxyUrl) já usado no renderer.
 */

import { proxyUrl } from "@/lib/creativeStudio";

export type CrestBackground = "none" | "circle" | "square";

export interface CrestAdjustments {
  /** 0-1 — remove sobras transparentes ao redor do conteúdo (1 = trim total). */
  trim: number;
  /** 0-40 — % de padding em relação ao lado maior do conteúdo. */
  paddingPct: number;
  /** Forma do fundo. */
  background: CrestBackground;
  /** Cor de fundo quando background !== "none". Hex ou rgba. */
  bgColor: string;
  /** 0-50 — raio de canto (%) quando background === "square". */
  radiusPct: number;
}

export const DEFAULT_CREST_ADJUSTMENTS: CrestAdjustments = {
  trim: 1,
  paddingPct: 8,
  background: "none",
  bgColor: "#0B0F1E",
  radiusPct: 22,
};

async function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Falha ao carregar imagem"));
    img.src = url;
  });
}

/** Calcula bbox do conteúdo não-transparente. Retorna null se a imagem for totalmente vazia. */
function contentBBox(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  alphaThreshold = 8,
): { x: number; y: number; w: number; h: number } | null {
  const { data } = ctx.getImageData(0, 0, w, h);
  let minX = w, minY = h, maxX = -1, maxY = -1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const a = data[(y * w + x) * 4 + 3];
      if (a > alphaThreshold) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX < 0) return null;
  return { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 };
}

/**
 * Aplica trim + padding + fundo e devolve um data URL PNG.
 * A imagem final é quadrada (para caber bem em qualquer slot de brasão).
 */
export async function processCrest(
  srcUrl: string,
  adj: CrestAdjustments,
): Promise<string> {
  let img: HTMLImageElement;
  try {
    img = await loadImage(srcUrl);
  } catch {
    // fallback via proxy do renderer (mesmo caminho usado no canvas final)
    img = await loadImage(proxyUrl(srcUrl));
  }

  const iw = img.naturalWidth;
  const ih = img.naturalHeight;

  // 1) Desenha original num canvas de trabalho
  const work = document.createElement("canvas");
  work.width = iw;
  work.height = ih;
  const wctx = work.getContext("2d")!;
  wctx.drawImage(img, 0, 0);

  // 2) Trim: acha bbox real e interpola entre bbox exata (trim=1) e o quadro original (trim=0)
  const bbox = contentBBox(wctx, iw, ih);
  const t = Math.max(0, Math.min(1, adj.trim));
  let sx = 0, sy = 0, sw = iw, sh = ih;
  if (bbox) {
    sx = Math.round(bbox.x * t);
    sy = Math.round(bbox.y * t);
    sw = Math.round(iw - (iw - bbox.w) * t);
    sh = Math.round(ih - (ih - bbox.h) * t);
  }

  // 3) Normaliza para conteúdo quadrado com padding
  const contentSide = Math.max(sw, sh);
  const pad = Math.round((adj.paddingPct / 100) * contentSide);
  const side = contentSide + pad * 2;

  const out = document.createElement("canvas");
  out.width = side;
  out.height = side;
  const ctx = out.getContext("2d")!;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  // 4) Fundo opcional
  if (adj.background !== "none") {
    ctx.fillStyle = adj.bgColor;
    if (adj.background === "circle") {
      ctx.beginPath();
      ctx.arc(side / 2, side / 2, side / 2, 0, Math.PI * 2);
      ctx.fill();
    } else {
      const r = Math.min(side / 2, (adj.radiusPct / 100) * side);
      roundedRectPath(ctx, 0, 0, side, side, r);
      ctx.fill();
    }
  }

  // 5) Centraliza o recorte no canvas quadrado
  const dx = Math.round((side - sw) / 2);
  const dy = Math.round((side - sh) / 2);
  ctx.drawImage(work, sx, sy, sw, sh, dx, dy, sw, sh);

  return out.toDataURL("image/png");
}

function roundedRectPath(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, r: number,
) {
  const rr = Math.max(0, Math.min(r, Math.min(w, h) / 2));
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.lineTo(x + w - rr, y);
  ctx.arcTo(x + w, y, x + w, y + rr, rr);
  ctx.lineTo(x + w, y + h - rr);
  ctx.arcTo(x + w, y + h, x + w - rr, y + h, rr);
  ctx.lineTo(x + rr, y + h);
  ctx.arcTo(x, y + h, x, y + h - rr, rr);
  ctx.lineTo(x, y + rr);
  ctx.arcTo(x, y, x + rr, y, rr);
  ctx.closePath();
}
