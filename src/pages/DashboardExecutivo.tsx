import { useState } from "react";
import { DollarSign, Users, Wallet, BarChart3, Target, Zap, ArrowRight, Database, Trash2, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useInfluencers, useGames, usePlatforms } from "@/hooks/useSupabaseQuery";
import { useQueryClient } from "@tanstack/react-query";
import { seedDemoData, clearDemoData } from "@/services/seedDemoData";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import EmptyState from "@/components/EmptyState";

export default function DashboardExecutivo() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: influencers } = useInfluencers();
  const { data: games } = useGames();
  const { data: platforms } = usePlatforms();

  const [seeding, setSeeding] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);

  const hasData = influencers.length > 0 || games.length > 0 || platforms.length > 0;

  const handleSeed = async () => {
    setSeeding(true);
    try {
      await seedDemoData();
      queryClient.invalidateQueries();
      toast({ title: "Dados demo criados com sucesso!" });
    } catch (e: any) {
      toast({ title: "Erro ao criar dados demo", description: e.message, variant: "destructive" });
    } finally {
      setSeeding(false);
    }
  };

  const handleClear = async () => {
    setClearing(true);
    setConfirmClear(false);
    try {
      await clearDemoData();
      queryClient.invalidateQueries();
      toast({ title: "Todos os dados foram removidos" });
    } catch (e: any) {
      toast({ title: "Erro ao limpar dados", description: e.message, variant: "destructive" });
    } finally {
      setClearing(false);
    }
  };

  const kpis = [
    { label: "Total Influencers", value: String(influencers.length), icon: Users, path: "/influencers" },
    { label: "Influencers Ativos", value: String(influencers.filter(i => i.is_active).length), icon: Users, path: "/influencers" },
    { label: "Total Jogos", value: String(games.length), icon: Zap, path: "/jogos" },
    { label: "Jogos Ativos", value: String(games.filter(g => g.is_active).length), icon: Zap, path: "/jogos" },
    { label: "Total Plataformas", value: String(platforms.length), icon: Target, path: "/plataformas" },
    { label: "Plataformas Ativas", value: String(platforms.filter(p => p.is_active).length), icon: Target, path: "/plataformas" },
  ];

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard Executivo</h1>
          <p className="text-sm text-muted-foreground mt-1">Visão consolidada da operação — dados em tempo real</p>
        </div>
        <div className="flex items-center gap-2">
          {!hasData && (
            <Button onClick={handleSeed} disabled={seeding} size="sm">
              {seeding ? <Loader2 size={14} className="animate-spin" /> : <Database size={14} />}
              {seeding ? "Criando..." : "Povoar dados demo"}
            </Button>
          )}
          {hasData && (
            <Button onClick={() => setConfirmClear(true)} disabled={clearing} variant="destructive" size="sm">
              {clearing ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
              {clearing ? "Removendo..." : "Remover dados demo"}
            </Button>
          )}
        </div>
      </div>

      {!hasData ? (
        <div className="glass-card">
          <EmptyState
            icon={BarChart3}
            title="Sem dados para exibir ainda"
            description="Cadastre plataformas, jogos e influencers para visualizar métricas e indicadores consolidados da operação."
            actionLabel="Cadastrar Plataforma"
            onAction={() => navigate("/plataformas")}
            secondaryLabel="Cadastrar Influencer"
            onSecondary={() => navigate("/influencers")}
          />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {kpis.map((k) => (
              <div
                key={k.label}
                onClick={() => navigate(k.path)}
                className="glass-card p-6 border-l-2 border-l-primary cursor-pointer hover:bg-secondary/30 transition-all duration-200 group"
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">{k.label}</span>
                  <k.icon size={15} className="text-muted-foreground" />
                </div>
                <div className="text-2xl font-bold tracking-tight">{k.value}</div>
              </div>
            ))}
          </div>

          <div className="glass-card p-6">
            <h3 className="text-sm font-semibold text-foreground mb-4">Próximos passos</h3>
            <div className="space-y-2">
              {[
                { label: "Configurar links e UTMs para rastreamento", path: "/utms" },
                { label: "Criar landing pages para campanhas", path: "/landing-pages" },
                { label: "Iniciar monitoramento de conversões", path: "/conversoes" },
              ].map((item) => (
                <div
                  key={item.label}
                  onClick={() => navigate(item.path)}
                  className="flex items-center gap-3 p-3.5 rounded-lg bg-secondary/30 border border-border cursor-pointer hover:bg-secondary/50 transition-colors"
                >
                  <span className="text-sm flex-1">{item.label}</span>
                  <ArrowRight size={14} className="text-muted-foreground" />
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
