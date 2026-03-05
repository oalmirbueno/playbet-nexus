import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import DashboardLayout from "@/components/DashboardLayout";
import Dashboard from "./pages/Dashboard";
import Financeiro from "./pages/Financeiro";
import Influencers from "./pages/Influencers";
import Socios from "./pages/Socios";
import Jogos from "./pages/Jogos";
import PlataformasPage from "./pages/PlataformasPage";
import LinksAfiliados from "./pages/LinksAfiliados";
import LandingPagesPage from "./pages/LandingPagesPage";
import Conteudo from "./pages/Conteudo";
import Metricas from "./pages/Metricas";
import Saques from "./pages/Saques";
import Configuracoes from "./pages/Configuracoes";
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
                <Route path="/" element={<Dashboard />} />
                <Route path="/financeiro" element={<Financeiro />} />
                <Route path="/influencers" element={<Influencers />} />
                <Route path="/socios" element={<Socios />} />
                <Route path="/jogos" element={<Jogos />} />
                <Route path="/plataformas" element={<PlataformasPage />} />
                <Route path="/links-afiliados" element={<LinksAfiliados />} />
                <Route path="/landing-pages" element={<LandingPagesPage />} />
                <Route path="/conteudo" element={<Conteudo />} />
                <Route path="/metricas" element={<Metricas />} />
                <Route path="/saques" element={<Saques />} />
                <Route path="/configuracoes" element={<Configuracoes />} />
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
