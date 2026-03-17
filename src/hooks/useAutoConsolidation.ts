import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { usePlatforms } from "@/hooks/useSupabaseQuery";
import { supabase } from "@/integrations/supabase/client";

export interface ConsolidatedMetrics {
  totalClicks: number;
  totalRegistrations: number;
  totalFtd: number;
  totalDeposits: number;
  totalRedeposits: number;
  revenueOriginal: number;
  revenueOriginalCurrency: string;
  revenueBrl: number;
  lastExchangeRate: number | null;
  lastExchangeRateTimestamp: string | null;
  lastEventTimestamp: string | null;
  eventCount: number;
  platformName: string | null;
  hasMultipleCurrencies: boolean;
  byCurrency: Record<string, { total: number; convertedBrl: number; rate: number | null }>;
  realClicksCount: number;
  latestWithdrawableOriginal: number | null;
  latestWithdrawableCurrency: string | null;
  latestWithdrawableBrl: number | null;
  latestWithdrawableExchangeRate: number | null;
  latestWithdrawableTimestamp: string | null;
}

export function useAutoConsolidation() {
  const { data: platforms } = usePlatforms();

  // Single consolidated query to avoid "Should have a queue" React error
  const { data: trackingData, isLoading: metricsLoading } = useQuery({
    queryKey: ["tracking_consolidated_all"],
    queryFn: async () => {
      const [metricsRes, clicksRes, lastEventRes, eventCountRes, withdrawableRes] = await Promise.all([
        supabase
          .from("tracking_metrics")
          .select("*")
          .eq("is_demo", false)
          .eq("origem_importacao", "auto_consolidation")
          .order("data_ref", { ascending: false }),
        supabase
          .from("clicks")
          .select("*", { count: "exact", head: true })
          .eq("is_demo", false),
        supabase
          .from("tracking_events")
          .select("event_timestamp")
          .eq("is_demo", false)
          .neq("status", "invalid_legacy")
          .order("event_timestamp", { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from("tracking_events")
          .select("*", { count: "exact", head: true })
          .eq("is_demo", false)
          .neq("status", "invalid_legacy"),
        supabase
          .from("tracking_events")
          .select("platform_id, event_timestamp, original_amount, original_currency, converted_amount_brl, exchange_rate")
          .eq("is_demo", false)
          .neq("status", "invalid_legacy")
          .eq("canonical_event_name", "withdrawable_revenue")
          .order("event_timestamp", { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);

      return {
        metrics: metricsRes.data || [],
        realClicksCount: clicksRes.count || 0,
        lastEventTs: lastEventRes.data?.event_timestamp || null,
        eventCount: eventCountRes.count || 0,
        latestWithdrawable: withdrawableRes.data || null,
      };
    },
    refetchInterval: 5_000,
    refetchOnWindowFocus: true,
  });

  const metrics = trackingData?.metrics ?? [];
  const realClicksCount = trackingData?.realClicksCount ?? 0;
  const lastEventTs = trackingData?.lastEventTs ?? null;
  const eventCount = trackingData?.eventCount ?? 0;
  const latestWithdrawable = trackingData?.latestWithdrawable ?? null;

  const consolidated = useMemo((): ConsolidatedMetrics => {
    const result: ConsolidatedMetrics = {
      totalClicks: 0,
      totalRegistrations: 0,
      totalFtd: 0,
      totalDeposits: 0,
      totalRedeposits: 0,
      revenueOriginal: 0,
      revenueOriginalCurrency: "USD",
      revenueBrl: 0,
      lastExchangeRate: null,
      lastExchangeRateTimestamp: null,
      lastEventTimestamp: lastEventTs,
      eventCount,
      platformName: null,
      hasMultipleCurrencies: false,
      byCurrency: {},
      realClicksCount,
      latestWithdrawableOriginal: latestWithdrawable?.original_amount ?? latestWithdrawable?.converted_amount_brl ?? null,
      latestWithdrawableCurrency: latestWithdrawable?.original_currency ?? (latestWithdrawable?.converted_amount_brl != null ? "BRL" : null),
      latestWithdrawableBrl: latestWithdrawable?.converted_amount_brl ?? latestWithdrawable?.original_amount ?? null,
      latestWithdrawableExchangeRate: latestWithdrawable?.exchange_rate ?? null,
      latestWithdrawableTimestamp: latestWithdrawable?.event_timestamp ?? null,
    };

    if (metrics.length === 0 && !latestWithdrawable) return result;

    const firstWithPlatform = metrics.find((m: any) => m.platform_id);
    const platformId = firstWithPlatform?.platform_id || latestWithdrawable?.platform_id || null;
    if (platformId) {
      const plat = (platforms as any[])?.find((p: any) => p.id === platformId);
      if (plat) result.platformName = plat.name;
    }

    const currencies = new Set<string>();

    for (const m of metrics as any[]) {
      result.totalClicks += m.cliques || 0;
      result.totalRegistrations += m.registros || 0;
      result.totalFtd += m.ftd || 0;
      result.totalDeposits += m.depositos_total || 0;
      result.totalRedeposits += m.redepositos || 0;

      const rev = m.revenue || 0;
      const origAmount = m.original_amount || 0;
      const origCurrency = m.original_currency || "BRL";
      const convertedAmount = m.converted_amount || rev;
      const rate = m.exchange_rate || null;

      if (rev > 0) {
        currencies.add(origCurrency);
        if (!result.byCurrency[origCurrency]) {
          result.byCurrency[origCurrency] = { total: 0, convertedBrl: 0, rate };
        }
        result.byCurrency[origCurrency].total += origAmount;
        result.byCurrency[origCurrency].convertedBrl += convertedAmount;
        if (rate) result.byCurrency[origCurrency].rate = rate;

        result.revenueOriginal += origAmount;
        result.revenueBrl += convertedAmount;
        result.revenueOriginalCurrency = origCurrency;

        if (rate) {
          result.lastExchangeRate = rate;
          const rateTs = m.exchange_rate_timestamp;
          if (rateTs) result.lastExchangeRateTimestamp = rateTs;
        }
      }
    }

    result.hasMultipleCurrencies = currencies.size > 1;

    return result;
  }, [metrics, platforms, realClicksCount, lastEventTs, eventCount, latestWithdrawable]);

  return {
    consolidated,
    realEvents: [],
    isLoading: metricsLoading,
    hasData: metrics.length > 0 || eventCount > 0 || !!latestWithdrawable,
  };
}
