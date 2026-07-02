import { useEffect, useState, useCallback } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Gamepad2, Star, Shield, ArrowRight, Zap, Trophy, Gift } from "lucide-react";
import logo from "@/assets/logo.png";

type LoadState = "loading" | "ready" | "not_found" | "inactive" | "no_domain";

interface ResolvedLanding {
  affiliate_link: string;
  influencer_id: string;
  influencer_name: string;
  instance_id: string | null;
  landing_page_id: string | null;
  tracking_link_id: string | null;
  click_id: string;
  click_id_param: string; // e.g. "sub1"
}

/** Generate a unique click_id for attribution */
function generateClickId(): string {
  const ts = Date.now().toString(36);
  const rand = Math.random().toString(36).substring(2, 10);
  return `clk_${ts}_${rand}`;
}

/** Append click_id (sub1) to the affiliate URL */
function injectClickId(url: string, paramName: string, clickId: string): string {
  try {
    const u = new URL(url);
    u.searchParams.set(paramName, clickId);
    return u.toString();
  } catch {
    // If URL parsing fails, try simple append
    const sep = url.includes("?") ? "&" : "?";
    return `${url}${sep}${paramName}=${clickId}`;
  }
}

async function findLPBaseByHostname(hostname: string) {
  const { data: lps } = await supabase
    .from("landing_pages")
    .select("id, domain, name")
    .eq("is_active", true);

  if (!lps || lps.length === 0) return null;

  const normalizedHost = hostname.split(":")[0].toLowerCase();

  for (const lp of lps) {
    if (!lp.domain) continue;
    try {
      const domainHost = lp.domain.replace(/^https?:\/\//, "").replace(/\/+$/, "").toLowerCase();
      if (domainHost === normalizedHost) return lp;
    } catch {
      continue;
    }
  }

  return null;
}

/** Find tracking_link for a given instance or influencer */
async function findTrackingLink(instanceId: string | null, influencerId: string) {
  // Priority 1: by instance
  if (instanceId) {
    const { data } = await supabase
      .from("tracking_links")
      .select("id, click_id_param_name, base_url")
      .eq("landing_page_instance_id", instanceId)
      .eq("status", "active")
      .limit(1)
      .maybeSingle();
    if (data) return data;
  }

  // Priority 2: by influencer
  const { data } = await supabase
    .from("tracking_links")
    .select("id, click_id_param_name, base_url")
    .eq("influencer_id", influencerId)
    .eq("status", "active")
    .limit(1)
    .maybeSingle();

  return data || null;
}

interface InstanceContext {
  lp_mode?: string | null;
  game_slugs?: string[] | null;
  layout_config?: any;
  hype_copy?: any;
}

interface GameArt {
  slug: string;
  name: string;
  icon_url: string | null;
}

export default function InfluencerLanding() {
  const { slug: pathSlug } = useParams<{ slug: string }>();
  const [searchParams] = useSearchParams();
  const slug = searchParams.get("ref") || pathSlug;
  const [state, setState] = useState<LoadState>("loading");
  const [resolved, setResolved] = useState<ResolvedLanding | null>(null);
  const [instanceCtx, setInstanceCtx] = useState<InstanceContext | null>(null);
  const [gameArts, setGameArts] = useState<GameArt[]>([]);
  const [clicking, setClicking] = useState(false);

  useEffect(() => {
    if (!slug) { setState("not_found"); return; }

    const hydrateGameArts = async (landingPageId: string | null, slugs: string[]) => {
      if (!slugs || slugs.length === 0) { setGameArts([]); return; }
      let platformId: string | null = null;
      // Try to derive platform via tracking_links → platform_accounts
      const { data: tl } = await supabase
        .from("tracking_links")
        .select("platform_account_id, platform_accounts(platform_id)")
        .eq("landing_page_id", landingPageId ?? "")
        .limit(1)
        .maybeSingle();
      platformId = (tl as any)?.platform_accounts?.platform_id ?? null;

      const q = supabase
        .from("platform_hyped_games")
        .select("game_slug, game_name, icon_url, platform_id")
        .in("game_slug", slugs);
      const { data } = platformId ? await q.eq("platform_id", platformId) : await q;
      const byName = new Map<string, GameArt>();
      (data ?? []).forEach((g: any) => {
        if (!byName.has(g.game_slug)) {
          byName.set(g.game_slug, { slug: g.game_slug, name: g.game_name, icon_url: g.icon_url });
        }
      });
      const arts = slugs.map((s) => byName.get(s) ?? { slug: s, name: s.replace(/-/g, " "), icon_url: null });
      setGameArts(arts);
    };


    if (!slug) { setState("not_found"); return; }

    (async () => {
      const hostname = window.location.hostname;
      const clickId = generateClickId();

      // Helper to finalize resolution
      const finalize = async (
        affiliateLink: string,
        influencerId: string,
        influencerName: string,
        instanceId: string | null,
        landingPageId: string | null,
      ) => {
        const tl = await findTrackingLink(instanceId, influencerId);
        const paramName = tl?.click_id_param_name || "sub1";

        setResolved({
          affiliate_link: affiliateLink,
          influencer_id: influencerId,
          influencer_name: influencerName,
          instance_id: instanceId,
          landing_page_id: landingPageId,
          tracking_link_id: tl?.id || null,
          click_id: clickId,
          click_id_param: paramName,
        });
        setState("ready");

        // Register LP VIEW event (does not count as outbound click in metrics).
        // The actual 'click' canonical event is registered on CTA press below.
        supabase.from("tracking_events").insert({
          canonical_event_name: "lp_view",
          raw_event_name: "lp_view",
          click_id: clickId,
          influencer_id: influencerId,
          landing_page_id: landingPageId,
          landing_page_instance_id: instanceId,
          tracking_link_id: tl?.id || null,
          source_type: "landing_page",
          event_timestamp: new Date().toISOString(),
          raw_payload: {
            slug,
            hostname,
            sub2: searchParams.get("sub2"),
            sub3: searchParams.get("sub3"),
            user_agent: navigator.userAgent,
            referrer: document.referrer || null,
          },
        }).then(() => {});

      };

      // ── STRATEGY 1: Domain-aware ──
      const lpBase = await findLPBaseByHostname(hostname);

      if (lpBase) {
        const { data: instance } = await supabase
          .from("landing_page_instances")
          .select("*")
          .eq("slug", slug)
          .eq("landing_page_id", lpBase.id)
          .maybeSingle();

        if (!instance) { setState("not_found"); return; }
        if (!instance.is_active) { setState("inactive"); return; }

        const { data: inf } = await supabase
          .from("influencers")
          .select("name")
          .eq("id", instance.influencer_id)
          .maybeSingle();

        setInstanceCtx({
          lp_mode: (instance as any).lp_mode,
          game_slugs: (instance as any).game_slugs,
          layout_config: (instance as any).layout_config,
          hype_copy: (instance as any).hype_copy,
        });
        await hydrateGameArts(lpBase.id, (instance as any).game_slugs || []);
        await finalize(instance.affiliate_link, instance.influencer_id, inf?.name || "", instance.id, instance.landing_page_id);
        return;
      }

      // ── STRATEGY 2: Generic instance ──
      const { data: instance } = await supabase
        .from("landing_page_instances")
        .select("*")
        .eq("slug", slug)
        .eq("is_active", true)
        .limit(1)
        .maybeSingle();

      if (instance) {
        const { data: inf } = await supabase
          .from("influencers")
          .select("name")
          .eq("id", instance.influencer_id)
          .maybeSingle();

        setInstanceCtx({
          lp_mode: (instance as any).lp_mode,
          game_slugs: (instance as any).game_slugs,
          layout_config: (instance as any).layout_config,
          hype_copy: (instance as any).hype_copy,
        });
        await hydrateGameArts(null, (instance as any).game_slugs || []);
        await finalize(instance.affiliate_link, instance.influencer_id, inf?.name || "", instance.id, instance.landing_page_id);
        return;
      }

      // ── STRATEGY 3: Legacy influencer ──
      const { data: influencer } = await supabase
        .from("influencers")
        .select("*")
        .eq("slug", slug)
        .maybeSingle();

      if (!influencer) { setState("not_found"); return; }
      if (!influencer.is_active) { setState("inactive"); return; }

      await finalize(influencer.affiliate_link || "", influencer.id, influencer.name, null, null);
    })();
  }, [slug]);

  const handleCTA = useCallback(async () => {
    if (!resolved?.affiliate_link || clicking) return;
    setClicking(true);

    // Insert CTA click into legacy `clicks` table - DB trigger
    // `sync_click_to_tracking_event` then creates the canonical
    // tracking_event with platform_id resolved from the tracking_link,
    // so the click counts in tracking_metrics for the right casa.
    try {
      await supabase.from("clicks").insert({
        influencer_id: resolved.influencer_id,
        landing_page_id: resolved.landing_page_id,
        clicked_at: new Date().toISOString(),
        user_agent: navigator.userAgent,
        referrer: document.referrer || null,
        route: `/?ref=${slug}`,
        source: "cta_click",
      });
    } catch {
      // Don't block redirect
    }


    // Inject click_id (sub1) into affiliate link, and forward sub2/sub3 from
    // the LP's incoming URL so attribution survives the redirect.
    let finalUrl = injectClickId(resolved.affiliate_link, resolved.click_id_param, resolved.click_id);
    const fwd2 = searchParams.get("sub2");
    const fwd3 = searchParams.get("sub3");
    if (fwd2) finalUrl = injectClickId(finalUrl, "sub2", fwd2);
    if (fwd3) finalUrl = injectClickId(finalUrl, "sub3", fwd3);
    window.location.href = finalUrl;
  }, [resolved, clicking, slug]);

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
        <img src={logo} alt="PlayBet" className="h-20 mb-8 opacity-80" />
        <h1 className="text-2xl font-bold mb-2">Página não encontrada</h1>
        <p className="text-sm text-gray-400 max-w-sm">O link que você acessou não está disponível ou não existe. Verifique o endereço e tente novamente.</p>
      </div>
    );
  }

  // ── No Domain Match ──
  if (state === "no_domain") {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex flex-col items-center justify-center text-white px-6 text-center">
        <img src={logo} alt="PlayBet" className="h-20 mb-8 opacity-80" />
        <h1 className="text-2xl font-bold mb-2">Domínio não configurado</h1>
        <p className="text-sm text-gray-400 max-w-sm">Este domínio ainda não foi vinculado a uma Landing Page no painel central da PlayBet.</p>
      </div>
    );
  }

  // ── Inactive ──
  if (state === "inactive") {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex flex-col items-center justify-center text-white px-6 text-center">
        <img src={logo} alt="PlayBet" className="h-20 mb-8 opacity-80" />
        <h1 className="text-2xl font-bold mb-2">Página temporariamente indisponível</h1>
        <p className="text-sm text-gray-400 max-w-sm">Este link está temporariamente fora do ar. Tente novamente mais tarde.</p>
      </div>
    );
  }

  const hasLink = !!resolved?.affiliate_link;

  const mode = (instanceCtx?.lp_mode as string) || "catalog";
  const sections: Array<{ id: string; enabled: boolean }> =
    instanceCtx?.layout_config?.sections ?? [
      { id: "hero", enabled: true },
      { id: "features", enabled: true },
      { id: "games", enabled: true },
      { id: "cta", enabled: true },
      { id: "footer", enabled: true },
    ];
  const isSectionOn = (id: string) => sections.find((s) => s.id === id)?.enabled ?? false;

  const hypeTitle: string | null = instanceCtx?.hype_copy?.title ?? null;
  const hypeSub: string | null = instanceCtx?.hype_copy?.subtitle ?? null;
  const ctaLabel: string = instanceCtx?.hype_copy?.cta_label || "Cadastrar Agora";
  const communityCta = instanceCtx?.hype_copy?.community_cta;
  const smartOdds: Array<{ event_name: string; market_name: string; odd_label?: string | null; badge?: string | null; starts_at?: string | null }> =
    Array.isArray(instanceCtx?.hype_copy?.smart_odds) ? instanceCtx.hype_copy.smart_odds : [];

  const primaryGame = gameArts[0];
  const displayGames = mode === "single_game" && primaryGame ? [primaryGame] : gameArts;

  // ── Ready ──
  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white overflow-x-hidden">
      {isSectionOn("hero") && (
        <header className="relative pt-8 pb-16 px-6">
          <div className="absolute inset-0 bg-gradient-to-b from-emerald-600/10 via-transparent to-transparent pointer-events-none" />
          <div className="max-w-xl mx-auto relative z-10 text-center">
            <img src={logo} alt="PlayBet" className="h-20 mx-auto mb-10 opacity-90" />
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium mb-6">
              <Zap size={12} /> {mode === "odds" ? "Odds do dia" : "Oferta Exclusiva"}
            </div>
            {mode === "single_game" && primaryGame ? (
              <>
                {primaryGame.icon_url ? (
                  <img
                    src={primaryGame.icon_url}
                    alt={primaryGame.name}
                    className="w-28 h-28 rounded-2xl mx-auto mb-5 object-cover shadow-xl shadow-emerald-500/20"
                  />
                ) : (
                  <Gamepad2 size={80} className="text-emerald-400/60 mx-auto mb-5" />
                )}
                <h1 className="text-3xl sm:text-4xl font-extrabold leading-tight mb-3">
                  Jogue <span className="text-emerald-400">{primaryGame.name}</span> agora
                </h1>
              </>
            ) : (
              <h1 className="text-3xl sm:text-4xl font-extrabold leading-tight mb-4">
                {hypeTitle || (
                  <>
                    Jogue nos melhores<br />
                    <span className="text-emerald-400">jogos de aposta</span> do Brasil
                  </>
                )}
              </h1>
            )}
            <p className="text-gray-400 text-sm sm:text-base max-w-md mx-auto mb-8">
              {hypeSub || "Cadastre-se agora e aproveite bônus exclusivos. Plataforma segura, saques rápidos e os melhores jogos."}
            </p>
            <button
              onClick={handleCTA}
              disabled={clicking || !hasLink}
              className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-black font-bold px-8 py-3.5 rounded-xl text-base transition-all shadow-lg shadow-emerald-500/25 hover:shadow-emerald-400/30 active:scale-[0.97]"
            >
              {clicking ? "Redirecionando..." : ctaLabel} <ArrowRight size={18} />
            </button>
            {!hasLink && (
              <p className="text-xs text-gray-500 mt-3">Link de cadastro em configuração.</p>
            )}
          </div>
        </header>
      )}

      {isSectionOn("features") && (
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
      )}

      {isSectionOn("games") && mode !== "odds" && (
        <section className="px-6 pb-16">
          <div className="max-w-xl mx-auto text-center">
            <h2 className="text-xl font-bold mb-2">
              {mode === "single_game" ? "Sobre o jogo" : mode === "multi_game" ? "Jogos em destaque" : "Jogos Populares"}
            </h2>
            <p className="text-sm text-gray-400 mb-6">
              {displayGames.length > 0 ? "Clique e jogue agora" : "Os jogos mais jogados da plataforma"}
            </p>
            <div className={`grid gap-3 ${displayGames.length === 1 ? "grid-cols-1 max-w-xs mx-auto" : "grid-cols-3"}`}>
              {(displayGames.length > 0
                ? displayGames
                : ["Fortune Tiger", "Aviator", "Mines", "Sweet Bonanza", "Gates of Olympus", "Spaceman"].map(
                    (n) => ({ slug: n, name: n, icon_url: null } as GameArt),
                  )
              ).map((g) => (
                <button
                  key={g.slug}
                  onClick={handleCTA}
                  className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4 flex flex-col items-center gap-2 hover:border-emerald-500/30 transition"
                >
                  {g.icon_url ? (
                    <img src={g.icon_url} alt={g.name} className="w-14 h-14 rounded-lg object-cover" />
                  ) : (
                    <Gamepad2 size={24} className="text-emerald-400/60" />
                  )}
                  <span className="text-xs font-medium">{g.name}</span>
                </button>
              ))}
            </div>
          </div>
        </section>
      )}

      {isSectionOn("odds") && mode === "odds" && (
        <section className="px-6 pb-16">
          <div className="max-w-xl mx-auto text-center">
            <h2 className="text-xl font-bold mb-2">Odds do dia</h2>
            <p className="text-sm text-gray-400 mb-6">Aposte agora nas melhores odds</p>
            <button
              onClick={handleCTA}
              className="w-full max-w-md mx-auto bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-6 hover:bg-emerald-500/15 transition"
            >
              <p className="text-sm text-gray-300 mb-2">Confira as partidas ao vivo</p>
              <p className="text-2xl font-extrabold text-emerald-400">Ver Odds →</p>
            </button>
          </div>
        </section>
      )}

      {isSectionOn("cta") && (
        <section className="px-6 pb-16">
          <div className="max-w-xl mx-auto bg-gradient-to-r from-emerald-600/20 to-emerald-500/10 border border-emerald-500/20 rounded-2xl p-8 text-center">
            <Star size={28} className="text-emerald-400 mx-auto mb-3" />
            <h2 className="text-xl font-bold mb-2">Não perca essa oportunidade</h2>
            <p className="text-sm text-gray-400 mb-5">Cadastre-se agora e comece a jogar com bônus exclusivo.</p>
            <button
              onClick={handleCTA}
              disabled={clicking || !hasLink}
              className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-black font-bold px-8 py-3 rounded-xl text-sm transition-all shadow-lg shadow-emerald-500/25 active:scale-[0.97]"
            >
              {clicking ? "Redirecionando..." : "Quero Meu Bônus"} <ArrowRight size={16} />
            </button>
          </div>
        </section>
      )}

      {isSectionOn("footer") && (
        <footer className="border-t border-white/[0.06] py-6 px-6 text-center">
          <p className="text-xs text-gray-600">
            PlayBet © {new Date().getFullYear()} · Jogue com responsabilidade · 18+
          </p>
        </footer>
      )}
    </div>
  );
}
