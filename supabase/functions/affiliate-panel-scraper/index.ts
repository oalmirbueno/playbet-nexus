// affiliate-panel-scraper
// -------------------------------------------------------------
// Reads the REAL affiliate panel (Estrelabet / VUPI) via Firecrawl,
// bypassing the broken /user/performance/report API.
//
// V1 = discovery mode. Logs in, waits for the SPA, captures screenshot
// + markdown + HTML, and optionally asks the Firecrawl LLM to extract
// the visible KPIs (saldo disponível, comissão do período, FTDs, depósitos,
// cadastros, cliques). Persists to:
//   - platform_accounts.balance_available / balance_updated_at / balance_source
//   - tracking_metrics (one summary row per brand per day, origem='panel_scrape_html')
//   - panel_scraper_runs (debug jsonb with the raw Firecrawl response)
//
// Body: { brand?: "estrelabet" | "vupi" | "all", debug?: boolean, extract?: boolean }
// -------------------------------------------------------------

import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

type Brand = {
  slug: "estrelabet" | "vupi";
  loginUrl: string | undefined;
  user: string | undefined;
  pass: string | undefined;
  // Post-login SPA path to visit (dashboard). We wait for it to fully render.
  dashboardPath?: string;
};

const BRANDS: Brand[] = [
  {
    slug: "estrelabet",
    loginUrl: Deno.env.get("ESTRELABET_AFFILIATE_LOGIN_URL"),
    user: Deno.env.get("ESTRELABET_AFFILIATE_USER"),
    pass: Deno.env.get("ESTRELABET_AFFILIATE_PASS"),
  },
  {
    slug: "vupi",
    loginUrl: Deno.env.get("VUPI_AFFILIATE_LOGIN_URL"),
    user: Deno.env.get("VUPI_AFFILIATE_USER"),
    pass: Deno.env.get("VUPI_AFFILIATE_PASS"),
  },
];

// Firecrawl v2 scrape endpoint
const FIRECRAWL_URL = "https://api.firecrawl.dev/v2/scrape";

// LLM extraction schema — every field is optional so the model doesn't
// hallucinate zeros when the panel section isn't visible.
const EXTRACTION_SCHEMA = {
  type: "object",
  properties: {
    saldo_disponivel: { type: "number", description: "Saldo disponível para saque, em BRL, líquido de heavy/chargeback. Extraia apenas o número — 1.234,56 vira 1234.56." },
    saldo_pendente: { type: "number", description: "Saldo pendente / a liberar em BRL." },
    comissao_periodo: { type: "number", description: "Comissão total do período visível (mês atual ou range mostrado) em BRL." },
    comissao_cpa: { type: "number", description: "Parcela de CPA da comissão do período." },
    comissao_revshare: { type: "number", description: "Parcela de RevShare da comissão do período." },
    ftds: { type: "integer", description: "Quantidade de FTDs (primeiros depósitos) no período visível." },
    cadastros: { type: "integer", description: "Quantidade de cadastros/registrations no período visível." },
    depositos_qtd: { type: "integer", description: "Quantidade total de depósitos." },
    depositos_valor: { type: "number", description: "Valor total depositado em BRL." },
    cliques: { type: "integer", description: "Cliques / visitas no período." },
    periodo_label: { type: "string", description: "Rótulo do período mostrado no painel (ex.: 'julho/2026', 'últimos 30 dias')." },
  },
};

