// affiliate-panel-scraper
// -------------------------------------------------------------
// Reads the REAL affiliate panel (Estrelabet / VUPI) via Firecrawl,
// bypassing the broken /user/performance/report API.
//
// Logs in, opens the performance report, captures screenshot + markdown + HTML,
// and asks Firecrawl to extract
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
    saldo_disponivel: { type: "number", description: "Saldo ou total líquido visível no relatório/painel, em BRL. Extraia apenas o número — 1.234,56 vira 1234.56." },
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

function normalizeNumber(value: unknown): number | null {
  if (value == null || value === "") return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  const raw = String(value).replace(/\s/g, "").replace(/R\$/gi, "");
  const normalized = raw.includes(",") ? raw.replace(/\./g, "").replace(",", ".") : raw;
  const n = Number(normalized.replace(/[^\d.-]/g, ""));
  return Number.isFinite(n) ? n : null;
}

function firstNumber(...values: unknown[]): number | null {
  for (const value of values) {
    const n = normalizeNumber(value);
    if (n != null) return n;
  }
  return null;
}

function parsePerformanceTotalFromMarkdown(markdown?: string | null) {
  if (!markdown) return {};
  const totalLine = markdown
    .split("\n")
    .map((line) => line.trim())
    .find((line) => /^\|\s*Total\s*\|/i.test(line));
  if (!totalLine) return {};

  const cells = totalLine
    .split("|")
    .slice(1, -1)
    .map((cell) => cell.trim());

  return {
    periodo_label: cells[0] || "Total",
    cliques: normalizeNumber(cells[2]),
    cadastros: normalizeNumber(cells[3]),
    ftds: normalizeNumber(cells[4]),
    ftds_valor: normalizeNumber(cells[5]),
    qftds: normalizeNumber(cells[6]),
    depositos_qtd: normalizeNumber(cells[7]),
    depositos_valor: normalizeNumber(cells[8]),
    ggr: normalizeNumber(cells[9]),
    ngr: normalizeNumber(cells[10]),
    comissao_cpa: normalizeNumber(cells[11]),
    comissao_revshare: normalizeNumber(cells[12]),
  };
}

function compactExtraction(input: any) {
  const cpa = firstNumber(input?.comissao_cpa) ?? 0;
  const rev = firstNumber(input?.comissao_revshare) ?? 0;
  const computedCommission = cpa + rev;
  const panelTotal = firstNumber(input?.comissao_periodo);
  const total = (cpa !== 0 || rev !== 0)
    ? computedCommission
    : (panelTotal ?? firstNumber(input?.saldo_disponivel) ?? 0);
  return {
    saldo_disponivel: total,
    saldo_pendente: firstNumber(input?.saldo_pendente) ?? 0,
    comissao_periodo: total,
    comissao_cpa: cpa,
    comissao_revshare: rev,
    ftds: Math.round(firstNumber(input?.ftds) ?? 0),
    cadastros: Math.round(firstNumber(input?.cadastros) ?? 0),
    depositos_qtd: Math.round(firstNumber(input?.depositos_qtd) ?? 0),
    depositos_valor: firstNumber(input?.depositos_valor) ?? 0,
    cliques: Math.round(firstNumber(input?.cliques) ?? 0),
    periodo_label: input?.periodo_label ? String(input.periodo_label) : "Período atual",
  };
}

