import { useCallback, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

// Throttle: don't hammer the panel more than once per 60s per browser tab.
const REFRESH_THROTTLE_MS = 60_000;
let lastRefreshAt = 0;

/**
 * Dispara sincronização com o painel afiliado HTML e invalida os
 * caches de métricas / balances. Use em botões "Atualizar" nas telas de
 * Dashboard, Financeiro, Portal e Gerente.
 */
export function usePanelRefresh() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const refresh = useCallback(
    async (opts: { silent?: boolean; days?: number } = {}) => {
      const now = Date.now();
      if (now - lastRefreshAt < REFRESH_THROTTLE_MS) {
        if (!opts.silent) {
          toast({
            title: "Aguarde um instante",
            description: "Última sincronização foi há menos de 1 minuto.",
          });
        }
        return { ok: false, throttled: true };
      }
      lastRefreshAt = now;
      setIsRefreshing(true);
      try {
        const [panel, smartico] = await Promise.allSettled([
          supabase.functions.invoke("affiliate-panel-scraper", { body: { brand: "all", extract: true } }),
          supabase.functions.invoke("tracking-puller-smartico", { body: { source: "manual", mode: "recent" } }),
        ]);
        if (panel.status === "fulfilled" && panel.value.error) throw panel.value.error;
        if (panel.status === "rejected") throw panel.reason;
        await Promise.all([
          qc.invalidateQueries({ queryKey: ["tracking_metrics_summary"] }),
          qc.invalidateQueries({ queryKey: ["financeiro_metrics"] }),
          qc.invalidateQueries({ queryKey: ["tracking_metrics"] }),
          qc.invalidateQueries({ queryKey: ["tracking_events"] }),
          qc.invalidateQueries({ queryKey: ["platform_accounts"] }),
        ]);
        if (!opts.silent) {
          const panelData = panel.status === "fulfilled" ? panel.value.data as any : null;
          const imported = Object.values(panelData?.results ?? {}).reduce((n: number, r: any) => n + Number(r?.updatedMetrics ?? 0), 0);
          const smarticoText = smartico.status === "fulfilled" && !smartico.value.error ? " · Smartico ok" : "";
          toast({
            title: "Painel sincronizado",
            description: `${imported} métrica(s) reais atualizadas${smarticoText}.`,
          });
        }
        return { ok: true, data: panel.status === "fulfilled" ? panel.value.data : null };
      } catch (e: any) {
        if (!opts.silent) {
          toast({
            title: "Erro ao sincronizar",
            description: e?.message ?? "Tente novamente em instantes.",
            variant: "destructive",
          });
        }
        return { ok: false, error: e };
      } finally {
        setIsRefreshing(false);
      }
    },
    [qc, toast],
  );

  return { refresh, isRefreshing };
}
