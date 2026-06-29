// Smartico / TheAffiliatePlatform (TAP) puller
// Pulls daily affiliate report for EstrelaBet + VUPI (same operator)
// and consolidates into tracking_metrics with origem_importacao='smartico_api_pull'.
//
// Auth: static API key in STELLAR_TAP_API_KEY secret.
// Schedule: every 30 minutes via pg_cron (configured in migration).

import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const SMARTICO_BASE = "https://boapi.smartico.ai";

type SmarticoRow = {
  dt?: string;
  afp?: string | null;       // sub1 = click_id
  afp1?: string | null;      // sub2 = influencer_id
  afp2?: string | null;      // sub3 = campanha_id
  brand_id?: string | number | null;
  brand_name?: string | null;
  link_id?: string | number | null;
  link_name?: string | null;
  visit_count?: number;
  registration_count?: number;
  ftd_count?: number;
  ftd_total?: number;
  deposit_count?: number;
  deposit_total?: number;
  net_pl?: number;
  commissions_total?: number;
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isUuid = (v: unknown): v is string => typeof v === "string" && UUID_RE.test(v);

function toYmd(d: Date): string {
  return d.toISOString().slice(0, 10);
}

async function fetchReport(apiKey: string, dateFrom: string, dateTo: string) {
  const url = new URL(`${SMARTICO_BASE}/api/af2_media_report_af`);
  url.searchParams.set("aggregation_period", "DAY");
  url.searchParams.set("date_from", dateFrom);
  url.searchParams.set("date_to", dateTo);
  url.searchParams.set("group_by", "afp,afp1,afp2,brand_id");

  const res = await fetch(url.toString(), {
    method: "GET",
    headers: { Authorization: apiKey, Accept: "application/json" },
  });

  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Smartico ${res.status}: ${text.slice(0, 400)}`);
  }
  try {
    return JSON.parse(text) as { data?: SmarticoRow[]; meta?: Record<string, unknown> };
  } catch {
    throw new Error(`Smartico returned non-JSON: ${text.slice(0, 200)}`);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const apiKey = Deno.env.get("STELLAR_TAP_API_KEY");
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: "STELLAR_TAP_API_KEY not configured" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const admin = createClient(SUPABASE_URL, SERVICE_KEY);

  let body: { mode?: "recent" | "range"; date_from?: string; date_to?: string } = {};
  if (req.method === "POST") {
    try { body = await req.json(); } catch { /* allow empty body */ }
  }

  // Default window: last 3 days (covers late conversions / postback lag)
  const today = new Date();
  const tomorrow = new Date(today.getTime() + 86_400_000);
  const threeDaysAgo = new Date(today.getTime() - 3 * 86_400_000);
  const dateFrom = body.date_from ?? toYmd(threeDaysAgo);
  const dateTo = body.date_to ?? toYmd(tomorrow); // exclusive

  try {
    // Load platforms once
    const { data: platforms, error: platErr } = await admin
      .from("platforms")
      .select("id, name")
      .or("name.ilike.%estrela%,name.ilike.%vupi%");
    if (platErr) throw platErr;

    const resolvePlatform = (brandName?: string | null, brandId?: string | number | null) => {
      const bn = (brandName || "").toLowerCase();
      if (bn.includes("estrela")) {
        return platforms?.find((p) => p.name.toLowerCase().includes("estrela"))?.id ?? null;
      }
      if (bn.includes("vupi")) {
        return platforms?.find((p) => p.name.toLowerCase().includes("vupi"))?.id ?? null;
      }
      // fallback: if only one brand exists in account
      if (!brandName && platforms?.length === 1) return platforms[0].id;
      return null;
    };

    const report = await fetchReport(apiKey, dateFrom, dateTo);
    const rows = report.data ?? [];

    let upserts = 0;
    let skipped = 0;
    const errors: string[] = [];

    // Group rows by (date, platform_id, influencer_id) to aggregate sub3/link variants
    const buckets = new Map<string, {
      data_ref: string;
      platform_id: string | null;
      influencer_id: string | null;
      campanha_id: string | null;
      cliques: number;
      registros: number;
      ftd: number;
      deposits_count: number;
      depositos_total: number;
      revenue: number;
      commission: number;
      sample_brand: string | null;
    }>();

    for (const row of rows) {
      const dataRef = (row.dt ?? "").slice(0, 10);
      if (!dataRef) { skipped++; continue; }

      const platformId = resolvePlatform(row.brand_name, row.brand_id);
      if (!platformId) { skipped++; continue; }

      const influencerId = isUuid(row.afp1) ? row.afp1 : null;
      const campanhaId = isUuid(row.afp2) ? row.afp2 : null;

      const key = `${dataRef}|${platformId}|${influencerId ?? "_"}`;
      const b = buckets.get(key) ?? {
        data_ref: dataRef,
        platform_id: platformId,
        influencer_id: influencerId,
        campanha_id: campanhaId,
        cliques: 0,
        registros: 0,
        ftd: 0,
        deposits_count: 0,
        depositos_total: 0,
        revenue: 0,
        commission: 0,
        sample_brand: row.brand_name ?? null,
      };
      b.cliques += Number(row.visit_count ?? 0);
      b.registros += Number(row.registration_count ?? 0);
      b.ftd += Number(row.ftd_count ?? 0);
      b.deposits_count += Number(row.deposit_count ?? 0);
      b.depositos_total += Number(row.deposit_total ?? 0);
      b.revenue += Number(row.net_pl ?? 0);
      b.commission += Number(row.commissions_total ?? 0);
      buckets.set(key, b);
    }

    for (const b of buckets.values()) {
      const payload = {
        data_ref: b.data_ref,
        platform_id: b.platform_id,
        influencer_id: b.influencer_id,
        campanha_id: b.campanha_id,
        cliques: b.cliques,
        registros: b.registros,
        ftd: b.ftd,
        deposits_count: b.deposits_count,
        depositos_total: b.depositos_total,
        revenue: b.revenue,
        original_amount: b.revenue,
        original_currency: "BRL",
        converted_amount: b.revenue,
        converted_currency: "BRL",
        origem_importacao: "smartico_api_pull",
        observacoes: `Stellar TAP / brand=${b.sample_brand ?? "?"} | commission=${b.commission.toFixed(2)}`,
        is_demo: false,
      };

      // Manual upsert because the unique index uses COALESCE(influencer_id, ...)
      let q = admin
        .from("tracking_metrics")
        .select("id")
        .eq("data_ref", b.data_ref)
        .eq("platform_id", b.platform_id)
        .eq("origem_importacao", "smartico_api_pull");
      q = b.influencer_id === null
        ? q.is("influencer_id", null)
        : q.eq("influencer_id", b.influencer_id);
      const { data: existing, error: selErr } = await q.maybeSingle();
      if (selErr) { errors.push(selErr.message); continue; }
      const existingId: string | null = existing?.id ?? null;

      if (existingId) {
        const { error: updErr } = await admin
          .from("tracking_metrics")
          .update({ ...payload, updated_at: new Date().toISOString() })
          .eq("id", existingId);
        if (updErr) { errors.push(updErr.message); continue; }
      } else {
        const { error: insErr } = await admin.from("tracking_metrics").insert(payload);
        if (insErr) { errors.push(insErr.message); continue; }
      }
      upserts++;
    }

    return new Response(
      JSON.stringify({
        ok: true,
        window: { date_from: dateFrom, date_to: dateTo },
        rows_received: rows.length,
        upserts,
        skipped,
        errors: errors.slice(0, 10),
        meta: report.meta ?? null,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return new Response(
      JSON.stringify({ ok: false, error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
