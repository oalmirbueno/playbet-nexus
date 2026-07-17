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
const ESTRELABET_OFFICIAL_PANEL_URL = "https://admin.aff.estrelabetpartners.com/460395#/";
const SMARTICO_API_BASE = "https://boapi.smartico.ai";

type Brand = {
  slug: "estrelabet" | "vupi";
  loginUrl: string | undefined;
  user: string | undefined;
  pass: string | undefined;
  accountId?: string;
  // Post-login SPA path to visit (dashboard). We wait for it to fully render.
  dashboardPath?: string;
};

const BRANDS: Brand[] = [
  {
    slug: "estrelabet",
    loginUrl: ESTRELABET_OFFICIAL_PANEL_URL,
    user: Deno.env.get("ESTRELABET_AFFILIATE_USER"),
    pass: Deno.env.get("ESTRELABET_AFFILIATE_PASS"),
    accountId: Deno.env.get("ESTRELABET_AFFILIATE_ACCOUNT_ID") ?? "460395",
  },
  {
    slug: "vupi",
    loginUrl: Deno.env.get("VUPI_AFFILIATE_LOGIN_URL"),
    user: Deno.env.get("VUPI_AFFILIATE_USER"),
    pass: Deno.env.get("VUPI_AFFILIATE_PASS"),
    accountId: Deno.env.get("VUPI_AFFILIATE_ACCOUNT_ID") === "397057" ? undefined : (Deno.env.get("VUPI_AFFILIATE_ACCOUNT_ID") ?? undefined),
  },
];

// Firecrawl v2 scrape endpoint
const FIRECRAWL_URL = "https://api.firecrawl.dev/v2/scrape";

function brandLookupKey(slug: Brand["slug"]) {
  return slug === "estrelabet" ? "estrel" : "vupi";
}

async function resolveBrandForCapture(supabase: any, brand: Brand): Promise<Brand> {
  if (brand.accountId) return brand;
  const key = brandLookupKey(brand.slug);
  const { data: platforms } = await supabase
    .from("platforms")
    .select("id")
    .or(`slug.ilike.%${key}%,name.ilike.%${key}%`)
    .limit(5);
  const platformIds = (platforms ?? []).map((p: any) => p.id);
  if (!platformIds.length) return brand;
  const { data: account } = await supabase
    .from("platform_accounts")
    .select("account_external_id")
    .in("platform_id", platformIds)
    .eq("is_active", true)
    .eq("is_demo", false)
    .not("account_external_id", "is", null)
    .order("updated_at", { ascending: false, nullsFirst: false })
    .limit(1)
    .maybeSingle();
  const accountId = String(account?.account_external_id ?? "").trim();
  return accountId ? { ...brand, accountId } : brand;
}

async function getLastPanelMetricUpdate(supabase: any, brand: Brand): Promise<number> {
  const key = brandLookupKey(brand.slug);
  const { data: platforms } = await supabase
    .from("platforms")
    .select("id")
    .or(`slug.ilike.%${key}%,name.ilike.%${key}%`)
    .limit(5);
  const platformIds = (platforms ?? []).map((p: any) => p.id);
  if (!platformIds.length) return 0;

  let accountQuery = supabase
    .from("platform_accounts")
    .select("id")
    .in("platform_id", platformIds)
    .eq("is_active", true)
    .eq("is_demo", false);
  if (brand.accountId) accountQuery = accountQuery.eq("account_external_id", brand.accountId);
  const { data: accounts } = await accountQuery;
  const accountIds = (accounts ?? []).map((acc: any) => acc.id);
  if (!accountIds.length) return 0;

  const { data: metric } = await supabase
    .from("tracking_metrics")
    .select("updated_at,created_at")
    .in("platform_account_id", accountIds)
    .eq("origem_importacao", "panel_scrape_html")
    .order("updated_at", { ascending: false, nullsFirst: false })
    .limit(1)
    .maybeSingle();

  const ts = metric?.updated_at ?? metric?.created_at;
  return ts ? new Date(ts).getTime() : 0;
}

