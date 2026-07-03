// Unified financial data hook - caixa Asaas + revenue tracking + rankings + saques
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useInfluencers, useManagers, usePlatforms, useSaques } from "@/hooks/useSupabaseQuery";
import { getMetricMoneyParts } from "@/lib/trackingMetrics";

export type PeriodKey = "7d" | "30d" | "mtd" | "ytd" | "all";

export interface PeriodRange {
  start: Date | null;
  end: Date;
  label: string;
  key: PeriodKey;
}

export function getPeriodRange(key: PeriodKey): PeriodRange {
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  if (key === "all") return { start: null, end, label: "Todo período", key };
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  if (key === "7d") start.setDate(start.getDate() - 6);
  else if (key === "30d") start.setDate(start.getDate() - 29);
  else if (key === "mtd") start.setDate(1);
  else if (key === "ytd") { start.setMonth(0); start.setDate(1); }
  const labels: Record<PeriodKey, string> = {
    "7d": "Últimos 7 dias",
    "30d": "Últimos 30 dias",
    mtd: "Mês atual",
    ytd: "Ano atual",
    all: "Todo período",
  };
  return { start, end, label: labels[key], key };
}

interface UseFinanceiroDataOpts {
  period: PeriodKey;
  platformId?: string | null;
}

interface RankingRow {
  id: string;
  name: string;
  subtitle?: string | null;
  ftd: number;
  deposits: number;
  revenue: number;
  share: number; // % do total
  commissionPct: number;
  commission: number;
  status?: string | null;
  category?: "influencer" | "streamer";
}

