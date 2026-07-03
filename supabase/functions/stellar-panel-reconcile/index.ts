// Stellar (Estrela Bet / VUPI) reconciliation job.
//
// Compares totals reported by the Estrela affiliate panel with what is stored
// in `tracking_metrics`, per brand per day, and writes the audit result into
// `panel_reconciliations`, flagging severity so the admin UI can highlight
// divergences automatically.
//
// Invocation:
//   POST /functions/v1/stellar-panel-reconcile
//   body: { days?: number = 7 }
//
// Scheduled daily via pg_cron ('stellar-panel-reconcile-daily').

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

const API_BASE = "https://us-partners-api-node.estrelabet.bet.br/api";
const ORIGIN = "https://partners.estrelabet.bet.br";
const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120";

// --- Thresholds -------------------------------------------------------------
// A row is "divergent" when the absolute delta on ANY numeric field exceeds
// its threshold. Severity picks the worst offender across all fields.
const THRESHOLDS = {
  registrations: { minor: 1, major: 5, critical: 20 },
  ftds: { minor: 1, major: 3, critical: 10 },
  deposits_count: { minor: 2, major: 10, critical: 30 },
  deposits_total: { minor: 25, major: 100, critical: 500 }, // BRL
  ngr: { minor: 10, major: 50, critical: 250 },
  commission: { minor: 5, major: 25, critical: 100 },
};
type SeverityKey = keyof typeof THRESHOLDS;
type Sev = "ok" | "minor" | "major" | "critical";
const SEV_RANK: Record<Sev, number> = { ok: 0, minor: 1, major: 2, critical: 3 };

function classify(field: SeverityKey, delta: number): Sev {
  const abs = Math.abs(delta);
  const t = THRESHOLDS[field];
  if (abs >= t.critical) return "critical";
  if (abs >= t.major) return "major";
  if (abs >= t.minor) return "minor";
  return "ok";
}

// --- Auth (reused from scraper) ---------------------------------------------
interface Session {
  token: string;
  tenantId: string;
}

function decodeJwt(jwt: string): any {
  try {
    const b64 = jwt.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    const pad = b64.length % 4 === 0 ? "" : "=".repeat(4 - (b64.length % 4));
    return JSON.parse(atob(b64 + pad));
  } catch {
    return null;
  }
}

async function login(): Promise<Session | null> {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      accept: "application/json",
      origin: ORIGIN,
      referer: ORIGIN + "/",
      "user-agent": UA,
    },
    body: JSON.stringify({ email: PANEL_EMAIL, password: PANEL_PASSWORD }),
  });
  if (!res.ok) return null;
  const j: any = await res.json().catch(() => null);
  if (!j) return null;
  const token: string | undefined =
    j.access_token || j.accessToken || j.token || j.jwt ||
    j.data?.access_token || j.data?.accessToken || j.data?.token;
  if (!token) return null;
  const payload = decodeJwt(token) ?? {};
  const tenantId = String(
    j.tenant_id ?? j.tenantId ?? payload.tenant_id ??
      payload.tenantId ?? payload["custom:tenant_id"] ?? "1",
  );
  return { token, tenantId };
}

function headers(s: Session, brand?: string): HeadersInit {
  return {
    accept: "application/json",
    "content-type": "application/json",
    origin: ORIGIN,
    referer: ORIGIN + "/",
    "user-agent": UA,
    authorization: `Bearer ${s.token}`,
    tenantid: s.tenantId,
    "x-brand": brand ?? "estrelabet",
  };
}

async function apiGet(s: Session, path: string, brand?: string) {
  const res = await fetch(API_BASE + path, {
    method: "GET",
    headers: headers(s, brand),
  });
  const raw = await res.text();
  let data: any = null;
  try { data = JSON.parse(raw); } catch { /* */ }
  return { ok: res.ok, status: res.status, data };
}

interface Brand {
  brand_id: number;
  brand_name: string;
  brand_slug: string;
}

interface PerfItem {
  period: string;
  visits: number;
  registrations: number;
  ftds: number;
  deposits: number;
  amount_deposit: number;
  ngr: number;
  ggr: number;
  cpa: number;
  rev_share: number;
  campaign_name: string;
}

async function fetchBrands(s: Session): Promise<Brand[]> {
  for (const seed of ["estrelabet", "vupi", "stellar"]) {
    const r = await apiGet(s, "/affiliate-brand", seed);
    if (r.ok && Array.isArray(r.data) && r.data.length) return r.data as Brand[];
  }
  return [];
}

