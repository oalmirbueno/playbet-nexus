import { describe, it, expect } from "vitest";
import { computeProfit } from "../profitModel";

describe("computeProfit", () => {
  it("uses balance_available as lucro_liquido_casa when fresh", () => {
    const p = computeProfit(
      [{ commission_total: 500, custo_influencer: 100, custo_trafego: 50 }],
      [{ balance_available: 380, balance_updated_at: new Date() }],
    );
    expect(p.comissao_bruta).toBe(500);
    expect(p.lucro_liquido_casa).toBe(380);
    expect(p.lucro_real).toBe(230); // 380 - 100 - 50
    expect(p.fallback).toBe(false);
  });

  it("falls back to comissao_bruta when no balance available", () => {
    const p = computeProfit(
      [{ commission_total: 500, custo_influencer: 100 }],
      [],
    );
    expect(p.lucro_liquido_casa).toBe(500);
    expect(p.lucro_real).toBe(400);
    expect(p.fallback).toBe(true);
    expect(p.fallback_reason).toBe("missing_balance");
  });

  it("marks stale when balance older than 24h", () => {
    const oldDate = new Date(Date.now() - 48 * 60 * 60 * 1000);
    const p = computeProfit(
      [{ commission_total: 500 }],
      [{ balance_available: 380, balance_updated_at: oldDate }],
    );
    expect(p.fallback).toBe(true);
    expect(p.fallback_reason).toBe("stale_balance");
  });

  it("sums multiple accounts and rows", () => {
    const p = computeProfit(
      [
        { commission_total: 300, custo_influencer: 50, ftd: 3 },
        { cpa_commission: 100, revshare_commission: 20, custo_trafego: 30, ftd: 1 },
      ],
      [
        { balance_available: 250, balance_updated_at: new Date() },
        { balance_available: 90, balance_updated_at: new Date() },
      ],
    );
    expect(p.comissao_bruta).toBe(420); // 300 + 120
    expect(p.lucro_liquido_casa).toBe(340);
    expect(p.custo_influencer).toBe(50);
    expect(p.custo_trafego).toBe(30);
    expect(p.lucro_real).toBe(260);
    expect(p.ftd).toBe(4);
  });

  it("handles empty input", () => {
    const p = computeProfit([], []);
    expect(p.lucro_real).toBe(0);
    expect(p.fallback_reason).toBe("no_data");
  });
});
