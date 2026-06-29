import { describe, it, expect } from "vitest";
import { resolveShareUrl, buildTrackedAffiliateUrl } from "./trackingUrl";

/**
 * "Sem LP" end-to-end contract
 * ────────────────────────────
 * No landing page is involved. The link the influencer shares IS the affiliate
 * URL, already stamped with sub1/sub2/sub3 so the bookmaker closes the
 * attribution loop on the first hop. Our LP host must never appear in the URL.
 */

const PLAYBET_HOSTS = [
  "oportunidades.playbet.app.br",
  "playbet.app.br",
  "painelcentral.playbet.app.br",
];

describe("trackingUrl — Sem LP", () => {
  it("produces the affiliate URL directly with sub1/sub2/sub3", () => {
    const url = resolveShareUrl({
      lpDomain: null,
      instanceSlug: null,
      affiliateBaseUrl: "https://lkrh.pro/31d6",
      clickIdParamName: "sub1",
      sub1: "camilly",
      sub2: "inf-uuid",
      sub3: "camp-uuid",
    });

    const u = new URL(url);
    expect(u.hostname).toBe("lkrh.pro");
    expect(u.searchParams.get("sub1")).toBe("camilly");
    expect(u.searchParams.get("sub2")).toBe("inf-uuid");
    expect(u.searchParams.get("sub3")).toBe("camp-uuid");
  });

  it("never routes through any PlayBet LP host in Sem LP mode", () => {
    const url = resolveShareUrl({
      lpDomain: null,
      instanceSlug: null,
      affiliateBaseUrl: "https://go.bookmaker.com/aff?cid=99",
      clickIdParamName: "sub1",
      sub1: "creator",
      sub2: "inf",
      sub3: "camp",
    });
    for (const host of PLAYBET_HOSTS) {
      expect(url.includes(host)).toBe(false);
    }
  });

  it("respects the bookmaker's click-id param name (e.g. clickid, subid)", () => {
    const url = resolveShareUrl({
      lpDomain: null,
      instanceSlug: null,
      affiliateBaseUrl: "https://aff.betano.com/redirect/35821/",
      clickIdParamName: "clickid",
      sub1: "creator_42",
      sub2: "inf",
      sub3: "camp",
    });
    const u = new URL(url);
    expect(u.searchParams.get("clickid")).toBe("creator_42");
    expect(u.searchParams.get("sub2")).toBe("inf");
    expect(u.searchParams.get("sub3")).toBe("camp");
    expect(u.searchParams.get("sub1")).toBeNull();
  });

  it("preserves existing query params on the affiliate base URL", () => {
    const url = buildTrackedAffiliateUrl(
      "https://go.house.com/r?promo=welcome",
      "sub1",
      "creator",
      "inf",
      "camp",
    );
    const u = new URL(url);
    expect(u.searchParams.get("promo")).toBe("welcome");
    expect(u.searchParams.get("sub1")).toBe("creator");
    expect(u.searchParams.get("sub2")).toBe("inf");
    expect(u.searchParams.get("sub3")).toBe("camp");
  });

  it("ignores stale LP metadata when domain or slug is missing", () => {
    // Edge case: a row that still carries landing_page_id but no domain/slug
    // (mode flipped to Sem LP). Must still resolve to the affiliate.
    const url = resolveShareUrl({
      lpDomain: null,
      instanceSlug: "camilly", // half-stale
      affiliateBaseUrl: "https://lkrh.pro/31d6",
      clickIdParamName: "sub1",
      sub1: "camilly",
      sub2: "inf",
      sub3: "camp",
    });
    expect(new URL(url).hostname).toBe("lkrh.pro");
  });
});
