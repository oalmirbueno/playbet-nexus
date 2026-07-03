/**
 * BrandScope — injeta os tokens de marca (paleta, tipografia, fundo) via CSS vars
 * em qualquer subárvore. Espelha o comportamento aplicado em InfluencerLanding,
 * para que editores (LPInstances, LpOpportunities, LinkMaterialEditor) mantenham
 * a mesma identidade visual da landing page final.
 *
 * Uso:
 *   <BrandScope brand={brandKit} paint>{children}</BrandScope>
 *   <BrandChip brand={brandKit} />
 *
 * `paint` (default false) pinta o container com surface/ink/fontFamily — use em
 * previews e painéis dedicados. Sem `paint`, apenas expõe as CSS vars para
 * children que consumam `var(--brand-primary)` etc.
 */
import { CSSProperties, ReactNode, useMemo } from "react";
import { cn } from "@/lib/utils";
import { resolveBrand, type BrandKit } from "@/lib/brandRegistry";
import { usePlatforms } from "@/hooks/useSupabaseQuery";

export function brandCssVars(brand: BrandKit | null | undefined): CSSProperties {
  if (!brand) return {};
  return {
    ["--brand-primary" as string]: brand.palette.primary,
    ["--brand-primary-contrast" as string]: brand.palette.primaryContrast,
    ["--brand-secondary" as string]: brand.palette.secondary,
    ["--brand-surface" as string]: brand.palette.surface,
    ["--brand-ink" as string]: brand.palette.ink,
    ["--brand-display" as string]: brand.typography.display,
    ["--brand-body" as string]: brand.typography.body,
  } as CSSProperties;
}

interface BrandScopeProps {
  brand: BrandKit | null | undefined;
  children: ReactNode;
  className?: string;
  /** Pinta surface/ink/fontFamily no container (para previews e painéis dedicados). */
  paint?: boolean;
  /** Aplica só a barra de acento no topo (útil em cabeçalhos de dialog). */
  accentBar?: boolean;
  style?: CSSProperties;
}

export function BrandScope({
  brand, children, className, paint, accentBar, style,
}: BrandScopeProps) {
  const vars = brandCssVars(brand);
  const paintStyle: CSSProperties = paint && brand
    ? {
        background: brand.palette.surface,
        color: brand.palette.ink,
        fontFamily: brand.typography.body,
      }
    : {};
  return (
    <div
      className={cn("relative", className)}
      style={{ ...vars, ...paintStyle, ...style }}
      data-brand={brand?.key || "none"}
    >
      {accentBar && brand && (
        <div
          aria-hidden
          className="absolute inset-x-0 top-0 h-0.5 pointer-events-none"
          style={{ background: brand.palette.primary }}
        />
      )}
      {children}
    </div>
  );
}

/* ─────────────────── BrandChip ─────────────────── */

interface BrandChipProps {
  brand: BrandKit | null | undefined;
  size?: "xs" | "sm" | "md";
  showName?: boolean;
  className?: string;
  /** Rótulo alternativo (ex: platform.name cru quando não há brand kit) */
  fallbackLabel?: string;
}

export function BrandChip({
  brand, size = "sm", showName = true, className, fallbackLabel,
}: BrandChipProps) {
  const dot = size === "xs" ? "w-1.5 h-1.5" : size === "md" ? "w-2.5 h-2.5" : "w-2 h-2";
  const text = size === "xs" ? "text-[9px]" : size === "md" ? "text-xs" : "text-[10px]";
  const label = brand?.name ?? fallbackLabel ?? "—";
  const bg = brand?.palette.primary ?? "hsl(var(--muted-foreground))";
  return (
    <span className={cn("inline-flex items-center gap-1.5", text, className)} title={label}>
      <span className={cn("rounded-full ring-1 ring-border/60 shrink-0", dot)} style={{ background: bg }} />
      {showName && <span className="truncate">{label}</span>}
    </span>
  );
}

/* ─────────────────── Hook por platform_id ─────────────────── */

/** Resolve brand a partir do platform_id lido de landing_pages/tracking_links/opportunities. */
export function useBrandFromPlatformId(platformId?: string | null): BrandKit | null {
  const { data: platforms = [] } = usePlatforms();
  return useMemo(() => {
    if (!platformId) return null;
    const p = (platforms as { id: string; name?: string; slug?: string | null }[])
      .find((x) => x.id === platformId);
    if (!p) return null;
    return resolveBrand(p.slug || p.name || null);
  }, [platformId, platforms]);
}
