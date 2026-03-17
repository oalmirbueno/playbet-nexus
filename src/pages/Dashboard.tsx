import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { MousePointerClick, UserPlus, DollarSign, Gamepad2, Monitor, Users, Link2, FileText, ArrowRight, CheckCircle, Database, Trash2, Loader2 } from "lucide-react";
import TrackingOverviewCard from "@/components/TrackingOverviewCard";
import { useAutoConsolidation } from "@/hooks/useAutoConsolidation";
import { useInfluencers, useGames, usePlatforms, useLandingPages, useTemplates, useUtms, useCampanhas, useSocios, useSaques, useConteudo } from "@/hooks/useSupabaseQuery";
import { useQueryClient } from "@tanstack/react-query";
import { seedDemoData, clearDemoData } from "@/services/seedDemoData";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";

const steps = [
  { label: "Cadastrar primeira plataforma", path: "/plataformas", icon: Monitor, key: "platforms" },
  { label: "Cadastrar primeiro jogo", path: "/jogos", icon: Gamepad2, key: "games" },
  { label: "Cadastrar primeiro influencer", path: "/influencers", icon: Users, key: "influencers" },
  { label: "Criar primeiro template de LP", path: "/lp-templates", icon: FileText, key: "templates" },
  { label: "Criar primeira landing page", path: "/landing-pages", icon: Link2, key: "landingPages" },
  { label: "Criar primeira UTM", path: "/utms", icon: MousePointerClick, key: "utms" },
];

