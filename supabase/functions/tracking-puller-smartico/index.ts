// Smartico / TheAffiliatePlatform (TAP) puller
// Sincroniza cadastros, FTD/CPA, depósitos e receita por conta/casa sem misturar VUPI x Estrela.

import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const SMARTICO_BASE = "https://boapi.smartico.ai";

type SmarticoRow = Record<string, unknown>;
type AccountRow = {
  id: string;
  platform_id: string;
  nome_conta: string | null;
  account_external_id: string | null;
  modelo_comissao: string | null;
  cpa_value: number | null;
  revshare_percent: number | null;
  platforms?: { id: string; name: string | null; smartico_brand_id: string | null } | null;
};

type AttributionContext = {
  tracking_link_id: string | null;
  platform_account_id: string | null;
  platform_id: string | null;
  influencer_id: string | null;
  campanha_id: string | null;
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isUuid = (v: unknown): v is string => typeof v === "string" && UUID_RE.test(v);
const str = (v: unknown) => (v == null ? "" : String(v)).trim();
const lc = (v: unknown) => str(v).toLowerCase();
const num = (v: unknown) => Number.isFinite(Number(v)) ? Number(v) : 0;

function toYmd(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function pick(row: SmarticoRow, keys: string[]) {
  for (const k of keys) if (row[k] != null && row[k] !== "") return row[k];
  return null;
}

function extractRows(payload: any): SmarticoRow[] {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.rows)) return payload.rows;
  if (Array.isArray(payload?.result)) return payload.result;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.data?.rows)) return payload.data.rows;
  return [];
}

async function tryFetch(url: URL, headers: HeadersInit) {
  const res = await fetch(url.toString(), { method: "GET", headers });
  const text = await res.text();
  let json: any = null;
  try { json = text ? JSON.parse(text) : null; } catch { /* non-json */ }
  return { ok: res.ok, status: res.status, text, json };
}

async function fetchReport(apiKey: string, labelId: string | null, dateFrom: string, dateTo: string) {
  const baseParams = new URLSearchParams({
    aggregation_period: "DAY",
    date_from: dateFrom,
    date_to: dateTo,
    group_by: "afp,afp1,afp2,brand_id,brand_name",
  });

  const attempts: Array<{ label: string; url: URL; headers: Record<string, string> }> = [];
  const headerSets: Record<string, string>[] = [
    { Authorization: apiKey, Accept: "application/json" },
    { "X-API-Key": apiKey, Accept: "application/json" },
    { Authorization: `Bearer ${apiKey}`, Accept: "application/json" },
  ];
  const labels = [labelId, apiKey].filter(Boolean) as string[];

  for (const headers of headerSets) {
    const u = new URL(`${SMARTICO_BASE}/api/af2_media_report_af`);
    u.search = baseParams.toString();
    attempts.push({ label: "plain", url: u, headers });
    for (const lid of labels) {
      for (const key of ["label_id", "labelId", "label"]) {
        const x = new URL(`${SMARTICO_BASE}/api/af2_media_report_af`);
        x.search = baseParams.toString();
        x.searchParams.set(key, lid);
        attempts.push({ label: key, url: x, headers });
      }
      attempts.push({ label: "label-header", url: u, headers: { ...headers, "X-Label-Id": lid, "Label-Id": lid } });
    }
  }

  const errors: string[] = [];
  for (const a of attempts) {
    const r = await tryFetch(a.url, a.headers);
    if (r.ok) return { payload: r.json, rows: extractRows(r.json), attempt: a.label };
    errors.push(`${a.label}:${r.status}:${(r.text || "").slice(0, 160)}`);
  }
  const missingLabel = errors.some((e) => e.toLowerCase().includes("missing label"));
  if (missingLabel) {
    throw new Error("Smartico retornou 'Missing label id'. Configure também SMARTICO_LABEL_ID/STELLAR_TAP_LABEL_ID no Edge Function; a chave atual sozinha não autoriza o relatório.");
  }
  throw new Error(`Smartico falhou: ${errors[0] ?? "sem resposta"}`);
}

