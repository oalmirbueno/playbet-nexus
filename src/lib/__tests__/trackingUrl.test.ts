import { describe, it, expect } from "vitest";
import { buildPublicLpUrl, validateSharedLpUrl } from "@/lib/trackingUrl";

describe("validateSharedLpUrl — guard do fluxo copiar link", () => {
  const base = buildPublicLpUrl(
    "oportunidades.playbet.app.br",
    "camilly-9",
    "inf-123",
    "camp-456",
    "/",
    "camilly-mr5j872w",
  );

  it("aprova URL que casa slug + tracking code + influencer + campanha", () => {
    const res = validateSharedLpUrl(base, {
      instanceSlug: "camilly-9",
      trackingCode: "camilly-mr5j872w",
      influencerId: "inf-123",
      campanhaId: "camp-456",
    });
    expect(res.ok).toBe(true);
    expect(res.url).toContain("ref=camilly-9");
    expect(res.url).toContain("sub1=camilly-mr5j872w");
  });

  it("rejeita URL sem sub1 quando o tracking link espera um", () => {
    const noSub1 = buildPublicLpUrl("oportunidades.playbet.app.br", "camilly-9", "inf-123", "camp-456", "/");
    const res = validateSharedLpUrl(noSub1, {
      instanceSlug: "camilly-9",
      trackingCode: "camilly-mr5j872w",
    });
    expect(res.ok).toBe(false);
    expect(res.reason).toMatch(/sub1/);
  });

  it("rejeita URL cujo ref aponta para outra instância", () => {
    const wrong = buildPublicLpUrl(
      "oportunidades.playbet.app.br",
      "outra-lp",
      "inf-123",
      "camp-456",
      "/",
      "camilly-mr5j872w",
    );
    const res = validateSharedLpUrl(wrong, {
      instanceSlug: "camilly-9",
      trackingCode: "camilly-mr5j872w",
    });
    expect(res.ok).toBe(false);
    expect(res.reason).toMatch(/ref esperado/);
  });

  it("rejeita URL vazia ou malformada", () => {
    expect(validateSharedLpUrl("", { instanceSlug: "x" }).ok).toBe(false);
    expect(validateSharedLpUrl("not-a-url", { instanceSlug: "x" }).ok).toBe(false);
  });

  it("aceita quando esperado não é passado (sem cross-check)", () => {
    expect(validateSharedLpUrl(base, {}).ok).toBe(true);
  });

  it("detecta sub2 divergente do influencer_id passado", () => {
    const res = validateSharedLpUrl(base, {
      instanceSlug: "camilly-9",
      trackingCode: "camilly-mr5j872w",
      influencerId: "outro-influencer",
    });
    expect(res.ok).toBe(false);
    expect(res.reason).toMatch(/sub2/);
  });
});
