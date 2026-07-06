import { useCallback, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

// Throttle: don't hammer the panel more than once per 60s per browser tab.
const REFRESH_THROTTLE_MS = 60_000;
let lastRefreshAt = 0;

/**
 * Dispara sincronização com o painel afiliado (Stellar) e invalida os
 * caches de métricas / balances. Use em botões "Atualizar" nas telas de
 * Dashboard, Financeiro, Portal e Gerente.
 *
 * TODO(affiliate-scraper): quando o `affiliate-panel-scraper` entrar em
 * produção, trocar o nome da função invocada aqui.
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
        const { data, error } = await supabase.functions.invoke(
          "stellar-panel-scraper",
          { body: { days: opts.days ?? 7 } },
        );
        if (error) throw error;
        await Promise.all([
          qc.invalidateQueries({ queryKey: ["tracking_metrics_summary"] }),
          qc.invalidateQueries({ queryKey: ["financeiro"] }),
          qc.invalidateQueries({ queryKey: ["tracking_metrics"] }),
          qc.invalidateQueries({ queryKey: ["platform_accounts"] }),
        ]);
        if (!opts.silent) {
          toast({
            title: "Painel sincronizado",
            description: `${data?.rows ?? 0} linhas atualizadas.`,
          });
        }
        return { ok: true, data };
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
