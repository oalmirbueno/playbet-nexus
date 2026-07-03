export type TrackingMetricMoneyLike = {
  revenue?: number | null;
  cpa_commission?: number | null;
  revshare_commission?: number | null;
  commission_total?: number | null;
  origem_importacao?: string | null;
};

const money = (value: unknown) => {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
};

/**
 * Base financeira oficial da PlayBet.
 * Painéis importados podem trazer `revenue` como NGR/GGR bruto da casa;
 * nosso dinheiro é RevShare + CPA, preferindo `commission_total`.
 */
export function getMetricMoneyParts(metric: TrackingMetricMoneyLike) {
  const grossRevenue = money(metric.revenue);
  const cpa = Math.max(0, money(metric.cpa_commission));
  const explicitRevShare = Math.max(0, money(metric.revshare_commission));
  const commissionTotal = Math.max(0, money(metric.commission_total));

  if (commissionTotal > 0) {
    const revShare = explicitRevShare > 0 ? explicitRevShare : Math.max(commissionTotal - cpa, 0);
    const total = revShare + cpa || commissionTotal;
    return { revShare, cpa, total, grossRevenue };
  }

  if (explicitRevShare > 0 || cpa > 0) {
    return { revShare: explicitRevShare, cpa, total: explicitRevShare + cpa, grossRevenue };
  }

  const source = String(metric.origem_importacao ?? "").toLowerCase();
  const revenueIsGrossPanelValue = source.includes("panel_scraper") || source.includes("stellar");
  const fallbackRevShare = revenueIsGrossPanelValue ? 0 : Math.max(0, grossRevenue);

  return { revShare: fallbackRevShare, cpa: 0, total: fallbackRevShare, grossRevenue };
}