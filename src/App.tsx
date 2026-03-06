import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import DashboardLayout from "@/components/DashboardLayout";
import DashboardExecutivo from "./pages/DashboardExecutivo";
import DashboardOperacional from "./pages/DashboardOperacional";
import Financeiro from "./pages/Financeiro";
import Saques from "./pages/Saques";
import Comissoes from "./pages/Comissoes";
import AsaasPagamentos from "./pages/AsaasPagamentos";
import Influencers from "./pages/Influencers";
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
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="*" element={
            <DashboardLayout>
              <Routes>
                <Route path="/" element={<DashboardExecutivo />} />
                <Route path="/operacional" element={<DashboardOperacional />} />
                <Route path="/financeiro" element={<Financeiro />} />
                <Route path="/saques" element={<Saques />} />
                <Route path="/comissoes" element={<Comissoes />} />
                <Route path="/asaas" element={<AsaasPagamentos />} />
                <Route path="/influencers" element={<Influencers />} />
                <Route path="/influencers/:id" element={<InfluencerDetalhe />} />
                <Route path="/socios" element={<Socios />} />
                <Route path="/socios/:id" element={<SocioDetalhe />} />
                <Route path="/usuarios" element={<UsuariosInternos />} />
                <Route path="/jogos" element={<Jogos />} />
                <Route path="/plataformas" element={<PlataformasPage />} />
                <Route path="/links" element={<LinksAfiliados />} />
                <Route path="/landing-pages" element={<LandingPagesPage />} />
                <Route path="/lp-templates" element={<LPTemplates />} />
                <Route path="/link-engine" element={<LinkEngine />} />
                <Route path="/hubs" element={<HubsRotas />} />
                <Route path="/calendario" element={<CalendarioEditorial />} />
                <Route path="/conteudo" element={<Conteudo />} />
                <Route path="/estrategia" element={<Estrategia />} />
                <Route path="/campanhas" element={<Campanhas />} />
                <Route path="/analytics" element={<Analytics />} />
                <Route path="/conversoes" element={<Conversoes />} />
                <Route path="/utms" element={<UtmsSubids />} />
                <Route path="/auditoria" element={<Auditoria />} />
                <Route path="/configuracoes" element={<Configuracoes />} />
                <Route path="/regras" element={<RegrasFinanceiras />} />
                <Route path="/permissoes" element={<Permissoes />} />
                <Route path="/integracoes" element={<Integracoes />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </DashboardLayout>
          } />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
