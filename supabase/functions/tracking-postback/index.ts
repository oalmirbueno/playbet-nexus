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
    // /tracking-postback/{platform_slug}
    const platformSlug = pathParts[1] || null;

    // Collect params from query string (GET postback) or body (POST)
    let params: Record<string, string> = {};
    url.searchParams.forEach((v, k) => { params[k] = v; });

    if (req.method === "POST") {
      try {
        const body = await req.json();
        params = { ...params, ...body };
      } catch { /* ignore non-JSON bodies */ }
    }

    // Resolve platform
    let platformId: string | null = null;
    let platformAccountId: string | null = null;

    if (platformSlug) {
      const { data: plat } = await supabase
        .from("platforms")
        .select("id")
        .ilike("name", `%${platformSlug}%`)
        .limit(1)
        .single();
      if (plat) platformId = plat.id;
    }

    // Look for platform_account_id in params or resolve from platform
    if (params.platform_account_id) {
      platformAccountId = params.platform_account_id;
    } else if (platformId) {
      const { data: acc } = await supabase
        .from("platform_accounts")
        .select("id")
        .eq("platform_id", platformId)
        .eq("is_active", true)
        .limit(1)
        .single();
      if (acc) platformAccountId = acc.id;
    }

    // Get event mapping
    const rawEvent = params.event || params.action || params.type || "unknown";
    let canonicalEvent = rawEvent;
    let mapping: any = null;

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
        mapping = m;
        canonicalEvent = m.canonical_event_name;
      }
    }

    // If no mapping found, try to match canonical directly
    if (!mapping && CANONICAL_EVENTS.includes(rawEvent)) {
      canonicalEvent = rawEvent;
    }

    // Extract SUBIDs
    const sub1 = params.sub1 || params.click_id || null;
    const sub2 = params.sub2 || null;
    const sub3 = params.sub3 || null;

    // Resolve relationships from SUBIDs
    const clickId = sub1;
    const influencerId = sub2 || params.influencer_id || null;
    const campanhaId = sub3 || params.campanha_id || null;

    // Build event record
    const eventRecord: Record<string, any> = {
      platform_id: platformId,
      platform_account_id: platformAccountId,
      click_id: clickId,
      platform_user_id: params.user_id || params.player_id || null,
      raw_event_name: rawEvent,
      canonical_event_name: canonicalEvent,
      event_timestamp: params.timestamp ? new Date(params.timestamp).toISOString() : new Date().toISOString(),
      transaction_id: params.transaction_id || params.tid || null,
      amount: params.amount ? parseFloat(params.amount) : null,
      currency: params.currency || "BRL",
      commission_amount: params.commission ? parseFloat(params.commission) : null,
      status: params.status || null,
      country: params.country || null,
      source_type: "postback",
      raw_payload: params,
      influencer_id: influencerId,
      campanha_id: campanhaId,
      is_duplicate: false,
    };

    // Pre-check dedup for events with transaction_id (timestamp-independent)
    if (eventRecord.transaction_id && platformAccountId) {
      const { data: existing } = await supabase
        .from("tracking_events")
        .select("id")
        .eq("platform_account_id", platformAccountId)
        .eq("transaction_id", eventRecord.transaction_id)
        .eq("raw_event_name", rawEvent)
        .limit(1)
        .maybeSingle();
      if (existing) {
        return new Response(
          JSON.stringify({ status: "duplicate", message: "Event already recorded" }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Attempt insert
    const { data: inserted, error: insertError } = await supabase
      .from("tracking_events")
      .insert(eventRecord)
      .select()
      .single();

    if (insertError) {
      // Check if dedup violation
      if (insertError.code === "23505") {
        return new Response(
          JSON.stringify({ status: "duplicate", message: "Event already recorded" }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw insertError;
    }

    return new Response(
      JSON.stringify({ status: "ok", event_id: inserted.id, canonical_event: canonicalEvent }),
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
