/**
 * Remove fundo claro/uniforme de um selo (PNG/JPG) client-side.
 * Detecta a cor de fundo pelos 4 cantos e torna transparente qualquer pixel
 * dentro da tolerância. Ideal para selos oficiais que vêm com fundo branco.
 */
import { proxyUrl } from "@/lib/creativeStudio";

async function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Falha ao carregar imagem"));
    img.src = url;
  });
}

function colorDist(r1: number, g1: number, b1: number, r2: number, g2: number, b2: number) {
  const dr = r1 - r2, dg = g1 - g2, db = b1 - b2;
  return Math.sqrt(dr * dr + dg * dg + db * db);
}

export async function sealToTransparentPng(srcUrl: string, tolerance = 32): Promise<Blob> {
  let img: HTMLImageElement;
  try { img = await loadImage(srcUrl); }
  catch { img = await loadImage(proxyUrl(srcUrl)); }

  const w = img.naturalWidth, h = img.naturalHeight;
  const canvas = document.createElement("canvas");
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(img, 0, 0);

  const imageData = ctx.getImageData(0, 0, w, h);
  const d = imageData.data;

  // amostra dos 4 cantos → cor de fundo média
  const corners = [
    [0, 0], [w - 1, 0], [0, h - 1], [w - 1, h - 1],
  ] as const;
  let br = 0, bg = 0, bb = 0;
  for (const [x, y] of corners) {
    const i = (y * w + x) * 4;
    br += d[i]; bg += d[i + 1]; bb += d[i + 2];
  }
  br /= 4; bg /= 4; bb /= 4;

  for (let i = 0; i < d.length; i += 4) {
    const dist = colorDist(d[i], d[i + 1], d[i + 2], br, bg, bb);
    if (dist < tolerance) {
      d[i + 3] = 0;
    } else if (dist < tolerance * 2) {
      // feather leve para bordas
      d[i + 3] = Math.round((dist - tolerance) / tolerance * 255);
    }
  }
  ctx.putImageData(imageData, 0, 0);

  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(b => b ? resolve(b) : reject(new Error("Falha ao gerar PNG transparente")), "image/png");
  });
}

export async function downloadSealTransparent(srcUrl: string, filename: string) {
  const blob = await sealToTransparentPng(srcUrl);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".png") ? filename : `${filename}.png`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