export function useFinanceiroData({ period, platformId }: UseFinanceiroDataOpts) {
  const range = useMemo(() => getPeriodRange(period), [period]);
  const { data: influencers } = useInfluencers();
  const { data: managers } = useManagers();
  const { data: platforms } = usePlatforms();
  const { data: saques } = useSaques();

  const startIso = range.start?.toISOString().slice(0, 10) ?? null;
  const endIso = range.end.toISOString().slice(0, 10);

  // Tracking metrics in period — inclui campos de comissão (Rev + CPA = lucro real da empresa)
  const metricsQuery = useQuery({
    queryKey: ["financeiro_metrics", startIso, endIso, platformId ?? "all"],
    queryFn: async () => {
      let q = supabase
        .from("tracking_metrics")
        .select(
          "data_ref, platform_id, influencer_id, registros, ftd, deposits_count, depositos_total, revenue, converted_amount, cpa_commission, revshare_commission, commission_total, origem_importacao"
        )
        .eq("is_demo", false)
        .lte("data_ref", endIso);
      if (startIso) q = q.gte("data_ref", startIso);
      if (platformId) q = q.eq("platform_id", platformId);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
    refetchInterval: 30_000,
  });

  // Saques in period (by data field)
  const saquesInPeriod = useMemo(() => {
    return (saques ?? []).filter((s: any) => {
      if (!s.data) return false;
      const d = new Date(s.data);
      if (range.start && d < range.start) return false;
      return d <= range.end;
    });
  }, [saques, range.start, range.end]);

  // CAIXA REAL Asaas - sum of paid/confirmed saques in period
  const caixaRealizado = useMemo(() => {
    const paidStatuses = new Set(["Pago", "Pago via Asaas", "Confirmado"]);
    return saquesInPeriod
      .filter((s: any) => paidStatuses.has(s.status))
      .reduce((acc: number, s: any) => acc + Number(s.valor || 0), 0);
  }, [saquesInPeriod]);

  const trackingTotals = useMemo(() => {
    return (metricsQuery.data ?? []).reduce(
      (acc, m: any) => {
        const parts = getMetricMoneyParts(m);
        acc.revShare += parts.revShare;
        acc.cpa += parts.cpa;
        acc.profitBase += parts.total;
        acc.grossRevenue += parts.grossRevenue;
        acc.depositsTotal += Number(m.depositos_total ?? m.converted_amount ?? 0);
        acc.depositsCount += Number(m.deposits_count || 0);
        acc.registrations += Number(m.registros || 0);
        acc.ftd += Number(m.ftd || 0);
        return acc;
      },
      { revShare: 0, cpa: 0, profitBase: 0, grossRevenue: 0, depositsTotal: 0, depositsCount: 0, registrations: 0, ftd: 0 },
    );
  }, [metricsQuery.data]);

  // Receita oficial da operação = RevShare + CPA. Depósito/NGR ficam só como telemetria.
  const revenueTracking = trackingTotals.profitBase;

  const influencerMap = useMemo(() => {
    const m = new Map<string, any>();
    (influencers ?? []).forEach((i: any) => m.set(i.id, i));
    return m;
  }, [influencers]);

  const managerMap = useMemo(() => {
    const m = new Map<string, any>();
    (managers ?? []).forEach((g: any) => m.set(g.id, g));
    return m;
  }, [managers]);

  const platformMap = useMemo(() => {
    const m = new Map<string, any>();
    (platforms ?? []).forEach((p: any) => m.set(p.id, p));
    return m;
  }, [platforms]);

  // Build base rows from metrics keyed by influencer
  const baseInfluencerRows = useMemo<RankingRow[]>(() => {
    const buckets = new Map<string, { ftd: number; deposits: number; revenue: number }>();
    for (const m of metricsQuery.data ?? []) {
      const key = (m as any).influencer_id;
      if (!key) continue;
      const b = buckets.get(key) ?? { ftd: 0, deposits: 0, revenue: 0 };
      b.ftd += Number((m as any).ftd || 0);
      b.deposits += Number((m as any).depositos_total || 0);
      b.revenue += getMetricMoneyParts(m as any).total;
      buckets.set(key, b);
    }
    return Array.from(buckets.entries()).map(([id, b]) => {
      const inf = influencerMap.get(id);
      const pct = Number(inf?.commission_percent ?? 0);
      return {
        id,
        name: inf?.name ?? "(sem cadastro)",
        subtitle: inf?.team_label ?? null,
        ftd: b.ftd,
        deposits: b.deposits,
        revenue: b.revenue,
        share: 0,
        commissionPct: pct,
        commission: b.revenue * (pct / 100),
        category: (inf?.category ?? "influencer") as "influencer" | "streamer",
      };
    });
  }, [metricsQuery.data, influencerMap]);

  const splitByCategory = (rows: RankingRow[]) => {
    const total = rows.reduce((a, b) => a + b.revenue, 0) || 1;
    return rows
      .map((r) => ({ ...r, share: (r.revenue / total) * 100 }))
      .sort((a, b) => b.revenue - a.revenue);
  };

  const rankingInfluencers = useMemo<RankingRow[]>(
    () => splitByCategory(baseInfluencerRows.filter((r) => r.category !== "streamer")),
    [baseInfluencerRows],
  );

  const rankingStreamers = useMemo<RankingRow[]>(
    () => splitByCategory(baseInfluencerRows.filter((r) => r.category === "streamer")),
    [baseInfluencerRows],
  );

  // RANKING GERENTES (agregando influencers pelo manager_id - inclui ambas categorias)
  const rankingGerentes = useMemo<RankingRow[]>(() => {
    const buckets = new Map<string, { ftd: number; deposits: number; revenue: number }>();
    for (const row of baseInfluencerRows) {
      const inf = influencerMap.get(row.id);
      const mgrId = inf?.manager_id;
      if (!mgrId) continue;
      const b = buckets.get(mgrId) ?? { ftd: 0, deposits: 0, revenue: 0 };
      b.ftd += row.ftd;
      b.deposits += row.deposits;
      b.revenue += row.revenue;
      buckets.set(mgrId, b);
    }
    const total = Array.from(buckets.values()).reduce((a, b) => a + b.revenue, 0) || 1;
    return Array.from(buckets.entries())
      .map(([id, b]) => {
        const mgr = managerMap.get(id);
        const pct = Number(mgr?.commission_percent ?? 0);
        return {
          id,
          name: mgr?.name ?? "(sem cadastro)",
          subtitle: mgr?.team_name ?? null,
          ftd: b.ftd,
          deposits: b.deposits,
          revenue: b.revenue,
          share: (b.revenue / total) * 100,
          commissionPct: pct,
          commission: b.revenue * (pct / 100),
        };
      })
      .sort((a, b) => b.revenue - a.revenue);
  }, [baseInfluencerRows, influencerMap, managerMap]);

  // ============= DISTRIBUIÇÃO OFICIAL: base = Rev (revshare) + CPA =============
  // Regra: apenas linhas com influencer atribuído descontam comissão de influencer.
  // Manager só desconta quando o influencer atribuído tem manager_id definido.
  // Linhas sem influencer (só sócios) fluem 100% para o pool dos sócios.
  const distribution = useMemo(() => {
    let profitBase = 0;             // Rev + CPA total
    let attributedProfit = 0;       // parcela com influencer atribuído
    let unattributedProfit = 0;     // parcela sem influencer (100% sócios)
    let influencerCommissionsOwed = 0;
    let managerCommissionsOwed = 0;

    for (const m of metricsQuery.data ?? []) {
      const base = getMetricMoneyParts(m as any).total;
      if (base <= 0) continue;
      profitBase += base;

      const infId = (m as any).influencer_id;
      const inf = infId ? influencerMap.get(infId) : null;
      if (inf) {
        attributedProfit += base;
        const infPct = Number(inf.commission_percent ?? 0);
        influencerCommissionsOwed += base * (infPct / 100);
        const mgr = inf.manager_id ? managerMap.get(inf.manager_id) : null;
        if (mgr) {
          const mgrPct = Number(mgr.commission_percent ?? 0);
          managerCommissionsOwed += base * (mgrPct / 100);
        }
      } else {
        unattributedProfit += base;
      }
    }

    return {
      profitBase,
      attributedProfit,
      unattributedProfit,
      influencerCommissionsOwed,
      managerCommissionsOwed,
      netAfterCommissions: profitBase - influencerCommissionsOwed - managerCommissionsOwed,
    };
  }, [metricsQuery.data, influencerMap, managerMap]);

  return {
    range,
    isLoading: metricsQuery.isLoading,
    caixaRealizado,
    revenueTracking,
    diff: caixaRealizado - revenueTracking,
    trackingTotals,
    saquesInPeriod,
    saquesAll: saques ?? [],
    rankingInfluencers,
    rankingStreamers,
    rankingGerentes,
    platforms: platforms ?? [],
    platformMap,
    distribution,
  };
}


