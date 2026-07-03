import { supabase } from "@/integrations/supabase/client";

const VALID_TRACKING_EVENT_STATUS_FILTER = "status.is.null,status.not.in.(invalid_legacy,invalid_internal_preview,duplicate_technical)";

function toDayStartIso(value?: string) {
  if (!value) return undefined;
  // Os eventos são consolidados no banco por America/Sao_Paulo.
  // Quando o filtro vem de um input date (YYYY-MM-DD), convertemos o dia
  // brasileiro inteiro para UTC para não zerar eventos que caíram após
  // 00:00Z, mas ainda pertencem ao dia no Brasil.
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return new Date(`${value}T00:00:00.000-03:00`).toISOString();
  return value;
}

function toDayEndIso(value?: string) {
  if (!value) return undefined;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return new Date(`${value}T23:59:59.999-03:00`).toISOString();
  return value;
}

// ── Types ──────────────────────────────────────────────

export interface PlatformAccountRow {
  id: string;
  platform_id: string;
  nome_conta: string;
  account_external_id: string | null;
  moeda: string | null;
  modelo_comissao: string | null;
  manager_name: string | null;
  manager_email: string | null;
  manager_whatsapp: string | null;
  manager_telegram: string | null;
  dashboard_url: string | null;
  revshare_percent: number | null;
  cpa_value: number | null;
  hybrid_details: string | null;
  login_url: string | null;
  notes: string | null;
  is_active: boolean | null;
  is_demo: boolean;
  created_at: string | null;
  updated_at: string | null;
}

export interface TrackingMetricRow {
  id: string;
  platform_id: string | null;
  platform_account_id: string | null;
  influencer_id: string | null;
  campanha_id: string | null;
  conteudo_id: string | null;
  utm_id: string | null;
  landing_page_id: string | null;
  landing_page_instance_id: string | null;
  data_ref: string;
  cliques: number;
  registros: number;
  ftd: number;
  redepositos: number;
  depositos_total: number;
  deposits_count: number;
  redeposits_count: number;
  redeposit_amount: number;
  revenue: number;
  revenue_liquido: number;
  saque_disponivel: number;
  custo_trafego: number;
  custo_influencer: number;
  cost_amount: number;
  profit_amount: number;
  roi: number | null;
  epc: number | null;
  avg_ticket: number | null;
  registration_cr: number | null;
  ftd_cr: number | null;
  rev_per_registration: number | null;
  rev_per_ftd: number | null;
  original_amount?: number | null;
  original_currency?: string | null;
  converted_amount?: number | null;
  converted_currency?: string | null;
  cpa_commission: number | null;
  cpl_commission: number | null;
  revshare_commission: number | null;
  commission_total: number | null;
  platform_accounts?: { revshare_percent?: number | null; cpa_value?: number | null } | null;
  qftd_count: number | null;
  qlead_count: number | null;
  observacoes: string | null;
  origem_importacao: string | null;
  is_demo: boolean;
  created_at: string | null;
  updated_at: string | null;
}

export interface TrackingSnapshotRow {
  id: string;
  platform_id: string | null;
  platform_account_id: string | null;
  snapshot_type: string | null;
  period_start: string | null;
  period_end: string | null;
  data_snapshot: string;
  hora_snapshot: string | null;
  cliques: number;
  registros: number;
  ftd: number;
  redepositos: number;
  depositos_total: number;
  revenue: number;
  saque_disponivel: number;
  raw_payload: any;
  notes: string | null;
  is_demo: boolean;
  created_at: string | null;
}

