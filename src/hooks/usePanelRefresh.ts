import { useCallback, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

// Throttle: don't hammer the panel more than once per 60s per browser tab.
const REFRESH_THROTTLE_MS = 60_000;
let lastRefreshAt = 0;

const sb = supabase as any;

const sleep = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms));

async function invalidatePanelQueries(qc: ReturnType<typeof useQueryClient>) {
  await Promise.all([
    qc.invalidateQueries({ queryKey: ["tracking_metrics_summary"] }),
    qc.invalidateQueries({ queryKey: ["financeiro_metrics"] }),
    qc.invalidateQueries({ queryKey: ["tracking_metrics"] }),
    qc.invalidateQueries({ queryKey: ["tracking_events"] }),
    qc.invalidateQueries({ queryKey: ["platform_accounts"] }),
  ]);
}

async function pollPanelRuns(runIds: string[], qc: ReturnType<typeof useQueryClient>) {
  if (runIds.length === 0) return [];
  const deadline = Date.now() + 165_000;
  let rows: any[] = [];

  while (Date.now() < deadline) {
    const { data, error } = await sb
      .from("panel_scraper_runs")
      .select("id,status,rows_imported,message,discovery,finished_at")
      .in("id", runIds);
    if (error) throw error;
    rows = data ?? [];
    await invalidatePanelQueries(qc);
    if (rows.length === runIds.length && rows.every((row) => row.status !== "running")) break;
    await sleep(6_000);
  }

  return rows;
}

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
        const [estrelabet, vupi, smartico] = await Promise.allSettled([
          supabase.functions.invoke("affiliate-panel-scraper", { body: { brand: "estrelabet", extract: true } }),
          supabase.functions.invoke("affiliate-panel-scraper", { body: { brand: "vupi", extract: true } }),
          supabase.functions.invoke("tracking-puller-smartico", { body: { source: "manual", mode: "recent" } }),
        ]);
        for (const result of [estrelabet, vupi]) {
          if (result.status === "fulfilled" && result.value.error) throw result.value.error;
          if (result.status === "rejected") throw result.reason;
        }
        const runIds = [estrelabet, vupi]
          .map((result) => result.status === "fulfilled" ? (result.value.data as any)?.run_id : null)
          .filter(Boolean) as string[];
        const completedRuns = await pollPanelRuns(runIds, qc);
        await invalidatePanelQueries(qc);
        if (!opts.silent) {
          const imported = completedRuns.reduce((n, row) => n + Number(row?.rows_imported ?? 0), 0);
          const smarticoText = smartico.status === "fulfilled" && !smartico.value.error ? " · Smartico ok" : "";
          toast({
            title: "Painel sincronizado",
            description: `${imported} conta(s) reais atualizadas do painel${smarticoText}.`,
          });
        }
        return { ok: true, data: completedRuns };
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