async function pickNextBrandForAll(supabase: any, brands: Brand[]): Promise<Brand[]> {
  if (brands.length <= 1) return brands;
  const scored = await Promise.all(brands.map(async (brand) => ({
    brand,
    lastUpdated: await getLastPanelMetricUpdate(supabase, brand),
  })));
  scored.sort((a, b) => a.lastUpdated - b.lastUpdated);
  return [scored[0].brand];
}

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
  let raw = String(value).replace(/\s/g, "").replace(/R\$/gi, "");
  // Estrelabet cola o percentual no valor: "R$750,0092%" ou "R$-13,41-10%".
  // Formato = <valor>,<centavos-2-digitos><pct>%. Preserva os centavos.
  raw = raw.replace(/(,\d{2})-?\d+%$/, "$1");
  // Caso genérico sem centavos, ex.: "0%" no fim.
  raw = raw.replace(/-?\d+%$/i, "");
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
  cliques: [/^cliques?$/i, /clicks?/i, /^visitas?$/i, /impress/i],
  cadastros: [/^cadastros?$/i, /^registros?$/i, /sign[- ]?ups?/i],
  ftds: [/^ftds?$/i, /first.*deposit/i],
  ftds_valor: [/ftd.*amount/i, /valor.*ftd/i, /ftd.*(valor|total)/i, /first.*deposit.*(amount|value)/i],
  qftds: [/^q?\.?\s*ftds?$/i, /qualified.*ftd/i],
  depositos_qtd: [/^dep[óo]sitos?$/i, /dep[óo]sitos?\b(?!.*(valor|total|amount))/i, /qtd.*dep/i, /deposits?(?!.*(amount|value|total))/i],
  depositos_valor: [/dep\.?\s*amount/i, /valor.*dep[óo]sit/i, /dep[óo]sitos?.*(valor|total|amount)/i, /deposit.*(amount|value|total)/i, /volume.*dep/i],
  ggr: [/^ggr\b/i, /gross.*revenue/i],
  ngr: [/^ngr\b/i, /net.*revenue|net\s*p&l/i],
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
    if (/^\|\s*Total/i.test(lines[i])) { totalIdx = i; break; }
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

  // Fallback posicional para o layout atual Estrelabet:
  // | Período | CPA | RevShare | Visitas | Registros | FTDs | QFTDs |
  //   FTDs Amount | Depósitos | Dep. Amount | GGR | NGR |
  const POSITIONAL: Record<string, number> = {
    comissao_cpa: 1, comissao_revshare: 2,
    cliques: 3, cadastros: 4, ftds: 5, qftds: 6,
    ftds_valor: 7, depositos_qtd: 8, depositos_valor: 9,
    ggr: 10, ngr: 11,
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

// Regex fallback for the saldo widget when the LLM extraction misses it.
function parseSaldoFromMarkdown(markdown?: string | null): { saldo_disponivel: number | null; saldo_pendente: number | null; masked: boolean } {
  const out = { saldo_disponivel: null as number | null, saldo_pendente: null as number | null };
  if (!markdown) return { ...out, masked: false };
  const lines = markdown.split("\n").map((l) => l.trim());
  const masked = /[•●*]{3,}|\*\*\*\*/.test(markdown);
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

  const findOperationalBalance = (): number | null => {
    const sectionIdx = lines.findIndex((line) => /balan[çc]o\s+de\s+saldo/i.test(line));
    if (sectionIdx < 0) return null;
    for (let i = sectionIdx + 1; i < Math.min(sectionIdx + 12, lines.length); i++) {
      if (/^saldo$/i.test(lines[i]) || /saldo\s*R\$/i.test(lines[i])) {
        for (let j = i; j < Math.min(i + 5, lines.length); j++) {
          const m = lines[j].match(money);
          if (m) return normalizeNumber(m[1]);
        }
      }
    }
    return null;
  };

  // O painel Estrelabet exibe um “Saldo total R$ 0,00” na Home, mas o saldo
  // financeiro real fica no bloco “BALANÇO DE SALDO”. Quando esse bloco está
  // mascarado (••••••), zero da Home/LLM NÃO é fonte confiável.
  out.saldo_disponivel = findOperationalBalance() ?? findAfter(/saldo\s+dispon[íi]vel|dispon[íi]vel\s+para\s+saque|dispon[íi]vel\s+para\s+retirada|valor\s+dispon[íi]vel|saldo\s+afil/i);
  out.saldo_pendente = findAfter(/saldo\s+pendente|a\s+liberar|pendente/i);
  return { ...out, masked };
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

function addDays(date: Date, days: number) {
  const copy = new Date(date);
  copy.setUTCDate(copy.getUTCDate() + days);
  return copy;
}

function currentPanelPeriod() {
  const end = new Date();
  const start = addDays(end, -29);
  return {
    date_from: start.toISOString().slice(0, 10),
    // O painel oficial usa date_to exclusivo: a UI envia fim + 1 dia.
    date_to: addDays(end, 1).toISOString().slice(0, 10),
  };
}

function getBrandSmarticoId(brand: Brand, platforms: any[] = []) {
  const fromDb = platforms
    .map((platform: any) => String(platform?.smartico_brand_id ?? "").trim())
    .find(Boolean);
  if (fromDb) return fromDb;
  return brand.slug === "estrelabet" ? "397057" : null;
}

function parseOfficialMediaReport(rows: any[]) {
  const row = rows?.[0] ?? {};
  const cpa = firstNumber(row.commissions_cpa, row.commission_cpa, row.cpa_commission) ?? 0;
  const total = firstNumber(row.commissions_total, row.commission_total) ?? 0;
  const rev = firstNumber(row.commissions_rev_share, row.commission_rev_share, row.revshare_commission, total - cpa) ?? 0;
  return {
    periodo_label: "Últimos 30 dias",
    cliques: Math.round(firstNumber(row.visit_count, row.click_count, row.clicks) ?? 0),
    cadastros: Math.round(firstNumber(row.registration_count, row.reg_count, row.registrations) ?? 0),
    ftds: Math.round(firstNumber(row.ftd_count, row.ftds) ?? 0),
    ftds_valor: firstNumber(row.ftd_total, row.ftd_amount) ?? 0,
    qftds: Math.round(firstNumber(row.qftd_count, row.qftds) ?? 0),
    depositos_qtd: Math.round(firstNumber(row.deposit_count, row.deposits_count) ?? 0),
    depositos_valor: firstNumber(row.deposit_total, row.deposits_total, row.net_deposit_total) ?? 0,
    ggr: firstNumber(row.pl, row.netwin, row.ggr) ?? 0,
    ngr: firstNumber(row.netwin, row.pl, row.ngr) ?? 0,
    comissao_cpa: cpa,
    comissao_revshare: rev,
  };
}

async function smarticoLogin(brand: Brand) {
  if (!brand.user || !brand.pass) throw new Error(`Missing credentials for ${brand.slug}`);
  const res = await fetch(`${SMARTICO_API_BASE}/api-auth`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: brand.user, password: brand.pass }),
  });
  const text = await res.text();
  let json: any;
  try { json = JSON.parse(text); } catch { json = { raw: text }; }
  if (!res.ok || json?.errCode || !json?.boAccount?.token) {
    throw new Error(`Smartico login failed for ${brand.slug}: ${json?.message ?? json?.errCode ?? text.slice(0, 200)}`);
  }
  return json.boAccount;
}

