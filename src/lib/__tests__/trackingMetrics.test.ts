import { describe, expect, it } from "vitest";
import { getMetricMoneyParts, selectAuthoritativeMetricRows } from "../trackingMetrics";

describe("getMetricMoneyParts", () => {
  it("preserves negative RevShare discounts from the panel", () => {
    const parts = getMetricMoneyParts({
      revenue: -25.15,
      cpa_commission: 150,
      revshare_commission: -13.41,
      commission_total: 136.59,
      origem_importacao: "panel_scraper_stellar",
    });

    expect(parts.revShare).toBe(-13.41);
    expect(parts.cpa).toBe(150);
    expect(parts.total).toBe(136.59);
  });

  it("uses negative commission_total as authoritative liquid value", () => {
    const parts = getMetricMoneyParts({
      revenue: -103.6,
      cpa_commission: 0,
      revshare_commission: -41.44,
      commission_total: -41.44,
      origem_importacao: "panel_scraper_stellar",
    });

    expect(parts.revShare).toBe(-41.44);
    expect(parts.cpa).toBe(0);
    expect(parts.total).toBe(-41.44);
  });

  it("does not replace a panel total with CPA-only when RevShare is negative", () => {
    const rows = [
      { cpa_commission: 112.5, revshare_commission: -10.06, commission_total: 102.44, origem_importacao: "panel_scraper_stellar" },
      { cpa_commission: 25, revshare_commission: -2.23, commission_total: 22.77, origem_importacao: "panel_scraper_stellar" },
      { cpa_commission: 12.5, revshare_commission: -1.12, commission_total: 11.38, origem_importacao: "panel_scraper_stellar" },
    ];

    const total = rows.reduce((sum, row) => sum + getMetricMoneyParts(row).total, 0);

    expect(Math.round(total * 100) / 100).toBe(136.59);
  });
});

describe("selectAuthoritativeMetricRows", () => {
  it("keeps each platform authoritative independently", () => {
    const rows = [
      { platform_id: "estrela", origem_importacao: "panel_scrape_html", commission_total: 815, cliques: 73 },
      { platform_id: "vupi", origem_importacao: "panel_scrape_html", commission_total: 0, cliques: 0 },
      { platform_id: "vupi", origem_importacao: "panel_scraper_stellar", commission_total: 2.89, cliques: 12 },
    ];

    expect(selectAuthoritativeMetricRows(rows)).toEqual([rows[0], rows[2]]);
  });

  it("does not accept VUPI HTML rows because the shared panel leaks Estrela metrics", () => {
    const rows = [
      { platform_id: "vupi", platforms: { slug: "vupi", name: "VUPI" }, origem_importacao: "panel_scrape_html", commission_total: -31.24, cliques: 55 },
      { platform_id: "vupi", platforms: { slug: "vupi", name: "VUPI" }, origem_importacao: "smartico_api_pull", commission_total: 2.89, cliques: 12 },
    ];

    expect(selectAuthoritativeMetricRows(rows)).toEqual([rows[1]]);
  });
});