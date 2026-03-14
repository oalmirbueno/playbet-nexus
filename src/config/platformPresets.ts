/**
 * Platform presets — robust, production-ready configuration per platform.
 *
 * Architecture:
 * 1. Each platform declares its NATIVE macros organized by category
 * 2. Internal field mappings translate native macros to internal meaning
 * 3. URL generation uses ONLY native macros — never invented tokens
 * 4. Simple vs Advanced mode controls which macros appear in generated URLs
 * 5. Validation ensures URLs contain only supported macros
 */

// ─── Types ──────────────────────────────────────────────────────────────

export type MacroCategory = "tracking" | "financial" | "origin";

/** A macro the platform natively supports */
export interface PlatformMacro {
  native: string;
  internal_meaning: string;
  required: boolean;
  description: string;
  /** Category for organizing display and simple/advanced mode */
  category: MacroCategory;
}

/** Event preset with per-event field configuration */
export interface PlatformEventPreset {
  raw_event_name: string;
  canonical_event_name: string;
  label: string;
  /** Which native macros are relevant for this event (beyond the always-included ones) */
  extra_macros: string[];
  has_amount: boolean;
  has_transaction_id: boolean;
  /** Advanced-only macros for this event (debug/reconciliation) */
  advanced_macros: string[];
}

export interface PlatformPreset {
  slug: string;
  label: string;
  click_id_param: string;
  click_id_macro: string;
  postback_base_path: string;
  supported_macros: PlatformMacro[];
  events: PlatformEventPreset[];
  macro_to_internal: Record<string, string>;
}

// ─── 1win Preset ────────────────────────────────────────────────────────

const WIN_MACROS: PlatformMacro[] = [
  // ── A. Tracking macros ──
  { native: "sub1",  internal_meaning: "click_id",               required: true,  description: "ID do clique (obrigatório)", category: "tracking" },
  { native: "sub2",  internal_meaning: "influencer_id",          required: false, description: "ID do influenciador",        category: "tracking" },
  { native: "sub3",  internal_meaning: "campanha_id",            required: false, description: "ID da campanha",             category: "tracking" },
  { native: "sub4",  internal_meaning: "conteudo_id",            required: false, description: "ID do conteúdo",             category: "tracking" },
  { native: "sub5",  internal_meaning: "landing_page_instance_id", required: false, description: "ID da instância da LP",   category: "tracking" },
  { native: "sub6",  internal_meaning: "tracking_code",          required: false, description: "Código de tracking interno", category: "tracking" },
  { native: "sub7",  internal_meaning: "utm_source",             required: false, description: "UTM Source",                 category: "tracking" },
  { native: "sub8",  internal_meaning: "utm_medium",             required: false, description: "UTM Medium",                 category: "tracking" },
  { native: "sub9",  internal_meaning: "utm_campaign",           required: false, description: "UTM Campaign",               category: "tracking" },
  { native: "sub10", internal_meaning: "reserved",               required: false, description: "Reservado",                  category: "tracking" },
  // ── B. Financial / event macros ──
  { native: "amount",         internal_meaning: "amount",         required: false, description: "Valor monetário",            category: "financial" },
  { native: "transaction_id", internal_meaning: "transaction_id", required: false, description: "ID da transação",            category: "financial" },
  { native: "country",        internal_meaning: "country",        required: false, description: "País do jogador",            category: "financial" },
  { native: "user_id",        internal_meaning: "user_id",        required: false, description: "ID do jogador na plataforma", category: "financial" },
  { native: "event_id",       internal_meaning: "platform_event_id", required: false, description: "ID do evento na plataforma", category: "financial" },
  { native: "date",           internal_meaning: "event_unix_ts",  required: false, description: "Timestamp do evento (Unix)", category: "financial" },
  // ── C. Origin / link macros (native to 1win) ──
  { native: "hash_id",    internal_meaning: "hash_id",    required: false, description: "ID do hash/link na plataforma",   category: "origin" },
  { native: "hash_name",  internal_meaning: "hash_name",  required: false, description: "Nome do hash/link na plataforma", category: "origin" },
  { native: "source_id",  internal_meaning: "source_id",  required: false, description: "ID da fonte de tráfego",          category: "origin" },
  { native: "source_name", internal_meaning: "source_name", required: false, description: "Nome da fonte de tráfego",      category: "origin" },
];