async function fetchOfficialPerformanceReport(brand: Brand, platforms: any[] = []) {
  if (brand.slug !== "estrelabet") return null;
  const labelId = String(brand.accountId ?? "460395").trim();
  const brandId = getBrandSmarticoId(brand, platforms);
  const account = await smarticoLogin(brand);
  const { date_from, date_to } = currentPanelPeriod();
  const url = new URL(`${SMARTICO_API_BASE}/api/af2_media_report_af`);
  url.searchParams.set("sort", JSON.stringify(["id", "DESC"]));
  url.searchParams.set("range", JSON.stringify([0, 0]));
  url.searchParams.set("filter", JSON.stringify({}));
  url.searchParams.set("skip_group_by", "true");
  url.searchParams.set("date_from", date_from);
  url.searchParams.set("date_to", date_to);
  if (brandId) url.searchParams.set("brand_id", String(brandId));
  url.searchParams.set("lbl", labelId);

  const res = await fetch(url.toString(), {
    method: "GET",
    headers: {
      Accept: "application/json",
      Authorization: String(account.token),
      active_label_id: labelId,
    },
  });
  const text = await res.text();
  let json: any;
  try { json = JSON.parse(text); } catch { json = { raw: text }; }
  if (!res.ok) {
    throw new Error(`Smartico report failed for ${brand.slug}: [${res.status}] ${text.slice(0, 300)}`);
  }
  const rows = Array.isArray(json?.data) ? json.data : Array.isArray(json) ? json : [];
  if (!rows.length) throw new Error(`Smartico report returned no rows for ${brand.slug}`);
  return {
    rows,
    parsed: parseOfficialMediaReport(rows),
    meta: { date_from, date_to, label_id: labelId, brand_id: brandId, source: "smartico_af2_media_report_af" },
  };
}

async function fetchOfficialBalance(brand: Brand) {
  if (brand.slug !== "estrelabet") return null;
  const labelId = String(brand.accountId ?? "460395").trim();
  const account = await smarticoLogin(brand);
  const url = new URL(`${SMARTICO_API_BASE}/api/af2_balance_af/1`);
  url.searchParams.set("lbl", labelId);
  const res = await fetch(url.toString(), {
    method: "GET",
    headers: {
      Accept: "application/json",
      Authorization: String(account.token),
      active_label_id: labelId,
    },
  });
  const text = await res.text();
  let json: any;
  try { json = JSON.parse(text); } catch { json = { raw: text }; }
  if (!res.ok) {
    throw new Error(`Smartico balance failed for ${brand.slug}: [${res.status}] ${text.slice(0, 300)}`);
  }
  const row = json?.data ?? json;
  return {
    saldo_disponivel: firstNumber(row?.balance) ?? null,
    saldo_pendente: firstNumber(row?.not_processed_payment_amount) ?? null,
    row,
    meta: { label_id: labelId, source: "smartico_af2_balance_af" },
  };
}

function numberOrZero(value: unknown): number {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
}

// Only block a write when the extraction is CLEARLY empty (painel não
// renderizou / filtro caiu / sessão expirou) e já tínhamos dados. Antes
// bloqueávamos qualquer métrica que oscilasse pra baixo — isso congelava o
// dashboard porque o painel oficial oscila naturalmente (chargeback, estorno,
// reclassificação de FTD). O painel é a fonte da verdade: se o painel diz
// que caiu, a gente reflete. Só ignora leitura totalmente vazia.
function isEmptyExtraction(extracted: ReturnType<typeof compactExtraction>) {
  return (
    numberOrZero(extracted.cliques) === 0 &&
    numberOrZero(extracted.cadastros) === 0 &&
    numberOrZero(extracted.ftds) === 0 &&
    numberOrZero(extracted.depositos_qtd) === 0 &&
    numberOrZero(extracted.depositos_valor) === 0 &&
    numberOrZero(extracted.comissao_cpa) === 0 &&
    numberOrZero(extracted.comissao_revshare) === 0
  );
}

function existingHasData(existing: any) {
  if (!existing) return false;
  return (
    numberOrZero(existing.cliques) > 0 ||
    numberOrZero(existing.registros) > 0 ||
    numberOrZero(existing.ftd) > 0 ||
    numberOrZero(existing.deposits_count) > 0 ||
    numberOrZero(existing.depositos_total) > 0
  );
}

