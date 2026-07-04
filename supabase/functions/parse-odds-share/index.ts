// Parse odds share — engine inteligente para extrair dados de bilhete de aposta
// a partir de texto colado + URL do bookmaker (compartilhamento).
//
// POST { text?: string, url?: string, screenshotUrl?: string }
// -> {
//   success: true,
//   draft: {
//     bookmaker_share_url: string,
//     screenshot_url: string,
//     bet_type: "single" | "multipla" | "sistema",
//     total_odd: number | null,
//     event_label: string,
//     event_starts_at: string,
//     stake_suggested: number | null,
//     notes: string,
//     selections: Array<{ event: string; market: string; pick: string; odd: number }>,
//   },
//   source: "text" | "firecrawl" | "ai" | "mixed",
//   diagnostics?: unknown
// }

import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const FIRECRAWL_V2 = "https://api.firecrawl.dev/v2";
const AI_GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";

interface Body {
  text?: string;
  url?: string;
  screenshotUrl?: string;
}

interface Selection {
  event: string;
  market: string;
  pick: string;
  odd: number;
}

interface Draft {
  bookmaker_share_url: string;
  screenshot_url: string;
  bet_type: "single" | "multipla" | "sistema";
  total_odd: number | null;
  event_label: string;
  event_starts_at: string;
  stake_suggested: number | null;
  notes: string;
  selections: Selection[];
}

const emptyDraft = (): Draft => ({
  bookmaker_share_url: "",
  screenshot_url: "",
  bet_type: "single",
  total_odd: null,
  event_label: "",
  event_starts_at: "",
  stake_suggested: null,
  notes: "",
  selections: [],
});

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  let body: Body;
  try { body = await req.json(); } catch { return json({ error: "invalid_json" }, 400); }

  const rawText = String(body.text ?? "").trim();
  const explicitUrl = String(body.url ?? "").trim();
  const screenshotUrl = String(body.screenshotUrl ?? "").trim();

  if (!rawText && !explicitUrl && !screenshotUrl) {
    return json({ error: "missing_input" }, 400);
  }

  const draft = emptyDraft();
  const sources: string[] = [];
  const diagnostics: Record<string, unknown> = {};

  // 1) Separa URLs de texto livre
  const urls = extractUrls(rawText);
  if (explicitUrl) urls.unshift(explicitUrl);

  const imageUrl = urls.find(isImageUrl) || screenshotUrl;
  if (imageUrl) draft.screenshot_url = imageUrl;

  const shareUrl = urls.find(u => !isImageUrl(u)) || "";
  if (shareUrl) draft.bookmaker_share_url = shareUrl;

  // 2) Parse regex do texto (rápido, sempre roda)
  const textOnly = stripUrls(rawText);
  const textParse = parseTextHeuristics(rawText);
  Object.assign(draft, mergeDraft(draft, textParse));
  if (textParse.selections.length || textParse.total_odd || textParse.event_label) sources.push("text");

  // 3) Firecrawl scrape do bet-share URL (se houver)
  let scraped: { markdown: string; screenshot?: string } | null = null;
  if (shareUrl) {
    scraped = await scrapeBetShare(shareUrl).catch(err => {
      diagnostics.firecrawl_error = String(err);
      return null;
    });
    if (scraped?.screenshot && !draft.screenshot_url) draft.screenshot_url = scraped.screenshot;
    if (scraped?.markdown) {
      const mdParse = parseTextHeuristics(scraped.markdown);
      Object.assign(draft, mergeDraft(draft, mdParse));
      if (mdParse.selections.length || mdParse.total_odd) sources.push("firecrawl");
    }
  }

  // 4) Lovable AI enrichment quando ainda falta estrutura (seleções ou odd total).
  const needsAI = draft.selections.length === 0 || !draft.total_odd || !draft.event_label;
  if (needsAI) {
    const corpus = [textOnly, scraped?.markdown ?? ""].filter(Boolean).join("\n\n---\n\n").slice(0, 12_000);
    if (corpus.trim().length > 20) {
      const aiDraft = await enrichWithAI(corpus).catch(err => {
        diagnostics.ai_error = String(err);
        return null;
      });
      if (aiDraft) {
        Object.assign(draft, mergeDraft(draft, aiDraft));
        sources.push("ai");
      }
    }
  }

  // 5) Recalcula total_odd se veio 0 mas temos seleções
  if ((!draft.total_odd || draft.total_odd <= 1) && draft.selections.length) {
    const product = draft.selections.reduce((acc, s) => acc * (Number(s.odd) || 1), 1);
    if (product > 1) draft.total_odd = round2(product);
  }
  // 6) Deduz bet_type
  if (draft.selections.length > 1 && draft.bet_type === "single") draft.bet_type = "multipla";

  const source = sources.length > 1 ? "mixed" : (sources[0] ?? "text");

  return json({ success: true, draft, source, diagnostics });
});

