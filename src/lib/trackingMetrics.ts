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

export function isDeprecatedMetricSource(source?: string | null) {
  return String(source ?? "").toLowerCase() === "panel_scraper_stellar";
}

export function shouldUseMetricSource(metric: { origem_importacao?: string | null; platform_id?: string | null }) {
  // The legacy Stellar scraper overstates visits/registrations/FTDs and must
  // never participate in official KPIs once the live affiliate panel HTML
  // scraper is available.
  return !isDeprecatedMetricSource(metric.origem_importacao);
}

function isVupiPlatform(row: any) {
  const direct = `${row?.platform_slug ?? ""} ${row?.platform_name ?? ""} ${row?.platforms?.slug ?? ""} ${row?.platforms?.name ?? ""}`;
  return /vupi|vipi/i.test(direct);
}

function hasMetricContent(row: any) {
  return (
    Number(row?.cliques ?? 0) !== 0 ||
    Number(row?.registros ?? 0) !== 0 ||
    Number(row?.ftd ?? 0) !== 0 ||
    Number(row?.deposits_count ?? 0) !== 0 ||
    Number(row?.depositos_total ?? row?.converted_amount ?? 0) !== 0 ||
    Number(row?.cpa_commission ?? 0) !== 0 ||
    Number(row?.revshare_commission ?? 0) !== 0 ||
    Number(row?.commission_total ?? 0) !== 0 ||
    Number(row?.revenue ?? 0) !== 0
  );
}

export function selectAuthoritativeMetricRows<T extends { origem_importacao?: string | null; platform_id?: string | null }>(rows: T[]): T[] {
  const groups = new Map<string, T[]>();
  for (const row of rows) {
    const key = (row as any).platform_id ?? "__no_platform__";
    groups.set(key, [...(groups.get(key) ?? []), row]);
  }

  const selected: T[] = [];
  for (const groupRows of groups.values()) {
    const usableRows = groupRows.filter((row) => {
      const source = String(row.origem_importacao ?? "").toLowerCase();
      return !(isVupiPlatform(row) && source === "panel_scrape_html");
    });

    const livePanelRows = usableRows.filter((row) => {
      if (isVupiPlatform(row)) return false;
      return String(row.origem_importacao ?? "").toLowerCase() === "panel_scrape_html" && hasMetricContent(row);
    });
    if (livePanelRows.length > 0) {
      selected.push(...livePanelRows);
      continue;
    }

    const nonDeprecated = usableRows.filter((row) => shouldUseMetricSource(row as any));
    const nonDeprecatedWithContent = nonDeprecated.filter(hasMetricContent);
    if (nonDeprecatedWithContent.length > 0) {
      selected.push(...nonDeprecatedWithContent);
      continue;
    }

    const legacyWithContent = usableRows.filter((row) => isDeprecatedMetricSource(row.origem_importacao) && hasMetricContent(row));
    selected.push(...(legacyWithContent.length > 0 ? legacyWithContent : nonDeprecated));
  }

  return selected;
}

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