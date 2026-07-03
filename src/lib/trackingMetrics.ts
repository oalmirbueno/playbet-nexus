export type TrackingMetricMoneyLike = {
  revenue?: number | null;
  ftd?: number | null;
  cpa_commission?: number | null;
  revshare_commission?: number | null;
  commission_total?: number | null;
  revshare_percent?: number | null;
  cpa_value?: number | null;
  platform_accounts?: { revshare_percent?: number | null; cpa_value?: number | null } | null;
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
  const account = metric.platform_accounts;
  const revsharePct = money(metric.revshare_percent ?? account?.revshare_percent);
  const cpaUnit = money(metric.cpa_value ?? account?.cpa_value);
  const ftd = money(metric.ftd);
  const source = String(metric.origem_importacao ?? "").toLowerCase();
  const revenueIsGrossPanelValue =
    source.includes("panel_scraper") ||
    source.includes("stellar") ||
    source.includes("smartico") ||
    source.includes("plataforma") ||
    source.includes("historico");
  const estimatedRevShare = revsharePct > 0 ? Math.max(0, grossRevenue) * (revsharePct / 100) : 0;
  const estimatedCpa = cpaUnit > 0 && ftd > 0 ? ftd * cpaUnit : 0;
  const cpa = Math.max(0, money(metric.cpa_commission) || estimatedCpa);
  const importedRevShare = Math.max(0, money(metric.revshare_commission));
  const looksLikeGrossWasSavedAsCommission =
    revenueIsGrossPanelValue &&
    revsharePct > 0 &&
    grossRevenue > 0 &&
    importedRevShare >= grossRevenue * 0.98;
  const explicitRevShare = looksLikeGrossWasSavedAsCommission ? estimatedRevShare : importedRevShare;
  const commissionTotal = Math.max(0, money(metric.commission_total));

  if (commissionTotal > 0 && !looksLikeGrossWasSavedAsCommission) {
    const revShare = explicitRevShare > 0 ? explicitRevShare : Math.max(commissionTotal - cpa, 0);
    const total = revShare + cpa || commissionTotal;
    return { revShare, cpa, total, grossRevenue };
  }

  if (explicitRevShare > 0 || cpa > 0) {
    return { revShare: explicitRevShare, cpa, total: explicitRevShare + cpa, grossRevenue };
  }

  const fallbackRevShare = revenueIsGrossPanelValue ? estimatedRevShare : Math.max(0, grossRevenue);

  return { revShare: fallbackRevShare, cpa, total: fallbackRevShare + cpa, grossRevenue };
}