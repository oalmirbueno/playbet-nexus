// Domínio padrão das LPs públicas do Playbet.
// Usado como fallback quando a LP não tem `domain` configurado.
export const DEFAULT_LP_DOMAIN = "oportunidades.playbet.app.br";

export function buildLpPublicUrl(
  domain: string | null | undefined,
  slug: string | null | undefined,
): string | null {
  if (!slug) return null;
  const raw = (domain && domain.trim()) || DEFAULT_LP_DOMAIN;
  let base = raw.replace(/\/+$/, "");
  if (!/^https?:\/\//i.test(base)) base = `https://${base}`;
  return `${base}/?ref=${slug}`;
}
