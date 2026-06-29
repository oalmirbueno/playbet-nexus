/**
 * Universal platform detection from a raw affiliate URL.
 * Matches the URL hostname against the `domains text[]` on each platform.
 * Falls back to a fuzzy `name`/`slug` substring check.
 */
export interface PlatformLike {
  id: string;
  name?: string | null;
  slug?: string | null;
  domains?: string[] | null;
}

export function extractHost(url: string): string | null {
  try {
    return new URL(url).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return null;
  }
}

export function detectPlatformByUrl<T extends PlatformLike>(url: string, platforms: T[]): T | null {
  const host = extractHost(url);
  if (!host) return null;

  // 1. Exact/suffix match on registered domains
  for (const p of platforms) {
    const domains = (p.domains || []).map((d) => d.toLowerCase().replace(/^www\./, ""));
    if (domains.some((d) => host === d || host.endsWith(`.${d}`) || d.includes(host) || host.includes(d))) {
      return p;
    }
  }

  // 2. Fuzzy name/slug match against hostname tokens
  const tokens = host.split(/[.\-_]/).filter(Boolean);
  for (const p of platforms) {
    const candidates = [p.slug, p.name].filter(Boolean).map((s) => String(s).toLowerCase());
    if (candidates.some((c) => tokens.some((t) => t.includes(c) || c.includes(t)))) {
      return p;
    }
  }

  return null;
}

/** Append a sub-id to any URL in a way that works for every house. */
export function appendSubId(rawUrl: string, paramName: string, value: string): string {
  if (!rawUrl) return "";
  if (!value) return rawUrl;
  try {
    const u = new URL(rawUrl);
    u.searchParams.set(paramName, value);
    return u.toString();
  } catch {
    const sep = rawUrl.includes("?") ? "&" : "?";
    return `${rawUrl}${sep}${paramName}=${encodeURIComponent(value)}`;
  }
}