function isPartialDowngrade(existing: any, extracted: any) {
  if (!existingHasData(existing) || isEmptyExtraction(extracted)) return false;
  const checks: Array<[number, number]> = [
    [numberOrZero(existing.cliques), numberOrZero(extracted.cliques)],
    [numberOrZero(existing.registros), numberOrZero(extracted.cadastros)],
    [numberOrZero(existing.ftd), numberOrZero(extracted.ftds)],
    [numberOrZero(existing.deposits_count), numberOrZero(extracted.depositos_qtd)],
    [numberOrZero(existing.depositos_total), numberOrZero(extracted.depositos_valor)],
  ];
  const hasHigherExisting = checks.some(([oldValue, newValue]) => oldValue > 0 && newValue < oldValue);
  const hasFreshPositiveRead = checks.some(([, newValue]) => newValue > 0);
  return hasFreshPositiveRead && hasHigherExisting;
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

function buildOfficialSmarticoCaptureJs(brand: Brand) {
  if (brand.slug !== "estrelabet") return "";
  const labelId = String(brand.accountId ?? "460395").trim();
  const brandId = "397057";
  const { date_from, date_to } = currentPanelPeriod();
  return `
    (async function(){
      const result = { label_id: ${JSON.stringify(labelId)}, brand_id: ${JSON.stringify(brandId)}, date_from: ${JSON.stringify(date_from)}, date_to: ${JSON.stringify(date_to)} };
      try {
        const cookieToken = (document.cookie || '').split(';').map(s => s.trim()).find(s => s.startsWith('__smtaff_bo_token='));
        const storageToken = localStorage.getItem('__smtaff_bo_token') || sessionStorage.getItem('__smtaff_bo_token');
        const token = storageToken || (cookieToken ? decodeURIComponent(cookieToken.split('=').slice(1).join('=')) : '');
        if (!token) throw new Error('token_not_found_after_login');
        const headers = { Accept: 'application/json', Authorization: token, active_label_id: ${JSON.stringify(labelId)} };

        const perfUrl = new URL('https://boapi.smartico.ai/api/af2_media_report_af');
        perfUrl.searchParams.set('sort', JSON.stringify(['id', 'DESC']));
        perfUrl.searchParams.set('range', JSON.stringify([0, 0]));
        perfUrl.searchParams.set('filter', JSON.stringify({}));
        perfUrl.searchParams.set('skip_group_by', 'true');
        perfUrl.searchParams.set('date_from', ${JSON.stringify(date_from)});
        perfUrl.searchParams.set('date_to', ${JSON.stringify(date_to)});
        perfUrl.searchParams.set('brand_id', ${JSON.stringify(brandId)});
        perfUrl.searchParams.set('lbl', ${JSON.stringify(labelId)});
        const perfRes = await fetch(perfUrl.toString(), { headers, credentials: 'include' });
        result.performance_status = perfRes.status;
        result.performance = await perfRes.json().catch(async () => ({ raw: await perfRes.text() }));

        const balUrl = new URL('https://boapi.smartico.ai/api/af2_balance_af/1');
        balUrl.searchParams.set('lbl', ${JSON.stringify(labelId)});
        const balRes = await fetch(balUrl.toString(), { headers, credentials: 'include' });
        result.balance_status = balRes.status;
        result.balance = await balRes.json().catch(async () => ({ raw: await balRes.text() }));
      } catch (err) {
        result.error = err && err.message ? err.message : String(err);
      }
      const json = JSON.stringify(result);
      window.__PLAYBET_OFFICIAL_SMARTICO__ = result;
      document.documentElement.setAttribute('data-playbet-official-smartico', encodeURIComponent(json));
      const pre = document.createElement('pre');
      pre.id = 'playbet-official-smartico';
      pre.textContent = json;
      pre.style.cssText = 'white-space:pre-wrap;font-size:12px;position:relative;z-index:999999;background:#fff;color:#000;padding:16px;';
      document.body.prepend(pre);
    })();
  `;
}

function extractOfficialSmarticoFromDoc(...docs: any[]) {
  const text = docs.map((doc) => [doc?.markdown, doc?.html].filter(Boolean).join("\n")).join("\n");
  const marker = '{"label_id":"460395"';
  const start = text.indexOf(marker);
  if (start < 0) return null;
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (escaped) { escaped = false; continue; }
    if (ch === "\\") { escaped = true; continue; }
    if (ch === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (ch === "{") depth++;
    if (ch === "}") depth--;
    if (depth === 0) {
      try { return JSON.parse(text.slice(start, i + 1)); } catch { return null; }
    }
  }
  return null;
}

function buildBrandSwitchJs(brand: Brand) {
  const targetPatterns = brand.slug === "vupi"
    ? ["vupi"]
    : ["estrela bet", "estrelabet"];
  const oppositePatterns = brand.slug === "vupi"
    ? ["estrela bet", "estrelabet"]
    : ["vupi"];
  return `
    (function(){
      const targetPatterns = ${JSON.stringify(targetPatterns)};
      const oppositePatterns = ${JSON.stringify(oppositePatterns)};
      const norm = (s) => (s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
      const clickLikeUser = (el) => {
        if (!el) return false;
        el = el.closest('button,[role="button"],a,li,[aria-haspopup="true"],[data-radix-collection-item]') || el;
        el.scrollIntoView({block:'center', inline:'center'});
        el.dispatchEvent(new MouseEvent('pointerdown', {bubbles:true}));
        el.dispatchEvent(new MouseEvent('mousedown', {bubbles:true}));
        el.dispatchEvent(new MouseEvent('mouseup', {bubbles:true}));
        el.click();
        return true;
      };
      const allNodes = () => Array.from(document.querySelectorAll('button,[role="button"],a,li,div,span,[aria-haspopup="true"],[data-radix-collection-item]'));
      const findPattern = (patterns) => allNodes()
        .filter((el) => {
          const txt = norm(el.textContent || '');
          return txt && txt.length <= 60 && patterns.some((p) => txt === norm(p) || txt.includes(norm(p)));
        })
        .sort((a,b) => {
          const at = norm(a.textContent || '');
          const bt = norm(b.textContent || '');
          const ae = patterns.some((p) => at === norm(p)) ? 0 : 1;
          const be = patterns.some((p) => bt === norm(p)) ? 0 : 1;
          return ae - be || (a.textContent || '').length - (b.textContent || '').length;
        })[0];

      // Se a sessão ficou presa na outra marca, abre o seletor clicando no
      // rótulo atual (ex: "Vupi") e só então escolhe a marca correta.
      const brandToggle = findPattern(oppositePatterns) || findPattern(targetPatterns) || findPattern(['marca', 'brand', 'label', 'conta']);
      clickLikeUser(brandToggle);
      setTimeout(() => {
        if (clickLikeUser(findPattern(targetPatterns))) {
          setTimeout(() => window.location.reload(), 1800);
        }
      }, 1200);
    })();
  `;
}

function buildAccountSwitchJs(brand: Brand) {
  if (!brand.accountId) return "";
  return `
    (function(){
      const target = ${JSON.stringify(brand.accountId)};
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
      const findText = (needle) => Array.from(document.querySelectorAll('button,[role="button"],a,li,div,span'))
        .filter((el) => norm(el.textContent).includes(norm(needle)))
        .sort((a,b) => (a.textContent || '').length - (b.textContent || '').length)[0];

      if (clickLikeUser(findText(target))) return;

      const opener = Array.from(document.querySelectorAll('button,[role="button"],a,li,div,span'))
        .filter((el) => /conta|account|label|id|afiliad|playbet|vupi|estrela/i.test(el.textContent || ''))
        .sort((a,b) => (a.textContent || '').length - (b.textContent || '').length)[0];
      clickLikeUser(opener);
      setTimeout(() => clickLikeUser(findText(target)), 1200);
    })();
  `;
}

function formatDateParts(date = new Date()) {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return { iso: `${y}-${m}-${d}`, br: `${d}/${m}/${y}` };
}

function buildPerformanceDateFilterJs(targetPath: string) {
  if (!/reports\/performance/i.test(targetPath)) return "";
  const end = new Date();
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - 29);
  const from = formatDateParts(start);
  const to = formatDateParts(end);
  return `
    (function(){
      const from = ${JSON.stringify(from)};
      const to = ${JSON.stringify(to)};
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
      const findText = (re) => Array.from(document.querySelectorAll('button,[role="button"],a,li,div,span,option'))
        .filter((el) => re.test(norm(el.textContent || '')))
        .sort((a,b) => (a.textContent || '').length - (b.textContent || '').length)[0];

      // 1) Preferência: abrir o seletor de período e clicar em "Últimos 30 dias".
      const periodOpener = findText(/(periodo|per.odo|data|date|range|filtro)/);
      if (periodOpener) clickLikeUser(periodOpener);
      setTimeout(() => {
        const preset30 = findText(/(ultimos?\s*30|last\s*30|30\s*dias?|30\s*days)/);
        if (preset30) clickLikeUser(preset30);
      }, 800);

      // 2) Fallback: digitar as datas nos dois primeiros inputs de data.
      setTimeout(() => {
        const setVal = (el, value) => {
          if (!el) return false;
          const proto = el instanceof HTMLInputElement ? window.HTMLInputElement.prototype : window.HTMLTextAreaElement.prototype;
          const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
          if (setter) setter.call(el, value); else el.value = value;
          el.dispatchEvent(new Event('input', {bubbles:true}));
          el.dispatchEvent(new Event('change', {bubbles:true}));
          el.dispatchEvent(new Event('blur', {bubbles:true}));
          return true;
        };
        const inputs = Array.from(document.querySelectorAll('input'))
          .filter((el) => !/password|email|search|checkbox|radio/i.test(el.type || ''))
          .sort((a,b) => a.getBoundingClientRect().top - b.getBoundingClientRect().top || a.getBoundingClientRect().left - b.getBoundingClientRect().left);
        if (inputs[0]) setVal(inputs[0], inputs[0].type === 'date' ? from.iso : from.br);
        if (inputs[1]) setVal(inputs[1], inputs[1].type === 'date' ? to.iso : to.br);
        const applyBtn = Array.from(document.querySelectorAll('button,[role="button"]'))
          .filter((el) => /(buscar|filtrar|aplicar|gerar|pesquisar|consultar|apply|search)/i.test(el.textContent || ''))
          .sort((a,b) => (a.textContent || '').length - (b.textContent || '').length)[0];
        if (!clickLikeUser(applyBtn) && inputs[1]) {
          inputs[1].dispatchEvent(new KeyboardEvent('keydown', {key:'Enter', bubbles:true}));
          inputs[1].dispatchEvent(new KeyboardEvent('keyup', {key:'Enter', bubbles:true}));
        }
      }, 1800);
    })();
  `;
}