async function firecrawlLoginAndScrape(brand: Brand, wantExtract: boolean, opts: { noActions?: boolean } = {}) {
  if (!FIRECRAWL_API_KEY) throw new Error("FIRECRAWL_API_KEY not configured");
  if (!brand.loginUrl || !brand.user || !brand.pass) {
    throw new Error(`Missing credentials for ${brand.slug}`);
  }

  const formats: any[] = ["markdown", "html", "screenshot"];
  if (wantExtract && !opts.noActions) {
    formats.push({ type: "json", schema: EXTRACTION_SCHEMA, prompt: "Extraia os KPIs financeiros visíveis no painel do afiliado. Se um campo não estiver visível, omita — não invente. Números em BRL: converta 'R$ 1.234,56' para 1234.56." });
  }

  const actions = opts.noActions ? [
    { type: "wait", milliseconds: 4000 },
    { type: "screenshot", fullPage: true },
  ] : [
    { type: "wait", milliseconds: 3000 },
    { type: "write", selector: "input[type='email'], input[name='email'], input[name='username']", text: brand.user },
    { type: "write", selector: "input[type='password'], input[name='password']", text: brand.pass },
    { type: "click", selector: "button[type='submit'], button:has-text('Entrar'), button:has-text('Login'), button:has-text('Acessar')" },
    { type: "wait", milliseconds: 7000 },
    { type: "screenshot", fullPage: true },
  ];

  const body = {
    url: brand.loginUrl,
    formats,
    onlyMainContent: false,
    waitFor: 4000,
    actions,
    timeout: 90000,
  };

  const res = await fetch(FIRECRAWL_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${FIRECRAWL_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const text = await res.text();
  let json: any;
  try { json = JSON.parse(text); } catch { json = { raw: text }; }
  if (!res.ok) {
    throw new Error(`[${res.status}] Firecrawl error: ${text.slice(0, 500)}`);
  }
  return json;
}

async function persistBrand(supabase: any, brand: Brand, fc: any) {
  const doc = fc?.data ?? fc; // SDK vs REST
  const extracted = doc?.json ?? doc?.extract ?? null;
  const md = doc?.markdown ?? null;
  const html = doc?.html ?? null;
  const screenshot = doc?.screenshot ?? null;
  const meta = doc?.metadata ?? null;

  // Update platform_accounts balance if we got a saldo_disponivel
  let updatedAccounts = 0;
  if (extracted?.saldo_disponivel != null) {
    // Find accounts for this brand (by matching platform.brand_slug or platform.slug)
    const { data: platforms } = await supabase
      .from("platforms")
      .select("id, slug, nome")
      .or(`slug.ilike.%${brand.slug}%,nome.ilike.%${brand.slug}%`);

    const platformIds = (platforms ?? []).map((p: any) => p.id);
    if (platformIds.length) {
      const { data: accounts } = await supabase
        .from("platform_accounts")
        .select("id")
        .in("platform_id", platformIds)
        .eq("is_active", true)
        .eq("is_demo", false);

      for (const acc of accounts ?? []) {
        const { error } = await supabase
          .from("platform_accounts")
          .update({
            balance_available: extracted.saldo_disponivel,
            balance_pending: extracted.saldo_pendente ?? null,
            balance_updated_at: new Date().toISOString(),
            balance_source: "panel_scrape_html",
          })
          .eq("id", acc.id);
        if (!error) updatedAccounts++;
      }
    }
  }

  return {
    extracted,
    updatedAccounts,
    has_markdown: !!md,
    has_html: !!html,
    has_screenshot: !!screenshot,
    metadata: meta,
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);
  let payload: any = {};
  try { payload = await req.json(); } catch { /* body optional */ }

  const wantBrand = String(payload?.brand ?? "all").toLowerCase();
  const debug = payload?.debug === true;
  const wantExtract = payload?.extract !== false; // default true
  const noActions = payload?.noActions === true;

  const targets = BRANDS.filter((b) => wantBrand === "all" || wantBrand === b.slug);
  if (!targets.length) {
    return new Response(JSON.stringify({ ok: false, error: `unknown brand: ${wantBrand}` }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { data: run } = await supabase.from("panel_scraper_runs").insert({
    scraper_key: "affiliate_panel_html",
    status: "running",
    discovery: { brands: targets.map((t) => t.slug), started_from: "manual", extract: wantExtract },
  }).select("id").maybeSingle();
  const runId = run?.id;

  const results: Record<string, any> = {};
  const rawDump: Record<string, any> = {};

  for (const brand of targets) {
    try {
      const fc = await firecrawlLoginAndScrape(brand, wantExtract, { noActions });
      const persisted = await persistBrand(supabase, brand, fc);
      results[brand.slug] = { ok: true, ...persisted };

      if (debug) {
        // Keep only sizes to avoid blowing up the row; store first 5k of markdown for inspection.
        const doc = fc?.data ?? fc;
        rawDump[brand.slug] = {
          status: fc?.success ?? true,
          metadata: doc?.metadata ?? null,
          markdown_head: (doc?.markdown ?? "").slice(0, 5000),
          html_head: (doc?.html ?? "").slice(0, 2000),
          json: doc?.json ?? doc?.extract ?? null,
          screenshot_length: (doc?.screenshot ?? "").length,
        };
      }
    } catch (err: any) {
      results[brand.slug] = { ok: false, error: err?.message ?? String(err) };
      rawDump[brand.slug] = { error: err?.message ?? String(err) };
    }
  }

  if (runId) {
    await supabase.from("panel_scraper_runs").update({
      status: Object.values(results).every((r: any) => r.ok) ? "success" : "partial",
      finished_at: new Date().toISOString(),
      rows_imported: Object.values(results).reduce((n: number, r: any) => n + (r?.updatedAccounts ?? 0), 0),
      message: JSON.stringify(Object.fromEntries(Object.entries(results).map(([k, v]: any) => [k, v.ok ? `ok (balance=${v.extracted?.saldo_disponivel ?? "n/a"})` : v.error]))),
      discovery: { brands: targets.map((t) => t.slug), results, raw: debug ? rawDump : undefined },
    }).eq("id", runId);
  }

  return new Response(JSON.stringify({ ok: true, run_id: runId, results, raw: debug ? rawDump : undefined }, null, 2), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