export interface TrackingLinkRow {
  id: string;
  platform_account_id: string | null;
  landing_page_instance_id: string | null;
  landing_page_id: string | null;
  influencer_id: string | null;
  campanha_id: string | null;
  conteudo_id: string | null;
  utm_id: string | null;
  tracking_code: string;
  click_id_param_name: string;
  base_url: string | null;
  final_url: string | null;
  short_url: string | null;
  status: string | null;
  notes: string | null;
  is_demo: boolean;
  use_lp?: boolean | null;
  tracking_role?: string | null;
  game_slug?: string | null;
  game_name?: string | null;
  game_icon_url?: string | null;
  link_category?: string | null;
  hype_reason?: string | null;
  parent_link_id?: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface PlatformEventMappingRow {
  id: string;
  platform_id: string;
  platform_account_id: string | null;
  raw_event_name: string;
  canonical_event_name: string;
  sub1_field: string | null;
  sub2_field: string | null;
  sub3_field: string | null;
  sub4_field: string | null;
  sub5_field: string | null;
  sub6_field: string | null;
  sub7_field: string | null;
  sub8_field: string | null;
  sub9_field: string | null;
  sub10_field: string | null;
  amount_field: string | null;
  currency_field: string | null;
  transaction_id_field: string | null;
  user_id_field: string | null;
  country_field: string | null;
  status_field: string | null;
  is_active: boolean;
  notes: string | null;
  is_demo: boolean;
  created_at: string | null;
  updated_at: string | null;
}

export interface TrackingEventRow {
  id: string;
  platform_id: string | null;
  platform_account_id: string | null;
  tracking_link_id: string | null;
  landing_page_instance_id: string | null;
  landing_page_id: string | null;
  influencer_id: string | null;
  campanha_id: string | null;
  conteudo_id: string | null;
  utm_id: string | null;
  click_id: string | null;
  platform_user_id: string | null;
  raw_event_name: string;
  canonical_event_name: string;
  event_timestamp: string;
  transaction_id: string | null;
  amount: number | null;
  currency: string | null;
  commission_amount: number | null;
  status: string | null;
  country: string | null;
  source_type: string;
  raw_payload: any;
  is_duplicate: boolean;
  processed_at: string | null;
  is_demo: boolean;
  created_at: string | null;
  updated_at: string | null;
}

// ── Coerced client for tables not yet in generated types ──
const sb = supabase as any;

// ── Platform Accounts ──────────────────────────────────
export const platformAccountService = {
  async getAll(): Promise<PlatformAccountRow[]> {
    const { data, error } = await sb.from("platform_accounts").select("*").order("created_at", { ascending: false });
    if (error) throw error;
    return data || [];
  },
  async create(item: Partial<PlatformAccountRow>): Promise<PlatformAccountRow> {
    const { data, error } = await sb.from("platform_accounts").insert(item).select().single();
    if (error) throw error;
    return data;
  },
  async update(id: string, updates: Partial<PlatformAccountRow>): Promise<PlatformAccountRow> {
    const { data, error } = await sb.from("platform_accounts").update(updates).eq("id", id).select().single();
    if (error) throw error;
    return data;
  },
  async toggleActive(id: string, current: boolean): Promise<PlatformAccountRow> {
    const { data, error } = await sb.from("platform_accounts").update({ is_active: !current }).eq("id", id).select().single();
    if (error) throw error;
    return data;
  },
  async remove(id: string): Promise<void> {
    const { error } = await sb.from("platform_accounts").delete().eq("id", id);
    if (error) throw error;
  },
};

// ── Tracking Metrics ───────────────────────────────────
export const trackingMetricService = {
  async getAll(): Promise<TrackingMetricRow[]> {
    const { data, error } = await sb
      .from("tracking_metrics")
      .select("*, platform_accounts(revshare_percent,cpa_value,cpa_baseline_deposit)")
      .order("data_ref", { ascending: false });
    if (error) throw error;
    return data || [];
  },
  async getFiltered(filters: {
    platform_id?: string;
    influencer_id?: string;
    campanha_id?: string;
    landing_page_id?: string;
    date_from?: string;
    date_to?: string;
  }): Promise<TrackingMetricRow[]> {
    let q = sb.from("tracking_metrics").select("*, platform_accounts(revshare_percent,cpa_value,cpa_baseline_deposit)");
    if (filters.platform_id) q = q.eq("platform_id", filters.platform_id);
    if (filters.influencer_id) q = q.eq("influencer_id", filters.influencer_id);
    if (filters.campanha_id) q = q.eq("campanha_id", filters.campanha_id);
    if (filters.landing_page_id) q = q.eq("landing_page_id", filters.landing_page_id);
    if (filters.date_from) q = q.gte("data_ref", filters.date_from);
    if (filters.date_to) q = q.lte("data_ref", filters.date_to);
    q = q.order("data_ref", { ascending: false });
    const { data, error } = await q;
    if (error) throw error;
    return data || [];
  },
  async create(item: Partial<TrackingMetricRow>): Promise<TrackingMetricRow> {
    const { data, error } = await sb.from("tracking_metrics").insert(item).select().single();
    if (error) throw error;
    return data;
  },
  async update(id: string, updates: Partial<TrackingMetricRow>): Promise<TrackingMetricRow> {
    const { data, error } = await sb.from("tracking_metrics").update(updates).eq("id", id).select().single();
    if (error) throw error;
    return data;
  },
  async remove(id: string): Promise<void> {
    const { error } = await sb.from("tracking_metrics").delete().eq("id", id);
    if (error) throw error;
  },
};

// ── Tracking Snapshots ─────────────────────────────────
export const trackingSnapshotService = {
  async getAll(): Promise<TrackingSnapshotRow[]> {
    const { data, error } = await sb.from("tracking_snapshots").select("*").order("data_snapshot", { ascending: false });
    if (error) throw error;
    return data || [];
  },
  async create(item: Partial<TrackingSnapshotRow>): Promise<TrackingSnapshotRow> {
    const { data, error } = await sb.from("tracking_snapshots").insert(item).select().single();
    if (error) throw error;
    return data;
  },
};

// ── Tracking Links ─────────────────────────────────────
export const trackingLinkService = {
  async getAll(): Promise<TrackingLinkRow[]> {
    const { data, error } = await sb.from("tracking_links").select("*").order("created_at", { ascending: false });
    if (error) throw error;
    return data || [];
  },
  async create(item: Partial<TrackingLinkRow>): Promise<TrackingLinkRow> {
    const { data, error } = await sb.from("tracking_links").insert(item).select().single();
    if (error) throw error;
    return data;
  },
  async update(id: string, updates: Partial<TrackingLinkRow>): Promise<TrackingLinkRow> {
    const { data, error } = await sb.from("tracking_links").update(updates).eq("id", id).select().single();
    if (error) throw error;
    return data;
  },
  async remove(id: string): Promise<void> {
    const { error } = await sb.from("tracking_links").delete().eq("id", id);
    if (error) throw error;
  },
};

// ── Platform Event Mappings ────────────────────────────
export const platformEventMappingService = {
  async getAll(): Promise<PlatformEventMappingRow[]> {
    const { data, error } = await sb.from("platform_event_mappings").select("*").order("created_at", { ascending: false });
    if (error) throw error;
    return data || [];
  },
  async getByPlatform(platformId: string): Promise<PlatformEventMappingRow[]> {
    const { data, error } = await sb.from("platform_event_mappings").select("*").eq("platform_id", platformId).order("canonical_event_name");
    if (error) throw error;
    return data || [];
  },
  async create(item: Partial<PlatformEventMappingRow>): Promise<PlatformEventMappingRow> {
    const { data, error } = await sb.from("platform_event_mappings").insert(item).select().single();
    if (error) throw error;
    return data;
  },
  async update(id: string, updates: Partial<PlatformEventMappingRow>): Promise<PlatformEventMappingRow> {
    const { data, error } = await sb.from("platform_event_mappings").update(updates).eq("id", id).select().single();
    if (error) throw error;
    return data;
  },
  async remove(id: string): Promise<void> {
    const { error } = await sb.from("platform_event_mappings").delete().eq("id", id);
    if (error) throw error;
  },
};

// ── Tracking Events ────────────────────────────────────
export const trackingEventService = {
  async getAll(): Promise<TrackingEventRow[]> {
    const { data, error } = await sb
      .from("tracking_events")
      .select("*")
      .eq("is_duplicate", false)
      .or(VALID_TRACKING_EVENT_STATUS_FILTER)
      .order("event_timestamp", { ascending: false })
      .limit(500);
    if (error) throw error;
    return data || [];
  },
  async getFiltered(filters: {
    platform_id?: string;
    influencer_id?: string;
    canonical_event_name?: string;
    source_type?: string;
    date_from?: string;
    date_to?: string;
  }): Promise<TrackingEventRow[]> {
    let q = sb.from("tracking_events").select("*");
    q = q.eq("is_duplicate", false).or(VALID_TRACKING_EVENT_STATUS_FILTER);
    if (filters.platform_id) q = q.eq("platform_id", filters.platform_id);
    if (filters.influencer_id) q = q.eq("influencer_id", filters.influencer_id);
    if (filters.canonical_event_name) q = q.eq("canonical_event_name", filters.canonical_event_name);
    if (filters.source_type) q = q.eq("source_type", filters.source_type);
    const dateFrom = toDayStartIso(filters.date_from);
    const dateTo = toDayEndIso(filters.date_to);
    if (dateFrom) q = q.gte("event_timestamp", dateFrom);
    if (dateTo) q = q.lte("event_timestamp", dateTo);
    q = q.order("event_timestamp", { ascending: false }).limit(500);
    const { data, error } = await q;
    if (error) throw error;
    return data || [];
  },
  async create(item: Partial<TrackingEventRow>): Promise<TrackingEventRow> {
    const { data, error } = await sb.from("tracking_events").insert(item).select().single();
    if (error) throw error;
    return data;
  },
  async remove(id: string): Promise<void> {
    const { error } = await sb.from("tracking_events").delete().eq("id", id);
    if (error) throw error;
  },
};
