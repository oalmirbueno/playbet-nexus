import { supabase } from "@/integrations/supabase/client";

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
  data_ref: string;
  cliques: number;
  registros: number;
  ftd: number;
  redepositos: number;
  depositos_total: number;
  revenue: number;
  revenue_liquido: number;
  saque_disponivel: number;
  custo_trafego: number;
  custo_influencer: number;
  observacoes: string | null;
  origem_importacao: string | null;
  is_demo: boolean;
  created_at: string | null;
  updated_at: string | null;
}

export interface TrackingSnapshotRow {
  id: string;
  platform_account_id: string | null;
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
  is_demo: boolean;
  created_at: string | null;
}

// ── Coerced client for new tables ──────────────────────
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
    const { data, error } = await sb.from("tracking_metrics").select("*").order("data_ref", { ascending: false });
    if (error) throw error;
    return data || [];
  },
  async getFiltered(filters: {
    platform_id?: string;
    influencer_id?: string;
    campanha_id?: string;
    date_from?: string;
    date_to?: string;
  }): Promise<TrackingMetricRow[]> {
    let q = sb.from("tracking_metrics").select("*");
    if (filters.platform_id) q = q.eq("platform_id", filters.platform_id);
    if (filters.influencer_id) q = q.eq("influencer_id", filters.influencer_id);
    if (filters.campanha_id) q = q.eq("campanha_id", filters.campanha_id);
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
