import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

// ── Type aliases ──
export type InfluencerRow = Database["public"]["Tables"]["influencers"]["Row"];
export type PlatformRow = Database["public"]["Tables"]["platforms"]["Row"];
export type GameRow = Database["public"]["Tables"]["games"]["Row"];
export type TemplateRow = Database["public"]["Tables"]["templates"]["Row"];
export type LandingPageRow = Database["public"]["Tables"]["landing_pages"]["Row"];
export type UtmRow = Database["public"]["Tables"]["utms"]["Row"];
export type ClickRow = Database["public"]["Tables"]["clicks"]["Row"];

// ── Influencers ──
export const influencerService = {
  async getAll() {
    const { data, error } = await supabase.from("influencers").select("*").order("created_at", { ascending: false });
    if (error) throw error;
    return data;
  },
  async getById(id: string) {
    const { data, error } = await supabase.from("influencers").select("*").eq("id", id).single();
    if (error) throw error;
    return data;
  },
  async getBySlug(slug: string) {
    const { data, error } = await supabase.from("influencers").select("*").eq("slug", slug).eq("is_active", true).single();
    if (error) throw error;
    return data;
  },
  async create(item: Database["public"]["Tables"]["influencers"]["Insert"]) {
    const { data, error } = await supabase.from("influencers").insert(item).select().single();
    if (error) throw error;
    return data;
  },
  async update(id: string, updates: Database["public"]["Tables"]["influencers"]["Update"]) {
    const { data, error } = await supabase.from("influencers").update(updates).eq("id", id).select().single();
    if (error) throw error;
    return data;
  },
  async toggleActive(id: string, current: boolean) {
    return this.update(id, { is_active: !current });
  },
};

// ── Platforms ──
export const platformService = {
  async getAll() {
    const { data, error } = await supabase.from("platforms").select("*").order("created_at", { ascending: false });
    if (error) throw error;
    return data;
  },
  async create(item: Database["public"]["Tables"]["platforms"]["Insert"]) {
    const { data, error } = await supabase.from("platforms").insert(item).select().single();
    if (error) throw error;
    return data;
  },
  async update(id: string, updates: Database["public"]["Tables"]["platforms"]["Update"]) {
    const { data, error } = await supabase.from("platforms").update(updates).eq("id", id).select().single();
    if (error) throw error;
    return data;
  },
  async toggleActive(id: string, current: boolean) {
    return this.update(id, { is_active: !current });
  },
};

// ── Games ──
export const gameService = {
  async getAll() {
    const { data, error } = await supabase.from("games").select("*").order("created_at", { ascending: false });
    if (error) throw error;
    return data;
  },
  async create(item: Database["public"]["Tables"]["games"]["Insert"]) {
    const { data, error } = await supabase.from("games").insert(item).select().single();
    if (error) throw error;
    return data;
  },
  async update(id: string, updates: Database["public"]["Tables"]["games"]["Update"]) {
    const { data, error } = await supabase.from("games").update(updates).eq("id", id).select().single();
    if (error) throw error;
    return data;
  },
  async toggleActive(id: string, current: boolean) {
    return this.update(id, { is_active: !current });
  },
};

// ── Templates ──
export const templateService = {
  async getAll() {
    const { data, error } = await supabase.from("templates").select("*").order("created_at", { ascending: false });
    if (error) throw error;
    return data;
  },
  async create(item: Database["public"]["Tables"]["templates"]["Insert"]) {
    const { data, error } = await supabase.from("templates").insert(item).select().single();
    if (error) throw error;
    return data;
  },
  async update(id: string, updates: Database["public"]["Tables"]["templates"]["Update"]) {
    const { data, error } = await supabase.from("templates").update(updates).eq("id", id).select().single();
    if (error) throw error;
    return data;
  },
  async toggleActive(id: string, current: boolean) {
    return this.update(id, { is_active: !current });
  },
};

// ── Landing Pages ──
export const landingPageService = {
  async getAll() {
    const { data, error } = await supabase.from("landing_pages").select("*").order("created_at", { ascending: false });
    if (error) throw error;
    return data;
  },
  async create(item: Database["public"]["Tables"]["landing_pages"]["Insert"]) {
    const { data, error } = await supabase.from("landing_pages").insert(item).select().single();
    if (error) throw error;
    return data;
  },
  async update(id: string, updates: Database["public"]["Tables"]["landing_pages"]["Update"]) {
    const { data, error } = await supabase.from("landing_pages").update(updates).eq("id", id).select().single();
    if (error) throw error;
    return data;
  },
  async toggleActive(id: string, current: boolean) {
    return this.update(id, { is_active: !current });
  },
};

