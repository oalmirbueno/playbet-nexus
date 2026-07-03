// Captura screenshot de uma URL (odd, bilhete de aposta, página do jogo)
// via Firecrawl v2 e devolve pronta para virar camada de imagem no Creative Studio.
//
// POST { url: string, waitFor?: number, fullPage?: boolean, viewport?: "mobile"|"desktop" }
// -> { success: true, imageUrl: string, source: "firecrawl" }
//
// imageUrl pode ser: URL hospedada pela Firecrawl OU data:image/png;base64,...
// Ambos funcionam como src de <img> e do canvas do Creative Studio (via image-proxy quando URL).

import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const FIRECRAWL_V2 = "https://api.firecrawl.dev/v2";

interface Body {
  url?: string;
  waitFor?: number;
  fullPage?: boolean;
  viewport?: "mobile" | "desktop";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  if (req.method !== "POST") {
    return json({ error: "method_not_allowed" }, 405);
  }

  const apiKey = Deno.env.get("FIRECRAWL_API_KEY");
  if (!apiKey) return json({ error: "firecrawl_not_configured" }, 500);

  let body: Body;
  try { body = await req.json(); } catch { return json({ error: "invalid_json" }, 400); }

  const rawUrl = (body.url || "").trim();
  if (!rawUrl) return json({ error: "missing_url" }, 400);

  let target: URL;
  try { target = new URL(rawUrl); } catch { return json({ error: "invalid_url" }, 400); }
  if (!/^https?:$/.test(target.protocol)) return json({ error: "invalid_protocol" }, 400);

  const waitFor = clamp(body.waitFor ?? 2500, 0, 15000);
  const fullPage = Boolean(body.fullPage);
  const isMobile = body.viewport === "mobile";

  try {
    const fcRes = await fetch(`${FIRECRAWL_V2}/scrape`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url: target.toString(),
        formats: [
          fullPage ? { type: "screenshot", fullPage: true } : "screenshot",
        ],
        onlyMainContent: false,
        waitFor,
        mobile: isMobile,
      }),
    });

    const data = await fcRes.json().catch(() => null) as
      | { success?: boolean; data?: { screenshot?: string; metadata?: unknown }; screenshot?: string; error?: string }
      | null;

    if (!fcRes.ok || !data) {
      const err = (data as { error?: string } | null)?.error || `firecrawl_${fcRes.status}`;
      return json({ error: err }, fcRes.status === 402 ? 402 : 502);
    }

    // v2 pode entregar em data.screenshot ou screenshot direto
    const shot = data.data?.screenshot ?? data.screenshot;
    if (!shot || typeof shot !== "string") {
      return json({ error: "no_screenshot_returned" }, 502);
    }

    // Normaliza: pode ser URL http(s) ou base64 puro.
    let imageUrl = shot;
    if (!/^https?:\/\//i.test(shot) && !shot.startsWith("data:")) {
      imageUrl = `data:image/png;base64,${shot}`;
    }

    return json({ success: true, imageUrl, source: "firecrawl" });
  } catch (err) {
    console.error("capture-odd-screenshot error", err);
    return json({ error: "capture_failed", detail: String(err) }, 500);
  }
});

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}
