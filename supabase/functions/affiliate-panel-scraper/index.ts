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
// Body: { brand?: "estrelabet" | "vupi" | "all", debug?: boolean, extract?: boolean, source?: "manual" | "cron" }
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

// Mapeia colunas por NOME do header em vez de índice fixo — VUPI e Estrelabet
// podem reordenar/adicionar colunas (impressões, qFTDs, chargeback…) e o parser
// não pode "escorregar" centavos entre depósitos, GGR, comissão etc.
const HEADER_ALIASES: Record<string, RegExp[]> = {
  cliques: [/^cliques?$/i, /clicks?/i],
  cadastros: [/^cadastros?$/i, /^registros?$/i, /sign[- ]?ups?/i],
  ftds: [/^ftds?$/i, /first.*deposit/i],
  ftds_valor: [/valor.*ftd/i, /ftd.*(valor|total|amount)/i, /first.*deposit.*(amount|value)/i],
  qftds: [/^q?\.?\s*ftds?$/i, /qualified.*ftd/i],
  depositos_qtd: [/dep[óo]sitos?\b(?!.*valor)(?!.*total)/i, /qtd.*dep/i, /deposits?(?!.*(amount|value|total))/i],
  depositos_valor: [/valor.*dep[óo]sit/i, /dep[óo]sitos?.*(valor|total|amount)/i, /deposit.*(amount|value|total)/i, /volume.*dep/i],
  ggr: [/^ggr$/i, /gross.*revenue/i],
  ngr: [/^ngr$/i, /net.*revenue/i],
  comissao_cpa: [/comiss[ãa]o.*cpa/i, /^cpa\b/i],
  comissao_revshare: [/comiss[ãa]o.*rev/i, /rev[- ]?share/i, /^rev\b/i],
};

function splitRow(line: string): string[] {
  return line.split("|").slice(1, -1).map((cell) => cell.trim());
}

