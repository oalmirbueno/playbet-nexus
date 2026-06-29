import { supabase } from "@/integrations/supabase/client";

const db = supabase as any;

export interface LpOpportunityRow {
  id: string;
  landing_page_id: string | null;
  tracking_link_id: string | null;
  platform_id: string | null;
  campanha_id: string | null;
  title: string;
  subtitle: string | null;
  category: string;
  event_name: string | null;
  market_name: string | null;
  odd_label: string | null;
  badge: string | null;
  cta_label: string;
  destination_url: string;
  starts_at: string | null;
  ends_at: string | null;
  sort_order: number;
  is_active: boolean;
  metadata: Record<string, unknown>;
  created_at: string | null;
  updated_at: string | null;
}

export const lpOpportunityService = {
  async getAll(): Promise<LpOpportunityRow[]> {
    const { data, error } = await db
      .from("lp_opportunities")
      .select("*")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false });
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