export default function Dashboard() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  const [seeding, setSeeding] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);

  const { data: influencers } = useInfluencers();
  const { data: games } = useGames();
  const { data: platforms } = usePlatforms();
  const { data: landingPages } = useLandingPages();
  const { data: templates } = useTemplates();
  const { data: utms } = useUtms();
  const { data: campanhas } = useCampanhas();
  const { data: socios } = useSocios();
  const { data: saques } = useSaques();
  const { data: conteudos } = useConteudo();
  const { consolidated, hasData: hasTrackingData } = useAutoConsolidation();

  const counts: Record<string, number> = {
    platforms: platforms.length,
    games: games.length,
    influencers: influencers.length,
    templates: templates.length,
    landingPages: landingPages.length,
    utms: utms.length,
    campanhas: campanhas.length,
    socios: socios.length,
    saques: saques.length,
    conteudo: conteudos.length,
  };

  const totalItems = Object.values(counts).reduce((a, b) => a + b, 0);

  const handleSeed = async () => {
    setSeeding(true);
    try {
      await seedDemoData();
      await queryClient.invalidateQueries();
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

  const completedSteps = steps.filter(s => counts[s.key] > 0).length;
  const allDone = completedSteps === steps.length;

  const formatBRL = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  // Summary stats - only show meaningful ones
  const stats = [
    { label: "Plataformas", value: String(platforms.length), icon: Monitor },
    { label: "Jogos", value: String(games.length), icon: Gamepad2 },
    { label: "Influencers", value: String(influencers.length), icon: Users },
    { label: "Landing Pages", value: String(landingPages.length), icon: FileText },
    { label: "UTMs / SubIDs", value: String(utms.length), icon: MousePointerClick },
    { label: "Campanhas", value: String(campanhas.length), icon: UserPlus },
  ];

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">Visão geral consolidada da operação</p>
        </div>
        <div className="flex items-center gap-2">
          {totalItems === 0 && (
            <Button onClick={handleSeed} disabled={seeding} size="sm">
              {seeding ? <Loader2 size={14} className="animate-spin" /> : <Database size={14} />}
              {seeding ? "Criando..." : "Povoar dados demo"}
            </Button>
          )}
          {totalItems > 0 && (
            <Button onClick={() => setConfirmClear(true)} disabled={clearing} variant="destructive" size="sm">
              {clearing ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
              {clearing ? "Removendo..." : "Remover dados demo"}
            </Button>
          )}
        </div>
      </div>

      {/* Tracking Revenue Summary - when real tracking data exists */}
      {hasTrackingData && (consolidated.latestWithdrawableOriginal ?? consolidated.latestWithdrawableBrl ?? 0) > 0 && (
        <div className="glass-card p-6 border-l-4 border-l-primary cursor-pointer hover:bg-secondary/20 transition-colors" onClick={() => navigate("/tracking")}>
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-sm font-semibold">Saldo Plataforma (Tracking)</h3>
              <p className="text-[10px] text-muted-foreground">Saldo real reportado pela plataforma</p>
            </div>
            <ArrowRight size={14} className="text-muted-foreground" />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <p className="text-[10px] text-muted-foreground uppercase">Saldo</p>
              <p className="text-lg font-bold text-primary">
                {consolidated.latestWithdrawableCurrency && consolidated.latestWithdrawableCurrency !== "BRL" && consolidated.latestWithdrawableOriginal != null
                  ? consolidated.latestWithdrawableOriginal.toLocaleString("pt-BR", { style: "currency", currency: "USD" })
                  : formatBRL(consolidated.latestWithdrawableBrl || 0)}
              </p>
              {consolidated.latestWithdrawableCurrency !== "BRL" && consolidated.latestWithdrawableBrl != null && (
                <p className="text-[10px] text-muted-foreground">≈ {formatBRL(consolidated.latestWithdrawableBrl)}</p>
              )}
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground uppercase">Cliques reais</p>
              <p className="text-lg font-bold">{consolidated.realClicksCount}</p>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground uppercase">Eventos válidos</p>
              <p className="text-lg font-bold">{consolidated.eventCount}</p>
            </div>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {stats.map((s) => (
          <div key={s.label} className="glass-card p-6 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">{s.label}</span>
              <s.icon size={15} className="text-muted-foreground" />
            </div>
            <div className="text-2xl font-bold tracking-tight">{s.value}</div>
            {Number(s.value) === 0 && <span className="text-xs text-muted-foreground">Sem dados ainda</span>}
          </div>
        ))}
      </div>

      {/* Tracking Hub Overview */}
      <TrackingOverviewCard />

      {/* Setup checklist - only show if not complete */}
      {!allDone && (
        <div className="glass-card p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-sm font-semibold text-foreground">Progresso da configuração</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                {completedSteps}/{steps.length} etapas concluídas
              </p>
            </div>
            <div className="text-xs text-muted-foreground bg-secondary px-3 py-1.5 rounded-lg font-medium">
              {Math.round((completedSteps / steps.length) * 100)}%
            </div>
          </div>
          <div className="w-full h-1.5 bg-secondary rounded-full mb-6 overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-500"
              style={{ width: `${(completedSteps / steps.length) * 100}%` }}
            />
          </div>
          <div className="space-y-2">
            {steps.map((step) => {
              const done = counts[step.key] > 0;
              return (
                <div
                  key={step.key}
                  onClick={() => !done && navigate(step.path)}
                  className={`flex items-center gap-3 p-3.5 rounded-lg transition-colors ${done ? "bg-success/5 border border-success/10" : "bg-secondary/30 border border-border cursor-pointer hover:bg-secondary/50"}`}
                >
                  {done ? (
                    <CheckCircle size={16} className="text-success shrink-0" />
                  ) : (
                    <step.icon size={16} className="text-muted-foreground shrink-0" />
                  )}
                  <span className={`text-sm flex-1 ${done ? "text-muted-foreground line-through" : "font-medium"}`}>
                    {step.label}
                  </span>
                  {done ? (
                    <span className="text-xs text-success font-medium">{counts[step.key]} cadastrado(s)</span>
                  ) : (
                    <ArrowRight size={14} className="text-muted-foreground" />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Confirm clear dialog */}
      <Dialog open={confirmClear} onOpenChange={setConfirmClear}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remover todos os dados demo?</DialogTitle>
            <DialogDescription>
              Isso apagará permanentemente todos os registros de plataformas, jogos, influencers, landing pages, templates, UTMs e cliques. Essa ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmClear(false)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleClear}>Sim, remover tudo</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
