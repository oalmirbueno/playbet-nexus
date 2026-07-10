import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

type Scope = { influencerId?: string | null; managerId?: string | null };

/**
 * Subscribes to the tables that drive the influencer/manager panels
 * and calls `onChange(table)` when any relevant row changes.
 * A single channel per component instance; torn down on unmount.
 */
export function usePortalRealtime(scope: Scope, onChange: (table: string) => void) {
  const { influencerId, managerId } = scope;

  useEffect(() => {
    if (!influencerId && !managerId) return;

    const channel = supabase.channel(`portal-rt-${influencerId ?? managerId}`);

    const tables = ["tracking_metrics", "tracking_links", "link_materials", "saques", "notifications", "clicks"];
    for (const table of tables) {
      const filter = influencerId ? `influencer_id=eq.${influencerId}` : undefined;
      channel.on(
        "postgres_changes" as any,
        { event: "*", schema: "public", table, ...(filter ? { filter } : {}) },
        () => onChange(table),
      );
    }

    channel.subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [influencerId, managerId]);
}
