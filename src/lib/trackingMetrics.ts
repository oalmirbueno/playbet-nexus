export type TrackingMetricMoneyLike = {
  revenue?: number | null;
  ftd?: number | null;
  depositos_total?: number | null;
  converted_amount?: number | null;
  cpa_commission?: number | null;
  revshare_commission?: number | null;
  commission_total?: number | null;
  revshare_percent?: number | null;
  cpa_value?: number | null;
  cpa_baseline_deposit?: number | null;
  platform_accounts?: {
    revshare_percent?: number | null;
    cpa_value?: number | null;
    cpa_baseline_deposit?: number | null;
  } | null;
  origem_importacao?: string | null;
};


const money = (value: unknown) => {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
};

const hasMoney = (value: unknown) => {
  if (value == null) return false;
  const n = Number(value);
  return Number.isFinite(n);
};

/**
 * Base financeira oficial da PlayBet.
 * Painéis importados podem trazer `revenue` como NGR/GGR bruto da casa;
 * nosso dinheiro é a comissão líquida oficial do painel.
 *
 * Importante: RevShare pode vir negativo quando a casa desconta heavy,
 * chargeback ou estorno. Nunca zerar valores negativos do painel, senão o
 * dashboard dobra/infla o lucro (ex.: CPA cheio + RevShare negativo ignorado).
 */
export function getMetricMoneyParts(metric: TrackingMetricMoneyLike) {
  const grossRevenue = money(metric.revenue);
  const account = metric.platform_accounts;
  const revsharePct = money(metric.revshare_percent ?? account?.revshare_percent);
  const cpaUnit = money(metric.cpa_value ?? account?.cpa_value);
  const cpaBaseline = money(metric.cpa_baseline_deposit ?? account?.cpa_baseline_deposit);
  const ftd = money(metric.ftd);
  const depositTotal = money(metric.depositos_total ?? metric.converted_amount);
  const avgFtd = ftd > 0 ? depositTotal / ftd : 0;
  const meetsBaseline = cpaBaseline === 0 || avgFtd >= cpaBaseline;
  const source = String(metric.origem_importacao ?? "").toLowerCase();
  const revenueIsGrossPanelValue =
    source.includes("panel_scraper") ||
    source.includes("stellar") ||
    source.includes("smartico") ||
    source.includes("plataforma") ||
    source.includes("historico");
  const estimatedRevShare = revsharePct > 0
    ? (revenueIsGrossPanelValue ? grossRevenue : Math.max(0, grossRevenue)) * (revsharePct / 100)
    : 0;
  const estimatedCpa = cpaUnit > 0 && ftd > 0 && meetsBaseline ? ftd * cpaUnit : 0;
  const importedCpa = money(metric.cpa_commission);
  const cpa = importedCpa > 0 ? Math.max(0, importedCpa) : Math.max(0, estimatedCpa);

  const importedRevShare = hasMoney(metric.revshare_commission)
    ? money(metric.revshare_commission)
    : 0;
  const looksLikeGrossWasSavedAsCommission =
    revenueIsGrossPanelValue &&
    revsharePct > 0 &&
    grossRevenue > 0 &&
    importedRevShare >= grossRevenue * 0.98;
  const explicitRevShare = looksLikeGrossWasSavedAsCommission ? estimatedRevShare : importedRevShare;
  const commissionTotal = money(metric.commission_total);
  const hasExplicitCommissionTotal = hasMoney(metric.commission_total) && commissionTotal !== 0;

  if (hasExplicitCommissionTotal && !looksLikeGrossWasSavedAsCommission) {
    const revShare = hasMoney(metric.revshare_commission) ? explicitRevShare : commissionTotal - cpa;
    return { revShare, cpa, total: commissionTotal, grossRevenue };
  }

  if (explicitRevShare !== 0 || cpa > 0) {
    return { revShare: explicitRevShare, cpa, total: explicitRevShare + cpa, grossRevenue };
  }

  const fallbackRevShare = revenueIsGrossPanelValue ? estimatedRevShare : Math.max(0, grossRevenue);

  return { revShare: fallbackRevShare, cpa, total: fallbackRevShare + cpa, grossRevenue };
}