function buildRevealBalanceJs(targetPath: string) {
  if (!/\/home|\/withdraw|\/extract/i.test(targetPath)) return "";
  return `
    (function(){
      const norm = (s) => (s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
      const clicked = new WeakSet();
      const clickLikeUser = (el) => {
        if (!el) return false;
        if (clicked.has(el)) return false;
        clicked.add(el);
        try { el.scrollIntoView({block:'center', inline:'center'}); } catch (_) {}
        el.dispatchEvent(new MouseEvent('pointerdown', {bubbles:true}));
        el.dispatchEvent(new MouseEvent('mousedown', {bubbles:true}));
        el.dispatchEvent(new MouseEvent('mouseup', {bubbles:true}));
        el.click();
        return true;
      };
      const explicit = Array.from(document.querySelectorAll('button,[role="button"],a'))
        .filter((el) => {
          const txt = norm([el.textContent, el.getAttribute('aria-label'), el.getAttribute('title'), el.getAttribute('data-testid')].filter(Boolean).join(' '));
          return /(mostrar|exibir|visualizar|revelar|eye|olho|visibility)/.test(txt) && /(saldo|balance|saque|retirada|mostrar|exibir|visualizar|revelar)/.test(txt);
        })
        .sort((a,b) => (a.textContent || '').length - (b.textContent || '').length);
      const explicitTargets = new Set(explicit.map((el) => el.closest('button,[role="button"],a') || el));
      for (const el of explicitTargets) clickLikeUser(el);

      const maskedBlocks = Array.from(document.querySelectorAll('div,section,article,main'))
        .filter((el) => /[•●*]{3,}/.test(el.textContent || '') && /saldo|balance|saque/i.test(el.textContent || ''))
        .sort((a,b) => (a.textContent || '').length - (b.textContent || '').length)
        .slice(0, 4);
      for (const block of maskedBlocks) {
        const controls = Array.from(block.querySelectorAll('button,[role="button"],svg,i,span'))
          .filter((el) => {
            const txt = norm([el.textContent, el.getAttribute('aria-label'), el.getAttribute('title'), el.getAttribute('data-testid'), el.className].filter(Boolean).join(' '));
            return txt === '' || /(mostrar|exibir|visualizar|eye|olho|visibility|saldo|balance)/.test(txt);
          })
          .map((el) => el.closest('button,[role="button"],a') || el.parentElement || el)
          .filter((el) => !explicitTargets.has(el))
          .slice(0, 8);
        for (const el of controls) clickLikeUser(el);
      }
    })();
  `;
}

