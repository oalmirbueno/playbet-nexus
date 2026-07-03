import { describe, it, expect } from "vitest";
import { suggestThreeOptions, computeOpportunityScore, signalToOpportunityDraft } from "./opportunityEngine";
import type { LpSignalRow } from "@/services/lpSignalService";

const baseEvent = {
  home_team: "Alemanha",
  away_team: "Paraguai",
  starts_at: new Date(Date.now() + 6 * 3600_000).toISOString(),
};

describe("opportunityEngine.suggestThreeOptions", () => {
  it("retorna exatamente 3 opções sem sinais", () => {
    const out = suggestThreeOptions({ event: baseEvent });
    expect(out).toHaveLength(3);
    expect(out[0].title).toBe("Alemanha vence");
    expect(out[1].market_type).toBe("total_gols");
    expect(out[2].market_type).toBe("dupla_chance");
  });

  it("usa sinal de alta confiança como 3ª opção quando disponível", () => {
    const signal = {
      id: "s1",
      raw_text: "Ambas marcam Alemanha x Paraguai",
      source_name: "Sala A",
      source_channel: "manual",
      confidence: "alta",
      market_type: "ambas_marcam",
      market_name: "Ambas marcam",
      odd_label: "1.80",
      house_url: "https://casa.com",
      status: "novo",
    } as unknown as LpSignalRow;
    const out = suggestThreeOptions({ event: baseEvent, signals: [signal] });
    expect(out[2].badge).toBe("Em destaque");
    expect(out[2].market_type).toBe("ambas_marcam");
    expect(out[2].signal_confidence).toBe("alta");
  });

  it("nunca usa linguagem proibida", () => {
    const out = suggestThreeOptions({ event: baseEvent });
    const blob = JSON.stringify(out).toLowerCase();
    ["garantido", "certeiro", "chance de ganhar", "lucro"].forEach((bad) =>
      expect(blob).not.toContain(bad),
    );
  });
});

describe("opportunityEngine.computeOpportunityScore", () => {
  it("score 0-100, sem dados retorna 0", () => {
    expect(computeOpportunityScore({})).toBe(0);
  });

  it("link válido + casa + mercado simples + odd coerente sobe score", () => {
    const s = computeOpportunityScore({
      market_type: "resultado_final",
      odd_label: "1.85",
      destination_url: "https://casa.com/bet",
      platform_id: "p1",
      starts_at: new Date(Date.now() + 3600_000).toISOString(),
    });
    expect(s).toBeGreaterThanOrEqual(70);
    expect(s).toBeLessThanOrEqual(100);
  });
});

describe("opportunityEngine.signalToOpportunityDraft", () => {
  it("rascunho nunca nasce ativo", () => {
    const draft = signalToOpportunityDraft({
      id: "s1",
      raw_text: "x",
      source_name: "Sala",
      source_channel: "telegram",
      confidence: "media",
      market_type: "resultado_final",
      market_name: "Mandante vence",
      odd_label: "2.0",
      house_url: "https://casa.com",
      status: "novo",
    } as unknown as LpSignalRow);
    expect(draft.is_active).toBe(false);
    expect(draft.signal_confidence).toBe("media");
    expect(draft.destination_url).toBe("https://casa.com");
  });
});
