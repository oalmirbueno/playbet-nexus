import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Realtime bridge para o Dashboard/Desempenho/Financeiro.
 *
 * Escuta mudanças em tracking_metrics, tracking_events, tracking_links e
 * clicks — e invalida TODOS os caches relacionados. Isso garante que:
 *   • KPIs oficiais (tracking_metrics_summary, financeiro_metrics)
 *   • Consolidação por postbacks (tracking_consolidated_real_source)
 *   • Listas de eventos e links
 * atualizem sozinhos, sem F5, no instante em que um novo dado cai.
 */
export function useRealtimeMetrics() {
  const qc = useQueryClient();
  useEffect(() => {
    const bump = () => {
      qc.invalidateQueries({ queryKey: ["tracking_metrics"] });
      qc.invalidateQueries({ queryKey: ["tracking_metrics_summary"] });
      qc.invalidateQueries({ queryKey: ["financeiro_metrics"] });
      qc.invalidateQueries({ queryKey: ["tracking_consolidated_real_source"] });
      qc.invalidateQueries({ queryKey: ["tracking_events"] });
      qc.invalidateQueries({ queryKey: ["tracking_links"] });
      qc.invalidateQueries({ queryKey: ["clicks-all"] });
      qc.refetchQueries({ queryKey: ["tracking_metrics_summary"], type: "active" });
      qc.refetchQueries({ queryKey: ["financeiro_metrics"], type: "active" });
      qc.refetchQueries({ queryKey: ["tracking_consolidated_real_source"], type: "active" });
    };

    const channel = supabase
      .channel("tracking_realtime_bridge")
      .on("postgres_changes", { event: "*", schema: "public", table: "tracking_metrics" }, bump)
      .on("postgres_changes", { event: "*", schema: "public", table: "tracking_events" }, bump)
      .on("postgres_changes", { event: "*", schema: "public", table: "tracking_links" }, bump)
      .on("postgres_changes", { event: "*", schema: "public", table: "clicks" }, bump)
      .on("postgres_changes", { event: "*", schema: "public", table: "panel_scraper_runs" }, bump)
      .on("postgres_changes", { event: "*", schema: "public", table: "panel_reconciliations" }, bump)
      .subscribe();

    const onVisible = () => {
      if (document.visibilityState === "visible") bump();
    };
    window.addEventListener("focus", bump);
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      window.removeEventListener("focus", bump);
      document.removeEventListener("visibilitychange", onVisible);
      supabase.removeChannel(channel);
    };
  }, [qc]);
}
