/**
 * Brand fonts — injeta @font-face em runtime a partir dos pointers CDN.
 * Articulat CF é a face proprietária da VUPI (não está no Google Fonts).
 * Playfair Display é carregada via <link> do Google Fonts no index.html.
 */
import artLight from "@/assets/fonts/articulat-cf/articulat-cf-light.otf.asset.json";
import artRegular from "@/assets/fonts/articulat-cf/articulat-cf-regular.otf.asset.json";
import artMedium from "@/assets/fonts/articulat-cf/articulat-cf-medium.otf.asset.json";
import artDemi from "@/assets/fonts/articulat-cf/articulat-cf-demi-bold.otf.asset.json";
import artBold from "@/assets/fonts/articulat-cf/articulat-cf-bold.otf.asset.json";
import artExtraBold from "@/assets/fonts/articulat-cf/articulat-cf-extra-bold.otf.asset.json";
import artHeavy from "@/assets/fonts/articulat-cf/articulat-cf-heavy.otf.asset.json";

const ARTICULAT_FACES: Array<{ weight: number; asset: { url: string } }> = [
  { weight: 300, asset: artLight },
  { weight: 400, asset: artRegular },
  { weight: 500, asset: artMedium },
  { weight: 600, asset: artDemi },
  { weight: 700, asset: artBold },
  { weight: 800, asset: artExtraBold },
  { weight: 900, asset: artHeavy },
];

let installed = false;

export function installBrandFonts() {
  if (installed || typeof document === "undefined") return;
  installed = true;
  const css = ARTICULAT_FACES.map(
    ({ weight, asset }) => `
@font-face {
  font-family: "Articulat CF";
  font-style: normal;
  font-weight: ${weight};
  font-display: swap;
  src: url("${asset.url}") format("opentype");
}`,
  ).join("\n");
  const style = document.createElement("style");
  style.setAttribute("data-brand-fonts", "articulat-cf");
  style.textContent = css;
  document.head.appendChild(style);
}
