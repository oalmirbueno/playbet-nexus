// Stellar (Estrela Bet / VUPI) affiliate panel scraper.
//
// Uses the official (undocumented publicly, but auto-discovered via /docs-json)
// Partners API at us-partners-api-node.estrelabet.bet.br. Authenticates via
// POST /api/auth/login, pulls the daily performance report grouped by campaign
// for every brand tied to the account (Estrela Bet, VUPI, ...) and writes it
// into tracking_metrics, attributing rows by campaign_name -> tracking_code.
//
// Run manually via `supabase functions invoke stellar-panel-scraper` or via the
// scheduled hourly cron. Diagnostic payload is stored in panel_scraper_runs.

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

const PANEL_EMAIL = (Deno.env.get("STELLAR_PANEL_EMAIL") ?? "").trim();
const PANEL_PASSWORD = (Deno.env.get("STELLAR_PANEL_PASSWORD") ?? "").trim();

const STELLAR_API_BASE = "https://us-partners-api-node.estrelabet.bet.br/api";
const STELLAR_ORIGIN = "https://partners.estrelabet.bet.br";
const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120";

interface RunHandle {
  id: string;
  discovery: Record<string, any>;
  supabase: ReturnType<typeof createClient>;
}

async function startRun(): Promise<RunHandle> {
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);
  const { data, error } = await supabase
    .from("panel_scraper_runs")
    .insert({
      scraper_key: "stellar",
      status: "running",
      discovery: { api_base: STELLAR_API_BASE },
    })
    .select("id")
    .single();
  if (error) throw error;
  return {
    id: data.id as string,
    discovery: { api_base: STELLAR_API_BASE, steps: [] as any[] },
    supabase,
  };
}

async function finishRun(
  run: RunHandle,
  status: "ok" | "failed" | "discovery_only",
  rows_imported: number,
  message: string,
) {
  await run.supabase
    .from("panel_scraper_runs")
    .update({
      status,
      rows_imported,
      message,
      discovery: run.discovery,
      finished_at: new Date().toISOString(),
    })
    .eq("id", run.id);
}

function log(run: RunHandle, step: string, payload: any) {
  (run.discovery.steps as any[]).push({
    at: new Date().toISOString(),
    step,
    ...payload,
  });
}

// ------------------------------------------------------------------
// Auth
// ------------------------------------------------------------------
interface Session {
  token: string;
  tenantId: string;
  userId?: number;
  email?: string;
}

function decodeJwtPayload(jwt: string): any {
  try {
    const parts = jwt.split(".");
    if (parts.length < 2) return null;
    const b64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const pad = b64.length % 4 === 0 ? "" : "=".repeat(4 - (b64.length % 4));
    return JSON.parse(atob(b64 + pad));
  } catch {
    return null;
  }
}

async function login(run: RunHandle): Promise<Session | null> {
  const res = await fetch(`${STELLAR_API_BASE}/auth/login`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      accept: "application/json",
      origin: STELLAR_ORIGIN,
      referer: STELLAR_ORIGIN + "/",
      "user-agent": UA,
    },
    body: JSON.stringify({ email: PANEL_EMAIL, password: PANEL_PASSWORD }),
  });
  const text = await res.text();
  let json: any = null;
  try {
    json = JSON.parse(text);
  } catch {
    /* html */
  }
  log(run, "auth/login", {
    status: res.status,
    keys: json ? Object.keys(json).slice(0, 20) : [],
    snippet: text.slice(0, 300),
  });
  if (!res.ok || !json) return null;

  const token: string | undefined =
    json.access_token ||
    json.accessToken ||
    json.token ||
    json.jwt ||
    json.data?.access_token ||
    json.data?.accessToken ||
    json.data?.token ||
    json.result?.token;
  if (!token) return null;

  const payload = decodeJwtPayload(token) ?? {};
  const tenantId = String(
    json.tenant_id ??
      json.tenantId ??
      json.data?.tenant_id ??
      payload.tenant_id ??
      payload.tenantId ??
      payload["custom:tenant_id"] ??
      "1",
  );
  const userId =
    json.id ??
    json.user_id ??
    json.data?.id ??
    payload.id ??
    payload.user_id;

  log(run, "auth/decoded", {
    tenantId,
    userId,
    payload_keys: Object.keys(payload).slice(0, 20),
  });

  return { token, tenantId, userId, email: PANEL_EMAIL };
}

