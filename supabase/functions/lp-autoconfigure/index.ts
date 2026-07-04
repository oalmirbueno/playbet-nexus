// deno-lint-ignore-file no-explicit-any
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

type LpMode = "single_game" | "multi_game" | "odds" | "catalog" | "platform_direct";

function detectMode(linkCategory: string | null, gameSlug: string | null, extras: string[]): LpMode {
  const cat = (linkCategory || "").toLowerCase();
  // odds_share (bilhete compartilhado) e categorias esportivas → LP em modo "odds"
  if (["odds", "odds_share", "sports", "sportsbook", "esportes"].includes(cat)) return "odds";
  if (gameSlug && extras.length === 0) return "single_game";
  if ((gameSlug && extras.length >= 1) || extras.length >= 2) return "multi_game";
  return "platform_direct";
}

function defaultLayoutConfig(mode: LpMode) {
  const sections = [
    { id: "hero", label: "Hero", enabled: true },
    { id: "games", label: "Jogos", enabled: mode !== "odds" && mode !== "platform_direct" && mode !== "catalog" },
    { id: "odds", label: "Odds/Partidas", enabled: mode === "odds" },
    { id: "features", label: "Benefícios", enabled: mode !== "platform_direct" && mode !== "catalog" },
    { id: "community", label: "Comunidade", enabled: mode !== "platform_direct" && mode !== "catalog" },
    { id: "cta", label: "CTA final", enabled: true },
    { id: "footer", label: "Rodapé", enabled: true },
  ];
  return { mode, sections };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = await req.json();
    const trackingLinkId: string = body.tracking_link_id;
    const extraGameSlugs: string[] = Array.isArray(body.extra_game_slugs) ? body.extra_game_slugs : [];
    const hypeCopy = body.hype_copy || {};

    if (!trackingLinkId) {
      return new Response(JSON.stringify({ error: "tracking_link_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supa = createClient(SUPABASE_URL, SERVICE_KEY);

    const { data: link, error: linkErr } = await supa
      .from("tracking_links")
      .select("id, influencer_id, landing_page_id, landing_page_instance_id, platform_account_id, game_slug, game_name, game_icon_url, link_category, hype_reason, base_url, final_url")
      .eq("id", trackingLinkId)
      .maybeSingle();
    if (linkErr || !link) throw new Error(linkErr?.message || "link not found");

    // Resolve platform_id
    let platformId: string | null = null;
    let platformName: string | null = null;
    let platformSlug: string | null = null;
    if (link.platform_account_id) {
      const { data: pa } = await supa
        .from("platform_accounts")
        .select("platform_id, platforms(name, slug)")
        .eq("id", link.platform_account_id)
        .maybeSingle();
      platformId = pa?.platform_id ?? null;
      platformName = (pa as any)?.platforms?.name ?? null;
      platformSlug = (pa as any)?.platforms?.slug ?? null;
    }

    const mode = detectMode(link.link_category, link.game_slug, extraGameSlugs);
    const allSlugs = (mode === "platform_direct" || mode === "odds") ? [] : [link.game_slug, ...extraGameSlugs].filter(Boolean) as string[];

    // Enrich with real game metadata from platform_hyped_games
    let gameIds: string[] = [];
    if (platformId && allSlugs.length > 0) {
      const { data: games } = await supa
        .from("platform_hyped_games")
        .select("id, game_slug, game_name, icon_url")
        .eq("platform_id", platformId)
        .in("game_slug", allSlugs);
      gameIds = (games ?? []).map((g: any) => g.id);
    }

    // Puxa o bilhete de odds ligado ao link (mesmo padrão do materials-autogenerate)
    // para popular hero, subtitle e smart_odds da LP automaticamente.
    let oddsTicket: any = null;
    if (mode === "odds") {
      const { data: odds } = await supa
        .from("tracking_link_odds")
        .select("bet_type,total_odd,event_label,bookmaker_share_url,screenshot_url,selections,stake_suggested,event_starts_at")
        .eq("tracking_link_id", trackingLinkId)
        .maybeSingle();
      oddsTicket = odds ?? null;
    }

    const layoutConfig = {
      ...defaultLayoutConfig(mode),
      updated_at: new Date().toISOString(),
    };

    const oddsTitle = oddsTicket?.event_label
      ? `Bilhete ${oddsTicket.bet_type === "multipla" ? "múltipla" : oddsTicket.bet_type === "sistema" ? "sistema" : "simples"} · ${oddsTicket.event_label}`
      : "Bilhete compartilhado";
    const oddsSubtitle = oddsTicket?.total_odd
      ? `Odd total ${Number(oddsTicket.total_odd).toFixed(2)}${oddsTicket?.selections?.length ? ` · ${oddsTicket.selections.length} seleção(ões)` : ""}`
      : (link.hype_reason || "Copia e cola direto na casa.");

    const smartOddsFromTicket = Array.isArray(oddsTicket?.selections)
      ? oddsTicket.selections.map((s: any) => ({
          event_name: String(s.event ?? oddsTicket?.event_label ?? ""),
          market_name: String(s.market ?? ""),
          odd_label: s.odd ? String(s.odd) : null,
          badge: String(s.pick ?? ""),
        }))
      : [];

    const finalHypeCopy: any = {
      title: hypeCopy.title || (mode === "odds" ? oddsTitle : mode === "platform_direct" ? platformName || "Oferta oficial" : link.game_name || "Oferta oficial"),
      subtitle: hypeCopy.subtitle || (mode === "odds" ? oddsSubtitle : link.hype_reason || (mode === "platform_direct" && platformName ? `Acesse ${platformName} agora com bônus oficial PlayBet.` : null)),
      cta_label: hypeCopy.cta_label || (mode === "platform_direct" ? (platformName ? `Acessar ${platformName}` : "Acessar plataforma") : mode === "odds" ? "Copiar e apostar" : "Jogar agora"),
      game_slug: (mode === "platform_direct" || mode === "odds") ? null : link.game_slug || null,
      game_name: (mode === "platform_direct" || mode === "odds") ? null : link.game_name || null,
      game_icon_url: (mode === "platform_direct" || mode === "odds") ? null : link.game_icon_url || null,
      bonus_offer: { enabled: mode !== "platform_direct" && mode !== "odds" },
      community_cta: { enabled: mode !== "platform_direct" },
      category: link.link_category || null,
      platform_slug: platformSlug,
      platform_name: platformName,
      auto: true,
    };
    if (mode === "odds" && oddsTicket) {
      finalHypeCopy.odds_ticket = {
        bet_type: oddsTicket.bet_type ?? null,
        total_odd: oddsTicket.total_odd ?? null,
        stake_suggested: oddsTicket.stake_suggested ?? null,
        event_label: oddsTicket.event_label ?? null,
        event_starts_at: oddsTicket.event_starts_at ?? null,
        bookmaker_share_url: oddsTicket.bookmaker_share_url ?? null,
        screenshot_url: oddsTicket.screenshot_url ?? null,
        selections: oddsTicket.selections ?? [],
      };
      if (smartOddsFromTicket.length) finalHypeCopy.smart_odds = smartOddsFromTicket;
      if (oddsTicket.screenshot_url) finalHypeCopy.hero_image_url = oddsTicket.screenshot_url;
    }

    // Create or update the LP instance
    let instanceId = link.landing_page_instance_id;

    if (instanceId) {
      const { data: currentInstance } = await supa
        .from("landing_page_instances")
        .select("hype_copy, source_tracking_link_id")
        .eq("id", instanceId)
        .maybeSingle();

      const currentHype = (currentInstance?.hype_copy || {}) as Record<string, unknown>;
      const manualLayout = currentHype.auto === false;

      // If the visual editor already saved manual changes, do NOT replace the
      // registered page/copy. Exception: impossible no-game generated pages
      // must be normalized to LP limpa so they never show stale game sections.
      const updatePayload = manualLayout
        ? {
            ...(!link.game_slug ? {
              lp_mode: "platform_direct",
              game_slugs: [],
              game_ids: [],
              layout_config: { ...defaultLayoutConfig("platform_direct"), updated_at: new Date().toISOString() },
            } : {}),
            hype_copy: {
              ...currentHype,
              game_slug: link.game_slug ? (currentHype.game_slug || link.game_slug) : null,
              game_name: link.game_slug ? (currentHype.game_name || link.game_name) : null,
              game_icon_url: link.game_slug ? (currentHype.game_icon_url || link.game_icon_url) : null,
              category: link.link_category || currentHype.category || null,
              platform_slug: platformSlug,
              platform_name: platformName,
            },
            source_tracking_link_id: currentInstance?.source_tracking_link_id || trackingLinkId,
            auto_generated: true,
          }
        : {
            lp_mode: mode,
            game_slugs: allSlugs,
            game_ids: gameIds,
            layout_config: layoutConfig,
            hype_copy: finalHypeCopy,
            source_tracking_link_id: currentInstance?.source_tracking_link_id || trackingLinkId,
            auto_generated: true,
          };

      await supa
        .from("landing_page_instances")
        .update(updatePayload)
        .eq("id", instanceId);
    }

    await supa.from("tracking_links").update({ lp_auto_generated: true }).eq("id", trackingLinkId);

    return new Response(
      JSON.stringify({ ok: true, lp_mode: mode, instance_id: instanceId, games: allSlugs.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message || "unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