function resolveAccount(row: SmarticoRow, accounts: AccountRow[]) {
  const brandId = str(pick(row, ["brand_id", "brandId", "brand"]));
  const brandName = lc(pick(row, ["brand_name", "brandName", "brand"]));
  const linkName = lc(pick(row, ["link_name", "linkName", "affiliate_link_name", "source_name", "hash_name"]));
  const hay = `${brandName} ${linkName}`;

  if (brandId) {
    const exact = accounts.find((a) =>
      str(a.account_external_id) === brandId || str(a.platforms?.smartico_brand_id) === brandId
    );
    if (exact) return exact;
  }

  const estrela = accounts.find((a) => lc(a.platforms?.name).includes("estrela") || lc(a.nome_conta).includes("estrela")) ?? null;
  const vupi = accounts.find((a) => /vupi|vipi/.test(lc(a.platforms?.name)) || /vupi|vipi/.test(lc(a.nome_conta))) ?? null;
  if (hay.includes("estrela")) return estrela;
  if (hay.includes("vupi") || hay.includes("vipi")) return vupi;

  // Com mais de uma casa TAP/Smartico ativa, não chuta conta: sem afp/sub1
  // ou brand explícita a linha é ignorada para não jogar tudo em Estrela/VUPI.
  return accounts.length === 1 ? accounts[0] : null;
}

function attributionCode(row: SmarticoRow) {
  return str(pick(row, ["afp", "sub1", "click_id", "clickid", "aff_sub", "s1"]));
}

