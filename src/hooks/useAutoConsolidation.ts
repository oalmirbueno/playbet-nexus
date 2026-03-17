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
}

export function useAutoConsolidation() {
  const { data: platforms } = usePlatforms();

  // Pull from tracking_metrics (server-side consolidated, always up to date via trigger)
  const { data: metrics = [], isLoading: metricsLoading } = useQuery({
    queryKey: ["tracking_metrics_consolidated"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tracking_metrics")
        .select("*")
        .eq("is_demo", false)
        .eq("origem_importacao", "auto_consolidation")
        .order("data_ref", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    refetchInterval: 5_000,
    refetchOnWindowFocus: true,
  });

  // Real clicks count from clicks table
  const { data: realClicksCount = 0 } = useQuery({
    queryKey: ["real_clicks_count"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("clicks")
        .select("*", { count: "exact", head: true })
        .eq("is_demo", false);
      if (error) return 0;
      return count || 0;
    },
  });

  // Last event timestamp
  const { data: lastEventTs = null } = useQuery({
    queryKey: ["last_event_timestamp"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tracking_events")
        .select("event_timestamp")
        .eq("is_demo", false)
        .order("event_timestamp", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error || !data) return null;
      return data.event_timestamp;
    },
    refetchInterval: 30_000,
  });

  // Total valid event count
  const { data: eventCount = 0 } = useQuery({
    queryKey: ["valid_events_count"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("tracking_events")
        .select("*", { count: "exact", head: true })
        .eq("is_demo", false)
        .neq("status", "invalid_legacy");
      if (error) return 0;
      return count || 0;
    },
    refetchInterval: 30_000,
  });

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
    };

    if (metrics.length === 0) return result;

    // Get platform name from first metric with a platform_id
    const firstWithPlatform = metrics.find((m: any) => m.platform_id);
    if (firstWithPlatform) {
      const plat = (platforms as any[])?.find((p: any) => p.id === firstWithPlatform.platform_id);
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
  }, [metrics, platforms, realClicksCount, lastEventTs, eventCount]);

  return {
    consolidated,
    realEvents: [], // deprecated - use tracking_events queries directly if needed
    isLoading: metricsLoading,
    hasData: metrics.length > 0 || eventCount > 0,
  };
}
