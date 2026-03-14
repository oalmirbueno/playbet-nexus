/**
 * Platform presets — auto-configuration templates per known platform.
 * When a platform is selected, the system applies these defaults automatically.
 */

export interface PlatformEventPreset {
  raw_event_name: string;
  canonical_event_name: string;
  amount_field: string | null;
  currency_field: string | null;
  transaction_id_field: string | null;
  user_id_field: string | null;
  country_field: string | null;
  status_field: string | null;
}

export interface PlatformPreset {
  slug: string;
  label: string;
  click_id_param: string;
  postback_base_path: string;
  events: PlatformEventPreset[];
  sub_fields: {
    sub1_field: string;
    sub2_field: string;
    sub3_field: string;
    sub4_field: string;
    sub5_field: string;
    sub6_field: string;
    sub7_field: string;
    sub8_field: string;
    sub9_field: string;
    sub10_field: string;
  };
  postback_template: string;
  link_generation: {
    append_click_id: boolean;
    click_id_macro: string;
  };
}

const COMMON_SUBS = {
  sub1_field: "click_id",
  sub2_field: "influencer_id",
  sub3_field: "campanha_id",
  sub4_field: "conteudo_id",
  sub5_field: "lp_instance_id",
  sub6_field: "tracking_code",
  sub7_field: "utm_source",
  sub8_field: "utm_medium",
  sub9_field: "utm_campaign",
  sub10_field: "reserved",
};

export const PLATFORM_PRESETS: Record<string, PlatformPreset> = {
  "1win": {
    slug: "1win",
    label: "1win",
    click_id_param: "sub1",
    postback_base_path: "1win",
    events: [
      { raw_event_name: "registration", canonical_event_name: "registration", amount_field: null, currency_field: null, transaction_id_field: null, user_id_field: "user_id", country_field: "country", status_field: null },
      { raw_event_name: "first_deposit", canonical_event_name: "ftd", amount_field: "amount", currency_field: "currency", transaction_id_field: "transaction_id", user_id_field: "user_id", country_field: "country", status_field: null },
      { raw_event_name: "deposit", canonical_event_name: "deposit", amount_field: "amount", currency_field: "currency", transaction_id_field: "transaction_id", user_id_field: "user_id", country_field: "country", status_field: null },
      { raw_event_name: "redeposit", canonical_event_name: "redeposit", amount_field: "amount", currency_field: "currency", transaction_id_field: "transaction_id", user_id_field: "user_id", country_field: "country", status_field: null },
      { raw_event_name: "revenue", canonical_event_name: "revenue", amount_field: "amount", currency_field: "currency", transaction_id_field: "transaction_id", user_id_field: "user_id", country_field: "country", status_field: null },
    ],
    sub_fields: COMMON_SUBS,
    postback_template: "event={event}&sub1={sub1}&sub2={sub2}&sub3={sub3}&amount={amount}&transaction_id={transaction_id}&user_id={user_id}&country={country}",
    link_generation: {
      append_click_id: true,
      click_id_macro: "{click_id}",
    },
  },
};

/** Canonical event labels in Portuguese for display */
export const EVENT_LABELS: Record<string, string> = {
  registration: "Cadastro",
  ftd: "Primeiro Depósito (FTD)",
  deposit: "Depósito",
  redeposit: "Redepósito",
  revenue: "Revenue",
  click: "Clique",
  withdrawable_revenue: "Revenue Sacável",
  app_install: "Instalação App",
  qualified_player: "Jogador Qualificado",
};

export function findPresetByName(name: string): PlatformPreset | null {
  const key = name.toLowerCase().trim();
  return PLATFORM_PRESETS[key] || Object.values(PLATFORM_PRESETS).find(p => key.includes(p.slug)) || null;
}

/** Generate a short tracking code */
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
 * Rules:
 * - Platform macros (e.g. {click_id}, {amount}) are kept as-is without URL-encoding
 * - Optional fields (campanha, trackingCode, influencer) are OMITTED if empty
 * - Event-specific fields: amount/transaction_id only included if the event uses them
 * - No placeholders like "(gerado ao salvar)" or "none" ever appear in output
 */
export function buildPostbackUrlForEvent(
  preset: PlatformPreset,
  event: PlatformEventPreset,
  trackingCode?: string,
  influencerId?: string,
  campanhaId?: string,
): string {
  // Build params manually to avoid URLSearchParams encoding {macros}
  const parts: string[] = [];

  // Always: event name
  parts.push(`event=${event.raw_event_name}`);

  // sub1 = click_id (always, platform macro)
  parts.push(`sub1={${preset.click_id_param}}`);

  // sub2 = influencer (only if real value exists)
  if (influencerId && influencerId !== "none") {
    parts.push(`sub2=${influencerId}`);
  }

  // sub3 = campanha (only if real value exists)
  if (campanhaId && campanhaId !== "none") {
    parts.push(`sub3=${campanhaId}`);
  }

  // sub6 = tracking_code (only if real value exists)
  if (trackingCode && !trackingCode.includes("(") && trackingCode !== "none") {
    parts.push(`sub6=${trackingCode}`);
  }

  // Event-specific fields — only include if this event actually uses them
  if (event.amount_field) {
    parts.push(`amount={amount}`);
  }
  if (event.transaction_id_field) {
    parts.push(`transaction_id={transaction_id}`);
  }
  if (event.user_id_field) {
    parts.push(`user_id={user_id}`);
  }
  if (event.country_field) {
    parts.push(`country={country}`);
  }

  return `${POSTBACK_BASE}/${preset.postback_base_path}?${parts.join("&")}`;
}
