import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import DashboardLayout from "@/components/DashboardLayout";
import InfluencerPortalLayout from "@/components/InfluencerPortalLayout";
import ManagerLayout from "@/components/ManagerLayout";
import Login from "./pages/Login";
import DashboardExecutivo from "./pages/DashboardExecutivo";
import DashboardOperacional from "./pages/DashboardOperacional";
import Financeiro from "./pages/Financeiro";
import Saques from "./pages/Saques";
import Comissoes from "./pages/Comissoes";
import AsaasPagamentos from "./pages/AsaasPagamentos";
import Influencers from "./pages/Influencers";
import Pessoas from "./pages/Pessoas";
import InfluencerDetalhe from "./pages/InfluencerDetalhe";
import Socios from "./pages/Socios";
import SocioDetalhe from "./pages/SocioDetalhe";
import UsuariosInternos from "./pages/UsuariosInternos";
import Jogos from "./pages/Jogos";
import JogoDetalhe from "./pages/JogoDetalhe";
import PlataformasPage from "./pages/PlataformasPage";
import PlataformaDetalhe from "./pages/PlataformaDetalhe";
import CampanhaDetalhe from "./pages/CampanhaDetalhe";
import LinksAfiliados from "./pages/LinksAfiliados";
import LandingPagesPage from "./pages/LandingPagesPage";
import LPInstances from "./pages/LPInstances";
import LpOpportunities from "./pages/LpOpportunities";
import LPPerformance from "./pages/LPPerformance";
import LPTemplates from "./pages/LPTemplates";
import LinkEngine from "./pages/LinkEngine";
import HubsRotas from "./pages/HubsRotas";
import CalendarioEditorial from "./pages/CalendarioEditorial";
import Conteudo from "./pages/Conteudo";
import Estrategia from "./pages/Estrategia";
import Campanhas from "./pages/Campanhas";
import Analytics from "./pages/Analytics";
import Conversoes from "./pages/Conversoes";
import UtmsSubids from "./pages/UtmsSubids";
import Auditoria from "./pages/Auditoria";
import Configuracoes from "./pages/Configuracoes";
import RegrasFinanceiras from "./pages/RegrasFinanceiras";
import Permissoes from "./pages/Permissoes";
import Integracoes from "./pages/Integracoes";
import DeveloperSettings from "./pages/DeveloperSettings";
import TrackingDashboard from "./pages/TrackingDashboard";
import TrackingAccounts from "./pages/TrackingAccounts";
import TrackingMetricsForm from "./pages/TrackingMetricsForm";
import TrackingMappings from "./pages/TrackingMappings";
import TrackingEvents from "./pages/TrackingEvents";
import TrackingSnapshots from "./pages/TrackingSnapshots";
import TrackingLinks from "./pages/TrackingLinks";
import Reconciliacao from "./pages/Reconciliacao";
import NotFound from "./pages/NotFound";
import InfluencerLanding from "./pages/InfluencerLanding";
import ComercialPipeline from "./pages/ComercialPipeline";
import ComercialSquads from "./pages/ComercialSquads";
import ComercialQualificacao from "./pages/ComercialQualificacao";
import PortalHome from "./pages/portal/PortalHome";
import PortalLinks from "./pages/portal/PortalLinks";
import PortalFinanceiro from "./pages/portal/PortalFinanceiro";
import PortalSaques from "./pages/portal/PortalSaques";
import PortalPerfil from "./pages/portal/PortalPerfil";
import GerenteHome from "./pages/gerente/GerenteHome";
import GerenteRanking from "./pages/gerente/GerenteRanking";
import GerenteInfluenciadores from "./pages/gerente/GerenteInfluenciadores";
import GerenteLinks from "./pages/gerente/GerenteLinks";
import GerenteOportunidades from "./pages/gerente/GerenteOportunidades";
import GerentePerfil from "./pages/gerente/GerentePerfil";

const queryClient = new QueryClient();

