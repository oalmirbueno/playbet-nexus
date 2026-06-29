// PlayBet — Cálculo de distribuição oficial (v3 · 08/05/2026)
// Fonte: docs/PLAYBET_MODELO_OFICIAL.md

export interface DistributionInput {
  /** Receita recebida e validada da casa (BRL) */
  revenue: number;
  /** % do influenciador sobre receita recebida (10–15) */
  influencerPct: number;
  /** % do gerente sobre receita recebida (3–8) */
  managerPct: number;
  /** % de imposto/provisão sobre receita recebida (10–20) */
  taxPct: number;
  /** Custos diretos em BRL (valor real) */
  costs: number;
  /** % de reserva PlayBet sobre o subtotal (padrão 10) */
  reservePct?: number;
  /** Número de sócios (padrão 3) */
  partners?: number;
}

export interface DistributionResult {
  revenue: number;
  influencer: number;
  manager: number;
  tax: number;
  costs: number;
  subtotal: number;
  reserve: number;
  partnersPool: number;
  perPartner: number;
  // checks
  valid: boolean;
  warnings: string[];
}

export const DEFAULT_DISTRIBUTION = {
  influencerPct: 12.5,
  managerPct: 5,
  taxPct: 15,
  costs: 0,
  reservePct: 10,
  partners: 3,
};

export function calcDistribution(input: DistributionInput): DistributionResult {
  const reservePct = input.reservePct ?? 10;
  const partners = input.partners ?? 3;
  const warnings: string[] = [];

  if (input.influencerPct < 10 || input.influencerPct > 15)
    warnings.push("Influenciador fora da faixa oficial 10–15%.");
  if (input.managerPct < 3 || input.managerPct > 8)
    warnings.push("Gerente fora da faixa oficial 3–8%.");
  if (input.taxPct < 10 || input.taxPct > 20)
    warnings.push("Imposto/provisão fora da faixa oficial 10–20%.");
  if (reservePct !== 10)
    warnings.push("Reserva PlayBet difere do padrão de 10%.");

  const revenue = Math.max(0, input.revenue || 0);
  const influencer = revenue * (input.influencerPct / 100);
  const manager = revenue * (input.managerPct / 100);
  const tax = revenue * (input.taxPct / 100);
  const costs = Math.max(0, input.costs || 0);
  const subtotal = revenue - influencer - manager - tax - costs;
  const reserve = Math.max(0, subtotal) * (reservePct / 100);
  const partnersPool = subtotal - reserve;
  const perPartner = partners > 0 ? partnersPool / partners : 0;

  return {
    revenue,
    influencer,
    manager,
    tax,
    costs,
    subtotal,
    reserve,
    partnersPool,
    perPartner,
    valid: subtotal > 0,
    warnings,
  };
}
