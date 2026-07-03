// Consolidated tracking data hook
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { usePlatforms } from "@/hooks/useSupabaseQuery";
import { supabase } from "@/integrations/supabase/client";

export interface ConsolidatedMetrics {
  totalClicks: number;
  lpViewCount: number;
  outboundClickCount: number;
  conversionEventCount: number;
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
  click_id: string | null;
  canonical_event_name: string;
  event_timestamp: string;
  original_amount: number | null;
  original_currency: string | null;
  converted_amount_brl: number | null;
  exchange_rate: number | null;
  exchange_rate_timestamp: string | null;
  commission_amount: number | null;
  status: string | null;
  is_duplicate?: boolean | null;
  transaction_id: string | null;
  raw_payload?: {
    amount?: string | number | null;
    commission?: string | number | null;
    currency?: string | null;
     event?: string | null;
  } | null;
};

function isValidTrackingEvent(event: TrackingEventRow) {
  return !event.is_duplicate
    && !["invalid_legacy", "invalid_internal_preview", "duplicate_technical"].includes(event.status || "")
    && !event.canonical_event_name?.startsWith("{");
}

function countClickSessions(events: TrackingEventRow[]) {
  const clickEvents = events.filter((event) => event.canonical_event_name === "click");
  const withClickId = new Set(clickEvents.map((event) => event.click_id).filter(Boolean));
  const withoutClickId = clickEvents.filter((event) => !event.click_id).length;
  return withClickId.size + withoutClickId;
}

function isWithdrawableTrackingEvent(event: TrackingEventRow) {
  const rawEvent = typeof event.raw_payload?.event === "string"
    ? event.raw_payload.event.trim().toLowerCase()
    : null;

  return event.canonical_event_name === "withdrawable_revenue" || rawEvent === "available_revenue";
}

function parseEventNumber(value: unknown) {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "string") {
    const normalized = Number(value.replace(",", "."));
    return Number.isFinite(normalized) ? normalized : null;
  }
  return null;
}

function getEventOriginalCurrency(event: TrackingEventRow) {
  if (event.original_currency?.trim()) return event.original_currency.trim().toUpperCase();
  if (typeof event.raw_payload?.currency === "string") {
    const currency = event.raw_payload.currency.trim();
    if (currency && !currency.startsWith("{")) return currency.toUpperCase();
  }
  return event.converted_amount_brl != null ? "BRL" : null;
}

function getEventOriginalAmount(event: TrackingEventRow) {
  const storedAmount = parseEventNumber(event.original_amount);
  if (storedAmount != null) return storedAmount;

  if (event.canonical_event_name === "revenue") {
    const storedCommission = parseEventNumber(event.commission_amount);
    if (storedCommission != null) return storedCommission;

    const payloadCommission = parseEventNumber(event.raw_payload?.commission);
    if (payloadCommission != null) return payloadCommission;
  }

  const payloadAmount = parseEventNumber(event.raw_payload?.amount);
  if (payloadAmount != null) return payloadAmount;

  return null;
}