async function firecrawlLoginAndScrape(brand: Brand, wantExtract: boolean, opts: { noActions?: boolean } = {}) {
  if (!FIRECRAWL_API_KEY) throw new Error("FIRECRAWL_API_KEY not configured");
  if (!brand.loginUrl || !brand.user || !brand.pass) {
    throw new Error(`Missing credentials for ${brand.slug}`);
  }

  const formats: any[] = ["markdown", "html", "screenshot"];
  if (wantExtract && !opts.noActions) {
    formats.push({ type: "json", schema: EXTRACTION_SCHEMA, prompt: "Extraia somente os KPIs visíveis no relatório de performance do painel afiliado. Campos esperados: cliques/visitas, cadastros/registros, FTDs, quantidade e valor de depósitos, comissão de CPA, comissão de RevShare e comissão/saldo total do período. Se um campo não estiver visível, omita — não invente. Números em BRL: converta 'R$ 1.234,56' para 1234.56." });
  }

  // React controlled inputs: `write` doesn't fire onChange, so use JS to set
  // the value via the native HTMLInputElement setter + dispatch input event.
  const loginJs = `
    (function(){
      const setVal = (el, v) => {
        const s = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
        s.call(el, v);
        el.dispatchEvent(new Event('input', {bubbles:true}));
        el.dispatchEvent(new Event('change', {bubbles:true}));
        el.dispatchEvent(new Event('blur', {bubbles:true}));
      };
      const email = document.querySelector('input[name="email"]');
      const pass  = document.querySelector('input[name="password"]');
      if (email) setVal(email, ${JSON.stringify(brand.user)});
      if (pass)  setVal(pass,  ${JSON.stringify(brand.pass)});
      setTimeout(() => {
        const btn = document.querySelector('button[type="submit"]');
        if (btn) btn.click();
      }, 400);
    })();
  `;

  const switchBrandJs = brand.slug === "vupi" ? `
    (function(){
      const norm = (s) => (s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
      const clickLikeUser = (el) => {
        if (!el) return false;
        el.scrollIntoView({block:'center', inline:'center'});
        el.dispatchEvent(new MouseEvent('pointerdown', {bubbles:true}));
        el.dispatchEvent(new MouseEvent('mousedown', {bubbles:true}));
        el.dispatchEvent(new MouseEvent('mouseup', {bubbles:true}));
        el.click();
        return true;
      };
      const nodes = Array.from(document.querySelectorAll('button,[role="button"],a,li,div,span'));
      const direct = nodes
        .filter((el) => /vupi/i.test(el.textContent || ''))
        .sort((a,b) => (a.textContent || '').length - (b.textContent || '').length)[0];
      if (clickLikeUser(direct)) return;
      const brandToggle = nodes
        .filter((el) => /estrelabet|estrela bet/i.test(el.textContent || ''))
        .sort((a,b) => (a.textContent || '').length - (b.textContent || '').length)[0];
      clickLikeUser(brandToggle);
      setTimeout(() => {
        const vupi = Array.from(document.querySelectorAll('button,[role="button"],a,li,div,span'))
          .filter((el) => norm(el.textContent).includes('vupi'))
          .sort((a,b) => (a.textContent || '').length - (b.textContent || '').length)[0];
        clickLikeUser(vupi);
      }, 1200);
    })();
  ` : "";

  const actions = opts.noActions ? [
    { type: "wait", milliseconds: 4000 },
    { type: "screenshot", fullPage: true },
  ] : [
    { type: "wait", milliseconds: 8000 },
    { type: "executeJavascript", script: loginJs },
    { type: "wait", milliseconds: 12000 },
    ...(switchBrandJs ? [{ type: "executeJavascript", script: switchBrandJs }, { type: "wait", milliseconds: 10000 }] : []),
    { type: "executeJavascript", script: "window.location.assign(new URL('/reports/performance', window.location.origin).href);" },
    { type: "wait", milliseconds: 14000 },
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
  const md = doc?.markdown ?? null;

  if (brand.slug === "vupi" && !/\bVUPI\b|\bVupi\b/.test(md ?? "")) {
    return {
      extracted: null,
      updatedAccounts: 0,
      updatedMetrics: 0,
      skipped: "brand_not_visible",
      has_markdown: !!md,
      has_html: !!(doc?.html ?? null),
      has_screenshot: !!(doc?.screenshot ?? null),
      metadata: doc?.metadata ?? null,
    };
  }

  const extracted = compactExtraction({ ...(doc?.json ?? doc?.extract ?? {}), ...parsePerformanceTotalFromMarkdown(md) });
  const html = doc?.html ?? null;
  const screenshot = doc?.screenshot ?? null;
  const meta = doc?.metadata ?? null;

  const key = brand.slug === "estrelabet" ? "estrel" : "vupi";
  const { data: platforms } = await supabase
    .from("platforms")
    .select("id, slug, name")
    .or(`slug.ilike.%${key}%,name.ilike.%${key}%`);

  const platformIds = (platforms ?? []).map((p: any) => p.id);
  const accounts: any[] = [];
  if (platformIds.length) {
    const { data } = await supabase
      .from("platform_accounts")
      .select("id, platform_id")
      .in("platform_id", platformIds)
      .eq("is_active", true)
      .eq("is_demo", false);
    accounts.push(...(data ?? []));
  }

  let updatedAccounts = 0;
  if (extracted.saldo_disponivel != null) {
    for (const acc of accounts) {
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

  let updatedMetrics = 0;
  const today = new Date().toISOString().slice(0, 10);
  for (const acc of accounts) {
    const cpa = extracted.comissao_cpa ?? 0;
    const rev = extracted.comissao_revshare ?? 0;
    const total = extracted.comissao_periodo ?? cpa + rev;
    const { error } = await supabase.from("tracking_metrics").upsert({
      data_ref: today,
      platform_id: acc.platform_id,
      platform_account_id: acc.id,
      cliques: extracted.cliques ?? 0,
      registros: extracted.cadastros ?? 0,
      ftd: extracted.ftds ?? 0,
      deposits_count: extracted.depositos_qtd ?? 0,
      depositos_total: extracted.depositos_valor ?? 0,
      revenue: rev,
      revshare_commission: rev,
      cpa_commission: cpa,
      commission_total: total,
      converted_amount: extracted.depositos_valor ?? 0,
      converted_currency: "BRL",
      original_amount: extracted.depositos_valor ?? 0,
      original_currency: "BRL",
      origem_importacao: "panel_scrape_html",
      is_demo: false,
      external_ref: `${brand.slug}:panel_scrape_html:current_period:${acc.id}`,
    }, { onConflict: "external_ref" });
    if (!error) {
      updatedMetrics++;
    }
  }

  return {
    extracted,
    updatedAccounts,
    updatedMetrics,
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
          html_head: (doc?.html ?? "").slice(0, 20000),
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
