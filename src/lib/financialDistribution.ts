export interface DistributionBreakdown {
  profitBase: number;
  attributedProfit: number;
  unattributedProfit: number;
  influencerCommissionsOwed: number;
  managerCommissionsOwed: number;
}

export interface DistributionParams {
  taxPct: number;
  reservePct: number;
  costs: number;
}

export interface PartnerLike {
  id: string;
  nome: string;
  participacao?: number | null;
  status?: string | null;
}

export interface PartnerDistributionRow {
  id: string;
  nome: string;
  participacao: number;
  normalizedPct: number;
  amount: number;
}

export const DISTRIBUTION_STORAGE_KEY = "playbet.distribution.params.v5";

export const DEFAULT_DISTRIBUTION_PARAMS: DistributionParams = {
  taxPct: 15,
  reservePct: 10,
  costs: 0,
};

const num = (value: unknown) => {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
};

export function readDistributionParams(): DistributionParams {
  if (typeof window === "undefined") return DEFAULT_DISTRIBUTION_PARAMS;
  try {
    const raw = window.localStorage.getItem(DISTRIBUTION_STORAGE_KEY);
    if (!raw) return DEFAULT_DISTRIBUTION_PARAMS;
    const parsed = JSON.parse(raw) as Partial<DistributionParams>;
    return {
      taxPct: num(parsed.taxPct) || DEFAULT_DISTRIBUTION_PARAMS.taxPct,
      reservePct: num(parsed.reservePct),
      costs: Math.max(0, num(parsed.costs)),
    };
  } catch {
    return DEFAULT_DISTRIBUTION_PARAMS;
  }
}

export function writeDistributionParams(params: DistributionParams) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(DISTRIBUTION_STORAGE_KEY, JSON.stringify(params));
}

export function isActivePartner(partner: PartnerLike) {
  return String(partner.status ?? "Ativo").toLowerCase() === "ativo";
}

export function calculateSocioDistribution(
  breakdown: DistributionBreakdown,
  params: DistributionParams,
  socios: PartnerLike[] = [],
) {
  const afterCommissions =
    num(breakdown.profitBase) - num(breakdown.influencerCommissionsOwed) - num(breakdown.managerCommissionsOwed);
  const tax = Math.max(0, afterCommissions) * (num(params.taxPct) / 100);
  const costs = Math.max(0, num(params.costs));
  const subtotal = afterCommissions - tax - costs;
  const reserve = Math.max(0, subtotal) * (num(params.reservePct) / 100);
  const partnersPool = subtotal - reserve;

  const activeSocios = socios.filter(isActivePartner);
  const rawParticipationTotal = activeSocios.reduce((acc, socio) => acc + Math.max(0, num(socio.participacao)), 0);
  const equalPct = activeSocios.length > 0 ? 100 / activeSocios.length : 0;
  const partnerRows: PartnerDistributionRow[] = activeSocios.map((socio) => {
    const participation = Math.max(0, num(socio.participacao));
    const normalizedPct = rawParticipationTotal > 0 ? (participation / rawParticipationTotal) * 100 : equalPct;
    return {
      id: socio.id,
      nome: socio.nome,
      participacao: participation,
      normalizedPct,
      amount: partnersPool * (normalizedPct / 100),
    };
  });

  return {
    afterCommissions,
    tax,
    costs,
    subtotal,
    reserve,
    partnersPool,
    rawParticipationTotal,
    partnerRows,
  };
}

export const formatBRL = (value: number) =>
  value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });