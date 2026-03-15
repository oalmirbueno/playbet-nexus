import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTrackingEvents, usePlatformAccounts } from "@/hooks/useTrackingData";
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

/** Check if an event is valid for consolidation */
function isValidEvent(e: any): boolean {
  if (e.is_demo) return false;
  if (e.status === "invalid_legacy") return false;
  if (e.canonical_event_name?.startsWith("{")) return false;
  // Only exclude placeholder click_ids for click events
  if (e.canonical_event_name === "click" && e.click_id?.startsWith("{")) return false;
  if (e.transaction_id === "null") return false;
  return true;
}

/** Check if a revenue event has trustworthy financial data */
function isValidRevenue(e: any): boolean {
  if (!isValidEvent(e)) return false;
  const evName = e.canonical_event_name;
  if (evName !== "revenue" && evName !== "ftd" && evName !== "deposit" && evName !== "redeposit") return false;
  const origAmount = e.original_amount;
  const origCurrency = e.original_currency;
  if (origAmount == null || !origCurrency) return false;
  if (origCurrency !== "BRL" && !e.exchange_rate) return false;
  return true;
}

export function useAutoConsolidation() {
  const { data: events, isLoading: eventsLoading } = useTrackingEvents();
  const { data: accounts } = usePlatformAccounts();
  const { data: platforms } = usePlatforms();

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

  const validEvents = useMemo(() =>
    events.filter(isValidEvent),
    [events]
  );

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
      lastEventTimestamp: null,
      eventCount: validEvents.length,
      platformName: null,
      hasMultipleCurrencies: false,
      byCurrency: {},
      realClicksCount,
    };

    if (validEvents.length === 0) return result;

    const firstPlatformId = validEvents[0]?.platform_id;
    if (firstPlatformId) {
      const plat = (platforms as any[]).find((p: any) => p.id === firstPlatformId);
      if (plat) result.platformName = plat.name;
    }

    const currencies = new Set<string>();

    for (const ev of validEvents) {
      const evName = ev.canonical_event_name;
      if (evName === "click") result.totalClicks++;
      else if (evName === "registration") result.totalRegistrations++;
      else if (evName === "ftd") result.totalFtd++;
      else if (evName === "deposit") result.totalDeposits++;
      else if (evName === "redeposit") result.totalRedeposits++;

      if (isValidRevenue(ev)) {
        const origCurrency = (ev as any).original_currency;
        const origAmount = (ev as any).original_amount;
        const convertedBrl = (ev as any).converted_amount_brl ?? origAmount;
        const rate = (ev as any).exchange_rate ?? null;

        currencies.add(origCurrency);
        if (!result.byCurrency[origCurrency]) {
          result.byCurrency[origCurrency] = { total: 0, convertedBrl: 0, rate };
        }
        result.byCurrency[origCurrency].total += origAmount;
        result.byCurrency[origCurrency].convertedBrl += convertedBrl || 0;
        if (rate) result.byCurrency[origCurrency].rate = rate;

        result.revenueOriginal += origAmount;
        result.revenueBrl += convertedBrl || 0;
        result.revenueOriginalCurrency = origCurrency;

        if (rate) {
          result.lastExchangeRate = rate;
          const rateTs = (ev as any).exchange_rate_timestamp;
          if (rateTs) result.lastExchangeRateTimestamp = rateTs;
        }
      }
    }

    result.hasMultipleCurrencies = currencies.size > 1;
    result.lastEventTimestamp = validEvents[0]?.event_timestamp || null;

    return result;
  }, [validEvents, platforms, realClicksCount]);

  return {
    consolidated,
    realEvents: validEvents,
    isLoading: eventsLoading,
    hasData: validEvents.length > 0,
  };
}
