// Stellar (Estrela Bet) affiliate panel scraper.
// First pass: authenticates against the panel using provided credentials,
// discovers report endpoints and stores a diagnostic payload so we can lock
// in the exact parser next iteration. When it can already parse a report
// (Smartico TAP JSON shape), it aggregates into tracking_metrics using
// origem_importacao = 'panel_scraper_stellar', attributed by sub1/tracking_code.

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

const PANEL_URL_RAW = (Deno.env.get("STELLAR_PANEL_URL") ?? "").trim();
const PANEL_EMAIL = (Deno.env.get("STELLAR_PANEL_EMAIL") ?? "").trim();
const PANEL_PASSWORD = (Deno.env.get("STELLAR_PANEL_PASSWORD") ?? "").trim();

function normalizeBase(u: string) {
  if (!u) return "";
  let s = u.trim().replace(/\/+$/, "");
  if (!/^https?:\/\//i.test(s)) s = "https://" + s;
  return s;
}

const PANEL_BASE = normalizeBase(PANEL_URL_RAW);

interface RunHandle {
  id: string;
  discovery: Record<string, unknown>;
  supabase: ReturnType<typeof createClient>;
}

async function startRun(): Promise<RunHandle> {
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);
  const { data, error } = await supabase
    .from("panel_scraper_runs")
    .insert({
      scraper_key: "stellar",
      status: "running",
      discovery: { panel_base: PANEL_BASE },
    })
    .select("id")
    .single();
  if (error) throw error;
  return { id: data.id as string, discovery: { panel_base: PANEL_BASE }, supabase };
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

// ---------- Auth strategies ----------

interface AuthSession {
  strategy: string;
  token?: string;
  cookie?: string;
}

function mergeCookies(existing: string, setCookieHeader: string | null): string {
  if (!setCookieHeader) return existing;
  // Deno joins multiple Set-Cookie with ", " which is ambiguous. Split by ", " only where followed by "<token>=".
  const parts = setCookieHeader.split(/,(?=\s*[A-Za-z0-9_\-]+=)/g);
  const jar = new Map<string, string>();
  existing.split(";").map((c) => c.trim()).filter(Boolean).forEach((c) => {
    const [k, ...v] = c.split("="); jar.set(k, v.join("="));
  });
  for (const raw of parts) {
    const kv = raw.split(";")[0].trim();
    if (!kv) continue;
    const [k, ...v] = kv.split("=");
    if (k) jar.set(k, v.join("="));
  }
  return Array.from(jar.entries()).map(([k, v]) => `${k}=${v}`).join("; ");
}

async function nextAuthLogin(run: RunHandle): Promise<AuthSession | null> {
  const attempts: any[] = [];
  let cookie = "";

  // 1. Fetch CSRF token
  try {
    const csrfRes = await fetch(PANEL_BASE + "/api/auth/csrf", {
      headers: { accept: "application/json" },
      redirect: "manual",
    });
    cookie = mergeCookies(cookie, csrfRes.headers.get("set-cookie"));
    const csrfText = await csrfRes.text();
    let csrfToken = "";
    try { csrfToken = JSON.parse(csrfText).csrfToken || ""; } catch { /* ignore */ }
    attempts.push({ step: "csrf", status: csrfRes.status, has_token: !!csrfToken, snippet: csrfText.slice(0, 200) });

    if (!csrfToken) {
      run.discovery.auth_attempts = attempts;
      return null;
    }

    // 2. Try common NextAuth credential provider paths
    const providers = ["credentials", "login", "email", "affiliates", "partners"];
    for (const provider of providers) {
      const body = new URLSearchParams({
        csrfToken,
        callbackUrl: PANEL_BASE + "/",
        email: PANEL_EMAIL,
        username: PANEL_EMAIL,
        password: PANEL_PASSWORD,
        json: "true",
      });
      const res = await fetch(PANEL_BASE + `/api/auth/callback/${provider}`, {
        method: "POST",
        headers: {
          "content-type": "application/x-www-form-urlencoded",
          accept: "application/json",
          cookie,
        },
        body,
        redirect: "manual",
      });
      cookie = mergeCookies(cookie, res.headers.get("set-cookie"));
      const text = await res.text();
      attempts.push({ step: `callback/${provider}`, status: res.status, cookie_len: cookie.length, snippet: text.slice(0, 300) });

      // Success if we now have a session token cookie
      if (/next-auth\.session-token|__Secure-next-auth\.session-token|authjs\.session-token/.test(cookie)) {
        // Verify session
        const sess = await fetch(PANEL_BASE + "/api/auth/session", {
          headers: { accept: "application/json", cookie },
        });
        const sessText = await sess.text();
        attempts.push({ step: "session-check", status: sess.status, snippet: sessText.slice(0, 400) });
        if (sess.ok && sessText && sessText !== "{}" && !sessText.includes("null")) {
          run.discovery.auth_attempts = attempts;
          run.discovery.auth_success = { strategy: `nextauth:${provider}` };
          return { strategy: `nextauth:${provider}`, cookie };
        }
      }
    }
  } catch (e) {
    attempts.push({ step: "error", error: String(e) });
  }

  run.discovery.auth_attempts = attempts;
  return null;
}

async function authenticate(run: RunHandle): Promise<AuthSession | null> {
  return await nextAuthLogin(run);
}

// ---------- Report discovery ----------

interface ReportRow {
  date: string;
  tracking_code?: string;
  registrations?: number;
  ftd?: number;
  deposits?: number;
  deposits_amount?: number;
  revenue?: number;
}

async function fetchReport(session: AuthSession, run: RunHandle): Promise<ReportRow[] | null> {
  const today = new Date();
  const from = new Date(today);
  from.setDate(from.getDate() - 7);
  const fromStr = from.toISOString().slice(0, 10);
  const toStr = today.toISOString().slice(0, 10);

  const headers: Record<string, string> = {
    accept: "application/json",
    "content-type": "application/json",
  };
  if (session.token) headers["authorization"] = `Bearer ${session.token}`;
  if (session.cookie) headers["cookie"] = session.cookie;

  const candidates = [
    { method: "GET", path: `/api/reports/affiliates?from=${fromStr}&to=${toStr}&group=subid,date` },
    { method: "GET", path: `/api/report/subid?from=${fromStr}&to=${toStr}` },
    { method: "POST", path: `/api/reporting/query`, body: { from: fromStr, to: toStr, dimensions: ["date", "subid"], metrics: ["registrations", "ftd", "deposits", "deposits_amount", "revenue"] } },
    { method: "GET", path: `/api/dashboard/summary?from=${fromStr}&to=${toStr}` },
  ];

  const attempts: any[] = [];
  for (const c of candidates) {
    try {
      const res = await fetch(PANEL_BASE + c.path, {
        method: c.method,
        headers,
        body: c.method === "POST" ? JSON.stringify(c.body) : undefined,
      });
      const text = await res.text();
      let json: any = null;
      try { json = JSON.parse(text); } catch { /* html */ }
      attempts.push({ path: c.path, status: res.status, has_json: !!json, snippet: text.slice(0, 400) });

      if (res.ok && json) {
        // Best-effort mapping — real shape will be finalized after first successful run.
        const rowsSrc: any[] = Array.isArray(json)
          ? json
          : json.rows || json.data || json.results || [];
        if (Array.isArray(rowsSrc) && rowsSrc.length) {
          const mapped: ReportRow[] = rowsSrc.map((r) => ({
            date: r.date || r.day || r.event_date || toStr,
            tracking_code: r.subid || r.sub1 || r.subid1 || r.tracking_code || r.click_id,
            registrations: Number(r.registrations ?? r.regs ?? r.signups ?? 0),
            ftd: Number(r.ftd ?? r.ftd_count ?? r.first_deposits ?? 0),
            deposits: Number(r.deposits ?? r.deposits_count ?? 0),
            deposits_amount: Number(r.deposits_amount ?? r.deposit_sum ?? r.deposit_total ?? 0),
            revenue: Number(r.revenue ?? r.ngr ?? r.commission ?? 0),
          }));
          run.discovery.report_attempts = attempts;
          run.discovery.report_success = { path: c.path, row_count: mapped.length };
          return mapped;
        }
      }
    } catch (e) {
      attempts.push({ path: c.path, error: String(e) });
    }
  }

  run.discovery.report_attempts = attempts;
  return null;
}

// ---------- Persistence ----------

async function persistRows(run: RunHandle, rows: ReportRow[]): Promise<number> {
  // Attribute by sub1 (our tracking_code) -> tracking_links -> influencer/campaign/platform_account
  const codes = Array.from(new Set(rows.map((r) => r.tracking_code).filter(Boolean))) as string[];
  const { data: links } = await run.supabase
    .from("tracking_links")
    .select("tracking_code, influencer_id, campanha_id, platform_account_id")
    .in("tracking_code", codes.length ? codes : ["__none__"]);
  const byCode = new Map<string, any>();
  (links ?? []).forEach((l: any) => byCode.set(l.tracking_code, l));

  // Resolve platform_id for Estrela Bet (fallback attribution when link is unknown)
  const { data: platform } = await run.supabase
    .from("platforms")
    .select("id")
    .ilike("name", "%estrela%")
    .maybeSingle();
  const stellarPlatformId = (platform as any)?.id ?? null;

  let inserted = 0;
  for (const row of rows) {
    const link = row.tracking_code ? byCode.get(row.tracking_code) : null;
    const record = {
      data_ref: row.date,
      platform_id: link?.platform_account_id ? undefined : stellarPlatformId,
      platform_account_id: link?.platform_account_id ?? null,
      influencer_id: link?.influencer_id ?? null,
      campanha_id: link?.campanha_id ?? null,
      registros: row.registrations ?? 0,
      ftd: row.ftd ?? 0,
      deposits_count: row.deposits ?? 0,
      depositos_total: row.deposits_amount ?? 0,
      revenue: row.revenue ?? 0,
      commission_total: row.revenue ?? 0,
      converted_amount: row.deposits_amount ?? 0,
      converted_currency: "BRL",
      original_amount: row.deposits_amount ?? 0,
      original_currency: "BRL",
      origem_importacao: "panel_scraper_stellar",
      is_demo: false,
    };
    const { error } = await run.supabase.from("tracking_metrics").insert(record);
    if (!error) inserted++;
  }
  return inserted;
}

// ---------- Entry ----------

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  if (!PANEL_BASE || !PANEL_EMAIL || !PANEL_PASSWORD) {
    return new Response(
      JSON.stringify({ ok: false, error: "Missing STELLAR_PANEL_URL / STELLAR_PANEL_EMAIL / STELLAR_PANEL_PASSWORD" }),
      { status: 400, headers: { ...corsHeaders, "content-type": "application/json" } },
    );
  }

  const run = await startRun();
  try {
    const session = await authenticate(run);
    if (!session) {
      await finishRun(run, "discovery_only", 0, "Login não reconhecido — payload de discovery salvo em panel_scraper_runs.discovery para eu ajustar o parser.");
      return new Response(JSON.stringify({ ok: false, run_id: run.id, stage: "auth" }), {
        status: 200,
        headers: { ...corsHeaders, "content-type": "application/json" },
      });
    }

    const rows = await fetchReport(session, run);
    if (!rows || rows.length === 0) {
      await finishRun(run, "discovery_only", 0, "Login OK mas endpoint de relatório ainda não identificado — discovery salvo.");
      return new Response(JSON.stringify({ ok: true, run_id: run.id, stage: "report_discovery" }), {
        status: 200,
        headers: { ...corsHeaders, "content-type": "application/json" },
      });
    }

    const inserted = await persistRows(run, rows);
    await finishRun(run, "ok", inserted, `Importadas ${inserted} linhas.`);
    return new Response(JSON.stringify({ ok: true, run_id: run.id, rows_imported: inserted }), {
      status: 200,
      headers: { ...corsHeaders, "content-type": "application/json" },
    });
  } catch (e) {
    await finishRun(run, "failed", 0, String((e as Error)?.message ?? e));
    return new Response(JSON.stringify({ ok: false, run_id: run.id, error: String((e as Error)?.message ?? e) }), {
      status: 500,
      headers: { ...corsHeaders, "content-type": "application/json" },
    });
  }
});
