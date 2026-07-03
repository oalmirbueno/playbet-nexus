// Aggregate tracking_metrics for dashboard/summary cards.
// Ensures Dashboard reflects the SAME numbers as Financeiro (painel scraper + postbacks).
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getPeriodRange, type PeriodKey } from "@/hooks/useFinanceiroData";

export interface TrackingMetricsSummary {
  ftd: number;
  registrations: number;
  depositsCount: number;
  depositsTotal: number;
  revenue: number;              // Rev (revshare) — comissão sobre a casa
  cpa: number;                  // CPA
  profitBase: number;           // Rev + CPA (nosso lucro real)
  commissionTotal: number;      // fallback (quando tabela vem consolidada)
  clicks: number;
  latestDataRef: string | null;
  bySource: Record<string, number>;
  byPlatform: Record<string, { revenue: number; cpa: number; ftd: number; deposits: number }>;
}

export function useTrackingMetricsSummary(period: PeriodKey = "30d", platformId?: string | null) {
  const range = useMemo(() => getPeriodRange(period), [period]);
  const startIso = range.start?.toISOString().slice(0, 10) ?? null;
  const endIso = range.end.toISOString().slice(0, 10);

  const q = useQuery({
    queryKey: ["tracking_metrics_summary", startIso, endIso, platformId ?? "all"],
    queryFn: async () => {
      let query = supabase
        .from("tracking_metrics")
        .select(
          "data_ref, platform_id, ftd, registros, deposits_count, depositos_total, cliques, revenue, cpa_commission, revshare_commission, commission_total, converted_amount, origem_importacao",
        )
        .eq("is_demo", false)
        .lte("data_ref", endIso);
      if (startIso) query = query.gte("data_ref", startIso);
      if (platformId) query = query.eq("platform_id", platformId);
      const { data, error } = await query;
      if (error) throw error;
      return data ?? [];
    },
    refetchInterval: 15_000,
    refetchOnWindowFocus: true,
  });

  const summary = useMemo<TrackingMetricsSummary>(() => {
    const acc: TrackingMetricsSummary = {
      ftd: 0,
      registrations: 0,
      depositsCount: 0,
      depositsTotal: 0,
      revenue: 0,
      cpa: 0,
      profitBase: 0,
      commissionTotal: 0,
      clicks: 0,
      latestDataRef: null,
      bySource: {},
      byPlatform: {},
    };

    for (const row of q.data ?? []) {
      const r: any = row;
      const rev = Number(r.revshare_commission ?? r.revenue ?? 0);
      const cpa = Number(r.cpa_commission ?? 0);
      const deposits = Number(r.depositos_total ?? r.converted_amount ?? 0);

      acc.ftd += Number(r.ftd || 0);
      acc.registrations += Number(r.registros || 0);
      acc.depositsCount += Number(r.deposits_count || 0);
      acc.depositsTotal += deposits;
      acc.revenue += rev;
      acc.cpa += cpa;
      acc.profitBase += rev + cpa;
      acc.commissionTotal += Number(r.commission_total || 0);
      acc.clicks += Number(r.cliques || 0);

      const src = r.origem_importacao || "desconhecido";
      acc.bySource[src] = (acc.bySource[src] ?? 0) + rev + cpa;

      if (r.platform_id) {
        const p = acc.byPlatform[r.platform_id] ?? { revenue: 0, cpa: 0, ftd: 0, deposits: 0 };
        p.revenue += rev;
        p.cpa += cpa;
        p.ftd += Number(r.ftd || 0);
        p.deposits += deposits;
        acc.byPlatform[r.platform_id] = p;
      }

      if (r.data_ref && (!acc.latestDataRef || r.data_ref > acc.latestDataRef)) {
        acc.latestDataRef = r.data_ref;
      }
    }

    return acc;
  }, [q.data]);

  return {
    summary,
    isLoading: q.isLoading,
    refetch: q.refetch,
    range,
  };
}
