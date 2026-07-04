// Odds Reconciliation
//
// Audita a integridade dos links de "aposta compartilhada" (tracking_link_odds)
// por período: quantos links têm odd cadastrada, quantos materiais foram
// gerados a partir deles, quantos ficaram sem material/screenshot/URL da casa,
// odds com evento já expirado, e a odd média por bilhete.
//
// Divergência = link com odds cadastradas mas sem material ready, sem URL da
// casa, sem screenshot ou com evento vencido. Isso é rastreado por período
// para o operador priorizar correções.
//
// POST /functions/v1/odds-reconcile
//   body: { period?: "24h"|"7d"|"30d"|"90d" (default "7d"), platform_id?: uuid }

// deno-lint-ignore-file no-explicit-any
import { createClient } from "npm:@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

type Period = "24h" | "7d" | "30d" | "90d";
type Sev = "ok" | "minor" | "major" | "critical";

function periodRange(p: Period): { start: string; end: string } {
  const end = new Date();
  const start = new Date(end);
  if (p === "24h") start.setDate(start.getDate() - 1);
  else if (p === "7d") start.setDate(start.getDate() - 7);
  else if (p === "30d") start.setDate(start.getDate() - 30);
  else start.setDate(start.getDate() - 90);
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  return { start: iso(start), end: iso(end) };
}

function severityFor(counts: {
  missingMaterial: number;
  missingUrl: number;
  missingScreenshot: number;
  expired: number;
  failed: number;
}): Sev {
  const total = counts.missingMaterial + counts.missingUrl +
    counts.missingScreenshot + counts.expired + counts.failed;
  if (counts.failed >= 5 || counts.missingMaterial >= 10 || total >= 25) return "critical";
  if (counts.failed >= 2 || counts.missingMaterial >= 4 || total >= 10) return "major";
  if (total >= 1) return "minor";
  return "ok";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
    const period: Period = (body.period as Period) ?? "7d";
    const platformId: string | null = body.platform_id ?? null;
    const { start, end } = periodRange(period);

    const sb = createClient(SUPABASE_URL, SERVICE_ROLE);

    // Todas as odds cadastradas no período (por created_at)
    let q = sb
      .from("tracking_link_odds")
      .select(
        "id, tracking_link_id, platform_id, bet_type, total_odd, selections, bookmaker_share_url, screenshot_url, event_starts_at, status, created_at",
      )
      .gte("created_at", `${start}T00:00:00Z`)
      .lte("created_at", `${end}T23:59:59Z`);
    if (platformId) q = q.eq("platform_id", platformId);

    const { data: odds, error: oddsErr } = await q;
    if (oddsErr) throw oddsErr;

    const oddsRows = odds ?? [];
    const linkIds = Array.from(new Set(oddsRows.map((o: any) => o.tracking_link_id).filter(Boolean)));

    // Materiais gerados para esses links
    let materialsRows: any[] = [];
    if (linkIds.length > 0) {
      const { data: mats, error: matsErr } = await sb
        .from("link_materials")
        .select("id, tracking_link_id, status")
        .in("tracking_link_id", linkIds);
      if (matsErr) throw matsErr;
      materialsRows = mats ?? [];
    }

    const matsByLink = new Map<string, { total: number; ready: number; failed: number }>();
    for (const m of materialsRows) {
      const cur = matsByLink.get(m.tracking_link_id) ?? { total: 0, ready: 0, failed: 0 };
      cur.total += 1;
      if (m.status === "ready") cur.ready += 1;
      if (m.status === "failed") cur.failed += 1;
      matsByLink.set(m.tracking_link_id, cur);
    }

    let single = 0, multipla = 0, sistema = 0;
    let selectionsTotal = 0;
    let sumOdd = 0, countOdd = 0;
    let missingMaterial = 0, missingUrl = 0, missingScreenshot = 0, expired = 0;
    let matTotal = 0, matReady = 0, matFailed = 0;
    const gaps: Array<{ tracking_link_id: string; reasons: string[] }> = [];
    const now = Date.now();

    for (const o of oddsRows as any[]) {
      if (o.bet_type === "multipla") multipla++;
      else if (o.bet_type === "sistema") sistema++;
      else single++;

      const sel = Array.isArray(o.selections) ? o.selections : [];
      selectionsTotal += sel.length;
      if (o.total_odd) { sumOdd += Number(o.total_odd); countOdd++; }

      const mat = matsByLink.get(o.tracking_link_id);
      matTotal += mat?.total ?? 0;
      matReady += mat?.ready ?? 0;
      matFailed += mat?.failed ?? 0;

      const reasons: string[] = [];
      if (!mat || mat.ready === 0) { missingMaterial++; reasons.push("sem_material_ready"); }
      if (!o.bookmaker_share_url) { missingUrl++; reasons.push("sem_url_casa"); }
      if (!o.screenshot_url) { missingScreenshot++; reasons.push("sem_screenshot"); }
      if (o.event_starts_at && new Date(o.event_starts_at).getTime() < now && o.status === "open") {
        expired++; reasons.push("evento_expirado_status_open");
      }
      if (reasons.length > 0) {
        gaps.push({ tracking_link_id: o.tracking_link_id, reasons });
      }
    }

    const avgOdd = countOdd > 0 ? Number((sumOdd / countOdd).toFixed(2)) : 0;
    const severity = severityFor({ missingMaterial, missingUrl, missingScreenshot, expired, failed: matFailed });
    const divergent = severity !== "ok";

    const { data: inserted, error: insErr } = await sb
      .from("odds_reconciliations")
      .insert({
        period_label: period,
        period_start: start,
        period_end: end,
        platform_id: platformId,
        odds_links_total: oddsRows.length,
        odds_links_single: single,
        odds_links_multipla: multipla,
        odds_links_sistema: sistema,
        odds_avg_total_odd: avgOdd,
        odds_selections_total: selectionsTotal,
        materials_total: matTotal,
        materials_ready: matReady,
        materials_failed: matFailed,
        links_without_material: missingMaterial,
        links_without_bookmaker_url: missingUrl,
        links_without_screenshot: missingScreenshot,
        links_expired_event: expired,
        odds_links_ids: linkIds,
        gaps: gaps.slice(0, 200),
        severity,
        divergent,
        notes: `${linkIds.length} link(s) de odds no período · ${matReady}/${matTotal} materiais ready`,
      })
      .select()
      .single();
    if (insErr) throw insErr;

    return new Response(
      JSON.stringify({ ok: true, reconciliation: inserted }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 },
    );
  } catch (e: any) {
    console.error("odds-reconcile", e);
    return new Response(
      JSON.stringify({ ok: false, error: String(e?.message ?? e) }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 },
    );
  }
});