function getEventAmountBrl(event: TrackingEventRow) {
  if (event.converted_amount_brl != null) return Number(event.converted_amount_brl);

  const originalAmount = getEventOriginalAmount(event);
  const originalCurrency = getEventOriginalCurrency(event);

  if (originalAmount != null && originalCurrency === "BRL") {
    return originalAmount;
  }

  if (originalAmount != null && originalCurrency && originalCurrency !== "BRL" && event.exchange_rate != null) {
    return Math.round(originalAmount * Number(event.exchange_rate) * 100) / 100;
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
            "id, platform_id, canonical_event_name, event_timestamp, original_amount, original_currency, converted_amount_brl, exchange_rate, exchange_rate_timestamp, commission_amount, status, is_duplicate, transaction_id, raw_payload",
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

  const validEvents = useMemo(
    () => (trackingData?.events ?? []).filter(isValidTrackingEvent),
    [trackingData?.events],
  );
  const explicitLpViewCount = validEvents.filter((event) => event.canonical_event_name === "lp_view").length;
  const outboundClickCount = validEvents.filter((event) => event.canonical_event_name === "click").length;
  const lpViewCount = Math.max(explicitLpViewCount, countClickSessions(validEvents));
  const conversionEventCount = validEvents.filter(
    (event) => !["lp_view", "click"].includes(event.canonical_event_name),
  ).length;
  const realClicksCount = outboundClickCount;

  const latestWithdrawable = useMemo(
    () => validEvents.find(isWithdrawableTrackingEvent) ?? null,
    [validEvents],
  );

  const consolidated = useMemo((): ConsolidatedMetrics => {
    const latestWithdrawableOriginalAmount = latestWithdrawable ? getEventOriginalAmount(latestWithdrawable) : null;
    const latestWithdrawableCurrency = latestWithdrawable ? getEventOriginalCurrency(latestWithdrawable) : null;
    let latestWithdrawableBrl = latestWithdrawable?.converted_amount_brl ??
      (latestWithdrawableCurrency === "BRL" ? latestWithdrawableOriginalAmount : null);
    let latestWithdrawableOriginal = latestWithdrawableOriginalAmount ?? latestWithdrawable?.converted_amount_brl ?? null;
    let latestWithdrawableExchangeRate = latestWithdrawable?.exchange_rate ?? null;
    let latestWithdrawableTimestamp = latestWithdrawable?.event_timestamp ?? null;

    if (latestWithdrawable) {
      const snapshotTime = Date.parse(latestWithdrawable.event_timestamp);

      for (const event of validEvents) {
        if (event.canonical_event_name !== "revenue") continue;

        const eventTime = Date.parse(event.event_timestamp);
        if (!Number.isFinite(eventTime) || eventTime <= snapshotTime) continue;

        const eventAmountBrl = getEventAmountBrl(event);
        const eventOriginalAmount = getEventOriginalAmount(event);
        const eventOriginalCurrency = getEventOriginalCurrency(event);

        if (latestWithdrawableBrl == null) {
          latestWithdrawableBrl = 0;
        }
        latestWithdrawableBrl += eventAmountBrl;

        if (latestWithdrawableCurrency === "BRL") {
          if (latestWithdrawableOriginal == null) latestWithdrawableOriginal = 0;
          latestWithdrawableOriginal += eventAmountBrl;
        } else if (
          latestWithdrawableCurrency &&
          eventOriginalCurrency === latestWithdrawableCurrency &&
          eventOriginalAmount != null
        ) {
          if (latestWithdrawableOriginal == null) latestWithdrawableOriginal = 0;
          latestWithdrawableOriginal += eventOriginalAmount;
        }

        if (event.exchange_rate != null) {
          latestWithdrawableExchangeRate = Number(event.exchange_rate);
        }

        if (!latestWithdrawableTimestamp || event.event_timestamp > latestWithdrawableTimestamp) {
          latestWithdrawableTimestamp = event.event_timestamp;
        }
      }
    }

    if (latestWithdrawableBrl != null) {
      latestWithdrawableBrl = Math.round(latestWithdrawableBrl * 100) / 100;
    }
    if (latestWithdrawableOriginal != null) {
      latestWithdrawableOriginal = Math.round(latestWithdrawableOriginal * 100) / 100;
    }

    const result: ConsolidatedMetrics = {
      totalClicks: realClicksCount,
      lpViewCount,
      outboundClickCount,
      conversionEventCount,
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
      latestWithdrawableOriginal,
      latestWithdrawableCurrency,
      latestWithdrawableBrl,
      latestWithdrawableExchangeRate,
      latestWithdrawableTimestamp,
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
          const originalCurrency = getEventOriginalCurrency(event) ?? "BRL";
          const originalAmount = Number(getEventOriginalAmount(event) ?? getEventAmountBrl(event));
          const convertedAmount = getEventAmountBrl(event);
          const rate = event.exchange_rate != null ? Number(event.exchange_rate) : null;

          if (originalAmount === 0 && convertedAmount === 0) {
            break;
          }

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
  }, [conversionEventCount, latestWithdrawable, lpViewCount, outboundClickCount, platforms, realClicksCount, validEvents]);

  return {
    consolidated,
    realEvents: validEvents,
    isLoading,
    hasData: validEvents.length > 0 || realClicksCount > 0,
  };
}
