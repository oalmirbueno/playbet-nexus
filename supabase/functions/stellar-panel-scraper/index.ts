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
        "tracking_code, influencer_id, campanha_id, platform_account_id",
      )
      .in("tracking_code", codes);
    (links ?? []).forEach((l: any) => byCode.set(l.tracking_code, l));
  }

  // Resolve platforms by brand slug/name.
  const brandToPlatformId = new Map<string, string>();
  const brandToAccountId = new Map<string, string>();
  for (const b of brands) {
    const candidates = [b.brand_name, b.brand_slug];
    for (const c of candidates) {
      if (!c) continue;
      const { data: p } = await run.supabase
        .from("platforms")
        .select("id, name")
        .ilike("name", `%${c}%`)
        .limit(1)
        .maybeSingle();
      if (p?.id) {
        brandToPlatformId.set(b.brand_slug, p.id as string);
        // Try to resolve a default platform_account for the brand.
        const { data: acc } = await run.supabase
          .from("platform_accounts")
          .select("id")
          .eq("platform_id", p.id)
          .limit(1)
          .maybeSingle();
        if (acc?.id) brandToAccountId.set(b.brand_slug, acc.id as string);
        break;
      }
    }
  }
  return { byCode, brandToPlatformId, brandToAccountId };
}

async function persist(
  run: RunHandle,
  brand: Brand,
  items: PerfItem[],
  ctx: AttributionCtx,
): Promise<number> {
  let inserted = 0;
  for (const it of items) {
    const link = it.campaign_name ? ctx.byCode.get(it.campaign_name) : null;
    const platformAccountId =
      link?.platform_account_id ?? ctx.brandToAccountId.get(brand.brand_slug) ?? null;
    const platformId = ctx.brandToPlatformId.get(brand.brand_slug) ?? null;

    const dateRef = (it.period || "").slice(0, 10);
    if (!dateRef) continue;

    const record: Record<string, any> = {
      data_ref: dateRef,
      platform_id: platformAccountId ? null : platformId,
      platform_account_id: platformAccountId,
      influencer_id: link?.influencer_id ?? null,
      campanha_id: link?.campanha_id ?? null,
      registros: it.registrations ?? 0,
      ftd: it.ftds ?? 0,
      deposits_count: it.deposits ?? 0,
      depositos_total: it.amount_deposit ?? 0,
      revenue: it.ngr ?? it.ggr ?? 0,
      commission_total: (it.cpa ?? 0) + (it.rev_share ?? 0),
      converted_amount: it.amount_deposit ?? 0,
      converted_currency: "BRL",
      original_amount: it.amount_deposit ?? 0,
      original_currency: "BRL",
      origem_importacao: "panel_scraper_stellar",
      is_demo: false,
      external_ref: `${brand.brand_slug}:${dateRef}:${it.campaign_name ?? "_"}`,
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

    // Fetch all reports, collect campaigns, then attribute + persist.
    const allItems: { brand: Brand; items: PerfItem[] }[] = [];
    for (const b of brands) {
      const items = await fetchPerformance(run, session, b, dateStart, dateEnd);
      allItems.push({ brand: b, items });
    }
    const campaigns = allItems.flatMap((x) =>
      x.items.map((i) => i.campaign_name),
    );
    const ctx = await buildAttribution(run, campaigns, brands);

    let total = 0;
    for (const { brand, items } of allItems) {
      total += await persist(run, brand, items, ctx);
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