const WIN_EVENTS: PlatformEventPreset[] = [
  {
    raw_event_name: "registration",
    canonical_event_name: "registration",
    label: "Cadastro",
    extra_macros: ["user_id", "country"],
    has_amount: false,
    has_transaction_id: false,
    advanced_macros: ["event_id", "date", "hash_id", "hash_name", "source_id", "source_name"],
  },
  {
    raw_event_name: "revenue",
    canonical_event_name: "revenue",
    label: "Receita",
    extra_macros: ["amount", "transaction_id", "user_id", "country"],
    has_amount: true,
    has_transaction_id: true,
    advanced_macros: ["event_id", "date", "hash_id", "hash_name", "source_id", "source_name"],
  },
  {
    raw_event_name: "deposit",
    canonical_event_name: "deposit",
    label: "Todos os depósitos",
    extra_macros: ["amount", "transaction_id", "user_id", "country"],
    has_amount: true,
    has_transaction_id: true,
    advanced_macros: ["event_id", "date", "hash_id", "hash_name", "source_id", "source_name"],
  },
  {
    raw_event_name: "first_deposit",
    canonical_event_name: "ftd",
    label: "Primeiro depósito",
    extra_macros: ["amount", "transaction_id", "user_id", "country"],
    has_amount: true,
    has_transaction_id: true,
    advanced_macros: ["event_id", "date", "hash_id", "hash_name", "source_id", "source_name"],
  },
  {
    raw_event_name: "redeposit",
    canonical_event_name: "redeposit",
    label: "Depósito recorrente",
    extra_macros: ["amount", "transaction_id", "user_id", "country"],
    has_amount: true,
    has_transaction_id: true,
    advanced_macros: ["event_id", "date", "hash_id", "hash_name", "source_id", "source_name"],
  },
  {
    raw_event_name: "app_install",
    canonical_event_name: "app_install",
    label: "Inicialização do aplicativo",
    extra_macros: ["user_id", "country"],
    has_amount: false,
    has_transaction_id: false,
    advanced_macros: ["event_id", "date", "hash_id", "hash_name", "source_id", "source_name"],
  },
];

export const PLATFORM_PRESETS: Record<string, PlatformPreset> = {
  "1win": {
    slug: "1win",
    label: "1win",
    click_id_param: "sub1",
    click_id_macro: "{sub1}",
    postback_base_path: "1win",
    supported_macros: WIN_MACROS,
    events: WIN_EVENTS,
    macro_to_internal: Object.fromEntries(WIN_MACROS.map(m => [m.native, m.internal_meaning])),
  },
};

// ─── Canonical event labels (fallback for display) ──────────────────────

export const EVENT_LABELS: Record<string, string> = {
  registration: "Cadastro",
  ftd: "Primeiro Depósito (FTD)",
  deposit: "Todos os depósitos",
  redeposit: "Depósito recorrente",
  revenue: "Receita",
  click: "Clique",
  withdrawable_revenue: "Revenue Sacável",
  app_install: "Inicialização do aplicativo",
  qualified_player: "Jogador Qualificado",
};

export const MACRO_CATEGORY_LABELS: Record<MacroCategory, string> = {
  tracking: "Tracking (SubIDs)",
  financial: "Financeiros / Evento",
  origin: "Origem / Link nativo",
};

// ─── Helpers ────────────────────────────────────────────────────────────

