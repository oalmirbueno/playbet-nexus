/**
 * Export estável de material como PNG.
 *
 * Fix dos problemas relatados (baixa quebrado / torto / dessincronizado):
 *  - aguarda `document.fonts.ready` (evita capturar antes das fontes carregarem)
 *  - aguarda `img.decode()` em todas as imagens do nó (evita placeholder na captura)
 *  - renderiza num STAGE OFFSCREEN de tamanho fixo (sem CSS transform do preview),
 *    então o download sai exatamente na resolução alvo, sem escala do zoom do editor.
 *  - pixelRatio 2 para nitidez em alta densidade.
 */
import { toPng } from "html-to-image";

export type ExportPreset = {
  key: string;
  label: string;
  width: number;
  height: number;
};

export const EXPORT_PRESETS: ExportPreset[] = [
  { key: "ig_square",   label: "Instagram Feed 1:1",      width: 1080, height: 1080 },
  { key: "ig_portrait", label: "Instagram Feed 4:5",      width: 1080, height: 1350 },
  { key: "ig_story",    label: "Story / Reels 9:16",      width: 1080, height: 1920 },
  { key: "og",          label: "Open Graph / Preview",    width: 1200, height: 630  },
  { key: "banner_wide", label: "Banner Wide 16:9",        width: 1920, height: 1080 },
];

async function waitForImages(root: HTMLElement) {
  const imgs = Array.from(root.querySelectorAll("img"));
  await Promise.all(
    imgs.map(async (img) => {
      if (img.complete && img.naturalWidth > 0) return;
      try {
        await img.decode();
      } catch {
        await new Promise<void>((res) => {
          img.addEventListener("load", () => res(), { once: true });
          img.addEventListener("error", () => res(), { once: true });
        });
      }
    })
  );
}

export interface RenderMaterialArgs {
  /** Nó DOM a ser exportado (será clonado dentro de um stage offscreen). */
  node: HTMLElement;
  preset: ExportPreset;
  /** Nome do arquivo sem extensão. Ex: "vupi_odds_influencer-joao_20250703" */
  filename: string;
  /** Density multiplier — default 2. Use 3 se o cliente quiser super-alta. */
  pixelRatio?: number;
  backgroundColor?: string;
}

export async function exportMaterialPng({
  node,
  preset,
  filename,
  pixelRatio = 2,
  backgroundColor,
}: RenderMaterialArgs): Promise<Blob> {
  if (typeof document === "undefined") throw new Error("exportMaterialPng: DOM required");

  // Stage offscreen com dimensão FIXA — sem transform/scale do preview.
  const stage = document.createElement("div");
  stage.style.cssText = [
    "position:fixed",
    "left:-99999px",
    "top:0",
    `width:${preset.width}px`,
    `height:${preset.height}px`,
    "transform:none",
    "overflow:hidden",
    "pointer-events:none",
    "contain:strict",
  ].join(";");

  const clone = node.cloneNode(true) as HTMLElement;
  clone.style.width = `${preset.width}px`;
  clone.style.height = `${preset.height}px`;
  clone.style.transform = "none";
  clone.style.margin = "0";
  stage.appendChild(clone);
  document.body.appendChild(stage);

  try {
    // 1) fontes prontas 2) imagens decodificadas
    if ((document as any).fonts?.ready) {
      await (document as any).fonts.ready;
    }
    await waitForImages(clone);
    // frame pra layout estabilizar
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));

    const dataUrl = await toPng(clone, {
      pixelRatio,
      cacheBust: true,
      backgroundColor,
      width: preset.width,
      height: preset.height,
      canvasWidth: preset.width * pixelRatio,
      canvasHeight: preset.height * pixelRatio,
      skipFonts: false,
    });

    // dataURL → Blob
    const res = await fetch(dataUrl);
    const blob = await res.blob();

    // trigger de download
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${filename}.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 5_000);

    return blob;
  } finally {
    stage.remove();
  }
}

/** Nome canônico: {brand}_{tipo}_{link-slug}_{yyyymmdd}. Sem espaços, sem confusão. */
export function buildMaterialFilename(opts: {
  brandKey: string | null | undefined;
  tipo: string;
  linkSlug?: string | null;
}): string {
  const d = new Date();
  const stamp = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  const parts = [opts.brandKey ?? "marca", opts.tipo, opts.linkSlug ?? "sem-link", stamp]
    .map((s) => String(s).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""))
    .filter(Boolean);
  return parts.join("_");
}
