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

// ── Managers (Gerentes) ──
const sbAny = supabase as any;

export type ManagerRow = {
  id: string;
  name: string;
  slug: string;
  team_name: string;
  team_color: string;
  monthly_goal: number | null;
  notes: string | null;
  is_active: boolean;
  created_at: string | null;
  updated_at: string | null;
};

export const managerService = {
  async getAll(): Promise<ManagerRow[]> {
    const { data, error } = await sbAny.from("managers").select("*").order("created_at", { ascending: false });
    if (error) throw error;
    return (data || []) as ManagerRow[];
  },
  async create(item: Partial<ManagerRow>) {
    const { data, error } = await sbAny.from("managers").insert(item).select().single();
    if (error) throw error;
    return data as ManagerRow;
  },
  async update(id: string, updates: Partial<ManagerRow>) {
    const { data, error } = await sbAny.from("managers").update(updates).eq("id", id).select().single();
    if (error) throw error;
    // Sync team_label on influencers if team_name changed
    if (updates.team_name !== undefined) {
      await sbAny.from("influencers").update({ team_label: updates.team_name }).eq("manager_id", id);
    }
    return data as ManagerRow;
  },
  async toggleActive(id: string, current: boolean) {
    return this.update(id, { is_active: !current });
  },
  async remove(id: string) {
    const { error } = await sbAny.from("managers").delete().eq("id", id);
    if (error) throw error;
  },
};

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
  async remove(id: string) {
    const { error } = await supabase.from("influencers").delete().eq("id", id);
    if (error) throw error;
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
  async remove(id: string) {
    const { error } = await supabase.from("landing_pages").delete().eq("id", id);
    if (error) throw error;
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
  async checkDuplicate(lpId: string, _influencerId: string, slug: string, excludeId?: string) {
    let query = supabase.from("landing_page_instances")
      .select("id")
      .eq("landing_page_id", lpId)
      .eq("slug", slug);
    if (excludeId) query = query.neq("id", excludeId);
    const { data } = await query;
    if (data && data.length > 0) return "slug";
    
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

// ── Helper for untyped tables ──
const db = supabase as any;

// ── Campanhas ──
export interface CampanhaRow {
  id: string;
  nome: string;
  objetivo: string | null;
  jogo: string | null;
  plataforma: string | null;
  influencer: string | null;
  inicio: string | null;
  fim: string | null;
  status: string | null;
  resultado: string | null;
  is_demo: boolean;
  created_at: string | null;
  updated_at: string | null;
}

export const campanhaService = {
  async getAll(): Promise<CampanhaRow[]> {
    const { data, error } = await db.from("campanhas").select("*").order("created_at", { ascending: false });
    if (error) throw error;
    return data;
  },
  async create(item: Partial<CampanhaRow>): Promise<CampanhaRow> {
    const { data, error } = await db.from("campanhas").insert(item).select().single();
    if (error) throw error;
    return data;
  },
  async update(id: string, updates: Partial<CampanhaRow>): Promise<CampanhaRow> {
    const { data, error } = await db.from("campanhas").update(updates).eq("id", id).select().single();
    if (error) throw error;
    return data;
  },
  async toggleActive(id: string, current: boolean): Promise<CampanhaRow> {
    const newStatus = current ? "Inativa" : "Ativa";
    return this.update(id, { status: newStatus });
  },
  async remove(id: string) {
    const { error } = await db.from("campanhas").delete().eq("id", id);
    if (error) throw error;
  },
};

// ── Sócios ──
export interface SocioRow {
  id: string;
  nome: string;
  participacao: number;
  ganhos: number;
  disponivel: number;
  ultimo_saque: string | null;
  status: string | null;
  is_demo: boolean;
  created_at: string | null;
  updated_at: string | null;
}

export const socioService = {
  async getAll(): Promise<SocioRow[]> {
    const { data, error } = await db.from("socios").select("*").order("created_at", { ascending: false });
    if (error) throw error;
    return data;
  },
  async create(item: Partial<SocioRow>): Promise<SocioRow> {
    const { data, error } = await db.from("socios").insert(item).select().single();
    if (error) throw error;
    return data;
  },
  async update(id: string, updates: Partial<SocioRow>): Promise<SocioRow> {
    const { data, error } = await db.from("socios").update(updates).eq("id", id).select().single();
    if (error) throw error;
    return data;
  },
  async toggleActive(id: string, current: boolean): Promise<SocioRow> {
    const newStatus = current ? "Inativo" : "Ativo";
    return this.update(id, { status: newStatus });
  },
  async remove(id: string) {
    const { error } = await db.from("socios").delete().eq("id", id);
    if (error) throw error;
  },
};

// ── Saques ──
export interface SaqueRow {
  id: string;
  codigo: string;
  nome: string;
  tipo: string;
  valor: number;
  origem: string | null;
  data: string | null;
  conta: string | null;
  status: string | null;
  responsavel: string | null;
  is_demo: boolean;
  created_at: string | null;
  updated_at: string | null;
}

export const saqueService = {
  async getAll(): Promise<SaqueRow[]> {
    const { data, error } = await db.from("saques").select("*").order("created_at", { ascending: false });
    if (error) throw error;
    return data;
  },
  async create(item: Partial<SaqueRow>): Promise<SaqueRow> {
    const { data, error } = await db.from("saques").insert(item).select().single();
    if (error) throw error;
    return data;
  },
  async update(id: string, updates: Partial<SaqueRow>): Promise<SaqueRow> {
    const { data, error } = await db.from("saques").update(updates).eq("id", id).select().single();
    if (error) throw error;
    return data;
  },
  async toggleActive(id: string, current: boolean): Promise<SaqueRow> {
    const newStatus = current ? "Recusado" : "Aprovado";
    return this.update(id, { status: newStatus });
  },
  async remove(id: string) {
    const { error } = await db.from("saques").delete().eq("id", id);
    if (error) throw error;
  },
};

// ── Conteúdo ──
export interface ConteudoRow {
  id: string;
  tema: string;
  tipo: string | null;
  formato: string | null;
  canal: string | null;
  jogo: string | null;
  influencer: string | null;
  campanha: string | null;
  lp: string | null;
  status: string | null;
  prioridade: string | null;
  data: string | null;
  data_publicacao: string | null;
  responsavel: string | null;
  cta: string | null;
  roteiro: string | null;
  objetivo: string | null;
  observacoes: string | null;
  is_demo: boolean;
  created_at: string | null;
  updated_at: string | null;
}

export const conteudoService = {
  async getAll(): Promise<ConteudoRow[]> {
    const { data, error } = await db.from("conteudo").select("*").order("data", { ascending: true });
    if (error) throw error;
    return data;
  },
  async create(item: Partial<ConteudoRow>): Promise<ConteudoRow> {
    const { data, error } = await db.from("conteudo").insert(item).select().single();
    if (error) throw error;
    return data;
  },
  async update(id: string, updates: Partial<ConteudoRow>): Promise<ConteudoRow> {
    const { data, error } = await db.from("conteudo").update(updates).eq("id", id).select().single();
    if (error) throw error;
    return data;
  },
  async toggleActive(id: string, current: boolean): Promise<ConteudoRow> {
    const newStatus = current ? "Pausado" : "Ideia";
    return this.update(id, { status: newStatus });
  },
  async remove(id: string) {
    const { error } = await db.from("conteudo").delete().eq("id", id);
    if (error) throw error;
  },
};
