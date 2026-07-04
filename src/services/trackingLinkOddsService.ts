import { supabase } from "@/integrations/supabase/client";

export type OddsBetType = "single" | "multipla" | "sistema";
export type OddsStatus = "open" | "live" | "won" | "lost" | "void" | "cashout";

export interface OddsSelection {
  event: string;
  market: string;
  pick: string;
  odd: number;
  starts_at?: string | null;
}

export interface TrackingLinkOddsRow {
  id: string;
  tracking_link_id: string;
  platform_id: string | null;
  bet_type: OddsBetType;
  total_odd: number | null;
  stake_suggested: number | null;
  selections: OddsSelection[];
  bookmaker_share_url: string | null;
  screenshot_url: string | null;
  event_starts_at: string | null;
  event_label: string | null;
  status: OddsStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export async function getOddsByLink(trackingLinkId: string): Promise<TrackingLinkOddsRow | null> {
  const { data, error } = await (supabase as any)
    .from("tracking_link_odds")
    .select("*")
    .eq("tracking_link_id", trackingLinkId)
    .maybeSingle();
  if (error) throw error;
  return (data ?? null) as TrackingLinkOddsRow | null;
}

export async function upsertOdds(payload: Partial<TrackingLinkOddsRow> & { tracking_link_id: string }): Promise<TrackingLinkOddsRow> {
  const clean: any = { ...payload };
  if (!clean.selections) clean.selections = [];
  const { data, error } = await (supabase as any)
    .from("tracking_link_odds")
    .upsert(clean, { onConflict: "tracking_link_id" })
    .select("*")
    .single();
  if (error) throw error;
  return data as TrackingLinkOddsRow;
}

/** Auto-computes total odd from a list of legs (product of odds). */
export function computeTotalOdd(selections: OddsSelection[]): number {
  if (!selections?.length) return 0;
  return Number(
    selections.reduce((acc, s) => acc * (Number(s.odd) || 1), 1).toFixed(2),
  );
}