// ────────── helpers ──────────

function extractUrls(text: string): string[] {
  if (!text) return [];
  const re = /https?:\/\/[^\s<>"'`]+/gi;
  const out: string[] = [];
  const seen = new Set<string>();
  for (const m of text.matchAll(re)) {
    const clean = m[0].replace(/[),.;!?]+$/, "");
    if (!seen.has(clean)) { seen.add(clean); out.push(clean); }
  }
  return out;
}

function isImageUrl(u: string): boolean {
  return /\.(png|jpe?g|webp|gif|bmp|svg)(\?|#|$)/i.test(u);
}

function stripUrls(text: string): string {
  return text.replace(/https?:\/\/\S+/gi, " ").replace(/\s+/g, " ").trim();
}

function round2(n: number) { return Math.round(n * 100) / 100; }

function parseTextHeuristics(text: string): Partial<Draft> {
  if (!text) return {};
  const out: Partial<Draft> = { selections: [] };

  // Bet type
  if (/\bm[uú]ltipla\b/i.test(text)) out.bet_type = "multipla";
  else if (/\bsistema\b/i.test(text)) out.bet_type = "sistema";
  else if (/\bsimples\b/i.test(text)) out.bet_type = "single";

  // Odd total
  const oddTotalM = text.match(/(?:odd\s*total|total\s*odd|odds?\s*totais?|cota\w*\s*total)\s*[:=]?\s*(\d+[,.]\d+)/i)
    || text.match(/@\s*(\d+[,.]\d+)\s*(?:total|final)/i);
  if (oddTotalM) {
    const n = Number(oddTotalM[1].replace(",", "."));
    if (Number.isFinite(n) && n > 1) out.total_odd = n;
  }

  // Stake
  const stakeM = text.match(/(?:stake|aposta|valor|entrada)\s*[:=]?\s*R?\$?\s*(\d+[,.]?\d*)/i);
  if (stakeM) {
    const n = Number(stakeM[1].replace(",", "."));
    if (Number.isFinite(n) && n > 0) out.stake_suggested = n;
  }

  // Event label — primeiro confronto A x B / A vs B
  const eventM = text.match(/([A-ZÁÉÍÓÚÂÊÔÃÕÇ][\wÀ-ÿ.'-]{2,}(?:\s+[A-ZÁÉÍÓÚÂÊÔÃÕÇ][\wÀ-ÿ.'-]+)*)\s+(?:x|vs\.?|×)\s+([A-ZÁÉÍÓÚÂÊÔÃÕÇ][\wÀ-ÿ.'-]{2,}(?:\s+[A-ZÁÉÍÓÚÂÊÔÃÕÇ][\wÀ-ÿ.'-]+)*)/);
  if (eventM) out.event_label = `${eventM[1].trim()} x ${eventM[2].trim()}`;

  // Selections — linhas com odd no final "Time A - Vencedor @ 1.85"
  const lines = text.split(/\r?\n|·|•|\|/).map(l => l.trim()).filter(Boolean);
  for (const line of lines) {
    const m = line.match(/^(.+?)\s+[@\-–—:]\s*(\d+[,.]\d+)\s*$/);
    if (!m) continue;
    const odd = Number(m[2].replace(",", "."));
    if (!Number.isFinite(odd) || odd <= 1 || odd > 1000) continue;
    const label = m[1].trim();
    // Divide "Evento — Mercado: Seleção" quando possível
    const parts = label.split(/\s+[-–—]\s+/);
    let event = "", market = "", pick = label;
    if (parts.length >= 3) { event = parts[0]; market = parts[1]; pick = parts.slice(2).join(" — "); }
    else if (parts.length === 2) { event = parts[0]; pick = parts[1]; }
    out.selections!.push({ event, market, pick, odd });
  }

  return out;
}

