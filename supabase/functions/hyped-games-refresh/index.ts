// Edge function: hyped-games-refresh
// Descobre os 5 jogos mais em alta por plataforma via Lovable AI Gateway
// e faz upsert em public.platform_hyped_games.
//
// Uso: POST /hyped-games-refresh { platform_id?: string }  (se ausente, roda para todas ativas)
// Chamável sem auth (verify_jwt = false por padrão nos projetos Lovable).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const LOVABLE_KEY = Deno.env.get("LOVABLE_API_KEY")!;

interface HypedGame {
  game_name: string;
  game_slug: string;
  category: string;
  hype_reason: string;
  priority: number;
}

function slugify(s: string) {
  return s.toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

async function fetchHypedGames(platformName: string): Promise<HypedGame[]> {
  const now = new Date();
  const monthPt = now.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });

  const prompt = `Você é um analista de iGaming Brasil. Liste os 5 jogos mais em alta na casa "${platformName}" no Brasil em ${monthPt}. Considere popularidade real (aviator, fortune tiger, mines, spaceman, sweet bonanza, gates of olympus, plinko, esportes com odds inflacionadas, etc). Retorne SOMENTE JSON válido com este schema: { "games": [ { "game_name": string, "game_slug": string (kebab-case), "category": "casino"|"slots"|"crash"|"live"|"sports"|"odds"|"poker"|"other", "hype_reason": string (frase curta em pt-BR, max 90 chars), "priority": 1|2|3|4|5 } ] }. Prioridade 1 = mais quente. Não inclua explicações fora do JSON.`;

  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${LOVABLE_KEY}`,
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: "Retorne SOMENTE JSON válido, sem markdown, sem comentários." },
        { role: "user", content: prompt },
      ],
      response_format: { type: "json_object" },
    }),
  });

  if (!res.ok) {
    const t = await res.text();
    throw new Error(`AI gateway ${res.status}: ${t.slice(0, 200)}`);
  }

  const j = await res.json();
  const content = j.choices?.[0]?.message?.content ?? "{}";
  let parsed: any;
  try { parsed = JSON.parse(content); }
  catch {
    // strip potential markdown fences
    const cleaned = content.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "");
    parsed = JSON.parse(cleaned);
  }

  const games: HypedGame[] = (parsed.games ?? []).slice(0, 5).map((g: any, i: number) => ({
    game_name: String(g.game_name ?? "").trim(),
    game_slug: slugify(g.game_slug ?? g.game_name ?? `game-${i}`),
    category: String(g.category ?? "other").toLowerCase(),
    hype_reason: String(g.hype_reason ?? "").slice(0, 140),
    priority: Math.min(5, Math.max(1, Number(g.priority ?? i + 1))),
  })).filter((g: HypedGame) => g.game_name && g.game_slug);

  return games;
}

function iconUrlFor(iconBase: string | null | undefined, slug: string): string | null {
  if (!iconBase) return null;
  const base = iconBase.replace(/\/+$/, "");
  return `${base}/${slug}.png`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);
    let platformId: string | undefined;
    if (req.method === "POST") {
      try { const b = await req.json(); platformId = b?.platform_id; } catch { /* no body */ }
    }

    const q = supabase.from("platforms").select("id, name, icon_base_url, is_active").eq("is_active", true);
    const { data: platforms, error } = platformId ? await q.eq("id", platformId) : await q;
    if (error) throw error;
    if (!platforms?.length) {
      return new Response(JSON.stringify({ ok: true, refreshed: 0, message: "no platforms" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const results: any[] = [];
    for (const p of platforms) {
      try {
        const games = await fetchHypedGames(p.name);
        if (!games.length) { results.push({ platform: p.name, refreshed: 0 }); continue; }

        // Deactivate previous set (soft)
        await supabase
          .from("platform_hyped_games")
          .update({ is_active: false, updated_at: new Date().toISOString() })
          .eq("platform_id", p.id);

        const rows = games.map((g) => ({
          platform_id: p.id,
          game_name: g.game_name,
          game_slug: g.game_slug,
          category: g.category,
          hype_reason: g.hype_reason,
          priority: g.priority,
          icon_url: iconUrlFor(p.icon_base_url, g.game_slug),
          is_active: true,
          refreshed_at: new Date().toISOString(),
        }));

        const { error: upErr } = await supabase
          .from("platform_hyped_games")
          .upsert(rows, { onConflict: "platform_id,game_slug" });
        if (upErr) throw upErr;

        results.push({ platform: p.name, refreshed: rows.length });
      } catch (e: any) {
        results.push({ platform: p.name, error: e?.message ?? String(e) });
      }
    }

    return new Response(JSON.stringify({ ok: true, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ ok: false, error: e?.message ?? String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
