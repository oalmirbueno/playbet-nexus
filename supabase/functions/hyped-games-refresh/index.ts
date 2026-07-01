// Edge function: hyped-games-refresh
// 1) Descobre os 5 jogos mais em alta por plataforma (Lovable AI)
// 2) Busca UMA IMAGEM REAL para cada jogo via Firecrawl (nada de IA generativa)
// 3) Upsert em public.platform_hyped_games
//
// POST /hyped-games-refresh { platform_id?: string }

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const LOVABLE_KEY = Deno.env.get("LOVABLE_API_KEY")!;
const FIRECRAWL_KEY = Deno.env.get("FIRECRAWL_API_KEY");

interface HypedGame {
  game_name: string;
  game_slug: string;
  category: string;
  hype_reason: string;
  priority: number;
  provider_hint?: string;
}

function slugify(s: string) {
  return s.toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

// ── 1. AI: top 5 games per platform ─────────────────────────────────────────
async function fetchHypedGames(platformName: string): Promise<HypedGame[]> {
  const now = new Date();
  const monthPt = now.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });

  const prompt = `Você é analista de iGaming Brasil. Liste os 5 jogos mais em alta na casa "${platformName}" em ${monthPt}. Considere popularidade real (Aviator, Fortune Tiger/Ox/Mouse, Mines, Spaceman, Sweet Bonanza, Gates of Olympus, Plinko, Big Bass, etc). Retorne SOMENTE JSON: { "games": [ { "game_name": string, "game_slug": string kebab-case, "category": "casino"|"slots"|"crash"|"live"|"sports"|"odds"|"poker"|"other", "hype_reason": string max 90 chars pt-BR, "priority": 1-5, "provider_hint": string ex "Pragmatic Play","PG Soft","Spribe" } ] }. Priority 1 = mais quente.`;

  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${LOVABLE_KEY}` },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: "Retorne SOMENTE JSON válido, sem markdown." },
        { role: "user", content: prompt },
      ],
      response_format: { type: "json_object" },
    }),
  });
  if (!res.ok) throw new Error(`AI gateway ${res.status}: ${(await res.text()).slice(0, 200)}`);

  const j = await res.json();
  const raw = j.choices?.[0]?.message?.content ?? "{}";
  const parsed = JSON.parse(raw.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, ""));

  return (parsed.games ?? []).slice(0, 5).map((g: any, i: number) => ({
    game_name: String(g.game_name ?? "").trim(),
    game_slug: slugify(g.game_slug ?? g.game_name ?? `game-${i}`),
    category: String(g.category ?? "other").toLowerCase(),
    hype_reason: String(g.hype_reason ?? "").slice(0, 140),
    priority: Math.min(5, Math.max(1, Number(g.priority ?? i + 1))),
    provider_hint: g.provider_hint ? String(g.provider_hint) : undefined,
  })).filter((g: HypedGame) => g.game_name && g.game_slug);
}

// ── 2. Firecrawl: real image lookup ────────────────────────────────────────
const IMG_EXT = /\.(png|jpe?g|webp|gif|svg)(\?|$)/i;
const NOISY_HOSTS = /(gravatar|googleusercontent\/a\/|w3\.org|schema\.org|fonts\.g|favicon)/i;

async function firecrawlImageLookup(gameName: string, providerHint: string | undefined, platformName: string): Promise<string | null> {
  if (!FIRECRAWL_KEY) return null;
  const q = [gameName, providerHint || "", "slot logo icon"].filter(Boolean).join(" ");

  // Firecrawl v2 /search with scrapeOptions.formats=['links'] returns page links per result;
  // we then filter for real image URLs.
  const res = await fetch("https://api.firecrawl.dev/v2/search", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${FIRECRAWL_KEY}` },
    body: JSON.stringify({
      query: q,
      limit: 3,
      scrapeOptions: { formats: ["links"], onlyMainContent: true },
    }),
  });
  if (!res.ok) return null;

  const j = await res.json().catch(() => null);
  const results: any[] = j?.data ?? j?.web ?? [];
  const needle = slugify(gameName).replace(/-/g, "");
  const candidates: string[] = [];

  for (const r of results) {
    const links: string[] = Array.isArray(r?.links) ? r.links : Array.isArray(r?.data?.links) ? r.data.links : [];
    for (const url of links) {
      if (typeof url !== "string") continue;
      if (!IMG_EXT.test(url)) continue;
      if (NOISY_HOSTS.test(url)) continue;
      candidates.push(url);
    }
  }

  // Prefer images whose URL contains the game slug (real match), then fall back to first.
  const scored = candidates
    .map((u) => ({ u, score: slugify(u).replace(/-/g, "").includes(needle) ? 2 : 1 }))
    .sort((a, b) => b.score - a.score);

  return scored[0]?.u ?? null;
}

// ── 3. Handler ─────────────────────────────────────────────────────────────
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
    let totalUpdated = 0;

    for (const p of platforms) {
      try {
        const games = await fetchHypedGames(p.name);
        if (!games.length) { results.push({ platform: p.name, refreshed: 0 }); continue; }

        // Real image per game (best effort, in parallel)
        const withImages = await Promise.all(games.map(async (g) => ({
          ...g,
          icon_url: await firecrawlImageLookup(g.game_name, g.provider_hint, p.name).catch(() => null),
        })));

        // Deactivate previous set
        await supabase
          .from("platform_hyped_games")
          .update({ is_active: false, updated_at: new Date().toISOString() })
          .eq("platform_id", p.id);

        const rows = withImages.map((g) => ({
          platform_id: p.id,
          game_name: g.game_name,
          game_slug: g.game_slug,
          category: g.category,
          hype_reason: g.hype_reason,
          priority: g.priority,
          icon_url: g.icon_url,
          is_active: true,
          refreshed_at: new Date().toISOString(),
        }));

        const { error: upErr } = await supabase
          .from("platform_hyped_games")
          .upsert(rows, { onConflict: "platform_id,game_slug" });
        if (upErr) throw upErr;

        totalUpdated += 1;
        results.push({
          platform: p.name,
          refreshed: rows.length,
          with_real_image: rows.filter(r => r.icon_url).length,
        });
      } catch (e: any) {
        results.push({ platform: p.name, error: e?.message ?? String(e) });
      }
    }

    return new Response(JSON.stringify({
      ok: true,
      updated: totalUpdated,
      firecrawl: !!FIRECRAWL_KEY,
      results,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    return new Response(JSON.stringify({ ok: false, error: e?.message ?? String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