function mergeDraft(base: Draft, patch: Partial<Draft>): Partial<Draft> {
  const merged: Partial<Draft> = {};
  if (patch.bookmaker_share_url && !base.bookmaker_share_url) merged.bookmaker_share_url = patch.bookmaker_share_url;
  if (patch.screenshot_url && !base.screenshot_url) merged.screenshot_url = patch.screenshot_url;
  if (patch.bet_type && base.bet_type === "single") merged.bet_type = patch.bet_type;
  if (patch.total_odd && !base.total_odd) merged.total_odd = patch.total_odd;
  if (patch.stake_suggested && !base.stake_suggested) merged.stake_suggested = patch.stake_suggested;
  if (patch.event_label && !base.event_label) merged.event_label = patch.event_label;
  if (patch.event_starts_at && !base.event_starts_at) merged.event_starts_at = patch.event_starts_at;
  if (patch.notes && !base.notes) merged.notes = patch.notes;
  if (patch.selections?.length && !base.selections.length) merged.selections = patch.selections;
  return merged;
}

async function scrapeBetShare(url: string): Promise<{ markdown: string; screenshot?: string } | null> {
  const apiKey = Deno.env.get("FIRECRAWL_API_KEY");
  if (!apiKey) return null;
  const res = await fetch(`${FIRECRAWL_V2}/scrape`, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      url,
      formats: ["markdown", "screenshot"],
      onlyMainContent: false,
      waitFor: 3500,
      mobile: true,
    }),
  });
  const data = await res.json().catch(() => null) as
    | { data?: { markdown?: string; screenshot?: string }; markdown?: string; screenshot?: string; error?: string }
    | null;
  if (!res.ok || !data) throw new Error((data as { error?: string } | null)?.error || `firecrawl_${res.status}`);
  const markdown = data.data?.markdown ?? data.markdown ?? "";
  const shotRaw = data.data?.screenshot ?? data.screenshot;
  let screenshot: string | undefined;
  if (shotRaw) {
    screenshot = /^https?:\/\//i.test(shotRaw) || shotRaw.startsWith("data:")
      ? shotRaw
      : `data:image/png;base64,${shotRaw}`;
  }
  return { markdown, screenshot };
}

async function enrichWithAI(corpus: string): Promise<Partial<Draft> | null> {
  const key = Deno.env.get("LOVABLE_API_KEY");
  if (!key) return null;

  const schemaHint = `Retorne APENAS JSON no formato:
{
  "bet_type": "single" | "multipla" | "sistema",
  "total_odd": number | null,
  "event_label": string,
  "event_starts_at": string,
  "stake_suggested": number | null,
  "selections": [{ "event": string, "market": string, "pick": string, "odd": number }]
}
Regras:
- Não invente odds. Extraia somente o que estiver no texto.
- event_starts_at em ISO 8601 se disponível, senão "".
- selections: uma entrada por perna do bilhete.
- Se for aposta simples, uma única selection.
- Se total_odd faltar, deixe null (o servidor calcula).`;

  const res = await fetch(AI_GATEWAY, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: `Você é um extrator de bilhetes de aposta esportiva. ${schemaHint}` },
        { role: "user", content: `Bilhete / página do bookmaker:\n\n${corpus}` },
      ],
      response_format: { type: "json_object" },
    }),
  });
  if (!res.ok) throw new Error(`ai_${res.status}`);
  const data = await res.json() as { choices?: Array<{ message?: { content?: string } }> };
  const raw = data.choices?.[0]?.message?.content ?? "";
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return null;
  try {
    const parsed = JSON.parse(jsonMatch[0]) as Partial<Draft>;
    if (Array.isArray(parsed.selections)) {
      parsed.selections = parsed.selections
        .map(s => ({
          event: String(s?.event ?? "").trim(),
          market: String(s?.market ?? "").trim(),
          pick: String(s?.pick ?? "").trim(),
          odd: Number(s?.odd) || 0,
        }))
        .filter(s => s.pick && s.odd > 1);
    }
    return parsed;
  } catch { return null; }
}

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