function apiHeaders(session: Session, brandSlug?: string): HeadersInit {
  return {
    accept: "application/json",
    "content-type": "application/json",
    origin: STELLAR_ORIGIN,
    referer: STELLAR_ORIGIN + "/",
    "user-agent": UA,
    authorization: `Bearer ${session.token}`,
    tenantid: session.tenantId,
    "x-brand": brandSlug ?? "estrelabet",
  };
}

async function apiGet<T = any>(
  run: RunHandle,
  session: Session,
  path: string,
  brandSlug?: string,
): Promise<{ ok: boolean; status: number; data: T | null; raw: string }> {
  const res = await fetch(STELLAR_API_BASE + path, {
    method: "GET",
    headers: apiHeaders(session, brandSlug),
  });
  const raw = await res.text();
  let data: any = null;
  try {
    data = JSON.parse(raw);
  } catch {
    /* keep null */
  }
  log(run, `GET ${path}`, {
    brand: brandSlug,
    status: res.status,
    snippet: raw.slice(0, 220),
  });
  return { ok: res.ok, status: res.status, data, raw };
}

// ------------------------------------------------------------------
// Brands + report
// ------------------------------------------------------------------
interface Brand {
  brand_id: number;
  brand_name: string;
  brand_slug: string;
  brand_main: boolean;
}

interface PerfItem {
  period: string;
  visits: number;
  registrations: number;
  ftds: number;
  amount_ftds: number;
  deposits: number;
  amount_deposit: number;
  net_deposit: number;
  cpa: number;
  rev_share: number;
  qftds_cpa: number;
  campaign_name: string;
  ggr: number;
  ngr: number;
  brand_id: string;
  brand_name: string;
}

async function fetchBrands(run: RunHandle, session: Session): Promise<Brand[]> {
  // Bootstrap using a default brand slug — the endpoint returns the full list.
  const seeds = ["estrelabet", "vupi", "stellar"];
  for (const seed of seeds) {
    const r = await apiGet<Brand[]>(run, session, "/affiliate-brand", seed);
    if (r.ok && Array.isArray(r.data) && r.data.length) return r.data;
  }
  return [];
}

async function fetchPerformance(
  run: RunHandle,
  session: Session,
  brand: Brand,
  dateStart: string,
  dateEnd: string,
): Promise<PerfItem[]> {
  // Try progressively more granular groupings; the API accepts a small set
  // of keywords. We keep the first non-empty response that gives us a real
  // per-day breakdown (period != "01/01/0001").
  const groupings = ["day,campaign", "day", "date", "campaign"];
  let lastItems: PerfItem[] = [];
  for (const g of groupings) {
    const qs = new URLSearchParams({
      date_start: dateStart,
      date_end: dateEnd,
      group_by: g,
    });
    const r = await apiGet<{ items: PerfItem[]; grouped_items?: any }>(
      run,
      session,
      `/user/performance/report?${qs.toString()}`,
      brand.brand_slug,
    );
    if (!r.ok || !r.data) continue;
    const items = Array.isArray(r.data.items) ? r.data.items : [];
    if (!items.length) continue;
    lastItems = items;
    const hasRealDate = items.some(
      (i) => i.period && !/^01\/01\/0001/.test(i.period),
    );
    if (hasRealDate) {
      log(run, "performance/pick", { brand: brand.brand_slug, group_by: g, count: items.length });
      return items;
    }
  }
  // Fall back to whatever we got even if aggregated.
  return lastItems;
}

// Convert API-provided period strings ("DD/MM/YYYY", "YYYY-MM-DD", ISO) to
// canonical YYYY-MM-DD. When the API returns the sentinel "01/01/0001"
// (aggregate-only), we clamp to the request's end date.
function normalizePeriod(period: string, fallback: string): string {
  if (!period) return fallback;
  const p = period.trim();
  if (/^01\/01\/0001/.test(p)) return fallback;
  const iso = p.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const br = p.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  if (br) return `${br[3]}-${br[2]}-${br[1]}`;
  return fallback;
}