// ── UTMs ──
export const utmService = {
  async getAll() {
    const { data, error } = await supabase.from("utms").select("*").order("created_at", { ascending: false });
    if (error) throw error;
    return data;
  },
  async create(item: Database["public"]["Tables"]["utms"]["Insert"]) {
    const { data, error } = await supabase.from("utms").insert(item).select().single();
    if (error) throw error;
    return data;
  },
  async update(id: string, updates: Database["public"]["Tables"]["utms"]["Update"]) {
    const { data, error } = await supabase.from("utms").update(updates).eq("id", id).select().single();
    if (error) throw error;
    return data;
  },
  async toggleActive(id: string, current: boolean) {
    return this.update(id, { is_active: !current });
  },
};

// ── Landing Page Instances ──
export type LandingPageInstanceRow = Database["public"]["Tables"]["landing_page_instances"]["Row"];

export const landingPageInstanceService = {
  async getAll() {
    const { data, error } = await supabase.from("landing_page_instances").select("*").order("created_at", { ascending: false });
    if (error) throw error;
    return data;
  },
  async getByLandingPage(lpId: string) {
    const { data, error } = await supabase.from("landing_page_instances").select("*").eq("landing_page_id", lpId).order("created_at", { ascending: false });
    if (error) throw error;
    return data;
  },
  async getByInfluencer(influencerId: string) {
    const { data, error } = await supabase.from("landing_page_instances").select("*").eq("influencer_id", influencerId).order("created_at", { ascending: false });
    if (error) throw error;
    return data;
  },
  async create(item: Database["public"]["Tables"]["landing_page_instances"]["Insert"]) {
    const { data, error } = await supabase.from("landing_page_instances").insert(item).select().single();
    if (error) throw error;
    return data;
  },
  async update(id: string, updates: Database["public"]["Tables"]["landing_page_instances"]["Update"]) {
    const { data, error } = await supabase.from("landing_page_instances").update(updates).eq("id", id).select().single();
    if (error) throw error;
    return data;
  },
  async toggleActive(id: string, current: boolean) {
    return this.update(id, { is_active: !current });
  },
  async checkDuplicate(lpId: string, influencerId: string, slug: string, excludeId?: string) {
    let query = supabase.from("landing_page_instances")
      .select("id")
      .eq("landing_page_id", lpId)
      .eq("slug", slug);
    if (excludeId) query = query.neq("id", excludeId);
    const { data } = await query;
    if (data && data.length > 0) return "slug";
    
    let query2 = supabase.from("landing_page_instances")
      .select("id")
      .eq("landing_page_id", lpId)
      .eq("influencer_id", influencerId);
    if (excludeId) query2 = query2.neq("id", excludeId);
    const { data: data2 } = await query2;
    if (data2 && data2.length > 0) return "influencer";
    
    return null;
  },
};

// ── Clicks (public insert) ──
export const clickService = {
  async record(click: Database["public"]["Tables"]["clicks"]["Insert"]) {
    const { data, error } = await supabase.from("clicks").insert(click).select().single();
    if (error) throw error;
    return data;
  },
  async getByInfluencer(influencerId: string) {
    const { data, error } = await supabase.from("clicks").select("*").eq("influencer_id", influencerId).order("clicked_at", { ascending: false }).limit(100);
    if (error) throw error;
    return data;
  },
  async getByLandingPage(lpId: string) {
    const { data, error } = await supabase.from("clicks").select("*").eq("landing_page_id", lpId).order("clicked_at", { ascending: false }).limit(100);
    if (error) throw error;
    return data;
  },
  async getAll() {
    const { data, error } = await supabase.from("clicks").select("*").order("clicked_at", { ascending: false }).limit(500);
    if (error) throw error;
    return data;
  },
};
  async record(click: Database["public"]["Tables"]["clicks"]["Insert"]) {
    const { data, error } = await supabase.from("clicks").insert(click).select().single();
    if (error) throw error;
    return data;
  },
  async getByInfluencer(influencerId: string) {
    const { data, error } = await supabase.from("clicks").select("*").eq("influencer_id", influencerId).order("clicked_at", { ascending: false }).limit(100);
    if (error) throw error;
    return data;
  },
  async getAll() {
    const { data, error } = await supabase.from("clicks").select("*").order("clicked_at", { ascending: false }).limit(500);
    if (error) throw error;
    return data;
  },
};
