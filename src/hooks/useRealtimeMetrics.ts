import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Escuta mudanças em tracking_metrics em tempo real e invalida os
 * caches dos dashboards para refletir imediatamente.
 */
export function useRealtimeMetrics() {
  const qc = useQueryClient();
  useEffect(() => {
    const channel = supabase
      .channel("tracking_metrics_live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "tracking_metrics" },
        () => {
          qc.invalidateQueries({ queryKey: ["tracking_metrics"] });
          qc.invalidateQueries({ queryKey: ["tracking_metrics_summary"] });
          qc.invalidateQueries({ queryKey: ["financeiro_metrics"] });
          qc.invalidateQueries({ queryKey: ["tracking_consolidated_real_source"] });
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [qc]);
}