function buildPanelTargetUrl(brand: Brand, targetPath: string) {
  const base = new URL(brand.loginUrl ?? "");
  const cleanPath = targetPath.startsWith("/") ? targetPath : `/${targetPath}`;

  if (brand.slug === "estrelabet" && /admin\.aff\.estrelabetpartners\.com/i.test(base.hostname)) {
    base.pathname = `/${brand.accountId ?? "460395"}`;
    base.search = "";
    base.hash = `#${cleanPath}`;
    return base.toString();
  }

  if ((brand.loginUrl ?? "").includes("#")) {
    base.hash = `#${cleanPath}`;
    return base.toString();
  }

  return new URL(cleanPath, base.origin).toString();
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
  const accountJs = buildAccountSwitchJs(brand);
  const perfFilterJs = buildPerformanceDateFilterJs(targetPath);
  const revealBalanceJs = buildRevealBalanceJs(targetPath);
  const officialSmarticoJs = buildOfficialSmarticoCaptureJs(brand);
  const targetUrl = buildPanelTargetUrl(brand, targetPath);
  const navJs = `
    (function(){
      const url = new URL(${JSON.stringify(targetUrl)});
      if (/reports\\/performance/i.test(url.pathname + url.hash)) {
        const end = new Date();
        const start = new Date(end);
        start.setUTCDate(start.getUTCDate() - 29);
        if (url.hash && url.hash.includes('/reports/performance')) {
          const [hashPath, hashQuery = ''] = url.hash.slice(1).split('?');
          const params = new URLSearchParams(hashQuery);
          params.set('date_start', start.toISOString().slice(0,10));
          params.set('date_end', end.toISOString().slice(0,10));
          url.hash = '#' + hashPath + '?' + params.toString();
        } else {
          url.searchParams.set('date_start', start.toISOString().slice(0,10));
          url.searchParams.set('date_end', end.toISOString().slice(0,10));
        }
      }
      window.location.assign(url.href);
    })();
  `;
  const resetSessionJs = brand.slug === "estrelabet" ? `
    (function(){
      try { localStorage.clear(); } catch (_) {}
      try { sessionStorage.clear(); } catch (_) {}
      try { window.location.assign(${JSON.stringify(brand.loginUrl)}); } catch (_) {}
    })();
  ` : "";

  const actions: any[] = [
    ...(resetSessionJs ? [{ type: "executeJavascript", script: resetSessionJs }, { type: "wait", milliseconds: 5000 }] : []),
    { type: "wait", milliseconds: 3000 },
    { type: "executeJavascript", script: loginJs },
    { type: "wait", milliseconds: 10000 },
    ...(switchJs ? [{ type: "executeJavascript", script: switchJs }, { type: "wait", milliseconds: 5000 }] : []),
    ...(accountJs ? [{ type: "executeJavascript", script: accountJs }, { type: "wait", milliseconds: 2000 }] : []),
    { type: "executeJavascript", script: navJs },
    { type: "wait", milliseconds: 12000 },
    ...(officialSmarticoJs ? [{ type: "executeJavascript", script: officialSmarticoJs }, { type: "wait", milliseconds: 7000 }] : []),
    ...(revealBalanceJs ? [{ type: "executeJavascript", script: revealBalanceJs }, { type: "wait", milliseconds: 3000 }] : []),
    ...(perfFilterJs ? [{ type: "executeJavascript", script: perfFilterJs }, { type: "wait", milliseconds: 8000 }] : []),
  ];

  const body = {
    url: brand.loginUrl,
    formats,
    onlyMainContent: false,
    waitFor: 6000,
    actions,
    timeout: 180000,
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


// Extrai extracted+accounts+gate SEM escrever no banco. O write é feito só
// depois de comparar as duas marcas — evita gravar dados da Estrelabet
// dentro do VUPI quando o brand switch silenciosamente falha (nesse caso
// o painel mostra os mesmos números para ambas as marcas).
async function prepareBrand(supabase: any, brand: Brand, homeFc: any, perfFc: any) {
  const homeDoc = homeFc?.data ?? homeFc;
  const perfDoc = perfFc?.data ?? perfFc;
  const homeMd = homeDoc?.markdown ?? null;
  const perfMd = perfDoc?.markdown ?? null;
  const loadingOnly = isLoadingOnlyCapture(homeMd, perfMd, homeDoc?.html, perfDoc?.html);

  const key = brandLookupKey(brand.slug);
  const { data: platforms } = await supabase
    .from("platforms")
    .select("id, slug, name, smartico_brand_id")
    .or(`slug.ilike.%${key}%,name.ilike.%${key}%`);

  const officialCapture = extractOfficialSmarticoFromDoc(homeDoc, perfDoc);
  const capturedRows = Array.isArray(officialCapture?.performance?.data)
    ? officialCapture.performance.data
    : Array.isArray(officialCapture?.performance)
      ? officialCapture.performance
      : [];
  const capturedBalance = officialCapture?.balance?.data ?? officialCapture?.balance ?? null;
  const officialPerf = capturedRows.length
    ? {
      rows: capturedRows,
      parsed: parseOfficialMediaReport(capturedRows),
      meta: { date_from: officialCapture?.date_from, date_to: officialCapture?.date_to, label_id: officialCapture?.label_id, brand_id: officialCapture?.brand_id, source: "smartico_panel_session_af2_media_report_af" },
    }
    : await fetchOfficialPerformanceReport(brand, platforms ?? []);
  const officialBalance = capturedBalance
    ? {
      saldo_disponivel: firstNumber(capturedBalance?.balance),
      saldo_pendente: firstNumber(capturedBalance?.not_processed_payment_amount),
      row: capturedBalance,
      meta: { label_id: officialCapture?.label_id, source: "smartico_panel_session_af2_balance_af" },
    }
    : await fetchOfficialBalance(brand).catch(() => null);
  const perfJson = perfDoc?.json ?? perfDoc?.extract ?? {};
  const perf = officialPerf?.parsed ?? { ...perfJson, ...parsePerformanceTotalFromMarkdown(perfMd) };

  const homeUrl = String(homeDoc?.metadata?.url ?? homeDoc?.metadata?.sourceURL ?? "");
  const perfUrl = String(perfDoc?.metadata?.url ?? perfDoc?.metadata?.sourceURL ?? "");
  const bothMd = `${homeMd ?? ""}\n${perfMd ?? ""}`;
  const visibleTextMd = bothMd
    .replace(/!\[[^\]]*\]\([^)]+\)/g, " ")
    .replace(/\[([^\]]*)\]\([^)]+\)/g, "$1")
    .replace(/https?:\/\/\S+/gi, " ");
  const vupiHint = /vupi/i.test(visibleTextMd) || /vupi/i.test(homeUrl) || /vupi/i.test(perfUrl);
  const visibleVupiHint = /vupi/i.test(visibleTextMd);
  const visibleEstrelaHint = /estrela\s*bet|estrelabet/i.test(visibleTextMd);
  const captureText = `${bothMd}\n${homeUrl}\n${perfUrl}`;
  const accountHint = brand.accountId
    ? captureText.includes(String(brand.accountId).trim())
    : true;

  const homeJson = homeDoc?.json ?? homeDoc?.extract ?? {};
  const saldoRegex = parseSaldoFromMarkdown(homeMd);
  const homeJsonSaldo = firstNumber(homeJson?.saldo_disponivel);
  const maskedZero = saldoRegex.masked && homeJsonSaldo === 0 && saldoRegex.saldo_disponivel == null;
  const saldo = {
    saldo_disponivel: firstNumber(officialBalance?.saldo_disponivel, saldoRegex.saldo_disponivel, maskedZero ? null : homeJsonSaldo),
    saldo_pendente: firstNumber(officialBalance?.saldo_pendente, saldoRegex.saldo_pendente, homeJson?.saldo_pendente),
    masked: saldoRegex.masked,
  };
  const extracted = compactExtraction(perf, saldo);

  const platformIds = (platforms ?? []).map((p: any) => p.id);
  const accounts: any[] = [];
  if (platformIds.length) {
    const { data } = await supabase
      .from("platform_accounts")
      .select("id, platform_id, account_external_id")
      .in("platform_id", platformIds)
      .eq("is_active", true)
      .eq("is_demo", false);
    const fetched = data ?? [];
    const preferred = brand.accountId
      ? fetched.filter((acc: any) => String(acc.account_external_id ?? "").trim() === brand.accountId)
      : [];
    accounts.push(...(preferred.length ? preferred : fetched));
  }

  return { brand, extracted, saldo, accounts, homeMd, perfMd, vupiHint, visibleVupiHint, visibleEstrelaHint, accountHint, loadingOnly, officialPerf, officialBalance, officialCapture };
}