async function fetchPanelTotals(
  s: Session,
  brand: Brand,
  dateStart: string,
  dateEnd: string,
): Promise<PerfItem[]> {
  const groupings = ["day", "day,campaign", "date", "campaign"];
  let last: PerfItem[] = [];
  for (const g of groupings) {
    const qs = new URLSearchParams({
      date_start: dateStart,
      date_end: dateEnd,
      group_by: g,
    });
    const r = await apiGet(
      s,
      `/user/performance/report?${qs.toString()}`,
      brand.brand_slug,
    );
    if (!r.ok || !r.data) continue;
    const items: PerfItem[] = Array.isArray(r.data.items) ? r.data.items : [];
    if (!items.length) continue;
    last = items;
    if (items.some((i) => i.period && !/^01\/01\/0001/.test(i.period))) return items;
  }
  return last;
}

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

function aggregateByDay(items: PerfItem[], fallback: string) {
  const agg = new Map<string, {
    registrations: number; ftds: number; deposits_count: number;
    deposits_total: number; ngr: number; commission: number;
  }>();
  for (const it of items) {
    const day = normalizePeriod(it.period ?? "", fallback);
    const cur = agg.get(day) ?? {
      registrations: 0, ftds: 0, deposits_count: 0,
      deposits_total: 0, ngr: 0, commission: 0,
    };
    cur.registrations += Number(it.registrations ?? 0);
    cur.ftds += Number(it.ftds ?? 0);
    cur.deposits_count += Number(it.deposits ?? 0);
    cur.deposits_total += Number(it.amount_deposit ?? 0);
    cur.ngr += Number(it.ngr ?? it.ggr ?? 0);
    cur.commission += Number(it.cpa ?? 0) + Number(it.rev_share ?? 0);
    agg.set(day, cur);
  }
  return agg;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS")
    return new Response("ok", { headers: corsHeaders });

  if (!PANEL_EMAIL || !PANEL_PASSWORD) {
    return new Response(JSON.stringify({
      ok: false,
      error: "Missing STELLAR_PANEL_EMAIL / STELLAR_PANEL_PASSWORD.",
    }), { status: 400, headers: { ...corsHeaders, "content-type": "application/json" } });
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);
  const body = await req.json().catch(() => ({} as any));
  const days = Math.max(1, Math.min(60, Number(body?.days ?? 7)));

  const today = new Date();
  const end = today.toISOString().slice(0, 10);
  const from = new Date(today);
  from.setDate(from.getDate() - (days - 1));
  const start = from.toISOString().slice(0, 10);

  try {
    const session = await login();
    if (!session) {
      return new Response(JSON.stringify({ ok: false, error: "login_failed" }), {
        status: 502, headers: { ...corsHeaders, "content-type": "application/json" },
      });
    }

    const brands = await fetchBrands(session);
    if (!brands.length) {
      return new Response(JSON.stringify({ ok: false, error: "no_brands" }), {
        status: 502, headers: { ...corsHeaders, "content-type": "application/json" },
      });
    }

    const runAt = new Date().toISOString();
    const results: any[] = [];
    let divergentCount = 0;
    let worst: Sev = "ok";

    for (const brand of brands) {
      const items = await fetchPanelTotals(session, brand, start, end);
      const panelByDay = aggregateByDay(items, end);

      // Resolve DB totals for the same period + brand via platform match.
      const { data: platforms } = await supabase
        .from("platforms")
        .select("id, name")
        .or(`name.ilike.%${brand.brand_name}%,name.ilike.%${brand.brand_slug}%`);
      const platformIds = (platforms ?? []).map((p: any) => p.id);
      let accountIds: string[] = [];
      if (platformIds.length) {
        const { data: accs } = await supabase
          .from("platform_accounts")
          .select("id")
          .in("platform_id", platformIds);
        accountIds = (accs ?? []).map((a: any) => a.id);
      }

      const { data: metrics } = await supabase
        .from("tracking_metrics")
        .select(
          "data_ref, registros, ftd, deposits_count, depositos_total, revenue, commission_total, platform_id, platform_account_id, origem_importacao",
        )
        .gte("data_ref", start)
        .lte("data_ref", end)
        .eq("is_demo", false);

      const dbByDay = new Map<string, {
        registrations: number; ftds: number; deposits_count: number;
        deposits_total: number; ngr: number; commission: number;
      }>();
      for (const m of metrics ?? []) {
        const matches =
          (m.platform_id && platformIds.includes(m.platform_id)) ||
          (m.platform_account_id && accountIds.includes(m.platform_account_id));
        if (!matches) continue;
        const cur = dbByDay.get(m.data_ref) ?? {
          registrations: 0, ftds: 0, deposits_count: 0,
          deposits_total: 0, ngr: 0, commission: 0,
        };
        cur.registrations += Number(m.registros ?? 0);
        cur.ftds += Number(m.ftd ?? 0);
        cur.deposits_count += Number(m.deposits_count ?? 0);
        cur.deposits_total += Number(m.depositos_total ?? 0);
        cur.ngr += Number(m.revenue ?? 0);
        cur.commission += Number(m.commission_total ?? 0);
        dbByDay.set(m.data_ref, cur);
      }

      // Union of days seen in either source.
      const allDays = new Set<string>([...panelByDay.keys(), ...dbByDay.keys()]);

      for (const day of allDays) {
        const panel = panelByDay.get(day) ?? {
          registrations: 0, ftds: 0, deposits_count: 0,
          deposits_total: 0, ngr: 0, commission: 0,
        };
        const db = dbByDay.get(day) ?? {
          registrations: 0, ftds: 0, deposits_count: 0,
          deposits_total: 0, ngr: 0, commission: 0,
        };

        const fields: SeverityKey[] = [
          "registrations", "ftds", "deposits_count",
          "deposits_total", "ngr", "commission",
        ];
        const perField = fields.map((f) => {
          const delta = (panel as any)[f] - (db as any)[f];
          return { field: f, delta, severity: classify(f, delta) };
        });
        const severity: Sev = perField.reduce(
          (acc, cur) => (SEV_RANK[cur.severity] > SEV_RANK[acc] ? cur.severity : acc),
          "ok" as Sev,
        );
        const divergent = severity !== "ok";
        if (divergent) divergentCount++;
        if (SEV_RANK[severity] > SEV_RANK[worst]) worst = severity;

        results.push({
          run_at: runAt,
          scraper_key: "stellar",
          brand_slug: brand.brand_slug,
          brand_name: brand.brand_name,
          data_ref: day,
          panel_registrations: panel.registrations,
          panel_ftds: panel.ftds,
          panel_deposits_count: panel.deposits_count,
          panel_deposits_total: panel.deposits_total,
          panel_ngr: panel.ngr,
          panel_commission: panel.commission,
          db_registrations: db.registrations,
          db_ftds: db.ftds,
          db_deposits_count: db.deposits_count,
          db_deposits_total: db.deposits_total,
          db_ngr: db.ngr,
          db_commission: db.commission,
          severity,
          divergent,
          notes: { per_field: perField, panel_source: "estrela_report" },
        });
      }
    }

    if (results.length) {
      const { error } = await supabase.from("panel_reconciliations").insert(results);
      if (error) {
        return new Response(JSON.stringify({ ok: false, error: error.message }), {
          status: 500, headers: { ...corsHeaders, "content-type": "application/json" },
        });
      }
    }

    // If we found major/critical divergences, alert admins via notifications.
    if (worst === "major" || worst === "critical") {
      const { data: admins } = await supabase
        .from("user_roles")
        .select("user_id")
        .in("role", ["admin_master", "socio"]);
      const rows = (admins ?? []).map((a: any) => ({
        user_id: a.user_id,
        type: "panel_divergence",
        title: worst === "critical"
          ? "Divergência crítica no painel"
          : "Divergência relevante no painel",
        body: `Auditoria detectou ${divergentCount} divergência(s) entre painel Estrela e banco (últimos ${days} dias).`,
        action_url: "/admin/reconciliacao",
        meta: { severity: worst, divergent_count: divergentCount, run_at: runAt },
      }));
      if (rows.length) await supabase.from("notifications").insert(rows);
    }

    return new Response(JSON.stringify({
      ok: true,
      run_at: runAt,
      period: { start, end, days },
      brands: brands.length,
      rows_written: results.length,
      divergent_count: divergentCount,
      worst_severity: worst,
    }), { status: 200, headers: { ...corsHeaders, "content-type": "application/json" } });
  } catch (err) {
    return new Response(JSON.stringify({ ok: false, error: String(err) }), {
      status: 500, headers: { ...corsHeaders, "content-type": "application/json" },
    });
  }
});
