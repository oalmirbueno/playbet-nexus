/**
 * Tracking URL helpers - single source of truth for what link the influencer
 * actually shares (the "link para divulgar").
 *
 * Rule:
 *  - If the tracking link is bound to an LP instance AND the LP has a public
 *    domain/mode, the shared URL is the PUBLIC generated LP URL (`<domain>/i/<slug>?sub2&sub3`).
 *    Visitors land on the LP, click the CTA, and only then are redirected to
 *    the affiliate URL (which carries sub1/sub2/sub3 attribution).
 *  - Otherwise, the shared URL is the affiliate URL itself with sub1/2/3.
 */

import { buildLpBaseUrl, normalizeLpDomain } from "@/lib/lpPublicUrl";

export function appendParam(url: string, name: string, value: string): string {
  if (!url || !value) return url;
  try {
    const u = new URL(url);
    u.searchParams.set(name, value);
    return u.toString();
  } catch {
    const sep = url.includes("?") ? "&" : "?";
    return `${url}${sep}${name}=${encodeURIComponent(value)}`;
  }
}

export function buildTrackedAffiliateUrl(
  baseUrl: string,
  paramName: string,
  sub1: string,
  sub2: string,
  sub3: string,
): string {
  let out = baseUrl || "";
  if (sub1) out = appendParam(out, paramName || "sub1", sub1);
  if (sub2) out = appendParam(out, "sub2", sub2);
  if (sub3) out = appendParam(out, "sub3", sub3);
  return out;
}

export function buildPublicLpUrl(
  lpDomain: string | null | undefined,
  instanceSlug: string | null | undefined,
  sub2: string,
  sub3: string,
): string {
  if (!instanceSlug) return "";
  const base = normalizeLpDomain(lpDomain);
  let url = `${base}/i/${encodeURIComponent(instanceSlug)}`;
  if (sub2) url = appendParam(url, "sub2", sub2);
  if (sub3) url = appendParam(url, "sub3", sub3);
  return url;
}

/**
 * Resolve the public "link para divulgar" for a tracking link.
 * Prefers the LP public URL whenever the link has an LP instance + a domain.
 */
export function resolveShareUrl(args: {
  lpDomain?: string | null;
  lpRoute?: string | null;
  lpMode?: string | null;
  instanceSlug?: string | null;
  affiliateBaseUrl?: string | null;
  clickIdParamName?: string | null;
  sub1?: string;
  sub2?: string;
  sub3?: string;
}): string {
  if (args.lpMode === "catalog") return buildLpBaseUrl(args.lpDomain, args.lpRoute);
  const hasLpContext = Boolean(args.lpMode || args.lpDomain);
  const publicLp = hasLpContext ? buildPublicLpUrl(args.lpDomain, args.instanceSlug, args.sub2 || "", args.sub3 || "") : "";
  if (publicLp) return publicLp;
  return buildTrackedAffiliateUrl(
    args.affiliateBaseUrl || "",
    args.clickIdParamName || "sub1",
    args.sub1 || "",
    args.sub2 || "",
    args.sub3 || "",
  );
}
