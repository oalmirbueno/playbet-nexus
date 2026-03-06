import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import type { InfluencerRow } from "@/services/supabaseService";
import { Gamepad2, Star, Shield, ArrowRight, Zap, Trophy, Gift } from "lucide-react";
import logo from "@/assets/logo.png";

type LoadState = "loading" | "ready" | "not_found" | "inactive";

export default function InfluencerLanding() {
  const { slug } = useParams<{ slug: string }>();
  const [state, setState] = useState<LoadState>("loading");
  const [influencer, setInfluencer] = useState<InfluencerRow | null>(null);
  const [clicking, setClicking] = useState(false);

  useEffect(() => {
    if (!slug) { setState("not_found"); return; }
    (async () => {
      const { data, error } = await supabase
        .from("influencers")
        .select("*")
        .eq("slug", slug)
        .single();
      if (error || !data) { setState("not_found"); return; }
      if (!data.is_active) { setState("inactive"); return; }
      setInfluencer(data);
      setState("ready");
    })();
  }, [slug]);

  const handleCTA = async () => {
    if (!influencer || clicking) return;
    setClicking(true);
    const link = influencer.affiliate_link;

    // Register click, then redirect regardless of success
    try {
      await supabase.from("clicks").insert({
        influencer_id: influencer.id,
        clicked_at: new Date().toISOString(),
        user_agent: navigator.userAgent,
        referrer: document.referrer || null,
        route: `/i/${slug}`,
        source: "public_landing",
      });
    } catch {
      // Don't block redirect on tracking failure
    }

    if (link) {
      window.location.href = link;
    } else {
      setClicking(false);
    }
  };

  // ── Loading ──
  if (state === "loading") {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-500" />
      </div>
    );
  }

  // ── Not Found ──
  if (state === "not_found") {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex flex-col items-center justify-center text-white px-6 text-center">
        <img src={logo} alt="PlayBet" className="h-10 mb-8 opacity-80" />
        <h1 className="text-2xl font-bold mb-2">Página não encontrada</h1>
        <p className="text-sm text-gray-400 max-w-sm">O link que você acessou não está disponível ou não existe. Verifique o endereço e tente novamente.</p>
      </div>
    );
  }

  // ── Inactive ──
  if (state === "inactive") {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex flex-col items-center justify-center text-white px-6 text-center">
        <img src={logo} alt="PlayBet" className="h-10 mb-8 opacity-80" />
        <h1 className="text-2xl font-bold mb-2">Página temporariamente indisponível</h1>
        <p className="text-sm text-gray-400 max-w-sm">Este link está temporariamente fora do ar. Tente novamente mais tarde.</p>
      </div>
    );
  }

  // ── Ready ──
  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white overflow-x-hidden">
      {/* Hero */}
      <header className="relative pt-8 pb-16 px-6">
        <div className="absolute inset-0 bg-gradient-to-b from-emerald-600/10 via-transparent to-transparent pointer-events-none" />
        <div className="max-w-xl mx-auto relative z-10 text-center">
          <img src={logo} alt="PlayBet" className="h-9 mx-auto mb-10 opacity-90" />
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium mb-6">
            <Zap size={12} /> Oferta Exclusiva
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold leading-tight mb-4">
            Jogue nos melhores<br />
            <span className="text-emerald-400">jogos de aposta</span> do Brasil
          </h1>
          <p className="text-gray-400 text-sm sm:text-base max-w-md mx-auto mb-8">
            Cadastre-se agora e aproveite bônus exclusivos. Plataforma segura, saques rápidos e os melhores jogos.
          </p>
          <button
            onClick={handleCTA}
            disabled={clicking || !influencer?.affiliate_link}
            className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-black font-bold px-8 py-3.5 rounded-xl text-base transition-all shadow-lg shadow-emerald-500/25 hover:shadow-emerald-400/30"
          >
            {clicking ? "Redirecionando..." : "Cadastrar Agora"} <ArrowRight size={18} />
          </button>
          {!influencer?.affiliate_link && (
            <p className="text-xs text-gray-500 mt-3">Link de cadastro em configuração.</p>
          )}
        </div>
      </header>

      {/* Features */}
      <section className="px-6 pb-16">
        <div className="max-w-xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { icon: Trophy, title: "Bônus de Boas-Vindas", desc: "Ganhe bônus no primeiro depósito" },
            { icon: Shield, title: "100% Seguro", desc: "Plataforma regulamentada e confiável" },
            { icon: Gift, title: "Saques Rápidos", desc: "Receba seus ganhos via PIX em minutos" },
          ].map((f) => (
            <div key={f.title} className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-5 text-center">
              <f.icon size={24} className="text-emerald-400 mx-auto mb-3" />
              <h3 className="text-sm font-semibold mb-1">{f.title}</h3>
              <p className="text-xs text-gray-500">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Games showcase */}
      <section className="px-6 pb-16">
        <div className="max-w-xl mx-auto text-center">
          <h2 className="text-xl font-bold mb-2">Jogos Populares</h2>
          <p className="text-sm text-gray-400 mb-6">Os jogos mais jogados da plataforma</p>
          <div className="grid grid-cols-3 gap-3">
            {["Fortune Tiger", "Aviator", "Mines", "Sweet Bonanza", "Gates of Olympus", "Spaceman"].map((g) => (
              <div key={g} className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4 flex flex-col items-center gap-2">
                <Gamepad2 size={20} className="text-emerald-400/60" />
                <span className="text-xs font-medium">{g}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Second CTA */}
      <section className="px-6 pb-16">
        <div className="max-w-xl mx-auto bg-gradient-to-r from-emerald-600/20 to-emerald-500/10 border border-emerald-500/20 rounded-2xl p-8 text-center">
          <Star size={28} className="text-emerald-400 mx-auto mb-3" />
          <h2 className="text-xl font-bold mb-2">Não perca essa oportunidade</h2>
          <p className="text-sm text-gray-400 mb-5">Cadastre-se agora e comece a jogar com bônus exclusivo.</p>
          <button
            onClick={handleCTA}
            disabled={clicking || !influencer?.affiliate_link}
            className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-black font-bold px-8 py-3 rounded-xl text-sm transition-all shadow-lg shadow-emerald-500/25"
          >
            {clicking ? "Redirecionando..." : "Quero Meu Bônus"} <ArrowRight size={16} />
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/[0.06] py-6 px-6 text-center">
        <p className="text-xs text-gray-600">
          PlayBet © {new Date().getFullYear()} · Jogue com responsabilidade · 18+
        </p>
      </footer>
    </div>
  );
}
