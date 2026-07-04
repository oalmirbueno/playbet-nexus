// Link Report Reconciliation
//
// Compares Dashboard/Tracking totals (aggregate of tracking_metrics for the
// period) against the SUM of the same metrics broken down by tracking_link_id
// (i.e. what the "Link Report" panel shows per link). Any delta means clicks/
// FTDs/revenue exist in the dashboard totals that are NOT attributed to any
// link — a divergence that needs to be resolved so per-link tracking is trust-
// worthy for commission payouts.
//
// Invocation: POST /functions/v1/link-report-reconcile
//   body: { period?: "24h"|"7d"|"30d"|"90d" (default "7d"), platform_id?: uuid }
//
// Also scheduled daily via pg_cron.

// deno-lint-ignore-file no-explicit-any
import { createClient } from "npm:@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

type Period = "24h" | "7d" | "30d" | "90d";

function periodRange(p: Period): { start: string; end: string } {
  const end = new Date();
  const start = new Date(end);
  if (p === "24h") start.setDate(start.getDate() - 1);
  else if (p === "7d") start.setDate(start.getDate() - 7);
  else if (p === "30d") start.setDate(start.getDate() - 30);
  else start.setDate(start.getDate() - 90);
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  return { start: iso(start), end: iso(end) };
}

const THRESHOLDS = {
  clicks: { minor: 5, major: 30, critical: 150 },
  registrations: { minor: 1, major: 5, critical: 20 },
  ftd: { minor: 1, major: 3, critical: 10 },
  deposits_total: { minor: 25, major: 250, critical: 1500 },
  revenue: { minor: 10, major: 100, critical: 1000 },
  commission: { minor: 10, major: 100, critical: 1000 },
} as const;

type Sev = "ok" | "minor" | "major" | "critical";
const rank: Record<Sev, number> = { ok: 0, minor: 1, major: 2, critical: 3 };

function classifyDelta(v: number, t: { minor: number; major: number; critical: number }): Sev {
  const a = Math.abs(v);
  if (a >= t.critical) return "critical";
  if (a >= t.major) return "major";
  if (a >= t.minor) return "minor";
  return "ok";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
    const period: Period = (body.period as Period) ?? "7d";
    const platformId: string | null = body.platform_id ?? null;
    const { start, end } = periodRange(period);

    const sb = createClient(SUPABASE_URL, SERVICE_ROLE);

    let q = sb
      .from("tracking_metrics")
      .select(
        "tracking_link_id, cliques, registros, ftd, depositos_total, revenue, commission_total, revshare_commission, cpa_commission",
      )
      .gte("data_ref", start)
      .lte("data_ref", end)
      .or("is_demo.is.false,is_demo.is.null");
    if (platformId) q = q.eq("platform_id", platformId);

    const { data, error } = await q;
    if (error) throw error;

    const tot = {
      clicks: 0, registrations: 0, ftd: 0, deposits: 0, revenue: 0, commission: 0,
    };
    const lnk = { ...tot };
    const seenLinks = new Set<string>();
    let unattributed = 0;

    for (const r of data ?? []) {
      const row: any = r;
      const clicks = Number(row.cliques || 0);
      const regs = Number(row.registros || 0);
      const ftd = Number(row.ftd || 0);
      const dep = Number(row.depositos_total || 0);
      const rev = Number(row.revenue || 0);
      const com = Number(row.commission_total || 0) ||
        Number(row.revshare_commission || 0) + Number(row.cpa_commission || 0);

      tot.clicks += clicks; tot.registrations += regs; tot.ftd += ftd;
      tot.deposits += dep; tot.revenue += rev; tot.commission += com;

      if (row.tracking_link_id) {
        seenLinks.add(row.tracking_link_id);
        lnk.clicks += clicks; lnk.registrations += regs; lnk.ftd += ftd;
        lnk.deposits += dep; lnk.revenue += rev; lnk.commission += com;
      } else if (clicks + regs + ftd + dep + rev + com > 0) {
        unattributed += 1;
      }
    }

    const diff = {
      clicks: tot.clicks - lnk.clicks,
      registrations: tot.registrations - lnk.registrations,
      ftd: tot.ftd - lnk.ftd,
      deposits: tot.deposits - lnk.deposits,
      revenue: tot.revenue - lnk.revenue,
      commission: tot.commission - lnk.commission,
    };

    const sevs: Sev[] = [
      classifyDelta(diff.clicks, THRESHOLDS.clicks),
      classifyDelta(diff.registrations, THRESHOLDS.registrations),
      classifyDelta(diff.ftd, THRESHOLDS.ftd),
      classifyDelta(diff.deposits, THRESHOLDS.deposits_total),
      classifyDelta(diff.revenue, THRESHOLDS.revenue),
      classifyDelta(diff.commission, THRESHOLDS.commission),
    ];
    const worst = sevs.reduce<Sev>((acc, s) => (rank[s] > rank[acc] ? s : acc), "ok");
    const divergent = worst !== "ok" || unattributed > 0;

    const { data: inserted, error: insErr } = await sb
      .from("link_reconciliations")
      .insert({
        period_label: period,
        period_start: start,
        period_end: end,
        platform_id: platformId,
        dash_clicks: tot.clicks,
        dash_registrations: tot.registrations,
        dash_ftd: tot.ftd,
        dash_deposits_total: tot.deposits,
        dash_revenue: tot.revenue,
        dash_commission: tot.commission,
        links_clicks: lnk.clicks,
        links_registrations: lnk.registrations,
        links_ftd: lnk.ftd,
        links_deposits_total: lnk.deposits,
        links_revenue: lnk.revenue,
        links_commission: lnk.commission,
        diff_clicks: diff.clicks,
        diff_registrations: diff.registrations,
        diff_ftd: diff.ftd,
        diff_deposits_total: diff.deposits,
        diff_revenue: diff.revenue,
        diff_commission: diff.commission,
        unattributed_link_count: unattributed,
        severity: worst,
        divergent,
        notes: `${seenLinks.size} link(s) atribuídos`,
      })
      .select()
      .single();
    if (insErr) throw insErr;

    return new Response(
      JSON.stringify({ ok: true, reconciliation: inserted }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 },
    );
  } catch (e: any) {
    console.error("link-report-reconcile", e);
    return new Response(
      JSON.stringify({ ok: false, error: String(e?.message ?? e) }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 },
    );
  }
});