function AdminRoutes() {
  return (
    <DashboardLayout>
      <Routes>
        <Route path="/" element={<DashboardExecutivo />} />
        <Route path="/operacional" element={<DashboardOperacional />} />
        <Route path="/financeiro" element={<Financeiro />} />
        <Route path="/saques" element={<Saques />} />
        <Route path="/comissoes" element={<Comissoes />} />
        <Route path="/asaas" element={<AsaasPagamentos />} />
        <Route path="/influencers" element={<Influencers />} />
        <Route path="/pessoas" element={<Pessoas />} />
        <Route path="/influencers/:id" element={<InfluencerDetalhe />} />
        <Route path="/socios" element={<Socios />} />
        <Route path="/socios/:id" element={<SocioDetalhe />} />
        <Route path="/usuarios" element={<UsuariosInternos />} />
        <Route path="/jogos" element={<Jogos />} />
        <Route path="/jogos/:id" element={<JogoDetalhe />} />
        <Route path="/plataformas" element={<PlataformasPage />} />
        <Route path="/plataformas/:id" element={<PlataformaDetalhe />} />
        <Route path="/links" element={<LinksAfiliados />} />
        <Route path="/landing-pages" element={<LandingPagesPage />} />
        <Route path="/lp-instances" element={<LPInstances />} />
        <Route path="/lp-opportunities" element={<LpOpportunities />} />
        <Route path="/lp-performance" element={<LPPerformance />} />
        <Route path="/lp-templates" element={<LPTemplates />} />
        <Route path="/link-engine" element={<LinkEngine />} />
        <Route path="/hubs" element={<HubsRotas />} />
        <Route path="/calendario" element={<CalendarioEditorial />} />
        <Route path="/conteudo" element={<Conteudo />} />
        <Route path="/estrategia" element={<Estrategia />} />
        <Route path="/campanhas" element={<Campanhas />} />
        <Route path="/campanhas/:id" element={<CampanhaDetalhe />} />
        <Route path="/analytics" element={<Analytics />} />
        <Route path="/conversoes" element={<Conversoes />} />
        <Route path="/utms" element={<UtmsSubids />} />
        <Route path="/auditoria" element={<Auditoria />} />
        <Route path="/configuracoes" element={<Configuracoes />} />
        <Route path="/regras" element={<RegrasFinanceiras />} />
        <Route path="/permissoes" element={<Permissoes />} />
        <Route path="/integracoes" element={<Integracoes />} />
        <Route path="/developer" element={<DeveloperSettings />} />
        <Route path="/tracking" element={<TrackingDashboard />} />
        <Route path="/tracking/accounts" element={<TrackingAccounts />} />
        <Route path="/tracking/metrics" element={<TrackingMetricsForm />} />
        <Route path="/tracking/mappings" element={<TrackingMappings />} />
        <Route path="/tracking/events" element={<TrackingEvents />} />
        <Route path="/tracking/snapshots" element={<TrackingSnapshots />} />
        <Route path="/tracking/links" element={<TrackingLinks />} />
        <Route path="/tracking/reconciliacao" element={<Reconciliacao />} />
        <Route path="/comercial" element={<ComercialPipeline />} />
        <Route path="/comercial/squads" element={<ComercialSquads />} />
        <Route path="/comercial/qualificacao" element={<ComercialQualificacao />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </DashboardLayout>
  );
}

function PortalRoutes() {
  return (
    <InfluencerPortalLayout>
      <Routes>
        <Route path="/portal" element={<PortalHome />} />
        <Route path="/portal/links" element={<PortalLinks />} />
        <Route path="/portal/financeiro" element={<PortalFinanceiro />} />
        <Route path="/portal/saques" element={<PortalSaques />} />
        <Route path="/portal/perfil" element={<PortalPerfil />} />
        <Route path="*" element={<Navigate to="/portal" replace />} />
      </Routes>
    </InfluencerPortalLayout>
  );
}

function ManagerRoutes() {
  return (
    <ManagerLayout>
      <Routes>
        <Route path="/gerente" element={<GerenteHome />} />
        <Route path="/gerente/ranking" element={<GerenteRanking />} />
        <Route path="/gerente/influenciadores" element={<GerenteInfluenciadores />} />
        <Route path="/gerente/pipeline" element={<GerentePipeline />} />
        <Route path="/gerente/perfil" element={<GerentePerfil />} />
        <Route path="/influencers/:id" element={<InfluencerDetalhe />} />
        <Route path="*" element={<Navigate to="/gerente" replace />} />
      </Routes>
    </ManagerLayout>
  );
}

function ProtectedRoutes() {
  const { user, loading, effectiveRole } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground text-sm">Carregando painel...</div>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  if (effectiveRole === "influencer") return <PortalRoutes />;
  if (effectiveRole === "gerente") return <ManagerRoutes />;
  return <AdminRoutes />;
}

const PAINEL_HOSTS = ["painelcentral.playbet.app.br", "localhost", "127.0.0.1"];
const PAINEL_HOST_SUFFIXES = [".lovable.app", ".lovableproject.com", ".lovable.dev"];

function isPainelHost(host: string): boolean {
  const h = host.split(":")[0].toLowerCase();
  if (PAINEL_HOSTS.includes(h)) return true;
  return PAINEL_HOST_SUFFIXES.some((suf) => h.endsWith(suf));
}

const App = () => {
  const lpHost = typeof window !== "undefined" && !isPainelHost(window.location.hostname);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            {lpHost ? (
              <Routes>
                <Route path="/:slug" element={<InfluencerLanding />} />
                <Route path="/i/:slug" element={<InfluencerLanding />} />
                <Route path="*" element={<InfluencerLanding />} />
              </Routes>
            ) : (
              <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/i/:slug" element={<InfluencerLanding />} />
                <Route path="*" element={<ProtectedRoutes />} />
              </Routes>
            )}
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
