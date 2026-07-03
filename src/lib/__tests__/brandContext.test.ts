import { describe, it, expect } from "vitest";
import {
  resolveBrand,
  getBrandKit,
  listBrands,
  isBrandLegallyReady,
} from "@/lib/brandRegistry";
import type { LpMode } from "@/lib/lpMode";

/**
 * Garante que ao abrir qualquer LP (limpa / padrão / gerada) a marca da plataforma
 * do link produza: (1) logo/mark, (2) selo legal com licença, (3) paleta co-brand.
 * Se qualquer um faltar em produção, o rodapé cai para o texto “+18 · SPA/MF …”
 * — o que o painel considera falha de configuração de marca.
 */

const LP_MODES: LpMode[] = ["platform_direct", "catalog", "single_game", "multi_game", "odds"];

describe("brandRegistry — resolução tolerante do hint da plataforma", () => {
  it.each([
    ["Estrela Bet", "estrela-bet"],
    ["estrelabet", "estrela-bet"],
    ["ESTRELA_BET", "estrela-bet"],
    ["VUPI", "vupi"],
    ["vupi-bet", "vupi"],
    ["Play-Bet", "playbet"],
  ])("resolve '%s' → %s", (hint, expectedKey) => {
    const brand = resolveBrand(hint);
    expect(brand?.key).toBe(expectedKey);
  });

  it("retorna null para hint desconhecido (sem fallback silencioso)", () => {
    expect(resolveBrand("betnaoexiste")).toBeNull();
    expect(resolveBrand("")).toBeNull();
    expect(resolveBrand(null)).toBeNull();
  });
});

describe("Selo + logo + co-brand por LP", () => {
  const commercialBrands = listBrands().filter((b) => b.key !== "playbet");

  it("toda plataforma comercial tem logo mark, selo horizontal, selo vertical e licença", () => {
    for (const brand of commercialBrands) {
      expect(brand.logos.mark, `${brand.name} sem logo mark`).toBeTruthy();
      expect(brand.seal?.horizontal.light, `${brand.name} sem selo horizontal light`).toBeTruthy();
      expect(brand.seal?.horizontal.dark, `${brand.name} sem selo horizontal dark`).toBeTruthy();
      expect(brand.seal?.vertical.light, `${brand.name} sem selo vertical light`).toBeTruthy();
      expect(brand.seal?.license, `${brand.name} sem licença SPA/MF`).toMatch(/SPA\/MF/);
      expect(isBrandLegallyReady(brand)).toBe(true);
    }
  });

  it("cada modo de LP consegue renderizar co-brand PlayBet × plataforma", () => {
    const playbet = getBrandKit("playbet");
    expect(playbet.palette.primary).toBeTruthy();

    for (const mode of LP_MODES) {
      for (const brand of commercialBrands) {
        // Simula a resolução real: platformHint vem denormalizado em hype_copy
        // (por link) e vira brandCtx no InfluencerLanding.
        const resolved = resolveBrand(brand.name) ?? resolveBrand(brand.key);
        expect(resolved, `${mode} — brand não resolveu para ${brand.name}`).not.toBeNull();
        expect(isBrandLegallyReady(resolved), `${mode} — ${brand.name} sem selo legal`).toBe(true);
        // Co-brand precisa de duas cores distintas (PlayBet + plataforma)
        expect(resolved!.palette.primary).not.toBe(playbet.palette.primary);
      }
    }
  });

  it("PlayBet (marca do painel) intencionalmente não é 'legally ready' para materiais de plataforma", () => {
    expect(isBrandLegallyReady(getBrandKit("playbet"))).toBe(false);
  });
});

describe("Regressão: LP limpa deve ter selo mesmo sem game_slug", () => {
  it("platform_direct usando apenas o platform hint ainda carrega selo + licença", () => {
    // Cenário do bug relatado: LP limpa aparecia sem selo porque brand caía pra null
    // quando o link não tinha jogo. A denormalização de platform_slug em hype_copy
    // + resolveBrand precisam bastar.
    const brand = resolveBrand("estrela-bet");
    expect(brand?.seal?.license).toBe("SPA/MF nº 320/2025");
    expect(brand?.logos.mark).toBeTruthy();
  });
});
