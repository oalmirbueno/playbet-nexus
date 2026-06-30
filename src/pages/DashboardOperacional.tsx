import { MousePointerClick, UserPlus, DollarSign, Wallet, FileText, Gamepad2, TrendingUp, ArrowRight, Target, Megaphone } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useInfluencers, useGames, usePlatforms, useLandingPages, useCampanhas, useSaques, useSocios, useConteudo } from "@/hooks/useSupabaseQuery";
import EmptyState from "@/components/EmptyState";

export default function DashboardOperacional() {
  const navigate = useNavigate();
  const { data: influencers } = useInfluencers();
  const { data: games } = useGames();
  const { data: platforms } = usePlatforms();
  const { data: landingPages } = useLandingPages();
  const { data: campanhas } = useCampanhas();
  const { data: saques } = useSaques();
  const { data: socios } = useSocios();
  const { data: conteudos } = useConteudo();

  const hasData = influencers.length > 0 || games.length > 0 || platforms.length > 0 || campanhas.length > 0;

  const widgets = [
    { label: "Influencers Ativos", value: String(influencers.filter((i: any) => i.is_active).length), icon: UserPlus, path: "/influencers" },
    { label: "Jogos Ativos", value: String(games.filter((g: any) => g.is_active).length), icon: Gamepad2, path: "/jogos" },
    { label: "Plataformas Ativas", value: String(platforms.filter((p: any) => p.is_active).length), icon: TrendingUp, path: "/plataformas" },
    { label: "Landing Pages", value: String(landingPages.length), icon: FileText, path: "/landing-pages" },
    { label: "Campanhas Ativas", value: String(campanhas.filter((c: any) => c.status === "Ativa").length), icon: Target, path: "/campanhas" },
    { label: "Saques Pendentes", value: String(saques.filter((s: any) => s.status === "Pendente").length), icon: DollarSign, path: "/saques" },
    { label: "Sócios", value: String(socios.length), icon: Wallet, path: "/socios" },
    { label: "Conteúdos", value: String(conteudos.length), icon: Megaphone, path: "/conteudo" },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard Operacional</h1>
        <p className="text-sm text-muted-foreground mt-1">Visão do dia a dia - ações e métricas operacionais</p>
      </div>

      {!hasData ? (
        <div className="glass-card">
          <EmptyState
            icon={MousePointerClick}
            title="Nenhuma atividade registrada"
            description="Comece cadastrando plataformas, jogos e influencers para acompanhar a operação em tempo real."
            actionLabel="Começar configuração"
            onAction={() => navigate("/")}
          />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {widgets.map((w) => (
              <div
                key={w.label}
                onClick={() => navigate(w.path)}
                className="glass-card p-6 cursor-pointer hover:bg-secondary/30 transition-all duration-200 group"
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">{w.label}</span>
                  <w.icon size={15} className="text-muted-foreground" />
                </div>
                <div className="text-2xl font-bold tracking-tight">{w.value}</div>
                {w.value === "0" && <span className="text-xs text-muted-foreground mt-1">Aguardando primeiros registros</span>}
              </div>
            ))}
          </div>

          <div className="glass-card p-6">
            <h3 className="text-sm font-semibold text-foreground mb-4">Atalhos rápidos</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {[
                { label: "Gerenciar Influencers", path: "/influencers" },
                { label: "Gerenciar Jogos", path: "/jogos" },
                { label: "Gerenciar Plataformas", path: "/plataformas" },
                { label: "Landing Pages", path: "/landing-pages" },
                { label: "UTMs / SubIDs", path: "/utms" },
                { label: "Templates de LP", path: "/lp-templates" },
                { label: "Campanhas", path: "/campanhas" },
                { label: "Conteúdo", path: "/conteudo" },
                { label: "Saques", path: "/saques" },
              ].map((item) => (
                <div
                  key={item.label}
                  onClick={() => navigate(item.path)}
                  className="flex items-center gap-3 p-3 rounded-lg bg-secondary/30 border border-border cursor-pointer hover:bg-secondary/50 transition-colors"
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
