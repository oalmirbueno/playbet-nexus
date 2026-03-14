import { useMemo } from "react";
import { useTrackingEvents, usePlatformAccounts } from "@/hooks/useTrackingData";
import { usePlatforms } from "@/hooks/useSupabaseQuery";

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
}

export function useAutoConsolidation() {
  const { data: events, isLoading: eventsLoading } = useTrackingEvents();
  const { data: accounts } = usePlatformAccounts();
  const { data: platforms } = usePlatforms();

  const realEvents = useMemo(() =>
    events.filter(e => !e.is_demo && !e.click_id?.startsWith("{")),
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
      eventCount: realEvents.length,
      platformName: null,
      hasMultipleCurrencies: false,
      byCurrency: {},
    };

    if (realEvents.length === 0) return result;

    // Get platform name from first event
    const firstPlatformId = realEvents[0]?.platform_id;
    if (firstPlatformId) {
      const plat = (platforms as any[]).find((p: any) => p.id === firstPlatformId);
      if (plat) result.platformName = plat.name;
    }

    const currencies = new Set<string>();

    for (const ev of realEvents) {
      const evName = ev.canonical_event_name;
      if (evName === "click") result.totalClicks++;
      else if (evName === "registration") result.totalRegistrations++;
      else if (evName === "ftd") result.totalFtd++;
      else if (evName === "deposit") result.totalDeposits++;
      else if (evName === "redeposit") result.totalRedeposits++;

      // Currency tracking
      const origCurrency = (ev as any).original_currency || ev.currency || "BRL";
      const origAmount = (ev as any).original_amount ?? ev.amount ?? 0;
      const convertedBrl = (ev as any).converted_amount_brl ?? ev.amount ?? 0;
      const rate = (ev as any).exchange_rate ?? null;

      if (origAmount && (evName === "revenue" || evName === "ftd" || evName === "deposit" || evName === "redeposit")) {
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
      }

      if (rate) {
        result.lastExchangeRate = rate;
        const rateTs = (ev as any).exchange_rate_timestamp;
        if (rateTs) result.lastExchangeRateTimestamp = rateTs;
      }
    }

    result.hasMultipleCurrencies = currencies.size > 1;
    result.lastEventTimestamp = realEvents[0]?.event_timestamp || null;

    return result;
  }, [realEvents, platforms]);

  return {
    consolidated,
    realEvents,
    isLoading: eventsLoading,
    hasData: realEvents.length > 0,
  };
}
