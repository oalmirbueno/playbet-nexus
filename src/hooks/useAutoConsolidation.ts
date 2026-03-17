// Consolidated tracking data hook
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

type TrackingEventRow = {
  id: string;
  platform_id: string | null;
  canonical_event_name: string;
  event_timestamp: string;
  original_amount: number | null;
  original_currency: string | null;
  converted_amount_brl: number | null;
  exchange_rate: number | null;
  exchange_rate_timestamp: string | null;
  status: string | null;
  transaction_id: string | null;
};

function isValidTrackingEvent(event: TrackingEventRow) {
  return event.status !== "invalid_legacy" && !event.canonical_event_name?.startsWith("{");
}

function getEventAmountBrl(event: TrackingEventRow) {
  if (event.converted_amount_brl != null) return Number(event.converted_amount_brl);
  if ((event.original_currency || "BRL").toUpperCase() === "BRL" && event.original_amount != null) {
    return Number(event.original_amount);
  }
  return 0;
}

export function useAutoConsolidation() {
  const { data: platforms } = usePlatforms();

  const { data: trackingData, isLoading } = useQuery({
    queryKey: ["tracking_consolidated_real_source"],
    queryFn: async () => {
      const [eventsRes, clicksRes] = await Promise.all([
        supabase
          .from("tracking_events")
          .select(
            "id, platform_id, canonical_event_name, event_timestamp, original_amount, original_currency, converted_amount_brl, exchange_rate, exchange_rate_timestamp, status, transaction_id",
          )
          .eq("is_demo", false)
          .order("event_timestamp", { ascending: false }),
        supabase
          .from("clicks")
          .select("*", { count: "exact", head: true })
          .eq("is_demo", false),
      ]);

      if (eventsRes.error) throw eventsRes.error;
      if (clicksRes.error) throw clicksRes.error;

      return {
        events: (eventsRes.data || []) as TrackingEventRow[],
        realClicksCount: clicksRes.count || 0,
      };
    },
    refetchInterval: 5_000,
    refetchOnWindowFocus: true,
  });

  const realClicksCount = trackingData?.realClicksCount ?? 0;
  const validEvents = useMemo(
    () => (trackingData?.events ?? []).filter(isValidTrackingEvent),
    [trackingData?.events],
  );

  const latestWithdrawable = useMemo(
    () => validEvents.find((event) => event.canonical_event_name === "withdrawable_revenue") ?? null,
    [validEvents],
  );

  const consolidated = useMemo((): ConsolidatedMetrics => {
    const result: ConsolidatedMetrics = {
      totalClicks: realClicksCount,
      totalRegistrations: 0,
      totalFtd: 0,
      totalDeposits: 0,
      totalRedeposits: 0,
      revenueOriginal: 0,
      revenueOriginalCurrency: "BRL",
      revenueBrl: 0,
      lastExchangeRate: null,
      lastExchangeRateTimestamp: null,
      lastEventTimestamp: validEvents[0]?.event_timestamp ?? null,
      eventCount: validEvents.length,
      platformName: null,
      hasMultipleCurrencies: false,
      byCurrency: {},
      realClicksCount,
      latestWithdrawableOriginal: latestWithdrawable?.original_amount ?? latestWithdrawable?.converted_amount_brl ?? null,
      latestWithdrawableCurrency:
        latestWithdrawable?.original_currency ?? (latestWithdrawable?.converted_amount_brl != null ? "BRL" : null),
      latestWithdrawableBrl:
        latestWithdrawable?.converted_amount_brl ??
        ((latestWithdrawable?.original_currency ?? "BRL") === "BRL" ? latestWithdrawable?.original_amount ?? null : null),
      latestWithdrawableExchangeRate: latestWithdrawable?.exchange_rate ?? null,
      latestWithdrawableTimestamp: latestWithdrawable?.event_timestamp ?? null,
    };

    if (validEvents.length === 0) {
      return result;
    }

    const firstWithPlatform = validEvents.find((event) => event.platform_id);
    const platformId = latestWithdrawable?.platform_id || firstWithPlatform?.platform_id || null;
    if (platformId) {
      const platform = (platforms as any[])?.find((item: any) => item.id === platformId);
      if (platform) result.platformName = platform.name;
    }

    const currencies = new Set<string>();
    const countedDepositTransactions = new Set<string>();

    for (const event of validEvents) {
      switch (event.canonical_event_name) {
        case "registration":
          result.totalRegistrations += 1;
          break;
        case "ftd": {
          result.totalFtd += 1;
          const depositKey = event.transaction_id ? `tx:${event.transaction_id}` : `evt:${event.id}`;
          if (!countedDepositTransactions.has(depositKey)) {
            countedDepositTransactions.add(depositKey);
            result.totalDeposits += getEventAmountBrl(event);
          }
          break;
        }
        case "deposit":
        case "redeposit": {
          if (event.canonical_event_name === "redeposit") {
            result.totalRedeposits += 1;
          }
          const depositKey = event.transaction_id ? `tx:${event.transaction_id}` : `evt:${event.id}`;
          if (!countedDepositTransactions.has(depositKey)) {
            countedDepositTransactions.add(depositKey);
            result.totalDeposits += getEventAmountBrl(event);
          }
          break;
        }
        case "revenue": {
          const originalCurrency = (event.original_currency || "BRL").toUpperCase();
          const originalAmount = Number(event.original_amount ?? getEventAmountBrl(event));
          const convertedAmount = getEventAmountBrl(event);
          const rate = event.exchange_rate != null ? Number(event.exchange_rate) : null;

          currencies.add(originalCurrency);
          if (!result.byCurrency[originalCurrency]) {
            result.byCurrency[originalCurrency] = { total: 0, convertedBrl: 0, rate };
          }

          result.byCurrency[originalCurrency].total += originalAmount;
          result.byCurrency[originalCurrency].convertedBrl += convertedAmount;
          if (rate != null) result.byCurrency[originalCurrency].rate = rate;

          result.revenueOriginal += originalAmount;
          result.revenueBrl += convertedAmount;
          result.revenueOriginalCurrency = originalCurrency;

          if (rate != null) {
            result.lastExchangeRate = rate;
            if (event.exchange_rate_timestamp) {
              result.lastExchangeRateTimestamp = event.exchange_rate_timestamp;
            }
          }
          break;
        }
        default:
          break;
      }
    }

    result.hasMultipleCurrencies = currencies.size > 1;

    if (result.revenueBrl > 0 && result.revenueOriginal === 0) {
      result.revenueOriginal = result.revenueBrl;
      result.revenueOriginalCurrency = "BRL";
    }

    return result;
  }, [latestWithdrawable, platforms, realClicksCount, validEvents]);

  return {
    consolidated,
    realEvents: validEvents,
    isLoading,
    hasData: validEvents.length > 0 || realClicksCount > 0,
  };
}
