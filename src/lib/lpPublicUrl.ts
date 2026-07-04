// Domínio padrão das LPs públicas do Playbet.
// Usado como fallback quando a LP não tem `domain` configurado.
export const DEFAULT_LP_DOMAIN = "oportunidades.playbet.app.br";

export function normalizeLpDomain(domain: string | null | undefined): string {
  const raw = (domain && domain.trim()) || DEFAULT_LP_DOMAIN;
  let base = raw.replace(/\/+$/, "");
  if (!/^https?:\/\//i.test(base)) base = `https://${base}`;
  return base;
}

export function buildLpBaseUrl(
  domain: string | null | undefined,
  route?: string | null | undefined,
): string {
  const base = normalizeLpDomain(domain);
  const cleanRoute = (route || "").trim();
  if (!cleanRoute || cleanRoute === "/") return base;
  if (/^https?:\/\//i.test(cleanRoute)) return cleanRoute;
  if (cleanRoute.startsWith("?")) return `${base}${cleanRoute}`;
  return `${base}${cleanRoute.startsWith("/") ? cleanRoute : `/${cleanRoute}`}`;
}

export function buildInstanceLpBaseUrl(
  domain: string | null | undefined,
  slug: string | null | undefined,
): string | null {
  if (!slug) return null;
  const base = normalizeLpDomain(domain);
  return `${base}/i/${encodeURIComponent(slug)}`;
}

export function buildLpPublicUrl(
  domain: string | null | undefined,
  slug: string | null | undefined,
): string | null {
  return buildInstanceLpBaseUrl(domain, slug);
}
