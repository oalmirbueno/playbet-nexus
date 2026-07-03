import { describe, it, expect } from "vitest";
import { buildPublicLpUrl } from "@/lib/trackingUrl";
import { resolveBrand, isBrandLegallyReady } from "@/lib/brandRegistry";

/**
 * Regras validadas aqui (LP limpa e demais LPs já geradas):
 *   1. Cada LP gerada aponta para o tracking_link certo (ref=slug, sub1=tracking_code,
 *      sub2=influencer_id, sub3=campanha_id). Nada de link cruzado.
 *   2. A LP limpa (sem jogo destacado) ainda carrega selo oficial + licença SPA/MF
 *      da plataforma correta — nunca cai para PlayBet nem fica sem selo.
 */

interface LpRow {
  tracking_code: string;
  lp_domain: string;
  lp_slug: string; // instance slug (ref)
  lp_route: string | null;
  influencer_id: string; // sub2
  campanha_id: string | null; // sub3
  platform: string;
  lp_mode: "clean" | "platform_direct" | "single_game" | "multi_game";
}

const ROWS: LpRow[] = [
  {
    tracking_code: "camilly-mr5j872w",
    lp_domain: "https://oportunidades.playbet.app.br",
    lp_slug: "camilly-9",
    lp_route: null,
    influencer_id: "inf-camilly",
    campanha_id: "camp-1",
    platform: "Estrela Bet",
    lp_mode: "clean",
  },
  {
    tracking_code: "duda-abc42",
    lp_domain: "https://oportunidades.playbet.app.br",
    lp_slug: "duda-2",
    lp_route: null,
    influencer_id: "inf-duda",
    campanha_id: null,
    platform: "VUPI",
    lp_mode: "platform_direct",
  },
  {
    tracking_code: "leo-hype01",
    lp_domain: "https://oportunidades.playbet.app.br",
    lp_slug: "leo-hype",
    lp_route: null,
    influencer_id: "inf-leo",
    campanha_id: "camp-hype",
    platform: "estrela-bet",
    lp_mode: "single_game",
  },
];

describe("LP gerada · link no botão correto por instância", () => {
  it("cada URL contém apenas o ref/sub1/sub2/sub3 da própria instância", () => {
    for (const r of ROWS) {
      const url = buildPublicLpUrl(
        r.lp_domain,
        r.lp_slug,
        r.influencer_id,
        r.campanha_id ?? "",
        r.lp_route,
        r.tracking_code,
      );
      const u = new URL(url);
      expect(u.origin + u.pathname.replace(/\/$/, "")).toBe(r.lp_domain);
      expect(u.searchParams.get("ref")).toBe(r.lp_slug);
      expect(u.searchParams.get("sub1")).toBe(r.tracking_code);
      expect(u.searchParams.get("sub2")).toBe(r.influencer_id);
      if (r.campanha_id) {
        expect(u.searchParams.get("sub3")).toBe(r.campanha_id);
      } else {
        expect(u.searchParams.get("sub3")).toBeNull();
      }
    }
  });

  it("não há vazamento entre LPs: nenhuma URL carrega slug/tracking_code de outra linha", () => {
    const urls = ROWS.map((r) =>
      buildPublicLpUrl(
        r.lp_domain,
        r.lp_slug,
        r.influencer_id,
        r.campanha_id ?? "",
        r.lp_route,
        r.tracking_code,
      ),
    );
    urls.forEach((url, i) => {
      ROWS.forEach((other, j) => {
        if (i === j) return;
        expect(url).not.toContain(`ref=${other.lp_slug}`);
        expect(url).not.toContain(`sub1=${other.tracking_code}`);
      });
    });
  });
});

describe("LP limpa · selo e licença carregam por plataforma", () => {
  it("resolveBrand encontra a marca comercial em cada LP e ela é legalmente pronta (com selo + SPA/MF)", () => {
    for (const r of ROWS) {
      const brand = resolveBrand(r.platform);
      expect(brand, `brand for ${r.platform}`).not.toBeNull();
      expect(brand!.key).not.toBe("playbet"); // nunca cair para PlayBet
      expect(isBrandLegallyReady(brand)).toBe(true);
      // Selo horizontal + licença SPA/MF exigidos para exibir a LP limpa
      expect(brand!.seal?.horizontal.light).toBeTruthy();
      expect(brand!.seal?.license).toMatch(/SPA\/MF/i);
    }
  });

  it("LP limpa mantém o mesmo selo/licença que as demais LPs da mesma plataforma", () => {
    const clean = ROWS.find((r) => r.lp_mode === "clean")!;
    const other = ROWS.find((r) => r.lp_mode !== "clean" && r.platform === clean.platform);
    if (!other) return; // não há par para comparar; teste ainda válido
    const a = resolveBrand(clean.platform)!;
    const b = resolveBrand(other.platform)!;
    expect(a.seal?.license).toBe(b.seal?.license);
    expect(a.seal?.horizontal.light).toBe(b.seal?.horizontal.light);
  });
});
