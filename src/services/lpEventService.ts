import { supabase } from "@/integrations/supabase/client";

const db = supabase as any;

export type EventSource = "manual" | "casa" | "api" | "sala_sinais";

export interface LpEventRow {
  id: string;
  sport: string;
  league: string | null;
  home_team: string;
  away_team: string;
  starts_at: string | null;
  home_team_logo_url: string | null;
  away_team_logo_url: string | null;
  event_image_url: string | null;
  source: EventSource;
  external_ref: string | null;
  notes: string | null;
  is_active: boolean;
  metadata: Record<string, unknown>;
  created_at: string | null;
  updated_at: string | null;
}

export const lpEventService = {
  async getAll(): Promise<LpEventRow[]> {
    const { data, error } = await db
      .from("lp_events")
      .select("*")
      .order("starts_at", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data || []) as LpEventRow[];
  },
  async getById(id: string): Promise<LpEventRow | null> {
    const { data, error } = await db.from("lp_events").select("*").eq("id", id).maybeSingle();
    if (error) throw error;
    return (data || null) as LpEventRow | null;
  },
  async create(item: Partial<LpEventRow>): Promise<LpEventRow> {
    const { data, error } = await db.from("lp_events").insert(item).select().single();
    if (error) throw error;
    return data as LpEventRow;
  },
  async update(id: string, updates: Partial<LpEventRow>): Promise<LpEventRow> {
    const { data, error } = await db
      .from("lp_events")
      .update(updates)
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return data as LpEventRow;
  },
  async remove(id: string): Promise<void> {
    const { error } = await db.from("lp_events").delete().eq("id", id);
    if (error) throw error;
  },
};
