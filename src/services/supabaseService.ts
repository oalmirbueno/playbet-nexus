import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

// ── Type aliases ──
type InfluencerRow = Database["public"]["Tables"]["influencers"]["Row"];
type InfluencerInsert = Database["public"]["Tables"]["influencers"]["Insert"];
type InfluencerUpdate = Database["public"]["Tables"]["influencers"]["Update"];

type PlatformRow = Database["public"]["Tables"]["platforms"]["Row"];
type PlatformInsert = Database["public"]["Tables"]["platforms"]["Insert"];
type PlatformUpdate = Database["public"]["Tables"]["platforms"]["Update"];

type GameRow = Database["public"]["Tables"]["games"]["Row"];
type GameInsert = Database["public"]["Tables"]["games"]["Insert"];
type GameUpdate = Database["public"]["Tables"]["games"]["Update"];

type TemplateRow = Database["public"]["Tables"]["templates"]["Row"];
type TemplateInsert = Database["public"]["Tables"]["templates"]["Insert"];
type TemplateUpdate = Database["public"]["Tables"]["templates"]["Update"];

type LandingPageRow = Database["public"]["Tables"]["landing_pages"]["Row"];
type LandingPageInsert = Database["public"]["Tables"]["landing_pages"]["Insert"];
type LandingPageUpdate = Database["public"]["Tables"]["landing_pages"]["Update"];

type UtmRow = Database["public"]["Tables"]["utms"]["Row"];
type UtmInsert = Database["public"]["Tables"]["utms"]["Insert"];
type UtmUpdate = Database["public"]["Tables"]["utms"]["Update"];

type ClickInsert = Database["public"]["Tables"]["clicks"]["Insert"];

// ── Generic CRUD helper ──
function createService<
  Row extends Record<string, any>,
  Insert extends Record<string, any>,
  Update extends Record<string, any>,
>(tableName: string) {
  return {
    async getAll() {
      const { data, error } = await supabase
        .from(tableName)
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Row[];
    },

    async getById(id: string) {
      const { data, error } = await supabase
        .from(tableName)
        .select("*")
        .eq("id", id)
        .single();
      if (error) throw error;
      return data as Row;
    },

    async create(item: Insert) {
      const { data, error } = await supabase
        .from(tableName)
        .insert(item)
        .select()
        .single();
      if (error) throw error;
      return data as Row;
    },

    async update(id: string, updates: Update) {
      const { data, error } = await supabase
        .from(tableName)
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data as Row;
    },

    async toggleActive(id: string, currentState: boolean) {
      return this.update(id, { is_active: !currentState } as Update);
    },

    async delete(id: string) {
      const { error } = await supabase.from(tableName).delete().eq("id", id);
      if (error) throw error;
    },
  };
}

// ── Entity services ──
export const influencerService = createService<InfluencerRow, InfluencerInsert, InfluencerUpdate>("influencers");
export const platformService = createService<PlatformRow, PlatformInsert, PlatformUpdate>("platforms");
export const gameService = createService<GameRow, GameInsert, GameUpdate>("games");
export const templateService = createService<TemplateRow, TemplateInsert, TemplateUpdate>("templates");
export const landingPageService = createService<LandingPageRow, LandingPageInsert, LandingPageUpdate>("landing_pages");
export const utmService = createService<UtmRow, UtmInsert, UtmUpdate>("utms");

// ── Click service (special — public insert) ──
export const clickService = {
  async record(click: ClickInsert) {
    const { data, error } = await supabase
      .from("clicks")
      .insert(click)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async getByInfluencer(influencerId: string) {
    const { data, error } = await supabase
      .from("clicks")
      .select("*")
      .eq("influencer_id", influencerId)
      .order("clicked_at", { ascending: false })
      .limit(100);
    if (error) throw error;
    return data;
  },

  async getAll() {
    const { data, error } = await supabase
      .from("clicks")
      .select("*")
      .order("clicked_at", { ascending: false })
      .limit(500);
    if (error) throw error;
    return data;
  },
};

// ── Re-export types ──
export type {
  InfluencerRow,
  PlatformRow,
  GameRow,
  TemplateRow,
  LandingPageRow,
  UtmRow,
};
