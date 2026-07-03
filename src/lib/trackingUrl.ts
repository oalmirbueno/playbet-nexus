/**
 * Tracking URL helpers - single source of truth for what link the influencer
 * actually shares (the "link para divulgar").
 *
 * Rule:
 *  - If the tracking link is bound to an LP instance AND the LP has a public
 *    domain/mode, the shared URL is the PUBLIC LP URL (`<domain>/?ref=<slug>&sub2&sub3`).
 *    Visitors land on the LP, click the CTA, and only then are redirected to
 *    the affiliate URL (which carries sub1/sub2/sub3 attribution).
 *  - Otherwise, the shared URL is the affiliate URL itself with sub1/2/3.
 */

import { buildLpBaseUrl } from "@/lib/lpPublicUrl";

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
  lpRoute?: string | null | undefined,
  sub1?: string | null | undefined,
): string {
  if (!instanceSlug) return "";
  let url = buildLpBaseUrl(lpDomain, lpRoute);
  url = appendParam(url, "ref", instanceSlug);
  if (sub1) url = appendParam(url, "sub1", sub1);
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
  const hasLpContext = Boolean(args.lpMode || args.lpDomain);
  const publicLp = hasLpContext
    ? buildPublicLpUrl(args.lpDomain, args.instanceSlug, args.sub2 || "", args.sub3 || "", args.lpRoute, args.sub1)
    : "";
  if (publicLp) return publicLp;
  return buildTrackedAffiliateUrl(
    args.affiliateBaseUrl || "",
    args.clickIdParamName || "sub1",
    args.sub1 || "",
    args.sub2 || "",
    args.sub3 || "",
  );
}

/**
 * Guard for the "copiar link" flow. Ensures a URL we're about to hand to the
 * influencer really matches the tracking link + LP instance the UI thinks it
 * is copying. Prevents shipping URLs that point at the wrong LP or drop the
 * tracking code.
 */
export interface ExpectedShareUrl {
  instanceSlug?: string | null;
  trackingCode?: string | null;
  influencerId?: string | null;
  campanhaId?: string | null;
}

export interface ShareUrlValidation {
  ok: boolean;
  url: string;
  reason?: string;
}


export function validateSharedLpUrl(
  url: string | null | undefined,
  expected: ExpectedShareUrl,
): ShareUrlValidation {
  const safeUrl = url || "";
  if (!url) return { ok: false, url: safeUrl, reason: "URL vazia" };
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return { ok: false, url: safeUrl, reason: "URL inválida" };
  }
  const q = parsed.searchParams;
  const expectSlug = (expected.instanceSlug || "").trim();
  const expectCode = (expected.trackingCode || "").trim();
  if (expectSlug && q.get("ref") !== expectSlug) {
    return { ok: false, url: safeUrl, reason: `ref esperado "${expectSlug}", encontrado "${q.get("ref") ?? ""}"` };
  }
  if (expectCode && q.get("sub1") !== expectCode) {
    return { ok: false, url: safeUrl, reason: `sub1 esperado "${expectCode}", encontrado "${q.get("sub1") ?? ""}"` };
  }
  if (expected.influencerId && q.get("sub2") && q.get("sub2") !== expected.influencerId) {
    return { ok: false, url: safeUrl, reason: `sub2 divergente do influenciador` };
  }
  if (expected.campanhaId && q.get("sub3") && q.get("sub3") !== expected.campanhaId) {
    return { ok: false, url: safeUrl, reason: `sub3 divergente da campanha` };
  }
  return { ok: true, url };

}

