/**
 * profitModel.ts
 *
 * Regra única e autoritativa para calcular "lucro real" a partir das linhas de
 * `tracking_metrics` + saldo autoritativo do painel afiliado
 * (`platform_accounts.balance_available`).
 *
 * Nunca mostre "comissão bruta" como se fosse lucro — a casa desconta
 * chargeback / heavy / estornos, e o influenciador tem custo próprio.
 *
 * Fórmula:
 *   comissao_bruta      = SUM(commission_total)                    // o que o painel diz que ganhamos
 *   lucro_liquido_casa  = SUM(balance_available por conta)         // o que efetivamente sobrou pra saque
 *   custo_influencer    = SUM(custo_influencer)                    // pagamento aos criadores
 *   custo_trafego       = SUM(custo_trafego)                       // ads / boost
 *   lucro_real          = lucro_liquido_casa - custo_influencer - custo_trafego
 *
 * Quando `balance_available` estiver desatualizado (>24h) ou nulo, caímos para
 * `comissao_bruta` como aproximação e marcamos `fallback = true` para a UI
 * poder avisar o usuário que o valor pode oscilar.
 */

export type ProfitInputRow = {
  commission_total?: number | string | null;
  cpa_commission?: number | string | null;
  revshare_commission?: number | string | null;
  custo_influencer?: number | string | null;
  custo_trafego?: number | string | null;
  depositos_total?: number | string | null;
  ftd?: number | string | null;
  registros?: number | string | null;
};

export type BalanceSnapshot = {
  balance_available: number | string | null;
  balance_updated_at: string | Date | null;
};

export interface ProfitBreakdown {
  comissao_bruta: number;
  lucro_liquido_casa: number;
  custo_influencer: number;
  custo_trafego: number;
  lucro_real: number;
  ftd: number;
  registros: number;
  depositos_total: number;
  balance_updated_at: Date | null;
  fallback: boolean;
  fallback_reason?: "stale_balance" | "missing_balance" | "no_data";
}

const BALANCE_STALE_MS = 24 * 60 * 60 * 1000;

const n = (v: unknown): number => {
  if (v == null) return 0;
  const x = typeof v === "string" ? Number(v.replace(",", ".")) : Number(v);
  return Number.isFinite(x) ? x : 0;
};

/**
 * Agrega o breakdown de lucro real.
 *
 * @param rows          Linhas de tracking_metrics do período
 * @param balances      Saldos autoritativos (uma entrada por platform_account)
 * @param opts.now      Injeta relógio para testes (default: new Date())
 */
export function computeProfit(
  rows: ProfitInputRow[],
  balances: BalanceSnapshot[] = [],
  opts: { now?: Date } = {},
): ProfitBreakdown {
  const now = opts.now ?? new Date();

  let comissao_bruta = 0;
  let custo_influencer = 0;
  let custo_trafego = 0;
  let ftd = 0;
  let registros = 0;
  let depositos_total = 0;

  for (const r of rows) {
    const commission =
      n(r.commission_total) || n(r.cpa_commission) + n(r.revshare_commission);
    comissao_bruta += commission;
    custo_influencer += n(r.custo_influencer);
    custo_trafego += n(r.custo_trafego);
    ftd += n(r.ftd);
    registros += n(r.registros);
    depositos_total += n(r.depositos_total);
  }

  let lucro_liquido_casa = 0;
  let mostRecentBalanceAt: Date | null = null;
  let anyBalancePresent = false;
  let anyBalanceFresh = false;

  for (const b of balances) {
    if (b.balance_available == null) continue;
    anyBalancePresent = true;
    lucro_liquido_casa += n(b.balance_available);
    const updated = b.balance_updated_at ? new Date(b.balance_updated_at) : null;
    if (updated && !Number.isNaN(updated.getTime())) {
      if (!mostRecentBalanceAt || updated > mostRecentBalanceAt) {
        mostRecentBalanceAt = updated;
      }
      if (now.getTime() - updated.getTime() <= BALANCE_STALE_MS) {
        anyBalanceFresh = true;
      }
    }
  }

  let fallback = false;
  let fallback_reason: ProfitBreakdown["fallback_reason"];

  if (!anyBalancePresent) {
    // Painel nunca foi lido — usamos comissão bruta como estimativa.
    lucro_liquido_casa = comissao_bruta;
    fallback = comissao_bruta > 0 || rows.length > 0;
    fallback_reason = rows.length === 0 ? "no_data" : "missing_balance";
  } else if (!anyBalanceFresh) {
    fallback = true;
    fallback_reason = "stale_balance";
  }

  const lucro_real = lucro_liquido_casa - custo_influencer - custo_trafego;

  return {
    comissao_bruta: round2(comissao_bruta),
    lucro_liquido_casa: round2(lucro_liquido_casa),
    custo_influencer: round2(custo_influencer),
    custo_trafego: round2(custo_trafego),
    lucro_real: round2(lucro_real),
    ftd,
    registros,
    depositos_total: round2(depositos_total),
    balance_updated_at: mostRecentBalanceAt,
    fallback,
    fallback_reason,
  };
}

function round2(x: number): number {
  return Math.round(x * 100) / 100;
}

/**
 * Human-friendly label para o motivo do fallback (para tooltips na UI).
 */
export function fallbackLabel(
  reason: ProfitBreakdown["fallback_reason"],
): string {
  switch (reason) {
    case "stale_balance":
      return "Saldo do painel desatualizado (>24h). Mostrando última leitura.";
    case "missing_balance":
      return "Painel afiliado ainda não sincronizado. Exibindo comissão bruta como estimativa — pode oscilar.";
    case "no_data":
      return "Nenhum dado disponível no período.";
    default:
      return "";
  }
}