function metricsFingerprint(e: any) {
  return [
    Math.round(numberOrZero(e?.cliques)),
    Math.round(numberOrZero(e?.cadastros)),
    Math.round(numberOrZero(e?.ftds)),
    Math.round(numberOrZero(e?.depositos_qtd)),
    Math.round(numberOrZero(e?.depositos_valor) * 100),
    Math.round(numberOrZero(e?.comissao_cpa) * 100),
    Math.round(numberOrZero(e?.comissao_revshare) * 100),
  ].join(":");
}

function looksLikeDuplicateOf(a: any, b: any) {
  if (!a || !b) return false;
  // Se ambos vieram totalmente zerados, não é duplicação — é ausência de dado.
  const nonZero = numberOrZero(a.cliques) > 0
    || numberOrZero(a.cadastros) > 0
    || numberOrZero(a.ftds) > 0
    || numberOrZero(a.depositos_qtd) > 0
    || numberOrZero(a.depositos_valor) > 0;
  if (!nonZero) return false;
  return metricsFingerprint(a) === metricsFingerprint(b);
}

function isLoadingOnlyCapture(...parts: Array<string | null | undefined>) {
  const text = parts.filter(Boolean).join("\n");
  if (!text) return false;
  const normalized = text.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().toLowerCase();
  if (!/loading\.\.\./i.test(normalized)) return false;
  return !/(cliques|cadastros|registros|ftd|dep[óo]sitos|saldo|saque|total\s*30|comiss[aã]o|r\$)/i.test(normalized);
}

