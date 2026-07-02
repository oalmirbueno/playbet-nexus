// Edge function: hyped-games-refresh
// Modes:
//   { }                              → full refresh (AI + Firecrawl + upsert)
//   { platform_id }                  → same, filtered a 1 plataforma
//   { dry_run: true, platform_id? }  → devolve preview com candidatos, SEM gravar
//   { confirm: true, selections: [...] } → grava apenas o que o usuário aprovou

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

const GAMES_PER_PLATFORM = 12;

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

// ── 1. AI: top N games per platform ─────────────────────────────────────────
async function fetchHypedGames(platformName: string): Promise<HypedGame[]> {
  const now = new Date();
  const monthPt = now.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });

  const prompt = `Você é analista de iGaming Brasil. Liste os ${GAMES_PER_PLATFORM} jogos mais em alta na casa "${platformName}" em ${monthPt}. Considere popularidade real e presença efetiva do catálogo dessa casa (ex: Aviator, Fortune Tiger/Ox/Mouse/Rabbit, Mines, Spaceman, Sweet Bonanza, Gates of Olympus, Plinko, Big Bass Bonanza, JetX, Penalty Shoot-out, Dragon Tiger, etc). Traga também o provider real do jogo. Retorne SOMENTE JSON: { "games": [ { "game_name": string exato como aparece na casa, "game_slug": string kebab-case, "category": "casino"|"slots"|"crash"|"live"|"sports"|"odds"|"poker"|"other", "hype_reason": string max 90 chars pt-BR, "priority": 1-${GAMES_PER_PLATFORM}, "provider_hint": string ex "Pragmatic Play","PG Soft","Spribe","Evolution","Playson" } ] }. Priority 1 = mais quente.`;

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

  return (parsed.games ?? []).slice(0, GAMES_PER_PLATFORM).map((g: any, i: number) => ({
    game_name: String(g.game_name ?? "").trim(),
    game_slug: slugify(g.game_slug ?? g.game_name ?? `game-${i}`),
    category: String(g.category ?? "other").toLowerCase(),
    hype_reason: String(g.hype_reason ?? "").slice(0, 140),
    priority: Math.min(GAMES_PER_PLATFORM, Math.max(1, Number(g.priority ?? i + 1))),
    provider_hint: g.provider_hint ? String(g.provider_hint) : undefined,
  })).filter((g: HypedGame) => g.game_name && g.game_slug);
}

// ── 2. Firecrawl: real image candidates ────────────────────────────────────
const IMG_EXT = /\.(png|jpe?g|webp)(\?|$)/i;
const NOISY_HOSTS = /(gravatar|googleusercontent\/a\/|w3\.org|schema\.org|fonts\.g|favicon|sprite|placeholder|blank)/i;
// Provider CDNs where the *real* game logos live (highest trust)
const PROVIDER_CDN = /(ppgames\.net|pragmaticplay\.net|pragmatic-partner|pgsoft-games|pg-soft|pgsoft\.com|spribe\.co|evolution\.com|playson\.com|habanero|hacksawgaming|relaxgaming|redtigergaming|netent|isoftbet|nolimitcity|bgaming|smartsoft|turbogames|gaming1)/i;
// Editorial/review sites that host clean game logos
const EDITORIAL_HOSTS = /(casino\.guru|slottracker|slotcatalog|askgamblers|casinomeister|slotsjudge|bigwinboard|slotsmate)/i;

interface ImgCandidate { url: string; score: number; matches_slug: boolean; source?: string; }

