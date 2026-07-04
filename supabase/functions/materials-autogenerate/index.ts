// deno-lint-ignore-file no-explicit-any
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

/**
 * Regras default por perfil de link.
 * - platform_direct: link sem jogo, foco em co-brand PlayBet × Plataforma + selo.
 * - default: link vinculado a jogo, com o estilo neon hype.
 */
const DEFAULT_RULES_BY_MODE: Record<string, Array<{ format: string; style: string }>> = {
  platform_direct: [
    { format: "feed", style: "platform_lockup" },
    { format: "story", style: "platform_lockup" },
    { format: "square_wa", style: "platform_lockup" },
  ],
  odds_share: [
    { format: "feed", style: "odds_hype" },
    { format: "story", style: "odds_hype" },
    { format: "square_wa", style: "odds_hype" },
    { format: "landscape", style: "odds_hype" },
  ],
  default: [
    { format: "feed", style: "hype_neon" },
    { format: "story", style: "hype_neon" },
  ],
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = await req.json();
    const trackingLinkId: string = body.tracking_link_id;
    if (!trackingLinkId) {
      return new Response(JSON.stringify({ error: "tracking_link_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supa = createClient(SUPABASE_URL, SERVICE_KEY);

    const { data: link } = await supa
      .from("tracking_links")
      .select(
        "id, influencer_id, platform_account_id, game_slug, game_name, game_icon_url, link_category, hype_reason",
      )
      .eq("id", trackingLinkId)
      .maybeSingle();

    if (!link) throw new Error("link not found");

    let platformId: string | null = null;
    if (link.platform_account_id) {
      const { data: pa } = await supa
        .from("platform_accounts")
        .select("platform_id")
        .eq("id", link.platform_account_id)
        .maybeSingle();
      platformId = pa?.platform_id ?? null;
    }

    const isOddsShare = String(link.link_category || "").toLowerCase() === "odds_share";

    // Enriquece meta com contexto da aposta quando for odds_share.
    let oddsMeta: any = null;
    if (isOddsShare) {
      const { data: odds } = await supa
        .from("tracking_link_odds")
        .select("bet_type,total_odd,event_label,bookmaker_share_url,screenshot_url,selections")
        .eq("tracking_link_id", trackingLinkId)
        .maybeSingle();
      if (odds) oddsMeta = odds;
    }

    // Carrega regras da plataforma; se nenhuma, aplica preset conforme o modo do link.
    let rules: Array<{ format: string; style: string }> = [];
    if (platformId && !isOddsShare) {
      const { data } = await supa
        .from("platform_material_rules")
        .select("format, style, enabled, auto_on_new_link")
        .eq("platform_id", platformId);
      rules = (data ?? [])
        .filter((r: any) => r.enabled && r.auto_on_new_link)
        .map((r: any) => ({ format: r.format, style: r.style }));
    }
    if (rules.length === 0) {
      const mode = isOddsShare ? "odds_share"
        : (!link.game_slug && !link.game_name) ? "platform_direct"
        : "default";
      rules = DEFAULT_RULES_BY_MODE[mode];
    }

    // Idempotência: só insere combinações (format, style) ainda ausentes.
    const { data: existing } = await supa
      .from("link_materials")
      .select("format, style")
      .eq("tracking_link_id", trackingLinkId);

    const existingKey = new Set(
      (existing ?? []).map((r: any) => `${r.format}::${r.style}`),
    );

    const rowsToInsert = rules
      .filter((r) => !existingKey.has(`${r.format}::${r.style}`))
      .map((r) => ({
        tracking_link_id: trackingLinkId,
        influencer_id: link.influencer_id,
        platform_id: platformId,
        game_slug: link.game_slug,
        game_name: link.game_name,
        format: r.format,
        style: r.style,
        status: isOddsShare ? "ready" : "queued",
        meta: {
          icon_url: link.game_icon_url,
          hype_reason: link.hype_reason,
          link_category: link.link_category,
          auto: true,
          source: "materials-autogenerate",
          ...(isOddsShare ? {
            odds: oddsMeta,
            engine: "odds_share",
            studioLayout: {
              version: 3,
              engine: "odds",
              format: r.format,
              style: "odds_hype",
              layers: [],
              updatedAt: Date.now(),
              autoSeed: true,
            },
          } : {}),
        },
      }));

    let inserted = 0;
    if (rowsToInsert.length > 0) {
      const { error } = await supa.from("link_materials").insert(rowsToInsert);
      if (error) throw new Error(error.message);
      inserted = rowsToInsert.length;
    }

    return new Response(
      JSON.stringify({
        ok: true,
        queued: inserted,
        skipped: rules.length - inserted,
        total_rules: rules.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message || "unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