function isRollingAggregatePeriod(period: string): boolean {
  const p = String(period ?? "").trim();
  return !p || /^01\/01\/0001/.test(p);
}


// ------------------------------------------------------------------
// Persistence
// ------------------------------------------------------------------
interface AttributionCtx {
  byCode: Map<string, any>;
  brandToPlatformId: Map<string, string>;
  brandToAccountId: Map<string, string>;
}

async function buildAttribution(
  run: RunHandle,
  campaigns: string[],
  brands: Brand[],
): Promise<AttributionCtx> {
  const codes = Array.from(new Set(campaigns.filter(Boolean)));
  const byCode = new Map<string, any>();
  if (codes.length) {
    const { data: links } = await run.supabase
      .from("tracking_links")
      .select(
        "id, tracking_code, influencer_id, campanha_id, platform_account_id, landing_page_id, landing_page_instance_id",
      )
      .in("tracking_code", codes);
    (links ?? []).forEach((l: any) => byCode.set(l.tracking_code, l));
  }

  // Match brands to platforms by normalized comparison against BOTH
  // platform.slug and platform.name — keeps VUPI rows from being written
  // under Estrela Bet just because a brand slug didn't match by ilike.
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "");
  const brandToPlatformId = new Map<string, string>();
  const brandToAccountId = new Map<string, string>();

  const { data: platforms } = await run.supabase
    .from("platforms")
    .select("id, name, slug");
  const { data: accounts } = await run.supabase
    .from("platform_accounts")
    .select("id, platform_id, is_active")
    .eq("is_demo", false);

  for (const b of brands) {
    const targets = [b.brand_slug, b.brand_name]
      .filter(Boolean)
      .map((x) => norm(String(x)));
    const platform = (platforms ?? []).find((p: any) => {
      const candidates = [norm(p.slug ?? ""), norm(p.name ?? "")];
      return targets.some((t) =>
        candidates.some((c) => c && (c === t || c.includes(t) || t.includes(c))),
      );
    });
    if (!platform?.id) {
      log(run, "attribution/no_platform", { brand: b.brand_slug });
      continue;
    }
    brandToPlatformId.set(b.brand_slug, platform.id as string);
    const acc = (accounts ?? [])
      .filter((a: any) => a.platform_id === platform.id)
      .sort((a: any, b: any) => (b.is_active ? 1 : 0) - (a.is_active ? 1 : 0))[0];
    if (acc?.id) brandToAccountId.set(b.brand_slug, acc.id as string);
  }
  return { byCode, brandToPlatformId, brandToAccountId };
}

