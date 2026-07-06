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

// Schema used ONLY for the Home widget (saldo disponível / pendente).
const HOME_SCHEMA = {
  type: "object",
  properties: {
    saldo_disponivel: { type: "number", description: "Widget 'Saldo disponível' (ou 'Disponível para saque') visível na página inicial/saque do painel afiliado, em BRL. Já é líquido de saques pagos. Extraia apenas o número — 1.234,56 vira 1234.56." },
    saldo_pendente: { type: "number", description: "Widget 'Saldo pendente' / 'A liberar' em BRL, se visível." },
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

// Regex fallback for the saldo widget when the LLM extraction misses it.
function parseSaldoFromMarkdown(markdown?: string | null): { saldo_disponivel: number | null; saldo_pendente: number | null } {
  const out = { saldo_disponivel: null as number | null, saldo_pendente: null as number | null };
  if (!markdown) return out;
  const lines = markdown.split("\n").map((l) => l.trim());
  const money = /R\$\s*([\d.]+,\d{2})/i;
  const findAfter = (labelRe: RegExp): number | null => {
    for (let i = 0; i < lines.length; i++) {
      if (labelRe.test(lines[i])) {
        // check same line or next 3 lines
        for (let j = i; j < Math.min(i + 4, lines.length); j++) {
          const m = lines[j].match(money);
          if (m) return normalizeNumber(m[1]);
        }
      }
    }
    return null;
  };
  out.saldo_disponivel = findAfter(/saldo\s+dispon[íi]vel|dispon[íi]vel\s+para\s+saque/i);
  out.saldo_pendente = findAfter(/saldo\s+pendente|a\s+liberar|pendente/i);
  return out;
}

function compactExtraction(perf: any, saldo: { saldo_disponivel: number | null; saldo_pendente: number | null }) {
  const cpa = firstNumber(perf?.comissao_cpa) ?? 0;
  const rev = firstNumber(perf?.comissao_revshare) ?? 0;
  const commissionPeriod = cpa + rev;
  return {
    // Saldo real vem SEMPRE do widget do painel (líquido de saques).
    saldo_disponivel: firstNumber(saldo.saldo_disponivel) ?? 0,
    saldo_pendente: firstNumber(saldo.saldo_pendente) ?? 0,
    // Comissão do período = CPA + RevShare da tabela Total do performance report.
    comissao_periodo: commissionPeriod,
    comissao_cpa: cpa,
    comissao_revshare: rev,
    ftds: Math.round(firstNumber(perf?.ftds) ?? 0),
    ftds_valor: firstNumber(perf?.ftds_valor) ?? 0,
    cadastros: Math.round(firstNumber(perf?.cadastros) ?? 0),
    depositos_qtd: Math.round(firstNumber(perf?.depositos_qtd) ?? 0),
    depositos_valor: firstNumber(perf?.depositos_valor) ?? 0,
    cliques: Math.round(firstNumber(perf?.cliques) ?? 0),
    ggr: firstNumber(perf?.ggr) ?? 0,
    ngr: firstNumber(perf?.ngr) ?? 0,
    periodo_label: perf?.periodo_label ? String(perf.periodo_label) : "Período atual",
  };
}

function buildLoginJs(brand: Brand) {
  return `
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
}

function buildBrandSwitchJs(brand: Brand) {
  if (brand.slug !== "vupi") return "";
  return `
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
  `;
}

// One Firecrawl call: login → optional brand switch → navigate to `targetPath` → capture.
async function firecrawlLoginAndCapture(
  brand: Brand,
  targetPath: string,
  schema: any | null,
  extractPrompt: string,
) {
  if (!FIRECRAWL_API_KEY) throw new Error("FIRECRAWL_API_KEY not configured");
  if (!brand.loginUrl || !brand.user || !brand.pass) {
    throw new Error(`Missing credentials for ${brand.slug}`);
  }

  const formats: any[] = ["markdown", "html"];
  if (schema) formats.push({ type: "json", schema, prompt: extractPrompt });

  const loginJs = buildLoginJs(brand);
  const switchJs = buildBrandSwitchJs(brand);
  const navJs = `window.location.assign(new URL(${JSON.stringify(targetPath)}, window.location.origin).href);`;

  const actions: any[] = [
    { type: "wait", milliseconds: 8000 },
    { type: "executeJavascript", script: loginJs },
    { type: "wait", milliseconds: 12000 },
    ...(switchJs ? [{ type: "executeJavascript", script: switchJs }, { type: "wait", milliseconds: 10000 }] : []),
    { type: "executeJavascript", script: navJs },
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


async function persistBrand(supabase: any, brand: Brand, homeFc: any, perfFc: any) {
  const homeDoc = homeFc?.data ?? homeFc;
  const perfDoc = perfFc?.data ?? perfFc;
  const homeMd = homeDoc?.markdown ?? null;
  const perfMd = perfDoc?.markdown ?? null;

  // Sanity: for VUPI both captures should mention VUPI (else brand-switch failed).
  const bothMd = `${homeMd ?? ""}\n${perfMd ?? ""}`;
  if (brand.slug === "vupi" && !/\bVUPI\b|\bVupi\b/.test(bothMd)) {
    return {
      extracted: null,
      updatedAccounts: 0,
      updatedMetrics: 0,
      skipped: "brand_not_visible",
      has_markdown: !!(homeMd || perfMd),
    };
  }

  const perfJson = perfDoc?.json ?? perfDoc?.extract ?? {};
  const perf = { ...perfJson, ...parsePerformanceTotalFromMarkdown(perfMd) };

  const homeJson = homeDoc?.json ?? homeDoc?.extract ?? {};
  const saldoRegex = parseSaldoFromMarkdown(homeMd);
  const saldo = {
    saldo_disponivel: firstNumber(homeJson?.saldo_disponivel, saldoRegex.saldo_disponivel),
    saldo_pendente: firstNumber(homeJson?.saldo_pendente, saldoRegex.saldo_pendente),
  };

  const extracted = compactExtraction(perf, saldo);

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
  // Só grava balance se conseguimos ler o widget de saldo — nunca cai em CPA+Rev.
  if (saldo.saldo_disponivel != null) {
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
    const total = cpa + rev;
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
    if (!error) updatedMetrics++;
  }

  return {
    extracted,
    saldo_source: saldo.saldo_disponivel != null ? "home_widget" : "missing",
    updatedAccounts,
    updatedMetrics,
    has_home_md: !!homeMd,
    has_perf_md: !!perfMd,
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