async function writeBrand(supabase: any, prep: Awaited<ReturnType<typeof prepareBrand>>, opts: { skipMetrics?: string; skipBalance?: string } = {}) {
  const { brand, extracted, saldo, accounts, homeMd, perfMd } = prep;
  let updatedAccounts = 0;

  if (prep.loadingOnly && !prep.officialPerf) {
    return {
      extracted,
      saldo_source: "panel_loading",
      updatedAccounts: 0,
      updatedMetrics: 0,
      skippedMetrics: accounts.length,
      skipped: "panel_loading",
      skippedBalance: "panel_loading",
      has_home_md: !!homeMd,
      has_perf_md: !!perfMd,
    };
  }

  if (!opts.skipBalance && saldo.saldo_disponivel != null) {
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
  let skippedMetrics = 0;
  const today = new Date().toISOString().slice(0, 10);

  if (opts.skipMetrics) {
    return {
      extracted,
      saldo_source: saldo.saldo_disponivel != null ? "home_widget" : (saldo.masked ? "masked_or_hidden" : "missing"),
      updatedAccounts,
      updatedMetrics: 0,
      skippedMetrics: accounts.length,
      skipped: opts.skipMetrics,
      skippedBalance: opts.skipBalance ?? undefined,
      has_home_md: !!homeMd,
      has_perf_md: !!perfMd,
    };
  }

  for (const acc of accounts) {
    const cpa = extracted.comissao_cpa ?? 0;
    const rev = extracted.comissao_revshare ?? 0;
    const total = cpa + rev;
    const externalRef = `${brand.slug}:panel_scrape_html:current_period:${acc.id}`;
    const { data: existingMetric } = await supabase
      .from("tracking_metrics")
      .select("cliques,registros,ftd,deposits_count,depositos_total,updated_at")
      .eq("external_ref", externalRef)
      .maybeSingle();

    if (isEmptyExtraction(extracted) && existingHasData(existingMetric)) {
      skippedMetrics++;
      continue;
    }

    if (isPartialDowngrade(existingMetric, extracted)) {
      skippedMetrics++;
      continue;
    }

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
      external_ref: externalRef,
    }, { onConflict: "external_ref" });
    if (!error) updatedMetrics++;
  }

  return {
    extracted,
    saldo_source: saldo.saldo_disponivel != null ? "home_widget" : (saldo.masked ? "masked_or_hidden" : "missing"),
    updatedAccounts,
    updatedMetrics,
    skippedMetrics,
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

  if (payload?.force !== true) {
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

  const resolvedTargets = await Promise.all(targets.map((brand) => resolveBrandForCapture(supabase, brand)));
  const captureTargetsForRun = wantBrand === "all"
    ? await pickNextBrandForAll(supabase, resolvedTargets)
    : resolvedTargets;

  const { data: run } = await supabase.from("panel_scraper_runs").insert({
    scraper_key: "affiliate_panel_html",
    status: "running",
    discovery: {
      requested_brands: targets.map((t) => t.slug),
      brands: captureTargetsForRun.map((t) => t.slug),
      account_ids: Object.fromEntries(captureTargetsForRun.map((t) => [t.slug, t.accountId ?? null])),
      started_from: source,
      extract: wantExtract,
      mode: wantBrand === "all" ? "single_brand_rotation" : "single_brand",
    },
  }).select("id").maybeSingle();
  const runId = run?.id;

  // Each invocation captures ONE brand only (rotation when brand="all").
  // Run in background so the HTTP request is not killed by the gateway while
  // Firecrawl finishes browser actions.
  const task = (async () => {
    const results: Record<string, any> = {};
    const rawDump: Record<string, any> = {};
    const preps: Record<string, any> = {};

    const captureTargets = captureTargetsForRun;

    // Fase 1 — extração serial por marca. O painel mantém a marca/label ativa
    // na sessão; rodar Estrela e VUPI em paralelo fazia uma captura trocar a
    // marca da outra e gravar 397052 dentro de 397057 (ou o inverso).
    for (const brand of captureTargets) {
      try {
        const officialFc = brand.slug === "estrelabet"
          ? await firecrawlLoginAndCapture(brand, "/", null, "")
          : null;
        const perfFc = officialFc ?? await firecrawlLoginAndCapture(brand, "/reports/performance", null, "");
        const homeFc = officialFc ?? await firecrawlLoginAndCapture(
            brand,
            "/withdraw",
            HOME_SCHEMA,
            "Extraia somente o saldo disponível real para saque e o saldo pendente visíveis no painel. Ignore valores de performance, depósitos, GGR, NGR e totais de relatório.",
          );
        const prep = await prepareBrand(supabase, brand, homeFc, perfFc);
        preps[brand.slug] = prep;
        if (debug) {
          const hd = homeFc?.data ?? homeFc;
          const pd = perfFc?.data ?? perfFc;
          rawDump[brand.slug] = {
            home: { metadata: hd?.metadata ?? null, markdown_head: (hd?.markdown ?? "").slice(0, 8000), html_head: (hd?.html ?? "").slice(0, 60000), json: hd?.json ?? hd?.extract ?? null, official: prep.officialBalance ?? null },
            perf: { metadata: pd?.metadata ?? null, markdown_head: (pd?.markdown ?? "").slice(0, 5000), official: prep.officialPerf ?? null },
          };
        }
      } catch (err: any) {
        results[brand.slug] = { ok: false, error: err?.message ?? String(err) };
        rawDump[brand.slug] = { error: err?.message ?? String(err) };
      }
    }

    // Fase 2 — cruza VUPI x Estrelabet. Se a extração da VUPI vier idêntica
    // à Estrelabet (brand switch falhou silenciosamente e ambos vistos como
    // o mesmo painel), NÃO grava métricas na VUPI — só o saldo (que vem do
    // widget do painel VUPI, quando presente).
    const estrelaPrep = preps["estrelabet"];
    const vupiPrep = preps["vupi"];
    const vupiIsDupOfEstrela = !!estrelaPrep && !!vupiPrep
      && looksLikeDuplicateOf(vupiPrep.extracted, estrelaPrep.extracted);
    const vupiBrandNotVisible = !!vupiPrep && !vupiPrep.vupiHint;

    for (const brand of captureTargets) {
      const prep = preps[brand.slug];
      if (!prep) continue;
      try {
        let skipMetrics: string | undefined;
        if (brand.slug === "vupi") {
          if (!prep.accountHint) skipMetrics = "vupi_account_397057_not_visible";
          else if (prep.visibleEstrelaHint && !prep.visibleVupiHint) skipMetrics = "wrong_visible_brand_estrelabet";
          else if (captureTargets.length > 1 && vupiBrandNotVisible) skipMetrics = "brand_not_visible";
          else if (captureTargets.length > 1 && vupiIsDupOfEstrela) skipMetrics = "duplicate_of_estrelabet";
        }
        // Estrelabet às vezes mantém o rótulo visual "Vupi" mesmo após login
        // limpo, mas os totais da Estrela vêm corretos. A gravação dela fica
        // protegida pelo anti-downgrade acima; bloquear só pelo texto visível
        // travava a reconvergência para o valor real.
        const skipBalance = skipMetrics ? skipMetrics : undefined;
        const persisted = await writeBrand(supabase, prep, { skipMetrics, skipBalance });
        results[brand.slug] = { ok: true, account_id_visible: prep.accountHint, ...persisted };
      } catch (err: any) {
        results[brand.slug] = { ok: false, error: err?.message ?? String(err) };
      }
    }
    if (runId) {
      await supabase.from("panel_scraper_runs").update({
        status: Object.values(results).every((r: any) => r.ok) ? "success" : "partial",
        finished_at: new Date().toISOString(),
        rows_imported: Object.values(results).reduce((n: number, r: any) => n + (r?.updatedAccounts ?? 0), 0),
        message: JSON.stringify(Object.fromEntries(Object.entries(results).map(([k, v]: any) => [k, v.ok ? `ok (saldo=${v.extracted?.saldo_disponivel ?? "n/a"} src=${v.saldo_source ?? "?"})` : v.error]))),
        discovery: {
          requested_brands: targets.map((t) => t.slug),
          brands: captureTargets.map((t) => t.slug),
          account_ids: Object.fromEntries(captureTargets.map((t) => [t.slug, t.accountId ?? null])),
          mode: wantBrand === "all" ? "single_brand_rotation" : "single_brand",
          results,
          raw: debug ? rawDump : undefined,
        },
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
    JSON.stringify({ ok: true, run_id: runId, status: "processing", brands: captureTargetsForRun.map((t) => t.slug) }, null, 2),
    { status: 202, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
