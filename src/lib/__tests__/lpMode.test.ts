import { describe, it, expect } from "vitest";
import {
  detectLpMode,
  resolveEffectiveLpMode,
  scopeGamesForInstance,
} from "@/lib/lpMode";

/**
 * E2E-style guardrails for the public LP renderer.
 *
 * Cobre os três cenários que travavam a produção:
 *  - LP limpa (`platform_direct`) NUNCA pode mostrar jogo.
 *  - LP padrão (`catalog`) só mostra jogos vinculados à instância desse link.
 *  - LP gerada (`single_game`/`multi_game`) só mostra o jogo do próprio link,
 *    e faz downgrade seguro para `platform_direct` se o slug sumir.
 */

describe("resolveEffectiveLpMode — LP limpa / padrão / gerada", () => {
  it("LP gerada single_game sem jogo cai para LP limpa (evita vazar jogo de outro link)", () => {
    expect(
      resolveEffectiveLpMode({
        storedMode: "single_game",
        hasResolvedGameArt: false,
        hypeCopyGameSlug: null,
      }),
    ).toBe("platform_direct");
  });

  it("LP gerada multi_game sem slug bound também vira LP limpa", () => {
    expect(
      resolveEffectiveLpMode({
        storedMode: "multi_game",
        hasResolvedGameArt: false,
        hypeCopyGameSlug: "",
      }),
    ).toBe("platform_direct");
  });

  it("LP gerada single_game com arte real permanece single_game", () => {
    expect(
      resolveEffectiveLpMode({
        storedMode: "single_game",
        hasResolvedGameArt: true,
        hypeCopyGameSlug: null,
      }),
    ).toBe("single_game");
  });

  it("LP gerada single_game com hype_copy.game_slug permanece single_game mesmo sem arte carregada", () => {
    expect(
      resolveEffectiveLpMode({
        storedMode: "single_game",
        hasResolvedGameArt: false,
        hypeCopyGameSlug: "fortune-tiger",
      }),
    ).toBe("single_game");
  });

  it("LP limpa permanece platform_direct (nunca promove para mostrar jogo)", () => {
    expect(
      resolveEffectiveLpMode({
        storedMode: "platform_direct",
        hasResolvedGameArt: true,
        hypeCopyGameSlug: "fortune-tiger",
      }),
    ).toBe("platform_direct");
  });

  it("LP padrão (catalog) sem lp_mode salvo é o default", () => {
    expect(
      resolveEffectiveLpMode({
        storedMode: null,
        hasResolvedGameArt: false,
        hypeCopyGameSlug: null,
      }),
    ).toBe("catalog");
  });
});

describe("scopeGamesForInstance — isolamento por link", () => {
  const catalog = [
    { slug: "fortune-tiger", name: "Fortune Tiger" },
    { slug: "fortune-ox", name: "Fortune Ox" },
    { slug: "aviator", name: "Aviator" },
  ];

  it("um link vinculado a um único jogo nunca mostra os outros do catálogo", () => {
    const scoped = scopeGamesForInstance({
      instanceGameSlugs: ["fortune-tiger"],
      hypeCopyGameSlug: null,
      available: catalog,
    });
    expect(scoped.map((g) => g.slug)).toEqual(["fortune-tiger"]);
  });

  it("link multi_game respeita exatamente os slugs listados na instância", () => {
    const scoped = scopeGamesForInstance({
      instanceGameSlugs: ["fortune-tiger", "aviator"],
      hypeCopyGameSlug: null,
      available: catalog,
    });
    expect(scoped.map((g) => g.slug).sort()).toEqual(["aviator", "fortune-tiger"]);
  });

  it("instância sem game_slugs retorna vazio (LP limpa nunca herda jogos hyped)", () => {
    const scoped = scopeGamesForInstance({
      instanceGameSlugs: [],
      hypeCopyGameSlug: null,
      available: catalog,
    });
    expect(scoped).toEqual([]);
  });

  it("fallback via hype_copy.game_slug funciona quando game_slugs vier nulo", () => {
    const scoped = scopeGamesForInstance({
      instanceGameSlugs: null,
      hypeCopyGameSlug: "Aviator",
      available: catalog,
    });
    expect(scoped.map((g) => g.slug)).toEqual(["aviator"]);
  });

  it("normalização tolera acento e caixa (Fortune Tigre vs fortune-tiger)", () => {
    const scoped = scopeGamesForInstance({
      instanceGameSlugs: ["Fortune Tiger"],
      hypeCopyGameSlug: null,
      available: catalog,
    });
    expect(scoped.map((g) => g.slug)).toEqual(["fortune-tiger"]);
  });
});

describe("detectLpMode — categorização a partir do link", () => {
  it("link com um único game_slug → single_game", () => {
    expect(
      detectLpMode({ linkCategory: "game", gameSlug: "fortune-tiger" }),
    ).toBe("single_game");
  });

  it("link com múltiplos slugs → multi_game", () => {
    expect(
      detectLpMode({
        linkCategory: "game",
        gameSlug: "fortune-tiger",
        extraGameSlugs: ["aviator"],
      }),
    ).toBe("multi_game");
  });

  it("link sem jogo → platform_direct (LP limpa)", () => {
    expect(detectLpMode({ linkCategory: "platform", gameSlug: null })).toBe(
      "platform_direct",
    );
  });

  it("categoria odds/esportes → odds independentemente de slug", () => {
    expect(detectLpMode({ linkCategory: "odds" })).toBe("odds");
    expect(detectLpMode({ linkCategory: "esportes", gameSlug: "x" })).toBe("odds");
  });
});
