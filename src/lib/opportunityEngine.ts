/**
 * Motor de Oportunidades - geração de até 3 sugestões por evento Sports
 * e cálculo de score consolidado.
 *
 * Linguagem permitida: "score", "confiança", "mercado simples", "odd em destaque",
 * "curadoria PlayBet". Proibido: "garantido", "certeiro", "chance de ganhar", "lucro".
 */

import type { LpEventRow } from "@/services/lpEventService";
import type { LpSignalRow } from "@/services/lpSignalService";
import type { LpOpportunityRow, MarketType, SignalConfidence } from "@/services/lpOpportunityService";

export interface SuggestedOpportunity {
  title: string;
  market_type: MarketType;
  market_name: string;
  badge: string;
  recommendation_reason: string;
  recommendation_score: number;
  signal_source?: string | null;
  signal_confidence?: SignalConfidence | null;
  signal_id?: string | null;
  odd_label?: string | null;
}

const CONFIDENCE_WEIGHT: Record<SignalConfidence, number> = {
  baixa: 8,
  media: 15,
  alta: 22,
};

const SIMPLE_MARKETS: MarketType[] = ["resultado_final", "total_gols", "dupla_chance"];

export interface SuggestInput {
  event: Pick<LpEventRow, "home_team" | "away_team" | "starts_at">;
  signals?: LpSignalRow[];
}

/** Gera no máximo 3 opções: simples, odd em destaque e alternativa/sinal. */
export function suggestThreeOptions({ event, signals = [] }: SuggestInput): SuggestedOpportunity[] {
  const home = event.home_team?.trim() || "Mandante";
  const away = event.away_team?.trim() || "Visitante";
  const out: SuggestedOpportunity[] = [];

  // 1) Opção mais simples: vitória do mandante
  out.push({
    title: `${home} vence`,
    market_type: "resultado_final",
    market_name: "Resultado final - mandante",
    badge: "Mercado simples",
    recommendation_reason: "Mercado simples, leitura direta do confronto.",
    recommendation_score: 0,
  });

  // 2) Odd em destaque: total de gols
  out.push({
    title: "Mais de 1.5 gols",
    market_type: "total_gols",
    market_name: "Total de gols (Mais de 1.5)",
    badge: "Odd em destaque",
    recommendation_reason: "Mercado de gols costuma ter leitura estatística estável.",
    recommendation_score: 0,
  });

  // 3) Alternativa: sala de sinais (se houver) ou dupla chance
  const topSignal =
    [...signals].sort((a, b) => CONFIDENCE_WEIGHT[b.confidence] - CONFIDENCE_WEIGHT[a.confidence])[0] ||
    null;

  if (topSignal && (topSignal.market_name || topSignal.market_type)) {
    out.push({
      title: topSignal.market_name || `Sinal ${topSignal.source_name ?? ""}`.trim(),
      market_type: (topSignal.market_type as MarketType) || "especial",
      market_name: topSignal.market_name || "Sinal curado",
      badge: "Curadoria PlayBet",
      recommendation_reason: `Indicação da sala de sinais (${topSignal.source_name ?? "fonte interna"}).`,
      recommendation_score: 0,
      signal_source: topSignal.source_name ?? topSignal.source_channel,
      signal_confidence: topSignal.confidence,
      signal_id: topSignal.id,
      odd_label: topSignal.odd_label,
    });
  } else {
    out.push({
      title: `Dupla chance: empate ou ${away}`,
      market_type: "dupla_chance",
      market_name: "Dupla chance (X2)",
      badge: "Alternativa",
      recommendation_reason: "Cobertura alternativa para cenário de equilíbrio.",
      recommendation_score: 0,
    });
  }

  // Aplica score consolidado em cada opção
  return out.map((opt) => ({
    ...opt,
    recommendation_score: computeOpportunityScore({
      market_type: opt.market_type,
      odd_label: opt.odd_label ?? null,
      destination_url: "",
      platform_id: null,
      starts_at: event.starts_at ?? null,
      signal_confidence: opt.signal_confidence ?? null,
      stats_summary: null,
    }),
  }));
}

export interface ScoreInput {
  market_type?: string | null;
  market_name?: string | null;
  odd_label?: string | null;
  destination_url?: string | null;
  platform_id?: string | null;
  starts_at?: string | null;
  signal_confidence?: SignalConfidence | null;
  stats_summary?: string | null;
}

/**
 * Score consolidado 0-100. Não é promessa de acerto - é qualidade da curadoria.
 * Critérios: mercado simples, odd preenchida, casa definida, link oficial válido,
 * evento próximo, sinal recebido, estatística preenchida, coerência odd↔mercado.
 */
export function computeOpportunityScore(input: ScoreInput): number {
  let score = 0;

  if (input.market_type && SIMPLE_MARKETS.includes(input.market_type as MarketType)) {
    score += 15; // mercado simples
  }
  if (input.odd_label && input.odd_label.trim()) {
    score += 10; // odd preenchida
    if (coherentOddForMarket(input.odd_label, input.market_type)) score += 5; // coerência
  }
  if (input.platform_id) score += 10; // casa definida
  if (isValidHttpUrl(input.destination_url)) score += 20; // link oficial

  if (input.starts_at) {
    const diffH = (new Date(input.starts_at).getTime() - Date.now()) / 3_600_000;
    if (diffH > 0 && diffH <= 48) score += 15; // evento próximo
    else if (diffH > 48 && diffH <= 168) score += 8;
  }

  if (input.signal_confidence) score += CONFIDENCE_WEIGHT[input.signal_confidence];
  if (input.stats_summary && input.stats_summary.trim().length > 10) score += 10;

  return Math.max(0, Math.min(100, score));
}

function isValidHttpUrl(u?: string | null): boolean {
  if (!u) return false;
  try {
    const url = new URL(u.trim());
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function coherentOddForMarket(label: string, marketType?: string | null): boolean {
  const num = parseFloat(label.replace(",", "."));
  if (!isFinite(num) || num <= 1) return false;
  if (marketType === "resultado_final") return num >= 1.2 && num <= 6;
  if (marketType === "dupla_chance") return num >= 1.05 && num <= 2.5;
  if (marketType === "total_gols") return num >= 1.3 && num <= 4;
  if (marketType === "ambas_marcam") return num >= 1.3 && num <= 3;
  return num >= 1.1 && num <= 15;
}

/** Converte sinal em rascunho de oportunidade - não publica, é só payload. */
export function signalToOpportunityDraft(
  signal: LpSignalRow,
  event?: Pick<LpEventRow, "home_team" | "away_team" | "starts_at"> | null,
): Partial<LpOpportunityRow> {
  const eventName = event ? `${event.home_team} x ${event.away_team}` : null;
  return {
    title: signal.market_name || `Sinal ${signal.source_name ?? signal.source_channel}`,
    category: "sports",
    market_type: signal.market_type || "especial",
    market_name: signal.market_name,
    odd_label: signal.odd_label,
    cta_label: "Apostar agora",
    destination_url: signal.house_url || "",
    platform_id: signal.platform_id,
    event_id: signal.event_id,
    event_name: eventName,
    starts_at: event?.starts_at ?? null,
    signal_id: signal.id,
    signal_source: signal.source_name ?? signal.source_channel,
    signal_confidence: signal.confidence,
    badge: "Curadoria PlayBet",
    is_active: false, // rascunho - nunca publica automático
    sort_order: 0,
  };
}
