// deno-lint-ignore-file no-explicit-any
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const DEFAULT_RULES = [
  { format: "feed", style: "hype_neon" },
  { format: "story", style: "hype_neon" },
];

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
      .select("id, influencer_id, platform_account_id, game_slug, game_name, game_icon_url, link_category, hype_reason")
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

    // Load platform rules; fallback to defaults if none configured
    let rules: Array<{ format: string; style: string }> = [];
    if (platformId) {
      const { data } = await supa
        .from("platform_material_rules")
        .select("format, style, enabled, auto_on_new_link")
        .eq("platform_id", platformId);
      rules = (data ?? [])
        .filter((r: any) => r.enabled && r.auto_on_new_link)
        .map((r: any) => ({ format: r.format, style: r.style }));
    }
    if (rules.length === 0) rules = DEFAULT_RULES;

    const rows = rules.map((r) => ({
      tracking_link_id: trackingLinkId,
      influencer_id: link.influencer_id,
      platform_id: platformId,
      game_slug: link.game_slug,
      game_name: link.game_name,
      format: r.format,
      style: r.style,
      status: "queued",
      meta: {
        icon_url: link.game_icon_url,
        hype_reason: link.hype_reason,
        link_category: link.link_category,
      },
    }));

    const { error } = await supa.from("link_materials").insert(rows);
    if (error) throw new Error(error.message);

    return new Response(JSON.stringify({ ok: true, queued: rows.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message || "unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