function dayEndExclusive(day: string): string {
  const d = new Date(`${day}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

async function resolveTrafficLink(
  run: RunHandle,
  platformAccountId: string | null,
  dateStart: string,
  dateEnd: string,
  expectedVisits = 0,
): Promise<any | null> {
  if (!platformAccountId) return null;

  const { data: events } = await run.supabase
    .from("tracking_events")
    .select("tracking_link_id,status,canonical_event_name")
    .eq("platform_account_id", platformAccountId)
    .eq("is_demo", false)
    .eq("is_duplicate", false)
    .eq("canonical_event_name", "click")
    .not("tracking_link_id", "is", null)
    .gte("event_timestamp", `${dateStart}T00:00:00.000Z`)
    .lt("event_timestamp", `${dayEndExclusive(dateEnd)}T00:00:00.000Z`)
    .limit(10000);

  const counts = new Map<string, number>();
  for (const e of events ?? []) {
    if (["invalid_legacy", "invalid_internal_preview", "duplicate_technical"].includes(String((e as any).status ?? ""))) continue;
    const id = (e as any).tracking_link_id as string | null;
    if (!id) continue;
    counts.set(id, (counts.get(id) ?? 0) + 1);
  }
  const ranked = Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
  if (!ranked.length || (ranked[1] && ranked[1][1] === ranked[0][1])) return null;

  const top = ranked[0];
  const second = ranked[1]?.[1] ?? 0;
  if (expectedVisits > 0) {
    const tolerance = Math.max(1, Math.ceil(expectedVisits * 0.1));
    const exactMatches = ranked.filter(([, count]) => Math.abs(count - expectedVisits) <= tolerance);
    const dominantMatch = top[1] >= expectedVisits * 0.8 && second <= Math.max(1, expectedVisits * 0.15);
    if (exactMatches.length !== 1 && !dominantMatch) {
      log(run, "attribution/traffic_ambiguous", {
        platformAccountId,
        expectedVisits,
        ranked: ranked.slice(0, 5).map(([id, count]) => ({ id, count })),
      });
      return null;
    }
  } else if (top[1] < 3 || (second > 0 && top[1] < second * 3)) {
    log(run, "attribution/traffic_ambiguous", {
      platformAccountId,
      expectedVisits,
      ranked: ranked.slice(0, 5).map(([id, count]) => ({ id, count })),
    });
    return null;
  }

  const { data: link } = await run.supabase
    .from("tracking_links")
    .select("id, tracking_code, influencer_id, campanha_id, platform_account_id, landing_page_id, landing_page_instance_id")
    .eq("id", top[0])
    .eq("is_demo", false)
    .maybeSingle();

  if (link) log(run, "attribution/traffic_link", { platformAccountId, tracking_code: link.tracking_code, clicks: top[1], expectedVisits });
  return link ?? null;
}

// Distribution weights for aggregate splitting. Uses click activity per
// tracking_link_id in the window to divide panel totals across the specific
// links that generated the traffic.
async function getLinkDistribution(
  run: RunHandle,
  platformAccountId: string,
  dateStart: string,
  dateEnd: string,
): Promise<{ link: any; weight: number }[]> {
  const { data: events } = await run.supabase
    .from("tracking_events")
    .select("tracking_link_id,status,canonical_event_name")
    .eq("platform_account_id", platformAccountId)
    .eq("is_demo", false)
    .eq("is_duplicate", false)
    .in("canonical_event_name", ["click", "lp_view"])
    .not("tracking_link_id", "is", null)
    .gte("event_timestamp", `${dateStart}T00:00:00.000Z`)
    .lt("event_timestamp", `${dayEndExclusive(dateEnd)}T00:00:00.000Z`)
    .limit(20000);

  const counts = new Map<string, number>();
  for (const e of events ?? []) {
    if (["invalid_legacy", "invalid_internal_preview", "duplicate_technical"].includes(String((e as any).status ?? ""))) continue;
    const id = (e as any).tracking_link_id as string | null;
    if (!id) continue;
    counts.set(id, (counts.get(id) ?? 0) + 1);
  }
  if (!counts.size) return [];

  const ids = Array.from(counts.keys());
  const { data: links } = await run.supabase
    .from("tracking_links")
    .select("id, tracking_code, influencer_id, campanha_id, platform_account_id, landing_page_id, landing_page_instance_id")
    .in("id", ids)
    .eq("is_demo", false);

  return (links ?? [])
    .map((l: any) => ({ link: l, weight: counts.get(l.id) ?? 0 }))
    .filter((x) => x.weight > 0);
}

// Largest-remainder allocation for integer counters, keeps sum exact.
function splitInteger(total: number, weights: number[]): number[] {
  const T = Math.max(0, Math.floor(total));
  const W = weights.reduce((a, b) => a + b, 0) || 1;
  const raw = weights.map((w) => (T * w) / W);
  const base = raw.map((v) => Math.floor(v));
  let remainder = T - base.reduce((a, b) => a + b, 0);
  const order = raw
    .map((v, i) => ({ i, frac: v - Math.floor(v) }))
    .sort((a, b) => b.frac - a.frac);
  for (let k = 0; k < order.length && remainder > 0; k++, remainder--) base[order[k].i] += 1;
  return base;
}

// Proportional split for decimals, absorbs rounding drift in the largest slice.
function splitMoney(total: number, weights: number[]): number[] {
  const T = Number(total) || 0;
  const W = weights.reduce((a, b) => a + b, 0) || 1;
  const out = weights.map((w) => Math.round(((T * w) / W) * 100) / 100);
  const drift = Math.round((T - out.reduce((a, b) => a + b, 0)) * 100) / 100;
  if (drift !== 0 && out.length) {
    let bigIdx = 0;
    for (let i = 1; i < weights.length; i++) if (weights[i] > weights[bigIdx]) bigIdx = i;
    out[bigIdx] = Math.round((out[bigIdx] + drift) * 100) / 100;
  }
  return out;
}

async function persist(
  run: RunHandle,
  brand: Brand,
  items: PerfItem[],
  ctx: AttributionCtx,
  dateStart: string,
  fallbackDate: string,
): Promise<number> {
  let inserted = 0;
  const brandPlatformId = ctx.brandToPlatformId.get(brand.brand_slug) ?? null;
  const brandAccountId = ctx.brandToAccountId.get(brand.brand_slug) ?? null;

  for (const it of items) {
    let link = it.campaign_name ? ctx.byCode.get(it.campaign_name) : null;
    // Brand mapping ALWAYS wins for platform_id — never let a VUPI row end
    // up under Estrela Bet. Use link.platform_account_id only if it belongs
    // to the same brand platform.
    let platformAccountId = brandAccountId;
    if (link?.platform_account_id) {
      const linkAcc = (await run.supabase
        .from("platform_accounts")
        .select("platform_id")
        .eq("id", link.platform_account_id)
        .maybeSingle()).data;
      if (linkAcc?.platform_id === brandPlatformId) {
        platformAccountId = link.platform_account_id;
      }
    }

    const rawPeriod = it.period ?? "";
    const dateRef = normalizePeriod(rawPeriod, fallbackDate);
    if (!dateRef) continue;
    const externalDateKey = isRollingAggregatePeriod(rawPeriod) ? "_rolling" : dateRef;

    const accountFinancial = platformAccountId
      ? (await run.supabase
        .from("platform_accounts")
        .select("revshare_percent,cpa_value,cpa_baseline_deposit")
        .eq("id", platformAccountId)
        .maybeSingle()).data
      : null;
    const grossRevenue = Number(it.ngr ?? it.ggr ?? 0) || 0;
    const cpaUnit = Number(accountFinancial?.cpa_value ?? 0) || 0;
    const revPct = Number(accountFinancial?.revshare_percent ?? 0) || 0;
    const cpaBaseline = Number(accountFinancial?.cpa_baseline_deposit ?? 0) || 0;
    const ftdCount = Number(it.ftds ?? 0) || 0;
    const depositTotal = Number(it.amount_deposit ?? 0) || 0;
    const avgFtd = ftdCount > 0 ? depositTotal / ftdCount : 0;
    const meetsBaseline = cpaBaseline === 0 || avgFtd >= cpaBaseline;
    const importedCpa = Number(it.cpa ?? 0) || 0;
    const cpaCommission = importedCpa > 0
      ? importedCpa
      : (meetsBaseline ? ftdCount * cpaUnit : 0);
    const revShareCommission = (Number(it.rev_share ?? 0) || 0) || (grossRevenue * (revPct / 100));

    // ---- Per-link split when the panel returns an aggregate row ----
    // Panel doesn't break down by campaign for this affiliate, so distribute
    // proportionally by each link's click share in the same window. This makes
    // registrations/FTDs/revenue attributable to individual links instead of
    // living as an orphan NULL row.
    if (!link && platformAccountId) {
      const trafficStart = isRollingAggregatePeriod(rawPeriod) ? dateStart : dateRef;
      const trafficEnd = isRollingAggregatePeriod(rawPeriod) ? fallbackDate : dateRef;
      const dist = await getLinkDistribution(run, platformAccountId, trafficStart, trafficEnd);

      if (dist.length >= 1) {
        const weights = dist.map((d) => d.weight);
        const regsArr = splitInteger(Number(it.registrations ?? 0) || 0, weights);
        const ftdsArr = splitInteger(ftdCount, weights);
        const depCountArr = splitInteger(Number(it.deposits ?? 0) || 0, weights);
        const depTotalArr = splitMoney(depositTotal, weights);
        const revArr = splitMoney(grossRevenue, weights);
        const cpaArr = splitMoney(cpaCommission, weights);
        const revShareArr = splitMoney(revShareCommission, weights);

        log(run, "attribution/split", {
          platformAccountId,
          externalDateKey,
          brand: brand.brand_slug,
          slices: dist.map((d, i) => ({
            tracking_code: d.link.tracking_code,
            weight: d.weight,
            registros: regsArr[i],
            ftd: ftdsArr[i],
          })),
        });

        // Drop the previous NULL aggregate row for this key, if any, so totals
        // don't double count after we insert per-link slices.
        await run.supabase
          .from("tracking_metrics")
          .delete()
          .eq("external_ref", `${brand.brand_slug}:${externalDateKey}:_aggregate`);

        for (let i = 0; i < dist.length; i++) {
          const l = dist[i].link;
          const cpa_i = cpaArr[i];
          const rev_i = revShareArr[i];
          const record: Record<string, any> = {
            data_ref: dateRef,
            platform_id: brandPlatformId,
            platform_account_id: platformAccountId,
            tracking_link_id: l.id,
            influencer_id: l.influencer_id ?? null,
            campanha_id: l.campanha_id ?? null,
            landing_page_id: l.landing_page_id ?? null,
            landing_page_instance_id: l.landing_page_instance_id ?? null,
            registros: regsArr[i],
            ftd: ftdsArr[i],
            deposits_count: depCountArr[i],
            depositos_total: depTotalArr[i],
            revenue: revArr[i],
            cpa_commission: cpa_i,
            revshare_commission: rev_i,
            commission_total: Math.round((cpa_i + rev_i) * 100) / 100,
            converted_amount: depTotalArr[i],
            converted_currency: "BRL",
            original_amount: depTotalArr[i],
            original_currency: "BRL",
            origem_importacao: "panel_scraper_stellar",
            is_demo: false,
            external_ref: `${brand.brand_slug}:${externalDateKey}:__split__:${l.tracking_code}`,
          };
          const { error } = await run.supabase
            .from("tracking_metrics")
            .upsert(record, { onConflict: "external_ref" });
          if (!error) inserted++;
          else log(run, "persist_error", { error: error.message, external_ref: record.external_ref });
        }
        continue;
      }
    }

    const record: Record<string, any> = {
      data_ref: dateRef,
      platform_id: brandPlatformId,
      platform_account_id: platformAccountId,
      tracking_link_id: link?.id ?? null,
      influencer_id: link?.influencer_id ?? null,
      campanha_id: link?.campanha_id ?? null,
      landing_page_id: link?.landing_page_id ?? null,
      landing_page_instance_id: link?.landing_page_instance_id ?? null,
      registros: it.registrations ?? 0,
      ftd: it.ftds ?? 0,
      deposits_count: it.deposits ?? 0,
      depositos_total: it.amount_deposit ?? 0,
      revenue: grossRevenue,
      cpa_commission: cpaCommission,
      revshare_commission: revShareCommission,
      commission_total: cpaCommission + revShareCommission,
      converted_amount: it.amount_deposit ?? 0,
      converted_currency: "BRL",
      original_amount: it.amount_deposit ?? 0,
      original_currency: "BRL",
      origem_importacao: "panel_scraper_stellar",
      is_demo: false,
      external_ref: `${brand.brand_slug}:${externalDateKey}:${it.campaign_name || link?.tracking_code || "_aggregate"}`,
    };

    const { error } = await run.supabase
      .from("tracking_metrics")
      .upsert(record, { onConflict: "external_ref" });
    if (!error) inserted++;
    else log(run, "persist_error", { error: error.message, external_ref: record.external_ref });
  }
  return inserted;
}

// ------------------------------------------------------------------
// Entry
// ------------------------------------------------------------------
Deno.serve(async (req) => {
  if (req.method === "OPTIONS")
    return new Response("ok", { headers: corsHeaders });

  if (!PANEL_EMAIL || !PANEL_PASSWORD) {
    return new Response(
      JSON.stringify({
        ok: false,
        error:
          "Missing STELLAR_PANEL_EMAIL / STELLAR_PANEL_PASSWORD secrets.",
      }),
      {
        status: 400,
        headers: { ...corsHeaders, "content-type": "application/json" },
      },
    );
  }

  const run = await startRun();
  try {
    // Optional overrides via request body: { days?: number, date_start?, date_end? }
    let body: any = {};
    try {
      body = await req.json();
    } catch {
      /* noop */
    }
    const days = Math.max(1, Math.min(90, Number(body?.days ?? 7)));
    const today = new Date();
    const from = new Date(today);
    from.setDate(from.getDate() - days);
    const dateStart = (body?.date_start as string) || from.toISOString().slice(0, 10);
    const dateEnd = (body?.date_end as string) || today.toISOString().slice(0, 10);
    run.discovery.window = { dateStart, dateEnd, days };

    const session = await login(run);
    if (!session) {
      await finishRun(run, "failed", 0, "Login falhou.");
      return new Response(
        JSON.stringify({ ok: false, run_id: run.id, stage: "auth" }),
        { headers: { ...corsHeaders, "content-type": "application/json" } },
      );
    }

    // Sanity check /user/me to confirm session works.
    await apiGet(run, session, "/user/me", "estrelabet");

    const brands = await fetchBrands(run, session);
    run.discovery.brands = brands.map((b) => ({
      id: b.brand_id,
      slug: b.brand_slug,
      name: b.brand_name,
    }));
    if (!brands.length) {
      await finishRun(
        run,
        "discovery_only",
        0,
        "Login OK mas nenhuma brand retornada em /affiliate-brand.",
      );
      return new Response(
        JSON.stringify({ ok: true, run_id: run.id, stage: "brands_empty" }),
        { headers: { ...corsHeaders, "content-type": "application/json" } },
      );
    }

    // Iterate DAY BY DAY so the API returns the smallest possible window.
    // Fixes: when the panel returns aggregate-only rows (period "01/01/0001"),
    // the previous single-window fetch dumped the ENTIRE range's totals into
    // the last date — inflating today's KPIs by ~Nx.
    const allItems: { brand: Brand; items: PerfItem[]; day: string }[] = [];
    const dayList: string[] = [];
    {
      const d0 = new Date(`${dateStart}T00:00:00.000Z`);
      const d1 = new Date(`${dateEnd}T00:00:00.000Z`);
      for (let d = new Date(d0); d <= d1; d.setUTCDate(d.getUTCDate() + 1)) {
        dayList.push(d.toISOString().slice(0, 10));
      }
    }
    for (const b of brands) {
      for (const day of dayList) {
        const items = await fetchPerformance(run, session, b, day, day);
        if (items.length) allItems.push({ brand: b, items, day });
      }
    }
    const campaigns = allItems.flatMap((x) =>
      x.items.map((i) => i.campaign_name),
    );
    const ctx = await buildAttribution(run, campaigns, brands);

    let total = 0;
    const perBrand: Record<string, number> = {};
    for (const { brand, items, day } of allItems) {
      // fallbackDate is now the actual single day being fetched, so
      // aggregate-only rows land on the correct date instead of being
      // clamped to dateEnd of a wide window.
      const n = await persist(run, brand, items, ctx, day, day);
      perBrand[brand.brand_slug] = (perBrand[brand.brand_slug] ?? 0) + n;
      total += n;
    }

    await finishRun(
      run,
      "ok",
      total,
      `Importadas ${total} linhas de ${brands.length} brand(s) entre ${dateStart} e ${dateEnd}.`,
    );

    return new Response(
      JSON.stringify({
        ok: true,
        run_id: run.id,
        brands: brands.map((b) => b.brand_slug),
        per_brand: perBrand,
        rows: total,
        window: { dateStart, dateEnd },
      }),
      { headers: { ...corsHeaders, "content-type": "application/json" } },
    );
  } catch (e) {
    log(run, "fatal", { error: String(e) });
    await finishRun(run, "failed", 0, `Erro: ${e}`);
    return new Response(
      JSON.stringify({ ok: false, run_id: run.id, error: String(e) }),
      {
        status: 500,
        headers: { ...corsHeaders, "content-type": "application/json" },
      },
    );
  }
});
