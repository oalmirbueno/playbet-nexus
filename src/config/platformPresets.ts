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
  /** Platform name (lowercase match) */
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
  /** Postback query params template per event (placeholders use {macro} syntax) */
  postback_template: string;
  link_generation: {
    /** How to build the tracking URL from affiliate_link */
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

const POSTBACK_BASE = `https://rcrrbznhatdqcmfyzgbt.supabase.co/functions/v1/tracking-postback`;

export function buildPostbackUrlForEvent(
  preset: PlatformPreset,
  event: PlatformEventPreset,
  trackingCode: string,
  influencerId?: string,
  campanhaId?: string,
): string {
  const params = new URLSearchParams();
  params.set("event", event.raw_event_name);
  params.set("sub1", `{${preset.click_id_param}}`);
  if (trackingCode) params.set("sub6", trackingCode);
  if (influencerId) params.set("sub2", influencerId);
  if (campanhaId) params.set("sub3", campanhaId);
  params.set("amount", "{amount}");
  params.set("transaction_id", "{transaction_id}");
  params.set("user_id", "{user_id}");
  params.set("country", "{country}");

  return `${POSTBACK_BASE}/${preset.postback_base_path}?${params.toString()}`;
}
