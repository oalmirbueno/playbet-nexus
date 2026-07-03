import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, RefreshCw } from "lucide-react";
import Breadcrumbs from "@/components/Breadcrumbs";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { useFinanceiroData, type PeriodKey } from "@/hooks/useFinanceiroData";
import { useRealtimeMetrics } from "@/hooks/useRealtimeMetrics";
import { useSocios } from "@/hooks/useSupabaseQuery";
import PeriodFilter from "@/components/financeiro/PeriodFilter";
import KpiDuo from "@/components/financeiro/KpiDuo";
import RankingTable from "@/components/financeiro/RankingTable";
import SaquesTab from "@/components/financeiro/SaquesTab";
import DistributionCard from "@/components/DistributionCard";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";


export default function Financeiro() {
  const [params, setParams] = useSearchParams();
  const period = (params.get("p") ?? "30d") as PeriodKey;
  const platformId = params.get("plat") ?? "all";
  const activeTab = params.get("tab") ?? "distribuicao";
  const queryClient = useQueryClient();
  const [syncing, setSyncing] = useState(false);
  const { data: socios } = useSocios();
  useRealtimeMetrics();

  const setParam = (k: string, v: string) => {
    const next = new URLSearchParams(params);
    next.set(k, v);
    setParams(next, { replace: true });
  };

  const {
    range, isLoading,
    caixaRealizado, revenueTracking, diff,
    saquesInPeriod, rankingInfluencers, rankingStreamers, rankingGerentes,
    platforms, distribution, trackingTotals,
  } = useFinanceiroData({ period, platformId: platformId === "all" ? null : platformId });

  const handleSync = async () => {
    setSyncing(true);
    try {
      await Promise.allSettled([
        supabase.functions.invoke("stellar-panel-scraper", { body: { days: 30 } }),
        supabase.functions.invoke("tracking-puller-smartico", { body: {} }),
      ]);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["financeiro_metrics"] }),
        queryClient.invalidateQueries({ queryKey: ["tracking_metrics_summary"] }),
        queryClient.invalidateQueries({ queryKey: ["tracking_metrics"] }),
      ]);
      toast({ title: "Painéis sincronizados" });
    } catch (e: any) {
      toast({ title: "Erro ao sincronizar", description: e?.message, variant: "destructive" });
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <Breadcrumbs items={[{ label: "Financeiro" }]} />

      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Financeiro</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Caixa real, revenue atribuído, ranking de geração e distribuição automática — atualização em tempo real.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button onClick={handleSync} disabled={syncing} size="sm" variant="outline">
            {syncing ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
            {syncing ? "Sincronizando…" : "Atualizar agora"}
          </Button>
          <PeriodFilter
            period={period}
            onPeriodChange={(v) => setParam("p", v)}
            platformId={platformId}
            onPlatformChange={(v) => setParam("plat", v)}
            platforms={platforms as any}
          />
        </div>
      </header>


      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
        </div>
      ) : (
        <KpiDuo
          caixa={caixaRealizado}
          revenue={revenueTracking}
          diff={diff}
          periodLabel={range.label}
          revShare={trackingTotals.revShare}
          cpa={trackingTotals.cpa}
          deposits={trackingTotals.depositsTotal}
          registrations={trackingTotals.registrations}
          ftd={trackingTotals.ftd}
        />
      )}

      <Tabs value={activeTab} onValueChange={(v) => setParam("tab", v)}>
        <TabsList className="flex md:grid md:grid-cols-5 md:w-auto md:inline-grid w-full justify-start">
          <TabsTrigger value="distribuicao">Distribuição</TabsTrigger>
          <TabsTrigger value="influencers">
            Influencers
            {rankingInfluencers.length > 0 && (
              <span className="ml-2 text-[10px] text-muted-foreground">{rankingInfluencers.length}</span>
            )}
          </TabsTrigger>
          <TabsTrigger value="streamers">
            Streamers
            {rankingStreamers.length > 0 && (
              <span className="ml-2 text-[10px] text-muted-foreground">{rankingStreamers.length}</span>
            )}
          </TabsTrigger>
          <TabsTrigger value="gerentes">
            Gerentes
            {rankingGerentes.length > 0 && (
              <span className="ml-2 text-[10px] text-muted-foreground">{rankingGerentes.length}</span>
            )}
          </TabsTrigger>
          <TabsTrigger value="saques">
            Saques
            {saquesInPeriod.length > 0 && (
              <span className="ml-2 text-[10px] text-muted-foreground">{saquesInPeriod.length}</span>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="distribuicao" className="mt-6">
          <DistributionCard
            breakdown={distribution}
            socios={socios as any}
            sourceLabel={`Rev + CPA · ${range.label.toLowerCase()}`}
          />
        </TabsContent>

        <TabsContent value="influencers" className="mt-6">
          <RankingTable
            rows={rankingInfluencers}
            title="Quem gerou mais dinheiro · Influencers"
            subjectLabel="Influencer"
            emptyMessage="Nenhum revenue atribuído a influencers no período."
          />
        </TabsContent>

        <TabsContent value="streamers" className="mt-6">
          <RankingTable
            rows={rankingStreamers}
            title="Quem gerou mais dinheiro · Streamers"
            subjectLabel="Streamer"
            emptyMessage="Nenhum streamer com revenue atribuído. Marque a pessoa como Streamer no cadastro para separá-la dos influencers."
          />
        </TabsContent>

        <TabsContent value="gerentes" className="mt-6">
          <RankingTable
            rows={rankingGerentes}
            title="Quem gerou mais dinheiro · Gerentes"
            subjectLabel="Gerente"
            emptyMessage="Nenhum gerente com revenue atribuído no período."
          />
        </TabsContent>

        <TabsContent value="saques" className="mt-6">
          <SaquesTab saques={saquesInPeriod} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