function parsePerformanceTotalFromMarkdown(markdown?: string | null) {
  if (!markdown) return {};
  const lines = markdown.split("\n").map((l) => l.trim());

  let totalIdx = -1;
  for (let i = 0; i < lines.length; i++) {
    if (/^\|\s*Total\s*\|/i.test(lines[i])) { totalIdx = i; break; }
  }
  if (totalIdx < 0) return {};

  // Header = linha imediatamente acima do separador `|---|` mais próximo (subindo).
  let sepIdx = -1;
  for (let i = totalIdx - 1; i >= 0; i--) {
    if (/^\|\s*:?-{2,}/.test(lines[i])) { sepIdx = i; break; }
    if (!lines[i].startsWith("|")) break;
  }
  const totals = splitRow(lines[totalIdx]);
  const headers = sepIdx > 0
    ? splitRow(lines[sepIdx - 1]).map((h) => h.replace(/\s+/g, " ").trim())
    : [];

  const findIdx = (key: string): number => {
    if (!headers.length) return -1;
    const aliases = HEADER_ALIASES[key] ?? [];
    for (let i = 0; i < headers.length; i++) {
      if (aliases.some((re) => re.test(headers[i]))) return i;
    }
    return -1;
  };

  // Fallback posicional (layout histórico Estrelabet/VUPI) quando o header
  // não bate — garante que nunca zeramos por falha de matching de nome.
  const POSITIONAL: Record<string, number> = {
    cliques: 2, cadastros: 3, ftds: 4, ftds_valor: 5, qftds: 6,
    depositos_qtd: 7, depositos_valor: 8, ggr: 9, ngr: 10,
    comissao_cpa: 11, comissao_revshare: 12,
  };

  const pick = (key: string) => {
    const idx = findIdx(key);
    const value = idx >= 0 ? normalizeNumber(totals[idx]) : null;
    if (value != null) return value;
    const fallbackIdx = POSITIONAL[key];
    return fallbackIdx != null ? normalizeNumber(totals[fallbackIdx]) : null;
  };

  return {
    periodo_label: totals[0] || "Total",
    cliques: pick("cliques"),
    cadastros: pick("cadastros"),
    ftds: pick("ftds"),
    ftds_valor: pick("ftds_valor"),
    qftds: pick("qftds"),
    depositos_qtd: pick("depositos_qtd"),
    depositos_valor: pick("depositos_valor"),
    ggr: pick("ggr"),
    ngr: pick("ngr"),
    comissao_cpa: pick("comissao_cpa"),
    comissao_revshare: pick("comissao_revshare"),
  };
}
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
    { type: "wait", milliseconds: 5000 },
    { type: "executeJavascript", script: loginJs },
    { type: "wait", milliseconds: 8000 },
    ...(switchJs ? [{ type: "executeJavascript", script: switchJs }, { type: "wait", milliseconds: 7000 }] : []),
    { type: "executeJavascript", script: navJs },
    { type: "wait", milliseconds: 8000 },
  ];

  const body = {
    url: brand.loginUrl,
    formats,
    onlyMainContent: false,
    waitFor: 2500,
    actions,
    timeout: 120000,
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

async function markStaleRuns(supabase: any) {
  const staleBefore = new Date(Date.now() - 4 * 60_000).toISOString();
  await supabase
    .from("panel_scraper_runs")
    .update({
      status: "error",
      finished_at: new Date().toISOString(),
      message: "Sincronização anterior encerrada por timeout. Nova coleta pode iniciar automaticamente.",
    })
    .eq("scraper_key", "affiliate_panel_html")
    .eq("status", "running")
    .lt("started_at", staleBefore);
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
    // Regex vem primeiro porque lê exatamente o texto visível do widget; LLM fica só como fallback.
    saldo_disponivel: firstNumber(saldoRegex.saldo_disponivel, homeJson?.saldo_disponivel),
    saldo_pendente: firstNumber(saldoRegex.saldo_pendente, homeJson?.saldo_pendente),
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
  await markStaleRuns(supabase);
  let payload: any = {};
  try { payload = await req.json(); } catch { /* body optional */ }

  const wantBrand = String(payload?.brand ?? "all").toLowerCase();
  const source = String(payload?.source ?? "manual").toLowerCase();
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

  if (source === "cron" && payload?.force !== true) {
    const runningSince = new Date(Date.now() - 4 * 60_000).toISOString();
    const { data: activeRun } = await supabase
      .from("panel_scraper_runs")
      .select("id,started_at")
      .eq("scraper_key", "affiliate_panel_html")
      .eq("status", "running")
      .gte("started_at", runningSince)
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (activeRun?.id) {
      return new Response(
        JSON.stringify({ ok: true, run_id: activeRun.id, status: "already_processing", brands: targets.map((t) => t.slug) }, null, 2),
        { status: 202, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
  }

  const { data: run } = await supabase.from("panel_scraper_runs").insert({
    scraper_key: "affiliate_panel_html",
    status: "running",
    discovery: { brands: targets.map((t) => t.slug), started_from: source, extract: wantExtract },
  }).select("id").maybeSingle();
  const runId = run?.id;

  // Each Firecrawl pass takes ~40s; two brands × two pages easily blow the
  // 150s request timeout. Run everything in the background and let the client
  // poll `panel_scraper_runs` (by run_id) for completion.
  const task = (async () => {
    const results: Record<string, any> = {};
    const rawDump: Record<string, any> = {};
    await Promise.all(targets.map(async (brand) => {
      try {
        // Home and Performance are independent authenticated captures. Running
        // them in parallel keeps each sync inside the edge idle window and
        // avoids the dashboard getting stuck with stale "running" jobs.
        const [homeFc, perfFc] = await Promise.all([
          firecrawlLoginAndCapture(
            brand,
            "/home",
            HOME_SCHEMA,
            "Extraia o valor do widget 'Saldo disponível' (ou 'Disponível para saque') e do widget 'Saldo pendente'/'A liberar' visíveis na página inicial do painel afiliado. Já é o valor líquido. Formato R$ 1.234,56 → 1234.56. Se algum campo não existir, omita — não invente.",
          ),
          firecrawlLoginAndCapture(brand, "/reports/performance", null, ""),
        ]);
        const persisted = await persistBrand(supabase, brand, homeFc, perfFc);
        results[brand.slug] = { ok: true, ...persisted };
        if (debug) {
          const hd = homeFc?.data ?? homeFc;
          const pd = perfFc?.data ?? perfFc;
          rawDump[brand.slug] = {
            home: { metadata: hd?.metadata ?? null, markdown_head: (hd?.markdown ?? "").slice(0, 5000), json: hd?.json ?? hd?.extract ?? null },
            perf: { metadata: pd?.metadata ?? null, markdown_head: (pd?.markdown ?? "").slice(0, 5000) },
          };
        }
      } catch (err: any) {
        results[brand.slug] = { ok: false, error: err?.message ?? String(err) };
        rawDump[brand.slug] = { error: err?.message ?? String(err) };
      }
    }));
    if (runId) {
      await supabase.from("panel_scraper_runs").update({
        status: Object.values(results).every((r: any) => r.ok) ? "success" : "partial",
        finished_at: new Date().toISOString(),
        rows_imported: Object.values(results).reduce((n: number, r: any) => n + (r?.updatedAccounts ?? 0), 0),
        message: JSON.stringify(Object.fromEntries(Object.entries(results).map(([k, v]: any) => [k, v.ok ? `ok (saldo=${v.extracted?.saldo_disponivel ?? "n/a"} src=${v.saldo_source ?? "?"})` : v.error]))),
        discovery: { brands: targets.map((t) => t.slug), results, raw: debug ? rawDump : undefined },
      }).eq("id", runId);
    }
  })().catch(async (err) => {
    if (runId) {
      await supabase.from("panel_scraper_runs").update({
        status: "error",
        finished_at: new Date().toISOString(),
        message: err instanceof Error ? err.message : String(err),
      }).eq("id", runId);
    }
  });

  // @ts-ignore - EdgeRuntime is provided by Supabase Edge Runtime
  if (typeof EdgeRuntime !== "undefined" && (EdgeRuntime as any).waitUntil) {
    // @ts-ignore
    (EdgeRuntime as any).waitUntil(task);
  }

  return new Response(
    JSON.stringify({ ok: true, run_id: runId, status: "processing", brands: targets.map((t) => t.slug) }, null, 2),
    { status: 202, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
