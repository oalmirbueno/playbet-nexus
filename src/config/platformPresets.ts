/**
 * Platform presets — robust, production-ready configuration per platform.
 *
 * Architecture:
 * 1. Each platform declares its NATIVE macros (e.g. {sub1}, {amount})
 * 2. Internal field mappings translate native macros to internal meaning
 * 3. URL generation uses ONLY native macros — never invented tokens
 * 4. Validation ensures URLs contain only supported macros
 */

// ─── Types ──────────────────────────────────────────────────────────────

/** A macro the platform natively supports */
export interface PlatformMacro {
  /** Native macro token as the platform provides it, e.g. "sub1" */
  native: string;
  /** Internal meaning in our system */
  internal_meaning: string;
  /** Whether this macro is required in every postback URL */
  required: boolean;
  /** Human-readable description for operators */
  description: string;
}

/** Event preset with per-event field configuration */
export interface PlatformEventPreset {
  /** Event name as sent by the platform in postbacks */
  raw_event_name: string;
  /** Our canonical event name */
  canonical_event_name: string;
  /** Display label in Portuguese */
  label: string;
  /** Which native macros are relevant for this event (beyond the always-included ones) */
  extra_macros: string[];
  /** Whether this event carries monetary amount */
  has_amount: boolean;
  /** Whether this event carries a transaction ID */
  has_transaction_id: boolean;
}

export interface PlatformPreset {
  slug: string;
  label: string;
  /** The native macro used as click ID parameter in affiliate links */
  click_id_param: string;
  /** The native macro token for click ID (e.g. "{sub1}") */
  click_id_macro: string;
  /** Base path segment for postback endpoint */
  postback_base_path: string;
  /** All macros the platform natively supports */
  supported_macros: PlatformMacro[];
  /** Events the platform supports */
  events: PlatformEventPreset[];
  /** Internal field mapping: native macro → internal field name */
  macro_to_internal: Record<string, string>;
}

// ─── 1win Preset ────────────────────────────────────────────────────────

const WIN_MACROS: PlatformMacro[] = [
  { native: "sub1",  internal_meaning: "click_id",               required: true,  description: "ID do clique (obrigatório)" },
  { native: "sub2",  internal_meaning: "influencer_id",          required: false, description: "ID do influenciador" },
  { native: "sub3",  internal_meaning: "campanha_id",            required: false, description: "ID da campanha" },
  { native: "sub4",  internal_meaning: "conteudo_id",            required: false, description: "ID do conteúdo" },
  { native: "sub5",  internal_meaning: "landing_page_instance_id", required: false, description: "ID da instância da LP" },
  { native: "sub6",  internal_meaning: "tracking_code",          required: false, description: "Código de tracking interno" },
  { native: "sub7",  internal_meaning: "utm_source",             required: false, description: "UTM Source" },
  { native: "sub8",  internal_meaning: "utm_medium",             required: false, description: "UTM Medium" },
  { native: "sub9",  internal_meaning: "utm_campaign",           required: false, description: "UTM Campaign" },
  { native: "sub10", internal_meaning: "reserved",               required: false, description: "Reservado" },
  { native: "amount", internal_meaning: "amount",                required: false, description: "Valor monetário" },
  { native: "transaction_id", internal_meaning: "transaction_id", required: false, description: "ID da transação" },
  { native: "country", internal_meaning: "country",              required: false, description: "País do jogador" },
  { native: "user_id", internal_meaning: "user_id",             required: false, description: "ID do jogador na plataforma" },
];

const WIN_EVENTS: PlatformEventPreset[] = [
  {
    raw_event_name: "registration",
    canonical_event_name: "registration",
    label: "Cadastro",
    extra_macros: ["user_id", "country"],
    has_amount: false,
    has_transaction_id: false,
  },
  {
    raw_event_name: "revenue",
    canonical_event_name: "revenue",
    label: "Receita",
    extra_macros: ["amount", "transaction_id", "user_id", "country"],
    has_amount: true,
    has_transaction_id: true,
  },
  {
    raw_event_name: "deposit",
    canonical_event_name: "deposit",
    label: "Todos os depósitos",
    extra_macros: ["amount", "transaction_id", "user_id", "country"],
    has_amount: true,
    has_transaction_id: true,
  },
  {
    raw_event_name: "first_deposit",
    canonical_event_name: "ftd",
    label: "Primeiro depósito",
    extra_macros: ["amount", "transaction_id", "user_id", "country"],
    has_amount: true,
    has_transaction_id: true,
  },
  {
    raw_event_name: "redeposit",
    canonical_event_name: "redeposit",
    label: "Depósito recorrente",
    extra_macros: ["amount", "transaction_id", "user_id", "country"],
    has_amount: true,
    has_transaction_id: true,
  },
  {
    raw_event_name: "app_install",
    canonical_event_name: "app_install",
    label: "Inicialização do aplicativo",
    extra_macros: ["user_id", "country"],
    has_amount: false,
    has_transaction_id: false,
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
 * KEY RULES:
 * - Uses ONLY the platform's native macros (e.g. {sub1}, NOT {click_id})
 * - Optional params (sub2, sub3, sub6) are OMITTED if no real value exists
 * - Event-specific fields (amount, transaction_id) only included when the event uses them
 * - No placeholders, no "none", no "(gerado ao salvar)" ever appear
 * - Macros are kept human-readable (not URL-encoded)
 */
export function buildPostbackUrlForEvent(
  preset: PlatformPreset,
  event: PlatformEventPreset,
  trackingCode?: string,
  influencerId?: string,
  campanhaId?: string,
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

  return `${POSTBACK_BASE}/${preset.postback_base_path}?${parts.join("&")}`;
}

// ─── Validation ─────────────────────────────────────────────────────────

export interface PresetValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Validate that a generated postback URL only uses supported macros
 * and that required fields are resolved.
 */
export function validatePostbackUrl(
  preset: PlatformPreset,
  url: string,
  trackingCode?: string,
): PresetValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const supportedMacroNames = new Set(preset.supported_macros.map(m => m.native));

  // Extract all {macro} tokens from the URL
  const macroMatches = url.match(/\{([^}]+)\}/g) || [];
  for (const match of macroMatches) {
    const macroName = match.slice(1, -1);
    if (!supportedMacroNames.has(macroName)) {
      errors.push(`Macro {${macroName}} não é suportado pela ${preset.label}`);
    }
  }

  // Check for dirty placeholders
  if (url.includes("none")) {
    errors.push("URL contém 'none' — parâmetro deveria ser omitido");
  }
  if (url.includes("(")) {
    errors.push("URL contém placeholder provisório");
  }
  if (url.includes("%7B") || url.includes("%7D")) {
    errors.push("URL contém macros URL-encoded — deveria ser legível");
  }

  // Check tracking code
  if (!trackingCode || trackingCode.includes("(")) {
    warnings.push("Tracking code ainda não resolvido");
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}
