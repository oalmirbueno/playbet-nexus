import { supabase } from "@/integrations/supabase/client";

const db = supabase as any;

export type SignalConfidence = "baixa" | "media" | "alta";

export type MarketType =
  | "resultado_final"
  | "empate"
  | "total_gols"
  | "dupla_chance"
  | "ambas_marcam"
  | "jogador"
  | "especial"
  | "casino"
  | "oferta"
  | "guia";

export interface LpOpportunityRow {
  id: string;
  landing_page_id: string | null;
  tracking_link_id: string | null;
  platform_id: string | null;
  campanha_id: string | null;
  event_id: string | null;
  signal_id: string | null;
  title: string;
  subtitle: string | null;
  category: string;
  event_name: string | null;
  market_name: string | null;
  market_type: MarketType | string | null;
  odd_label: string | null;
  badge: string | null;
  cta_label: string;
  destination_url: string;
  starts_at: string | null;
  ends_at: string | null;
  sort_order: number;
  is_active: boolean;
  signal_source: string | null;
  signal_confidence: SignalConfidence | null;
  stats_summary: string | null;
  recommendation_score: number | null;
  recommendation_reason: string | null;
  home_team_logo_url: string | null;
  away_team_logo_url: string | null;
  event_image_url: string | null;
  game_thumb_url: string | null;
  provider_logo_url: string | null;
  metadata: Record<string, unknown>;
  created_at: string | null;
  updated_at: string | null;
}

export const lpOpportunityService = {
  async getAll(): Promise<LpOpportunityRow[]> {
    const { data, error } = await db
      .from("lp_opportunities")
      .select("*")
      .order("sort_order", { ascending: false })
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data || []) as LpOpportunityRow[];
  },
  async getByEvent(eventId: string): Promise<LpOpportunityRow[]> {
    const { data, error } = await db
      .from("lp_opportunities")
      .select("*")
      .eq("event_id", eventId)
      .order("sort_order", { ascending: false });
    if (error) throw error;
    return (data || []) as LpOpportunityRow[];
  },
  async create(item: Partial<LpOpportunityRow>): Promise<LpOpportunityRow> {
    const { data, error } = await db.from("lp_opportunities").insert(item).select().single();
    if (error) throw error;
    return data as LpOpportunityRow;
  },
  async update(id: string, updates: Partial<LpOpportunityRow>): Promise<LpOpportunityRow> {
    const { data, error } = await db
      .from("lp_opportunities")
      .update(updates)
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return data as LpOpportunityRow;
  },
  async toggleActive(id: string, current: boolean): Promise<LpOpportunityRow> {
    return this.update(id, { is_active: !current });
  },
  async remove(id: string): Promise<void> {
    const { error } = await db.from("lp_opportunities").delete().eq("id", id);
    if (error) throw error;
  },
};