async function firecrawlImageCandidates(gameName: string, providerHint: string | undefined, limit = 8): Promise<ImgCandidate[]> {
  if (!FIRECRAWL_KEY) return [];
  const cleanName = gameName.replace(/["']/g, "");
  // Two focused queries — one provider-CDN-biased, one editorial-biased
  const queries = [
    `${cleanName} ${providerHint || ""} slot logo png transparent`.trim(),
    `${cleanName} ${providerHint || ""} game icon site:pragmaticplay.net OR site:pgsoft.com OR site:spribe.co OR site:casino.guru`.trim(),
  ];

  const needle = slugify(gameName).replace(/-/g, "");
  const seen = new Set<string>();
  const out: ImgCandidate[] = [];

  for (const q of queries) {
    try {
      const res = await fetch("https://api.firecrawl.dev/v2/search", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${FIRECRAWL_KEY}` },
        body: JSON.stringify({
          query: q,
          limit: 5,
          scrapeOptions: { formats: ["links"], onlyMainContent: true },
        }),
      });
      if (!res.ok) continue;
      const j = await res.json().catch(() => null);
      const results: any[] = j?.data ?? j?.web ?? [];

      for (const r of results) {
        const links: string[] = Array.isArray(r?.links) ? r.links : Array.isArray(r?.data?.links) ? r.data.links : [];
        for (const url of links) {
          if (typeof url !== "string" || seen.has(url)) continue;
          if (!IMG_EXT.test(url) || NOISY_HOSTS.test(url)) continue;
          seen.add(url);

          const urlSlug = slugify(url).replace(/-/g, "");
          const matches_slug = urlSlug.includes(needle);
          const isProviderCdn = PROVIDER_CDN.test(url);
          const isEditorial = EDITORIAL_HOSTS.test(url);
          // Score: provider CDN (real logo) > editorial > generic; slug match doubles it
          let score = 1;
          if (isProviderCdn) score += 4;
          else if (isEditorial) score += 2;
          if (matches_slug) score += 3;
          // Prefer sensible sized thumbnails (game_pic, thumb, logo)
          if (/(game_pic|thumb|logo|icon|square)/i.test(url)) score += 1;
          // Penalize massive banners / hero art
          if (/(banner|hero|background|bg[-_])/i.test(url)) score -= 2;

          out.push({
            url,
            matches_slug,
            score,
            source: isProviderCdn ? "provider_cdn" : isEditorial ? "editorial" : "web",
          });
        }
      }
    } catch { /* ignore query failure */ }
  }

  return out.sort((a, b) => b.score - a.score).slice(0, limit);
}

// ── Persistence helper ─────────────────────────────────────────────────────
async function upsertPlatform(
  supabase: ReturnType<typeof createClient>,
  platformId: string,
  rows: Array<{ game_name: string; game_slug: string; category: string; hype_reason: string; priority: number; icon_url: string | null }>,
) {
  await supabase
    .from("platform_hyped_games")
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq("platform_id", platformId);

  if (!rows.length) return 0;
  const payload = rows.map((g) => ({
    platform_id: platformId,
    game_name: g.game_name,
    game_slug: g.game_slug,
    category: g.category,
    hype_reason: g.hype_reason,
    priority: g.priority,
    icon_url: g.icon_url,
    is_active: true,
    refreshed_at: new Date().toISOString(),
  }));
  const { error } = await supabase
    .from("platform_hyped_games")
    .upsert(payload, { onConflict: "platform_id,game_slug" });
  if (error) throw error;
  return payload.length;
}

// ── 3. Handler ─────────────────────────────────────────────────────────────
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);
    let body: any = {};
    if (req.method === "POST") { try { body = await req.json(); } catch { /* no body */ } }

    // ── CONFIRM MODE ────────────────────────────────────────────────────
    if (body?.confirm && Array.isArray(body?.selections)) {
      const results: any[] = [];
      let totalUpdated = 0;
      for (const sel of body.selections) {
        try {
          const rows = (sel.games ?? []).map((g: any) => ({
            game_name: String(g.game_name || "").trim(),
            game_slug: slugify(g.game_slug || g.game_name || ""),
            category: String(g.category || "other").toLowerCase(),
            hype_reason: String(g.hype_reason || "").slice(0, 140),
            priority: Math.min(GAMES_PER_PLATFORM, Math.max(1, Number(g.priority ?? GAMES_PER_PLATFORM))),
            icon_url: g.icon_url ? String(g.icon_url) : null,
          })).filter((r: any) => r.game_name && r.game_slug);
          const n = await upsertPlatform(supabase, sel.platform_id, rows);
          totalUpdated += n > 0 ? 1 : 0;
          results.push({ platform_id: sel.platform_id, refreshed: n });
        } catch (e: any) {
          results.push({ platform_id: sel.platform_id, error: e?.message ?? String(e) });
        }
      }
      return new Response(JSON.stringify({ ok: true, mode: "confirm", updated: totalUpdated, results }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const platformId: string | undefined = body?.platform_id;
    const dryRun: boolean = !!body?.dry_run;

    const q = supabase.from("platforms").select("id, name, icon_base_url, is_active").eq("is_active", true);
    const { data: platforms, error } = platformId ? await q.eq("id", platformId) : await q;
    if (error) throw error;
    if (!platforms?.length) {
      return new Response(JSON.stringify({ ok: true, refreshed: 0, message: "no platforms" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const results: any[] = [];
    const preview: any[] = [];
    let totalUpdated = 0;

    for (const p of platforms) {
      try {
        const games = await fetchHypedGames(p.name);
        if (!games.length) { results.push({ platform: p.name, refreshed: 0 }); continue; }

        const withCandidates = await Promise.all(games.map(async (g) => {
          const candidates = await firecrawlImageCandidates(g.game_name, g.provider_hint).catch(() => []);
          // Prefer provider CDN with slug match; fall back to highest score
          const best = candidates.find((c) => c.source === "provider_cdn" && c.matches_slug)
            ?? candidates.find((c) => c.matches_slug)
            ?? candidates[0];
          return { ...g, candidates, icon_url: best?.url ?? null };
        }));

        if (dryRun) {
          preview.push({
            platform_id: p.id,
            platform_name: p.name,
            games: withCandidates.map((g) => ({
              game_name: g.game_name,
              game_slug: g.game_slug,
              category: g.category,
              hype_reason: g.hype_reason,
              priority: g.priority,
              provider_hint: g.provider_hint ?? null,
              suggested_url: g.icon_url,
              candidates: g.candidates,
            })),
          });
          continue;
        }

        const rows = withCandidates.map((g) => ({
          game_name: g.game_name, game_slug: g.game_slug, category: g.category,
          hype_reason: g.hype_reason, priority: g.priority, icon_url: g.icon_url,
        }));
        const n = await upsertPlatform(supabase, p.id, rows);
        totalUpdated += n > 0 ? 1 : 0;
        results.push({
          platform: p.name,
          refreshed: n,
          with_real_image: rows.filter((r) => r.icon_url).length,
        });
      } catch (e: any) {
        results.push({ platform: p.name, error: e?.message ?? String(e) });
      }
    }

    return new Response(JSON.stringify({
      ok: true,
      mode: dryRun ? "dry_run" : "apply",
      updated: totalUpdated,
      firecrawl: !!FIRECRAWL_KEY,
      preview: dryRun ? preview : undefined,
      results: dryRun ? undefined : results,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    return new Response(JSON.stringify({ ok: false, error: e?.message ?? String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
