import { useEffect, useState, useCallback } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Gamepad2, Shield, ArrowRight, Zap, Trophy, Gift, Users, Copy } from "lucide-react";
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

    const hydrateGameArts = async (landingPageId: string | null, instanceId: string | null, slugs: string[]) => {
      // Always try to enrich with the link's own game_icon_url as canonical fallback
      let tlQuery = supabase
        .from("tracking_links")
        .select("game_slug, game_name, game_icon_url, platform_account_id, platform_accounts(platform_id)")
        .limit(1)
        .maybeSingle();
      tlQuery = instanceId ? tlQuery.eq("landing_page_instance_id", instanceId) : tlQuery.eq("landing_page_id", landingPageId ?? "");
      const { data: tl } = await tlQuery;
      const linkIcon: GameArt | null = (tl as any)?.game_slug
        ? { slug: (tl as any).game_slug, name: (tl as any).game_name || (tl as any).game_slug, icon_url: (tl as any).game_icon_url || null }
        : null;
      const platformId: string | null = (tl as any)?.platform_accounts?.platform_id ?? null;

      if (!slugs || slugs.length === 0) {
        setGameArts(linkIcon ? [linkIcon] : []);
        return;
      }

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
      // Prefer the link's selected official asset for its game; fallback to the platform catalog for the rest.
      if (linkIcon) {
        byName.set(linkIcon.slug, {
          ...byName.get(linkIcon.slug),
          ...linkIcon,
          icon_url: linkIcon.icon_url || byName.get(linkIcon.slug)?.icon_url || null,
        });
      }
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
        await hydrateGameArts(lpBase.id, instance.id, (instance as any).game_slugs || []);
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
        await hydrateGameArts(instance.landing_page_id, instance.id, (instance as any).game_slugs || []);
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
  const bonusOffer = instanceCtx?.hype_copy?.bonus_offer;
  const ctaLabel: string = bonusOffer?.cta_label || instanceCtx?.hype_copy?.cta_label || "Acessar oportunidades";
  const communityCta = instanceCtx?.hype_copy?.community_cta;
  const smartOdds: Array<{ event_name: string; market_name: string; odd_label?: string | null; badge?: string | null; starts_at?: string | null }> =
    Array.isArray(instanceCtx?.hype_copy?.smart_odds) ? instanceCtx.hype_copy.smart_odds : [];

  const primaryGame = gameArts[0];
  const displayGames = mode === "single_game" && primaryGame ? [primaryGame] : gameArts;
  const heroTitle = hypeTitle || primaryGame?.name || "Oferta oficial";
  const heroSubtitle = hypeSub || (primaryGame ? "Bônus ativo para jogar agora." : "Bônus oficial e acesso rápido.");
  const copyBonusCode = async () => {
    if (!bonusOffer?.code) return;
    try { await navigator.clipboard.writeText(bonusOffer.code); } catch {}
  };

  // ── Ready ──
  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white overflow-x-hidden">
      {isSectionOn("hero") && (
        <header className="relative pt-8 pb-16 px-6">
          <div className="absolute inset-0 bg-gradient-to-b from-emerald-600/10 via-transparent to-transparent pointer-events-none" />
          <div className="max-w-xl mx-auto relative z-10 text-center">
            <img src={logo} alt="PlayBet" className="h-20 mx-auto mb-10 opacity-90" />
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium mb-6">
              <Zap size={12} /> {mode === "odds" ? "Odds oficiais" : "Oferta oficial"}
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
                  {heroTitle}
                </h1>
              </>
            ) : (
              <h1 className="text-3xl sm:text-4xl font-extrabold leading-tight mb-4">
                {heroTitle || (
                  <>
                    Jogue nos melhores<br />
                    <span className="text-emerald-400">jogos de aposta</span> do Brasil
                  </>
                )}
              </h1>
            )}
            <p className="text-gray-400 text-sm sm:text-base max-w-md mx-auto mb-8">
              {heroSubtitle}
            </p>
            {bonusOffer?.enabled && (bonusOffer.title || bonusOffer.code) && (
              <div className="max-w-sm mx-auto mb-5 rounded-2xl border border-emerald-500/25 bg-emerald-500/10 p-3">
                <div className="flex items-center justify-center gap-2 text-sm font-bold text-emerald-300">
                  <Gift size={16} /> {bonusOffer.title || "Bônus ativo"}
                </div>
                {bonusOffer.code && (
                  <button onClick={copyBonusCode} className="mt-2 inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.06] px-3 py-1.5 font-mono text-sm font-bold tracking-wider">
                    {bonusOffer.code} <Copy size={13} />
                  </button>
                )}
                {bonusOffer.note && <p className="mt-2 text-[11px] text-gray-400">{bonusOffer.note}</p>}
              </div>
            )}
            <button
              onClick={handleCTA}
              disabled={clicking || !hasLink}
              className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-black font-bold px-8 py-3.5 rounded-xl text-base transition-all shadow-lg shadow-emerald-500/25 hover:shadow-emerald-400/30 active:scale-[0.97]"
            >
              {clicking ? "Abrindo..." : ctaLabel} <ArrowRight size={18} />
            </button>
            {!hasLink && (
              <p className="text-xs text-gray-500 mt-3">Link de cadastro em configuração.</p>
            )}
          </div>
        </header>
      )}

      {isSectionOn("features") && (
        <section className="px-6 pb-16">
          <div className="max-w-xl mx-auto">
            <h2 className="text-center text-[11px] uppercase tracking-[0.18em] text-emerald-400/80 font-semibold mb-5">
              Ofertas oficiais
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { icon: Gift, title: bonusOffer?.title || "Bônus ativo", desc: bonusOffer?.code ? `Código ${bonusOffer.code}` : "Oferta disponível" },
                { icon: Trophy, title: mode === "odds" ? "Odds" : "Jogo", desc: primaryGame?.name || "Selecionado" },
                { icon: Shield, title: "PIX", desc: "Saque rápido" },
              ].map((f) => (
                <div key={f.title} className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4 text-center">
                  <f.icon size={22} className="text-emerald-400 mx-auto mb-2" />
                  <h3 className="text-sm font-semibold mb-0.5">{f.title}</h3>
                  <p className="text-[11px] text-gray-500">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}


      {isSectionOn("games") && mode !== "odds" && (
        <section className="px-6 pb-16">
          <div className="max-w-xl mx-auto text-center">
              <h2 className="text-xl font-bold mb-6">
                {mode === "single_game" ? primaryGame?.name || "Jogo selecionado" : mode === "multi_game" ? "Jogos em alta" : "Catálogo"}
              </h2>
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
          <div className="max-w-xl mx-auto">
            <div className="text-center mb-6">
              <h2 className="text-xl font-bold mb-2">Odds do dia</h2>
              <p className="text-sm text-gray-400">Curadoria PlayBet — mercados simples e valor real</p>
            </div>
            {smartOdds.length > 0 ? (
              <div className="space-y-2">
                {smartOdds.map((o, i) => (
                  <button
                    key={i}
                    onClick={handleCTA}
                    className="w-full text-left bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.08] hover:border-emerald-500/40 rounded-xl p-4 transition-all group"
                  >
                    <div className="flex items-center justify-between gap-3 mb-1">
                      <span className="text-sm font-semibold truncate">{o.event_name}</span>
                      {o.odd_label && (
                        <span className="text-emerald-400 font-extrabold text-lg tabular-nums shrink-0">{o.odd_label}</span>
                      )}
                    </div>
                    <div className="flex items-center justify-between gap-2 text-xs text-gray-400">
                      <span className="truncate">{o.market_name}</span>
                      {o.badge && <span className="text-[10px] uppercase tracking-wider text-emerald-400/80">{o.badge}</span>}
                    </div>
                    {o.starts_at && (
                      <p className="text-[10px] text-gray-500 mt-1">
                        {new Date(o.starts_at).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                      </p>
                    )}
                  </button>
                ))}
                <button
                  onClick={handleCTA}
                  className="w-full mt-3 bg-emerald-500 hover:bg-emerald-400 text-black font-bold py-3 rounded-xl transition"
                >
                  Apostar agora →
                </button>
              </div>
            ) : (
              <button
                onClick={handleCTA}
                className="w-full max-w-md mx-auto block bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-6 hover:bg-emerald-500/15 transition"
              >
                <p className="text-sm text-gray-300 mb-2">Confira as partidas ao vivo</p>
                <p className="text-2xl font-extrabold text-emerald-400">Ver Odds →</p>
              </button>
            )}
          </div>
        </section>
      )}

      {isSectionOn("community") && communityCta?.enabled && communityCta?.label && (
        <section className="px-6 pb-16">
          <div className="max-w-xl mx-auto bg-white/[0.03] border border-white/[0.08] rounded-2xl p-6 text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-emerald-500/15 border border-emerald-500/30 mb-3">
              <Users size={22} className="text-emerald-400" />
            </div>
            <h3 className="text-lg font-bold mb-1">{communityCta.label}</h3>
            {communityCta.note && (
              <p className="text-xs text-gray-400 mb-4 max-w-sm mx-auto">{communityCta.note}</p>
            )}
            {communityCta.url ? (
              <a
                href={communityCta.url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.12] px-6 py-2.5 rounded-xl text-sm font-semibold transition"
              >
                Acessar comunidade <ArrowRight size={14} />
              </a>
            ) : (
              <p className="text-[11px] text-gray-500">Link do grupo em configuração pelo influenciador.</p>
            )}
          </div>
        </section>
      )}

      {isSectionOn("cta") && (
        <section className="px-6 pb-16">
          <div className="max-w-xl mx-auto text-center">
            <button
              onClick={handleCTA}
              disabled={clicking || !hasLink}
              className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-black font-bold px-8 py-3.5 rounded-xl text-base transition-all shadow-lg shadow-emerald-500/25 hover:shadow-emerald-400/30 active:scale-[0.97]"
            >
              {clicking ? "Abrindo..." : ctaLabel} <ArrowRight size={18} />
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
