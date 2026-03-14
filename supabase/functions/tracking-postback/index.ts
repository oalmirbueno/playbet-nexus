import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const CANONICAL_EVENTS = [
  "click", "registration", "ftd", "deposit", "redeposit",
  "revenue", "withdrawable_revenue", "app_install", "qualified_player",
];

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isValidUuid(val: string | null | undefined): boolean {
  return !!val && UUID_REGEX.test(val);
}

function toUuidOrNull(val: string | null | undefined): string | null {
  return isValidUuid(val) ? val! : null;
}

// Fetch USD→BRL exchange rate from free API
async function fetchExchangeRate(from: string, to: string): Promise<{ rate: number; timestamp: string } | null> {
  if (from.toUpperCase() === to.toUpperCase()) return { rate: 1, timestamp: new Date().toISOString() };
  try {
    const res = await fetch(`https://open.er-api.com/v6/latest/${from.toUpperCase()}`);
    if (!res.ok) return null;
    const data = await res.json();
    const rate = data?.rates?.[to.toUpperCase()];
    if (!rate) return null;
    return { rate, timestamp: new Date(data.time_last_update_utc || Date.now()).toISOString() };
  } catch (e) {
    console.error("Exchange rate fetch failed:", e);
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const url = new URL(req.url);
    const pathParts = url.pathname.split("/").filter(Boolean);
    const platformSlug = pathParts[1] || null;

    // Collect params from query string (GET) or body (POST)
    let params: Record<string, string> = {};
    url.searchParams.forEach((v, k) => { params[k] = v; });

    if (req.method === "POST") {
      try {
        const body = await req.json();
        if (body && typeof body === "object") {
          for (const [k, v] of Object.entries(body)) {
            if (v !== null && v !== undefined) params[k] = String(v);
          }
        }
      } catch { /* ignore non-JSON bodies */ }
    }

    // Resolve platform
    let platformId: string | null = null;
    let platformAccountId: string | null = null;
    let accountCurrency: string = "BRL";

    if (platformSlug) {
      const { data: plat } = await supabase
        .from("platforms")
        .select("id, currency")
        .ilike("name", `%${platformSlug}%`)
        .limit(1)
        .single();
      if (plat) {
        platformId = plat.id;
      }
    }

    // Look for platform_account_id in params or resolve from platform
    if (isValidUuid(params.platform_account_id)) {
      platformAccountId = params.platform_account_id;
    } else if (platformId) {
      const { data: acc } = await supabase
        .from("platform_accounts")
        .select("id, moeda")
        .eq("platform_id", platformId)
        .eq("is_active", true)
        .limit(1)
        .single();
      if (acc) {
        platformAccountId = acc.id;
        accountCurrency = acc.moeda || "BRL";
      }
    }

    // If we have platform_account_id, fetch its currency
    if (platformAccountId && accountCurrency === "BRL") {
      const { data: accData } = await supabase
        .from("platform_accounts")
        .select("moeda")
        .eq("id", platformAccountId)
        .single();
      if (accData?.moeda) accountCurrency = accData.moeda;
    }

    // Get event mapping
    const rawEvent = params.event || params.action || params.type || "unknown";
    let canonicalEvent = rawEvent;

    if (platformId) {
      const { data: m } = await supabase
        .from("platform_event_mappings")
        .select("*")
        .eq("platform_id", platformId)
        .eq("raw_event_name", rawEvent)
        .eq("is_active", true)
        .limit(1)
        .single();
      if (m) {
        canonicalEvent = m.canonical_event_name;
      }
    }

    // If no mapping found, try to match canonical directly
    if (CANONICAL_EVENTS.includes(rawEvent)) {
      canonicalEvent = rawEvent;
    }

    // Extract SUBIDs
    const sub1 = params.sub1 || params.click_id || null;
    const sub2 = params.sub2 || null;
    const sub3 = params.sub3 || null;

    const clickId = sub1;
    const influencerId = toUuidOrNull(sub2) || toUuidOrNull(params.influencer_id);
    const campanhaId = toUuidOrNull(sub3) || toUuidOrNull(params.campanha_id);

    // Parse amount safely
    const parsedAmount = params.amount ? parseFloat(params.amount) : null;
    const parsedCommission = params.commission ? parseFloat(params.commission) : null;

    // Determine original currency from params or account
    const originalCurrency = (params.currency || accountCurrency || "BRL").toUpperCase();
    const originalAmount = !isNaN(parsedAmount!) ? parsedAmount : null;

    // Convert to BRL if needed
    let convertedAmountBrl = originalAmount;
    let exchangeRate: number | null = null;
    let exchangeRateTimestamp: string | null = null;

    if (originalAmount !== null && originalCurrency !== "BRL") {
      const rateData = await fetchExchangeRate(originalCurrency, "BRL");
      if (rateData) {
        exchangeRate = rateData.rate;
        exchangeRateTimestamp = rateData.timestamp;
        convertedAmountBrl = Math.round(originalAmount * rateData.rate * 100) / 100;
      }
    }

    // Capture platform-native metadata fields
    const platformMeta: Record<string, string> = {};
    const metaFields = ["event_id", "date", "hash_id", "hash_name", "source_id", "source_name"];
    for (const field of metaFields) {
      if (params[field]) {
        platformMeta[field] = params[field];
      }
    }

    const rawPayload = {
      ...params,
      _platform_meta: Object.keys(platformMeta).length > 0 ? platformMeta : undefined,
    };

    // Build event record
    const eventRecord: Record<string, any> = {
      platform_id: platformId,
      platform_account_id: platformAccountId,
      click_id: clickId,
      platform_user_id: params.user_id || params.player_id || null,
      raw_event_name: rawEvent,
      canonical_event_name: canonicalEvent,
      event_timestamp: params.timestamp || params.date
        ? new Date(parseInt(params.date) * 1000 || params.timestamp || Date.now()).toISOString()
        : new Date().toISOString(),
      transaction_id: params.transaction_id || params.tid || null,
      amount: convertedAmountBrl,
      currency: "BRL",
      original_amount: originalAmount,
      original_currency: originalCurrency,
      converted_amount_brl: convertedAmountBrl,
      exchange_rate: exchangeRate,
      exchange_rate_timestamp: exchangeRateTimestamp,
      commission_amount: !isNaN(parsedCommission!) ? parsedCommission : null,
      status: params.status || null,
      country: params.country || null,
      source_type: "postback",
      raw_payload: rawPayload,
      influencer_id: influencerId,
      campanha_id: campanhaId,
      is_duplicate: false,
    };

    // === DEDUPLICATION ===
    const txId = eventRecord.transaction_id;
    if (txId && platformAccountId) {
      const { data: existing } = await supabase
        .from("tracking_events")
        .select("id")
        .eq("platform_account_id", platformAccountId)
        .eq("transaction_id", txId)
        .eq("raw_event_name", rawEvent)
        .limit(1)
        .maybeSingle();
      if (existing) {
        return new Response(
          JSON.stringify({ status: "duplicate", message: "Event already recorded", existing_id: existing.id }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    if (!txId && clickId && platformId) {
      const windowStart = new Date(Date.now() - 60_000).toISOString();
      const { data: existing } = await supabase
        .from("tracking_events")
        .select("id")
        .eq("platform_id", platformId)
        .eq("click_id", clickId)
        .eq("raw_event_name", rawEvent)
        .gte("event_timestamp", windowStart)
        .limit(1)
        .maybeSingle();
      if (existing) {
        return new Response(
          JSON.stringify({ status: "duplicate", message: "Recent duplicate event detected", existing_id: existing.id }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Insert event
    const { data: inserted, error: insertError } = await supabase
      .from("tracking_events")
      .insert(eventRecord)
      .select()
      .single();

    if (insertError) {
      if (insertError.code === "23505") {
        return new Response(
          JSON.stringify({ status: "duplicate", message: "Event already recorded (constraint)" }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (insertError.code === "23503") {
        console.warn("FK violation, retrying without FK fields:", insertError.message);
        eventRecord.influencer_id = null;
        eventRecord.campanha_id = null;
        const { data: retry, error: retryErr } = await supabase
          .from("tracking_events")
          .insert(eventRecord)
          .select()
          .single();
        if (retryErr) throw retryErr;
        return new Response(
          JSON.stringify({
            status: "ok",
            event_id: retry.id,
            canonical_event: canonicalEvent,
            original_amount: originalAmount,
            original_currency: originalCurrency,
            converted_brl: convertedAmountBrl,
            exchange_rate: exchangeRate,
            warning: "FK fields cleared",
          }),
          { status: 201, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw insertError;
    }

    return new Response(
      JSON.stringify({
        status: "ok",
        event_id: inserted.id,
        canonical_event: canonicalEvent,
        original_amount: originalAmount,
        original_currency: originalCurrency,
        converted_brl: convertedAmountBrl,
        exchange_rate: exchangeRate,
      }),
      { status: 201, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("Postback error:", err);
    return new Response(
      JSON.stringify({ status: "error", message: err.message || "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
