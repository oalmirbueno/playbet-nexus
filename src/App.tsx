import { Suspense, lazy } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import InfluencerLanding from "./pages/InfluencerLanding";

const AppPanel = lazy(() => import("./AppPanel"));

const queryClient = new QueryClient();

const PAINEL_HOSTS = ["painelcentral.playbet.app.br", "localhost", "127.0.0.1"];
const PAINEL_HOST_SUFFIXES = [".lovable.app", ".lovableproject.com", ".lovable.dev"];

function isPainelHost(host: string): boolean {
  const h = host.split(":")[0].toLowerCase();
  if (PAINEL_HOSTS.includes(h)) return true;
  return PAINEL_HOST_SUFFIXES.some((suf) => h.endsWith(suf));
}

export default function App() {
  const lpHost = typeof window !== "undefined" && !isPainelHost(window.location.hostname);

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        {lpHost ? (
          <Routes>
            <Route path="/:slug" element={<InfluencerLanding />} />
            <Route path="/i/:slug" element={<InfluencerLanding />} />
            <Route path="*" element={<InfluencerLanding />} />
          </Routes>
        ) : (
          <Suspense fallback={<div className="min-h-screen bg-background" />}>
            <AppPanel />
          </Suspense>
        )}
      </BrowserRouter>
    </QueryClientProvider>
  );
}