/**
 * Busca de brasões de clubes e logos de ligas via TheSportsDB (grátis, sem key).
 * CORS-safe, sem servidor intermediário.
 *
 * Doc: https://www.thesportsdb.com/api.php
 * Endpoints:
 *  - searchteams.php?t=<nome>   → clubes
 *  - search_all_leagues.php?s=<sport>&c=<país>  (não usado aqui)
 *  - searchleagues.php?l=<nome> → ligas/competições
 *
 * O retorno traz `strBadge` (PNG transparente) já otimizado para uso em criativo.
 */

const BASE = "https://www.thesportsdb.com/api/v1/json/3";

export interface CrestResult {
  id: string;
  name: string;
  /** URL PNG transparente do brasão/logo. */
  badgeUrl: string;
  /** Sub-título para desambiguar (liga do clube, país da liga, etc). */
  subtitle?: string;
  /** Tipo do resultado. */
  kind: "team" | "league";
}

interface RawTeam {
  idTeam: string;
  strTeam: string;
  strBadge: string | null;
  strLeague?: string | null;
  strCountry?: string | null;
}
interface RawLeague {
  idLeague: string;
  strLeague: string;
  strBadge: string | null;
  strLogo: string | null;
  strCountry?: string | null;
  strSport?: string | null;
}

/** Busca clubes por nome. Ex: "palmeiras", "real madrid". */
export async function searchTeams(query: string, signal?: AbortSignal): Promise<CrestResult[]> {
  const q = query.trim();
  if (q.length < 2) return [];
  const res = await fetch(`${BASE}/searchteams.php?t=${encodeURIComponent(q)}`, { signal });
  if (!res.ok) throw new Error(`Falha na busca de clubes (${res.status})`);
  const data = (await res.json()) as { teams: RawTeam[] | null };
  const list = data.teams ?? [];
  return list
    .filter((t) => !!t.strBadge)
    .map<CrestResult>((t) => ({
      id: `team-${t.idTeam}`,
      name: t.strTeam,
      badgeUrl: t.strBadge as string,
      subtitle: [t.strLeague, t.strCountry].filter(Boolean).join(" · "),
      kind: "team",
    }));
}

/** Busca ligas/competições por nome. Ex: "brasileirão", "champions". */
export async function searchLeagues(query: string, signal?: AbortSignal): Promise<CrestResult[]> {
  const q = query.trim();
  if (q.length < 2) return [];
  const res = await fetch(`${BASE}/search_all_leagues.php?s=Soccer`, { signal });
  if (!res.ok) throw new Error(`Falha na busca de ligas (${res.status})`);
  const data = (await res.json()) as { countries: RawLeague[] | null };
  const list = data.countries ?? [];
  const needle = q.toLowerCase();
  return list
    .filter((l) => l.strLeague?.toLowerCase().includes(needle) && (l.strBadge || l.strLogo))
    .slice(0, 20)
    .map<CrestResult>((l) => ({
      id: `league-${l.idLeague}`,
      name: l.strLeague,
      badgeUrl: (l.strBadge || l.strLogo) as string,
      subtitle: l.strCountry || undefined,
      kind: "league",
    }));
}

export async function searchCrests(
  query: string,
  kind: "team" | "league",
  signal?: AbortSignal,
): Promise<CrestResult[]> {
  return kind === "team" ? searchTeams(query, signal) : searchLeagues(query, signal);
}
