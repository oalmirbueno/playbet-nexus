import { describe, it, expect } from "vitest";
import { resolveShareUrl, buildPublicLpUrl, buildTrackedAffiliateUrl } from "./trackingUrl";

describe("trackingUrl — Com LP", () => {
  it("buildPublicLpUrl returns LP URL with sub2 and sub3", () => {
    const url = buildPublicLpUrl(
      "https://oportunidades.playbet.app.br",
      "camilly",
      "inf-uuid",
      "camp-uuid",
    );
    expect(url).toBe("https://oportunidades.playbet.app.br/?ref=camilly&sub2=inf-uuid&sub3=camp-uuid");
  });

  it("buildPublicLpUrl strips trailing slashes from domain", () => {
    const url = buildPublicLpUrl("https://oportunidades.playbet.app.br/", "camilly", "x", "y");
    expect(url.startsWith("https://oportunidades.playbet.app.br/?ref=camilly")).toBe(true);
  });

  it("buildPublicLpUrl returns empty when domain or slug missing", () => {
    expect(buildPublicLpUrl(null, "camilly", "x", "y")).toBe("");
    expect(buildPublicLpUrl("https://x.com", null, "x", "y")).toBe("");
  });

  it("resolveShareUrl prefers the LP URL when LP + instance exist", () => {
    const url = resolveShareUrl({
      lpDomain: "https://oportunidades.playbet.app.br",
      instanceSlug: "camilly",
      affiliateBaseUrl: "https://lkrh.pro/31d6",
      clickIdParamName: "sub1",
      sub1: "camilly",
      sub2: "inf-uuid",
      sub3: "camp-uuid",
    });
    expect(url).toBe("https://oportunidades.playbet.app.br/?ref=camilly&sub2=inf-uuid&sub3=camp-uuid");
    expect(url.includes("lkrh.pro")).toBe(false);
  });

  it("resolveShareUrl falls back to affiliate URL when no LP", () => {
    const url = resolveShareUrl({
      lpDomain: null,
      instanceSlug: null,
      affiliateBaseUrl: "https://lkrh.pro/31d6",
      clickIdParamName: "sub1",
      sub1: "camilly",
      sub2: "inf-uuid",
      sub3: "camp-uuid",
    });
    expect(url).toBe("https://lkrh.pro/31d6?sub1=camilly&sub2=inf-uuid&sub3=camp-uuid");
  });

  it("buildTrackedAffiliateUrl injects all three sub params", () => {
    const url = buildTrackedAffiliateUrl("https://lkrh.pro/31d6", "sub1", "click_123", "inf", "camp");
    const u = new URL(url);
    expect(u.searchParams.get("sub1")).toBe("click_123");
    expect(u.searchParams.get("sub2")).toBe("inf");
    expect(u.searchParams.get("sub3")).toBe("camp");
  });
});
