import { supabase } from "@/integrations/supabase/client";

const db = supabase as any;

export interface SquadRow {
  id: string;
  name: string;
  color: string;
  manager_id: string | null;
  monthly_goal: number | null;
  notes: string | null;
  is_active: boolean;
  created_at: string | null;
  updated_at: string | null;
}

export const squadService = {
  async getAll(): Promise<SquadRow[]> {
    const { data, error } = await db.from("squads").select("*").order("created_at", { ascending: false });
    if (error) throw error;
    return (data || []) as SquadRow[];
  },
  async create(item: Partial<SquadRow>): Promise<SquadRow> {
    const { data, error } = await db.from("squads").insert(item).select().single();
    if (error) throw error;
    return data as SquadRow;
  },
  async update(id: string, updates: Partial<SquadRow>): Promise<SquadRow> {
    const { data, error } = await db.from("squads").update(updates).eq("id", id).select().single();
    if (error) throw error;
    return data as SquadRow;
  },
  async toggleActive(id: string, current: boolean): Promise<SquadRow> {
    return this.update(id, { is_active: !current });
  },
  async remove(id: string) {
    const { error } = await db.from("squads").delete().eq("id", id);
    if (error) throw error;
  },
};
