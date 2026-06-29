import { supabase } from "@/integrations/supabase/client";
import type { SignalConfidence } from "./lpOpportunityService";

const db = supabase as any;

export type SignalChannel = "manual" | "telegram" | "whatsapp" | "grupo" | "api" | "outro";
export type SignalStatus = "novo" | "rascunho" | "publicado" | "descartado";

export interface LpSignalRow {
  id: string;
  raw_text: string;
  source_name: string | null;
  source_channel: SignalChannel;
  external_id: string | null;
  event_id: string | null;
  platform_id: string | null;
  market_type: string | null;
  market_name: string | null;
  odd_label: string | null;
  confidence: SignalConfidence;
  house_url: string | null;
  status: SignalStatus;
  draft_opportunity_id: string | null;
  received_at: string;
  metadata: Record<string, unknown>;
  created_at: string | null;
  updated_at: string | null;
}

export const lpSignalService = {
  async getAll(): Promise<LpSignalRow[]> {
    const { data, error } = await db
      .from("lp_signals")
      .select("*")
      .order("received_at", { ascending: false });
    if (error) throw error;
    return (data || []) as LpSignalRow[];
  },
  async getByStatus(status: SignalStatus): Promise<LpSignalRow[]> {
    const { data, error } = await db
      .from("lp_signals")
      .select("*")
      .eq("status", status)
      .order("received_at", { ascending: false });
    if (error) throw error;
    return (data || []) as LpSignalRow[];
  },
  async create(item: Partial<LpSignalRow>): Promise<LpSignalRow> {
    const { data, error } = await db.from("lp_signals").insert(item).select().single();
    if (error) throw error;
    return data as LpSignalRow;
  },
  async update(id: string, updates: Partial<LpSignalRow>): Promise<LpSignalRow> {
    const { data, error } = await db
      .from("lp_signals")
      .update(updates)
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return data as LpSignalRow;
  },
  async remove(id: string): Promise<void> {
    const { error } = await db.from("lp_signals").delete().eq("id", id);
    if (error) throw error;
  },
};