async function buildAttributionMap(admin: ReturnType<typeof createClient>, rows: SmarticoRow[]) {
  const codes = Array.from(new Set(rows.map(attributionCode).filter(Boolean)));
  const byCode = new Map<string, AttributionContext>();
  const byLinkId = new Map<string, AttributionContext>();
  if (codes.length === 0) return byCode;

  const { data: links } = await admin
    .from("tracking_links")
    .select("id, tracking_code, platform_account_id, influencer_id, campanha_id, platform_accounts(platform_id)")
    .in("tracking_code", codes)
    .eq("is_demo", false);

  for (const link of (links ?? []) as any[]) {
    const ctx: AttributionContext = {
      tracking_link_id: link.id,
      platform_account_id: link.platform_account_id,
      platform_id: link.platform_accounts?.platform_id ?? null,
      influencer_id: link.influencer_id ?? null,
      campanha_id: link.campanha_id ?? null,
    };
    if (link.tracking_code) byCode.set(link.tracking_code, ctx);
    byLinkId.set(link.id, ctx);
  }

  // When traffic comes through the public LP, the house receives a generated
  // click id (clk_...) in afp/sub1. That id must be resolved through the click
  // event created before redirecting, otherwise Estrela and VUPI collide.
  const { data: events } = await admin
    .from("tracking_events")
    .select("click_id, tracking_link_id, platform_account_id, platform_id, influencer_id, campanha_id")
    .in("click_id", codes)
    .not("tracking_link_id", "is", null)
    .order("event_timestamp", { ascending: false });

  const missingLinkIds = new Set<string>();
  for (const ev of (events ?? []) as any[]) {
    if (!ev.click_id || byCode.has(ev.click_id)) continue;
    const fromLink = ev.tracking_link_id ? byLinkId.get(ev.tracking_link_id) : null;
    if (!fromLink && ev.tracking_link_id) missingLinkIds.add(ev.tracking_link_id);
    byCode.set(ev.click_id, {
      tracking_link_id: ev.tracking_link_id ?? null,
      platform_account_id: ev.platform_account_id ?? fromLink?.platform_account_id ?? null,
      platform_id: ev.platform_id ?? fromLink?.platform_id ?? null,
      influencer_id: ev.influencer_id ?? fromLink?.influencer_id ?? null,
      campanha_id: ev.campanha_id ?? fromLink?.campanha_id ?? null,
    });
  }

  if (missingLinkIds.size > 0) {
    const { data: missingLinks } = await admin
      .from("tracking_links")
      .select("id, platform_account_id, influencer_id, campanha_id, platform_accounts(platform_id)")
      .in("id", Array.from(missingLinkIds));
    for (const link of (missingLinks ?? []) as any[]) {
      byLinkId.set(link.id, {
        tracking_link_id: link.id,
        platform_account_id: link.platform_account_id,
        platform_id: link.platform_accounts?.platform_id ?? null,
        influencer_id: link.influencer_id ?? null,
        campanha_id: link.campanha_id ?? null,
      });
    }
    for (const ev of (events ?? []) as any[]) {
      const ctx = ev.tracking_link_id ? byLinkId.get(ev.tracking_link_id) : null;
      if (!ev.click_id || !ctx) continue;
      byCode.set(ev.click_id, {
        tracking_link_id: ev.tracking_link_id ?? ctx.tracking_link_id,
        platform_account_id: ev.platform_account_id ?? ctx.platform_account_id,
        platform_id: ev.platform_id ?? ctx.platform_id,
        influencer_id: ev.influencer_id ?? ctx.influencer_id,
        campanha_id: ev.campanha_id ?? ctx.campanha_id,
      });
    }
  }

  return byCode;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const apiKey = Deno.env.get("SMARTICO_API_KEY") ?? Deno.env.get("STELLAR_TAP_API_KEY");
  const labelId = Deno.env.get("SMARTICO_LABEL_ID") ?? Deno.env.get("STELLAR_TAP_LABEL_ID") ?? null;
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  if (!apiKey) return new Response(JSON.stringify({ ok: false, error: "SMARTICO_API_KEY/STELLAR_TAP_API_KEY não configurado" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  const admin = createClient(SUPABASE_URL, SERVICE_KEY);
  let body: { date_from?: string; date_to?: string } = {};
  if (req.method === "POST") { try { body = await req.json(); } catch { /* empty */ } }

  const today = new Date();
  const dateFrom = body.date_from ?? toYmd(new Date(today.getTime() - 7 * 86_400_000));
  const dateTo = body.date_to ?? toYmd(new Date(today.getTime() + 86_400_000));

  try {
    const { data: accounts, error: accErr } = await admin
      .from("platform_accounts")
      .select("id, platform_id, nome_conta, account_external_id, modelo_comissao, cpa_value, revshare_percent, platforms(id,name,smartico_brand_id)")
      .eq("is_active", true)
      .eq("is_demo", false);
    if (accErr) throw accErr;

    const report = await fetchReport(apiKey, labelId, dateFrom, dateTo);
    const attributionByCode = await buildAttributionMap(admin, report.rows);
    const accountById = new Map(((accounts ?? []) as AccountRow[]).map((a) => [a.id, a]));
    const buckets = new Map<string, any>();
    let skipped = 0;

    for (const row of report.rows) {
      const dataRef = str(pick(row, ["dt", "date", "data_ref", "day"])).slice(0, 10);
      if (!dataRef) { skipped++; continue; }
      const attr = attributionByCode.get(attributionCode(row));
      const account = attr?.platform_account_id ? accountById.get(attr.platform_account_id) ?? null : resolveAccount(row, (accounts ?? []) as AccountRow[]);
      if (!account) { skipped++; continue; }

      const influencerId = attr?.influencer_id || (isUuid(pick(row, ["afp1", "sub2", "sub_id2"])) ? str(pick(row, ["afp1", "sub2", "sub_id2"])) : null);
      const campanhaId = attr?.campanha_id || (isUuid(pick(row, ["afp2", "sub3", "sub_id3"])) ? str(pick(row, ["afp2", "sub3", "sub_id3"])) : null);
      const key = `${dataRef}|${account.platform_id}|${account.id}|${influencerId ?? "_"}|${campanhaId ?? "_"}`;
      const b = buckets.get(key) ?? { data_ref: dataRef, platform_id: account.platform_id, platform_account_id: account.id, influencer_id: influencerId, campanha_id: campanhaId, cliques: 0, registros: 0, ftd: 0, deposits_count: 0, depositos_total: 0, revenue: 0, api_commission: 0, cpa_unit: num(account.cpa_value), sample_brand: str(pick(row, ["brand_name", "brandName", "brand_id"])) };
      b.cliques += num(pick(row, ["visit_count", "click_count", "clicks", "visits"]));
      b.registros += num(pick(row, ["registration_count", "registrations", "reg_count", "leads"]));
      b.ftd += num(pick(row, ["ftd_count", "qftd_count", "first_deposit_count"]));
      b.deposits_count += num(pick(row, ["deposit_count", "deposits_count", "deposit_num"]));
      b.depositos_total += num(pick(row, ["deposit_total", "deposits_total", "deposit_amount", "ftd_total"]));
      b.revenue += num(pick(row, ["net_pl", "revenue", "ngr", "ggr", "net_revenue"]));
      b.api_commission += num(pick(row, ["commissions_total", "commission", "commission_total", "partner_income"]));
      b.api_cpa_commission = (b.api_cpa_commission || 0) + num(pick(row, ["cpa_commission", "cpa_commissions", "cpa_total", "cpa_income", "ftd_commission"]));
      b.api_revshare_commission = (b.api_revshare_commission || 0) + num(pick(row, ["revshare_commission", "revshare", "rev_share", "rs_commission", "revenue_commission"]));
      buckets.set(key, b);
    }

    let upserts = 0;
    const errors: string[] = [];
    for (const b of buckets.values()) {
      const cpaCommission = b.api_cpa_commission || (b.ftd * b.cpa_unit);
      const revshareCommission = b.api_revshare_commission || ((b.api_commission && b.api_commission !== cpaCommission) ? Math.max(b.api_commission - cpaCommission, 0) : b.revenue);
      const payload = {
        ...b,
        cliques: Math.round(b.cliques), registros: Math.round(b.registros), ftd: Math.round(b.ftd), deposits_count: Math.round(b.deposits_count),
        cpa_commission: cpaCommission,
        revshare_commission: revshareCommission,
        commission_total: cpaCommission + revshareCommission,
        qftd_count: Math.round(b.ftd), qlead_count: Math.round(b.registros),
        original_amount: b.revenue, original_currency: "BRL", converted_amount: b.revenue, converted_currency: "BRL",
        origem_importacao: "smartico_api_pull", observacoes: `Smartico TAP / brand=${b.sample_brand || "?"} / api_commission=${b.api_commission.toFixed(2)}`, is_demo: false,
      };
      delete (payload as any).api_commission; delete (payload as any).api_cpa_commission; delete (payload as any).api_revshare_commission; delete (payload as any).cpa_unit; delete (payload as any).sample_brand;

      let q = admin.from("tracking_metrics").select("id").eq("data_ref", b.data_ref).eq("platform_id", b.platform_id).eq("platform_account_id", b.platform_account_id).eq("origem_importacao", "smartico_api_pull");
      q = b.influencer_id ? q.eq("influencer_id", b.influencer_id) : q.is("influencer_id", null);
      q = b.campanha_id ? q.eq("campanha_id", b.campanha_id) : q.is("campanha_id", null);
      const { data: existing, error: selErr } = await q.maybeSingle();
      if (selErr) { errors.push(selErr.message); continue; }
      const dbq = existing?.id ? admin.from("tracking_metrics").update({ ...payload, updated_at: new Date().toISOString() }).eq("id", existing.id) : admin.from("tracking_metrics").insert(payload);
      const { error } = await dbq;
      if (error) { errors.push(error.message); continue; }
      upserts++;
    }

    const debug = body && (body as any).debug;
    const responsePayload: Record<string, unknown> = { ok: true, window: { date_from: dateFrom, date_to: dateTo }, rows_received: report.rows.length, upserts, skipped, errors: errors.slice(0, 10), attempt: report.attempt };
    if (debug) {
      responsePayload.raw_payload_preview = typeof report.payload === "object" ? JSON.stringify(report.payload).slice(0, 4000) : String(report.payload).slice(0, 4000);
      responsePayload.first_rows = report.rows.slice(0, 3);
      responsePayload.accounts_count = (accounts ?? []).length;
    }
    return new Response(JSON.stringify(responsePayload), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ ok: false, error: message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
