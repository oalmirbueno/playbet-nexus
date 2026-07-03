/**
 * useLinkBrand — fonte única da verdade de identidade visual por link de rastreio.
 *
 * Regra de ouro: cada tracking_link pertence a UMA platform_account, que pertence
 * a UMA platform. Marca (logo/selo/paleta/tipografia/SEO) é resolvida a partir
 * dessa plataforma via brandRegistry. NUNCA misturar marcas — risco regulatório.
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  BrandKit,
  resolveBrand,
  isBrandLegallyReady,
  getBrandKit,
  BrandKey,
} from "@/lib/brandRegistry";

export interface LinkBrandContext {
  brand: BrandKit | null;
  platformName: string | null;
  platformSlug: string | null;
  platformAccountId: string | null;
  linkSlug: string | null;
  isLegallyReady: boolean;
  seo: {
    title: string;
    description: string;
    ogTitle: string;
    license: string | null;
  };
}

function buildSeo(brand: BrandKit | null, linkSlug: string | null): LinkBrandContext["seo"] {
  if (!brand) {
    return { title: "PlayBet", description: "", ogTitle: "PlayBet", license: null };
  }
  const license = brand.seal?.license ?? null;
  const suffix = license ? ` · ${license}` : "";
  return {
    title: `${brand.name}${linkSlug ? " — " + linkSlug : ""}`,
    description: `Jogue com responsabilidade em ${brand.name}. +18${suffix}`,
    ogTitle: brand.name,
    license,
  };
}

/** Resolve brand por tracking_link_id. Retorna contexto pronto para uso em UI/export/SEO. */
export function useLinkBrand(linkId?: string | null) {
  return useQuery<LinkBrandContext>({
    queryKey: ["link-brand", linkId ?? "none"],
    enabled: !!linkId,
    staleTime: 5 * 60_000,
    queryFn: async () => {
      // ATENÇÃO: `tracking_links` NÃO tem coluna `slug` — usar `tracking_code`.
      // Um select em coluna inexistente derruba o join inteiro e faz o brand cair pra null.
      const { data, error } = await supabase
        .from("tracking_links")
        .select(
          "id, tracking_code, platform_account_id, platform_accounts(platform_id, platforms(name, slug))"
        )
        .eq("id", linkId!)
        .maybeSingle();
      if (error) throw error;

      // @ts-expect-error — join shape
      const plat = data?.platform_accounts?.platforms ?? null;
      const platformName: string | null = plat?.name ?? null;
      const platformSlug: string | null = plat?.slug ?? null;
      // Resolve preferindo slug (mais estável que name livre).
      const brand = resolveBrand(platformSlug) || resolveBrand(platformName);
      // @ts-expect-error
      const linkSlug: string | null = data?.tracking_code ?? null;
      return {
        brand,
        platformName,
        platformSlug,
        // @ts-expect-error
        platformAccountId: data?.platform_account_id ?? null,
        linkSlug,
        isLegallyReady: isBrandLegallyReady(brand),
        seo: buildSeo(brand, linkSlug),
      };
    },
  });
}

/** Resolve brand por platform.name/slug ou BrandKey direto — para editores sem link. */
export function useBrandByPlatform(platformOrKey?: string | BrandKey | null) {
  return useQuery<LinkBrandContext>({
    queryKey: ["brand-by-platform", platformOrKey ?? "none"],
    enabled: !!platformOrKey,
    staleTime: Infinity,
    queryFn: async () => {
      let brand: BrandKit | null = null;
      try {
        brand = getBrandKit(platformOrKey as BrandKey);
      } catch {
        brand = null;
      }
      if (!brand) brand = resolveBrand(String(platformOrKey));
      return {
        brand,
        platformName: brand?.name ?? String(platformOrKey ?? ""),
        platformSlug: brand?.key ?? null,
        platformAccountId: null,
        linkSlug: null,
        isLegallyReady: isBrandLegallyReady(brand),
        seo: buildSeo(brand, null),
      };
    },
  });
}

/** Guard central — lança se a marca não está pronta legalmente (sem selo/licença). */
export function assertBrandReady(ctx: LinkBrandContext | undefined | null, action = "gerar material"): void {
  if (!ctx?.brand) {
    throw new Error(
      `Marca não resolvida para este link. Configure a plataforma antes de ${action}.`
    );
  }
  if (!ctx.isLegallyReady) {
    throw new Error(
      `${ctx.brand.name} sem selo legal completo. Não é possível ${action} sem selo 18+ e autorização SPA/MF — risco de multa.`
    );
  }
}