export function findPresetByName(name: string): PlatformPreset | null {
  const key = name.toLowerCase().trim();
  return PLATFORM_PRESETS[key] || Object.values(PLATFORM_PRESETS).find(p => key.includes(p.slug)) || null;
}

export function generateTrackingCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  let code = "TRK-";
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

const POSTBACK_BASE = `https://rcrrbznhatdqcmfyzgbt.supabase.co/functions/v1/tracking-postback`;

/**
 * Build a clean, production-ready postback URL for a specific event.
 *
 * @param advancedMode - if true, includes debug/reconciliation macros (event_id, date, hash_id, etc.)
 */
export function buildPostbackUrlForEvent(
  preset: PlatformPreset,
  event: PlatformEventPreset,
  trackingCode?: string,
  influencerId?: string,
  campanhaId?: string,
  advancedMode = false,
): string {
  const parts: string[] = [];

  // Always: event name (literal value, not a macro)
  parts.push(`event=${event.raw_event_name}`);

  // sub1 = click_id — always present, uses platform native macro
  parts.push(`sub1={sub1}`);

  // sub2 = influencer — only if real value
  if (influencerId && influencerId !== "none") {
    parts.push(`sub2=${influencerId}`);
  }

  // sub3 = campanha — only if real value
  if (campanhaId && campanhaId !== "none") {
    parts.push(`sub3=${campanhaId}`);
  }

  // sub6 = tracking_code — only if resolved
  if (trackingCode && !trackingCode.includes("(") && trackingCode !== "none") {
    parts.push(`sub6=${trackingCode}`);
  }

  // Event-specific native macros
  if (event.has_amount) {
    parts.push(`amount={amount}`);
  }
  if (event.has_transaction_id) {
    parts.push(`transaction_id={transaction_id}`);
  }

  // Always include user_id and country if event supports them
  if (event.extra_macros.includes("user_id")) {
    parts.push(`user_id={user_id}`);
  }
  if (event.extra_macros.includes("country")) {
    parts.push(`country={country}`);
  }

  // Advanced mode: add debug/reconciliation macros
  if (advancedMode && event.advanced_macros.length > 0) {
    for (const macro of event.advanced_macros) {
      parts.push(`${macro}={${macro}}`);
    }
  }

  return `${POSTBACK_BASE}/${preset.postback_base_path}?${parts.join("&")}`;
}

// ─── Validation ─────────────────────────────────────────────────────────

export interface PresetValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export function validatePostbackUrl(
  preset: PlatformPreset,
  url: string,
  trackingCode?: string,
): PresetValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const supportedMacroNames = new Set(preset.supported_macros.map(m => m.native));

  const macroMatches = url.match(/\{([^}]+)\}/g) || [];
  for (const match of macroMatches) {
    const macroName = match.slice(1, -1);
    if (!supportedMacroNames.has(macroName)) {
      errors.push(`Macro {${macroName}} não é suportado pela ${preset.label}`);
    }
  }

  if (url.includes("none")) {
    errors.push("URL contém 'none' — parâmetro deveria ser omitido");
  }
  if (url.includes("(")) {
    errors.push("URL contém placeholder provisório");
  }
  if (url.includes("%7B") || url.includes("%7D")) {
    errors.push("URL contém macros URL-encoded — deveria ser legível");
  }

  if (!trackingCode || trackingCode.includes("(")) {
    warnings.push("Tracking code ainda não resolvido");
  }

  return { valid: errors.length === 0, errors, warnings };
}

/** Extract platform-native metadata fields from a raw_payload for display */
export const PLATFORM_METADATA_FIELDS = [
  { key: "event_id", label: "Event ID (plataforma)" },
  { key: "date", label: "Timestamp (plataforma)" },
  { key: "hash_id", label: "Hash ID" },
  { key: "hash_name", label: "Hash Name" },
  { key: "source_id", label: "Source ID" },
  { key: "source_name", label: "Source Name" },
] as const;
